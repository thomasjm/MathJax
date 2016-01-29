/// <reference path="bbox.ts" />

class BBOX_SVG extends BBOX {
    constructor() {
        super(null, "svg");
        this.removeable = false;
    }
}
