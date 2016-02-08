/// <reference path="bbox.ts" />

class BBOX_TEXT extends BBOX {
    constructor(scale, text, def) {
        if (!def) def = {};

        def.stroke = "none";
        if (def["font-style"] === "") delete def["font-style"];
        if (def["font-weight"] === "") delete def["font-weight"];

        super(def, "text");

        MathJax.HTML.addText(this.element, text);
        MathJax.OutputJax.EditableSVG.textSVG.appendChild(this.element);

        var bbox = this.element.getBBox();
        MathJax.OutputJax.EditableSVG.textSVG.removeChild(this.element);
        scale *= 1000 / Util.em;

        this.element.setAttribute("transform", "scale(" + Util.Fixed(scale) + ") matrix(1 0 0 -1 0 0)");

        this.removeable = false;
        this.w = this.r = bbox.width * scale;
        this.l = 0;
        this.h = this.H = -bbox.y * scale;
        this.d = this.D = (bbox.height + bbox.y) * scale;
    }
}
