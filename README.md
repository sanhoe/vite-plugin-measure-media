# vite-plugin-measure-media

Vite plugin for setting width and height attributes to images and videos in HTML files.

Input:
```html
<img src="./image.jpg" alt="This is example image.">
```

Output:
```html
<img src="./image.jpg" alt="This is example image." width="1280" height="720">
```

## Why?

Applying width and height attributes to images and video elements helps improve Cumulative Layout Shift metric and speed up page loading.   
This plugin automatically inserts width, height attributes by referring to the src properties of the image and video tag within the page.

See also:   
[Cumulative Layout Shift (CLS)](https://web.dev/cls/)   
[How To Fix Cumulative Layout Shift (CLS) Issues](https://www.smashingmagazine.com/2021/06/how-to-fix-cumulative-layout-shift-issues/)   
[Setting Height And Width On Images Is Important Again](https://www.smashingmagazine.com/2020/03/setting-height-width-images-important-again/)

## Install

```bash
npm i vite-plugin-measure-media -D
```

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import vitePluginMeasureMedia from 'vite-plugin-measure-media';
import ffprobe from '@ffprobe-binary/ffprobe';

export default defineConfig({
    plugins: [vitePluginMeasureMedia({ bin: ffprobe, })], // when using custom ffprobe binary
})
```

### Input
```html
<img src="./image.jpg" alt="This is example image.">

<picture>
    <source srcset="./image.pc.jpg" media="(min-width: 769px)">
    <source srcset="./image.mo.jpg" media="(max-width: 768px)">
    <img src="./image.pc.jpg" alt="This is example image.">
</picture>

<video src="./video.mp4">example video</video>

<video>
    <source src="./video.mp4" type="video/mp4">
    example video
</video>
```

### Output
```html
<img src="./image.jpg" alt="This is example image." width="1280" height="720">

<picture>
    <source srcset="./image.pc.jpg" media="(min-width: 769px)" width="1280" height="720">
    <source srcset="./image.mo.jpg" media="(max-width: 768px)" width="720" height="600">
    <img src="./image.pc.jpg" alt="This is example image.">
</picture>

<video src="./video.mp4" width="1280" height="720">example video</video>

<video width="1280" height="720">
    <source src="./video.mp4" type="video/mp4">
    example video
</video>
```

## Options

### `bin`
Type: `string`   
Defalut: `'ffprobe'`

FFprobe dependency path. If the PATH of FFprobe is configured, it can be used as the default 'ffprobe', and if a particular binary needs to be used, the path of that binary file must be provided.

### `filter`
Type: `'exclude' | 'include'`   
Defalut: `'exclude'`

How the filter works. The default value 'exclude' operates except for elements with attribute specified in the 'exclude' option, and if the value is 'include', only elements with attribute specified in the 'include' option.

### `include`
Type: `string`   
Defalut: `'data-measure-media-include'`

Specifies the name of the attribute used when the filter action is 'include'.

### `exclude`
Type: `string`   
Defalut: `'data-measure-media-exclude'`

Specifies the name of the attribute used when the filter action is 'exclude'.

### `done`
Type: `string`   
Defalut: `'data-measure-media-done'`

Specifies the name of the attribute used during plugin internal operation.

### `excludeUrl`
Type: `string[]`   
Defalut: `[]`

List of urls to be excluded from operation.

### `override`
Type: `boolean`   
Defalut: `true`

Sets the overwrite behavior. The default value is overwritten with the newly measured value even if the element already has width, height attributes.

### `clear`
Type: `boolean`   
Default: `true`

Removes the attributes specified in the 'include' option and the 'exclude' option from the output.

### `image`
Type: `boolean`   
Default: `true`

The plugin works on image elements such as `<picture>`, `<img>`.

### `video`
Type: `boolean`   
Default: `true`

The plugin works on video elements such as `<video>`.

### `nestedImg`
Type: `boolean`   
Default: `false`

The default behavior of the plugin is to skip the behavior for the img element if the source element exists inside the picture element. If you set the option to 'true', apply width, height attributes to the img element regardless of the source element.

## See also

[ffprobe-binary](https://github.com/sanhoe/ffprobe-binary): Node.js module providing path of FFprobe binary for various platforms.
