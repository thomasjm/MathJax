/// <reference path="mbase_mixin.ts" />
/// <reference path="../editable_svg_config.ts" />
/// <reference path="../bbox/row.ts" />

class MRowMixin extends MBaseMixin {
    focus() {
        console.log('focus!')
    }

    toSVG(h, d) {
        this.SVGgetStyles();
        var svg  = new BBOX_ROW(this.editableSVG);
        this.SVGhandleSpace(svg);
        if (d != null) {
            svg.sh = h;
            svg.sd = d
        }
        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                svg.Check(this.data[i]);
            }
        }
        svg.Stretch();
        svg.Clean();
        if (this.data.length === 1 && this.data[0]) {
            var data = this.data[0].EditableSVGdata;
            if (data.skew) {
                svg.skew = data.skew
            }
        }
        if (this.SVGlineBreaks(svg)) {
            svg = this.SVGmultiline(svg)
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);

        this.EditableSVGelem = svg.element;

        return svg;
    }

    SVGlineBreaks(svg) {
        if (!this.parent.linebreakContainer) {
            return false
        }
        return (EditableSVGConfig.config.linebreaks.automatic &&
                svg.w > this.editableSVG.linebreakWidth) || this.hasNewline();
    }

    SVGmultiline(span) {
        return MathJax.ElementJax.mml.mbase.SVGautoloadFile("multiline")
    }

    SVGstretchH(w) {
        var svg  = new BBOX_ROW(this.editableSVG);
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            svg.Add(this.EditableSVGdataStretched(i, w), svg.w, 0)
        }
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    }
}
