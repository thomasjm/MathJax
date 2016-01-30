/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/g.ts" />

class MUnderOverMixin extends MBaseMixin {
    over: any;
    under: any;
    ACCENTS: any;

    endingPos = 0;
    rightMoveStay = true;

    toSVG(HW, D) {
        this.SVGgetStyles();
        var values = this.getValues("displaystyle", "accent", "accentunder", "align");
        if (!values.displaystyle && this.data[this.base] != null &&
            this.data[this.base].CoreMO().Get("movablelimits")) {
            return MathJax.ElementJax.mml.msubsup.prototype.toSVG.call(this)
        }
        var svg  = new BBOX();
        var scale = this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        var boxes = [],
        stretch = [],
        box, i, m, W = -Util.BIGDIMEN,
        WW = W;
        for (i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i] != null) {
                if (i == this.base) {
                    boxes[i] = this.EditableSVGdataStretched(i, HW, D);
                    stretch[i] = (D != null || HW == null) && this.data[i].SVGcanStretch("Horizontal");
                } else {
                    boxes[i] = this.data[i].toSVG();
                    boxes[i].x = 0;
                    delete boxes[i].X;
                    stretch[i] = this.data[i].SVGcanStretch("Horizontal");
                }
                if (boxes[i].w > WW) {
                    WW = boxes[i].w
                }
                if (!stretch[i] && WW > W) {
                    W = WW
                }
            }
        }
        if (D == null && HW != null) {
            W = HW
        } else if (W == -Util.BIGDIMEN) {
            W = WW
        }
        for (i = WW = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                if (stretch[i]) {
                    boxes[i] = this.data[i].SVGstretchH(W);
                    if (i !== this.base) {
                        boxes[i].x = 0;
                        delete boxes[i].X
                    }
                }
                if (boxes[i].w > WW) {
                    WW = boxes[i].w
                }
            }
        }
        var t = Util.TeX.rule_thickness * this.mscale;
        var base = boxes[this.base] || {
            w: 0,
            h: 0,
            d: 0,
            H: 0,
            D: 0,
            l: 0,
            r: 0,
            y: 0,
            scale: scale
        };
        var x, y, z1, z2, z3, dw, k, delta = 0;
        if (base.ic) {
            delta = 1.3 * base.ic + .05
        } // adjust faked IC to be more in line with expected results
        for (i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i] != null) {
                box = boxes[i];
                z3 = Util.TeX.big_op_spacing5 * scale;
                var accent = (i != this.base && values[this.ACCENTS[i]]);
                if (accent && box.w <= 1) {
                    box.x = -box.l;
                    boxes[i] = (new BBOX_G()).With({
                        removeable: false
                    }, MathJax.Hub);
                    boxes[i].Add(box);
                    boxes[i].Clean();
                    boxes[i].w = -box.l;
                    box = boxes[i];
                }
                dw = {
                    left: 0,
                    center: (WW - box.w) / 2,
                    right: WW - box.w
                }[values.align];
                x = dw;
                y = 0;
                if (i == this.over) {
                    if (accent) {
                        k = t * scale;
                        z3 = 0;
                        if (base.skew) {
                            x += base.skew;
                            svg.skew = base.skew;
                            if (x + box.w > WW) {
                                svg.skew += (WW - box.w - x) / 2
                            }
                        }
                    } else {
                        z1 = Util.TeX.big_op_spacing1 * scale;
                        z2 = Util.TeX.big_op_spacing3 * scale;
                        k = Math.max(z1, z2 - Math.max(0, box.d));
                    }
                    k = Math.max(k, 1500 / Util.em);
                    x += delta / 2;
                    y = base.y + base.h + box.d + k;
                    box.h += z3;
                    if (box.h > box.H) {
                        box.H = box.h
                    }
                } else if (i == this.under) {
                    if (accent) {
                        k = 3 * t * scale;
                        z3 = 0;
                    } else {
                        z1 = Util.TeX.big_op_spacing2 * scale;
                        z2 = Util.TeX.big_op_spacing4 * scale;
                        k = Math.max(z1, z2 - box.h);
                    }
                    k = Math.max(k, 1500 / Util.em);
                    x -= delta / 2;
                    y = base.y - (base.d + box.h + k);
                    box.d += z3;
                    if (box.d > box.D) {
                        box.D = box.d
                    }
                }
                svg.Add(box, x, y);
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

    // TODO: this is copied from MSubSupMixin, but isn't a perfect match.
    // (for example, it references this.sub and this.sup)

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
