/// <reference path="mbase_mixin.ts" />

class MSubSupMixin extends MBaseMixin implements ElementJax {
    base: any;
    sup: any;
    sub: any;

    endingPos = 1;

    isCursorable() { return true; }

    toSVG(HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX(),
        scale = this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        var mu = this.SVGgetMu(svg);
        var base = svg.Add(this.EditableSVGdataStretched(this.base, HW, D));
        var sscale = (this.data[this.sup] || this.data[this.sub] || this).SVGgetScale();
        var x_height = Util.TeX.x_height * scale,
        s = Util.TeX.scriptspace * scale;
        var sup, sub;
        if (this.SVGnotEmpty(this.data[this.sup])) {
            sup = this.data[this.sup].toSVG();
            sup.w += s;
            sup.r = Math.max(sup.w, sup.r);
        }
        if (this.SVGnotEmpty(this.data[this.sub])) {
            sub = this.data[this.sub].toSVG();
            sub.w += s;
            sub.r = Math.max(sub.w, sub.r);
        }
        var q = Util.TeX.sup_drop * sscale,
        r = Util.TeX.sub_drop * sscale;
        var u = base.h + (base.y || 0) - q,
        v = base.d - (base.y || 0) + r,
        delta = 0,
        p;
        if (base.ic) {
            base.w -= base.ic; // remove IC (added by mo and mi)
            delta = 1.3 * base.ic + .05; // adjust faked IC to be more in line with expected results
        }
        if (this.data[this.base] &&
            (this.data[this.base].type === "mi" || this.data[this.base].type === "mo")) {
            if (this.data[this.base].data.join("").length === 1 && base.scale === 1 &&
                !base.stretched && !this.data[this.base].Get("largeop")) {
                u = v = 0
            }
        }
        var min = this.getValues("subscriptshift", "superscriptshift");
        min.subscriptshift = (min.subscriptshift === "" ? 0 : Util.length2em(min.subscriptshift, mu));
        min.superscriptshift = (min.superscriptshift === "" ? 0 : Util.length2em(min.superscriptshift, mu));
        var x = base.w + base.x;
        if (!sup) {
            if (sub) {
                v = Math.max(v, Util.TeX.sub1 * scale, sub.h - (4 / 5) * x_height, min.subscriptshift);
                svg.Add(sub, x, -v);
                this.data[this.sub].EditableSVGdata.dy = -v;
            }
        } else {
            if (!sub) {
                var values = this.getValues("displaystyle", "texprimestyle");
                p = Util.TeX[(values.displaystyle ? "sup1" : (values.texprimestyle ? "sup3" : "sup2"))];
                u = Math.max(u, p * scale, sup.d + (1 / 4) * x_height, min.superscriptshift);
                svg.Add(sup, x + delta, u);
                this.data[this.sup].EditableSVGdata.dx = delta;
                this.data[this.sup].EditableSVGdata.dy = u;
            } else {
                v = Math.max(v, Util.TeX.sub2 * scale);
                var t = Util.TeX.rule_thickness * scale;
                if ((u - sup.d) - (sub.h - v) < 3 * t) {
                    v = 3 * t - u + sup.d + sub.h;
                    q = (4 / 5) * x_height - (u - sup.d);
                    if (q > 0) {
                        u += q;
                        v -= q
                    }
                }
                svg.Add(sup, x + delta, Math.max(u, min.superscriptshift));
                svg.Add(sub, x, -Math.max(v, min.subscriptshift));
                this.data[this.sup].EditableSVGdata.dx = delta;
                this.data[this.sup].EditableSVGdata.dy = Math.max(u, min.superscriptshift);
                this.data[this.sub].EditableSVGdata.dy = -Math.max(v, min.subscriptshift);
            }
        }

        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);

        return svg;
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    // TODO: this is copied from MUnderOverMixin, but isn't a perfect match.
    // (for example, it references this.rightMoveStay)

