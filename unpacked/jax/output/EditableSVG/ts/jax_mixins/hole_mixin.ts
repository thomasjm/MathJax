/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/bbox.ts" />

class HoleMixin extends MBaseMixin {

    constructor() {
        super();
        this.type = "hole";
    }

    isCursorable() { return true; }

    toSVG(h, d) {
        this.SVGgetStyles();
        var svg = new BBOX_ROW();
        this.SVGhandleSpace(svg);

        if (d != null) {
            svg.sh = h;
            svg.sd = d
        }

        // TODO: do we actually need the check calls?
        // Let's see if we ever see this console.log
        if (this.data.length > 0) {
            console.log('NONTRIVIAL HOLE!!!');
        }

        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                svg.Check(this.data[i]);
            }
        }

        svg.Clean();

        var hole = new BBOX_RECT(400, 0, 300, {
            fill: 'white',
            stroke: 'blue',
            "stroke-width": '20'
        });

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
