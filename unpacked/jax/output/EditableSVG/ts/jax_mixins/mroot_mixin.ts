/// <reference path="mbase_mixin.ts" />
/// <reference path="msqrt_mixin.ts" />

class MRootMixin extends MBaseMixin {
    toSVG() {
        this.SVGgetStyles();
        var svg  = new BBOX();
        var scale = this.SVGgetScale(svg);

        this.SVGhandleSpace(svg);
        var base = this.SVGchildSVG(0);
        var rule;
        var surd;

        var t = Util.TeX.rule_thickness * scale;
        var p;
        var q;
        var H;
        var x = 0;

        if (this.Get("displaystyle")) {
            p = Util.TeX.x_height * scale
        } else {
            p = t
        }

        q = Math.max(t + p / 4, 1000 * Util.TeX.min_root_space / Util.em);
        H = base.h + base.d + q + t;

        surd = CharsMixin.createDelimiter(0x221A, H, scale);
        if (surd.h + surd.d > H) {
            q = ((surd.h + surd.d) - (H - t)) / 2
        }

        rule = new BBOX_RECT(t, 0, base.w);

        H = base.h + q + t;
        x = this.SVGaddRoot(svg, surd, x, surd.h + surd.d - H, scale);
        svg.Add(surd, x, H - surd.h);
        svg.Add(rule, x + surd.w, H - rule.h);
        svg.Add(base, x + surd.w, 0);
        svg.Clean();
        svg.h += t;
        svg.H += t;
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    }

    SVGaddRoot(svg, surd, x, d, scale) {
        var dx = (surd.isMultiChar ? .55 : .65) * surd.w;
        if (this.data[1]) {
            var root = this.data[1].toSVG();
            root.x = 0;
            var h = this.SVGrootHeight(surd.h + surd.d, scale, root) - d;
            var w = Math.min(root.w, root.r); // remove extra right-hand padding, if any
            x = Math.max(w, dx);
            svg.Add(root, x - w, h);
        } else {
            dx = x
        }
        return x - dx;
    }

    SVGrootHeight(d, scale, root) {
        return .45 * (d - 900 * scale) + 600 * scale + Math.max(0, root.d - 75);
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    isCursorable() { return true; }

    moveCursorFromChild(c, d) {
        this.parent.moveCursorFromChild(c, d, this)
    }

    moveCursorFromParent(c, d) {
        return this.data[0].moveCursorFromParent(c, d)
    }
}