    moveCursorFromParent(cursor, direction) {
        var direction = Util.getCursorValue(direction);
        var dest;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
            dest = this.data[this.base]
            if (dest.isCursorable()) {
                return dest.moveCursorFromParent(cursor, direction)
            }
            cursor.position = {
                section: this.base,
                pos: direction === Direction.LEFT ? 1 : 0,
            }
        } else if (direction === Direction.UP || direction === Direction.DOWN) {
            var small = direction === Direction.UP ? this.sub : this.sup
            var baseBB = this.data[this.base].getSVGBBox()
            if (!baseBB || !cursor.renderedPosition) {
                cursor.position = {
                    section: this.data[small] ? small : this.base,
                    pos: 0,
                }
            } else if (cursor.renderedPosition.x > baseBB.x+baseBB.width && this.data[small]) {
                if (this.data[small].isCursorable()) {
                    return this.data[small].moveCursorFromParent(cursor, direction)
                }
                var bb = this.data[small].getSVGBBox()
                cursor.position = {
                    section: small,
                    pos: cursor.renderedPosition.x > bb.x + bb.width/2 ? 1 : 0,
                }
            } else {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, direction)
                }
                cursor.position = {
                    section: this.base,
                    pos: cursor.renderedPosition.x > baseBB.x+baseBB.width/2 ? 1 : 0,
                }
            }
        }
        cursor.moveTo(this, cursor.position)
        return true;
    }

    moveCursorFromChild(cursor, direction, child) {
        direction = Util.getCursorValue(direction)
        var section, pos;

        var childIdx
        for (childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx]) break
        }
        if (childIdx === this.data.length) throw new Error('Unable to find specified child in children')
        var currentSection = childIdx
        var old = [cursor.node, cursor.position]
        cursor.moveTo(this, {
            section: currentSection,
            pos: direction === Direction.RIGHT ? 1 : 0,
        })

        if (!this.moveCursor(cursor, direction)) {
            cursor.moveTo.apply(cursor, old)
            return false
        }
        return true
    }

    moveCursorFromClick(cursor, x, y) {
        var base = this.data[0]
        var baseBB = base.getSVGBBox();
        var sub = this.data[this.sub];
        var subBB = sub && sub.getSVGBBox();
        var sup = this.data[this.sup];
        var supBB = sup && sup.getSVGBBox();

        var section;
        var pos;

        // If the click is somewhere within the sup or sup, go there
        if (subBB && Util.boxContains(subBB, x, y)) {
            if (sub.isCursorable()) {
                return sub.moveCursorFromClick(cursor, x, y)
            }
            section = this.sub;
            var midpoint = subBB.x + (subBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        } else if (supBB && Util.boxContains(supBB, x, y)) {
            if (sup.isCursorable()) {
                return sup.moveCursorFromClick(cursor, x, y)
            }
            section = this.sup;
            var midpoint = supBB.x + (supBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        } else {
            // Click somewhere else, go by the midpoint
            if (base.isCursorable()) {
                return base.moveCursorFromClick(cursor, x, y)
            }
            section = this.base;
            var midpoint = baseBB.x + (baseBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }

        cursor.moveTo(this, {
            section: section,
            pos: pos,
        });
    }

    moveCursor(cursor, direction) {
        direction = Util.getCursorValue(direction);

        var sup = this.data[this.sup]
        var sub = this.data[this.sub]

        if (cursor.position.section === this.base) {
            if (direction === Direction.UP) {
                if (sup) {
                    if (sup.isCursorable()) {
                        return sup.moveCursorFromParent(cursor, direction)
                    }
                    cursor.position = {
                        section: this.sup,
                        pos: 0,
                    }
                } else {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
            } else if (direction === Direction.DOWN) {
                if (sub) {
                    if (sub.isCursorable()) {
                        return sub.moveCursorFromParent(cursor, direction)
                    }
                    cursor.position = {
                        section: this.sub,
                        pos: 0,
                    }
                } else {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
            } else {
                if (direction === Direction.LEFT && cursor.position.pos === 0 || direction === Direction.RIGHT && cursor.position.pos === 1) {
                    return this.parent.moveCursorFromChild(cursor, direction, this)
                }
                cursor.position.pos = cursor.position.pos ? 0 : 1
            }
        } else {
            var vertical = direction === Direction.UP || direction === Direction.DOWN
            var movingInVertically = vertical && (direction === Direction.UP) === (cursor.position.section === this.sub)
            var movingInHorizontally = cursor.position.pos === 0 && direction === Direction.LEFT
            var moveRightHorizontally = cursor.position.pos === 1 && direction === Direction.RIGHT
            var movingAway = vertical ? !movingInVertically : !this.rightMoveStay && moveRightHorizontally
            var movingIn = movingInVertically || movingInHorizontally || moveRightHorizontally && this.rightMoveStay
            if (movingAway) {
                return this.parent.moveCursorFromChild(cursor, direction, this)
            } else if (movingIn) {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, cursor.position.section === this.sub ? Direction.UP : Direction.DOWN)
                }
                cursor.position = {
                    section: this.base,
                    pos: moveRightHorizontally ? 1 : this.endingPos || 0,
                }
            } else {
                cursor.position.pos = cursor.position.pos ? 0 : 1
            }
        }

        cursor.moveTo(this, cursor.position)
        return true
    }

    drawCursor(cursor) {
        var bb;
        var x, y, height;

        if (cursor.position.section === this.base) {
            bb = this.data[this.base].getSVGBBox()
            var mainBB = this.getSVGBBox()
            y = mainBB.y
            height = mainBB.height
        } else {
            bb = this.data[cursor.position.section].getSVGBBox()
            y = bb.y
            height = bb.height
        }

        x = cursor.position.pos === 0 ? bb.x : bb.x + bb.width;

        var svgelem = this.EditableSVGelem.ownerSVGElement
        return cursor.drawAt(svgelem, x, y, height)
    }
}
