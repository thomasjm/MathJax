/// <reference path="mbase_mixin.ts" />

class MTableMixin extends MBaseMixin {
    hasFrame: any;

    toSVG() {
        this.SVGgetStyles();
        var svg = new BBOX_G();

        var scale = this.SVGgetScale(svg);

        if (this.data.length === 0) {this.SVGsaveData(svg);return svg}
        var values = this.getValues("columnalign","rowalign","columnspacing","rowspacing",
                                    "columnwidth","equalcolumns","equalrows",
                                    "columnlines","rowlines","frame","framespacing",
                                    "align","useHeight","width","side","minlabelspacing");

        //  Handle relative width as fixed width in relation to container
        if (values.width.match(/%$/))
        {svg.width = values.width = Util.Em((Util.cwidth/1000)*(parseFloat(values.width)/100))}

        var mu = this.SVGgetMu(svg);
        var LABEL = -1;

        var H = [], D = [], W = [], A = [], C = [], i, j, J = -1,
        m, M, s, row, cell, mo, HD;
        var LH = MathJax.OutputJax.EditableSVG.FONTDATA.lineH * scale * values.useHeight,
        LD = MathJax.OutputJax.EditableSVG.FONTDATA.lineD * scale * values.useHeight;

        //  Create cells and measure columns and rows
        for (i = 0, m = this.data.length; i < m; i++) {
            row = this.data[i]; s = (row.type === "mlabeledtr" ? LABEL : 0);
            A[i] = []; H[i] = LH; D[i] = LD;
            for (j = s, M = row.data.length + s; j < M; j++) {
                if (W[j] == null) {
                    if (j > J) {J = j}
                    C[j] = new BBOX_G();
                    W[j] = -Util.BIGDIMEN;
                }
                cell = row.data[j-s];
                A[i][j] = cell.toSVG();
                //          if (row.data[j-s].isMultiline) {A[i][j].style.width = "100%"}
                if (cell.isEmbellished()) {
                    mo = cell.CoreMO();
                    var min = mo.Get("minsize",true);
                    if (min) {
                        if (mo.SVGcanStretch("Vertical")) {
                            HD = mo.EditableSVGdata.h + mo.EditableSVGdata.d;
                            if (HD) {
                                min = Util.length2em(min,mu,HD);
                                if (min*mo.EditableSVGdata.h/HD > H[i]) {H[i] = min*mo.EditableSVGdata.h/HD}
                                if (min*mo.EditableSVGdata.d/HD > D[i]) {D[i] = min*mo.EditableSVGdata.d/HD}
n                            }
                        } else if (mo.SVGcanStretch("Horizontal")) {
                            min = Util.length2em(min, mu, mo.EditableSVGdata.w);
                            if (min > W[j]) {W[j] = min}
                        }
                    }
                }
                if (A[i][j].h > H[i]) {H[i] = A[i][j].h}
                if (A[i][j].d > D[i]) {D[i] = A[i][j].d}
                if (A[i][j].w > W[j]) {W[j] = A[i][j].w}
            }
        }

        //  Determine spacing and alignment
        var SPLIT = MathJax.Hub.SplitList;
        var CSPACE = SPLIT(values.columnspacing),
        RSPACE = SPLIT(values.rowspacing),
        CALIGN = SPLIT(values.columnalign),
        RALIGN = SPLIT(values.rowalign),
        CLINES = SPLIT(values.columnlines),
        RLINES = SPLIT(values.rowlines),
        CWIDTH = SPLIT(values.columnwidth),
        RCALIGN = [];
        for (i = 0, m = CSPACE.length; i < m; i++) {CSPACE[i] = Util.length2em(CSPACE[i],mu)}
        for (i = 0, m = RSPACE.length; i < m; i++) {RSPACE[i] = Util.length2em(RSPACE[i],mu)}
        while (CSPACE.length <  J) {CSPACE.push(CSPACE[CSPACE.length-1])}
        while (CALIGN.length <= J) {CALIGN.push(CALIGN[CALIGN.length-1])}
        while (CLINES.length <  J) {CLINES.push(CLINES[CLINES.length-1])}
        while (CWIDTH.length <= J) {CWIDTH.push(CWIDTH[CWIDTH.length-1])}
        while (RSPACE.length <  A.length) {RSPACE.push(RSPACE[RSPACE.length-1])}
        while (RALIGN.length <= A.length) {RALIGN.push(RALIGN[RALIGN.length-1])}
        while (RLINES.length <  A.length) {RLINES.push(RLINES[RLINES.length-1])}
        if (C[LABEL]) {
            CALIGN[LABEL] = (values.side.substr(0,1) === "l" ? "left" : "right");
            CSPACE[LABEL] = -W[LABEL];
        }

        //  Override row data
        for (i = 0, m = A.length; i < m; i++) {
            row = this.data[i]; RCALIGN[i] = [];
            if (row.rowalign) {RALIGN[i] = row.rowalign}
            if (row.columnalign) {
                RCALIGN[i] = SPLIT(row.columnalign);
                while (RCALIGN[i].length <= J) {RCALIGN[i].push(RCALIGN[i][RCALIGN[i].length-1])}
            }
        }

        //  Handle equal heights
        if (values.equalrows) {
            // FIXME:  should really be based on row align (below is for baseline)
            var Hm = Math.max.apply(Math,H), Dm = Math.max.apply(Math,D);
            for (i = 0, m = A.length; i < m; i++)
            {s = ((Hm + Dm) - (H[i] + D[i])) / 2;  H[i] += s; D[i] += s}
        }

        //  FIXME:  do background colors for entire cell (include half the intercolumn space?)

        //  Determine array total height
        HD = H[0] + D[A.length-1];
        for (i = 0, m = A.length-1; i < m; i++)
        {HD += Math.max(0,D[i]+H[i+1]+RSPACE[i])}

        //  Determine frame and line sizes
        var fx = 0, fy = 0, fW, fH = HD;
        if (values.frame !== "none" ||
            (values.columnlines+values.rowlines).match(/solid|dashed/)) {
            var frameSpacing = SPLIT(values.framespacing);
            if (frameSpacing.length != 2) {
                // invalid attribute value: use the default.
                frameSpacing = SPLIT(this.defaults.framespacing);
            }
            fx = Util.length2em(frameSpacing[0],mu);
            fy = Util.length2em(frameSpacing[1],mu);
            fH = HD + 2*fy; // fW waits until svg.w is determined
        }

        //  Compute alignment
        var Y, fY, n = "";
        if (typeof(values.align) !== "string") {values.align = String(values.align)}
        if (values.align.match(/(top|bottom|center|baseline|axis)( +(-?\d+))?/)) {
            n = RegExp.$3||"";
            values.align = RegExp.$1
        } else {
            values.align = this.defaults.align
        }
        if (n !== "") {
            //  Find the height of the given row
            n = parseInt(n);
            if (n < 0) {n = A.length + 1 + n}
            if (n < 1) {n = 1} else if (n > A.length) {n = A.length}
            Y = 0; fY = -(HD + fy) + H[0];
            for (i = 0, m = n-1; i < m; i++) {
                // FIXME:  Should handle values.align for final row
                var dY = Math.max(0,D[i]+H[i+1]+RSPACE[i]);
                Y += dY; fY += dY;
            }
        } else {
            Y = ({
                top:    -(H[0] + fy),
                bottom:   HD + fy - H[0],
                center:   HD/2 - H[0],
                baseline: HD/2 - H[0],
                axis:     HD/2 + Util.TeX.axis_height*scale - H[0]
            })[values.align];
            fY = ({
                top:      -(HD + 2*fy),
                bottom:   0,
                center:   -(HD/2 + fy),
                baseline: -(HD/2 + fy),
                axis:     Util.TeX.axis_height*scale - HD/2 - fy
            })[values.align];
        }

        var WW, WP = 0, Wt = 0, Wp = 0, p = 0, f = 0, P = [], F = [], Wf = 1;
        //
        if (values.equalcolumns && values.width !== "auto") {
            //  Handle equalcolumns for percent-width and fixed-width tables

            //  Get total width minus column spacing
            WW = Util.length2em(values.width,mu);
            for (i = 0, m = Math.min(J+1,CSPACE.length); i < m; i++) {WW -= CSPACE[i]}
            //  Determine individual column widths
            WW /= J+1;
            for (i = 0, m = Math.min(J+1,CWIDTH.length); i < m; i++) {W[i] = WW}
        } else {
            //  Get column widths for fit and percentage columns
            //  Calculate the natural widths and percentage widths,
            //    while keeping track of the fit and percentage columns
            for(i = 0, m = Math.min(J+1,CWIDTH.length); i < m; i++) {
                if (CWIDTH[i] === "auto") {Wt += W[i]}
                else if (CWIDTH[i] === "fit") {F[f] = i; f++; Wt += W[i]}
                else if (CWIDTH[i].match(/%$/))
                {P[p] = i; p++; Wp += W[i]; WP += Util.length2em(CWIDTH[i],mu,1)}
                else {W[i] = Util.length2em(CWIDTH[i],mu); Wt += W[i]}
            }
            // Get the full width (excluding inter-column spacing)
            if (values.width === "auto") {
                if (WP > .98) {Wf = Wp/(Wt+Wp); WW = Wt + Wp} else {WW = Wt / (1-WP)}
            } else {
                WW = Util.length2em(values.width,mu);
                for (i = 0, m = Math.min(J+1,CSPACE.length); i < m; i++) {WW -= CSPACE[i]}
            }
            //  Determine the relative column widths
            for (i = 0, m = P.length; i < m; i++) {
                W[P[i]] = Util.length2em(CWIDTH[P[i]],mu,WW*Wf); Wt += W[P[i]];
            }
            //  Stretch fit columns, if any, otherwise stretch (or shrink) everything
            if (Math.abs(WW - Wt) > .01) {
                if (f && WW > Wt) {
                    WW = (WW - Wt) / f; for (i = 0, m = F.length; i < m; i++) {W[F[i]] += WW}
                } else {WW = WW/Wt; for (j = 0; j <= J; j++) {W[j] *= WW}}
            }
            //  Handle equal columns
            if (values.equalcolumns) {
                var Wm = Math.max.apply(Math,W);
                for (j = 0; j <= J; j++) {W[j] = Wm}
            }
        }

        //  Lay out array columns
        var y = Y, dy, align; s = (C[LABEL] ? LABEL : 0);
        for (j = s; j <= J; j++) {
            C[j].w = W[j];
            for (i = 0, m = A.length; i < m; i++) {
                if (A[i][j]) {
                    s = (this.data[i].type === "mlabeledtr" ? LABEL : 0);
                    cell = this.data[i].data[j-s];
	                if (cell.SVGcanStretch("Horizontal")) {
	                    A[i][j] = cell.SVGstretchH(W[j]);
	                } else if (cell.SVGcanStretch("Vertical")) {
	                    mo = cell.CoreMO();
	                    var symmetric = mo.symmetric; mo.symmetric = false;
	                    A[i][j] = cell.SVGstretchV(H[i],D[i]);
	                    mo.symmetric = symmetric;
	                }
                    align = cell.rowalign||this.data[i].rowalign||RALIGN[i];
                    dy = ({top:    H[i] - A[i][j].h,
                           bottom: A[i][j].d - D[i],
                           center: ((H[i]-D[i]) - (A[i][j].h-A[i][j].d))/2,
                           baseline: 0, axis: 0})[align] || 0; // FIXME:  handle axis better?
                    align = (cell.columnalign||RCALIGN[i][j]||CALIGN[j])
                    C[j].Align(A[i][j],align,0,y+dy);
                }
                if (i < A.length-1) {y -= Math.max(0,D[i]+H[i+1]+RSPACE[i])}
            }
            y = Y;
        }

        //  Place the columns and add column lines
        var lw = 1.5*Util.em;
        var x = fx - lw/2;
        for (j = 0; j <= J; j++) {
            svg.Add(C[j],x,0); x += W[j] + CSPACE[j];
            if (CLINES[j] !== "none" && j < J && j !== LABEL) {
                svg.Add(new BBOX_VLINE(fH, lw, CLINES[j]), x-CSPACE[j]/2, fY);
            }
        }
        svg.w += fx; svg.d = -fY; svg.h = fH+fY;
        fW = svg.w;

        //  Add frame
        if (values.frame !== "none") {
            svg.Add(new BBOX_HLINE(fW,lw,values.frame),0,fY+fH-lw);
            svg.Add(new BBOX_HLINE(fW,lw,values.frame),0,fY);
            svg.Add(new BBOX_VLINE(fH,lw,values.frame),0,fY);
            svg.Add(new BBOX_VLINE(fH,lw,values.frame),fW-lw,fY);
        }

        //  Add row lines
        y = Y - lw/2;
        for (i = 0, m = A.length-1; i < m; i++) {
            dy = Math.max(0,D[i]+H[i+1]+RSPACE[i]);
            if (RLINES[i] !== "none") {
                svg.Add(new BBOX_HLINE(fW,lw,RLINES[i]), 0, y-D[i]-(dy-D[i]-H[i+1])/2)
            }
            y -= dy;
        }

        //
        //  Finish the table
        //
        svg.Clean();
        this.SVGhandleSpace(svg);
        this.SVGhandleColor(svg);

        //  Place the labels, if any
        if (C[LABEL]) {
            svg.tw = Math.max(svg.w,svg.r) - Math.min(0,svg.l);
            var indent = this.getValues("indentalignfirst","indentshiftfirst","indentalign","indentshift");
            if (indent.indentalignfirst !== MathJax.ElementJax.mml.INDENTALIGN.INDENTALIGN) {indent.indentalign = indent.indentalignfirst}
            if (indent.indentalign === MathJax.ElementJax.mml.INDENTALIGN.AUTO) {indent.indentalign = this.displayAlign}
            if (indent.indentshiftfirst !== MathJax.ElementJax.mml.INDENTSHIFT.INDENTSHIFT) {indent.indentshift = indent.indentshiftfirst}
            if (indent.indentshift === "auto" || indent.indentshift === "") {indent.indentshift = "0"}
            var shift = Util.length2em(indent.indentshift,mu,Util.cwidth);
            var labelshift = Util.length2em(values.minlabelspacing,mu,Util.cwidth);
            if (this.displayIndent !== "0") {
                var dIndent = Util.length2em(this.displayIndent,mu,Util.cwidth);
                shift += (indent.indentAlign === MathJax.ElementJax.mml.INDENTALIGN.RIGHT ? -dIndent: dIndent);
            }
            var eqn = svg;
            svg = new BBOX_SVG();
            svg.w = svg.r = Util.cwidth; svg.hasIndent = true;
            svg.Align(C[LABEL],CALIGN[LABEL],labelshift,0);
            svg.Align(eqn,indent.indentalign,0,0,shift);
            svg.tw += C[LABEL].w + shift +
                (indent.indentalign === MathJax.ElementJax.mml.INDENTALIGN.CENTER ? 8 : 4)*labelshift;
        }

        this.SVGsaveData(svg);
        return svg;
    }

