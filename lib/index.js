import { lstatSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { parseFragment as parse, serialize } from 'parse5';
export default function vitePluginMeasureMedia(config = {}) {
    const options = {
        bin: 'ffprobe',
        filter: 'exclude',
        include: 'data-measure-media-include',
        exclude: 'data-measure-media-exclude',
        done: 'data-measure-media-done',
        excludeUrl: [],
        override: true,
        clear: true,
        image: true,
        video: true,
        nestedImg: false,
        ...config
    };
    const promiseList = [];
    function isLocalPath(src) {
        try {
            return !Boolean(new URL(src));
        }
        catch {
            return true;
        }
    }
    function sanitizePath(src) {
        return src.replace(/\?[^/#\?\s]*/, '').replace(/#[^/#\?\s]*/, '');
    }
    function getPath(src, root) {
        if (typeof src !== 'string') {
            return null;
        }
        if (options.excludeUrl.find(exclude => src.toLowerCase().includes(exclude.toLowerCase())) !== undefined) {
            return null;
        }
        const input = src.split(/,\s+/).length > 1
            ? src.split(/,\s+/)[0].replace(/\s+?\d+?[xw]$/, '')
            : src.replace(/\s+?\d+?[xw]$/, '');
        if (extname(sanitizePath(input)) === '.svg') {
            return null;
        }
        if (isLocalPath(input)) {
            return resolve(root, sanitizePath(input));
        }
        else {
            return null;
        }
    }
    function processMedia(src) {
        return new Promise((resolve, reject) => {
            exec(`${options.bin} -v quiet -print_format json -show_streams -select_streams v:0 ${src}`, (error, stdout, stderr) => {
                try {
                    if (error) {
                        throw error;
                    }
                    const probeData = JSON.parse(stdout).streams[0];
                    const result = [
                        { name: 'width', value: String(probeData.width) },
                        { name: 'height', value: String(probeData.height) }
                    ];
                    resolve(result);
                }
                catch (err) {
                    console.error(err);
                    console.error(`Error: posthtml-measure-media: ${src}`);
                    reject();
                }
            });
        });
    }
    function setMeasuredValue(node, src) {
        if (src !== null) {
            setAttribute(node, options.done, '');
            promiseList.push(processMedia(src).then(data => {
                if ('attrs' in node) {
                    if (options.override) {
                        if (hasAttribute(node, 'width')) {
                            removeAttribute(node, 'width');
                        }
                        if (hasAttribute(node, 'height')) {
                            removeAttribute(node, 'height');
                        }
                    }
                    else {
                        if (hasAttribute(node, 'width')) {
                            data = data.filter(item => item.name !== 'width');
                        }
                        if (hasAttribute(node, 'height')) {
                            data = data.filter(item => item.name !== 'height');
                        }
                    }
                    node.attrs = [
                        ...node.attrs,
                        ...data
                    ];
                }
            }));
        }
    }
    function checkFilter(node, nested = false) {
        if (nested) {
            return Boolean((options.filter === 'exclude' && !(hasAttribute(node, options.exclude))) ||
                (options.filter === 'include'));
        }
        else {
            return Boolean((options.filter === 'exclude' && !(hasAttribute(node, options.exclude))) ||
                (options.filter === 'include' && hasAttribute(node, options.include)));
        }
    }
    function checkTagName(node, name) {
        if ('tagName' in node && node.tagName === name) {
            return true;
        }
        else {
            return false;
        }
    }
    function hasAttribute(node, name) {
        const find = node.attrs.find(attr => attr.name === name);
        if (find !== undefined) {
            return true;
        }
        else {
            return false;
        }
    }
    function getAttribute(node, name) {
        const find = node.attrs.find(attr => attr.name === name);
        if (find !== undefined) {
            return find.value;
        }
        else {
            return null;
        }
    }
    function setAttribute(node, name, value) {
        node.attrs = [
            ...node.attrs,
            { name: name, value: value },
        ];
    }
    function removeAttribute(node, name) {
        node.attrs = node.attrs.filter((attr, index) => attr.name !== name);
    }
    function flatten(el, list = []) {
        el.forEach((item) => {
            list.push(item);
            if ('childNodes' in item && item.childNodes.length > 0) {
                flatten(item.childNodes, list);
            }
            if ('tagName' in item && item.tagName === 'template' && 'content' in item && item.content.childNodes.length > 0) {
                flatten(item.content.childNodes, list);
            }
        });
        return list;
    }
    return {
        name: 'vite-plugin-measure-media',
        transformIndexHtml: {
            async transform(html, ctx) {
                const ctxFilename = lstatSync(ctx.filename).isDirectory()
                    ? ctx.filename
                    : dirname(ctx.filename);
                const parsed = parse(html);
                const nodeList = flatten(parsed.childNodes);
                if (options.image) {
                    nodeList.forEach(node => {
                        if (checkTagName(node, 'picture')) {
                            const source = node.childNodes.filter((item) => checkTagName(item, 'source'));
                            const img = node.childNodes.find((item) => checkTagName(item, 'img') && hasAttribute(item, 'src'));
                            if (checkFilter(node)) {
                                if (source.length > 0) {
                                    source.forEach((item) => {
                                        if (checkFilter(item, true) && hasAttribute(item, 'srcset')) {
                                            const src = getPath(getAttribute(item, 'srcset'), ctxFilename);
                                            setMeasuredValue(item, src);
                                        }
                                    });
                                }
                                if (img !== undefined && hasAttribute(img, 'src')) {
                                    if (source.length === 0 || (options.nestedImg && checkFilter(img, true))) {
                                        const src = getPath(getAttribute(img, 'src'), ctxFilename);
                                        setMeasuredValue(img, src);
                                    }
                                }
                            }
                            if (img !== undefined) {
                                setAttribute(img, options.done, '');
                            }
                        }
                    });
                    nodeList.forEach(node => {
                        if (checkTagName(node, 'img')) {
                            if (checkFilter(node) && !(hasAttribute(node, options.done)) && hasAttribute(node, 'src')) {
                                const src = getPath(getAttribute(node, 'src'), ctxFilename);
                                setMeasuredValue(node, src);
                            }
                        }
                    });
                }
                if (options.video) {
                    nodeList.forEach(node => {
                        if (checkTagName(node, 'video')) {
                            const source = node.childNodes.find((item) => checkTagName(item, 'source') && hasAttribute(item, 'src'));
                            if (checkFilter(node)) {
                                if (hasAttribute(node, 'src')) {
                                    const src = getPath(getAttribute(node, 'src'), ctxFilename);
                                    setMeasuredValue(node, src);
                                }
                                else {
                                    if (source !== undefined && hasAttribute(source, 'src')) {
                                        const src = getPath(getAttribute(source, 'src'), ctxFilename);
                                        setMeasuredValue(node, src);
                                    }
                                }
                            }
                        }
                    });
                }
                const result = Promise.allSettled(promiseList).then(() => {
                    nodeList.forEach(node => {
                        if (checkTagName(node, 'picture') || checkTagName(node, 'source') || checkTagName(node, 'img') || checkTagName(node, 'video')) {
                            removeAttribute(node, options.done);
                            if (options.clear) {
                                removeAttribute(node, options.exclude);
                                removeAttribute(node, options.include);
                            }
                        }
                    });
                    return serialize(parsed);
                });
                return await result;
            }
        }
    };
}
