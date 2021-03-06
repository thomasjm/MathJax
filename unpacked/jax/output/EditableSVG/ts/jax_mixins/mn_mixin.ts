/// <reference path="mbase_mixin.ts" />

class MnMixin extends MBaseMixin {
    svg: any;

    isCursorable() { return true; }


    getCursorLength() {
        return this.data[0].data[0].length
    }

    moveCursor(cursor, direction) {
        direction = Util.getCursorValue(direction)

        var vertical = direction === Direction.UP || direction === Direction.DOWN
        if (vertical) return this.parent.moveCursorFromChild(cursor, direction, this)

        var newPosition = cursor.position + (direction === Direction.LEFT ? -1 : 1)
        if (newPosition < 0 || newPosition > this.getCursorLength()) {
            this.parent.moveCursorFromChild(cursor, direction, this)
            return
        }
        cursor.moveTo(this, newPosition)
    }

    moveCursorFromChild(cursor, direction, child) {
        throw new Error('Unimplemented as cursor container')
    }

    moveCursorFromParent(cursor, direction) {
        direction = Util.getCursorValue(direction)
        if (direction === Direction.LEFT) {
            cursor.moveTo(this, this.getCursorLength())
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

    // TODO: unify this with MRowMixin
    moveCursorFromClick(cursor, x, y) {
        for (var childIdx = 0; childIdx < this.getCursorLength(); ++childIdx) {
            var child = this.data[childIdx];
            var bb = child.getSVGBBox();
            var midpoint = bb.x + (bb.width / 2);

            if (x < midpoint) {
                cursor.moveTo(this, childIdx);
                return true;
            }
        }

        cursor.moveTo(this, this.data.length);
        return true;
    }

    // TODO: unify this with MRowMixin
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
            preedge = prebox.x+prebox.width;
        }

        if (cursor.position === this.getCursorLength()) {
            postedge = bbox.x+bbox.width;
        } else {
            var postbox = this.data[cursor.position].getSVGBBox();
            postedge = postbox.x
        }

        var x = (postedge + preedge) / 2;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawAt(svgelem, x, y, height);
    }
}