    SVGhandleSpace(svg) {
        if (!this.hasFrame && !svg.width) {
            svg.x = svg.X = 167;
        }
        super.SVGhandleSpace(svg);
    }

    //////////////////
    // Cursor stuff //
    //////////////////

    isCursorable() { return true; }

    moveCursorFromParent(cursor, direction) {
        if (direction == Direction.RIGHT) {
            // Try to move into the (0, 0) cell
            var mtr = this.data[0];
            var mtd = mtr.data[0];
            return mtd.data[0].moveCursorFromParent(cursor, direction);
        } else if (direction == Direction.LEFT) {
            // Try to move into the bottom right cell
            var mtr = this.data[this.data.length-1];
            var mtd = mtr.data[mtr.data.length-1];
            return mtd.data[0].moveCursorFromParent(cursor, direction);
        } else {
            console.log("TODO: unimplemented direction for moveCursorFromParent in mtable_mixin.ts");
        }
    }

    moveCursorFromChild(cursor, direction, child) {
        console.log("moveCursorFromChild called!");
    }

    // TODO: fix this to use the normal (x, y), not the (clientX, clientY)
    moveCursorFromClick(cursor, x, y, clientX, clientY) {
        // See if we hit any cell
        for (var i = 0; i < this.data.length; i++) {
            var mtr = this.data[i];
            for (var j = 0; j < mtr.data.length; j++) {
                var mtd = mtr.data[j];

                var node = mtd.data[0];
                if (Util.nodeContainsScreenPoint(node, clientX, clientY)) {
                    node.moveCursorFromClick(cursor, x, y);
                    return;
                }
            }
        }

        console.log("Didn't manage to move cursor");
    }

