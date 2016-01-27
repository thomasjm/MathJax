/// <reference path="bbox.ts" />

class BBOX_RECT extends BBOX {
    static type = "rect";
    static removeable = false;

    constructor(h: number, d: number, w: number, def = null) {
        if (def == null) {
            def = {
                stroke: "none"
            }
        }
        def.width = Math.floor(w);
        def.height = Math.floor(h + d);
        super(def);

        this.w = this.r = w;
        this.h = this.H = h + d;
        this.d = this.D = this.l = 0;
        this.y = -d;
    }
}
