/// <reference path="mbase_mixin.ts" />

class HoleMixin extends MBaseMixin {

    constructor() {
        this.type = "hole";
    }

    isCursorable() { return true; }

    toSVG(h, d) {
        this.SVGgetStyles();
        var svg = this.SVG();
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

        svg.Clean();

        var hole = SVG.createHole(300, 400);
        svg.Add(hole, 0, 0);

        svg.Clean();

        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);

        return svg;
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    moveCursorFromParent(cursor, direction) {
        cursor.moveTo(this, 0)
        return true
    }

    moveCursorFromChild(cursor, direction, child) {
        throw new Error('Hole does not have a child')
    }

    moveCursorFromClick(cursor, x, y) {
        cursor.moveTo(this, 0);
        return true
    }

    moveCursor(cursor, direction) {
        return this.parent.moveCursorFromChild(cursor, direction, this)
    }

    drawCursor(cursor) {
        var bbox = this.getSVGBBox()
        var x = bbox.x + (bbox.width / 2.0);
        var y = bbox.y;
        var height = bbox.height;
        cursor.drawAt(this.EditableSVGelem.ownerSVGElement, x, y, height);
    }
}
