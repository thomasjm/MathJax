/// <reference path="bbox.ts" />

class BBOX_FRAME extends BBOX {
    static removeable = false;

    constructor(h, d, w, t, dash, color, svg, hub, def) {
        if (def == null) {
            def = {}
        };

        def.fill = "none";
        def["stroke-width"] = Util.Fixed(t, 2);
        def.width = Math.floor(w - t);
        def.height = Math.floor(h + d - t);
        def.transform = "translate(" + Math.floor(t / 2) + "," + Math.floor(-d + t / 2) + ")";
        if (dash === "dashed") {
            def["stroke-dasharray"] = [Math.floor(6 * Util.em), Math.floor(6 * Util.em)].join(" ")
        }

        super(def, "rect");

        this.w = this.r = w;
        this.h = this.H = h;
        this.d = this.D = d;
        this.l = 0;
    }
}
