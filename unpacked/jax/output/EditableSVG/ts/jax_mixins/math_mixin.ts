/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/g.ts" />

class MathMixin extends MBaseMixin {

    toSVG(span, div) {
        var CONFIG = EditableSVGConfig.config;

        //  All the data should be in an inferred row
        if (this.data[0]) {
            this.SVGgetStyles();
            this.MML.mbase.prototype.displayAlign = this.HUB.config.displayAlign;
            this.MML.mbase.prototype.displayIndent = this.HUB.config.displayIndent;
            if (String(this.HUB.config.displayIndent).match(/^0($|[a-z%])/i))
                this.MML.mbase.prototype.displayIndent = "0";

            //  Put content in a <g> with defaults and matrix that flips y axis.
            //  Put that in an <svg> with xlink defined.
            var box = new BBOX_G();

            box.Add(this.data[0].toSVG(), 0, 0, true);
            box.Clean();
            this.SVGhandleColor(box);
            this.editableSVG.Element(box.element, {
                stroke: "currentColor",
                fill: "currentColor",
                "stroke-width": 0,
                transform: "matrix(1 0 0 -1 0 0)"
            });
            box.removeable = false;
            var svg  = new BBOX_NONREMOVABLE();
            svg.element.setAttribute("xmlns:xlink", Util.XLINKNS);
            if (CONFIG.useFontCache && !CONFIG.useGlobalCache) {
                svg.element.appendChild(BBOX.defs)
            }
            svg.Add(box);
            svg.Clean();
            this.SVGsaveData(svg);

            //  If this element is not the top-level math element
            //    remove the transform and return the svg object
            //    (issue #614).
            if (!span) {
                svg.element = svg.element.firstChild; // remove <svg> element
                svg.element.removeAttribute("transform");
                svg.removeable = true;
                return svg;
            }

            //  Style the <svg> to get the right size and placement
            var l = Math.max(-svg.l, 0),
            r = Math.max(svg.r - svg.w, 0);
            var style = svg.element.style;
            svg.element.setAttribute("width", this.editableSVG.Ex(l + svg.w + r));
            svg.element.setAttribute("height", this.editableSVG.Ex(svg.H + svg.D + 2 * Util.em));
            style.verticalAlign = this.editableSVG.Ex(-svg.D - 2 * this.editableSVG.em); // remove extra pixel added below plus padding from above
            style.marginLeft = this.editableSVG.Ex(-l);
            style.marginRight = this.editableSVG.Ex(-r);
            svg.element.setAttribute("viewBox", this.editableSVG.Fixed(-l, 1) + " " + this.editableSVG.Fixed(-svg.H - Util.em, 1) + " " +
                                     this.editableSVG.Fixed(l + svg.w + r, 1) + " " + this.editableSVG.Fixed(svg.H + svg.D + 2 * Util.em, 1));
            style.marginTop = style.marginBottom = "1px"; // 1px above and below to prevent lines from touching

            //  If there is extra height or depth, hide that
            if (svg.H > svg.h) {
                style.marginTop = this.editableSVG.Ex(svg.h - svg.H)
            }
            if (svg.D > svg.d) {
                style.marginBottom = this.editableSVG.Ex(svg.d - svg.D);
                style.verticalAlign = this.editableSVG.Ex(-svg.d);
            }

            //  Add it to the MathJax span
            var alttext = this.Get("alttext");
            if (alttext && !svg.element.getAttribute("aria-label")) span.setAttribute("aria-label", alttext);
            if (!svg.element.getAttribute("role")) span.setAttribute("role", "math");
            //        span.setAttribute("tabindex",0);  // causes focus outline, so disable for now
            span.appendChild(svg.element);
            svg.element = null;

            //  Handle indentalign and indentshift for single-line displays
            if (!this.isMultiline && this.Get("display") === "block" && !svg.hasIndent) {
                var values = this.getValues("indentalignfirst", "indentshiftfirst", "indentalign", "indentshift");
                if (values.indentalignfirst !== this.MML.INDENTALIGN.INDENTALIGN) {
                    values.indentalign = values.indentalignfirst;
                }
                if (values.indentalign === this.MML.INDENTALIGN.AUTO) {
                    values.indentalign = this.displayAlign;
                }
                if (values.indentshiftfirst !== this.MML.INDENTSHIFT.INDENTSHIFT) {
                    values.indentshift = values.indentshiftfirst;
                }
                if (values.indentshift === "auto") {
                    values.indentshift = "0";
                }
                var shift = Util.length2em(values.indentshift, 1, this.editableSVG.cwidth);
                if (this.displayIndent !== "0") {
                    var indent = Util.length2em(this.displayIndent, 1, this.editableSVG.cwidth);
                    shift += (values.indentalign === this.MML.INDENTALIGN.RIGHT ? -indent : indent);
                }
                div.style.textAlign = values.indentalign;
                if (shift) {
                    this.HUB.Insert(style, ({
                        left: {
                            marginLeft: this.editableSVG.Ex(shift)
                        },
                        right: {
                            marginRight: this.editableSVG.Ex(-shift)
                        },
                        center: {
                            marginLeft: this.editableSVG.Ex(shift),
                            marginRight: this.editableSVG.Ex(-shift)
                        }
                    })[values.indentalign]);
                }
            }
        }
        return span;
    }
}
