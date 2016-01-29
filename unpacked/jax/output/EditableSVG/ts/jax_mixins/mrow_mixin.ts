/// <reference path="mbase_mixin.ts" />
/// <reference path="../editable_svg_config.ts" />
/// <reference path="../bbox/row.ts" />

class MRowMixin extends MBaseMixin {

    isCursorable() { return true; }

    focus() {
        console.log('focus!')
    }

    toSVG(h, d) {
        this.SVGgetStyles();

        var svg  = new BBOX_ROW();

        this.SVGhandleSpace(svg);

        if (d != null) {
            svg.sh = h;
            svg.sd = d
        }

        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                svg.Check(this.data[i]);
            }
        }
        svg.Stretch();
        svg.Clean();

        if (this.data.length === 1 && this.data[0]) {
            var data = this.data[0].EditableSVGdata;
            if (data.skew) {
                svg.skew = data.skew
            }
        }

        if (this.SVGlineBreaks(svg)) svg = this.SVGmultiline(svg)

        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;

        return svg;
    }

    SVGlineBreaks(svg) {
        if (!this.parent.linebreakContainer) {
            return false
        }
        return (MathJax.OutputJax.EditableSVG.config.linebreaks.automatic &&
                svg.w > this.editableSVG.linebreakWidth) || this.hasNewline();
    }

    SVGmultiline(span) {
        return MathJax.ElementJax.mml.mbase.SVGautoloadFile("multiline")
    }

    SVGstretchH(w) {
        var svg  = new BBOX_ROW();
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            svg.Add(this.EditableSVGdataStretched(i, w), svg.w, 0)
        }
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    isCursorPassthrough() {
        // TODO: implement cursor navigation better
        // return this.data.length === 1 && this.data[0].isCursorable()
        return false
    }

    moveCursorFromParent(cursor, direction) {
        direction = Util.getCursorValue(direction)
        if (this.isCursorPassthrough()) {
            return this.data[0].moveCursorFromParent(cursor, direction)
        }
        if (direction === Direction.LEFT) {
            cursor.moveTo(this, this.data.length)
        } else if (direction === Direction.RIGHT) {
            cursor.moveTo(this, 0)
        } else if (cursor.renderedPosition &&
                   this.moveCursorFromClick(cursor, cursor.renderedPosition.x, cursor.renderedPosition.y)) {
            return true
        } else {
            cursor.moveTo(this, 0)
        }
        return true
    }

    moveCursorFromChild(cursor, direction, child) {
        if (this.isCursorPassthrough() || direction === Direction.UP || direction === Direction.DOWN) {
            return this.parent.moveCursorFromChild(cursor, direction, this)
        }

        direction = Util.getCursorValue(direction);

        for (var childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx]) break;
        }

        if (childIdx === this.data.length)
            throw new Error('Unable to find specified child in children')

        if (direction === Direction.LEFT) {
            cursor.moveTo(this, childIdx);
        } else if (direction === Direction.RIGHT) {
            cursor.moveTo(this, childIdx + 1);
        }

        return true;
    }

    moveCursorFromClick(cursor, x, y) {
        // Identify which child was clicked
        for (var childIdx = 0; childIdx < this.data.length; ++childIdx) {
            var child = this.data[childIdx];
            var bb = child.getSVGBBox();
            if (!bb) continue
            var midpoint = bb.x + (bb.width / 2);

            if (x < midpoint) {
                cursor.moveTo(this, childIdx);
                return true;
            }
        }

        cursor.moveTo(this, this.data.length);
        return true;
    }

    moveCursor(cursor, direction) {
        direction = Util.getCursorValue(direction)

        var vertical = direction === Direction.UP || direction === Direction.DOWN
        if (vertical) return this.parent.moveCursorFromChild(cursor, direction, this)

        var newPosition = cursor.position + (direction === Direction.LEFT ? -1 : 1)
        if (newPosition < 0 || newPosition > this.data.length) {
            this.parent.moveCursorFromChild(cursor, direction, this)
            return
        }
        var childPosition = direction === Direction.LEFT ? cursor.position - 1 : cursor.position

        // If we're in selection mode, hop over cursorable children
        if (cursor.mode === cursor.SELECTION) {
            cursor.moveTo(this, newPosition);
            return;
        }

        // If we manage to move into a child, return
        if (this.data[childPosition].moveCursorFromParent(cursor, direction)) return;

        // Otherwise, jump over the child
        cursor.moveTo(this, newPosition)
    }

    drawCursor(cursor) {
        var bbox = this.getSVGBBox();
        var height = bbox.height;
        var y = bbox.y;
        var preedge;
        var postedge;

        if (cursor.position === 0) {
            preedge = bbox.x
        } else {
            var prebox = this.data[cursor.position-1].getSVGBBox();
            preedge = prebox.x+prebox.width
        }

        if (cursor.position === this.data.length) {
            postedge = bbox.x+bbox.width
        } else {
            var postbox = this.data[cursor.position].getSVGBBox();
            postedge = postbox.x
        }

        var x = (postedge + preedge) / 2;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawAt(svgelem, x, y, height);
    }

    drawCursorHighlight(cursor) {
        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;

        // For now, assume both of these are in the same mrow
        if (cursor.selectionStart.node !== this) {
            // If selectionStart is a child of ours, we can figure out what to do
            var cur = cursor.selectionStart.node;
            var success = false;
            while (cur) {
                if (cur.parent === this) {
                    // Aha, change the selection to be the index of cur
                    cursor.selectionStart = {
                        node: this,
                        position: this.data.indexOf(cur) + 1
                    };
                    success = true;
                    break;
                }
                cur = cur.parent;
            }

            if (!success) {
                throw new Error("Don't know how to deal with selectionStart not in mrow");
            }
        }
        if (cursor.selectionEnd.node !== this) {
            throw new Error("Don't know how to deal with selectionStart not in mrow");
        }

        var pos1 = Math.min(cursor.selectionStart.position, cursor.selectionEnd.position);
        var pos2 = Math.max(cursor.selectionStart.position, cursor.selectionEnd.position);

        if (pos1 === pos2) {
            cursor.clearHighlight();
            return;
        }

        var x1 = this.data[pos1].getSVGBBox().x;
        var pos2bb = this.data[pos2-1].getSVGBBox();
        var x2 = pos2bb.x + pos2bb.width;
        var width = x2 - x1;

        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawHighlightAt(svgelem, x1, bb.y, width, bb.height);
    }
}
