/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/null.ts" />

class MStyleMixin extends MBaseMixin {
    toSVG() {
        this.SVGgetStyles();
        var svg  = new BBOX();
        if (this.data[0] != null) {
            this.SVGhandleSpace(svg);
            var math = svg.Add(this.data[0].toSVG());
            svg.Clean();
            if (math.ic) {
                svg.ic = math.ic
            }
            this.SVGhandleColor(svg);
        }
        this.SVGsaveData(svg);
        return svg;
    }

    SVGstretchH(w) {
        return (this.data[0] != null ? this.data[0].SVGstretchH(w) : new BBOX_NULL());
    }

    SVGstretchV(h, d) {
        return (this.data[0] != null ? this.data[0].SVGstretchV(h, d) : new BBOX_NULL());
    }
}
