/// <reference path="mbase_mixin.ts" />

class TeXAtomMixin extends MBaseMixin {
    static cursorable = true;

    texClass: any;

    toSVG(HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX();

        this.SVGhandleSpace(svg);
        if (this.data[0] != null) {
            var box = this.EditableSVGdataStretched(0, HW, D),
            y = 0;
            if (this.texClass === MathJax.ElementJax.mml.TEXCLASS.VCENTER) {
                y = Util.TeX.axis_height - (box.h + box.d) / 2 + box.d;
            }
            svg.Add(box, 0, y);
            svg.ic = box.ic;
            svg.skew = box.skew;
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    moveCursorFromParent(cursor, direction) {
        return this.data[0].moveCursorFromParent(cursor, direction);
    }

    moveCursorFromChild(cursor, direction, child) {
        return this.parent.moveCursorFromChild(cursor, direction, this);
    }

    moveCursorFromClick(cursor, x, y) {
        return this.data[0].moveCursorFromClick(cursor, x, y)
    }

    moveCursor(cursor, direction) {
        return this.parent.moveCursorFromChild(cursor, direction, this)
    }

    drawCursor(cursor) {
        console.error('TeXAtom drawCursor NOT IMPLEMENTED');
    }
}
