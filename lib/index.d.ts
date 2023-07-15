import type { Plugin } from 'vite';
export interface MeasureMediaOptions {
    bin?: string;
    filter?: 'include' | 'exclude';
    include?: string;
    exclude?: string;
    done?: string;
    excludeUrl?: string[];
    override?: boolean;
    clear?: boolean;
    image?: boolean;
    video?: boolean;
    nestedImg?: boolean;
}
export default function vitePluginMeasureMedia(config?: MeasureMediaOptions): Plugin;
