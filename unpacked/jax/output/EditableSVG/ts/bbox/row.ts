/// <reference path="bbox.ts" />

class BBOX_ROW extends BBOX {

    sh: number;
    sd: number;
    ic: number;
    editableSVG: any;
    elems: any;

    constructor() {
        super();
        this.elems = [];
        this.sh = this.sd = 0;
    }

    Check(data) {
        var svg = data.toSVG();
        this.elems.push(svg);
        if (data.SVGcanStretch("Vertical")) {
            svg.mml = data
        }
        if (svg.h > this.sh) {
            this.sh = svg.h;
        }
        if (svg.d > this.sd) {
            this.sd = svg.d;
        }
        return svg;
    }

    Stretch() {
        for (var i = 0, m = this.elems.length; i < m; i++) {
            var svg = this.elems[i],
            mml = svg.mml;
            if (mml) {
                if (mml.forceStretch || mml.EditableSVGdata.h !== this.sh || mml.EditableSVGdata.d !== this.sd) {
                    svg = mml.SVGstretchV(this.sh, this.sd);
                }
                mml.EditableSVGdata.HW = this.sh;
                mml.EditableSVGdata.D = this.sd;
            }
            if (svg.ic) {
                this.ic = svg.ic
            } else {
                delete this.ic
            }
            this.Add(svg, this.w, 0, true);
        }

        delete this.elems; // TODO: huh?
    }
}
