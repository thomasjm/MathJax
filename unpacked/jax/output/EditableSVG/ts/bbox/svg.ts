/// <reference path="bbox.ts" />

class BBOX_SVG extends BBOX {
    static type = "svg";
    static removeable = false;

    constructor(scale, id, h, d, w, l, r, p) {
        super(null, "svg");
    }
}