    moveCursor(cursor, direction) {
        console.log("moveCursor called!");
    }

    drawCursor(cursor) {
        console.log("drawCursor called!");
    }

    drawCursorHighlight(cursor) {
        console.log('drawCursorHighlight called!');
    }

    addRow() {
        var MML = MathJax.ElementJax.mml;

        var numCols = this.data[0].data.length;
        var newRow = new MML.mtr();
        for (var i = 0; i < numCols; i++) {
            var mtd = new MML.mtd();
            mtd.SetData(0, new MML.hole());
            newRow.SetData(i, mtd);
        }
        this.SetData(this.data.length, newRow);
    }

    addColumn() {
        var MML = MathJax.ElementJax.mml;
        for (var i = 0; i < this.data.length; i++) {
            var mtd = new MML.mtd();
            mtd.SetData(0, new MML.hole());
            this.data[i].SetData(this.data[i].data.length, mtd);
        }
    }
}


class MTableRowMixin extends MBaseMixin {
    isCursorable() { return true; }

    moveCursorFromChild(cursor, direction, child) {
        console.log("mtr moveCursorFromChild called!");
    }
}

class MTableCellMixin extends MBaseMixin {
    isCursorable() { return true; }

    moveCursorFromChild(cursor, direction, child) {
        // Determine the row and column number

        var row = this.parent;
        var mtable = this.parent.parent;

        var colIndex = row.data.indexOf(this);
        var rowIndex = mtable.data.indexOf(row);

        var w = row.data.length;
        var h = mtable.data.length;

        if (direction == Direction.RIGHT) {
            if (colIndex == w-1) {
                // Try to move right of the matrix
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            } else {
                // Move one cell to the right
                var neighborMtd = row.data[colIndex+1];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        } else if (direction == Direction.LEFT) {
            if (colIndex == 0) {
                // Try to move left of the matrix
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            } else {
                // Move one cell to the left
                var neighborMtd = row.data[colIndex-1];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        } else if (direction == Direction.DOWN) {
            if (rowIndex == h-1) {
                // Try to move below the matrix
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            } else {
                // Move one cell down
                var neighborRow = mtable.data[rowIndex+1];
                var neighborMtd = neighborRow.data[colIndex];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        } else if (direction == Direction.UP) {
            if (rowIndex == 0) {
                // Try to move above the matrix
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            } else {
                // Move one cell down
                var neighborRow = mtable.data[rowIndex-1];
                var neighborMtd = neighborRow.data[colIndex];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        }
    }

    moveCursorFromParent(cursor, direction) {
        // We should contain an mrow, so move into it
        this.data[0].moveCursorFromParent(cursor, direction);
    }
}
