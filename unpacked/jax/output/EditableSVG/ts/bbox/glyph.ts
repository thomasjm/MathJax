/// <reference path="bbox.ts" />

class BBOX_GLYPH extends BBOX {
    static glyphs: {}; // This serves as a cache
    static defs: any;

    constructor(scale, id, h, d, w, l, r, p) {
        this.glyphs = {};
        this.n = 0;

        var def;
        var t = MathJax.OutputJax.EditableSVG.config.blacker;
        var cache = MathJax.OutputJax.EditableSVG.config.useFontCache;
        var transform = (scale === 1 ? null : "scale(" + Util.Fixed(scale) + ")");
        if (cache && !MathJax.OutputJax.EditableSVG.config.useGlobalCache) {
            id = "E" + this.n + "-" + id
        }

        if (!cache || !this.glyphs[id]) {
            def = { "stroke-width": t };

            if (cache) def.id = id
            else if (transform) def.transform = transform

            def.d = (p ? "M" + p + "Z" : "");
            super(def, "path");
            if (cache) {
                BBOX_GLYPH.defs.appendChild(this.element);
                this.glyphs[id] = true;
            }
        }

        if (cache) {
            def = {};
            if (transform) def.transform = transform
            this.element = Util.Element("use", def);
            this.element.setAttributeNS(Util.XLINKNS, "href", "#" + id);
        }

        this.removeable = false;

        this.h = (h + t) * scale;
        this.d = (d + t) * scale;
        this.w = (w + t / 2) * scale;
        this.l = (l + t / 2) * scale;
        this.r = (r + t / 2) * scale;
        this.H = Math.max(0, this.h);
        this.D = Math.max(0, this.d);
        this.x = this.y = 0;
        this.scale = scale;
    }
}
