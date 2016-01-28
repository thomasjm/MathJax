/// <reference path="mbase_mixin.ts" />


class MFracMixin extends MBaseMixin {
    static name = "mfrac";
    static cursorable = true;

    texWithDelims: any;

    toSVG() {
        this.SVGgetStyles();
        var svg  = new BBOX();
        var scale = this.SVGgetScale(svg);
        var frac = new BBOX();
        frac.scale = svg.scale;
        this.SVGhandleSpace(frac);
        var num = this.SVGchildSVG(0),
        den = this.SVGchildSVG(1);
        var values = this.getValues("displaystyle", "linethickness", "numalign", "denomalign", "bevelled");
        var isDisplay = values.displaystyle;
        var a = Util.TeX.axis_height * scale;
        if (values.bevelled) {
            var delta = (isDisplay ? 400 : 150);
            var H = Math.max(num.h + num.d, den.h + den.d) + 2 * delta;
            var bevel = EditableSVG.createDelimiter(0x2F, H);
            frac.Add(num, 0, (num.d - num.h) / 2 + a + delta);
            frac.Add(bevel, num.w - delta / 2, (bevel.d - bevel.h) / 2 + a);
            frac.Add(den, num.w + bevel.w - delta, (den.d - den.h) / 2 + a - delta);
        } else {
            var W = Math.max(num.w, den.w);
            var t = Util.thickness2em(values.linethickness, this.scale) * this.mscale,
            p, q, u, v;
            var mt = Util.TeX.min_rule_thickness / Util.em * 1000;
            if (isDisplay) {
                u = Util.TeX.num1;
                v = Util.TeX.denom1
            } else {
                u = (t === 0 ? Util.TeX.num3 : Util.TeX.num2);
                v = Util.TeX.denom2
            }
            u *= scale;
            v *= scale;
            if (t === 0) { // \atop
                p = Math.max((isDisplay ? 7 : 3) * Util.TeX.rule_thickness, 2 * mt); // force to at least 2 px
                q = (u - num.d) - (den.h - v);
                if (q < p) {
                    u += (p - q) / 2;
                    v += (p - q) / 2
                }
                frac.w = W;
                t = 0;
            } else { // \over
                p = Math.max((isDisplay ? 2 : 0) * mt + t, t / 2 + 1.5 * mt); // force to be at least 1.5px
                q = (u - num.d) - (a + t / 2);
                if (q < p) {
                    u += p - q
                }
                q = (a - t / 2) - (den.h - v);
                if (q < p) {
                    v += p - q
                }
                frac.Add(new BBOX_RECT(t / 2, t / 2, W + 2 * t), 0, a);
            }
            frac.Align(num, values.numalign, t, u);
            frac.Align(den, values.denomalign, t, -v);
        }
        frac.Clean();
        svg.Add(frac, 0, 0);
        svg.Clean();

        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    }

    SVGcanStretch(direction) {
        return false
    }

    SVGhandleSpace(svg) {
        if (!this.texWithDelims && !this.useMMLspacing) {
            //
            //  Add nulldelimiterspace around the fraction
            //   (TeXBook pg 150 and Appendix G rule 15e)
            //
            svg.x = svg.X = Util.TeX.nulldelimiterspace * this.mscale;
        }

        super.SVGhandleSpace(svg);
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    moveCursorFromClick(cursor, x, y) {
        var bb = this.getSVGBBox();
        var midlineY = bb.y + (bb.height / 2.0);
        var midlineX = bb.x + (bb.width / 2.0);

        cursor.position = {
            position: (x < midlineX) ? 0 : 1,
            half: (y < midlineY) ? 0 : 1,
        }

        if (this.data[cursor.position.half].cursorable) {
            this.data[cursor.position.half].moveCursorFromClick(cursor, x, y)
            return
        }

        cursor.moveTo(this, cursor.position)
    }

    moveCursor(cursor, direction) {
        if (cursor.position.half === undefined) throw new Error('Invalid cursor')
        if (cursor.position.position === 0 && direction === Direction.RIGHT) {
            cursor.position.position = 1
        } else if (cursor.position.position === 1 && direction === Direction.LEFT) {
            cursor.position.position = 0
        } else if (cursor.position.half === 0 && direction === Direction.DOWN) {
            return this.moveCursorIntoDenominator(cursor, direction)
        } else if (cursor.position.half === 1 && direction === Direction.UP) {
            return this.moveCursorIntoNumerator(cursor, direction)
        } else {
            return this.parent.moveCursorFromChild(cursor, direction, this)
        }
        cursor.moveTo(this, cursor.position)
    }

    moveCursorFromChild(cursor, direction, child, keep) {
        var isNumerator = this.data[0] === child
        var isDenominator = this.data[1] === child
        if (!isNumerator && !isDenominator) throw new Error('Specified child not found in children')

        if (isNumerator && direction === Direction.DOWN) {
            return this.moveCursorIntoDenominator(cursor, direction)
        } else if (isDenominator && direction === Direction.UP) {
            return this.moveCursorIntoNumerator(cursor, direction)
        } else if (keep) {
            return this.moveCursorIntoHalf(isNumerator ? 0 : 1, cursor, direction)
        } else {
            return this.parent.moveCursorFromChild(cursor, direction, this)
        }
    }
    moveCursorIntoHalf(half, cursor, direction) {
        if (this.data[half].cursorable) {
            // If the data is cursorable, it must take the cursor
            return this.data[half].moveCursorFromParent(cursor, direction)
        }
        var position = 0
        if (cursor.renderedPosition) {
            var bb = this.data[half].getSVGBBox()
            if (bb && cursor.renderedPosition.x > bb.x + bb.width/2) {
                position = 1
            }
        }
        cursor.moveTo(this, {
            half: half,
            position: position,
        })
        return true
    }
    moveCursorIntoNumerator(c, d) {
        return this.moveCursorIntoHalf(0, c, d)
    }
    moveCursorIntoDenominator(c, d) {
        return this.moveCursorIntoHalf(1, c, d)
    }

    moveCursorFromParent(cursor, direction) {
        direction = getCursorValue(direction)
        switch (direction) {
        case Direction.LEFT:
        case Direction.RIGHT:
            if (this.data[0].cursorable) {
                return this.data[0].moveCursorFromParent(cursor, direction)
            }
            cursor.moveTo(this, {
                half: 0,
                position: direction === RIGHT ? 0 : 1,
            })
            return true
        case Direction.UP:
            return this.moveCursorIntoDenominator(cursor, direction)
        case Direction.DOWN:
            return this.moveCursorIntoNumerator(cursor, direction)
        }
        return false
    }

    drawCursor(cursor) {
        if (cursor.position.half === undefined) throw new Error('Invalid cursor')
        var bbox = this.data[cursor.position.half].getSVGBBox()
        var height = bbox.height
        var x = bbox.x + (cursor.position.position ? bbox.width + 100 : -100)
        var y = bbox.y
        var svgelem = this.EditableSVGelem.ownerSVGElement
        return cursor.drawAt(svgelem, x, y, height)
    }
}
