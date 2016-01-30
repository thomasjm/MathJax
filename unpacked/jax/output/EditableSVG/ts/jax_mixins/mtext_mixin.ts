/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/text.ts" />

class MTextMixin extends MBaseMixin {
    toSVG() {
        if (MathJax.OutputJax.EditableSVG.config.mtextFontInherit || this.Parent().type === "merror") {
            this.SVGgetStyles();
            var svg  = new BBOX();
            var scale = this.SVGgetScale(svg);
            this.SVGhandleSpace(svg);
            var variant = this.SVGgetVariant();
            var def = { direction: this.Get("dir") };

            if (variant.bold) {
                def["font-weight"] = "bold";
            }

            if (variant.italic) {
                def["font-style"] = "italic";
            }

            variant = this.Get("mathvariant");
            if (variant === "monospace") {
                def["class"] = "MJX-monospace"
            } else if (variant.match(/sans-serif/)) {
                def["class"] = "MJX-sans-serif"
            }

            svg.Add(new BBOX_TEXT(scale * 100 / MathJax.OutputJax.EditableSVG.config.scale,
                                  this.data.join(""), def));
            svg.Clean();
            this.SVGhandleColor(svg);
            this.SVGsaveData(svg);
            return svg;
        } else {
            return super.toSVG.call(this); // TODO: make sure this works properly
        }
    }
}
