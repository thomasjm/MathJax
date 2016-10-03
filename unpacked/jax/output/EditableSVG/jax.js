var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Direction;
(function (Direction) {
    Direction[Direction["UP"] = 0] = "UP";
    Direction[Direction["RIGHT"] = 1] = "RIGHT";
    Direction[Direction["DOWN"] = 2] = "DOWN";
    Direction[Direction["LEFT"] = 3] = "LEFT";
})(Direction || (Direction = {}));
var Cursor = (function () {
    function Cursor(color, isOtherCursor) {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.mode = Cursor.CursorMode.NORMAL;
        this.color = color || '#777777';
        this.isOtherCursor = isOtherCursor;
        this.id = Math.random().toString(36).substring(2);
        this.width = 50;
    }
    Cursor.prototype.refocus = function () {
        if (!this.node ||
            !this.node.EditableSVGelem ||
            !this.node.EditableSVGelem.ownerSVGElement ||
            !this.node.EditableSVGelem.ownerSVGElement.parentNode)
            return false;
        var parent = this.node.EditableSVGelem.ownerSVGElement.parentNode;
        parent.focus();
        this.draw();
    };
    Cursor.prototype.moveToClick = function (event) {
        var target = event.target;
        var svg = target.nodeName === 'svg' ? target : target.ownerSVGElement;
        if (!svg)
            return;
        var cp = Util.screenCoordsToElemCoords(svg, event.clientX, event.clientY);
        var jax = MathJax.OutputJax.EditableSVG.getJaxFromMath(svg.parentNode);
        var current = jax.root;
        while (true) {
            var matchedItems = current.data.filter(function (node) {
                if (node === null)
                    return false;
                return Util.nodeContainsScreenPoint(node, event.clientX, event.clientY);
            });
            if (matchedItems.length > 1) {
                console.error('Huh? matched more than one child');
            }
            else if (matchedItems.length === 0) {
                break;
            }
            var matched = matchedItems[0];
            if (matched.isCursorable()) {
                current = matched;
            }
            else {
                break;
            }
        }
        current.moveCursorFromClick(this, cp.x, cp.y, event.clientX, event.clientY);
    };
    Cursor.prototype.moveTo = function (node, position) {
        if (this.mode === Cursor.CursorMode.BACKSLASH && !node.backslashRow)
            return false;
        this.node = node;
        this.position = position;
        if (this.mode === Cursor.CursorMode.SELECTION) {
            this.selectionEnd = {
                node: this.node,
                position: this.position
            };
        }
        if (!this.isOtherCursor)
            this.signalCursorMovement();
    };
    Cursor.prototype.updateSelection = function (shiftKey) {
        if (shiftKey && this.mode === Cursor.CursorMode.NORMAL) {
            this.mode = Cursor.CursorMode.SELECTION;
            this.selectionStart = {
                node: this.node,
                position: this.position
            };
        }
        else if (this.mode === Cursor.CursorMode.SELECTION) {
            if (shiftKey) {
                this.selectionEnd = {
                    node: this.node,
                    position: this.position
                };
            }
            else {
                this.mode = Cursor.CursorMode.NORMAL;
                this.selectionStart = this.selectionEnd = null;
                this.clearHighlight();
            }
        }
    };
    Cursor.prototype.move = function (direction, shiftKey) {
        this.updateSelection(shiftKey);
        this.node.moveCursor(this, direction);
    };
    Cursor.prototype.draw = function () {
        if (!this.node)
            return;
        this.node.drawCursor(this);
    };
    Cursor.prototype.keydown = function (event, recall) {
        var direction;
        switch (event.which) {
            case 8:
                this.backspace(event, recall);
                break;
            case 27:
                this.exitBackslashMode(false);
                recall(['refocus', this]);
                break;
            case 38:
                direction = Direction.UP;
                break;
            case 40:
                direction = Direction.DOWN;
                break;
            case 37:
                direction = Direction.LEFT;
                break;
            case 39:
                direction = Direction.RIGHT;
                break;
        }
        if (direction !== undefined) {
            this.move(direction, event.shiftKey);
            this.draw();
            event.preventDefault();
        }
    };
    Cursor.prototype.mousedown = function (event, recall) {
        event.preventDefault();
        this.updateSelection(event.shiftKey);
        this.moveToClick(event);
        this.refocus();
    };
    Cursor.prototype.makeHoleIfNeeded = function (node) {
        if (node.data.length === 0) {
            var hole = MathJax.ElementJax.mml.hole();
            var rowindex = node.parent.data.indexOf(node);
            node.parent.SetData(rowindex, hole);
            hole.moveCursorFromParent(this);
        }
    };
    Cursor.prototype.exitBackslashMode = function (replace) {
        this.mode = Cursor.CursorMode.NORMAL;
        var ppos = this.node.parent.data.indexOf(this.node);
        if (!replace) {
            this.node.parent.data.splice(ppos, 1);
        }
        else {
            var data = this.node.parent.data;
            var arr = [];
            for (var i = 0; i < replace.length; i++)
                arr.push(null);
            data.splice.apply(data, [ppos, 1].concat(arr));
            for (var i = 0; i < replace.length; i++) {
                this.node.parent.SetData(ppos + i, replace[i]);
            }
        }
        if (replace && replace.moveCursorAfter) {
            this.moveTo.apply(this, replace.moveCursorAfter);
        }
        else {
            this.moveTo(this.node.parent, ppos + 1);
        }
    };
    Cursor.prototype.backspace = function (event, recall) {
        event.preventDefault();
        if (!this.node)
            return;
        if (this.mode === Cursor.CursorMode.SELECTION) {
            if (this.selectionStart.node.type === 'mrow' &&
                this.selectionStart.node === this.selectionEnd.node) {
                var pos1 = Math.min(this.selectionStart.position, this.selectionEnd.position);
                var pos2 = Math.max(this.selectionStart.position, this.selectionEnd.position);
                this.selectionStart.node.data.splice(pos1, pos2 - pos1);
                this.moveTo(this.node, pos1);
                this.clearHighlight();
                this.makeHoleIfNeeded(this.node);
                recall(['refocus', this]);
            }
            else {
                throw new Error("Don't know how to do this backspace");
            }
            return;
        }
        if (this.node.type === 'mrow') {
            var prev = this.node.data[this.position - 1];
            if (!prev.isCursorable()) {
                if (this.mode === Cursor.CursorMode.BACKSLASH && this.node.data.length === 1) {
                    this.exitBackslashMode(false);
                }
                else {
                    this.node.data.splice(this.position - 1, 1);
                    this.position = this.position - 1;
                    this.makeHoleIfNeeded(this.node);
                }
                recall(['refocus', this]);
            }
            else {
                this.mode = Cursor.CursorMode.SELECTION;
                this.selectionStart = {
                    node: this.node,
                    position: this.position
                };
                this.selectionEnd = {
                    node: this.node,
                    position: this.position - 1
                };
                recall(['refocus', this]);
            }
        }
        else if (this.node.type === 'hole') {
            console.log('backspace on hole!');
        }
    };
    Cursor.prototype.makeEntityMo = function (unicode) {
        var mo = new MathJax.ElementJax.mml.mo();
        var entity = new MathJax.ElementJax.mml.entity();
        entity.Append(unicode);
        mo.Append(entity);
        return mo;
    };
    Cursor.prototype.makeEntityMi = function (unicode) {
        var mi = new MathJax.ElementJax.mml.mi();
        var entity = new MathJax.ElementJax.mml.entity();
        entity.Append(unicode);
        mi.Append(entity);
        return mi;
    };
    Cursor.prototype.createAndMoveIntoHole = function (msubsup, index) {
        console.log('CREATING HOLE');
        var hole = new MathJax.ElementJax.mml.hole();
        msubsup.SetData(index, hole);
        this.moveTo(hole, 0);
    };
    Cursor.prototype.handleSuperOrSubscript = function (recall, c) {
        if (this.position === 0) {
            return;
        }
        var prev = this.node.data[this.position - 1];
        var index = (c === "_") ? MathJax.ElementJax.mml.msubsup().sub : MathJax.ElementJax.mml.msubsup().sup;
        if (prev.type === "msubsup" || prev.type === "munderover") {
            if (prev.data[index]) {
                var thing = prev.data[index];
                if (thing.isCursorable()) {
                    thing.moveCursorFromParent(this, Direction.LEFT);
                }
                else {
                    this.moveTo(prev, {
                        section: index,
                        pos: 1,
                    });
                }
            }
            else {
                this.createAndMoveIntoHole(prev, index);
            }
        }
        else {
            var msubsup = MathJax.ElementJax.mml.msubsup();
            msubsup.SetData(msubsup.base, prev);
            this.node.SetData(this.position - 1, msubsup);
            this.createAndMoveIntoHole(msubsup, index);
        }
        recall(['refocus', this]);
    };
    Cursor.prototype.handleSpace = function (recall, c) {
        if (this.mode === Cursor.CursorMode.BACKSLASH) {
            var latex = "";
            for (var i = 1; i < this.node.data.length; i++) {
                var mi = this.node.data[i];
                if (mi.type !== 'mi') {
                    throw new Error('Found non-identifier in backslash expression');
                }
                var chars = mi.data[0];
                latex += chars.data[0];
            }
            var result = Parser.parseControlSequence(latex);
            if (!result) {
                this.node.EditableSVGelem.classList.add('invalid');
                return;
            }
            console.log("Got result: ", result);
            var mrow = this.node;
            var index = mrow.parent.data.indexOf(mrow);
            this.exitBackslashMode(result);
            recall([this, function () {
                    this.refocus();
                }]);
        }
        else {
            this.node.moveCursor(this, Direction.RIGHT);
            recall([this, function () {
                    this.refocus();
                    this.mode = Cursor.CursorMode.NORMAL;
                }]);
        }
    };
    Cursor.prototype.keypress = function (event, recall) {
        event.preventDefault();
        var code = event.charCode || event.keyCode || event.which;
        var c = String.fromCharCode(code);
        var toInsert;
        if (!this.node)
            return;
        if (this.mode === Cursor.CursorMode.BACKSLASH) {
            this.node.EditableSVGelem.classList.remove('invalid');
        }
        if (event.ctrlKey && event.shiftKey) {
            var node = this.node;
            while (node) {
                if (node.type == "mtable" && code == 10) {
                    node.addColumn();
                    recall([this, function () { this.refocus(); }]);
                }
                node = node.parent;
            }
        }
        if (event.ctrlKey && !event.shiftKey) {
            var node = this.node;
            while (node) {
                if (node.type == "mtable" && code == 10) {
                    node.addRow();
                    recall([this, function () { this.refocus(); }]);
                }
                node = node.parent;
            }
        }
        if (this.node.type === 'hole') {
            var parent = this.node.parent;
            var holeIndex = parent.data.indexOf(this.node);
            var row = MathJax.ElementJax.mml.mrow();
            parent.SetData(holeIndex, row);
            row.moveCursorFromParent(this, Direction.RIGHT);
        }
        if (this.node.type === 'mrow') {
            if (c === "\\") {
                if (this.mode !== Cursor.CursorMode.BACKSLASH) {
                    this.mode = Cursor.CursorMode.BACKSLASH;
                    var grayRow = MathJax.ElementJax.mml.mrow(MathJax.ElementJax.mml.mo(MathJax.ElementJax.mml.entity('#x005C')));
                    grayRow.backslashRow = true;
                    this.node.data.splice(this.position, 0, null);
                    this.node.SetData(this.position, grayRow);
                    var oldClass = grayRow.class ? grayRow.class + ' ' : '';
                    grayRow.class = oldClass + "backslash-mode";
                    recall([this, function () {
                            this.moveTo(grayRow, 1);
                            this.refocus();
                        }]);
                    return;
                }
                else {
                    console.log('TODO: insert a \\');
                }
            }
            else if (c === "^" || c === "_") {
                return this.handleSuperOrSubscript(recall, c);
            }
            else if (c === " ") {
                return this.handleSpace(recall, c);
            }
            if (MathJax.InputJax.TeX.Definitions.letter.test(c)) {
                toInsert = new MathJax.ElementJax.mml.mi(new MathJax.ElementJax.mml.chars(c));
            }
            else if (MathJax.InputJax.TeX.Definitions.number.test(c)) {
                toInsert = new MathJax.ElementJax.mml.mn(new MathJax.ElementJax.mml.chars(c));
            }
            else if (MathJax.InputJax.TeX.Definitions.remap[c]) {
                toInsert = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.entity('#x' + MathJax.InputJax.TeX.Definitions.remap[c]));
            }
            else if (c === '+' || c === '/' || c === '=' || c === '.' || c === '(' || c === ')') {
                toInsert = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.chars(c));
            }
        }
        if (!toInsert)
            return;
        this.node.data.splice(this.position, 0, null);
        this.node.SetData(this.position, toInsert);
        recall([this, function () {
                this.move(Direction.RIGHT);
                this.refocus();
            }]);
    };
    Cursor.prototype.clearBoxes = function () {
        if (this.boxes) {
            this.boxes.forEach(function (elem) {
                elem.remove();
            });
        }
        this.boxes = [];
    };
    Cursor.prototype.highlightBoxes = function (svg) {
        var cur = this.node;
        this.clearBoxes();
        while (cur) {
            if (cur.isCursorable()) {
                var bb = cur.getSVGBBox();
                if (!bb)
                    return;
                this.boxes = this.boxes.concat(Util.highlightBox(svg, bb));
            }
            cur = cur.parent;
        }
    };
    Cursor.prototype.findElement = function () {
        return document.getElementById('cursor-' + this.id);
    };
    Cursor.prototype.findHighlight = function () {
        return document.getElementById('cursor-highlight-' + this.id);
    };
    Cursor.prototype.drawAt = function (svgelem, x, y, height, skipScroll) {
        this.renderedPosition = { x: x, y: y, height: height };
        var celem = this.findElement();
        if (!celem) {
            celem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            celem.setAttribute('fill', this.color);
            celem.setAttribute('class', 'math-cursor');
            celem.id = 'cursor-' + this.id;
            svgelem.appendChild(celem);
        }
        else {
            var oldclass = celem.getAttribute('class');
            celem.setAttribute('class', oldclass.split('blink').join(''));
        }
        celem.setAttribute('x', x);
        celem.setAttribute('y', y);
        celem.setAttribute('width', this.width.toString());
        celem.setAttribute('height', height);
        clearTimeout(this.startBlink);
        this.startBlink = setTimeout(function () {
            celem.setAttribute('class', celem.getAttribute('class') + ' blink');
        }.bind(this), 500);
        this.highlightBoxes(svgelem);
        if (this.mode === Cursor.CursorMode.SELECTION) {
            if (this.selectionEnd.node.type === 'mrow') {
                this.selectionEnd.node.drawCursorHighlight(this);
            }
        }
        if (!skipScroll)
            this.scrollIntoView(svgelem);
    };
    Cursor.prototype.signalCursorMovement = function () {
        var node = this.node;
        if (!node)
            return;
        var position = this.position;
        var path = [];
        while (node.parent) {
            var i = node.parent.data.indexOf(node);
            path.unshift(i);
            node = node.parent;
        }
        var id = node.inputID + "-Frame";
        MathJax.hiteSignal.Post(["EditableSVG cursor_drawn", id, path, position]);
    };
    Cursor.prototype.clearHighlight = function () {
        this.mode = Cursor.CursorMode.NORMAL;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.hideHighlight();
    };
    Cursor.prototype.hideHighlight = function () {
        var celem = this.findHighlight();
        if (celem) {
            celem.remove();
        }
    };
    Cursor.prototype.drawHighlightAt = function (svgelem, x, y, w, h) {
        var celem = this.findHighlight();
        if (!celem) {
            celem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            celem.setAttribute('fill', 'rgba(173, 216, 250, 0.5)');
            celem.setAttribute('class', 'math-cursor-highlight');
            celem.id = 'cursor-highlight-' + this.id;
            svgelem.appendChild(celem);
        }
        celem.setAttribute('x', x);
        celem.setAttribute('y', y);
        celem.setAttribute('width', w);
        celem.setAttribute('height', h);
    };
    Cursor.prototype.scrollIntoView = function (svgelem) {
        if (!this.renderedPosition)
            return false;
        var x = this.renderedPosition.x;
        var y = this.renderedPosition.y;
        var height = this.renderedPosition.height;
        var clientPoint = Util.elemCoordsToScreenCoords(svgelem, x, y + height / 2);
        var clientWidth = document.body.clientWidth;
        var clientHeight = document.body.clientHeight;
        var sx = 0, sy = 0;
        if (clientPoint.x < 0 || clientPoint.x > clientWidth) {
            sx = clientPoint.x - clientWidth / 2;
        }
        if (clientPoint.y < 0 || clientPoint.y > clientHeight) {
            sy = clientPoint.y - clientHeight / 2;
        }
        if (sx || sy) {
            window.scrollBy(sx, sy);
        }
    };
    Cursor.prototype.remove = function () {
        var cursor = this.findElement();
        if (cursor)
            cursor.remove();
    };
    Cursor.prototype.blur = function (event) {
        this.remove();
        this.clearBoxes();
    };
    Cursor.prototype.focus = function () {
        this.draw();
    };
    Cursor.prototype.focusFirstHole = function (root) {
        if (!root)
            return;
        if (root.type === "hole") {
            this.node = root;
            this.position = 0;
            this.draw();
            return true;
        }
        for (var i = 0; i < root.data.length; i++) {
            if (this.focusFirstHole(root.data[i]))
                return true;
        }
        return false;
    };
    Cursor.CursorMode = {
        BACKSLASH: "backslash",
        NORMAL: "normal",
        SELECTION: "selection"
    };
    return Cursor;
}());
var EditableSVGConfig = (function () {
    function EditableSVGConfig() {
    }
    EditableSVGConfig.styles = {
        ".MathJax_SVG": {
            "display": "inline",
            "font-style": "normal",
            "font-weight": "normal",
            "line-height": "normal",
            "font-size": "100%",
            "font-size-adjust": "none",
            "text-indent": 0,
            "text-align": "left",
            "text-transform": "none",
            "letter-spacing": "normal",
            "word-spacing": "normal",
            "word-wrap": "normal",
            "white-space": "nowrap",
            "float": "none",
            "direction": "ltr",
            "max-width": "none",
            "max-height": "none",
            "min-width": 0,
            "min-height": 0,
            border: 0,
            padding: 0,
            margin: 0
        },
        ".MathJax_SVG_Display": {
            position: "relative",
            display: "block!important",
            "text-indent": 0,
            "max-width": "none",
            "max-height": "none",
            "min-width": 0,
            "min-height": 0,
            width: "100%"
        },
        ".MathJax_SVG *": {
            transition: "none",
            "-webkit-transition": "none",
            "-moz-transition": "none",
            "-ms-transition": "none",
            "-o-transition": "none"
        },
        ".mjx-svg-href": {
            fill: "blue",
            stroke: "blue"
        },
        ".MathJax_SVG_Processing": {
            visibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: "hidden",
            display: "block!important"
        },
        ".MathJax_SVG_Processed": {
            display: "none!important"
        },
        ".MathJax_SVG_ExBox": {
            display: "block!important",
            overflow: "hidden",
            width: "1px",
            height: "60ex",
            "min-height": 0,
            "max-height": "none",
            padding: 0,
            border: 0,
            margin: 0
        },
        ".backslash-mode use": {
            fill: "gray",
            stroke: "gray"
        },
        '.backslash-mode.invalid use': {
            fill: '#ff0000',
            stroke: '#ff0000',
        },
        '.math-cursor.blink': {
            'animation': 'blink 1.06s steps(2, start) infinite',
            '-webkit-animation': 'blink 1.06s steps(2, start) infinite',
        },
        '@keyframes blink': 'to {visibility: hidden}',
        '@-webkit-keyframes blink': 'to {visibility: hidden}',
        "#MathJax_SVG_Tooltip": {
            position: "absolute",
            left: 0,
            top: 0,
            width: "auto",
            height: "auto",
            display: "none"
        }
    };
    return EditableSVGConfig;
}());
var EditableSVG = (function () {
    function EditableSVG() {
        this.TOUCH = undefined;
        this.hideProcessedMath = true;
        this.fontNames = ["TeX", "STIX", "STIX-Web", "Asana-Math",
            "Gyre-Termes", "Gyre-Pagella", "Latin-Modern", "Neo-Euler"];
        this.TextNode = MathJax.HTML.TextNode;
        this.addText = MathJax.HTML.addText;
        this.ucMatch = MathJax.HTML.ucMatch;
        MathJax.Hub.Register.StartupHook("mml Jax Ready", function () {
            var MML = MathJax.ElementJax.mml;
            MML.hole.Augment(Hole.getMethods(this));
            MML.mbase.Augment(MBaseMixin.getMethods(this));
            MML.chars.Augment(CharsMixin.getMethods(this));
            MML.entity.Augment(EntityMixin.getMethods(this));
            MML.mo.Augment(MoMixin.getMethods(this));
            MML.mtext.Augment(MTextMixin.getMethods(this));
            MML.merror.Augment(MErrorMixin.getMethods(this));
            MML.ms.Augment(MsMixin.getMethods(this));
            MML.mglyph.Augment(MGlyphMixin.getMethods(this));
            MML.mspace.Augment(MSpaceMixin.getMethods(this));
            MML.mphantom.Augment(MPhantomMixin.getMethods(this));
            MML.mpadded.Augment(MPaddedMixin.getMethods(this));
            MML.mrow.Augment(MRowMixin.getMethods(this));
            MML.mstyle.Augment(MStyleMixin.getMethods(this));
            MML.mfrac.Augment(MFracMixin.getMethods(this));
            MML.msqrt.Augment(MSqrtMixin.getMethods(this));
            MML.mroot.Augment(MRootMixin.getMethods(this));
            MML.mfenced.Augment(MFencedMixin.getMethods(this));
            MML.menclose.Augment(MEncloseMixin.getMethods(this));
            MML.maction.Augment(MActionMixin.getMethods(this));
            MML.semantics.Augment(SemanticsMixin.getMethods(this));
            MML.munderover.Augment(MUnderOverMixin.getMethods(this));
            MML.msubsup.Augment(MSubSupMixin.getMethods(this));
            MML.mmultiscripts.Augment(MMultiScriptsMixin.getMethods(this));
            MML.math.Augment(MathMixin.getMethods(this));
            MML.TeXAtom.Augment(TeXAtomMixin.getMethods(this));
            MML.mtable.Augment(MTableMixin.getMethods(this));
            MML.mtr.Augment(MTableRowMixin.getMethods(this));
            MML.mtd.Augment(MTableCellMixin.getMethods(this));
            MML["annotation-xml"].Augment({
                toSVG: MML.mbase.SVGautoload
            });
        });
        MathJax.Hub.Register.StartupHook("onLoad", function () {
            console.log('trying editablesvg: ', MathJax.OutputJax.EditableSVG);
            setTimeout(MathJax.Callback(["loadComplete", MathJax.OutputJax.EditableSVG, "jax.js"]), 0);
        });
        MathJax.Hub.Browser.Select({
            Opera: function (browser) {
                this.EditableSVG.Augment({
                    operaZoomRefresh: true
                });
            }
        });
        MathJax.Hub.Register.StartupHook("End Cookie", function () {
            if (MathJax.Hub.config.menuSettings.zoom !== "None") {
                MathJax.Ajax.Require("[MathJax]/extensions/MathZoom.js");
            }
        });
        if (!document.createElementNS) {
            var doc = document;
            if (!doc.namespaces.svg) {
                doc.namespaces.add("svg", Util.SVGNS);
            }
        }
    }
    EditableSVG.prototype.Config = function () {
        console.log('AUTOLOAD DIR ', this.autoloadDir);
        var settings = MathJax.Hub.config.menuSettings, config = this.config, font = settings.font;
        if (settings.scale) {
            config.scale = settings.scale;
        }
        if (font && font !== "Auto") {
            font = font.replace(/(Local|Web|Image)$/i, "");
            font = font.replace(/([a-z])([A-Z])/, "$1-$2");
            this.fontInUse = font;
        }
        else {
            this.fontInUse = config.font || "TeX";
        }
        if (this.fontNames.indexOf(this.fontInUse) < 0) {
            this.fontInUse = "TeX";
        }
        this.fontDir += "/" + this.fontInUse;
        if (!this.require) {
            this.require = [];
        }
        this.require.push(this.fontDir + "/fontdata.js");
        this.require.push(MathJax.OutputJax.extensionDir + "/MathEvents.js");
    };
    EditableSVG.prototype.Startup = function () {
        var EVENT = MathJax.Extension.MathEvents.Event;
        this.TOUCH = MathJax.Extension.MathEvents.Touch;
        var HOVER = MathJax.Extension.MathEvents.Hover;
        this.ContextMenu = EVENT.ContextMenu;
        this.Mouseover = HOVER.Mouseover;
        this.Mouseout = HOVER.Mouseout;
        this.Mousemove = HOVER.Mousemove;
        this.hiddenDiv = MathJax.HTML.Element("div", {
            style: {
                visibility: "hidden",
                overflow: "hidden",
                position: "absolute",
                top: 0,
                height: "1px",
                width: "auto",
                padding: 0,
                border: 0,
                margin: 0,
                textAlign: "left",
                textIndent: 0,
                textTransform: "none",
                lineHeight: "normal",
                letterSpacing: "normal",
                wordSpacing: "normal"
            }
        });
        if (!document.body.firstChild) {
            document.body.appendChild(this.hiddenDiv);
        }
        else {
            document.body.insertBefore(this.hiddenDiv, document.body.firstChild);
        }
        this.hiddenDiv = MathJax.HTML.addElement(this.hiddenDiv, "div", {
            id: "MathJax_SVG_Hidden"
        });
        var div = MathJax.HTML.addElement(this.hiddenDiv, "div", {
            style: {
                width: "5in"
            }
        });
        Util.pxPerInch = div.offsetWidth / 5;
        this.hiddenDiv.removeChild(div);
        this.textSVG = Util.Element("svg", null);
        BBOX_GLYPH.defs = Util.addElement(Util.addElement(this.hiddenDiv.parentNode, "svg"), "defs", {
            id: "MathJax_SVG_glyphs"
        });
        this.ExSpan = MathJax.HTML.Element("span", {
            style: {
                position: "absolute",
                "font-size-adjust": "none"
            }
        }, [
            ["span", {
                    className: "MathJax_SVG_ExBox"
                }]
        ]);
        this.linebreakSpan = MathJax.HTML.Element("span", null, [
            ["hr", {
                    style: {
                        width: "auto",
                        size: 1,
                        padding: 0,
                        border: 0,
                        margin: 0
                    }
                }]
        ]);
        var styles = this.config.styles;
        for (var s in EditableSVGConfig.styles) {
            styles[s] = EditableSVGConfig.styles[s];
        }
        return MathJax.Ajax.Styles(styles, ["InitializeSVG", this]);
    };
    EditableSVG.prototype.InitializeSVG = function () {
        document.body.appendChild(this.ExSpan);
        document.body.appendChild(this.linebreakSpan);
        this.defaultEx = this.ExSpan.firstChild.offsetHeight / 60;
        this.defaultWidth = this.linebreakSpan.firstChild.offsetWidth;
        document.body.removeChild(this.linebreakSpan);
        document.body.removeChild(this.ExSpan);
    };
    EditableSVG.prototype.preTranslate = function (state) {
        var scripts = state.jax[this.id];
        var i;
        var m = scripts.length;
        var script;
        var prev;
        var span;
        var div;
        var test;
        var jax;
        var ex;
        var em;
        var maxwidth;
        var relwidth = false;
        var cwidth;
        var linebreak = this.config.linebreaks.automatic;
        var width = this.config.linebreaks.width;
        if (linebreak) {
            relwidth = (width.match(/^\s*(\d+(\.\d*)?%\s*)?container\s*$/) != null);
            if (relwidth) {
                width = width.replace(/\s*container\s*/, "");
            }
            else {
                maxwidth = this.defaultWidth;
            }
            if (width === "") {
                width = "100%";
            }
        }
        else {
            maxwidth = 100000;
        }
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode)
                continue;
            prev = script.previousSibling;
            if (prev && String(prev.className).match(/^MathJax(_SVG)?(_Display)?( MathJax(_SVG)?_Processing)?$/)) {
                prev.parentNode.removeChild(prev);
            }
            jax = script.MathJax.elementJax;
            if (!jax)
                continue;
            jax.EditableSVG = {
                display: (jax.root.Get("display") === "block")
            };
            span = div = MathJax.HTML.Element("span", {
                style: {
                    "font-size": this.config.scale + "%",
                    display: "inline-block"
                },
                className: "MathJax_SVG",
                id: jax.inputID + "-Frame",
                isMathJax: true,
                jaxID: this.id,
                oncontextmenu: MathJax.Extension.MathEvents.Event.Menu,
                onmousedown: MathJax.Extension.MathEvents.Event.Mousedown,
                onmouseover: MathJax.Extension.MathEvents.Event.Mouseover,
                onmouseout: MathJax.Extension.MathEvents.Event.Mouseout,
                onmousemove: MathJax.Extension.MathEvents.Event.Mousemove,
                onclick: MathJax.Extension.MathEvents.Event.Click,
                ondblclick: MathJax.Extension.MathEvents.Event.DblClick
            });
            if (MathJax.Hub.Browser.noContextMenu) {
                span.ontouchstart = this.TOUCH.start;
                span.ontouchend = this.TOUCH.end;
            }
            if (jax.EditableSVG.display) {
                div = MathJax.HTML.Element("div", {
                    className: "MathJax_SVG_Display"
                });
                div.appendChild(span);
            }
            div.className += " MathJax_SVG_Processing";
            script.parentNode.insertBefore(div, script);
            script.parentNode.insertBefore(this.ExSpan.cloneNode(true), script);
            div.parentNode.insertBefore(this.linebreakSpan.cloneNode(true), div);
        }
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode)
                continue;
            test = script.previousSibling;
            div = test.previousSibling;
            jax = script.MathJax.elementJax;
            if (!jax)
                continue;
            ex = test.firstChild.offsetHeight / 60;
            cwidth = div.previousSibling.firstChild.offsetWidth;
            if (relwidth) {
                maxwidth = cwidth;
            }
            if (ex === 0 || ex === "NaN") {
                this.hiddenDiv.appendChild(div);
                jax.EditableSVG.isHidden = true;
                ex = this.defaultEx;
                cwidth = this.defaultWidth;
                if (relwidth) {
                    maxwidth = cwidth;
                }
            }
            Util.ex = ex;
            Util.em = em = ex / Util.TeX.x_height * 1000;
            Util.cwidth = cwidth / em * 1000;
            Util.lineWidth = (linebreak ? Util.length2em(width, 1, maxwidth / em * 1000) : Util.BIGDIMEN);
        }
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode)
                continue;
            test = scripts[i].previousSibling;
            span = test.previousSibling;
            jax = scripts[i].MathJax.elementJax;
            if (!jax)
                continue;
            if (!jax.EditableSVG.isHidden) {
                span = span.previousSibling;
            }
            span.parentNode.removeChild(span);
            test.parentNode.removeChild(test);
        }
        state.SVGeqn = state.SVGlast = 0;
        state.SVGi = -1;
        state.SVGchunk = this.config.EqnChunk;
        state.SVGdelay = false;
    };
    EditableSVG.prototype.Translate = function (script, state) {
        if (!script.parentNode)
            return;
        if (state.SVGdelay) {
            state.SVGdelay = false;
            MathJax.Hub.RestartAfter(MathJax.Callback.Delay(this.config.EqnChunkDelay));
        }
        var jax = script.MathJax.elementJax;
        var math = jax.root;
        var span = document.getElementById(jax.inputID + "-Frame");
        var div = (jax.EditableSVG.display ? (span || { parentNode: undefined }).parentNode : span);
        var localCache = (this.config.useFontCache && !this.config.useGlobalCache);
        if (!div)
            return;
        this.em = MathJax.ElementJax.mml.mbase.prototype.em = jax.EditableSVG.em;
        this.ex = jax.EditableSVG.ex;
        this.linebreakWidth = jax.EditableSVG.lineWidth;
        this.cwidth = jax.EditableSVG.cwidth;
        this.mathDiv = div;
        span.appendChild(this.textSVG);
        if (localCache) {
            this.resetGlyphs();
        }
        this.initSVG(math, span);
        math.setTeXclass();
        try {
            math.toSVG(span, div);
            math.installCursorListeners();
        }
        catch (err) {
            if (err.restart) {
                while (span.firstChild) {
                    span.removeChild(span.firstChild);
                }
            }
            if (localCache) {
                BBOX_GLYPH.n--;
            }
            throw err;
        }
        span.removeChild(this.textSVG);
        this.AddInputHandlers(math, span, div);
        if (jax.EditableSVG.isHidden) {
            script.parentNode.insertBefore(div, script);
        }
        div.className = div.className.split(/ /)[0];
        if (this.hideProcessedMath) {
            div.className += " MathJax_SVG_Processed";
            if (script.MathJax.preview) {
                jax.EditableSVG.preview = script.MathJax.preview;
                delete script.MathJax.preview;
            }
            state.SVGeqn += (state.i - state.SVGi);
            state.SVGi = state.i;
            if (state.SVGeqn >= state.SVGlast + state.SVGchunk) {
                this.postTranslate(state, true);
                state.SVGchunk = Math.floor(state.SVGchunk * this.config.EqnChunkFactor);
                state.SVGdelay = true;
            }
        }
    };
    EditableSVG.prototype.postTranslate = function (state, partial) {
        var scripts = state.jax[this.id];
        if (!this.hideProcessedMath)
            return;
        for (var i = state.SVGlast, m = state.SVGeqn; i < m; i++) {
            var script = scripts[i];
            if (script && script.MathJax.elementJax) {
                script.previousSibling.className = script.previousSibling.className.split(/ /)[0];
                var data = script.MathJax.elementJax.EditableSVG;
                if (data.preview) {
                    data.preview.innerHTML = "";
                    script.MathJax.preview = data.preview;
                    delete data.preview;
                }
            }
        }
        state.SVGlast = state.SVGeqn;
        var id = script.getAttribute("id");
        MathJax.hiteSignal.Post(["EditableSVG rerender", id + "-Frame"]);
    };
    EditableSVG.prototype.resetGlyphs = function (reset) {
        console.log('RESETTING GLYPHS');
        if (this.config.useFontCache) {
            if (this.config.useGlobalCache) {
                BBOX_GLYPH.defs = document.getElementById("MathJax_SVG_glyphs");
                BBOX_GLYPH.defs.innerHTML = "";
            }
            else {
                BBOX_GLYPH.defs = Util.Element("defs", null);
                BBOX_GLYPH.n++;
            }
            BBOX_GLYPH.glyphs = {};
            if (reset) {
                BBOX_GLYPH.n = 0;
            }
        }
    };
    EditableSVG.preprocessElementJax = function (root) {
        if (root.type === 'texatom') {
            if (root.data.length !== 1)
                throw Error('Unexpected length in texatom');
            EditableSVG.preprocessElementJax(root.data[0]);
        }
        else if (root.type === 'mrow') {
            for (var i = 0; i < root.data.length; i++) {
                EditableSVG.preprocessElementJax(root.data[i]);
            }
        }
        else if (root.isCursorable() || root.type === 'math') {
            for (var i = 0; i < root.data.length; i++) {
                var cur = root.data[i];
                if (!cur)
                    continue;
                var type = cur.type;
                if (type[0] !== 'm' || type === 'mrow') {
                    EditableSVG.preprocessElementJax(cur);
                }
                else {
                    console.log("Wrapping a thing in an mrow");
                }
            }
        }
        return root;
    };
    EditableSVG.prototype.AddInputHandlers = function (math, span, div) {
        math.cursor = new Cursor();
        math.rerender = rerender;
        span.setAttribute('tabindex', '0');
        var addTexToDOM = function () {
            var tex = math.toTex();
            console.log("Tex: ", tex);
            console.log("math: ", math);
            math.EditableSVGelem.setAttribute("tex", tex);
        };
        MathJax.Hub.Register.StartupHook("End", function () {
            addTexToDOM();
        });
        function rerender(callback) {
            try {
                EditableSVG.preprocessElementJax(math).toSVG(span, div, true);
                math.cursor.refocus();
                addTexToDOM();
            }
            catch (err) {
                if (err.restart) {
                    MathJax.Callback.After([rerender, callback], err.restart);
                    return;
                }
                throw err;
            }
            MathJax.Callback(callback)();
            var id = span.getAttribute("id");
            MathJax.hiteSignal.Post(["EditableSVG rerender", id]);
        }
        function handler(e) {
            if (math.cursor.constructor.prototype[e.type])
                math.cursor.constructor.prototype[e.type].call(math.cursor, e, rerender);
        }
        span.addEventListener('mousedown', handler);
        span.addEventListener('blur', handler);
        span.addEventListener('keydown', handler);
        span.addEventListener('keypress', handler);
        span.addEventListener('focus', handler);
    };
    EditableSVG.prototype.getHoverSpan = function (jax, math) {
        math.style.position = "relative";
        return math.firstChild;
    };
    EditableSVG.prototype.getHoverBBox = function (jax, span, math) {
        var bbox = MathJax.Extension.MathEvents.Event.getBBox(span.parentNode);
        bbox.h += 2;
        bbox.d -= 2;
        return bbox;
    };
    EditableSVG.prototype.Zoom = function (jax, span, math, Mw, Mh) {
        span.className = "MathJax_SVG";
        var emex = span.appendChild(this.ExSpan.cloneNode(true));
        var ex = emex.firstChild.offsetHeight / 60;
        this.em = MathJax.ElementJax.mml.mbase.prototype.em = ex / Util.TeX.x_height * 1000;
        this.ex = ex;
        this.linebreakWidth = jax.EditableSVG.lineWidth;
        this.cwidth = jax.EditableSVG.cwidth;
        emex.parentNode.removeChild(emex);
        span.appendChild(this.textSVG);
        this.mathDIV = span;
        var tw = jax.root.data[0].EditableSVGdata.tw;
        if (tw && tw < this.cwidth)
            this.cwidth = tw;
        this.idPostfix = "-zoom";
        jax.root.toSVG(span, span);
        this.idPostfix = "";
        span.removeChild(this.textSVG);
        var svg = span.getElementsByTagName("svg")[0].style;
        svg.marginTop = svg.marginRight = svg.marginLeft = 0;
        if (svg.marginBottom.charAt(0) === "-")
            span.style.marginBottom = svg.marginBottom.substr(1);
        if (this.operaZoomRefresh) {
            setTimeout(function () {
                span.firstChild.style.border = "1px solid transparent";
            }, 1);
        }
        if (span.offsetWidth < span.firstChild.offsetWidth) {
            span.style.minWidth = span.firstChild.offsetWidth + "px";
            math.style.minWidth = math.firstChild.offsetWidth + "px";
        }
        span.style.position = math.style.position = "absolute";
        var zW = span.offsetWidth, zH = span.offsetHeight, mH = math.offsetHeight, mW = math.offsetWidth;
        span.style.position = math.style.position = "";
        return {
            Y: -MathJax.Extension.MathEvents.Event.getBBox(span).h,
            mW: mW,
            mH: mH,
            zW: zW,
            zH: zH
        };
    };
    EditableSVG.prototype.initSVG = function (math, span) { };
    EditableSVG.prototype.Remove = function (jax) {
        var span = document.getElementById(jax.inputID + "-Frame");
        if (span) {
            if (jax.EditableSVG.display) {
                span = span.parentNode;
            }
            span.parentNode.removeChild(span);
        }
        delete jax.EditableSVG;
    };
    EditableSVG.extendDelimiterV = function (svg, H, delim, scale, font) {
        var top = CharsMixin.createChar(scale, (delim.top || delim.ext), font);
        var bot = CharsMixin.createChar(scale, (delim.bot || delim.ext), font);
        var h = top.h + top.d + bot.h + bot.d;
        var y = -top.h;
        svg.Add(top, 0, y);
        y -= top.d;
        if (delim.mid) {
            var mid = CharsMixin.createChar(scale, delim.mid, font);
            h += mid.h + mid.d;
        }
        if (delim.min && H < h * delim.min) {
            H = h * delim.min;
        }
        if (H > h) {
            var ext = CharsMixin.createChar(scale, delim.ext, font);
            var k = (delim.mid ? 2 : 1), eH = (H - h) / k, s = (eH + 100) / (ext.h + ext.d);
            while (k-- > 0) {
                var g = Util.Element("g", {
                    transform: "translate(" + ext.y + "," + (y - s * ext.h + 50 + ext.y) + ") scale(1," + s + ")"
                });
                g.appendChild(ext.element.cloneNode(false));
                svg.element.appendChild(g);
                y -= eH;
                if (delim.mid && k) {
                    svg.Add(mid, 0, y - mid.h);
                    y -= (mid.h + mid.d);
                }
            }
        }
        else if (delim.mid) {
            y += (h - H) / 2;
            svg.Add(mid, 0, y - mid.h);
            y += -(mid.h + mid.d) + (h - H) / 2;
        }
        else {
            y += (h - H);
        }
        svg.Add(bot, 0, y - bot.h);
        svg.Clean();
        svg.scale = scale;
        svg.isMultiChar = true;
    };
    EditableSVG.extendDelimiterH = function (svg, W, delim, scale, font) {
        var left = CharsMixin.createChar(scale, (delim.left || delim.rep), font);
        var right = CharsMixin.createChar(scale, (delim.right || delim.rep), font);
        svg.Add(left, -left.l, 0);
        var w = (left.r - left.l) + (right.r - right.l), x = left.r - left.l;
        if (delim.mid) {
            var mid = CharsMixin.createChar(scale, delim.mid, font);
            w += mid.w;
        }
        if (delim.min && W < w * delim.min) {
            W = w * delim.min;
        }
        if (W > w) {
            var rep = CharsMixin.createChar(scale, delim.rep, font), fuzz = delim.fuzz || 0;
            var k = (delim.mid ? 2 : 1), rW = (W - w) / k, s = (rW + fuzz) / (rep.r - rep.l);
            while (k-- > 0) {
                var g = Util.Element("g", {
                    transform: "translate(" + (x - fuzz / 2 - s * rep.l + rep.x) + "," + rep.y + ") scale(" + s + ",1)"
                });
                g.appendChild(rep.element.cloneNode(false));
                svg.element.appendChild(g);
                x += rW;
                if (delim.mid && k) {
                    svg.Add(mid, x, 0);
                    x += mid.w;
                }
            }
        }
        else if (delim.mid) {
            x -= (w - W) / 2;
            svg.Add(mid, x, 0);
            x += mid.w - (w - W) / 2;
        }
        else {
            x -= (w - W);
        }
        svg.Add(right, x - right.l, 0);
        svg.Clean();
        svg.scale = scale;
        svg.isMultiChar = true;
    };
    EditableSVG.getJaxFromMath = function (math) {
        try {
            if (math.parentNode.className === "MathJax_SVG_Display") {
                math = math.parentNode;
            }
            do {
                math = math.nextSibling;
            } while (math && math.nodeName.toLowerCase() !== "script");
            return MathJax.Hub.getJaxFor(math);
        }
        catch (e) {
            console.error("Error in getJaxFromMath", e);
        }
    };
    return EditableSVG;
}());
var load = function (event) {
    EditableSVG.apply(MathJax.OutputJax.EditableSVG);
    for (var id in EditableSVG.prototype) {
        MathJax.OutputJax.EditableSVG[id] = EditableSVG.prototype[id].bind(MathJax.OutputJax.EditableSVG);
        MathJax.OutputJax.EditableSVG.constructor.prototype[id] = EditableSVG.prototype[id].bind(MathJax.OutputJax.EditableSVG);
    }
    for (var id in EditableSVG) {
        MathJax.OutputJax.EditableSVG[id] = EditableSVG[id].bind(MathJax.OutputJax.EditableSVG);
        MathJax.OutputJax.EditableSVG.constructor.prototype[id] = EditableSVG[id].bind(MathJax.OutputJax.EditableSVG);
    }
};
SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function (elem) {
    return elem.getScreenCTM().inverse().multiply(this.getScreenCTM());
};
setTimeout(load, 1000);
var Parser = (function () {
    function Parser() {
    }
    Parser.parseControlSequence = function (cs) {
        var result = Parser.checkSpecialCS(cs);
        if (result)
            return result;
        var mathjaxParser = MathJax.InputJax.TeX.Parse(cs);
        mathjaxParser.csUndefined = mathjaxParser.csFindMacro = function () { };
        mathjaxParser.GetCS = function () { return cs; };
        mathjaxParser.mmlToken = function (x) { return x; };
        mathjaxParser.Push = (function (x) { result = x; });
        mathjaxParser.ControlSequence();
        return [result];
    };
    Parser.checkSpecialCS = function (cs) {
        var macros = MathJax.InputJax.TeX.Definitions.macros;
        var MML = MathJax.ElementJax.mml;
        if (cs === 'frac') {
            var hole = new MML.hole();
            var mfrac = new MML.mfrac(hole, new MML.hole());
            var result = [mfrac];
            result.moveCursorAfter = [hole, 0];
            return result;
        }
        if (cs === 'sqrt') {
            var msqrt = new MML.msqrt();
            var hole = new MML.hole();
            msqrt.SetData(0, hole);
            var result = [msqrt];
            result.moveCursorAfter = [hole, 0];
            return result;
        }
        if (cs === 'matrix' || cs === 'bmatrix') {
            var mtable = new MML.mtable();
            var mtr = new MML.mtr();
            var mtd = new MML.mtd();
            var hole = new MML.hole();
            mtable.SetData(0, mtr);
            mtr.SetData(0, mtd);
            mtd.SetData(0, hole);
            var lbracket = new MML.mo(new MML.chars("["));
            var rbracket = new MML.mo(new MML.chars("]"));
            var result = [lbracket, mtable, rbracket];
            result.moveCursorAfter = [hole, 0];
            return result;
        }
        if (macros[cs]) {
            console.log(macros[cs]);
            var namedDirectly = macros[cs] === 'NamedOp' || macros[cs] === 'NamedFn';
            var namedArray = macros[cs][0] && (macros[cs][0] === 'NamedFn' || macros[cs][0] === 'NamedOp');
            if (namedDirectly || namedArray) {
                var value;
                if (namedArray && macros[cs][1]) {
                    value = macros[cs][1].replace(/&thinsp;/, "\u2006");
                }
                else {
                    value = cs;
                }
                return [new MML.mo(new MML.chars(value))];
            }
        }
    };
    return Parser;
}());
var BBOX = (function () {
    function BBOX(def, type) {
        if (def === void 0) { def = null; }
        if (type === void 0) { type = "g"; }
        this.glyphs = {};
        this.h = this.d = -Util.BIGDIMEN;
        this.H = this.D = 0;
        this.w = this.r = 0;
        this.l = Util.BIGDIMEN;
        this.x = this.y = 0;
        this.scale = 1;
        this.removeable = true;
        this.element = Util.Element(type, def);
    }
    BBOX.prototype.With = function (def, HUB) {
        return HUB.Insert(this, def);
    };
    BBOX.prototype.Add = function (svg, dx, dy, forcew, infront) {
        if (dx) {
            svg.x += dx;
        }
        if (dy) {
            svg.y += dy;
        }
        if (svg.element) {
            if (svg.removeable && svg.element.childNodes.length === 1 && svg.n === 1) {
                var child = svg.element.firstChild, nodeName = child.nodeName.toLowerCase();
                if (nodeName === "use" || nodeName === "rect") {
                    svg.element = child;
                    svg.scale = svg.childScale;
                    var x = svg.childX, y = svg.childY;
                    svg.x += x;
                    svg.y += y;
                    svg.h -= y;
                    svg.d += y;
                    svg.H -= y;
                    svg.D += y;
                    svg.w -= x;
                    svg.r -= x;
                    svg.l += x;
                    svg.removeable = false;
                    child.setAttribute("x", Math.floor(svg.x / svg.scale));
                    child.setAttribute("y", Math.floor(svg.y / svg.scale));
                }
            }
            if (Math.abs(svg.x) < 1 && Math.abs(svg.y) < 1) {
                svg.remove = svg.removeable;
            }
            else {
                nodeName = svg.element.nodeName.toLowerCase();
                if (nodeName === "g") {
                    if (!svg.element.firstChild) {
                        svg.remove = svg.removeable;
                    }
                    else {
                        svg.element.setAttribute("transform", "translate(" + Math.floor(svg.x) + "," + Math.floor(svg.y) + ")");
                    }
                }
                else if (nodeName === "line" || nodeName === "polygon" ||
                    nodeName === "path" || nodeName === "a") {
                    svg.element.setAttribute("transform", "translate(" + Math.floor(svg.x) + "," + Math.floor(svg.y) + ")");
                }
                else {
                    svg.element.setAttribute("x", Math.floor(svg.x / svg.scale));
                    svg.element.setAttribute("y", Math.floor(svg.y / svg.scale));
                }
            }
            if (svg.remove) {
                this.n += svg.n;
                while (svg.element.firstChild) {
                    if (infront && this.element.firstChild) {
                        this.element.insertBefore(svg.element.firstChild, this.element.firstChild);
                    }
                    else {
                        this.element.appendChild(svg.element.firstChild);
                    }
                }
            }
            else {
                if (infront) {
                    this.element.insertBefore(svg.element, this.element.firstChild);
                }
                else {
                    this.element.appendChild(svg.element);
                }
            }
            delete svg.element;
        }
        if (svg.hasIndent) {
            this.hasIndent = svg.hasIndent;
        }
        if (svg.tw != null) {
            this.tw = svg.tw;
        }
        if (svg.d - svg.y > this.d) {
            this.d = svg.d - svg.y;
            if (this.d > this.D) {
                this.D = this.d;
            }
        }
        if (svg.y + svg.h > this.h) {
            this.h = svg.y + svg.h;
            if (this.h > this.H) {
                this.H = this.h;
            }
        }
        if (svg.D - svg.y > this.D)
            this.D = svg.D - svg.y;
        if (svg.y + svg.H > this.H)
            this.H = svg.y + svg.H;
        if (svg.x + svg.l < this.l)
            this.l = svg.x + svg.l;
        if (svg.x + svg.r > this.r)
            this.r = svg.x + svg.r;
        if (forcew || svg.x + svg.w + (svg.X || 0) > this.w)
            this.w = svg.x + svg.w + (svg.X || 0);
        this.childScale = svg.scale;
        this.childX = svg.x;
        this.childY = svg.y;
        this.n++;
        return svg;
    };
    BBOX.prototype.Align = function (svg, align, dx, dy, shift) {
        if (shift === void 0) { shift = null; }
        dx = ({
            left: dx,
            center: (this.w - svg.w) / 2,
            right: this.w - svg.w - dx
        })[align] || 0;
        var w = this.w;
        this.Add(svg, dx + (shift || 0), dy);
        this.w = w;
    };
    BBOX.prototype.Clean = function () {
        if (this.h === -Util.BIGDIMEN) {
            this.h = this.d = this.l = 0;
        }
        return this;
    };
    BBOX.defs = null;
    BBOX.n = 0;
    return BBOX;
}());
var BBOX_G = (function (_super) {
    __extends(BBOX_G, _super);
    function BBOX_G() {
        _super.apply(this, arguments);
    }
    return BBOX_G;
}(BBOX));
var BBOX_TEXT = (function (_super) {
    __extends(BBOX_TEXT, _super);
    function BBOX_TEXT(scale, text, def) {
        if (!def)
            def = {};
        def.stroke = "none";
        if (def["font-style"] === "")
            delete def["font-style"];
        if (def["font-weight"] === "")
            delete def["font-weight"];
        _super.call(this, def, "text");
        MathJax.HTML.addText(this.element, text);
        MathJax.OutputJax.EditableSVG.textSVG.appendChild(this.element);
        var bbox = this.element.getBBox();
        MathJax.OutputJax.EditableSVG.textSVG.removeChild(this.element);
        scale *= 1000 / Util.em;
        this.element.setAttribute("transform", "scale(" + Util.Fixed(scale) + ") matrix(1 0 0 -1 0 0)");
        this.removeable = false;
        this.w = this.r = bbox.width * scale;
        this.l = 0;
        this.h = this.H = -bbox.y * scale;
        this.d = this.D = (bbox.height + bbox.y) * scale;
    }
    return BBOX_TEXT;
}(BBOX));
var Util = (function () {
    function Util() {
    }
    Util.Em = function (m) {
        if (Math.abs(m) < 0.0006) {
            return "0em";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "em";
    };
    Util.Ex = function (m) {
        m = Math.round(m / this.TeX.x_height * this.ex) / this.ex;
        if (Math.abs(m) < 0.0006) {
            return "0ex";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "ex";
    };
    Util.Percent = function (m) {
        return (100 * m).toFixed(1).replace(/\.?0+$/, "") + "%";
    };
    Util.Fixed = function (m, n) {
        if (Math.abs(m) < 0.0006) {
            return "0";
        }
        return m.toFixed(n || 3).replace(/\.?0+$/, "");
    };
    Util.hashCheck = function (target) {
        if (target && target.nodeName.toLowerCase() === "g") {
            do {
                target = target.parentNode;
            } while (target && target.firstChild.nodeName !== "svg");
        }
        return target;
    };
    Util.Element = function (type, def) {
        var obj;
        if (document.createElementNS) {
            obj = (typeof (type) === "string" ? document.createElementNS("http://www.w3.org/2000/svg", type) : type);
        }
        else {
            obj = (typeof (type) === "string" ? document.createElement("svg:" + type) : type);
        }
        obj.isMathJax = true;
        if (def) {
            for (var id in def) {
                if (def.hasOwnProperty(id)) {
                    obj.setAttribute(id, def[id].toString());
                }
            }
        }
        return obj;
    };
    Util.addElement = function (parent, type, def) {
        return parent.appendChild(Util.Element(type, def));
    };
    Util.length2em = function (length, mu, size) {
        if (mu === void 0) { mu = null; }
        if (size === void 0) { size = null; }
        if (typeof (length) !== "string")
            length = length.toString();
        if (length === "")
            return 0;
        if (length === MathJax.ElementJax.mml.SIZE.NORMAL)
            return 1000;
        if (length === MathJax.ElementJax.mml.SIZE.BIG)
            return 2000;
        if (length === MathJax.ElementJax.mml.SIZE.SMALL)
            return 710;
        if (length === "infinity")
            return this.BIGDIMEN;
        if (length.match(/mathspace$/))
            return 1000 * this.MATHSPACE[length];
        var zoomScale = parseInt(MathJax.Hub.config.menuSettings.zscale) / 100;
        var emFactor = (zoomScale || 1) / Util.em;
        var match = length.match(/^\s*([-+]?(?:\.\d+|\d+(?:\.\d*)?))?(pt|em|ex|mu|px|pc|in|mm|cm|%)?/);
        var m = parseFloat(match[1] || "1") * 1000, unit = match[2];
        if (size == null)
            size = 1000;
        if (mu == null)
            mu = 1;
        if (unit === "em")
            return m;
        if (unit === "ex")
            return m * this.TeX.x_height / 1000;
        if (unit === "%")
            return m / 100 * size / 1000;
        if (unit === "px")
            return m * emFactor;
        if (unit === "pt")
            return m / 10;
        if (unit === "pc")
            return m * 1.2;
        if (unit === "in")
            return m * this.pxPerInch * emFactor;
        if (unit === "cm")
            return m * this.pxPerInch * emFactor / 2.54;
        if (unit === "mm")
            return m * this.pxPerInch * emFactor / 25.4;
        if (unit === "mu")
            return m / 18 * mu;
        return m * size / 1000;
    };
    Util.getPadding = function (styles) {
        var padding = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };
        var has = false;
        for (var id in padding) {
            if (padding.hasOwnProperty(id)) {
                var pad = styles["padding" + id.charAt(0).toUpperCase() + id.substr(1)];
                if (pad) {
                    padding[id] = Util.length2em(pad);
                    has = true;
                }
            }
        }
        return (has ? padding : false);
    };
    Util.getBorders = function (styles) {
        var border = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        }, has = false;
        for (var id in border) {
            if (border.hasOwnProperty(id)) {
                var ID = "border" + id.charAt(0).toUpperCase() + id.substr(1);
                var style = styles[ID + "Style"];
                if (style && style !== "none") {
                    has = true;
                    border[id] = Util.length2em(styles[ID + "Width"]);
                    border[id + "Style"] = styles[ID + "Style"];
                    border[id + "Color"] = styles[ID + "Color"];
                    if (border[id + "Color"] === "initial") {
                        border[id + "Color"] = "";
                    }
                }
                else {
                    delete border[id];
                }
            }
        }
        return (has ? border : false);
    };
    Util.thickness2em = function (length, mu) {
        var thick = this.TeX.rule_thickness;
        if (length === MathJax.ElementJax.mml.LINETHICKNESS.MEDIUM) {
            return thick;
        }
        if (length === MathJax.ElementJax.mml.LINETHICKNESS.THIN) {
            return 0.67 * thick;
        }
        if (length === MathJax.ElementJax.mml.LINETHICKNESS.THICK) {
            return 1.67 * thick;
        }
        return this.length2em(length, mu, thick);
    };
    Util.elemCoordsToScreenCoords = function (elem, x, y) {
        var svg = this.getSVGElem(elem);
        if (!svg)
            return;
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(elem.getScreenCTM());
    };
    Util.elemCoordsToViewportCoords = function (elem, x, y) {
        var svg = this.getSVGElem(elem);
        if (!svg)
            return;
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(elem.getTransformToElement(svg));
    };
    Util.getSVGElem = function (elem) {
        if (!elem)
            return;
        var svg = elem.nodeName === 'svg' ? elem : elem.ownerSVGElement;
        if (!svg) {
            console.error('No owner SVG element');
            return;
        }
        return svg;
    };
    Util.screenCoordsToElemCoords = function (elem, x, y) {
        var svg = this.getSVGElem(elem);
        if (!svg)
            return;
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(elem.getScreenCTM().inverse());
    };
    Util.boxContains = function (bb, x, y) {
        return bb && bb.x <= x && x <= bb.x + bb.width && bb.y <= y && y <= bb.y + bb.height;
    };
    Util.nodeContainsScreenPoint = function (node, x, y) {
        var bb = node.getBB && node.getBB();
        var p = this.screenCoordsToElemCoords(node.EditableSVGelem, x, y);
        if (!bb || !p)
            return false;
        return Util.boxContains(bb, p.x, p.y);
    };
    Util.highlightBox = function (svg, bb) {
        var d = 100;
        var drawLine = function (x1, y1, x2, y2) {
            var line = document.createElementNS(Util.SVGNS, 'line');
            svg.appendChild(line);
            line.setAttribute('style', 'stroke:rgb(0,0,255);stroke-width:20');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            return line;
        };
        return [
            drawLine(bb.x, bb.y, bb.x + d, bb.y),
            drawLine(bb.x, bb.y, bb.x, bb.y + d),
            drawLine(bb.x + bb.width, bb.y, bb.x + bb.width - d, bb.y),
            drawLine(bb.x + bb.width, bb.y, bb.x + bb.width, bb.y + d),
            drawLine(bb.x, bb.y + bb.height, bb.x, bb.y + bb.height - d),
            drawLine(bb.x, bb.y + bb.height, bb.x + d, bb.y + bb.height),
            drawLine(bb.x + bb.width, bb.y + bb.height, bb.x + bb.width - d, bb.y + bb.height),
            drawLine(bb.x + bb.width, bb.y + bb.height, bb.x + bb.width, bb.y + bb.height - d)
        ];
    };
    Util.getCursorValue = function (direction) {
        if (isNaN(direction)) {
            switch (direction[0].toLowerCase()) {
                case 'u': return Direction.UP;
                case 'd': return Direction.DOWN;
                case 'l': return Direction.LEFT;
                case 'r': return Direction.RIGHT;
            }
            throw new Error('Invalid cursor value');
        }
        else {
            return direction;
        }
    };
    Util.SVGNS = "http://www.w3.org/2000/svg";
    Util.XLINKNS = "http://www.w3.org/1999/xlink";
    Util.NBSP = "\u00A0";
    Util.BIGDIMEN = 10000000;
    Util.TeX = {
        x_height: 430.554,
        quad: 1000,
        num1: 676.508,
        num2: 393.732,
        num3: 443.73,
        denom1: 685.951,
        denom2: 344.841,
        sup1: 412.892,
        sup2: 362.892,
        sup3: 288.888,
        sub1: 150,
        sub2: 247.217,
        sup_drop: 386.108,
        sub_drop: 50,
        delim1: 2390,
        delim2: 1000,
        axis_height: 250,
        rule_thickness: 60,
        big_op_spacing1: 111.111,
        big_op_spacing2: 166.666,
        big_op_spacing3: 200,
        big_op_spacing4: 600,
        big_op_spacing5: 100,
        scriptspace: 100,
        nulldelimiterspace: 120,
        delimiterfactor: 901,
        delimitershortfall: 300,
        min_rule_thickness: 1.25,
        min_root_space: 1.5
    };
    Util.MATHSPACE = {
        veryverythinmathspace: 1 / 18,
        verythinmathspace: 2 / 18,
        thinmathspace: 3 / 18,
        mediummathspace: 4 / 18,
        thickmathspace: 5 / 18,
        verythickmathspace: 6 / 18,
        veryverythickmathspace: 7 / 18,
        negativeveryverythinmathspace: -1 / 18,
        negativeverythinmathspace: -2 / 18,
        negativethinmathspace: -3 / 18,
        negativemediummathspace: -4 / 18,
        negativethickmathspace: -5 / 18,
        negativeverythickmathspace: -6 / 18,
        negativeveryverythickmathspace: -7 / 18
    };
    return Util;
}());
var BBOX_RECT = (function (_super) {
    __extends(BBOX_RECT, _super);
    function BBOX_RECT(h, d, w, def) {
        if (def === void 0) { def = null; }
        if (def == null) {
            def = {
                stroke: "none"
            };
        }
        def.width = Math.floor(w);
        def.height = Math.floor(h + d);
        _super.call(this, def, "rect");
        this.removeable = false;
        this.w = this.r = w;
        this.h = this.H = h + d;
        this.d = this.D = this.l = 0;
        this.y = -d;
    }
    return BBOX_RECT;
}(BBOX));
var ElementJax = (function () {
    function ElementJax() {
    }
    return ElementJax;
}());
var MBaseMixin = (function (_super) {
    __extends(MBaseMixin, _super);
    function MBaseMixin() {
        _super.apply(this, arguments);
    }
    MBaseMixin.prototype.getBB = function (relativeTo) {
        var elem = this.EditableSVGelem;
        if (!elem) {
            console.log("Oh no! Couldn't find elem for this: ", this);
            return;
        }
        return elem.getBBox();
    };
    MBaseMixin.getMethods = function (editableSVG) {
        var obj = {};
        obj.prototype = {};
        obj.constructor.prototype = {};
        for (var id in this.prototype) {
            obj[id] = this.prototype[id];
        }
        obj.editableSVG = editableSVG;
        return obj;
    };
    MBaseMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var variant = this.SVGgetVariant();
        var svg = new BBOX();
        this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                var rendered = this.data[i].toSVG(variant, svg.scale);
                var child = svg.Add(rendered, svg.w, 0, true);
                if (child.skew) {
                    svg.skew = child.skew;
                }
            }
        }
        svg.Clean();
        var text = this.data.join("");
        if (svg.skew && text.length !== 1) {
            delete svg.skew;
        }
        if (svg.r > svg.w && text.length === 1 && !variant.noIC) {
            svg.ic = svg.r - svg.w;
            svg.w = svg.r;
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    };
    MBaseMixin.prototype.SVGchildSVG = function (i) {
        return (this.data[i] ? this.data[i].toSVG() : new BBOX());
    };
    MBaseMixin.prototype.EditableSVGdataStretched = function (i, HW, D) {
        if (D === void 0) { D = null; }
        this.EditableSVGdata = {
            HW: HW,
            D: D
        };
        if (!this.data[i]) {
            return new BBOX();
        }
        if (D != null) {
            return this.data[i].SVGstretchV(HW, D);
        }
        if (HW != null) {
            return this.data[i].SVGstretchH(HW);
        }
        return this.data[i].toSVG();
    };
    MBaseMixin.prototype.SVGsaveData = function (svg) {
        this.EditableSVGelem = svg.element;
        if (!this.EditableSVGdata) {
            this.EditableSVGdata = {};
        }
        this.EditableSVGdata.w = svg.w, this.EditableSVGdata.x = svg.x;
        this.EditableSVGdata.h = svg.h, this.EditableSVGdata.d = svg.d;
        if (svg.y) {
            this.EditableSVGdata.h += svg.y;
            this.EditableSVGdata.d -= svg.y;
        }
        if (svg.X != null)
            this.EditableSVGdata.X = svg.X;
        if (svg.tw != null)
            this.EditableSVGdata.tw = svg.tw;
        if (svg.skew)
            this.EditableSVGdata.skew = svg.skew;
        if (svg.ic)
            this.EditableSVGdata.ic = svg.ic;
        if (this["class"]) {
            svg.removeable = false;
            Util.Element(svg.element, {
                "class": this["class"]
            });
        }
        if (this.id) {
            svg.removeable = false;
            Util.Element(svg.element, {
                "id": this.id
            });
        }
        if (this.href) {
            var a = Util.Element("a", {
                "class": "mjx-svg-href"
            });
            a.setAttributeNS(Util.XLINKNS, "href", this.href);
            a.onclick = this.SVGlink;
            Util.addElement(a, "rect", {
                width: svg.w,
                height: svg.h + svg.d,
                y: -svg.d,
                fill: "none",
                stroke: "none",
                "pointer-events": "all"
            });
            if (svg.type === "svg") {
                var g = svg.element.firstChild;
                while (g.firstChild) {
                    a.appendChild(g.firstChild);
                }
                g.appendChild(a);
            }
            else {
                a.appendChild(svg.element);
                svg.element = a;
            }
            svg.removeable = false;
        }
        if (MathJax.OutputJax.EditableSVG.config.addMMLclasses) {
            this.SVGaddClass(svg.element, "mjx-svg-" + this.type);
            svg.removeable = false;
        }
        var style = this.style;
        if (style && svg.element) {
            svg.element.style.cssText = style;
            if (svg.element.style.fontSize) {
                svg.element.style.fontSize = "";
            }
            svg.element.style.border = svg.element.style.padding = "";
            if (svg.removeable) {
                svg.removeable = (svg.element.style.cssText === "");
            }
        }
        this.SVGaddAttributes(svg);
    };
    MBaseMixin.prototype.SVGaddClass = function (node, name) {
        var classes = node.getAttribute("class");
        node.setAttribute("class", (classes ? classes + " " : "") + name);
    };
    MBaseMixin.prototype.SVGaddAttributes = function (svg) {
        if (this.attrNames) {
            var copy = this.attrNames, skip = MathJax.ElementJax.mml.nocopyAttributes, ignore = MathJax.Hub.config.ignoreMMLattributes;
            var defaults = (this.type === "mstyle" ? MathJax.ElementJax.mml.math.prototype.defaults : this.defaults);
            for (var i = 0, m = copy.length; i < m; i++) {
                var id = copy[i];
                if (ignore[id] == false || (!skip[id] && !ignore[id] &&
                    defaults[id] == null && typeof (svg.element[id]) === "undefined")) {
                    svg.element.setAttribute(id, this.attr[id]);
                    svg.removeable = false;
                }
            }
        }
    };
    MBaseMixin.prototype.SVGlink = function () {
        var href = this.href.animVal;
        if (href.charAt(0) === "#") {
            var target = Util.hashCheck(document.getElementById(href.substr(1)));
            if (target && target.scrollIntoView) {
                setTimeout(function () {
                    target.parentNode.scrollIntoView(true);
                }, 1);
            }
        }
        document.location = href;
    };
    MBaseMixin.prototype.SVGgetStyles = function () {
        if (this.style) {
            var span = this.HTML.Element("span");
            span.style.cssText = this.style;
            this.styles = this.SVGprocessStyles(span.style);
        }
    };
    MBaseMixin.prototype.SVGprocessStyles = function (style) {
        var styles = {
            border: Util.getBorders(style),
            padding: Util.getPadding(style)
        };
        if (!styles.border)
            delete styles.border;
        if (!styles.padding)
            delete styles.padding;
        if (style.fontSize)
            styles['fontSize'] = style.fontSize;
        if (style.color)
            styles['color'] = style.color;
        if (style.backgroundColor)
            styles['background'] = style.backgroundColor;
        if (style.fontStyle)
            styles['fontStyle'] = style.fontStyle;
        if (style.fontWeight)
            styles['fontWeight'] = style.fontWeight;
        if (style.fontFamily)
            styles['fontFamily'] = style.fontFamily;
        if (styles['fontWeight'] && styles['fontWeight'].match(/^\d+$/))
            styles['fontWeight'] = (parseInt(styles['fontWeight']) > 600 ? "bold" : "normal");
        return styles;
    };
    MBaseMixin.prototype.SVGhandleSpace = function (svg) {
        if (this.useMMLspacing) {
            if (this.type !== "mo")
                return;
            var values = this.getValues("scriptlevel", "lspace", "rspace");
            if (values.scriptlevel <= 0 || this.hasValue("lspace") || this.hasValue("rspace")) {
                var mu = this.SVGgetMu(svg);
                values.lspace = Math.max(0, Util.length2em(values.lspace, mu));
                values.rspace = Math.max(0, Util.length2em(values.rspace, mu));
                var core = this, parent = this.Parent();
                while (parent && parent.isEmbellished() && parent.Core() === core) {
                    core = parent;
                    parent = parent.Parent();
                }
                if (values.lspace)
                    svg.x += values.lspace;
                if (values.rspace)
                    svg.X = values.rspace;
            }
        }
        else {
            var space = this.texSpacing();
            this.SVGgetScale();
            if (space !== "")
                svg.x += Util.length2em(space, this.scale) * this.mscale;
        }
    };
    MBaseMixin.prototype.SVGhandleColor = function (svg) {
        var values = this.getValues("mathcolor", "color");
        if (this.styles && this.styles.color && !values.color) {
            values.color = this.styles.color;
        }
        if (values.color && !this.mathcolor) {
            values.mathcolor = values.color;
        }
        if (values.mathcolor) {
            Util.Element(svg.element, {
                fill: values.mathcolor,
                stroke: values.mathcolor
            });
            svg.removeable = false;
        }
        var borders = (this.styles || {}).border, padding = (this.styles || {}).padding, bleft = ((borders || {}).left || 0), pleft = ((padding || {}).left || 0), id;
        values.background = (this.mathbackground || this.background ||
            (this.styles || {}).background || MathJax.ElementJax.mml.COLOR.TRANSPARENT);
        if (bleft + pleft) {
            var dup = new BBOX(MathJax.Hub);
            for (id in svg) {
                if (svg.hasOwnProperty(id)) {
                    dup[id] = svg[id];
                }
            }
            dup.x = 0;
            dup.y = 0;
            svg.element = Util.Element("g");
            svg.removeable = true;
            svg.Add(dup, bleft + pleft, 0);
        }
        if (padding) {
            svg.w += padding.right || 0;
            svg.h += padding.top || 0;
            svg.d += padding.bottom || 0;
        }
        if (borders) {
            svg.w += borders.right || 0;
            svg.h += borders.top || 0;
            svg.d += borders.bottom || 0;
        }
        if (values.background !== MathJax.ElementJax.mml.COLOR.TRANSPARENT) {
            var nodeName = svg.element.nodeName.toLowerCase();
            if (nodeName !== "g" && nodeName !== "svg") {
                var g = Util.Element("g");
                g.appendChild(svg.element);
                svg.element = g;
                svg.removeable = true;
            }
            svg.Add(new BBOX_RECT(svg.h, svg.d, svg.w, {
                fill: values.background,
                stroke: "none"
            }), 0, 0, false, true);
        }
        if (borders) {
            var dd = 5;
            var sides = {
                left: ["V", svg.h + svg.d, -dd, -svg.d],
                right: ["V", svg.h + svg.d, svg.w - borders.right + dd, -svg.d],
                top: ["H", svg.w, 0, svg.h - borders.top + dd],
                bottom: ["H", svg.w, 0, -svg.d - dd]
            };
            for (id in sides) {
                if (sides.hasOwnProperty(id)) {
                    if (borders[id]) {
                        var side = sides[id], box = BBOX[side[0] + "LINE"];
                        svg.Add(box(side[1], borders[id], borders[id + "Style"], borders[id + "Color"]), side[2], side[3]);
                    }
                }
            }
        }
    };
    MBaseMixin.prototype.SVGgetVariant = function () {
        var values = this.getValues("mathvariant", "fontfamily", "fontweight", "fontstyle");
        var variant = values.mathvariant;
        if (this.variantForm) {
            variant = "-TeX-variant";
        }
        values.hasVariant = this.Get("mathvariant", true);
        if (!values.hasVariant) {
            values.family = values.fontfamily;
            values.weight = values.fontweight;
            values.style = values.fontstyle;
        }
        if (this.styles) {
            if (!values.style && this.styles.fontStyle)
                values.style = this.styles.fontStyle;
            if (!values.weight && this.styles.fontWeight)
                values.weight = this.styles.fontWeight;
            if (!values.family && this.styles.fontFamily)
                values.family = this.styles.fontFamily;
        }
        if (values.family && !values.hasVariant) {
            if (!values.weight && values.mathvariant.match(/bold/)) {
                values.weight = "bold";
            }
            if (!values.style && values.mathvariant.match(/italic/)) {
                values.style = "italic";
            }
            variant = {
                forceFamily: true,
                font: {
                    "font-family": values.family
                }
            };
            if (values.style) {
                variant.font["font-style"] = values.style;
            }
            if (values.weight) {
                variant.font["font-weight"] = values.weight;
            }
            return variant;
        }
        if (values.weight === "bold") {
            variant = {
                normal: MathJax.ElementJax.mml.VARIANT.BOLD,
                italic: MathJax.ElementJax.mml.VARIANT.BOLDITALIC,
                fraktur: MathJax.ElementJax.mml.VARIANT.BOLDFRAKTUR,
                script: MathJax.ElementJax.mml.VARIANT.BOLDSCRIPT,
                "sans-serif": MathJax.ElementJax.mml.VARIANT.BOLDSANSSERIF,
                "sans-serif-italic": MathJax.ElementJax.mml.VARIANT.SANSSERIFBOLDITALIC
            }[variant] || variant;
        }
        else if (values.weight === "normal") {
            variant = {
                bold: MathJax.ElementJax.mml.VARIANT.normal,
                "bold-italic": MathJax.ElementJax.mml.VARIANT.ITALIC,
                "bold-fraktur": MathJax.ElementJax.mml.VARIANT.FRAKTUR,
                "bold-script": MathJax.ElementJax.mml.VARIANT.SCRIPT,
                "bold-sans-serif": MathJax.ElementJax.mml.VARIANT.SANSSERIF,
                "sans-serif-bold-italic": MathJax.ElementJax.mml.VARIANT.SANSSERIFITALIC
            }[variant] || variant;
        }
        if (values.style === "italic") {
            variant = {
                normal: MathJax.ElementJax.mml.VARIANT.ITALIC,
                bold: MathJax.ElementJax.mml.VARIANT.BOLDITALIC,
                "sans-serif": MathJax.ElementJax.mml.VARIANT.SANSSERIFITALIC,
                "bold-sans-serif": MathJax.ElementJax.mml.VARIANT.SANSSERIFBOLDITALIC
            }[variant] || variant;
        }
        else if (values.style === "normal") {
            variant = {
                italic: MathJax.ElementJax.mml.VARIANT.NORMAL,
                "bold-italic": MathJax.ElementJax.mml.VARIANT.BOLD,
                "sans-serif-italic": MathJax.ElementJax.mml.VARIANT.SANSSERIF,
                "sans-serif-bold-italic": MathJax.ElementJax.mml.VARIANT.BOLDSANSSERIF
            }[variant] || variant;
        }
        if (!(variant in MathJax.OutputJax.EditableSVG.FONTDATA.VARIANT)) {
            variant = "normal";
        }
        return MathJax.OutputJax.EditableSVG.FONTDATA.VARIANT[variant];
    };
    MBaseMixin.prototype.SVGgetScale = function (svg) {
        var scale = 1;
        if (this.mscale) {
            scale = this.scale;
        }
        else {
            var values = this.getValues("scriptlevel", "fontsize");
            values.mathsize = (this.isToken ? this : this.Parent()).Get("mathsize");
            if ((this.styles || {}).fontSize && !values.fontsize) {
                values.fontsize = this.styles.fontSize;
            }
            if (values.fontsize && !this.mathsize) {
                values.mathsize = values.fontsize;
            }
            if (values.scriptlevel !== 0) {
                if (values.scriptlevel > 2) {
                    values.scriptlevel = 2;
                }
                scale = Math.pow(this.Get("scriptsizemultiplier"), values.scriptlevel);
                values.scriptminsize = Util.length2em(this.Get("scriptminsize")) / 1000;
                if (scale < values.scriptminsize) {
                    scale = values.scriptminsize;
                }
            }
            this.scale = scale;
            this.mscale = Util.length2em(values.mathsize) / 1000;
        }
        if (svg) {
            svg.scale = scale;
            if (this.isToken) {
                svg.scale *= this.mscale;
            }
        }
        return scale * this.mscale;
    };
    MBaseMixin.prototype.SVGgetMu = function (svg) {
        var mu = 1, values = this.getValues("scriptlevel", "scriptsizemultiplier");
        if (svg.scale && svg.scale !== 1) {
            mu = 1 / svg.scale;
        }
        if (values.scriptlevel !== 0) {
            if (values.scriptlevel > 2) {
                values.scriptlevel = 2;
            }
            mu = Math.sqrt(Math.pow(values.scriptsizemultiplier, values.scriptlevel));
        }
        return mu;
    };
    MBaseMixin.prototype.SVGnotEmpty = function (data) {
        while (data) {
            if ((data.type !== "mrow" && data.type !== "texatom") ||
                data.data.length > 1) {
                return true;
            }
            data = data.data[0];
        }
        return false;
    };
    MBaseMixin.prototype.SVGcanStretch = function (direction) {
        var can = false;
        if (this.isEmbellished()) {
            var core = this.Core();
            if (core && core !== this) {
                can = core.SVGcanStretch(direction);
                if (can && core.forceStretch) {
                    this.forceStretch = true;
                }
            }
        }
        return can;
    };
    MBaseMixin.prototype.SVGstretchV = function (h, d) {
        return this.toSVG(h, d);
    };
    MBaseMixin.prototype.SVGstretchH = function (w) {
        return this.toSVG(w);
    };
    MBaseMixin.prototype.SVGlineBreaks = function (svg) {
        return false;
    };
    MBaseMixin.prototype.SVGautoload = function () {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + this.type + ".js";
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
    };
    MBaseMixin.SVGautoloadFile = function (name) {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + name + ".js";
        return MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
    };
    MBaseMixin.prototype.SVGlength2em = function (svg, length, mu, d, m) {
        if (m == null) {
            m = -Util.BIGDIMEN;
        }
        var match = String(length).match(/width|height|depth/);
        var size = (match ? svg[match[0].charAt(0)] : (d ? svg[d] : 0));
        var v = Util.length2em(length, mu, size / this.mscale) * this.mscale;
        if (d && String(length).match(/^\s*[-+]/)) {
            return Math.max(m, svg[d] + v);
        }
        else {
            return v;
        }
    };
    MBaseMixin.prototype.isCursorable = function () { return false; };
    MBaseMixin.prototype.moveCursor = function (cursor, direction) {
        this.parent.moveCursorFromChild(cursor, direction, this);
    };
    MBaseMixin.prototype.moveCursorFromChild = function (cursor, direction, child, keep) {
        throw new Error('Unimplemented as cursor container');
    };
    MBaseMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        return false;
    };
    MBaseMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        return false;
    };
    MBaseMixin.prototype.drawCursor = function (cursor) {
        throw new Error('Unable to draw cursor');
    };
    MBaseMixin.prototype.drawCursorHighlight = function (cursor) {
        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawHighlightAt(svgelem, bb.x, bb.y, bb.width, bb.height);
    };
    MBaseMixin.prototype.getSVGBBox = function (elem) {
        var elem = elem || this.EditableSVGelem;
        if (!elem || !elem.ownerSVGElement)
            return;
        var bb = elem.getBBox();
        if (elem.nodeName === 'use') {
            bb.x += Number(elem.getAttribute('x'));
            bb.y += Number(elem.getAttribute('y'));
        }
        var transform = elem.getTransformToElement(elem.ownerSVGElement);
        var ptmp = elem.ownerSVGElement.createSVGPoint();
        var lx = 1 / 0, ly = 1 / 0, hx = -1 / 0, hy = -1 / 0;
        check(bb.x, bb.y);
        check(bb.x + bb.width, bb.y);
        check(bb.x, bb.y + bb.height);
        check(bb.x + bb.width, bb.y + bb.height);
        return {
            x: lx,
            y: ly,
            width: hx - lx,
            height: hy - ly,
        };
        function check(x, y) {
            ptmp.x = x;
            ptmp.y = y;
            var p = ptmp.matrixTransform(transform);
            lx = Math.min(lx, p.x);
            ly = Math.min(ly, p.y);
            hx = Math.max(hx, p.x);
            hy = Math.max(hy, p.y);
        }
    };
    return MBaseMixin;
}(ElementJax));
var BBOX_GLYPH = (function (_super) {
    __extends(BBOX_GLYPH, _super);
    function BBOX_GLYPH(scale, id, h, d, w, l, r, p) {
        this.glyphs = {};
        this.n = 0;
        var def;
        var t = MathJax.OutputJax.EditableSVG.config.blacker;
        var cache = MathJax.OutputJax.EditableSVG.config.useFontCache;
        var transform = (scale === 1 ? null : "scale(" + Util.Fixed(scale) + ")");
        if (cache && !MathJax.OutputJax.EditableSVG.config.useGlobalCache) {
            id = "E" + this.n + "-" + id;
        }
        if (!cache || !this.glyphs[id]) {
            def = { "stroke-width": t };
            if (cache)
                def.id = id;
            else if (transform)
                def.transform = transform;
            def.d = (p ? "M" + p + "Z" : "");
            _super.call(this, def, "path");
            if (cache) {
                BBOX_GLYPH.defs.appendChild(this.element);
                this.glyphs[id] = true;
            }
        }
        if (cache) {
            def = {};
            if (transform)
                def.transform = transform;
            this.element = Util.Element("use", def);
            this.element.setAttributeNS(Util.XLINKNS, "href", "#" + id);
        }
        this.removeable = false;
        this.h = (h + t) * scale;
        this.d = (d + t) * scale;
        this.w = (w + t / 2) * scale;
        this.l = (l + t / 2) * scale;
        this.r = (r + t / 2) * scale;
        this.H = Math.max(0, this.h);
        this.D = Math.max(0, this.d);
        this.x = this.y = 0;
        this.scale = scale;
    }
    return BBOX_GLYPH;
}(BBOX));
var CharsMixin = (function (_super) {
    __extends(CharsMixin, _super);
    function CharsMixin() {
        _super.apply(this, arguments);
    }
    CharsMixin.prototype.toSVG = function (variant, scale, remap, chars) {
        var text = this.data.join("").replace(/[\u2061-\u2064]/g, "");
        if (remap) {
            text = remap(text, chars);
        }
        var svg = CharsMixin.HandleVariant(variant, scale, text);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    };
    CharsMixin.HandleVariant = function (variant, scale, text) {
        var EDITABLESVG = MathJax.OutputJax.EditableSVG;
        var FONTDATA = MathJax.OutputJax.EditableSVG.FONTDATA;
        var svg = new BBOX_G();
        var n, N, c, font, VARIANT, i, m, id, M, RANGES;
        if (!variant) {
            variant = FONTDATA.VARIANT[MathJax.ElementJax.mml.VARIANT.NORMAL];
        }
        if (variant.forceFamily) {
            text = new BBOX_TEXT(scale, text, variant.font);
            if (variant.h !== null) {
                text.h = variant.h;
            }
            if (variant.d !== null) {
                text.d = variant.d;
            }
            svg.Add(text);
            text = "";
        }
        VARIANT = variant;
        for (i = 0, m = text.length; i < m; i++) {
            variant = VARIANT;
            n = text.charCodeAt(i);
            c = text.charAt(i);
            if (n >= 0xD800 && n < 0xDBFF) {
                i++;
                n = (((n - 0xD800) << 10) + (text.charCodeAt(i) - 0xDC00)) + 0x10000;
                if (FONTDATA.RemapPlane1) {
                    var nv = FONTDATA.RemapPlane1(n, variant);
                    n = nv.n;
                    variant = nv.variant;
                }
            }
            else {
                RANGES = FONTDATA.RANGES;
                for (id = 0, M = RANGES.length; id < M; id++) {
                    if (RANGES[id].name === "alpha" && variant.noLowerCase)
                        continue;
                    N = variant["offset" + RANGES[id].offset];
                    if (N && n >= RANGES[id].low && n <= RANGES[id].high) {
                        if (RANGES[id].remap && RANGES[id].remap[n]) {
                            n = N + RANGES[id].remap[n];
                        }
                        else {
                            n = n - RANGES[id].low + N;
                            if (RANGES[id].add) {
                                n += RANGES[id].add;
                            }
                        }
                        if (variant["variant" + RANGES[id].offset]) {
                            variant = FONTDATA.VARIANT[variant["variant" + RANGES[id].offset]];
                        }
                        break;
                    }
                }
            }
            if (variant.remap && variant.remap[n]) {
                n = variant.remap[n];
                if (variant.remap.variant) {
                    variant = FONTDATA.VARIANT[variant.remap.variant];
                }
            }
            else if (FONTDATA.REMAP[n] && !variant.noRemap) {
                n = FONTDATA.REMAP[n];
            }
            if (n instanceof Array) {
                variant = FONTDATA.VARIANT[n[1]];
                n = n[0];
            }
            if (typeof (n) === "string") {
                text = n + text.substr(i + 1);
                m = text.length;
                i = -1;
                continue;
            }
            font = CharsMixin.lookupChar(variant, n);
            c = font[n];
            if (c) {
                if ((c[5] && c[5].space) || (c[5] === "" && c[0] + c[1] === 0)) {
                    svg.w += c[2];
                }
                else {
                    c = [scale, font.id + "-" + n.toString(16).toUpperCase()].concat(c);
                    function F(args) {
                        return BBOX_GLYPH.apply(this, args);
                    }
                    F.prototype = BBOX_GLYPH.prototype;
                    var glyph = new F(c);
                    svg.Add(glyph, svg.w, 0);
                }
            }
            else if (FONTDATA.DELIMITERS[n]) {
                c = this.createDelimiter(n, 0, 1, font);
                svg.Add(c, svg.w, (FONTDATA.DELIMITERS[n].dir === "V" ? c.d : 0));
            }
            else {
                if (n <= 0xFFFF) {
                    c = String.fromCharCode(n);
                }
                else {
                    N = n - 0x10000;
                    c = String.fromCharCode((N >> 10) + 0xD800) + String.fromCharCode((N & 0x3FF) + 0xDC00);
                }
                var box = new BBOX_TEXT(scale * 100 / EDITABLESVG.config.scale, c, {
                    "font-family": variant.defaultFamily || EDITABLESVG.config.undefinedFamily,
                    "font-style": (variant.italic ? "italic" : ""),
                    "font-weight": (variant.bold ? "bold" : "")
                });
                if (variant.h !== null)
                    box.h = variant.h;
                if (variant.d !== null)
                    box.d = variant.d;
                c = new BBOX_G();
                c.Add(box);
                svg.Add(c, svg.w, 0);
                MathJax.Hub.signal.Post(["SVG Jax - unknown char", n, variant]);
            }
        }
        if (text.length == 1 && font.skew && font.skew[n]) {
            svg.skew = font.skew[n] * 1000;
        }
        if (svg.element.childNodes.length === 1) {
            svg.element = svg.element.firstChild;
            svg.removeable = false;
            svg.scale = scale;
        }
        return svg;
    };
    CharsMixin.lookupChar = function (variant, n) {
        var i, m;
        var FONTDATA = MathJax.OutputJax.EditableSVG.FONTDATA;
        if (!variant.FONTS) {
            var FONTS = FONTDATA.FONTS;
            var fonts = (variant.fonts || FONTDATA.VARIANT.normal.fonts);
            if (!(fonts instanceof Array)) {
                fonts = [fonts];
            }
            if (variant.fonts != fonts) {
                variant.fonts = fonts;
            }
            variant.FONTS = [];
            for (i = 0, m = fonts.length; i < m; i++) {
                if (FONTS[fonts[i]]) {
                    variant.FONTS.push(FONTS[fonts[i]]);
                }
            }
        }
        for (i = 0, m = variant.FONTS.length; i < m; i++) {
            var font = variant.FONTS[i];
            if (typeof (font) === "string") {
                delete variant.FONTS;
                this.loadFont(font);
            }
            if (font[n]) {
                return font;
            }
            else {
                this.findBlock(font, n);
            }
        }
        return {
            id: "unknown"
        };
    };
    CharsMixin.createDelimiter = function (code, HW, scale, font) {
        if (scale === void 0) { scale = null; }
        if (font === void 0) { font = null; }
        var EDITABLESVG = MathJax.OutputJax.EditableSVG;
        var FONTDATA = MathJax.OutputJax.EditableSVG.FONTDATA;
        if (!scale) {
            scale = 1;
        }
        ;
        var svg = new BBOX_G();
        if (!code) {
            svg.Clean();
            delete svg.element;
            svg.w = svg.r = Util.TeX.nulldelimiterspace * scale;
            return svg;
        }
        if (!(HW instanceof Array)) {
            HW = [HW, HW];
        }
        var hw = HW[1];
        HW = HW[0];
        var delim = {
            alias: code,
            HW: undefined,
            load: undefined,
            stretch: undefined,
            dir: undefined
        };
        while (delim.alias) {
            code = delim.alias;
            delim = FONTDATA.DELIMITERS[code];
            if (!delim) {
                delim = {
                    HW: [0, FONTDATA.VARIANT[MathJax.ElementJax.mml.VARIANT.NORMAL]],
                    alias: undefined,
                    load: undefined,
                    stretch: undefined,
                    dir: undefined
                };
            }
        }
        if (delim.load) {
            MathJax.Hub.RestartAfter(MathJax.Ajax.Require(EDITABLESVG.fontDir + "/fontdata-" + delim.load + ".js"));
        }
        for (var i = 0, m = delim.HW.length; i < m; i++) {
            if (delim.HW[i][0] * scale >= HW - 10 - MathJax.OutputJax.EditableSVG.config.blacker || (i == m - 1 && !delim.stretch)) {
                if (delim.HW[i][2]) {
                    scale *= delim.HW[i][2];
                }
                if (delim.HW[i][3]) {
                    code = delim.HW[i][3];
                }
                return this.createChar(scale, [code, delim.HW[i][1]], font).With({
                    stretched: true
                }, MathJax.Hub);
            }
        }
        if (delim.stretch) {
            if (delim.dir == "H") {
                EDITABLESVG.extendDelimiterH(svg, hw, delim.stretch, scale, font);
            }
            else if (delim.dir == "V") {
                EDITABLESVG.extendDelimiterV(svg, hw, delim.stretch, scale, font);
            }
        }
        return svg;
    };
    CharsMixin.createChar = function (scale, data, font) {
        var text = "", variant = {
            fonts: [data[1]],
            noRemap: true
        };
        if (font && font === MathJax.ElementJax.mml.VARIANT.BOLD) {
            variant.fonts = [data[1] + "-bold", data[1]];
        }
        if (typeof (data[1]) !== "string") {
            variant = data[1];
        }
        if (data[0] instanceof Array) {
            for (var i = 0, m = data[0].length; i < m; i++) {
                text += String.fromCharCode(data[0][i]);
            }
        }
        else {
            text = String.fromCharCode(data[0]);
        }
        if (data[4]) {
            scale = scale * data[4];
        }
        var svg = this.HandleVariant(variant, scale, text);
        if (data[2]) {
            svg.x = data[2] * 1000;
        }
        if (data[3]) {
            svg.y = data[3] * 1000;
        }
        if (data[5]) {
            svg.h += data[5] * 1000;
        }
        if (data[6]) {
            svg.d += data[6] * 1000;
        }
        return svg;
    };
    CharsMixin.findBlock = function (font, c) {
        if (font.Ranges) {
            for (var i = 0, m = font.Ranges.length; i < m; i++) {
                if (c < font.Ranges[i][0])
                    return;
                if (c <= font.Ranges[i][1]) {
                    var file = font.Ranges[i][2];
                    for (var j = font.Ranges.length - 1; j >= 0; j--) {
                        if (font.Ranges[j][2] == file) {
                            font.Ranges.splice(j, 1);
                        }
                    }
                    this.loadFont(font.directory + "/" + file + ".js");
                }
            }
        }
    };
    CharsMixin.loadFont = function (file) {
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(MathJax.OutputJax.EditableSVG.fontDir + "/" + file));
    };
    return CharsMixin;
}(MBaseMixin));
var EntityMixin = (function (_super) {
    __extends(EntityMixin, _super);
    function EntityMixin() {
        _super.apply(this, arguments);
    }
    EntityMixin.prototype.toSVG = function (variant, scale, remap, chars) {
        var text = this.toString().replace(/[\u2061-\u2064]/g, "");
        if (remap) {
            text = remap(text, chars);
        }
        return CharsMixin.HandleVariant(variant, scale, text);
    };
    return EntityMixin;
}(MBaseMixin));
var Hole = (function (_super) {
    __extends(Hole, _super);
    function Hole() {
        _super.apply(this, arguments);
    }
    Hole.prototype.Init = function () {
        this.type = "hole";
        this.data = [];
    };
    Hole.prototype.isCursorable = function () { return true; };
    Hole.prototype.toSVG = function (h, d) {
        this.SVGgetStyles();
        var svg = new BBOX_ROW();
        this.SVGhandleSpace(svg);
        if (d != null) {
            svg.sh = h;
            svg.sd = d;
        }
        if (this.data.length > 0) {
            console.log('NONTRIVIAL HOLE!!!');
        }
        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                svg.Check(this.data[i]);
            }
        }
        svg.Clean();
        var hole = new BBOX_RECT(700 * this.scale, 0, 525 * this.scale, {
            fill: 'white',
            stroke: 'blue',
            "stroke-width": '20'
        });
        svg.Add(hole, 0, 0);
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    Hole.prototype.moveCursorFromParent = function (cursor, direction) {
        cursor.moveTo(this, 0);
        return true;
    };
    Hole.prototype.moveCursorFromChild = function (cursor, direction, child) {
        throw new Error('Hole does not have a child');
    };
    Hole.prototype.moveCursorFromClick = function (cursor, x, y) {
        cursor.moveTo(this, 0);
        return true;
    };
    Hole.prototype.moveCursor = function (cursor, direction) {
        return this.parent.moveCursorFromChild(cursor, direction, this);
    };
    Hole.prototype.drawCursor = function (cursor) {
        var bbox = this.getSVGBBox();
        var x = bbox.x + (bbox.width / 2.0);
        var y = bbox.y;
        var height = bbox.height;
        cursor.drawAt(this.EditableSVGelem.ownerSVGElement, x, y, height);
    };
    return Hole;
}(MBaseMixin));
var MActionMixin = (function (_super) {
    __extends(MActionMixin, _super);
    function MActionMixin() {
        _super.apply(this, arguments);
    }
    MActionMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MActionMixin;
}(MBaseMixin));
var BBOX_SVG = (function (_super) {
    __extends(BBOX_SVG, _super);
    function BBOX_SVG() {
        _super.call(this, null, "svg");
        this.removeable = false;
    }
    return BBOX_SVG;
}(BBOX));
var MathMixin = (function (_super) {
    __extends(MathMixin, _super);
    function MathMixin() {
        _super.apply(this, arguments);
    }
    MathMixin.prototype.isCursorable = function () { return false; };
    MathMixin.prototype.toSVG = function (span, div, replace) {
        var CONFIG = MathJax.OutputJax.EditableSVG.config;
        this.loadTexify();
        if (!this.data[0])
            return span;
        this.SVGgetStyles();
        MathJax.ElementJax.mml.mbase.prototype.displayAlign = MathJax.Hub.config.displayAlign;
        MathJax.ElementJax.mml.mbase.prototype.displayIndent = MathJax.Hub.config.displayIndent;
        if (String(MathJax.Hub.config.displayIndent).match(/^0($|[a-z%])/i))
            MathJax.ElementJax.mml.mbase.prototype.displayIndent = "0";
        var box = new BBOX_G();
        var dataSvg = this.data[0].toSVG();
        box.Add(dataSvg, 0, 0, true);
        box.Clean();
        this.SVGhandleColor(box);
        Util.Element(box.element, {
            stroke: "currentColor",
            fill: "currentColor",
            "stroke-width": 0,
            transform: "matrix(1 0 0 -1 0 0)"
        });
        box.removeable = false;
        var svg = new BBOX_SVG();
        svg.element.setAttribute("xmlns:xlink", Util.XLINKNS);
        if (CONFIG.useFontCache && !CONFIG.useGlobalCache) {
            svg.element.appendChild(BBOX.defs);
        }
        svg.Add(box);
        svg.Clean();
        this.SVGsaveData(svg);
        if (!span) {
            svg.element = svg.element.firstChild;
            svg.element.removeAttribute("transform");
            svg.removeable = true;
            return svg;
        }
        var l = Math.max(-svg.l, 0), r = Math.max(svg.r - svg.w, 0);
        var style = svg.element.style;
        svg.element.setAttribute("width", Util.Ex(l + svg.w + r));
        svg.element.setAttribute("height", Util.Ex(svg.H + svg.D + 2 * Util.em));
        style.verticalAlign = Util.Ex(-svg.D - 2 * Util.em);
        style.marginLeft = Util.Ex(-l);
        style.marginRight = Util.Ex(-r);
        svg.element.setAttribute("viewBox", Util.Fixed(-l, 1) + " " + Util.Fixed(-svg.H - Util.em, 1) + " " +
            Util.Fixed(l + svg.w + r, 1) + " " + Util.Fixed(svg.H + svg.D + 2 * Util.em, 1));
        style.marginTop = style.marginBottom = "1px";
        if (svg.H > svg.h) {
            style.marginTop = Util.Ex(svg.h - svg.H);
        }
        if (svg.D > svg.d) {
            style.marginBottom = Util.Ex(svg.d - svg.D);
            style.verticalAlign = Util.Ex(-svg.d);
        }
        var alttext = this.Get("alttext");
        if (alttext && !svg.element.getAttribute("aria-label"))
            span.setAttribute("aria-label", alttext);
        if (!svg.element.getAttribute("role"))
            span.setAttribute("role", "math");
        svg.element.classList.add('rendered-svg-output');
        var previous = span.querySelector('.rendered-svg-output');
        if (replace && previous) {
            span.replaceChild(svg.element, previous);
        }
        else {
            span.appendChild(svg.element);
        }
        svg.element = null;
        if (!this.isMultiline && this.Get("display") === "block" && !svg.hasIndent) {
            var values = this.getValues("indentalignfirst", "indentshiftfirst", "indentalign", "indentshift");
            if (values.indentalignfirst !== MathJax.ElementJax.mml.INDENTALIGN.INDENTALIGN) {
                values.indentalign = values.indentalignfirst;
            }
            if (values.indentalign === MathJax.ElementJax.mml.INDENTALIGN.AUTO) {
                values.indentalign = this.displayAlign;
            }
            if (values.indentshiftfirst !== MathJax.ElementJax.mml.INDENTSHIFT.INDENTSHIFT) {
                values.indentshift = values.indentshiftfirst;
            }
            if (values.indentshift === "auto") {
                values.indentshift = "0";
            }
            var shift = Util.length2em(values.indentshift, 1, this.editableSVG.cwidth);
            if (this.displayIndent !== "0") {
                var indent = Util.length2em(this.displayIndent, 1, this.editableSVG.cwidth);
                shift += (values.indentalign === MathJax.ElementJax.mml.INDENTALIGN.RIGHT ? -indent : indent);
            }
            div.style.textAlign = values.indentalign;
            if (shift) {
                MathJax.Hub.Insert(style, ({
                    left: {
                        marginLeft: Util.Ex(shift)
                    },
                    right: {
                        marginRight: Util.Ex(-shift)
                    },
                    center: {
                        marginLeft: Util.Ex(shift),
                        marginRight: Util.Ex(-shift)
                    }
                })[values.indentalign]);
            }
        }
        return span;
    };
    MathMixin.prototype.loadTexify = function () {
        return MBaseMixin.SVGautoloadFile('texify');
    };
    MathMixin.prototype.installCursorListeners = function () {
        var that = this;
        that.otherCursors = {};
        var id = $(that.EditableSVGelem).parent().attr("id");
        MathJax.hiteSignal.MessageHook("EditableSVG draw_other_cursor", function (args) {
            if (args[1] != id)
                return;
            console.log("Processing draw other cursor");
            var cursorID = args[2];
            var path = args[3];
            var position = args[4];
            var color = args[5];
            var node = that;
            while (path.length > 0) {
                node = node.data[path.shift()];
            }
            if (!(cursorID in that.otherCursors)) {
                that.otherCursors[cursorID] = new Cursor(color, true);
            }
            var cursor = that.otherCursors[cursorID];
            cursor.moveTo(node, position);
            cursor.draw();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG clear_other_cursor", function (args) {
            console.log("Processing clear other cursor");
            var cursorID = args[1];
            if (cursorID in that.otherCursors) {
                that.otherCursors[cursorID].blur();
                delete that.otherCursors[cursorID];
            }
        });
    };
    MathMixin.prototype.onMoveCursorLeft = function (fn) {
        this.onMoveCursorLeft = fn;
    };
    MathMixin.prototype.onMoveCursorRight = function (fn) {
        this.onMoveCursorRight = fn;
    };
    MathMixin.prototype.onMoveCursorUp = function (fn) {
        this.onMoveCursorUp = fn;
    };
    MathMixin.prototype.onMoveCursorDown = function (fn) {
        this.onMoveCursorDown = fn;
    };
    MathMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        var id = $(this.EditableSVGelem).parent().attr("id");
        var that = this;
        if (direction == Direction.LEFT) {
            if (that.onMoveCursorLeft) {
                setTimeout(function () { that.onMoveCursorLeft(); }, 0);
            }
        }
        else if (direction == Direction.RIGHT) {
            if (that.onMoveCursorRight) {
                setTimeout(function () { that.onMoveCursorRight(); }, 0);
            }
        }
        else if (direction == Direction.UP) {
            if (that.onMoveCursorUp) {
                setTimeout(function () { that.onMoveCursorUp(); }, 0);
            }
        }
        if (direction == Direction.DOWN) {
            if (that.onMoveCursorDown) {
                setTimeout(function () { that.onMoveCursorDown(); }, 0);
            }
        }
        return false;
    };
    return MathMixin;
}(MBaseMixin));
var MEncloseMixin = (function (_super) {
    __extends(MEncloseMixin, _super);
    function MEncloseMixin() {
        _super.apply(this, arguments);
    }
    MEncloseMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MEncloseMixin;
}(MBaseMixin));
var MErrorMixin = (function (_super) {
    __extends(MErrorMixin, _super);
    function MErrorMixin() {
        _super.apply(this, arguments);
    }
    MErrorMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX(), scale = Util.length2em(this.styles.fontSize || 1) / 1000;
        this.SVGhandleSpace(svg);
        var def = (scale !== 1 ? {
            transform: "scale(" + Util.Fixed(scale) + ")"
        } : {});
        var bbox = new BBOX(def);
        bbox.Add(this.SVGchildSVG(0));
        bbox.Clean();
        if (scale !== 1) {
            bbox.removeable = false;
            var adjust = ["w", "h", "d", "l", "r", "D", "H"];
            for (var i = 0, m = adjust.length; i < m; i++) {
                bbox[adjust[i]] *= scale;
            }
        }
        svg.Add(bbox);
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    MErrorMixin.prototype.SVGgetStyles = function () {
        var span = Util.Element("span", {
            style: MathJax.OutputJax.EditableSVG.config.merrorStyle
        });
        this.styles = this.SVGprocessStyles(span.style);
        if (this.style) {
            span.style.cssText = this.style;
            MathJax.Hub.Insert(this.styles, this.SVGprocessStyles(span.style));
        }
    };
    return MErrorMixin;
}(MBaseMixin));
var MFencedMixin = (function (_super) {
    __extends(MFencedMixin, _super);
    function MFencedMixin() {
        _super.apply(this, arguments);
    }
    MFencedMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX_ROW();
        this.SVGhandleSpace(svg);
        if (this.data.open) {
            svg.Check(this.data.open);
        }
        if (this.data[0] != null) {
            svg.Check(this.data[0]);
        }
        for (var i = 1, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                if (this.data["sep" + i]) {
                    svg.Check(this.data["sep" + i]);
                }
                svg.Check(this.data[i]);
            }
        }
        if (this.data.close) {
            svg.Check(this.data.close);
        }
        svg.Stretch();
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    return MFencedMixin;
}(MBaseMixin));
var MFracMixin = (function (_super) {
    __extends(MFracMixin, _super);
    function MFracMixin() {
        _super.apply(this, arguments);
    }
    MFracMixin.prototype.isCursorable = function () { return true; };
    MFracMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX();
        var scale = this.SVGgetScale(svg);
        var frac = new BBOX();
        frac.scale = svg.scale;
        this.SVGhandleSpace(frac);
        var num = this.SVGchildSVG(0), den = this.SVGchildSVG(1);
        var values = this.getValues("displaystyle", "linethickness", "numalign", "denomalign", "bevelled");
        var isDisplay = values.displaystyle;
        var a = Util.TeX.axis_height * scale;
        if (values.bevelled) {
            var delta = (isDisplay ? 400 : 150);
            var H = Math.max(num.h + num.d, den.h + den.d) + 2 * delta;
            var bevel = CharsMixin.createDelimiter(0x2F, H);
            frac.Add(num, 0, (num.d - num.h) / 2 + a + delta);
            frac.Add(bevel, num.w - delta / 2, (bevel.d - bevel.h) / 2 + a);
            frac.Add(den, num.w + bevel.w - delta, (den.d - den.h) / 2 + a - delta);
        }
        else {
            var W = Math.max(num.w, den.w);
            var t = Util.thickness2em(values.linethickness, this.scale) * this.mscale, p, q, u, v;
            var mt = Util.TeX.min_rule_thickness / Util.em * 1000;
            if (isDisplay) {
                u = Util.TeX.num1;
                v = Util.TeX.denom1;
            }
            else {
                u = (t === 0 ? Util.TeX.num3 : Util.TeX.num2);
                v = Util.TeX.denom2;
            }
            u *= scale;
            v *= scale;
            if (t === 0) {
                p = Math.max((isDisplay ? 7 : 3) * Util.TeX.rule_thickness, 2 * mt);
                q = (u - num.d) - (den.h - v);
                if (q < p) {
                    u += (p - q) / 2;
                    v += (p - q) / 2;
                }
                frac.w = W;
                t = 0;
            }
            else {
                p = Math.max((isDisplay ? 2 : 0) * mt + t, t / 2 + 1.5 * mt);
                q = (u - num.d) - (a + t / 2);
                if (q < p) {
                    u += p - q;
                }
                q = (a - t / 2) - (den.h - v);
                if (q < p) {
                    v += p - q;
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
    };
    MFracMixin.prototype.SVGcanStretch = function (direction) {
        return false;
    };
    MFracMixin.prototype.SVGhandleSpace = function (svg) {
        if (!this.texWithDelims && !this.useMMLspacing) {
            svg.x = svg.X = Util.TeX.nulldelimiterspace * this.mscale;
        }
        _super.prototype.SVGhandleSpace.call(this, svg);
    };
    MFracMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        var bb = this.getSVGBBox();
        var midlineY = bb.y + (bb.height / 2.0);
        var midlineX = bb.x + (bb.width / 2.0);
        cursor.position = {
            position: (x < midlineX) ? 0 : 1,
            half: (y < midlineY) ? 0 : 1,
        };
        if (this.data[cursor.position.half].isCursorable()) {
            this.data[cursor.position.half].moveCursorFromClick(cursor, x, y);
            return;
        }
        return cursor.moveTo(this, cursor.position);
    };
    MFracMixin.prototype.moveCursor = function (cursor, direction) {
        if (cursor.position.half === undefined)
            throw new Error('Invalid cursor');
        if (cursor.position.position === 0 && direction === Direction.RIGHT) {
            cursor.position.position = 1;
        }
        else if (cursor.position.position === 1 && direction === Direction.LEFT) {
            cursor.position.position = 0;
        }
        else if (cursor.position.half === 0 && direction === Direction.DOWN) {
            return this.moveCursorIntoDenominator(cursor, direction);
        }
        else if (cursor.position.half === 1 && direction === Direction.UP) {
            return this.moveCursorIntoNumerator(cursor, direction);
        }
        else {
            return this.parent.moveCursorFromChild(cursor, direction, this);
        }
        cursor.moveTo(this, cursor.position);
    };
    MFracMixin.prototype.moveCursorFromChild = function (cursor, direction, child, keep) {
        var isNumerator = this.data[0] === child;
        var isDenominator = this.data[1] === child;
        if (!isNumerator && !isDenominator)
            throw new Error('Specified child not found in children');
        if (isNumerator && direction === Direction.DOWN) {
            return this.moveCursorIntoDenominator(cursor, direction);
        }
        else if (isDenominator && direction === Direction.UP) {
            return this.moveCursorIntoNumerator(cursor, direction);
        }
        else if (keep) {
            return this.moveCursorIntoHalf(isNumerator ? 0 : 1, cursor, direction);
        }
        else {
            return this.parent.moveCursorFromChild(cursor, direction, this);
        }
    };
    MFracMixin.prototype.moveCursorIntoHalf = function (half, cursor, direction) {
        if (this.data[half].isCursorable()) {
            return this.data[half].moveCursorFromParent(cursor, direction);
        }
        var position = 0;
        if (cursor.renderedPosition) {
            var bb = this.data[half].getSVGBBox();
            if (bb && cursor.renderedPosition.x > bb.x + bb.width / 2) {
                position = 1;
            }
        }
        cursor.moveTo(this, {
            half: half,
            position: position,
        });
        return true;
    };
    MFracMixin.prototype.moveCursorIntoNumerator = function (c, d) {
        return this.moveCursorIntoHalf(0, c, d);
    };
    MFracMixin.prototype.moveCursorIntoDenominator = function (c, d) {
        return this.moveCursorIntoHalf(1, c, d);
    };
    MFracMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        switch (direction) {
            case Direction.LEFT:
            case Direction.RIGHT:
                if (this.data[0].isCursorable()) {
                    return this.data[0].moveCursorFromParent(cursor, direction);
                }
                cursor.moveTo(this, {
                    half: 0,
                    position: direction === Direction.RIGHT ? 0 : 1,
                });
                return true;
            case Direction.UP:
                return this.moveCursorIntoDenominator(cursor, direction);
            case Direction.DOWN:
                return this.moveCursorIntoNumerator(cursor, direction);
        }
        return false;
    };
    MFracMixin.prototype.drawCursor = function (cursor) {
        if (cursor.position.half === undefined)
            throw new Error('Invalid cursor');
        var bbox = this.data[cursor.position.half].getSVGBBox();
        var height = bbox.height;
        var x = bbox.x + (cursor.position.position ? bbox.width + 100 : -100);
        var y = bbox.y;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        return cursor.drawAt(svgelem, x, y, height);
    };
    MFracMixin.name = "mfrac";
    return MFracMixin;
}(MBaseMixin));
var MGlyphMixin = (function (_super) {
    __extends(MGlyphMixin, _super);
    function MGlyphMixin() {
        _super.apply(this, arguments);
    }
    MGlyphMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    ;
    return MGlyphMixin;
}(MBaseMixin));
var MMultiScriptsMixin = (function (_super) {
    __extends(MMultiScriptsMixin, _super);
    function MMultiScriptsMixin() {
        _super.apply(this, arguments);
    }
    MMultiScriptsMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MMultiScriptsMixin;
}(MBaseMixin));
var MnMixin = (function (_super) {
    __extends(MnMixin, _super);
    function MnMixin() {
        _super.apply(this, arguments);
    }
    MnMixin.prototype.isCursorable = function () { return true; };
    MnMixin.prototype.getCursorLength = function () {
        return this.data[0].data[0].length;
    };
    MnMixin.prototype.moveCursor = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        var vertical = direction === Direction.UP || direction === Direction.DOWN;
        if (vertical)
            return this.parent.moveCursorFromChild(cursor, direction, this);
        var newPosition = cursor.position + (direction === Direction.LEFT ? -1 : 1);
        if (newPosition < 0 || newPosition > this.getCursorLength()) {
            this.parent.moveCursorFromChild(cursor, direction, this);
            return;
        }
        cursor.moveTo(this, newPosition);
    };
    MnMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        throw new Error('Unimplemented as cursor container');
    };
    MnMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        if (direction === Direction.LEFT) {
            cursor.moveTo(this, this.getCursorLength());
        }
        else if (direction === Direction.RIGHT) {
            cursor.moveTo(this, 0);
        }
        else if (cursor.renderedPosition &&
            this.moveCursorFromClick(cursor, cursor.renderedPosition.x, cursor.renderedPosition.y)) {
            return true;
        }
        else {
            cursor.moveTo(this, 0);
        }
        return true;
    };
    MnMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
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
    };
    MnMixin.prototype.drawCursor = function (cursor) {
        var bbox = this.getSVGBBox();
        var height = bbox.height;
        var y = bbox.y;
        var preedge;
        var postedge;
        if (cursor.position === 0) {
            preedge = bbox.x;
        }
        else {
            var prebox = this.data[cursor.position - 1].getSVGBBox();
            preedge = prebox.x + prebox.width;
        }
        if (cursor.position === this.getCursorLength()) {
            postedge = bbox.x + bbox.width;
        }
        else {
            var postbox = this.data[cursor.position].getSVGBBox();
            postedge = postbox.x;
        }
        var x = (postedge + preedge) / 2;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawAt(svgelem, x, y, height);
    };
    return MnMixin;
}(MBaseMixin));
var MoMixin = (function (_super) {
    __extends(MoMixin, _super);
    function MoMixin() {
        _super.apply(this, arguments);
    }
    MoMixin.prototype.toSVG = function (HW, D) {
        if (HW === void 0) { HW = null; }
        if (D === void 0) { D = null; }
        var FONTDATA = MathJax.OutputJax.EditableSVG.FONTDATA;
        this.SVGgetStyles();
        var svg = this.svg = new BBOX();
        var scale = this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        if (this.data.length == 0) {
            svg.Clean();
            this.SVGsaveData(svg);
            return svg;
        }
        if (D != null) {
            return this.SVGstretchV(HW, D);
        }
        else if (HW != null) {
            return this.SVGstretchH(HW);
        }
        var variant = this.SVGgetVariant();
        var values = this.getValues("largeop", "displaystyle");
        if (values.largeop) {
            variant = FONTDATA.VARIANT[values.displaystyle ? "-largeOp" : "-smallOp"];
        }
        var parent = this.CoreParent();
        var isScript = (parent && parent.isa(MathJax.ElementJax.mml.msubsup) && this !== parent.data[0]);
        var mapchars = (isScript ? this.remapChars : null);
        if (this.data.join("").length === 1 && parent && parent.isa(MathJax.ElementJax.mml.munderover) &&
            this.CoreText(parent.data[parent.base]).length === 1) {
            var over = parent.data[parent.over], under = parent.data[parent.under];
            if (over && this === over.CoreMO() && parent.Get("accent")) {
                mapchars = FONTDATA.REMAPACCENT;
            }
            else if (under && this === under.CoreMO() && parent.Get("accentunder")) {
                mapchars = FONTDATA.REMAPACCENTUNDER;
            }
        }
        if (isScript && this.data.join("").match(/['`"\u00B4\u2032-\u2037\u2057]/)) {
            variant = FONTDATA.VARIANT["-TeX-variant"];
        }
        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                var text = this.data[i].toSVG(variant, scale, this.remap, mapchars), x = svg.w;
                if (x === 0 && -text.l > 10 * text.w) {
                    x += -text.l;
                }
                svg.Add(text, x, 0, true);
                if (text.skew) {
                    svg.skew = text.skew;
                }
            }
        }
        svg.Clean();
        if (this.data.join("").length !== 1) {
            delete svg.skew;
        }
        if (values.largeop) {
            svg.y = Util.TeX.axis_height - (svg.h - svg.d) / 2 / scale;
            if (svg.r > svg.w) {
                svg.ic = svg.r - svg.w;
                svg.w = svg.r;
            }
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    };
    MoMixin.prototype.SVGcanStretch = function (direction) {
        var FONTDATA = MathJax.OutputJax.EditableSVG.FONTDATA;
        if (!this.Get("stretchy")) {
            return false;
        }
        var c = this.data.join("");
        if (c.length > 1) {
            return false;
        }
        var parent = this.CoreParent();
        if (parent && parent.isa(MathJax.ElementJax.mml.munderover) &&
            this.CoreText(parent.data[parent.base]).length === 1) {
            var over = parent.data[parent.over], under = parent.data[parent.under];
            if (over && this === over.CoreMO() && parent.Get("accent")) {
                c = FONTDATA.REMAPACCENT[c] || c;
            }
            else if (under && this === under.CoreMO() && parent.Get("accentunder")) {
                c = FONTDATA.REMAPACCENTUNDER[c] || c;
            }
        }
        c = FONTDATA.DELIMITERS[c.charCodeAt(0)];
        var can = (c && c.dir == direction.substr(0, 1));
        if (!can) {
            delete this.svg;
        }
        this.forceStretch = can && (this.Get("minsize", true) || this.Get("maxsize", true));
        return can;
    };
    MoMixin.prototype.SVGstretchV = function (h, d) {
        var svg = this.svg || this.toSVG();
        var values = this.getValues("symmetric", "maxsize", "minsize");
        var axis = Util.TeX.axis_height * svg.scale, mu = this.SVGgetMu(svg), H;
        if (values.symmetric) {
            H = 2 * Math.max(h - axis, d + axis);
        }
        else {
            H = h + d;
        }
        values.maxsize = Util.length2em(values.maxsize, mu, svg.h + svg.d);
        values.minsize = Util.length2em(values.minsize, mu, svg.h + svg.d);
        H = Math.max(values.minsize, Math.min(values.maxsize, H));
        if (H != values.minsize) {
            H = [Math.max(H * Util.TeX.delimiterfactor / 1000, H - Util.TeX.delimitershortfall), H];
        }
        svg = CharsMixin.createDelimiter(this.data.join("").charCodeAt(0), H, svg.scale);
        if (values.symmetric) {
            H = (svg.h + svg.d) / 2 + axis;
        }
        else {
            H = (svg.h + svg.d) * h / (h + d);
        }
        svg.y = H - svg.h;
        this.SVGhandleSpace(svg);
        this.SVGhandleColor(svg);
        delete this.svg.element;
        this.SVGsaveData(svg);
        svg.stretched = true;
        return svg;
    };
    MoMixin.prototype.SVGstretchH = function (w) {
        var svg = this.svg || this.toSVG(), mu = this.SVGgetMu(svg);
        var values = this.getValues("maxsize", "minsize", "mathvariant", "fontweight");
        if ((values.fontweight === "bold" || parseInt(values.fontweight) >= 600) &&
            !this.Get("mathvariant", true)) {
            values.mathvariant = MathJax.ElementJax.mml.VARIANT.BOLD;
        }
        values.maxsize = Util.length2em(values.maxsize, mu, svg.w);
        values.minsize = Util.length2em(values.minsize, mu, svg.w);
        w = Math.max(values.minsize, Math.min(values.maxsize, w));
        svg = CharsMixin.createDelimiter(this.data.join("").charCodeAt(0), w, svg.scale, values.mathvariant);
        this.SVGhandleSpace(svg);
        this.SVGhandleColor(svg);
        delete this.svg.element;
        this.SVGsaveData(svg);
        svg.stretched = true;
        return svg;
    };
    return MoMixin;
}(MBaseMixin));
var MPaddedMixin = (function (_super) {
    __extends(MPaddedMixin, _super);
    function MPaddedMixin() {
        _super.apply(this, arguments);
    }
    MPaddedMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX();
        if (this.data[0] != null) {
            this.SVGgetScale(svg);
            this.SVGhandleSpace(svg);
            var pad = this.EditableSVGdataStretched(0, HW, D), mu = this.SVGgetMu(svg);
            var values = this.getValues("height", "depth", "width", "lspace", "voffset"), X = 0, Y = 0;
            if (values.lspace) {
                X = this.SVGlength2em(pad, values.lspace, mu);
            }
            if (values.voffset) {
                Y = this.SVGlength2em(pad, values.voffset, mu);
            }
            var h = pad.h, d = pad.d, w = pad.w, y = pad.y;
            svg.Add(pad, X, Y);
            svg.Clean();
            svg.h = h + y;
            svg.d = d - y;
            svg.w = w;
            svg.removeable = false;
            if (values.height !== "") {
                svg.h = this.SVGlength2em(svg, values.height, mu, "h", 0);
            }
            if (values.depth !== "") {
                svg.d = this.SVGlength2em(svg, values.depth, mu, "d", 0);
            }
            if (values.width !== "") {
                svg.w = this.SVGlength2em(svg, values.width, mu, "w", 0);
            }
            if (svg.h > svg.H) {
                svg.H = svg.h;
            }
            ;
            if (svg.d > svg.D) {
                svg.D = svg.d;
            }
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    MPaddedMixin.prototype.SVGlength2em = function (svg, length, mu, d, m) {
        if (m == null) {
            m = -Util.BIGDIMEN;
        }
        var match = String(length).match(/width|height|depth/);
        var size = (match ? svg[match[0].charAt(0)] : (d ? svg[d] : 0));
        var v = Util.length2em(length, mu, size / this.mscale) * this.mscale;
        if (d && String(length).match(/^\s*[-+]/)) {
            return Math.max(m, svg[d] + v);
        }
        else {
            return v;
        }
    };
    return MPaddedMixin;
}(MBaseMixin));
var MPhantomMixin = (function (_super) {
    __extends(MPhantomMixin, _super);
    function MPhantomMixin() {
        _super.apply(this, arguments);
    }
    MPhantomMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX();
        this.SVGgetScale(svg);
        if (this.data[0] != null) {
            this.SVGhandleSpace(svg);
            svg.Add(this.EditableSVGdataStretched(0, HW, D));
            svg.Clean();
            while (svg.element.firstChild) {
                svg.element.removeChild(svg.element.firstChild);
            }
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        if (svg.removeable && !svg.element.firstChild) {
            delete svg.element;
        }
        return svg;
    };
    return MPhantomMixin;
}(MBaseMixin));
var MSqrtMixin = (function (_super) {
    __extends(MSqrtMixin, _super);
    function MSqrtMixin() {
        _super.apply(this, arguments);
    }
    MSqrtMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX();
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
            p = Util.TeX.x_height * scale;
        }
        else {
            p = t;
        }
        q = Math.max(t + p / 4, 1000 * Util.TeX.min_root_space / Util.em);
        H = base.h + base.d + q + t;
        surd = CharsMixin.createDelimiter(0x221A, H, scale);
        if (surd.h + surd.d > H) {
            q = ((surd.h + surd.d) - (H - t)) / 2;
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
    };
    MSqrtMixin.prototype.SVGaddRoot = function (svg, surd, x, d, scale) {
        return x;
    };
    MSqrtMixin.prototype.isCursorable = function () { return true; };
    MSqrtMixin.prototype.moveCursorFromChild = function (c, d) {
        this.parent.moveCursorFromChild(c, d, this);
    };
    MSqrtMixin.prototype.moveCursorFromParent = function (c, d) {
        return this.data[0].moveCursorFromParent(c, d);
    };
    return MSqrtMixin;
}(MBaseMixin));
var MRootMixin = (function (_super) {
    __extends(MRootMixin, _super);
    function MRootMixin() {
        _super.apply(this, arguments);
    }
    MRootMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX();
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
            p = Util.TeX.x_height * scale;
        }
        else {
            p = t;
        }
        q = Math.max(t + p / 4, 1000 * Util.TeX.min_root_space / Util.em);
        H = base.h + base.d + q + t;
        surd = CharsMixin.createDelimiter(0x221A, H, scale);
        if (surd.h + surd.d > H) {
            q = ((surd.h + surd.d) - (H - t)) / 2;
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
    };
    MRootMixin.prototype.SVGaddRoot = function (svg, surd, x, d, scale) {
        var dx = (surd.isMultiChar ? .55 : .65) * surd.w;
        if (this.data[1]) {
            var root = this.data[1].toSVG();
            root.x = 0;
            var h = this.SVGrootHeight(surd.h + surd.d, scale, root) - d;
            var w = Math.min(root.w, root.r);
            x = Math.max(w, dx);
            svg.Add(root, x - w, h);
        }
        else {
            dx = x;
        }
        return x - dx;
    };
    MRootMixin.prototype.SVGrootHeight = function (d, scale, root) {
        return .45 * (d - 900 * scale) + 600 * scale + Math.max(0, root.d - 75);
    };
    MRootMixin.prototype.isCursorable = function () { return true; };
    MRootMixin.prototype.moveCursorFromChild = function (c, d) {
        this.parent.moveCursorFromChild(c, d, this);
    };
    MRootMixin.prototype.moveCursorFromParent = function (c, d) {
        return this.data[0].moveCursorFromParent(c, d);
    };
    return MRootMixin;
}(MBaseMixin));
var BBOX_ROW = (function (_super) {
    __extends(BBOX_ROW, _super);
    function BBOX_ROW() {
        _super.call(this);
        this.elems = [];
        this.sh = this.sd = 0;
    }
    BBOX_ROW.prototype.Check = function (data) {
        var svg = data.toSVG();
        this.elems.push(svg);
        if (data.SVGcanStretch("Vertical")) {
            svg.mml = data;
        }
        if (svg.h > this.sh) {
            this.sh = svg.h;
        }
        if (svg.d > this.sd) {
            this.sd = svg.d;
        }
        return svg;
    };
    BBOX_ROW.prototype.Stretch = function () {
        for (var i = 0, m = this.elems.length; i < m; i++) {
            var svg = this.elems[i], mml = svg.mml;
            if (mml) {
                if (mml.forceStretch || mml.EditableSVGdata.h !== this.sh || mml.EditableSVGdata.d !== this.sd) {
                    svg = mml.SVGstretchV(this.sh, this.sd);
                }
                mml.EditableSVGdata.HW = this.sh;
                mml.EditableSVGdata.D = this.sd;
            }
            if (svg.ic) {
                this.ic = svg.ic;
            }
            else {
                delete this.ic;
            }
            this.Add(svg, this.w, 0, true);
        }
        delete this.elems;
    };
    return BBOX_ROW;
}(BBOX));
var MRowMixin = (function (_super) {
    __extends(MRowMixin, _super);
    function MRowMixin() {
        _super.apply(this, arguments);
    }
    MRowMixin.prototype.isCursorable = function () { return true; };
    MRowMixin.prototype.focus = function () {
        console.log('focus!');
    };
    MRowMixin.prototype.toSVG = function (h, d) {
        this.SVGgetStyles();
        var svg = new BBOX_ROW();
        this.SVGhandleSpace(svg);
        if (d != null) {
            svg.sh = h;
            svg.sd = d;
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
                svg.skew = data.skew;
            }
        }
        if (this.SVGlineBreaks(svg))
            svg = this.SVGmultiline(svg);
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    };
    MRowMixin.prototype.SVGlineBreaks = function (svg) {
        if (!this.parent.linebreakContainer) {
            return false;
        }
        return (MathJax.OutputJax.EditableSVG.config.linebreaks.automatic &&
            svg.w > this.editableSVG.linebreakWidth) || this.hasNewline();
    };
    MRowMixin.prototype.SVGmultiline = function (span) {
        return MBaseMixin.SVGautoloadFile("multiline");
    };
    MRowMixin.prototype.SVGstretchH = function (w) {
        var svg = new BBOX_ROW();
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            svg.Add(this.EditableSVGdataStretched(i, w), svg.w, 0);
        }
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    MRowMixin.prototype.isCursorPassthrough = function () {
        return false;
    };
    MRowMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        if (this.isCursorPassthrough()) {
            return this.data[0].moveCursorFromParent(cursor, direction);
        }
        if (direction === Direction.LEFT) {
            cursor.moveTo(this, this.data.length);
        }
        else if (direction === Direction.RIGHT) {
            cursor.moveTo(this, 0);
        }
        else if (cursor.renderedPosition &&
            this.moveCursorFromClick(cursor, cursor.renderedPosition.x, cursor.renderedPosition.y)) {
            return true;
        }
        else {
            cursor.moveTo(this, 0);
        }
        return true;
    };
    MRowMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        if (this.isCursorPassthrough() || direction === Direction.UP || direction === Direction.DOWN) {
            return this.parent.moveCursorFromChild(cursor, direction, this);
        }
        direction = Util.getCursorValue(direction);
        for (var childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx])
                break;
        }
        if (childIdx === this.data.length)
            throw new Error('Unable to find specified child in children');
        if (direction === Direction.LEFT) {
            cursor.moveTo(this, childIdx);
        }
        else if (direction === Direction.RIGHT) {
            cursor.moveTo(this, childIdx + 1);
        }
        return true;
    };
    MRowMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        for (var childIdx = 0; childIdx < this.data.length; ++childIdx) {
            var child = this.data[childIdx];
            var bb = child.getSVGBBox();
            if (!bb)
                continue;
            var midpoint = bb.x + (bb.width / 2);
            if (x < midpoint) {
                cursor.moveTo(this, childIdx);
                return true;
            }
        }
        cursor.moveTo(this, this.data.length);
        return true;
    };
    MRowMixin.prototype.moveCursor = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        var vertical = direction === Direction.UP || direction === Direction.DOWN;
        if (vertical)
            return this.parent.moveCursorFromChild(cursor, direction, this);
        var newPosition = cursor.position + (direction === Direction.LEFT ? -1 : 1);
        if (newPosition < 0 || newPosition > this.data.length) {
            this.parent.moveCursorFromChild(cursor, direction, this);
            return;
        }
        var childPosition = direction === Direction.LEFT ? cursor.position - 1 : cursor.position;
        if (cursor.mode === cursor.SELECTION) {
            cursor.moveTo(this, newPosition);
            return;
        }
        if (this.data[childPosition].moveCursorFromParent(cursor, direction))
            return;
        cursor.moveTo(this, newPosition);
    };
    MRowMixin.prototype.drawCursor = function (cursor) {
        var bbox = this.getSVGBBox();
        var height = bbox.height;
        var y = bbox.y;
        var preedge;
        var postedge;
        if (cursor.position === 0) {
            preedge = bbox.x;
        }
        else {
            var prebox = this.data[cursor.position - 1].getSVGBBox();
            preedge = prebox.x + prebox.width;
        }
        if (cursor.position === this.data.length) {
            postedge = bbox.x + bbox.width;
        }
        else {
            var postbox = this.data[cursor.position].getSVGBBox();
            postedge = postbox.x;
        }
        var x = (postedge + preedge) / 2;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawAt(svgelem, x, y, height);
    };
    MRowMixin.prototype.drawCursorHighlight = function (cursor) {
        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        if (cursor.selectionStart.node !== this) {
            var cur = cursor.selectionStart.node;
            var success = false;
            while (cur) {
                if (cur.parent === this) {
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
        var pos2bb = this.data[pos2 - 1].getSVGBBox();
        var x2 = pos2bb.x + pos2bb.width;
        var width = x2 - x1;
        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawHighlightAt(svgelem, x1, bb.y, width, bb.height);
    };
    return MRowMixin;
}(MBaseMixin));
var MsMixin = (function (_super) {
    __extends(MsMixin, _super);
    function MsMixin() {
        _super.apply(this, arguments);
    }
    MsMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MsMixin;
}(MBaseMixin));
var MSpaceMixin = (function (_super) {
    __extends(MSpaceMixin, _super);
    function MSpaceMixin() {
        _super.apply(this, arguments);
    }
    MSpaceMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var values = this.getValues("height", "depth", "width");
        values.mathbackground = this.mathbackground;
        if (this.background && !this.mathbackground) {
            values.mathbackground = this.background;
        }
        var svg = new BBOX();
        this.SVGgetScale(svg);
        var scale = this.mscale, mu = this.SVGgetMu(svg);
        svg.h = Util.length2em(values.height, mu) * scale;
        svg.d = Util.length2em(values.depth, mu) * scale;
        svg.w = svg.r = Util.length2em(values.width, mu) * scale;
        if (svg.w < 0) {
            svg.x = svg.w;
            svg.w = svg.r = 0;
        }
        if (svg.h < -svg.d) {
            svg.d = -svg.h;
        }
        svg.l = 0;
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    return MSpaceMixin;
}(MBaseMixin));
var BBOX_NULL = (function (_super) {
    __extends(BBOX_NULL, _super);
    function BBOX_NULL() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        _super.call(this);
        this.Clean();
    }
    return BBOX_NULL;
}(BBOX));
var MStyleMixin = (function (_super) {
    __extends(MStyleMixin, _super);
    function MStyleMixin() {
        _super.apply(this, arguments);
    }
    MStyleMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX();
        if (this.data[0] != null) {
            this.SVGhandleSpace(svg);
            var math = svg.Add(this.data[0].toSVG());
            svg.Clean();
            if (math.ic) {
                svg.ic = math.ic;
            }
            this.SVGhandleColor(svg);
        }
        this.SVGsaveData(svg);
        return svg;
    };
    MStyleMixin.prototype.SVGstretchH = function (w) {
        return (this.data[0] != null ? this.data[0].SVGstretchH(w) : new BBOX_NULL());
    };
    MStyleMixin.prototype.SVGstretchV = function (h, d) {
        return (this.data[0] != null ? this.data[0].SVGstretchV(h, d) : new BBOX_NULL());
    };
    return MStyleMixin;
}(MBaseMixin));
var MSubSupMixin = (function (_super) {
    __extends(MSubSupMixin, _super);
    function MSubSupMixin() {
        _super.apply(this, arguments);
        this.endingPos = 1;
    }
    MSubSupMixin.prototype.isCursorable = function () { return true; };
    MSubSupMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX(), scale = this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        var mu = this.SVGgetMu(svg);
        var base = svg.Add(this.EditableSVGdataStretched(this.base, HW, D));
        var sscale = (this.data[this.sup] || this.data[this.sub] || this).SVGgetScale();
        var x_height = Util.TeX.x_height * scale, s = Util.TeX.scriptspace * scale;
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
        var q = Util.TeX.sup_drop * sscale, r = Util.TeX.sub_drop * sscale;
        var u = base.h + (base.y || 0) - q, v = base.d - (base.y || 0) + r, delta = 0, p;
        if (base.ic) {
            base.w -= base.ic;
            delta = 1.3 * base.ic + .05;
        }
        if (this.data[this.base] &&
            (this.data[this.base].type === "mi" || this.data[this.base].type === "mo")) {
            if (this.data[this.base].data.join("").length === 1 && base.scale === 1 &&
                !base.stretched && !this.data[this.base].Get("largeop")) {
                u = v = 0;
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
        }
        else {
            if (!sub) {
                var values = this.getValues("displaystyle", "texprimestyle");
                p = Util.TeX[(values.displaystyle ? "sup1" : (values.texprimestyle ? "sup3" : "sup2"))];
                u = Math.max(u, p * scale, sup.d + (1 / 4) * x_height, min.superscriptshift);
                svg.Add(sup, x + delta, u);
                this.data[this.sup].EditableSVGdata.dx = delta;
                this.data[this.sup].EditableSVGdata.dy = u;
            }
            else {
                v = Math.max(v, Util.TeX.sub2 * scale);
                var t = Util.TeX.rule_thickness * scale;
                if ((u - sup.d) - (sub.h - v) < 3 * t) {
                    v = 3 * t - u + sup.d + sub.h;
                    q = (4 / 5) * x_height - (u - sup.d);
                    if (q > 0) {
                        u += q;
                        v -= q;
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
    };
    MSubSupMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        var direction = Util.getCursorValue(direction);
        var dest;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
            dest = this.data[this.base];
            if (dest.isCursorable()) {
                return dest.moveCursorFromParent(cursor, direction);
            }
            cursor.position = {
                section: this.base,
                pos: direction === Direction.LEFT ? 1 : 0,
            };
        }
        else if (direction === Direction.UP || direction === Direction.DOWN) {
            var small = direction === Direction.UP ? this.sub : this.sup;
            var baseBB = this.data[this.base].getSVGBBox();
            if (!baseBB || !cursor.renderedPosition) {
                cursor.position = {
                    section: this.data[small] ? small : this.base,
                    pos: 0,
                };
            }
            else if (cursor.renderedPosition.x > baseBB.x + baseBB.width && this.data[small]) {
                if (this.data[small].isCursorable()) {
                    return this.data[small].moveCursorFromParent(cursor, direction);
                }
                var bb = this.data[small].getSVGBBox();
                cursor.position = {
                    section: small,
                    pos: cursor.renderedPosition.x > bb.x + bb.width / 2 ? 1 : 0,
                };
            }
            else {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, direction);
                }
                cursor.position = {
                    section: this.base,
                    pos: cursor.renderedPosition.x > baseBB.x + baseBB.width / 2 ? 1 : 0,
                };
            }
        }
        cursor.moveTo(this, cursor.position);
        return true;
    };
    MSubSupMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        direction = Util.getCursorValue(direction);
        var section, pos;
        var childIdx;
        for (childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx])
                break;
        }
        if (childIdx === this.data.length)
            throw new Error('Unable to find specified child in children');
        var currentSection = childIdx;
        var old = [cursor.node, cursor.position];
        cursor.moveTo(this, {
            section: currentSection,
            pos: direction === Direction.RIGHT ? 1 : 0,
        });
        if (!this.moveCursor(cursor, direction)) {
            cursor.moveTo.apply(cursor, old);
            return false;
        }
        return true;
    };
    MSubSupMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        var base = this.data[0];
        var baseBB = base.getSVGBBox();
        var sub = this.data[this.sub];
        var subBB = sub && sub.getSVGBBox();
        var sup = this.data[this.sup];
        var supBB = sup && sup.getSVGBBox();
        var section;
        var pos;
        if (subBB && Util.boxContains(subBB, x, y)) {
            if (sub.isCursorable()) {
                return sub.moveCursorFromClick(cursor, x, y);
            }
            section = this.sub;
            var midpoint = subBB.x + (subBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else if (supBB && Util.boxContains(supBB, x, y)) {
            if (sup.isCursorable()) {
                return sup.moveCursorFromClick(cursor, x, y);
            }
            section = this.sup;
            var midpoint = supBB.x + (supBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else {
            if (base.isCursorable()) {
                return base.moveCursorFromClick(cursor, x, y);
            }
            section = this.base;
            var midpoint = baseBB.x + (baseBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        cursor.moveTo(this, {
            section: section,
            pos: pos,
        });
    };
    MSubSupMixin.prototype.moveCursor = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        var sup = this.data[this.sup];
        var sub = this.data[this.sub];
        if (cursor.position.section === this.base) {
            if (direction === Direction.UP) {
                if (sup) {
                    if (sup.isCursorable()) {
                        return sup.moveCursorFromParent(cursor, direction);
                    }
                    cursor.position = {
                        section: this.sup,
                        pos: 0,
                    };
                }
                else {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
            }
            else if (direction === Direction.DOWN) {
                if (sub) {
                    if (sub.isCursorable()) {
                        return sub.moveCursorFromParent(cursor, direction);
                    }
                    cursor.position = {
                        section: this.sub,
                        pos: 0,
                    };
                }
                else {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
            }
            else {
                if (direction === Direction.LEFT && cursor.position.pos === 0 || direction === Direction.RIGHT && cursor.position.pos === 1) {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
                cursor.position.pos = cursor.position.pos ? 0 : 1;
            }
        }
        else {
            var vertical = direction === Direction.UP || direction === Direction.DOWN;
            var movingInVertically = vertical && (direction === Direction.UP) === (cursor.position.section === this.sub);
            var movingInHorizontally = cursor.position.pos === 0 && direction === Direction.LEFT;
            var moveRightHorizontally = cursor.position.pos === 1 && direction === Direction.RIGHT;
            var movingAway = vertical ? !movingInVertically : !this.rightMoveStay && moveRightHorizontally;
            var movingIn = movingInVertically || movingInHorizontally || moveRightHorizontally && this.rightMoveStay;
            if (movingAway) {
                return this.parent.moveCursorFromChild(cursor, direction, this);
            }
            else if (movingIn) {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, cursor.position.section === this.sub ? Direction.UP : Direction.DOWN);
                }
                cursor.position = {
                    section: this.base,
                    pos: moveRightHorizontally ? 1 : this.endingPos || 0,
                };
            }
            else {
                cursor.position.pos = cursor.position.pos ? 0 : 1;
            }
        }
        cursor.moveTo(this, cursor.position);
        return true;
    };
    MSubSupMixin.prototype.drawCursor = function (cursor) {
        var bb;
        var x, y, height;
        if (cursor.position.section === this.base) {
            bb = this.data[this.base].getSVGBBox();
            var mainBB = this.getSVGBBox();
            y = mainBB.y;
            height = mainBB.height;
        }
        else {
            bb = this.data[cursor.position.section].getSVGBBox();
            y = bb.y;
            height = bb.height;
        }
        x = cursor.position.pos === 0 ? bb.x : bb.x + bb.width;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        return cursor.drawAt(svgelem, x, y, height);
    };
    return MSubSupMixin;
}(MBaseMixin));
var MTableMixin = (function (_super) {
    __extends(MTableMixin, _super);
    function MTableMixin() {
        _super.apply(this, arguments);
    }
    MTableMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX_G();
        var scale = this.SVGgetScale(svg);
        if (this.data.length === 0) {
            this.SVGsaveData(svg);
            return svg;
        }
        var values = this.getValues("columnalign", "rowalign", "columnspacing", "rowspacing", "columnwidth", "equalcolumns", "equalrows", "columnlines", "rowlines", "frame", "framespacing", "align", "useHeight", "width", "side", "minlabelspacing");
        if (values.width.match(/%$/)) {
            svg.width = values.width = Util.Em((Util.cwidth / 1000) * (parseFloat(values.width) / 100));
        }
        var mu = this.SVGgetMu(svg);
        var LABEL = -1;
        var H = [], D = [], W = [], A = [], C = [], i, j, J = -1, m, M, s, row, cell, mo, HD;
        var LH = MathJax.OutputJax.EditableSVG.FONTDATA.lineH * scale * values.useHeight, LD = MathJax.OutputJax.EditableSVG.FONTDATA.lineD * scale * values.useHeight;
        for (i = 0, m = this.data.length; i < m; i++) {
            row = this.data[i];
            s = (row.type === "mlabeledtr" ? LABEL : 0);
            A[i] = [];
            H[i] = LH;
            D[i] = LD;
            for (j = s, M = row.data.length + s; j < M; j++) {
                if (W[j] == null) {
                    if (j > J) {
                        J = j;
                    }
                    C[j] = new BBOX_G();
                    W[j] = -Util.BIGDIMEN;
                }
                cell = row.data[j - s];
                A[i][j] = cell.toSVG();
                if (cell.isEmbellished()) {
                    mo = cell.CoreMO();
                    var min = mo.Get("minsize", true);
                    if (min) {
                        if (mo.SVGcanStretch("Vertical")) {
                            HD = mo.EditableSVGdata.h + mo.EditableSVGdata.d;
                            if (HD) {
                                min = Util.length2em(min, mu, HD);
                                if (min * mo.EditableSVGdata.h / HD > H[i]) {
                                    H[i] = min * mo.EditableSVGdata.h / HD;
                                }
                                if (min * mo.EditableSVGdata.d / HD > D[i]) {
                                    D[i] = min * mo.EditableSVGdata.d / HD;
                                }
                                n;
                            }
                        }
                        else if (mo.SVGcanStretch("Horizontal")) {
                            min = Util.length2em(min, mu, mo.EditableSVGdata.w);
                            if (min > W[j]) {
                                W[j] = min;
                            }
                        }
                    }
                }
                if (A[i][j].h > H[i]) {
                    H[i] = A[i][j].h;
                }
                if (A[i][j].d > D[i]) {
                    D[i] = A[i][j].d;
                }
                if (A[i][j].w > W[j]) {
                    W[j] = A[i][j].w;
                }
            }
        }
        var SPLIT = MathJax.Hub.SplitList;
        var CSPACE = SPLIT(values.columnspacing), RSPACE = SPLIT(values.rowspacing), CALIGN = SPLIT(values.columnalign), RALIGN = SPLIT(values.rowalign), CLINES = SPLIT(values.columnlines), RLINES = SPLIT(values.rowlines), CWIDTH = SPLIT(values.columnwidth), RCALIGN = [];
        for (i = 0, m = CSPACE.length; i < m; i++) {
            CSPACE[i] = Util.length2em(CSPACE[i], mu);
        }
        for (i = 0, m = RSPACE.length; i < m; i++) {
            RSPACE[i] = Util.length2em(RSPACE[i], mu);
        }
        while (CSPACE.length < J) {
            CSPACE.push(CSPACE[CSPACE.length - 1]);
        }
        while (CALIGN.length <= J) {
            CALIGN.push(CALIGN[CALIGN.length - 1]);
        }
        while (CLINES.length < J) {
            CLINES.push(CLINES[CLINES.length - 1]);
        }
        while (CWIDTH.length <= J) {
            CWIDTH.push(CWIDTH[CWIDTH.length - 1]);
        }
        while (RSPACE.length < A.length) {
            RSPACE.push(RSPACE[RSPACE.length - 1]);
        }
        while (RALIGN.length <= A.length) {
            RALIGN.push(RALIGN[RALIGN.length - 1]);
        }
        while (RLINES.length < A.length) {
            RLINES.push(RLINES[RLINES.length - 1]);
        }
        if (C[LABEL]) {
            CALIGN[LABEL] = (values.side.substr(0, 1) === "l" ? "left" : "right");
            CSPACE[LABEL] = -W[LABEL];
        }
        for (i = 0, m = A.length; i < m; i++) {
            row = this.data[i];
            RCALIGN[i] = [];
            if (row.rowalign) {
                RALIGN[i] = row.rowalign;
            }
            if (row.columnalign) {
                RCALIGN[i] = SPLIT(row.columnalign);
                while (RCALIGN[i].length <= J) {
                    RCALIGN[i].push(RCALIGN[i][RCALIGN[i].length - 1]);
                }
            }
        }
        if (values.equalrows) {
            var Hm = Math.max.apply(Math, H), Dm = Math.max.apply(Math, D);
            for (i = 0, m = A.length; i < m; i++) {
                s = ((Hm + Dm) - (H[i] + D[i])) / 2;
                H[i] += s;
                D[i] += s;
            }
        }
        HD = H[0] + D[A.length - 1];
        for (i = 0, m = A.length - 1; i < m; i++) {
            HD += Math.max(0, D[i] + H[i + 1] + RSPACE[i]);
        }
        var fx = 0, fy = 0, fW, fH = HD;
        if (values.frame !== "none" ||
            (values.columnlines + values.rowlines).match(/solid|dashed/)) {
            var frameSpacing = SPLIT(values.framespacing);
            if (frameSpacing.length != 2) {
                frameSpacing = SPLIT(this.defaults.framespacing);
            }
            fx = Util.length2em(frameSpacing[0], mu);
            fy = Util.length2em(frameSpacing[1], mu);
            fH = HD + 2 * fy;
        }
        var Y, fY, n = "";
        if (typeof (values.align) !== "string") {
            values.align = String(values.align);
        }
        if (values.align.match(/(top|bottom|center|baseline|axis)( +(-?\d+))?/)) {
            n = RegExp.$3 || "";
            values.align = RegExp.$1;
        }
        else {
            values.align = this.defaults.align;
        }
        if (n !== "") {
            n = parseInt(n);
            if (n < 0) {
                n = A.length + 1 + n;
            }
            if (n < 1) {
                n = 1;
            }
            else if (n > A.length) {
                n = A.length;
            }
            Y = 0;
            fY = -(HD + fy) + H[0];
            for (i = 0, m = n - 1; i < m; i++) {
                var dY = Math.max(0, D[i] + H[i + 1] + RSPACE[i]);
                Y += dY;
                fY += dY;
            }
        }
        else {
            Y = ({
                top: -(H[0] + fy),
                bottom: HD + fy - H[0],
                center: HD / 2 - H[0],
                baseline: HD / 2 - H[0],
                axis: HD / 2 + Util.TeX.axis_height * scale - H[0]
            })[values.align];
            fY = ({
                top: -(HD + 2 * fy),
                bottom: 0,
                center: -(HD / 2 + fy),
                baseline: -(HD / 2 + fy),
                axis: Util.TeX.axis_height * scale - HD / 2 - fy
            })[values.align];
        }
        var WW, WP = 0, Wt = 0, Wp = 0, p = 0, f = 0, P = [], F = [], Wf = 1;
        if (values.equalcolumns && values.width !== "auto") {
            WW = Util.length2em(values.width, mu);
            for (i = 0, m = Math.min(J + 1, CSPACE.length); i < m; i++) {
                WW -= CSPACE[i];
            }
            WW /= J + 1;
            for (i = 0, m = Math.min(J + 1, CWIDTH.length); i < m; i++) {
                W[i] = WW;
            }
        }
        else {
            for (i = 0, m = Math.min(J + 1, CWIDTH.length); i < m; i++) {
                if (CWIDTH[i] === "auto") {
                    Wt += W[i];
                }
                else if (CWIDTH[i] === "fit") {
                    F[f] = i;
                    f++;
                    Wt += W[i];
                }
                else if (CWIDTH[i].match(/%$/)) {
                    P[p] = i;
                    p++;
                    Wp += W[i];
                    WP += Util.length2em(CWIDTH[i], mu, 1);
                }
                else {
                    W[i] = Util.length2em(CWIDTH[i], mu);
                    Wt += W[i];
                }
            }
            if (values.width === "auto") {
                if (WP > .98) {
                    Wf = Wp / (Wt + Wp);
                    WW = Wt + Wp;
                }
                else {
                    WW = Wt / (1 - WP);
                }
            }
            else {
                WW = Util.length2em(values.width, mu);
                for (i = 0, m = Math.min(J + 1, CSPACE.length); i < m; i++) {
                    WW -= CSPACE[i];
                }
            }
            for (i = 0, m = P.length; i < m; i++) {
                W[P[i]] = Util.length2em(CWIDTH[P[i]], mu, WW * Wf);
                Wt += W[P[i]];
            }
            if (Math.abs(WW - Wt) > .01) {
                if (f && WW > Wt) {
                    WW = (WW - Wt) / f;
                    for (i = 0, m = F.length; i < m; i++) {
                        W[F[i]] += WW;
                    }
                }
                else {
                    WW = WW / Wt;
                    for (j = 0; j <= J; j++) {
                        W[j] *= WW;
                    }
                }
            }
            if (values.equalcolumns) {
                var Wm = Math.max.apply(Math, W);
                for (j = 0; j <= J; j++) {
                    W[j] = Wm;
                }
            }
        }
        var y = Y, dy, align;
        s = (C[LABEL] ? LABEL : 0);
        for (j = s; j <= J; j++) {
            C[j].w = W[j];
            for (i = 0, m = A.length; i < m; i++) {
                if (A[i][j]) {
                    s = (this.data[i].type === "mlabeledtr" ? LABEL : 0);
                    cell = this.data[i].data[j - s];
                    if (cell.SVGcanStretch("Horizontal")) {
                        A[i][j] = cell.SVGstretchH(W[j]);
                    }
                    else if (cell.SVGcanStretch("Vertical")) {
                        mo = cell.CoreMO();
                        var symmetric = mo.symmetric;
                        mo.symmetric = false;
                        A[i][j] = cell.SVGstretchV(H[i], D[i]);
                        mo.symmetric = symmetric;
                    }
                    align = cell.rowalign || this.data[i].rowalign || RALIGN[i];
                    dy = ({ top: H[i] - A[i][j].h,
                        bottom: A[i][j].d - D[i],
                        center: ((H[i] - D[i]) - (A[i][j].h - A[i][j].d)) / 2,
                        baseline: 0, axis: 0 })[align] || 0;
                    align = (cell.columnalign || RCALIGN[i][j] || CALIGN[j]);
                    C[j].Align(A[i][j], align, 0, y + dy);
                }
                if (i < A.length - 1) {
                    y -= Math.max(0, D[i] + H[i + 1] + RSPACE[i]);
                }
            }
            y = Y;
        }
        var lw = 1.5 * Util.em;
        var x = fx - lw / 2;
        for (j = 0; j <= J; j++) {
            svg.Add(C[j], x, 0);
            x += W[j] + CSPACE[j];
            if (CLINES[j] !== "none" && j < J && j !== LABEL) {
                svg.Add(new BBOX_VLINE(fH, lw, CLINES[j]), x - CSPACE[j] / 2, fY);
            }
        }
        svg.w += fx;
        svg.d = -fY;
        svg.h = fH + fY;
        fW = svg.w;
        if (values.frame !== "none") {
            svg.Add(new BBOX_HLINE(fW, lw, values.frame), 0, fY + fH - lw);
            svg.Add(new BBOX_HLINE(fW, lw, values.frame), 0, fY);
            svg.Add(new BBOX_VLINE(fH, lw, values.frame), 0, fY);
            svg.Add(new BBOX_VLINE(fH, lw, values.frame), fW - lw, fY);
        }
        y = Y - lw / 2;
        for (i = 0, m = A.length - 1; i < m; i++) {
            dy = Math.max(0, D[i] + H[i + 1] + RSPACE[i]);
            if (RLINES[i] !== "none") {
                svg.Add(new BBOX_HLINE(fW, lw, RLINES[i]), 0, y - D[i] - (dy - D[i] - H[i + 1]) / 2);
            }
            y -= dy;
        }
        svg.Clean();
        this.SVGhandleSpace(svg);
        this.SVGhandleColor(svg);
        if (C[LABEL]) {
            svg.tw = Math.max(svg.w, svg.r) - Math.min(0, svg.l);
            var indent = this.getValues("indentalignfirst", "indentshiftfirst", "indentalign", "indentshift");
            if (indent.indentalignfirst !== MathJax.ElementJax.mml.INDENTALIGN.INDENTALIGN) {
                indent.indentalign = indent.indentalignfirst;
            }
            if (indent.indentalign === MathJax.ElementJax.mml.INDENTALIGN.AUTO) {
                indent.indentalign = this.displayAlign;
            }
            if (indent.indentshiftfirst !== MathJax.ElementJax.mml.INDENTSHIFT.INDENTSHIFT) {
                indent.indentshift = indent.indentshiftfirst;
            }
            if (indent.indentshift === "auto" || indent.indentshift === "") {
                indent.indentshift = "0";
            }
            var shift = Util.length2em(indent.indentshift, mu, Util.cwidth);
            var labelshift = Util.length2em(values.minlabelspacing, mu, Util.cwidth);
            if (this.displayIndent !== "0") {
                var dIndent = Util.length2em(this.displayIndent, mu, Util.cwidth);
                shift += (indent.indentAlign === MathJax.ElementJax.mml.INDENTALIGN.RIGHT ? -dIndent : dIndent);
            }
            var eqn = svg;
            svg = new BBOX_SVG();
            svg.w = svg.r = Util.cwidth;
            svg.hasIndent = true;
            svg.Align(C[LABEL], CALIGN[LABEL], labelshift, 0);
            svg.Align(eqn, indent.indentalign, 0, 0, shift);
            svg.tw += C[LABEL].w + shift +
                (indent.indentalign === MathJax.ElementJax.mml.INDENTALIGN.CENTER ? 8 : 4) * labelshift;
        }
        this.SVGsaveData(svg);
        return svg;
    };
    MTableMixin.prototype.SVGhandleSpace = function (svg) {
        if (!this.hasFrame && !svg.width) {
            svg.x = svg.X = 167;
        }
        _super.prototype.SVGhandleSpace.call(this, svg);
    };
    MTableMixin.prototype.isCursorable = function () { return true; };
    MTableMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        if (direction == Direction.RIGHT) {
            var mtr = this.data[0];
            var mtd = mtr.data[0];
            return mtd.data[0].moveCursorFromParent(cursor, direction);
        }
        else if (direction == Direction.LEFT) {
            var mtr = this.data[this.data.length - 1];
            var mtd = mtr.data[mtr.data.length - 1];
            return mtd.data[0].moveCursorFromParent(cursor, direction);
        }
        else {
            console.log("TODO: unimplemented direction for moveCursorFromParent in mtable_mixin.ts");
        }
    };
    MTableMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        console.log("moveCursorFromChild called!");
    };
    MTableMixin.prototype.moveCursorFromClick = function (cursor, x, y, clientX, clientY) {
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
    };
    MTableMixin.prototype.moveCursor = function (cursor, direction) {
        console.log("moveCursor called!");
    };
    MTableMixin.prototype.drawCursor = function (cursor) {
        console.log("drawCursor called!");
    };
    MTableMixin.prototype.drawCursorHighlight = function (cursor) {
        console.log('drawCursorHighlight called!');
    };
    MTableMixin.prototype.addRow = function () {
        var MML = MathJax.ElementJax.mml;
        var numCols = this.data[0].data.length;
        var newRow = new MML.mtr();
        for (var i = 0; i < numCols; i++) {
            var mtd = new MML.mtd();
            mtd.SetData(0, new MML.hole());
            newRow.SetData(i, mtd);
        }
        this.SetData(this.data.length, newRow);
    };
    MTableMixin.prototype.addColumn = function () {
        var MML = MathJax.ElementJax.mml;
        for (var i = 0; i < this.data.length; i++) {
            var mtd = new MML.mtd();
            mtd.SetData(0, new MML.hole());
            this.data[i].SetData(this.data[i].data.length, mtd);
        }
    };
    return MTableMixin;
}(MBaseMixin));
var MTableRowMixin = (function (_super) {
    __extends(MTableRowMixin, _super);
    function MTableRowMixin() {
        _super.apply(this, arguments);
    }
    MTableRowMixin.prototype.isCursorable = function () { return true; };
    MTableRowMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        console.log("mtr moveCursorFromChild called!");
    };
    return MTableRowMixin;
}(MBaseMixin));
var MTableCellMixin = (function (_super) {
    __extends(MTableCellMixin, _super);
    function MTableCellMixin() {
        _super.apply(this, arguments);
    }
    MTableCellMixin.prototype.isCursorable = function () { return true; };
    MTableCellMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        var row = this.parent;
        var mtable = this.parent.parent;
        var colIndex = row.data.indexOf(this);
        var rowIndex = mtable.data.indexOf(row);
        var w = row.data.length;
        var h = mtable.data.length;
        if (direction == Direction.RIGHT) {
            if (colIndex == w - 1) {
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            }
            else {
                var neighborMtd = row.data[colIndex + 1];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        }
        else if (direction == Direction.LEFT) {
            if (colIndex == 0) {
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            }
            else {
                var neighborMtd = row.data[colIndex - 1];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        }
        else if (direction == Direction.DOWN) {
            if (rowIndex == h - 1) {
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            }
            else {
                var neighborRow = mtable.data[rowIndex + 1];
                var neighborMtd = neighborRow.data[colIndex];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        }
        else if (direction == Direction.UP) {
            if (rowIndex == 0) {
                mtable.parent.moveCursorFromChild(cursor, direction, mtable);
            }
            else {
                var neighborRow = mtable.data[rowIndex - 1];
                var neighborMtd = neighborRow.data[colIndex];
                neighborMtd.moveCursorFromParent(cursor, direction);
            }
        }
    };
    MTableCellMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        this.data[0].moveCursorFromParent(cursor, direction);
    };
    return MTableCellMixin;
}(MBaseMixin));
var MTextMixin = (function (_super) {
    __extends(MTextMixin, _super);
    function MTextMixin() {
        _super.apply(this, arguments);
    }
    MTextMixin.prototype.toSVG = function () {
        if (MathJax.OutputJax.EditableSVG.config.mtextFontInherit || this.Parent().type === "merror") {
            this.SVGgetStyles();
            var svg = new BBOX();
            var scale = this.SVGgetScale(svg);
            this.SVGhandleSpace(svg);
            var variant = this.SVGgetVariant();
            var def = { direction: this.Get("dir") };
            if (variant.bold) {
                def["font-weight"] = "bold";
            }
            if (variant.italic) {
                def["font-style"] = "italic";
            }
            variant = this.Get("mathvariant");
            if (variant === "monospace") {
                def["class"] = "MJX-monospace";
            }
            else if (variant.match(/sans-serif/)) {
                def["class"] = "MJX-sans-serif";
            }
            svg.Add(new BBOX_TEXT(scale * 100 / MathJax.OutputJax.EditableSVG.config.scale, this.data.join(""), def));
            svg.Clean();
            this.SVGhandleColor(svg);
            this.SVGsaveData(svg);
            return svg;
        }
        else {
            return _super.prototype.toSVG.call(this);
        }
    };
    return MTextMixin;
}(MBaseMixin));
var MUnderOverMixin = (function (_super) {
    __extends(MUnderOverMixin, _super);
    function MUnderOverMixin() {
        _super.apply(this, arguments);
        this.endingPos = 0;
        this.rightMoveStay = true;
    }
    MUnderOverMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var values = this.getValues("displaystyle", "accent", "accentunder", "align");
        if (!values.displaystyle && this.data[this.base] != null &&
            this.data[this.base].CoreMO().Get("movablelimits")) {
            return MathJax.ElementJax.mml.msubsup.prototype.toSVG.call(this);
        }
        var svg = new BBOX();
        var scale = this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        var boxes = [], stretch = [], box, i, m, W = -Util.BIGDIMEN, WW = W;
        for (i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i] != null) {
                if (i == this.base) {
                    boxes[i] = this.EditableSVGdataStretched(i, HW, D);
                    stretch[i] = (D != null || HW == null) && this.data[i].SVGcanStretch("Horizontal");
                }
                else {
                    boxes[i] = this.data[i].toSVG();
                    boxes[i].x = 0;
                    delete boxes[i].X;
                    stretch[i] = this.data[i].SVGcanStretch("Horizontal");
                }
                if (boxes[i].w > WW) {
                    WW = boxes[i].w;
                }
                if (!stretch[i] && WW > W) {
                    W = WW;
                }
            }
        }
        if (D == null && HW != null) {
            W = HW;
        }
        else if (W == -Util.BIGDIMEN) {
            W = WW;
        }
        for (i = WW = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                if (stretch[i]) {
                    boxes[i] = this.data[i].SVGstretchH(W);
                    if (i !== this.base) {
                        boxes[i].x = 0;
                        delete boxes[i].X;
                    }
                }
                if (boxes[i].w > WW) {
                    WW = boxes[i].w;
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
            delta = 1.3 * base.ic + .05;
        }
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
                                svg.skew += (WW - box.w - x) / 2;
                            }
                        }
                    }
                    else {
                        z1 = Util.TeX.big_op_spacing1 * scale;
                        z2 = Util.TeX.big_op_spacing3 * scale;
                        k = Math.max(z1, z2 - Math.max(0, box.d));
                    }
                    k = Math.max(k, 1500 / Util.em);
                    x += delta / 2;
                    y = base.y + base.h + box.d + k;
                    box.h += z3;
                    if (box.h > box.H) {
                        box.H = box.h;
                    }
                }
                else if (i == this.under) {
                    if (accent) {
                        k = 3 * t * scale;
                        z3 = 0;
                    }
                    else {
                        z1 = Util.TeX.big_op_spacing2 * scale;
                        z2 = Util.TeX.big_op_spacing4 * scale;
                        k = Math.max(z1, z2 - box.h);
                    }
                    k = Math.max(k, 1500 / Util.em);
                    x -= delta / 2;
                    y = base.y - (base.d + box.h + k);
                    box.d += z3;
                    if (box.d > box.D) {
                        box.D = box.d;
                    }
                }
                svg.Add(box, x, y);
            }
        }
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    MUnderOverMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        var direction = Util.getCursorValue(direction);
        var dest;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
            dest = this.data[this.base];
            if (dest.isCursorable()) {
                return dest.moveCursorFromParent(cursor, direction);
            }
            cursor.position = {
                section: this.base,
                pos: direction === Direction.LEFT ? 1 : 0,
            };
        }
        else if (direction === Direction.UP || direction === Direction.DOWN) {
            var small = direction === Direction.UP ? this.sub : this.sup;
            var baseBB = this.data[this.base].getSVGBBox();
            if (!baseBB || !cursor.renderedPosition) {
                cursor.position = {
                    section: this.data[small] ? small : this.base,
                    pos: 0,
                };
            }
            else if (cursor.renderedPosition.x > baseBB.x + baseBB.width && this.data[small]) {
                if (this.data[small].isCursorable()) {
                    return this.data[small].moveCursorFromParent(cursor, direction);
                }
                var bb = this.data[small].getSVGBBox();
                cursor.position = {
                    section: small,
                    pos: cursor.renderedPosition.x > bb.x + bb.width / 2 ? 1 : 0,
                };
            }
            else {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, direction);
                }
                cursor.position = {
                    section: this.base,
                    pos: cursor.renderedPosition.x > baseBB.x + baseBB.width / 2 ? 1 : 0,
                };
            }
        }
        cursor.moveTo(this, cursor.position);
        return true;
    };
    MUnderOverMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        direction = Util.getCursorValue(direction);
        var section, pos;
        var childIdx;
        for (childIdx = 0; childIdx < this.data.length; ++childIdx) {
            if (child === this.data[childIdx])
                break;
        }
        if (childIdx === this.data.length)
            throw new Error('Unable to find specified child in children');
        var currentSection = childIdx;
        var old = [cursor.node, cursor.position];
        cursor.moveTo(this, {
            section: currentSection,
            pos: direction === Direction.RIGHT ? 1 : 0,
        });
        if (!this.moveCursor(cursor, direction)) {
            cursor.moveTo.apply(cursor, old);
            return false;
        }
        return true;
    };
    MUnderOverMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        var base = this.data[0];
        var baseBB = base.getSVGBBox();
        var sub = this.data[this.sub];
        var subBB = sub && sub.getSVGBBox();
        var sup = this.data[this.sup];
        var supBB = sup && sup.getSVGBBox();
        var section;
        var pos;
        if (subBB && Util.boxContains(subBB, x, y)) {
            if (sub.isCursorable()) {
                return sub.moveCursorFromClick(cursor, x, y);
            }
            section = this.sub;
            var midpoint = subBB.x + (subBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else if (supBB && Util.boxContains(supBB, x, y)) {
            if (sup.isCursorable()) {
                return sup.moveCursorFromClick(cursor, x, y);
            }
            section = this.sup;
            var midpoint = supBB.x + (supBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else {
            if (base.isCursorable()) {
                return base.moveCursorFromClick(cursor, x, y);
            }
            section = this.base;
            var midpoint = baseBB.x + (baseBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        cursor.moveTo(this, {
            section: section,
            pos: pos,
        });
    };
    MUnderOverMixin.prototype.moveCursor = function (cursor, direction) {
        direction = Util.getCursorValue(direction);
        var sup = this.data[this.sup];
        var sub = this.data[this.sub];
        if (cursor.position.section === this.base) {
            if (direction === Direction.UP) {
                if (sup) {
                    if (sup.isCursorable()) {
                        return sup.moveCursorFromParent(cursor, direction);
                    }
                    cursor.position = {
                        section: this.sup,
                        pos: 0,
                    };
                }
                else {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
            }
            else if (direction === Direction.DOWN) {
                if (sub) {
                    if (sub.isCursorable()) {
                        return sub.moveCursorFromParent(cursor, direction);
                    }
                    cursor.position = {
                        section: this.sub,
                        pos: 0,
                    };
                }
                else {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
            }
            else {
                if (direction === Direction.LEFT && cursor.position.pos === 0 || direction === Direction.RIGHT && cursor.position.pos === 1) {
                    return this.parent.moveCursorFromChild(cursor, direction, this);
                }
                cursor.position.pos = cursor.position.pos ? 0 : 1;
            }
        }
        else {
            var vertical = direction === Direction.UP || direction === Direction.DOWN;
            var movingInVertically = vertical && (direction === Direction.UP) === (cursor.position.section === this.sub);
            var movingInHorizontally = cursor.position.pos === 0 && direction === Direction.LEFT;
            var moveRightHorizontally = cursor.position.pos === 1 && direction === Direction.RIGHT;
            var movingAway = vertical ? !movingInVertically : !this.rightMoveStay && moveRightHorizontally;
            var movingIn = movingInVertically || movingInHorizontally || moveRightHorizontally && this.rightMoveStay;
            if (movingAway) {
                return this.parent.moveCursorFromChild(cursor, direction, this);
            }
            else if (movingIn) {
                if (this.data[this.base].isCursorable()) {
                    return this.data[this.base].moveCursorFromParent(cursor, cursor.position.section === this.sub ? Direction.UP : Direction.DOWN);
                }
                cursor.position = {
                    section: this.base,
                    pos: moveRightHorizontally ? 1 : this.endingPos || 0,
                };
            }
            else {
                cursor.position.pos = cursor.position.pos ? 0 : 1;
            }
        }
        cursor.moveTo(this, cursor.position);
        return true;
    };
    MUnderOverMixin.prototype.drawCursor = function (cursor) {
        var bb;
        var x, y, height;
        if (cursor.position.section === this.base) {
            bb = this.data[this.base].getSVGBBox();
            var mainBB = this.getSVGBBox();
            y = mainBB.y;
            height = mainBB.height;
        }
        else {
            bb = this.data[cursor.position.section].getSVGBBox();
            y = bb.y;
            height = bb.height;
        }
        x = cursor.position.pos === 0 ? bb.x : bb.x + bb.width;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        return cursor.drawAt(svgelem, x, y, height);
    };
    return MUnderOverMixin;
}(MBaseMixin));
var SemanticsMixin = (function (_super) {
    __extends(SemanticsMixin, _super);
    function SemanticsMixin() {
        _super.apply(this, arguments);
    }
    SemanticsMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX();
        if (this.data[0] != null) {
            this.SVGhandleSpace(svg);
            svg.Add(this.data[0].toSVG());
            svg.Clean();
        }
        else {
            svg.Clean();
        }
        this.SVGsaveData(svg);
        return svg;
    };
    SemanticsMixin.prototype.SVGstretchH = function (w) {
        return (this.data[0] != null ? this.data[0].SVGstretchH(w) : new BBOX_NULL());
    };
    SemanticsMixin.prototype.SVGstretchV = function (h, d) {
        return (this.data[0] != null ? this.data[0].SVGstretchV(h, d) : new BBOX_NULL());
    };
    return SemanticsMixin;
}(MBaseMixin));
var TeXAtomMixin = (function (_super) {
    __extends(TeXAtomMixin, _super);
    function TeXAtomMixin() {
        _super.apply(this, arguments);
    }
    TeXAtomMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new BBOX();
        this.SVGhandleSpace(svg);
        if (this.data[0] != null) {
            var box = this.EditableSVGdataStretched(0, HW, D), y = 0;
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
    };
    TeXAtomMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        return this.data[0].moveCursorFromParent(cursor, direction);
    };
    TeXAtomMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        return this.parent.moveCursorFromChild(cursor, direction, this);
    };
    TeXAtomMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        return this.data[0].moveCursorFromClick(cursor, x, y);
    };
    TeXAtomMixin.prototype.moveCursor = function (cursor, direction) {
        return this.parent.moveCursorFromChild(cursor, direction, this);
    };
    TeXAtomMixin.prototype.drawCursor = function (cursor) {
        console.error('TeXAtom drawCursor NOT IMPLEMENTED');
    };
    TeXAtomMixin.cursorable = true;
    return TeXAtomMixin;
}(MBaseMixin));
var BBOX_FRAME = (function (_super) {
    __extends(BBOX_FRAME, _super);
    function BBOX_FRAME(h, d, w, t, dash, color, svg, hub, def) {
        if (def == null) {
            def = {};
        }
        ;
        def.fill = "none";
        def["stroke-width"] = Util.Fixed(t, 2);
        def.width = Math.floor(w - t);
        def.height = Math.floor(h + d - t);
        def.transform = "translate(" + Math.floor(t / 2) + "," + Math.floor(-d + t / 2) + ")";
        if (dash === "dashed") {
            def["stroke-dasharray"] = [Math.floor(6 * Util.em), Math.floor(6 * Util.em)].join(" ");
        }
        _super.call(this, def, "rect");
        this.removeable = false;
        this.w = this.r = w;
        this.h = this.H = h;
        this.d = this.D = d;
        this.l = 0;
    }
    return BBOX_FRAME;
}(BBOX));
var BBOX_HLINE = (function (_super) {
    __extends(BBOX_HLINE, _super);
    function BBOX_HLINE(w, t, dash, color, def) {
        if (def == null) {
            def = {
                "stroke-linecap": "square"
            };
        }
        if (color && color !== "")
            def.stroke = color;
        def["stroke-width"] = Util.Fixed(t, 2);
        def.x1 = def.y1 = def.y2 = Math.floor(t / 2);
        def.x2 = Math.floor(w - t / 2);
        if (dash === "dashed") {
            var n = Math.floor(Math.max(0, w - t) / (6 * t)), m = Math.floor(Math.max(0, w - t) / (2 * n + 1));
            def["stroke-dasharray"] = m + " " + m;
        }
        if (dash === "dotted") {
            def["stroke-dasharray"] = [1, Math.max(150, Math.floor(2 * t))].join(" ");
            def["stroke-linecap"] = "round";
        }
        _super.call(this, def, "line");
        this.removeable = false;
        this.w = this.r = w;
        this.l = 0;
        this.h = this.H = t;
        this.d = this.D = 0;
    }
    return BBOX_HLINE;
}(BBOX));
var BBOX_NONREMOVABLE = (function (_super) {
    __extends(BBOX_NONREMOVABLE, _super);
    function BBOX_NONREMOVABLE() {
        _super.apply(this, arguments);
    }
    return BBOX_NONREMOVABLE;
}(BBOX_G));
var BBOX_VLINE = (function (_super) {
    __extends(BBOX_VLINE, _super);
    function BBOX_VLINE(h, t, dash, color, def) {
        if (def == null) {
            def = {
                "stroke-linecap": "square"
            };
        }
        if (color && color !== "") {
            def.stroke = color;
        }
        def["stroke-width"] = Util.Fixed(t, 2);
        def.x1 = def.x2 = def.y1 = Math.floor(t / 2);
        def.y2 = Math.floor(h - t / 2);
        if (dash === "dashed") {
            var n = Math.floor(Math.max(0, h - t) / (6 * t)), m = Math.floor(Math.max(0, h - t) / (2 * n + 1));
            def["stroke-dasharray"] = m + " " + m;
        }
        if (dash === "dotted") {
            def["stroke-dasharray"] = [1, Math.max(150, Math.floor(2 * t))].join(" ");
            def["stroke-linecap"] = "round";
        }
        _super.call(this, def, "line");
        this.removeable = false;
        this.w = this.r = t;
        this.l = 0;
        this.h = this.H = h;
        this.d = this.D = 0;
    }
    return BBOX_VLINE;
}(BBOX));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJqYXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBEaXJlY3Rpb247XG4oZnVuY3Rpb24gKERpcmVjdGlvbikge1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJVUFwiXSA9IDBdID0gXCJVUFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJSSUdIVFwiXSA9IDFdID0gXCJSSUdIVFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJET1dOXCJdID0gMl0gPSBcIkRPV05cIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiTEVGVFwiXSA9IDNdID0gXCJMRUZUXCI7XG59KShEaXJlY3Rpb24gfHwgKERpcmVjdGlvbiA9IHt9KSk7XG52YXIgQ3Vyc29yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDdXJzb3IoY29sb3IsIGlzT3RoZXJDdXJzb3IpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLmNvbG9yID0gY29sb3IgfHwgJyM3Nzc3NzcnO1xuICAgICAgICB0aGlzLmlzT3RoZXJDdXJzb3IgPSBpc090aGVyQ3Vyc29yO1xuICAgICAgICB0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIpO1xuICAgICAgICB0aGlzLndpZHRoID0gNTA7XG4gICAgfVxuICAgIEN1cnNvci5wcm90b3R5cGUucmVmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUgfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtIHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQgfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgcGFyZW50LmZvY3VzKCk7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG9DbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICB2YXIgc3ZnID0gdGFyZ2V0Lm5vZGVOYW1lID09PSAnc3ZnJyA/IHRhcmdldCA6IHRhcmdldC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY3AgPSBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyhzdmcsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICB2YXIgamF4ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuZ2V0SmF4RnJvbU1hdGgoc3ZnLnBhcmVudE5vZGUpO1xuICAgICAgICB2YXIgY3VycmVudCA9IGpheC5yb290O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoZWRJdGVtcyA9IGN1cnJlbnQuZGF0YS5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBVdGlsLm5vZGVDb250YWluc1NjcmVlblBvaW50KG5vZGUsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIdWg/IG1hdGNoZWQgbW9yZSB0aGFuIG9uZSBjaGlsZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBtYXRjaGVkSXRlbXNbMF07XG4gICAgICAgICAgICBpZiAobWF0Y2hlZC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBtYXRjaGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKHRoaXMsIGNwLngsIGNwLnksIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG8gPSBmdW5jdGlvbiAobm9kZSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIICYmICFub2RlLmJhY2tzbGFzaFJvdylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuaXNPdGhlckN1cnNvcilcbiAgICAgICAgICAgIHRoaXMuc2lnbmFsQ3Vyc29yTW92ZW1lbnQoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUudXBkYXRlU2VsZWN0aW9uID0gZnVuY3Rpb24gKHNoaWZ0S2V5KSB7XG4gICAgICAgIGlmIChzaGlmdEtleSAmJiB0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmIChzaGlmdEtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKGRpcmVjdGlvbiwgc2hpZnRLZXkpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm5vZGUubW92ZUN1cnNvcih0aGlzLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRyYXdDdXJzb3IodGhpcyk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICB2YXIgZGlyZWN0aW9uO1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrc3BhY2UoZXZlbnQsIHJlY2FsbCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoZGlyZWN0aW9uLCBldmVudC5zaGlmdEtleSk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm1vdmVUb0NsaWNrKGV2ZW50KTtcbiAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VIb2xlSWZOZWVkZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByb3dpbmRleCA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50LlNldERhdGEocm93aW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgaG9sZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5leGl0QmFja3NsYXNoTW9kZSA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdmFyIHBwb3MgPSB0aGlzLm5vZGUucGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuZGF0YS5zcGxpY2UocHBvcywgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMubm9kZS5wYXJlbnQuZGF0YTtcbiAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwbGFjZS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICBhcnIucHVzaChudWxsKTtcbiAgICAgICAgICAgIGRhdGEuc3BsaWNlLmFwcGx5KGRhdGEsIFtwcG9zLCAxXS5jb25jYXQoYXJyKSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LlNldERhdGEocHBvcyArIGksIHJlcGxhY2VbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUby5hcHBseSh0aGlzLCByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUucGFyZW50LCBwcG9zICsgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuYmFja3NwYWNlID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZS50eXBlID09PSAnbXJvdycgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUgPT09IHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUuZGF0YS5zcGxpY2UocG9zMSwgcG9zMiAtIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHRoaXMubm9kZSwgcG9zMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkbyB0aGlzIGJhY2tzcGFjZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICBpZiAoIXByZXYuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgdGhpcy5ub2RlLmRhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24gLSAxLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSAxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvbiAtIDFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdob2xlJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JhY2tzcGFjZSBvbiBob2xlIScpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNbyA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtbyA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbW8uQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtbztcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZUVudGl0eU1pID0gZnVuY3Rpb24gKHVuaWNvZGUpIHtcbiAgICAgICAgdmFyIG1pID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkoKTtcbiAgICAgICAgdmFyIGVudGl0eSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgpO1xuICAgICAgICBlbnRpdHkuQXBwZW5kKHVuaWNvZGUpO1xuICAgICAgICBtaS5BcHBlbmQoZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIG1pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jcmVhdGVBbmRNb3ZlSW50b0hvbGUgPSBmdW5jdGlvbiAobXN1YnN1cCwgaW5kZXgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NSRUFUSU5HIEhPTEUnKTtcbiAgICAgICAgdmFyIGhvbGUgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgIG1zdWJzdXAuU2V0RGF0YShpbmRleCwgaG9sZSk7XG4gICAgICAgIHRoaXMubW92ZVRvKGhvbGUsIDApO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oYW5kbGVTdXBlck9yU3Vic2NyaXB0ID0gZnVuY3Rpb24gKHJlY2FsbCwgYykge1xuICAgICAgICBpZiAodGhpcy5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICB2YXIgaW5kZXggPSAoYyA9PT0gXCJfXCIpID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3ViIDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3VwO1xuICAgICAgICBpZiAocHJldi50eXBlID09PSBcIm1zdWJzdXBcIiB8fCBwcmV2LnR5cGUgPT09IFwibXVuZGVyb3ZlclwiKSB7XG4gICAgICAgICAgICBpZiAocHJldi5kYXRhW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIHZhciB0aGluZyA9IHByZXYuZGF0YVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaW5nLm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMsIERpcmVjdGlvbi5MRUZUKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHByZXYsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAxLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShwcmV2LCBpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbXN1YnN1cCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpO1xuICAgICAgICAgICAgbXN1YnN1cC5TZXREYXRhKG1zdWJzdXAuYmFzZSwgcHJldik7XG4gICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uIC0gMSwgbXN1YnN1cCk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShtc3Vic3VwLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAocmVjYWxsLCBjKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgdmFyIGxhdGV4ID0gXCJcIjtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdGhpcy5ub2RlLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbWkgPSB0aGlzLm5vZGUuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAobWkudHlwZSAhPT0gJ21pJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIG5vbi1pZGVudGlmaWVyIGluIGJhY2tzbGFzaCBleHByZXNzaW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjaGFycyA9IG1pLmRhdGFbMF07XG4gICAgICAgICAgICAgICAgbGF0ZXggKz0gY2hhcnMuZGF0YVswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UobGF0ZXgpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLmNsYXNzTGlzdC5hZGQoJ2ludmFsaWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCByZXN1bHQ6IFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgdmFyIG1yb3cgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKHJlc3VsdCk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBjb2RlID0gZXZlbnQuY2hhckNvZGUgfHwgZXZlbnQua2V5Q29kZSB8fCBldmVudC53aGljaDtcbiAgICAgICAgdmFyIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgICB2YXIgdG9JbnNlcnQ7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LnJlbW92ZSgnaW52YWxpZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC5jdHJsS2V5ICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcIm10YWJsZVwiICYmIGNvZGUgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hZGRDb2x1bW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7IHRoaXMucmVmb2N1cygpOyB9XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFwibXRhYmxlXCIgJiYgY29kZSA9PSAxMCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmFkZFJvdygpO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHsgdGhpcy5yZWZvY3VzKCk7IH1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ2hvbGUnKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5ub2RlLnBhcmVudDtcbiAgICAgICAgICAgIHZhciBob2xlSW5kZXggPSBwYXJlbnQuZGF0YS5pbmRleE9mKHRoaXMubm9kZSk7XG4gICAgICAgICAgICB2YXIgcm93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KCk7XG4gICAgICAgICAgICBwYXJlbnQuU2V0RGF0YShob2xlSW5kZXgsIHJvdyk7XG4gICAgICAgICAgICByb3cubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSAhPT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyYXlSb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gwMDVDJykpKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JheVJvdy5iYWNrc2xhc2hSb3cgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiwgMCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24sIGdyYXlSb3cpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ2xhc3MgPSBncmF5Um93LmNsYXNzID8gZ3JheVJvdy5jbGFzcyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNsYXNzID0gb2xkQ2xhc3MgKyBcImJhY2tzbGFzaC1tb2RlXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKGdyYXlSb3csIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVE9ETzogaW5zZXJ0IGEgXFxcXCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiXlwiIHx8IGMgPT09IFwiX1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VwZXJPclN1YnNjcmlwdChyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIgXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTcGFjZShyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLmxldHRlci50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5taShuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5udW1iZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW4obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gnICsgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09ICcrJyB8fCBjID09PSAnLycgfHwgYyA9PT0gJz0nIHx8IGMgPT09ICcuJyB8fCBjID09PSAnKCcgfHwgYyA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b0luc2VydClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCB0b0luc2VydCk7XG4gICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgfV0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ib3hlcykge1xuICAgICAgICAgICAgdGhpcy5ib3hlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm94ZXMgPSBbXTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlnaGxpZ2h0Qm94ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBjdXIgPSB0aGlzLm5vZGU7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gY3VyLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlcyA9IHRoaXMuYm94ZXMuY29uY2F0KFV0aWwuaGlnaGxpZ2h0Qm94KHN2ZywgYmIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0F0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIGhlaWdodCwgc2tpcFNjcm9sbCkge1xuICAgICAgICB0aGlzLnJlbmRlcmVkUG9zaXRpb24gPSB7IHg6IHgsIHk6IHksIGhlaWdodDogaGVpZ2h0IH07XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsIHRoaXMuY29sb3IpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdtYXRoLWN1cnNvcicpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb2xkY2xhc3MgPSBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgb2xkY2xhc3Muc3BsaXQoJ2JsaW5rJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHRoaXMud2lkdGgudG9TdHJpbmcoKSk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuc3RhcnRCbGluayk7XG4gICAgICAgIHRoaXMuc3RhcnRCbGluayA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsIGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSArICcgYmxpbmsnKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCA1MDApO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodEJveGVzKHN2Z2VsZW0pO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUuZHJhd0N1cnNvckhpZ2hsaWdodCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNraXBTY3JvbGwpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbEludG9WaWV3KHN2Z2VsZW0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zaWduYWxDdXJzb3JNb3ZlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgICAgIGlmICghbm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgICAgdmFyIHBhdGggPSBbXTtcbiAgICAgICAgd2hpbGUgKG5vZGUucGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgaSA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIHBhdGgudW5zaGlmdChpKTtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBub2RlLmlucHV0SUQgKyBcIi1GcmFtZVwiO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBjdXJzb3JfZHJhd25cIiwgaWQsIHBhdGgsIHBvc2l0aW9uXSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmNsZWFySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMuaGlkZUhpZ2hsaWdodCgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oaWRlSGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKGNlbGVtKSB7XG4gICAgICAgICAgICBjZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5kcmF3SGlnaGxpZ2h0QXQgPSBmdW5jdGlvbiAoc3ZnZWxlbSwgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICdyZ2JhKDE3MywgMjE2LCAyNTAsIDAuNSknKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnbWF0aC1jdXJzb3ItaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdyk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24gKHN2Z2VsZW0pIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlbmRlcmVkUG9zaXRpb24pXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciB4ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLng7XG4gICAgICAgIHZhciB5ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLnk7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLnJlbmRlcmVkUG9zaXRpb24uaGVpZ2h0O1xuICAgICAgICB2YXIgY2xpZW50UG9pbnQgPSBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyhzdmdlbGVtLCB4LCB5ICsgaGVpZ2h0IC8gMik7XG4gICAgICAgIHZhciBjbGllbnRXaWR0aCA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG4gICAgICAgIHZhciBjbGllbnRIZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcbiAgICAgICAgdmFyIHN4ID0gMCwgc3kgPSAwO1xuICAgICAgICBpZiAoY2xpZW50UG9pbnQueCA8IDAgfHwgY2xpZW50UG9pbnQueCA+IGNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzeCA9IGNsaWVudFBvaW50LnggLSBjbGllbnRXaWR0aCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnkgPCAwIHx8IGNsaWVudFBvaW50LnkgPiBjbGllbnRIZWlnaHQpIHtcbiAgICAgICAgICAgIHN5ID0gY2xpZW50UG9pbnQueSAtIGNsaWVudEhlaWdodCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN4IHx8IHN5KSB7XG4gICAgICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoc3gsIHN5KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmIChjdXJzb3IpXG4gICAgICAgICAgICBjdXJzb3IucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmJsdXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jbGVhckJveGVzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZm9jdXNGaXJzdEhvbGUgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICBpZiAoIXJvb3QpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChyb290LnR5cGUgPT09IFwiaG9sZVwiKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUgPSByb290O1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mb2N1c0ZpcnN0SG9sZShyb290LmRhdGFbaV0pKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIEN1cnNvci5DdXJzb3JNb2RlID0ge1xuICAgICAgICBCQUNLU0xBU0g6IFwiYmFja3NsYXNoXCIsXG4gICAgICAgIE5PUk1BTDogXCJub3JtYWxcIixcbiAgICAgICAgU0VMRUNUSU9OOiBcInNlbGVjdGlvblwiXG4gICAgfTtcbiAgICByZXR1cm4gQ3Vyc29yO1xufSgpKTtcbnZhciBFZGl0YWJsZVNWR0NvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkdDb25maWcoKSB7XG4gICAgfVxuICAgIEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlcyA9IHtcbiAgICAgICAgXCIuTWF0aEpheF9TVkdcIjoge1xuICAgICAgICAgICAgXCJkaXNwbGF5XCI6IFwiaW5saW5lXCIsXG4gICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwibGluZS1oZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiMTAwJVwiLFxuICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJ0ZXh0LWluZGVudFwiOiAwLFxuICAgICAgICAgICAgXCJ0ZXh0LWFsaWduXCI6IFwibGVmdFwiLFxuICAgICAgICAgICAgXCJ0ZXh0LXRyYW5zZm9ybVwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibGV0dGVyLXNwYWNpbmdcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid29yZC1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtd3JhcFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3aGl0ZS1zcGFjZVwiOiBcIm5vd3JhcFwiLFxuICAgICAgICAgICAgXCJmbG9hdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IFwibHRyXCIsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRGlzcGxheVwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJyZWxhdGl2ZVwiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LXdpZHRoXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgd2lkdGg6IFwiMTAwJVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHICpcIjoge1xuICAgICAgICAgICAgdHJhbnNpdGlvbjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi13ZWJraXQtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1vei10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItbXMtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW8tdHJhbnNpdGlvblwiOiBcIm5vbmVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5tangtc3ZnLWhyZWZcIjoge1xuICAgICAgICAgICAgZmlsbDogXCJibHVlXCIsXG4gICAgICAgICAgICBzdHJva2U6IFwiYmx1ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjoge1xuICAgICAgICAgICAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI6IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZSFpbXBvcnRhbnRcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19FeEJveFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICB3aWR0aDogXCIxcHhcIixcbiAgICAgICAgICAgIGhlaWdodDogXCI2MGV4XCIsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIuYmFja3NsYXNoLW1vZGUgdXNlXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiZ3JheVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImdyYXlcIlxuICAgICAgICB9LFxuICAgICAgICAnLmJhY2tzbGFzaC1tb2RlLmludmFsaWQgdXNlJzoge1xuICAgICAgICAgICAgZmlsbDogJyNmZjAwMDAnLFxuICAgICAgICAgICAgc3Ryb2tlOiAnI2ZmMDAwMCcsXG4gICAgICAgIH0sXG4gICAgICAgICcubWF0aC1jdXJzb3IuYmxpbmsnOiB7XG4gICAgICAgICAgICAnYW5pbWF0aW9uJzogJ2JsaW5rIDEuMDZzIHN0ZXBzKDIsIHN0YXJ0KSBpbmZpbml0ZScsXG4gICAgICAgICAgICAnLXdlYmtpdC1hbmltYXRpb24nOiAnYmxpbmsgMS4wNnMgc3RlcHMoMiwgc3RhcnQpIGluZmluaXRlJyxcbiAgICAgICAgfSxcbiAgICAgICAgJ0BrZXlmcmFtZXMgYmxpbmsnOiAndG8ge3Zpc2liaWxpdHk6IGhpZGRlbn0nLFxuICAgICAgICAnQC13ZWJraXQta2V5ZnJhbWVzIGJsaW5rJzogJ3RvIHt2aXNpYmlsaXR5OiBoaWRkZW59JyxcbiAgICAgICAgXCIjTWF0aEpheF9TVkdfVG9vbHRpcFwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgIGhlaWdodDogXCJhdXRvXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmVcIlxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkdDb25maWc7XG59KCkpO1xudmFyIEVkaXRhYmxlU1ZHID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFZGl0YWJsZVNWRygpIHtcbiAgICAgICAgdGhpcy5UT1VDSCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCA9IHRydWU7XG4gICAgICAgIHRoaXMuZm9udE5hbWVzID0gW1wiVGVYXCIsIFwiU1RJWFwiLCBcIlNUSVgtV2ViXCIsIFwiQXNhbmEtTWF0aFwiLFxuICAgICAgICAgICAgXCJHeXJlLVRlcm1lc1wiLCBcIkd5cmUtUGFnZWxsYVwiLCBcIkxhdGluLU1vZGVyblwiLCBcIk5lby1FdWxlclwiXTtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZSA9IE1hdGhKYXguSFRNTC5UZXh0Tm9kZTtcbiAgICAgICAgdGhpcy5hZGRUZXh0ID0gTWF0aEpheC5IVE1MLmFkZFRleHQ7XG4gICAgICAgIHRoaXMudWNNYXRjaCA9IE1hdGhKYXguSFRNTC51Y01hdGNoO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIm1tbCBKYXggUmVhZHlcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgICAgICBNTUwuaG9sZS5BdWdtZW50KEhvbGUuZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWJhc2UuQXVnbWVudChNQmFzZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5lbnRpdHkuQXVnbWVudChFbnRpdHlNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tby5BdWdtZW50KE1vTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1lcnJvci5BdWdtZW50KE1FcnJvck1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zLkF1Z21lbnQoTXNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3BhY2UuQXVnbWVudChNU3BhY2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcGhhbnRvbS5BdWdtZW50KE1QaGFudG9tTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcm93LkF1Z21lbnQoTVJvd01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zdHlsZS5BdWdtZW50KE1TdHlsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3FydC5BdWdtZW50KE1TcXJ0TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXJvb3QuQXVnbWVudChNUm9vdE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVuY2xvc2UuQXVnbWVudChNRW5jbG9zZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hY3Rpb24uQXVnbWVudChNQWN0aW9uTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXVuZGVyb3Zlci5BdWdtZW50KE1VbmRlck92ZXJNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3Vic3VwLkF1Z21lbnQoTVN1YlN1cE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWF0aC5BdWdtZW50KE1hdGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10YWJsZS5BdWdtZW50KE1UYWJsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ci5BdWdtZW50KE1UYWJsZVJvd01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ZC5BdWdtZW50KE1UYWJsZUNlbGxNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTFtcImFubm90YXRpb24teG1sXCJdLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgIHRvU1ZHOiBNTUwubWJhc2UuU1ZHYXV0b2xvYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJvbkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeWluZyBlZGl0YWJsZXN2ZzogJywgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChNYXRoSmF4LkNhbGxiYWNrKFtcImxvYWRDb21wbGV0ZVwiLCBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRywgXCJqYXguanNcIl0pLCAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLkJyb3dzZXIuU2VsZWN0KHtcbiAgICAgICAgICAgIE9wZXJhOiBmdW5jdGlvbiAoYnJvd3Nlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkcuQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIG9wZXJhWm9vbVJlZnJlc2g6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwiRW5kIENvb2tpZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56b29tICE9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguQWpheC5SZXF1aXJlKFwiW01hdGhKYXhdL2V4dGVuc2lvbnMvTWF0aFpvb20uanNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3VtZW50O1xuICAgICAgICAgICAgaWYgKCFkb2MubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2MubmFtZXNwYWNlcy5hZGQoXCJzdmdcIiwgVXRpbC5TVkdOUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0FVVE9MT0FEIERJUiAnLCB0aGlzLmF1dG9sb2FkRGlyKTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncywgY29uZmlnID0gdGhpcy5jb25maWcsIGZvbnQgPSBzZXR0aW5ncy5mb250O1xuICAgICAgICBpZiAoc2V0dGluZ3Muc2NhbGUpIHtcbiAgICAgICAgICAgIGNvbmZpZy5zY2FsZSA9IHNldHRpbmdzLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgIT09IFwiQXV0b1wiKSB7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oTG9jYWx8V2VifEltYWdlKSQvaSwgXCJcIik7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS8sIFwiJDEtJDJcIik7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGZvbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGNvbmZpZy5mb250IHx8IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9udE5hbWVzLmluZGV4T2YodGhpcy5mb250SW5Vc2UpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBcIlRlWFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9udERpciArPSBcIi9cIiArIHRoaXMuZm9udEluVXNlO1xuICAgICAgICBpZiAoIXRoaXMucmVxdWlyZSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1aXJlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2godGhpcy5mb250RGlyICsgXCIvZm9udGRhdGEuanNcIik7XG4gICAgICAgIHRoaXMucmVxdWlyZS5wdXNoKE1hdGhKYXguT3V0cHV0SmF4LmV4dGVuc2lvbkRpciArIFwiL01hdGhFdmVudHMuanNcIik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuU3RhcnR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIEVWRU5UID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudDtcbiAgICAgICAgdGhpcy5UT1VDSCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuVG91Y2g7XG4gICAgICAgIHZhciBIT1ZFUiA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuSG92ZXI7XG4gICAgICAgIHRoaXMuQ29udGV4dE1lbnUgPSBFVkVOVC5Db250ZXh0TWVudTtcbiAgICAgICAgdGhpcy5Nb3VzZW92ZXIgPSBIT1ZFUi5Nb3VzZW92ZXI7XG4gICAgICAgIHRoaXMuTW91c2VvdXQgPSBIT1ZFUi5Nb3VzZW91dDtcbiAgICAgICAgdGhpcy5Nb3VzZW1vdmUgPSBIT1ZFUi5Nb3VzZW1vdmU7XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogXCIxcHhcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwLFxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJsZWZ0XCIsXG4gICAgICAgICAgICAgICAgdGV4dEluZGVudDogMCxcbiAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0OiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIGxldHRlclNwYWNpbmc6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgd29yZFNwYWNpbmc6IFwibm9ybWFsXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuaGlkZGVuRGl2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKHRoaXMuaGlkZGVuRGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIGlkOiBcIk1hdGhKYXhfU1ZHX0hpZGRlblwiXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiNWluXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFV0aWwucHhQZXJJbmNoID0gZGl2Lm9mZnNldFdpZHRoIC8gNTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgdGhpcy50ZXh0U1ZHID0gVXRpbC5FbGVtZW50KFwic3ZnXCIsIG51bGwpO1xuICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLmFkZEVsZW1lbnQoVXRpbC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LnBhcmVudE5vZGUsIFwic3ZnXCIpLCBcImRlZnNcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfZ2x5cGhzXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuRXhTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZS1hZGp1c3RcIjogXCJub25lXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgW1xuICAgICAgICAgICAgW1wic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19FeEJveFwiXG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHRoaXMubGluZWJyZWFrU3BhbiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCBudWxsLCBbXG4gICAgICAgICAgICBbXCJoclwiLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjogMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHZhciBzdHlsZXMgPSB0aGlzLmNvbmZpZy5zdHlsZXM7XG4gICAgICAgIGZvciAodmFyIHMgaW4gRWRpdGFibGVTVkdDb25maWcuc3R5bGVzKSB7XG4gICAgICAgICAgICBzdHlsZXNbc10gPSBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXNbc107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguQWpheC5TdHlsZXMoc3R5bGVzLCBbXCJJbml0aWFsaXplU1ZHXCIsIHRoaXNdKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Jbml0aWFsaXplU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICB0aGlzLmRlZmF1bHRFeCA9IHRoaXMuRXhTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZGVmYXVsdFdpZHRoID0gdGhpcy5saW5lYnJlYWtTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5saW5lYnJlYWtTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLkV4U3Bhbik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucHJlVHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdO1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgdmFyIG0gPSBzY3JpcHRzLmxlbmd0aDtcbiAgICAgICAgdmFyIHNjcmlwdDtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIHZhciBzcGFuO1xuICAgICAgICB2YXIgZGl2O1xuICAgICAgICB2YXIgdGVzdDtcbiAgICAgICAgdmFyIGpheDtcbiAgICAgICAgdmFyIGV4O1xuICAgICAgICB2YXIgZW07XG4gICAgICAgIHZhciBtYXh3aWR0aDtcbiAgICAgICAgdmFyIHJlbHdpZHRoID0gZmFsc2U7XG4gICAgICAgIHZhciBjd2lkdGg7XG4gICAgICAgIHZhciBsaW5lYnJlYWsgPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYztcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb25maWcubGluZWJyZWFrcy53aWR0aDtcbiAgICAgICAgaWYgKGxpbmVicmVhaykge1xuICAgICAgICAgICAgcmVsd2lkdGggPSAod2lkdGgubWF0Y2goL15cXHMqKFxcZCsoXFwuXFxkKik/JVxccyopP2NvbnRhaW5lclxccyokLykgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoL1xccypjb250YWluZXJcXHMqLywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdpZHRoID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgd2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1heHdpZHRoID0gMTAwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcHJldiA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBpZiAocHJldiAmJiBTdHJpbmcocHJldi5jbGFzc05hbWUpLm1hdGNoKC9eTWF0aEpheChfU1ZHKT8oX0Rpc3BsYXkpPyggTWF0aEpheChfU1ZHKT9fUHJvY2Vzc2luZyk/JC8pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHID0ge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IChqYXgucm9vdC5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc3BhbiA9IGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXNpemVcIjogdGhpcy5jb25maWcuc2NhbGUgKyBcIiVcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJpbmxpbmUtYmxvY2tcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHXCIsXG4gICAgICAgICAgICAgICAgaWQ6IGpheC5pbnB1dElEICsgXCItRnJhbWVcIixcbiAgICAgICAgICAgICAgICBpc01hdGhKYXg6IHRydWUsXG4gICAgICAgICAgICAgICAgamF4SUQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgb25jb250ZXh0bWVudTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5NZW51LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vkb3duOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlZG93bixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3ZlcjogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW92ZXIsXG4gICAgICAgICAgICAgICAgb25tb3VzZW91dDogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW91dCxcbiAgICAgICAgICAgICAgICBvbm1vdXNlbW92ZTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW1vdmUsXG4gICAgICAgICAgICAgICAgb25jbGljazogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5DbGljayxcbiAgICAgICAgICAgICAgICBvbmRibGNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkRibENsaWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChNYXRoSmF4Lkh1Yi5Ccm93c2VyLm5vQ29udGV4dE1lbnUpIHtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hzdGFydCA9IHRoaXMuVE9VQ0guc3RhcnQ7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoZW5kID0gdGhpcy5UT1VDSC5lbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19EaXNwbGF5XCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXYuY2xhc3NOYW1lICs9IFwiIE1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpLCBzY3JpcHQpO1xuICAgICAgICAgICAgZGl2LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGluZWJyZWFrU3Bhbi5jbG9uZU5vZGUodHJ1ZSksIGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGRpdiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZXggPSB0ZXN0LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgICAgICBjd2lkdGggPSBkaXYucHJldmlvdXNTaWJsaW5nLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleCA9PT0gMCB8fCBleCA9PT0gXCJOYU5cIikge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZGVuRGl2LmFwcGVuZENoaWxkKGRpdik7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBleCA9IHRoaXMuZGVmYXVsdEV4O1xuICAgICAgICAgICAgICAgIGN3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBVdGlsLmV4ID0gZXg7XG4gICAgICAgICAgICBVdGlsLmVtID0gZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgICAgIFV0aWwuY3dpZHRoID0gY3dpZHRoIC8gZW0gKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5saW5lV2lkdGggPSAobGluZWJyZWFrID8gVXRpbC5sZW5ndGgyZW0od2lkdGgsIDEsIG1heHdpZHRoIC8gZW0gKiAxMDAwKSA6IFV0aWwuQklHRElNRU4pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdHNbaV0ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgc3BhbiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0c1tpXS5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICghamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICAgICAgdGVzdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2VxbiA9IHN0YXRlLlNWR2xhc3QgPSAwO1xuICAgICAgICBzdGF0ZS5TVkdpID0gLTE7XG4gICAgICAgIHN0YXRlLlNWR2NodW5rID0gdGhpcy5jb25maWcuRXFuQ2h1bms7XG4gICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuVHJhbnNsYXRlID0gZnVuY3Rpb24gKHNjcmlwdCwgc3RhdGUpIHtcbiAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHN0YXRlLlNWR2RlbGF5KSB7XG4gICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQ2FsbGJhY2suRGVsYXkodGhpcy5jb25maWcuRXFuQ2h1bmtEZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICB2YXIgbWF0aCA9IGpheC5yb290O1xuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGpheC5pbnB1dElEICsgXCItRnJhbWVcIik7XG4gICAgICAgIHZhciBkaXYgPSAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkgPyAoc3BhbiB8fCB7IHBhcmVudE5vZGU6IHVuZGVmaW5lZCB9KS5wYXJlbnROb2RlIDogc3Bhbik7XG4gICAgICAgIHZhciBsb2NhbENhY2hlID0gKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSAmJiAhdGhpcy5jb25maWcudXNlR2xvYmFsQ2FjaGUpO1xuICAgICAgICBpZiAoIWRpdilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5lbSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmVtID0gamF4LkVkaXRhYmxlU1ZHLmVtO1xuICAgICAgICB0aGlzLmV4ID0gamF4LkVkaXRhYmxlU1ZHLmV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguRWRpdGFibGVTVkcuY3dpZHRoO1xuICAgICAgICB0aGlzLm1hdGhEaXYgPSBkaXY7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgaWYgKGxvY2FsQ2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRHbHlwaHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRTVkcobWF0aCwgc3Bhbik7XG4gICAgICAgIG1hdGguc2V0VGVYY2xhc3MoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGgudG9TVkcoc3BhbiwgZGl2KTtcbiAgICAgICAgICAgIG1hdGguaW5zdGFsbEN1cnNvckxpc3RlbmVycygpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzcGFuLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZChzcGFuLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5uLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLkFkZElucHV0SGFuZGxlcnMobWF0aCwgc3BhbiwgZGl2KTtcbiAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgfVxuICAgICAgICBkaXYuY2xhc3NOYW1lID0gZGl2LmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICBpZiAodGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCkge1xuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjtcbiAgICAgICAgICAgIGlmIChzY3JpcHQuTWF0aEpheC5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgICAgIHZhciBpZCA9IHNjcmlwdC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgcmVyZW5kZXJcIiwgaWQgKyBcIi1GcmFtZVwiXSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIsIG51bGwpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4ID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gJ3RleGF0b20nKSB7XG4gICAgICAgICAgICBpZiAocm9vdC5kYXRhLmxlbmd0aCAhPT0gMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignVW5leHBlY3RlZCBsZW5ndGggaW4gdGV4YXRvbScpO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChyb290LmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJvb3QuaXNDdXJzb3JhYmxlKCkgfHwgcm9vdC50eXBlID09PSAnbWF0aCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHJvb3QuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cilcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBjdXIudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZVswXSAhPT0gJ20nIHx8IHR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJXcmFwcGluZyBhIHRoaW5nIGluIGFuIG1yb3dcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb290O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkFkZElucHV0SGFuZGxlcnMgPSBmdW5jdGlvbiAobWF0aCwgc3BhbiwgZGl2KSB7XG4gICAgICAgIG1hdGguY3Vyc29yID0gbmV3IEN1cnNvcigpO1xuICAgICAgICBtYXRoLnJlcmVuZGVyID0gcmVyZW5kZXI7XG4gICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgIHZhciBhZGRUZXhUb0RPTSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXggPSBtYXRoLnRvVGV4KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRleDogXCIsIHRleCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1hdGg6IFwiLCBtYXRoKTtcbiAgICAgICAgICAgIG1hdGguRWRpdGFibGVTVkdlbGVtLnNldEF0dHJpYnV0ZShcInRleFwiLCB0ZXgpO1xuICAgICAgICB9O1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhZGRUZXhUb0RPTSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgZnVuY3Rpb24gcmVyZW5kZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgobWF0aCkudG9TVkcoc3BhbiwgZGl2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgYWRkVGV4VG9ET00oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0aEpheC5DYWxsYmFjay5BZnRlcihbcmVyZW5kZXIsIGNhbGxiYWNrXSwgZXJyLnJlc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2soY2FsbGJhY2spKCk7XG4gICAgICAgICAgICB2YXIgaWQgPSBzcGFuLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgcmVyZW5kZXJcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKGUpIHtcbiAgICAgICAgICAgIGlmIChtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXSlcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXS5jYWxsKG1hdGguY3Vyc29yLCBlLCByZXJlbmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlclNwYW4gPSBmdW5jdGlvbiAoamF4LCBtYXRoKSB7XG4gICAgICAgIG1hdGguc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIHJldHVybiBtYXRoLmZpcnN0Q2hpbGQ7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJCQm94ID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCkge1xuICAgICAgICB2YXIgYmJveCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuLnBhcmVudE5vZGUpO1xuICAgICAgICBiYm94LmggKz0gMjtcbiAgICAgICAgYmJveC5kIC09IDI7XG4gICAgICAgIHJldHVybiBiYm94O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlpvb20gPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoLCBNdywgTWgpIHtcbiAgICAgICAgc3Bhbi5jbGFzc05hbWUgPSBcIk1hdGhKYXhfU1ZHXCI7XG4gICAgICAgIHZhciBlbWV4ID0gc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICB2YXIgZXggPSBlbWV4LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZW0gPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5lbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICB0aGlzLmV4ID0gZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIGVtZXgucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbWV4KTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLm1hdGhESVYgPSBzcGFuO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB2YXIgc3ZnID0gc3Bhbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN2Z1wiKVswXS5zdHlsZTtcbiAgICAgICAgc3ZnLm1hcmdpblRvcCA9IHN2Zy5tYXJnaW5SaWdodCA9IHN2Zy5tYXJnaW5MZWZ0ID0gMDtcbiAgICAgICAgaWYgKHN2Zy5tYXJnaW5Cb3R0b20uY2hhckF0KDApID09PSBcIi1cIilcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWFyZ2luQm90dG9tID0gc3ZnLm1hcmdpbkJvdHRvbS5zdWJzdHIoMSk7XG4gICAgICAgIGlmICh0aGlzLm9wZXJhWm9vbVJlZnJlc2gpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNwYW4uZmlyc3RDaGlsZC5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB0cmFuc3BhcmVudFwiO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwYW4ub2Zmc2V0V2lkdGggPCBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWluV2lkdGggPSBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICBtYXRoLnN0eWxlLm1pbldpZHRoID0gbWF0aC5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB2YXIgelcgPSBzcGFuLm9mZnNldFdpZHRoLCB6SCA9IHNwYW4ub2Zmc2V0SGVpZ2h0LCBtSCA9IG1hdGgub2Zmc2V0SGVpZ2h0LCBtVyA9IG1hdGgub2Zmc2V0V2lkdGg7XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJcIjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFk6IC1NYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGpheC5FZGl0YWJsZVNWRztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmV4dGVuZERlbGltaXRlclYgPSBmdW5jdGlvbiAoc3ZnLCBILCBkZWxpbSwgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRvcCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnRvcCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGJvdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmJvdCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGggPSB0b3AuaCArIHRvcC5kICsgYm90LmggKyBib3QuZDtcbiAgICAgICAgdmFyIHkgPSAtdG9wLmg7XG4gICAgICAgIHN2Zy5BZGQodG9wLCAwLCB5KTtcbiAgICAgICAgeSAtPSB0b3AuZDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIGggKz0gbWlkLmggKyBtaWQuZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIEggPCBoICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBIID0gaCAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSCA+IGgpIHtcbiAgICAgICAgICAgIHZhciBleHQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLmV4dCwgZm9udCk7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIGVIID0gKEggLSBoKSAvIGssIHMgPSAoZUggKyAxMDApIC8gKGV4dC5oICsgZXh0LmQpO1xuICAgICAgICAgICAgd2hpbGUgKGstLSA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IFV0aWwuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArICh4IC0gZnV6eiAvIDIgLSBzICogcmVwLmwgKyByZXAueCkgKyBcIixcIiArIHJlcC55ICsgXCIpIHNjYWxlKFwiICsgcyArIFwiLDEpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHJlcC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHggKz0gclc7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBtaWQudztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVykgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgeCArPSBtaWQudyAtICh3IC0gVykgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQocmlnaHQsIHggLSByaWdodC5sLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZ2V0SmF4RnJvbU1hdGggPSBmdW5jdGlvbiAobWF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICAgICAgbWF0aCA9IG1hdGgucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBtYXRoID0gbWF0aC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH0gd2hpbGUgKG1hdGggJiYgbWF0aC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICE9PSBcInNjcmlwdFwiKTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5nZXRKYXhGb3IobWF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBnZXRKYXhGcm9tTWF0aFwiLCBlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHO1xufSgpKTtcbnZhciBsb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgRWRpdGFibGVTVkcuYXBwbHkoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIGZvciAodmFyIGlkIGluIEVkaXRhYmxlU1ZHLnByb3RvdHlwZSkge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkcucHJvdG90eXBlW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcpIHtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkdbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbn07XG5TVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgPSBTVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgfHwgZnVuY3Rpb24gKGVsZW0pIHtcbiAgICByZXR1cm4gZWxlbS5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkubXVsdGlwbHkodGhpcy5nZXRTY3JlZW5DVE0oKSk7XG59O1xuc2V0VGltZW91dChsb2FkLCAxMDAwKTtcbnZhciBQYXJzZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBhcnNlcigpIHtcbiAgICB9XG4gICAgUGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlID0gZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MoY3MpO1xuICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgdmFyIG1hdGhqYXhQYXJzZXIgPSBNYXRoSmF4LklucHV0SmF4LlRlWC5QYXJzZShjcyk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuY3NVbmRlZmluZWQgPSBtYXRoamF4UGFyc2VyLmNzRmluZE1hY3JvID0gZnVuY3Rpb24gKCkgeyB9O1xuICAgICAgICBtYXRoamF4UGFyc2VyLkdldENTID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gY3M7IH07XG4gICAgICAgIG1hdGhqYXhQYXJzZXIubW1sVG9rZW4gPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5QdXNoID0gKGZ1bmN0aW9uICh4KSB7IHJlc3VsdCA9IHg7IH0pO1xuICAgICAgICBtYXRoamF4UGFyc2VyLkNvbnRyb2xTZXF1ZW5jZSgpO1xuICAgICAgICByZXR1cm4gW3Jlc3VsdF07XG4gICAgfTtcbiAgICBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIG1hY3JvcyA9IE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLm1hY3JvcztcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIGlmIChjcyA9PT0gJ2ZyYWMnKSB7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgdmFyIG1mcmFjID0gbmV3IE1NTC5tZnJhYyhob2xlLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gW21mcmFjXTtcbiAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjcyA9PT0gJ3NxcnQnKSB7XG4gICAgICAgICAgICB2YXIgbXNxcnQgPSBuZXcgTU1MLm1zcXJ0KCk7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgbXNxcnQuU2V0RGF0YSgwLCBob2xlKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbXNxcnRdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNzID09PSAnbWF0cml4JyB8fCBjcyA9PT0gJ2JtYXRyaXgnKSB7XG4gICAgICAgICAgICB2YXIgbXRhYmxlID0gbmV3IE1NTC5tdGFibGUoKTtcbiAgICAgICAgICAgIHZhciBtdHIgPSBuZXcgTU1MLm10cigpO1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgbXRhYmxlLlNldERhdGEoMCwgbXRyKTtcbiAgICAgICAgICAgIG10ci5TZXREYXRhKDAsIG10ZCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBob2xlKTtcbiAgICAgICAgICAgIHZhciBsYnJhY2tldCA9IG5ldyBNTUwubW8obmV3IE1NTC5jaGFycyhcIltcIikpO1xuICAgICAgICAgICAgdmFyIHJicmFja2V0ID0gbmV3IE1NTC5tbyhuZXcgTU1MLmNoYXJzKFwiXVwiKSk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gW2xicmFja2V0LCBtdGFibGUsIHJicmFja2V0XTtcbiAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYWNyb3NbY3NdKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtYWNyb3NbY3NdKTtcbiAgICAgICAgICAgIHZhciBuYW1lZERpcmVjdGx5ID0gbWFjcm9zW2NzXSA9PT0gJ05hbWVkT3AnIHx8IG1hY3Jvc1tjc10gPT09ICdOYW1lZEZuJztcbiAgICAgICAgICAgIHZhciBuYW1lZEFycmF5ID0gbWFjcm9zW2NzXVswXSAmJiAobWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkRm4nIHx8IG1hY3Jvc1tjc11bMF0gPT09ICdOYW1lZE9wJyk7XG4gICAgICAgICAgICBpZiAobmFtZWREaXJlY3RseSB8fCBuYW1lZEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lZEFycmF5ICYmIG1hY3Jvc1tjc11bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBtYWNyb3NbY3NdWzFdLnJlcGxhY2UoLyZ0aGluc3A7LywgXCJcXHUyMDA2XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBjcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtuZXcgTU1MLm1vKG5ldyBNTUwuY2hhcnModmFsdWUpKV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBQYXJzZXI7XG59KCkpO1xudmFyIEJCT1ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJCT1goZGVmLCB0eXBlKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmICh0eXBlID09PSB2b2lkIDApIHsgdHlwZSA9IFwiZ1wiOyB9XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLkggPSB0aGlzLkQgPSAwO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSAwO1xuICAgICAgICB0aGlzLmwgPSBVdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLnggPSB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnNjYWxlID0gMTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gVXRpbC5FbGVtZW50KHR5cGUsIGRlZik7XG4gICAgfVxuICAgIEJCT1gucHJvdG90eXBlLldpdGggPSBmdW5jdGlvbiAoZGVmLCBIVUIpIHtcbiAgICAgICAgcmV0dXJuIEhVQi5JbnNlcnQodGhpcywgZGVmKTtcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFkZCA9IGZ1bmN0aW9uIChzdmcsIGR4LCBkeSwgZm9yY2V3LCBpbmZyb250KSB7XG4gICAgICAgIGlmIChkeCkge1xuICAgICAgICAgICAgc3ZnLnggKz0gZHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR5KSB7XG4gICAgICAgICAgICBzdmcueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiBzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBzdmcubiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIG5vZGVOYW1lID0gY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwidXNlXCIgfHwgbm9kZU5hbWUgPT09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHN2Zy5jaGlsZFNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHN2Zy5jaGlsZFgsIHkgPSBzdmcuY2hpbGRZO1xuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcueSArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuaCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuZCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuSCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuRCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcudyAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcuciAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcubCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN2Zy54KSA8IDEgJiYgTWF0aC5hYnMoc3ZnLnkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09PSBcImxpbmVcIiB8fCBub2RlTmFtZSA9PT0gXCJwb2x5Z29uXCIgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPT09IFwicGF0aFwiIHx8IG5vZGVOYW1lID09PSBcImFcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm4gKz0gc3ZnLm47XG4gICAgICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZnJvbnQgJiYgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZnJvbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGFzSW5kZW50ID0gc3ZnLmhhc0luZGVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kIC0gc3ZnLnkgPiB0aGlzLmQpIHtcbiAgICAgICAgICAgIHRoaXMuZCA9IHN2Zy5kIC0gc3ZnLnk7XG4gICAgICAgICAgICBpZiAodGhpcy5kID4gdGhpcy5EKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5EID0gdGhpcy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5oID4gdGhpcy5oKSB7XG4gICAgICAgICAgICB0aGlzLmggPSBzdmcueSArIHN2Zy5oO1xuICAgICAgICAgICAgaWYgKHRoaXMuaCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuSCA9IHRoaXMuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgLSBzdmcueSA+IHRoaXMuRClcbiAgICAgICAgICAgIHRoaXMuRCA9IHN2Zy5EIC0gc3ZnLnk7XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5IID4gdGhpcy5IKVxuICAgICAgICAgICAgdGhpcy5IID0gc3ZnLnkgKyBzdmcuSDtcbiAgICAgICAgaWYgKHN2Zy54ICsgc3ZnLmwgPCB0aGlzLmwpXG4gICAgICAgICAgICB0aGlzLmwgPSBzdmcueCArIHN2Zy5sO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcuciA+IHRoaXMucilcbiAgICAgICAgICAgIHRoaXMuciA9IHN2Zy54ICsgc3ZnLnI7XG4gICAgICAgIGlmIChmb3JjZXcgfHwgc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKSA+IHRoaXMudylcbiAgICAgICAgICAgIHRoaXMudyA9IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCk7XG4gICAgICAgIHRoaXMuY2hpbGRTY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5jaGlsZFggPSBzdmcueDtcbiAgICAgICAgdGhpcy5jaGlsZFkgPSBzdmcueTtcbiAgICAgICAgdGhpcy5uKys7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BbGlnbiA9IGZ1bmN0aW9uIChzdmcsIGFsaWduLCBkeCwgZHksIHNoaWZ0KSB7XG4gICAgICAgIGlmIChzaGlmdCA9PT0gdm9pZCAwKSB7IHNoaWZ0ID0gbnVsbDsgfVxuICAgICAgICBkeCA9ICh7XG4gICAgICAgICAgICBsZWZ0OiBkeCxcbiAgICAgICAgICAgIGNlbnRlcjogKHRoaXMudyAtIHN2Zy53KSAvIDIsXG4gICAgICAgICAgICByaWdodDogdGhpcy53IC0gc3ZnLncgLSBkeFxuICAgICAgICB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgICAgIHRoaXMuQWRkKHN2ZywgZHggKyAoc2hpZnQgfHwgMCksIGR5KTtcbiAgICAgICAgdGhpcy53ID0gdztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkNsZWFuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oID09PSAtVXRpbC5CSUdESU1FTikge1xuICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gdGhpcy5sID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEJCT1guZGVmcyA9IG51bGw7XG4gICAgQkJPWC5uID0gMDtcbiAgICByZXR1cm4gQkJPWDtcbn0oKSk7XG52YXIgQkJPWF9HID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfRygpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0c7XG59KEJCT1gpKTtcbnZhciBCQk9YX1RFWFQgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1RFWFQsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9URVhUKHNjYWxlLCB0ZXh0LCBkZWYpIHtcbiAgICAgICAgaWYgKCFkZWYpXG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgZGVmLnN0cm9rZSA9IFwibm9uZVwiO1xuICAgICAgICBpZiAoZGVmW1wiZm9udC1zdHlsZVwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXN0eWxlXCJdO1xuICAgICAgICBpZiAoZGVmW1wiZm9udC13ZWlnaHRcIl0gPT09IFwiXCIpXG4gICAgICAgICAgICBkZWxldGUgZGVmW1wiZm9udC13ZWlnaHRcIl07XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJ0ZXh0XCIpO1xuICAgICAgICBNYXRoSmF4LkhUTUwuYWRkVGV4dCh0aGlzLmVsZW1lbnQsIHRleHQpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy50ZXh0U1ZHLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5lbGVtZW50LmdldEJCb3goKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcudGV4dFNWRy5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICBzY2FsZSAqPSAxMDAwIC8gVXRpbC5lbTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIikgbWF0cml4KDEgMCAwIC0xIDAgMClcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSBiYm94LndpZHRoICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IC1iYm94LnkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gKGJib3guaGVpZ2h0ICsgYmJveC55KSAqIHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9URVhUO1xufShCQk9YKSk7XG52YXIgVXRpbCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXRpbCgpIHtcbiAgICB9XG4gICAgVXRpbC5FbSA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGVtXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImVtXCI7XG4gICAgfTtcbiAgICBVdGlsLkV4ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgbSA9IE1hdGgucm91bmQobSAvIHRoaXMuVGVYLnhfaGVpZ2h0ICogdGhpcy5leCkgLyB0aGlzLmV4O1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBleFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJleFwiO1xuICAgIH07XG4gICAgVXRpbC5QZXJjZW50ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0dXJuICgxMDAgKiBtKS50b0ZpeGVkKDEpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiJVwiO1xuICAgIH07XG4gICAgVXRpbC5GaXhlZCA9IGZ1bmN0aW9uIChtLCBuKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQobiB8fCAzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIik7XG4gICAgfTtcbiAgICBVdGlsLmhhc2hDaGVjayA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH0gd2hpbGUgKHRhcmdldCAmJiB0YXJnZXQuZmlyc3RDaGlsZC5ub2RlTmFtZSAhPT0gXCJzdmdcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICAgIFV0aWwuRWxlbWVudCA9IGZ1bmN0aW9uICh0eXBlLCBkZWYpIHtcbiAgICAgICAgdmFyIG9iajtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3ZnOlwiICsgdHlwZSkgOiB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBvYmouaXNNYXRoSmF4ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGRlZikge1xuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gZGVmKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZi5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZShpZCwgZGVmW2lkXS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIFV0aWwuYWRkRWxlbWVudCA9IGZ1bmN0aW9uIChwYXJlbnQsIHR5cGUsIGRlZikge1xuICAgICAgICByZXR1cm4gcGFyZW50LmFwcGVuZENoaWxkKFV0aWwuRWxlbWVudCh0eXBlLCBkZWYpKTtcbiAgICB9O1xuICAgIFV0aWwubGVuZ3RoMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUsIHNpemUpIHtcbiAgICAgICAgaWYgKG11ID09PSB2b2lkIDApIHsgbXUgPSBudWxsOyB9XG4gICAgICAgIGlmIChzaXplID09PSB2b2lkIDApIHsgc2l6ZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGVvZiAobGVuZ3RoKSAhPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGxlbmd0aCA9IGxlbmd0aC50b1N0cmluZygpO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcIlwiKVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5OT1JNQUwpXG4gICAgICAgICAgICByZXR1cm4gMTAwMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLkJJRylcbiAgICAgICAgICAgIHJldHVybiAyMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuU01BTEwpXG4gICAgICAgICAgICByZXR1cm4gNzEwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcImluZmluaXR5XCIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5CSUdESU1FTjtcbiAgICAgICAgaWYgKGxlbmd0aC5tYXRjaCgvbWF0aHNwYWNlJC8pKVxuICAgICAgICAgICAgcmV0dXJuIDEwMDAgKiB0aGlzLk1BVEhTUEFDRVtsZW5ndGhdO1xuICAgICAgICB2YXIgem9vbVNjYWxlID0gcGFyc2VJbnQoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgZW1GYWN0b3IgPSAoem9vbVNjYWxlIHx8IDEpIC8gVXRpbC5lbTtcbiAgICAgICAgdmFyIG1hdGNoID0gbGVuZ3RoLm1hdGNoKC9eXFxzKihbLStdPyg/OlxcLlxcZCt8XFxkKyg/OlxcLlxcZCopPykpPyhwdHxlbXxleHxtdXxweHxwY3xpbnxtbXxjbXwlKT8vKTtcbiAgICAgICAgdmFyIG0gPSBwYXJzZUZsb2F0KG1hdGNoWzFdIHx8IFwiMVwiKSAqIDEwMDAsIHVuaXQgPSBtYXRjaFsyXTtcbiAgICAgICAgaWYgKHNpemUgPT0gbnVsbClcbiAgICAgICAgICAgIHNpemUgPSAxMDAwO1xuICAgICAgICBpZiAobXUgPT0gbnVsbClcbiAgICAgICAgICAgIG11ID0gMTtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZW1cIilcbiAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJleFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLlRlWC54X2hlaWdodCAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcIiVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTAwICogc2l6ZSAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwdFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicGNcIilcbiAgICAgICAgICAgIHJldHVybiBtICogMS4yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJpblwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJjbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMi41NDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibW1cIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvciAvIDI1LjQ7XG4gICAgICAgIGlmICh1bml0ID09PSBcIm11XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDE4ICogbXU7XG4gICAgICAgIHJldHVybiBtICogc2l6ZSAvIDEwMDA7XG4gICAgfTtcbiAgICBVdGlsLmdldFBhZGRpbmcgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gcGFkZGluZykge1xuICAgICAgICAgICAgaWYgKHBhZGRpbmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZCA9IHN0eWxlc1tcInBhZGRpbmdcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdbaWRdID0gVXRpbC5sZW5ndGgyZW0ocGFkKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBwYWRkaW5nIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC5nZXRCb3JkZXJzID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICAgICAgICB2YXIgYm9yZGVyID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH0sIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBib3JkZXIpIHtcbiAgICAgICAgICAgIGlmIChib3JkZXIuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gXCJib3JkZXJcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWRdID0gVXRpbC5sZW5ndGgyZW0oc3R5bGVzW0lEICsgXCJXaWR0aFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiU3R5bGVcIl0gPSBzdHlsZXNbSUQgKyBcIlN0eWxlXCJdO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gc3R5bGVzW0lEICsgXCJDb2xvclwiXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPT09IFwiaW5pdGlhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJvcmRlcltpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaGFzID8gYm9yZGVyIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC50aGlja25lc3MyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSkge1xuICAgICAgICB2YXIgdGhpY2sgPSB0aGlzLlRlWC5ydWxlX3RoaWNrbmVzcztcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLk1FRElVTSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElOKSB7XG4gICAgICAgICAgICByZXR1cm4gMC42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElDSykge1xuICAgICAgICAgICAgcmV0dXJuIDEuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgdGhpY2spO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpKTtcbiAgICB9O1xuICAgIFV0aWwuZWxlbUNvb3Jkc1RvVmlld3BvcnRDb29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChzdmcpKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0U1ZHRWxlbSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmICghZWxlbSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHN2ZyA9IGVsZW0ubm9kZU5hbWUgPT09ICdzdmcnID8gZWxlbSA6IGVsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2Zykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gb3duZXIgU1ZHIGVsZW1lbnQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgfTtcbiAgICBVdGlsLmJveENvbnRhaW5zID0gZnVuY3Rpb24gKGJiLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBiYiAmJiBiYi54IDw9IHggJiYgeCA8PSBiYi54ICsgYmIud2lkdGggJiYgYmIueSA8PSB5ICYmIHkgPD0gYmIueSArIGJiLmhlaWdodDtcbiAgICB9O1xuICAgIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQgPSBmdW5jdGlvbiAobm9kZSwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSBub2RlLmdldEJCICYmIG5vZGUuZ2V0QkIoKTtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3Jkcyhub2RlLkVkaXRhYmxlU1ZHZWxlbSwgeCwgeSk7XG4gICAgICAgIGlmICghYmIgfHwgIXApXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBVdGlsLmJveENvbnRhaW5zKGJiLCBwLngsIHAueSk7XG4gICAgfTtcbiAgICBVdGlsLmhpZ2hsaWdodEJveCA9IGZ1bmN0aW9uIChzdmcsIGJiKSB7XG4gICAgICAgIHZhciBkID0gMTAwO1xuICAgICAgICB2YXIgZHJhd0xpbmUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFV0aWwuU1ZHTlMsICdsaW5lJyk7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnc3Ryb2tlOnJnYigwLDAsMjU1KTtzdHJva2Utd2lkdGg6MjAnKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgyKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkyKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCArIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCwgYmIueSArIGQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGggLSBkLCBiYi55KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSwgYmIueCArIGJiLndpZHRoLCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54LCBiYi55ICsgYmIuaGVpZ2h0IC0gZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkgKyBiYi5oZWlnaHQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKVxuICAgICAgICBdO1xuICAgIH07XG4gICAgVXRpbC5nZXRDdXJzb3JWYWx1ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGlzTmFOKGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uWzBdLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1JzogcmV0dXJuIERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBjYXNlICdkJzogcmV0dXJuIERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2wnOiByZXR1cm4gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICAgICAgY2FzZSAncic6IHJldHVybiBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yIHZhbHVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBVdGlsLlNWR05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xuICAgIFV0aWwuWExJTktOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiO1xuICAgIFV0aWwuTkJTUCA9IFwiXFx1MDBBMFwiO1xuICAgIFV0aWwuQklHRElNRU4gPSAxMDAwMDAwMDtcbiAgICBVdGlsLlRlWCA9IHtcbiAgICAgICAgeF9oZWlnaHQ6IDQzMC41NTQsXG4gICAgICAgIHF1YWQ6IDEwMDAsXG4gICAgICAgIG51bTE6IDY3Ni41MDgsXG4gICAgICAgIG51bTI6IDM5My43MzIsXG4gICAgICAgIG51bTM6IDQ0My43MyxcbiAgICAgICAgZGVub20xOiA2ODUuOTUxLFxuICAgICAgICBkZW5vbTI6IDM0NC44NDEsXG4gICAgICAgIHN1cDE6IDQxMi44OTIsXG4gICAgICAgIHN1cDI6IDM2Mi44OTIsXG4gICAgICAgIHN1cDM6IDI4OC44ODgsXG4gICAgICAgIHN1YjE6IDE1MCxcbiAgICAgICAgc3ViMjogMjQ3LjIxNyxcbiAgICAgICAgc3VwX2Ryb3A6IDM4Ni4xMDgsXG4gICAgICAgIHN1Yl9kcm9wOiA1MCxcbiAgICAgICAgZGVsaW0xOiAyMzkwLFxuICAgICAgICBkZWxpbTI6IDEwMDAsXG4gICAgICAgIGF4aXNfaGVpZ2h0OiAyNTAsXG4gICAgICAgIHJ1bGVfdGhpY2tuZXNzOiA2MCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmcxOiAxMTEuMTExLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzI6IDE2Ni42NjYsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMzogMjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzQ6IDYwMCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmc1OiAxMDAsXG4gICAgICAgIHNjcmlwdHNwYWNlOiAxMDAsXG4gICAgICAgIG51bGxkZWxpbWl0ZXJzcGFjZTogMTIwLFxuICAgICAgICBkZWxpbWl0ZXJmYWN0b3I6IDkwMSxcbiAgICAgICAgZGVsaW1pdGVyc2hvcnRmYWxsOiAzMDAsXG4gICAgICAgIG1pbl9ydWxlX3RoaWNrbmVzczogMS4yNSxcbiAgICAgICAgbWluX3Jvb3Rfc3BhY2U6IDEuNVxuICAgIH07XG4gICAgVXRpbC5NQVRIU1BBQ0UgPSB7XG4gICAgICAgIHZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogMSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpbm1hdGhzcGFjZTogMiAvIDE4LFxuICAgICAgICB0aGlubWF0aHNwYWNlOiAzIC8gMTgsXG4gICAgICAgIG1lZGl1bW1hdGhzcGFjZTogNCAvIDE4LFxuICAgICAgICB0aGlja21hdGhzcGFjZTogNSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpY2ttYXRoc3BhY2U6IDYgLyAxOCxcbiAgICAgICAgdmVyeXZlcnl0aGlja21hdGhzcGFjZTogNyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogLTEgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpbm1hdGhzcGFjZTogLTIgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlubWF0aHNwYWNlOiAtMyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZW1lZGl1bW1hdGhzcGFjZTogLTQgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlja21hdGhzcGFjZTogLTUgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpY2ttYXRoc3BhY2U6IC02IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlja21hdGhzcGFjZTogLTcgLyAxOFxuICAgIH07XG4gICAgcmV0dXJuIFV0aWw7XG59KCkpO1xudmFyIEJCT1hfUkVDVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUkVDVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JFQ1QoaCwgZCwgdywgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGggKyBkO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLnkgPSAtZDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfUkVDVDtcbn0oQkJPWCkpO1xudmFyIEVsZW1lbnRKYXggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVsZW1lbnRKYXgoKSB7XG4gICAgfVxuICAgIHJldHVybiBFbGVtZW50SmF4O1xufSgpKTtcbnZhciBNQmFzZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUJhc2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQmFzZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0QkIgPSBmdW5jdGlvbiAocmVsYXRpdmVUbykge1xuICAgICAgICB2YXIgZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT2ggbm8hIENvdWxkbid0IGZpbmQgZWxlbSBmb3IgdGhpczogXCIsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uIChlZGl0YWJsZVNWRykge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9iai5wcm90b3R5cGUgPSB7fTtcbiAgICAgICAgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnByb3RvdHlwZSkge1xuICAgICAgICAgICAgb2JqW2lkXSA9IHRoaXMucHJvdG90eXBlW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBvYmouZWRpdGFibGVTVkcgPSBlZGl0YWJsZVNWRztcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciByZW5kZXJlZCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzdmcuc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5BZGQocmVuZGVyZWQsIHN2Zy53LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGNoaWxkLnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoc3ZnLnNrZXcgJiYgdGV4dC5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudyAmJiB0ZXh0Lmxlbmd0aCA9PT0gMSAmJiAhdmFyaWFudC5ub0lDKSB7XG4gICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NoaWxkU1ZHID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbaV0gPyB0aGlzLmRhdGFbaV0udG9TVkcoKSA6IG5ldyBCQk9YKCkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkID0gZnVuY3Rpb24gKGksIEhXLCBEKSB7XG4gICAgICAgIGlmIChEID09PSB2b2lkIDApIHsgRCA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7XG4gICAgICAgICAgICBIVzogSFcsXG4gICAgICAgICAgICBEOiBEXG4gICAgICAgIH07XG4gICAgICAgIGlmICghdGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEJCT1goKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS50b1NWRygpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc2F2ZURhdGEgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIGlmICghdGhpcy5FZGl0YWJsZVNWR2RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudyA9IHN2Zy53LCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS54ID0gc3ZnLng7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggPSBzdmcuaCwgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCA9IHN2Zy5kO1xuICAgICAgICBpZiAoc3ZnLnkpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggKz0gc3ZnLnk7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kIC09IHN2Zy55O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuWCAhPSBudWxsKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuWCA9IHN2Zy5YO1xuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS50dyA9IHN2Zy50dztcbiAgICAgICAgaWYgKHN2Zy5za2V3KVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuc2tldyA9IHN2Zy5za2V3O1xuICAgICAgICBpZiAoc3ZnLmljKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaWMgPSBzdmcuaWM7XG4gICAgICAgIGlmICh0aGlzW1wiY2xhc3NcIl0pIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IHRoaXNbXCJjbGFzc1wiXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaWQpIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHRoaXMuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhyZWYpIHtcbiAgICAgICAgICAgIHZhciBhID0gVXRpbC5FbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgICAgICAgXCJjbGFzc1wiOiBcIm1qeC1zdmctaHJlZlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlTlMoVXRpbC5YTElOS05TLCBcImhyZWZcIiwgdGhpcy5ocmVmKTtcbiAgICAgICAgICAgIGEub25jbGljayA9IHRoaXMuU1ZHbGluaztcbiAgICAgICAgICAgIFV0aWwuYWRkRWxlbWVudChhLCBcInJlY3RcIiwge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBzdmcudyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHN2Zy5oICsgc3ZnLmQsXG4gICAgICAgICAgICAgICAgeTogLXN2Zy5kLFxuICAgICAgICAgICAgICAgIGZpbGw6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJwb2ludGVyLWV2ZW50c1wiOiBcImFsbFwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdmcudHlwZSA9PT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZy5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoZy5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5hZGRNTUxjbGFzc2VzKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2FkZENsYXNzKHN2Zy5lbGVtZW50LCBcIm1qeC1zdmctXCIgKyB0aGlzLnR5cGUpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3R5bGUgPSB0aGlzLnN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUgJiYgc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICAgICAgICAgIGlmIChzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmJvcmRlciA9IHN2Zy5lbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSAoc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9PT0gXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdhZGRBdHRyaWJ1dGVzKHN2Zyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRDbGFzcyA9IGZ1bmN0aW9uIChub2RlLCBuYW1lKSB7XG4gICAgICAgIHZhciBjbGFzc2VzID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTtcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCAoY2xhc3NlcyA/IGNsYXNzZXMgKyBcIiBcIiA6IFwiXCIpICsgbmFtZSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy5hdHRyTmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gdGhpcy5hdHRyTmFtZXMsIHNraXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm5vY29weUF0dHJpYnV0ZXMsIGlnbm9yZSA9IE1hdGhKYXguSHViLmNvbmZpZy5pZ25vcmVNTUxhdHRyaWJ1dGVzO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0gKHRoaXMudHlwZSA9PT0gXCJtc3R5bGVcIiA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWF0aC5wcm90b3R5cGUuZGVmYXVsdHMgOiB0aGlzLmRlZmF1bHRzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gY29weS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBjb3B5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChpZ25vcmVbaWRdID09IGZhbHNlIHx8ICghc2tpcFtpZF0gJiYgIWlnbm9yZVtpZF0gJiZcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNbaWRdID09IG51bGwgJiYgdHlwZW9mIChzdmcuZWxlbWVudFtpZF0pID09PSBcInVuZGVmaW5lZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoaWQsIHRoaXMuYXR0cltpZF0pO1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhyZWYgPSB0aGlzLmhyZWYuYW5pbVZhbDtcbiAgICAgICAgaWYgKGhyZWYuY2hhckF0KDApID09PSBcIiNcIikge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IFV0aWwuaGFzaENoZWNrKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGhyZWYuc3Vic3RyKDEpKSk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5zY3JvbGxJbnRvVmlldykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGFyZW50Tm9kZS5zY3JvbGxJbnRvVmlldyh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGhyZWY7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHcHJvY2Vzc1N0eWxlcyA9IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB2YXIgc3R5bGVzID0ge1xuICAgICAgICAgICAgYm9yZGVyOiBVdGlsLmdldEJvcmRlcnMoc3R5bGUpLFxuICAgICAgICAgICAgcGFkZGluZzogVXRpbC5nZXRQYWRkaW5nKHN0eWxlKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXN0eWxlcy5ib3JkZXIpXG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLmJvcmRlcjtcbiAgICAgICAgaWYgKCFzdHlsZXMucGFkZGluZylcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMucGFkZGluZztcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTaXplKVxuICAgICAgICAgICAgc3R5bGVzWydmb250U2l6ZSddID0gc3R5bGUuZm9udFNpemU7XG4gICAgICAgIGlmIChzdHlsZS5jb2xvcilcbiAgICAgICAgICAgIHN0eWxlc1snY29sb3InXSA9IHN0eWxlLmNvbG9yO1xuICAgICAgICBpZiAoc3R5bGUuYmFja2dyb3VuZENvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydiYWNrZ3JvdW5kJ10gPSBzdHlsZS5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5mb250U3R5bGUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTdHlsZSddID0gc3R5bGUuZm9udFN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFdlaWdodClcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gc3R5bGUuZm9udFdlaWdodDtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRGYW1pbHkpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRGYW1pbHknXSA9IHN0eWxlLmZvbnRGYW1pbHk7XG4gICAgICAgIGlmIChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSAmJiBzdHlsZXNbJ2ZvbnRXZWlnaHQnXS5tYXRjaCgvXlxcZCskLykpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRXZWlnaHQnXSA9IChwYXJzZUludChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSkgPiA2MDAgPyBcImJvbGRcIiA6IFwibm9ybWFsXCIpO1xuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFwibW9cIilcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImxzcGFjZVwiLCBcInJzcGFjZVwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPD0gMCB8fCB0aGlzLmhhc1ZhbHVlKFwibHNwYWNlXCIpIHx8IHRoaXMuaGFzVmFsdWUoXCJyc3BhY2VcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmxzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5sc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnJzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5yc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLCBwYXJlbnQgPSB0aGlzLlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQgJiYgcGFyZW50LmlzRW1iZWxsaXNoZWQoKSAmJiBwYXJlbnQuQ29yZSgpID09PSBjb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvcmUgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHZhbHVlcy5sc3BhY2U7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5yc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy5YID0gdmFsdWVzLnJzcGFjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGFjZSA9IHRoaXMudGV4U3BhY2luZygpO1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZSgpO1xuICAgICAgICAgICAgaWYgKHNwYWNlICE9PSBcIlwiKVxuICAgICAgICAgICAgICAgIHN2Zy54ICs9IFV0aWwubGVuZ3RoMmVtKHNwYWNlLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVDb2xvciA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aGNvbG9yXCIsIFwiY29sb3JcIik7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlcyAmJiB0aGlzLnN0eWxlcy5jb2xvciAmJiAhdmFsdWVzLmNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMuY29sb3IgPSB0aGlzLnN0eWxlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmNvbG9yICYmICF0aGlzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhjb2xvciA9IHZhbHVlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgVXRpbC5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLm1hdGhjb2xvcixcbiAgICAgICAgICAgICAgICBzdHJva2U6IHZhbHVlcy5tYXRoY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9yZGVycyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkuYm9yZGVyLCBwYWRkaW5nID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5wYWRkaW5nLCBibGVmdCA9ICgoYm9yZGVycyB8fCB7fSkubGVmdCB8fCAwKSwgcGxlZnQgPSAoKHBhZGRpbmcgfHwge30pLmxlZnQgfHwgMCksIGlkO1xuICAgICAgICB2YWx1ZXMuYmFja2dyb3VuZCA9ICh0aGlzLm1hdGhiYWNrZ3JvdW5kIHx8IHRoaXMuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgKHRoaXMuc3R5bGVzIHx8IHt9KS5iYWNrZ3JvdW5kIHx8IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpO1xuICAgICAgICBpZiAoYmxlZnQgKyBwbGVmdCkge1xuICAgICAgICAgICAgdmFyIGR1cCA9IG5ldyBCQk9YKE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc3ZnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN2Zy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVwW2lkXSA9IHN2Z1tpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHVwLnggPSAwO1xuICAgICAgICAgICAgZHVwLnkgPSAwO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFkZChkdXAsIGJsZWZ0ICsgcGxlZnQsIDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYWRkaW5nKSB7XG4gICAgICAgICAgICBzdmcudyArPSBwYWRkaW5nLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBwYWRkaW5nLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gcGFkZGluZy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgc3ZnLncgKz0gYm9yZGVycy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gYm9yZGVycy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IGJvcmRlcnMuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5iYWNrZ3JvdW5kICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkNPTE9SLlRSQU5TUEFSRU5UKSB7XG4gICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKG5vZGVOYW1lICE9PSBcImdcIiAmJiBub2RlTmFtZSAhPT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gVXRpbC5FbGVtZW50KFwiZ1wiKTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGc7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9SRUNUKHN2Zy5oLCBzdmcuZCwgc3ZnLncsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMuYmFja2dyb3VuZCxcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9KSwgMCwgMCwgZmFsc2UsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICB2YXIgZGQgPSA1O1xuICAgICAgICAgICAgdmFyIHNpZGVzID0ge1xuICAgICAgICAgICAgICAgIGxlZnQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgLWRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIHN2Zy53IC0gYm9yZGVycy5yaWdodCArIGRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHRvcDogW1wiSFwiLCBzdmcudywgMCwgc3ZnLmggLSBib3JkZXJzLnRvcCArIGRkXSxcbiAgICAgICAgICAgICAgICBib3R0b206IFtcIkhcIiwgc3ZnLncsIDAsIC1zdmcuZCAtIGRkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc2lkZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2lkZXMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3JkZXJzW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNpZGUgPSBzaWRlc1tpZF0sIGJveCA9IEJCT1hbc2lkZVswXSArIFwiTElORVwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94KHNpZGVbMV0sIGJvcmRlcnNbaWRdLCBib3JkZXJzW2lkICsgXCJTdHlsZVwiXSwgYm9yZGVyc1tpZCArIFwiQ29sb3JcIl0pLCBzaWRlWzJdLCBzaWRlWzNdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0VmFyaWFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aHZhcmlhbnRcIiwgXCJmb250ZmFtaWx5XCIsIFwiZm9udHdlaWdodFwiLCBcImZvbnRzdHlsZVwiKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB2YWx1ZXMubWF0aHZhcmlhbnQ7XG4gICAgICAgIGlmICh0aGlzLnZhcmlhbnRGb3JtKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCItVGVYLXZhcmlhbnRcIjtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMuaGFzVmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSk7XG4gICAgICAgIGlmICghdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB2YWx1ZXMuZm9udGZhbWlseTtcbiAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB2YWx1ZXMuZm9udHdlaWdodDtcbiAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHZhbHVlcy5mb250c3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB0aGlzLnN0eWxlcy5mb250U3R5bGUpXG4gICAgICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdGhpcy5zdHlsZXMuZm9udFN0eWxlO1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQpXG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQ7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5mYW1pbHkgJiYgdGhpcy5zdHlsZXMuZm9udEZhbWlseSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdGhpcy5zdHlsZXMuZm9udEZhbWlseTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmZhbWlseSAmJiAhdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2JvbGQvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvaXRhbGljLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBmb3JjZUZhbWlseTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb250OiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFsdWVzLmZhbWlseVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFsdWVzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC1zdHlsZVwiXSA9IHZhbHVlcy5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC13ZWlnaHRcIl0gPSB2YWx1ZXMud2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwiYm9sZFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQsXG4gICAgICAgICAgICAgICAgaXRhbGljOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBmcmFrdHVyOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MREZSQUtUVVIsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNDUklQVCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgYm9sZDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULm5vcm1hbCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgXCJib2xkLWZyYWt0dXJcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkZSQUtUVVIsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNjcmlwdFwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0NSSVBULFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnN0eWxlID09PSBcIml0YWxpY1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy5zdHlsZSA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0FOU1NFUklGXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEodmFyaWFudCBpbiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IFwibm9ybWFsXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlRbdmFyaWFudF07XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTY2FsZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHNjYWxlID0gMTtcbiAgICAgICAgaWYgKHRoaXMubXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IHRoaXMuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImZvbnRzaXplXCIpO1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhzaXplID0gKHRoaXMuaXNUb2tlbiA/IHRoaXMgOiB0aGlzLlBhcmVudCgpKS5HZXQoXCJtYXRoc2l6ZVwiKTtcbiAgICAgICAgICAgIGlmICgodGhpcy5zdHlsZXMgfHwge30pLmZvbnRTaXplICYmICF2YWx1ZXMuZm9udHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZm9udHNpemUgPSB0aGlzLnN0eWxlcy5mb250U2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZm9udHNpemUgJiYgIXRoaXMubWF0aHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSB2YWx1ZXMuZm9udHNpemU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdGxldmVsID0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2NhbGUgPSBNYXRoLnBvdyh0aGlzLkdldChcInNjcmlwdHNpemVtdWx0aXBsaWVyXCIpLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRtaW5zaXplID0gVXRpbC5sZW5ndGgyZW0odGhpcy5HZXQoXCJzY3JpcHRtaW5zaXplXCIpKSAvIDEwMDA7XG4gICAgICAgICAgICAgICAgaWYgKHNjYWxlIDwgdmFsdWVzLnNjcmlwdG1pbnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgPSB2YWx1ZXMuc2NyaXB0bWluc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICB0aGlzLm1zY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXRoc2l6ZSkgLyAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcpIHtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb2tlbikge1xuICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSAqPSB0aGlzLm1zY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NhbGUgKiB0aGlzLm1zY2FsZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldE11ID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgbXUgPSAxLCB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIik7XG4gICAgICAgIGlmIChzdmcuc2NhbGUgJiYgc3ZnLnNjYWxlICE9PSAxKSB7XG4gICAgICAgICAgICBtdSA9IDEgLyBzdmcuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCAhPT0gMCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXUgPSBNYXRoLnNxcnQoTWF0aC5wb3codmFsdWVzLnNjcmlwdHNpemVtdWx0aXBsaWVyLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbXU7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdub3RFbXB0eSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHdoaWxlIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoKGRhdGEudHlwZSAhPT0gXCJtcm93XCIgJiYgZGF0YS50eXBlICE9PSBcInRleGF0b21cIikgfHxcbiAgICAgICAgICAgICAgICBkYXRhLmRhdGEubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YSA9IGRhdGEuZGF0YVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgY2FuID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlzRW1iZWxsaXNoZWQoKSkge1xuICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLkNvcmUoKTtcbiAgICAgICAgICAgIGlmIChjb3JlICYmIGNvcmUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjYW4gPSBjb3JlLlNWR2NhblN0cmV0Y2goZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FuICYmIGNvcmUuZm9yY2VTdHJldGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9yY2VTdHJldGNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcoaCwgZCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvU1ZHKHcpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYXV0b2xvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIHRoaXMudHlwZSArIFwiLmpzXCI7XG4gICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIG5hbWUgKyBcIi5qc1wiO1xuICAgICAgICByZXR1cm4gTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBkcmF3IGN1cnNvcicpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIGJiLngsIGJiLnksIGJiLndpZHRoLCBiYi5oZWlnaHQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0U1ZHQkJveCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBlbGVtID0gZWxlbSB8fCB0aGlzLkVkaXRhYmxlU1ZHZWxlbTtcbiAgICAgICAgaWYgKCFlbGVtIHx8ICFlbGVtLm93bmVyU1ZHRWxlbWVudClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGJiID0gZWxlbS5nZXRCQm94KCk7XG4gICAgICAgIGlmIChlbGVtLm5vZGVOYW1lID09PSAndXNlJykge1xuICAgICAgICAgICAgYmIueCArPSBOdW1iZXIoZWxlbS5nZXRBdHRyaWJ1dGUoJ3gnKSk7XG4gICAgICAgICAgICBiYi55ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneScpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gZWxlbS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQoZWxlbS5vd25lclNWR0VsZW1lbnQpO1xuICAgICAgICB2YXIgcHRtcCA9IGVsZW0ub3duZXJTVkdFbGVtZW50LmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHZhciBseCA9IDEgLyAwLCBseSA9IDEgLyAwLCBoeCA9IC0xIC8gMCwgaHkgPSAtMSAvIDA7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54LCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgY2hlY2soYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IGx4LFxuICAgICAgICAgICAgeTogbHksXG4gICAgICAgICAgICB3aWR0aDogaHggLSBseCxcbiAgICAgICAgICAgIGhlaWdodDogaHkgLSBseSxcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gY2hlY2soeCwgeSkge1xuICAgICAgICAgICAgcHRtcC54ID0geDtcbiAgICAgICAgICAgIHB0bXAueSA9IHk7XG4gICAgICAgICAgICB2YXIgcCA9IHB0bXAubWF0cml4VHJhbnNmb3JtKHRyYW5zZm9ybSk7XG4gICAgICAgICAgICBseCA9IE1hdGgubWluKGx4LCBwLngpO1xuICAgICAgICAgICAgbHkgPSBNYXRoLm1pbihseSwgcC55KTtcbiAgICAgICAgICAgIGh4ID0gTWF0aC5tYXgoaHgsIHAueCk7XG4gICAgICAgICAgICBoeSA9IE1hdGgubWF4KGh5LCBwLnkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTUJhc2VNaXhpbjtcbn0oRWxlbWVudEpheCkpO1xudmFyIEJCT1hfR0xZUEggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0dMWVBILCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfR0xZUEgoc2NhbGUsIGlkLCBoLCBkLCB3LCBsLCByLCBwKSB7XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMubiA9IDA7XG4gICAgICAgIHZhciBkZWY7XG4gICAgICAgIHZhciB0ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXI7XG4gICAgICAgIHZhciBjYWNoZSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VGb250Q2FjaGU7XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSAoc2NhbGUgPT09IDEgPyBudWxsIDogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCIpO1xuICAgICAgICBpZiAoY2FjaGUgJiYgIU1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgaWQgPSBcIkVcIiArIHRoaXMubiArIFwiLVwiICsgaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjYWNoZSB8fCAhdGhpcy5nbHlwaHNbaWRdKSB7XG4gICAgICAgICAgICBkZWYgPSB7IFwic3Ryb2tlLXdpZHRoXCI6IHQgfTtcbiAgICAgICAgICAgIGlmIChjYWNoZSlcbiAgICAgICAgICAgICAgICBkZWYuaWQgPSBpZDtcbiAgICAgICAgICAgIGVsc2UgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgZGVmLmQgPSAocCA/IFwiTVwiICsgcCArIFwiWlwiIDogXCJcIik7XG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicGF0aFwiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x5cGhzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcInVzZVwiLCBkZWYpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIFwiI1wiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0oQkJPWCkpO1xudmFyIENoYXJzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDaGFyc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENoYXJzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBDaGFyc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIikucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50ID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCB0ZXh0KSB7XG4gICAgICAgIHZhciBFRElUQUJMRVNWRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIG4sIE4sIGMsIGZvbnQsIFZBUklBTlQsIGksIG0sIGlkLCBNLCBSQU5HRVM7XG4gICAgICAgIGlmICghdmFyaWFudCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhcmlhbnQuZm9yY2VGYW1pbHkpIHtcbiAgICAgICAgICAgIHRleHQgPSBuZXcgQkJPWF9URVhUKHNjYWxlLCB0ZXh0LCB2YXJpYW50LmZvbnQpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKHRleHQpO1xuICAgICAgICAgICAgdGV4dCA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgVkFSSUFOVCA9IHZhcmlhbnQ7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0ZXh0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyaWFudCA9IFZBUklBTlQ7XG4gICAgICAgICAgICBuID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgYyA9IHRleHQuY2hhckF0KGkpO1xuICAgICAgICAgICAgaWYgKG4gPj0gMHhEODAwICYmIG4gPCAweERCRkYpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgbiA9ICgoKG4gLSAweEQ4MDApIDw8IDEwKSArICh0ZXh0LmNoYXJDb2RlQXQoaSkgLSAweERDMDApKSArIDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgaWYgKEZPTlREQVRBLlJlbWFwUGxhbmUxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudiA9IEZPTlREQVRBLlJlbWFwUGxhbmUxKG4sIHZhcmlhbnQpO1xuICAgICAgICAgICAgICAgICAgICBuID0gbnYubjtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IG52LnZhcmlhbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgUkFOR0VTID0gRk9OVERBVEEuUkFOR0VTO1xuICAgICAgICAgICAgICAgIGZvciAoaWQgPSAwLCBNID0gUkFOR0VTLmxlbmd0aDsgaWQgPCBNOyBpZCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLm5hbWUgPT09IFwiYWxwaGFcIiAmJiB2YXJpYW50Lm5vTG93ZXJDYXNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIE4gPSB2YXJpYW50W1wib2Zmc2V0XCIgKyBSQU5HRVNbaWRdLm9mZnNldF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChOICYmIG4gPj0gUkFOR0VTW2lkXS5sb3cgJiYgbiA8PSBSQU5HRVNbaWRdLmhpZ2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLnJlbWFwICYmIFJBTkdFU1tpZF0ucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gTiArIFJBTkdFU1tpZF0ucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gbiAtIFJBTkdFU1tpZF0ubG93ICsgTjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5hZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbiArPSBSQU5HRVNbaWRdLmFkZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcCAmJiB2YXJpYW50LnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgbiA9IHZhcmlhbnQucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAudmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50LnJlbWFwLnZhcmlhbnRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLlJFTUFQW25dICYmICF2YXJpYW50Lm5vUmVtYXApIHtcbiAgICAgICAgICAgICAgICBuID0gRk9OVERBVEEuUkVNQVBbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbblsxXV07XG4gICAgICAgICAgICAgICAgbiA9IG5bMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIChuKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHRleHQgPSBuICsgdGV4dC5zdWJzdHIoaSArIDEpO1xuICAgICAgICAgICAgICAgIG0gPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpID0gLTE7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb250ID0gQ2hhcnNNaXhpbi5sb29rdXBDaGFyKHZhcmlhbnQsIG4pO1xuICAgICAgICAgICAgYyA9IGZvbnRbbl07XG4gICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgIGlmICgoY1s1XSAmJiBjWzVdLnNwYWNlKSB8fCAoY1s1XSA9PT0gXCJcIiAmJiBjWzBdICsgY1sxXSA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLncgKz0gY1syXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBbc2NhbGUsIGZvbnQuaWQgKyBcIi1cIiArIG4udG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCldLmNvbmNhdChjKTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gRihhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQkJPWF9HTFlQSC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IEJCT1hfR0xZUEgucHJvdG90eXBlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2x5cGggPSBuZXcgRihjKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChnbHlwaCwgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0pIHtcbiAgICAgICAgICAgICAgICBjID0gdGhpcy5jcmVhdGVEZWxpbWl0ZXIobiwgMCwgMSwgZm9udCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0uZGlyID09PSBcIlZcIiA/IGMuZCA6IDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuIDw9IDB4RkZGRikge1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIE4gPSBuIC0gMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gPj4gMTApICsgMHhEODAwKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gJiAweDNGRikgKyAweERDMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfVEVYVChzY2FsZSAqIDEwMCAvIEVESVRBQkxFU1ZHLmNvbmZpZy5zY2FsZSwgYywge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6IHZhcmlhbnQuZGVmYXVsdEZhbWlseSB8fCBFRElUQUJMRVNWRy5jb25maWcudW5kZWZpbmVkRmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogKHZhcmlhbnQuaXRhbGljID8gXCJpdGFsaWNcIiA6IFwiXCIpLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6ICh2YXJpYW50LmJvbGQgPyBcImJvbGRcIiA6IFwiXCIpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYm94LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICAgICAgYyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICBjLkFkZChib3gpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYywgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLnNpZ25hbC5Qb3N0KFtcIlNWRyBKYXggLSB1bmtub3duIGNoYXJcIiwgbiwgdmFyaWFudF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAxICYmIGZvbnQuc2tldyAmJiBmb250LnNrZXdbbl0pIHtcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gZm9udC5za2V3W25dICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5sb29rdXBDaGFyID0gZnVuY3Rpb24gKHZhcmlhbnQsIG4pIHtcbiAgICAgICAgdmFyIGksIG07XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXZhcmlhbnQuRk9OVFMpIHtcbiAgICAgICAgICAgIHZhciBGT05UUyA9IEZPTlREQVRBLkZPTlRTO1xuICAgICAgICAgICAgdmFyIGZvbnRzID0gKHZhcmlhbnQuZm9udHMgfHwgRk9OVERBVEEuVkFSSUFOVC5ub3JtYWwuZm9udHMpO1xuICAgICAgICAgICAgaWYgKCEoZm9udHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICBmb250cyA9IFtmb250c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5mb250cyAhPSBmb250cykge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBmb250cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBmb250cy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVFNbZm9udHNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMucHVzaChGT05UU1tmb250c1tpXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdmFyaWFudC5GT05UUy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmb250ID0gdmFyaWFudC5GT05UU1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGZvbnQpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHZhcmlhbnQuRk9OVFM7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkRm9udChmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmb250W25dKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRCbG9jayhmb250LCBuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IFwidW5rbm93blwiXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlciA9IGZ1bmN0aW9uIChjb2RlLCBIVywgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgaWYgKHNjYWxlID09PSB2b2lkIDApIHsgc2NhbGUgPSBudWxsOyB9XG4gICAgICAgIGlmIChmb250ID09PSB2b2lkIDApIHsgZm9udCA9IG51bGw7IH1cbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHNjYWxlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShIVyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgSFcgPSBbSFcsIEhXXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaHcgPSBIV1sxXTtcbiAgICAgICAgSFcgPSBIV1swXTtcbiAgICAgICAgdmFyIGRlbGltID0ge1xuICAgICAgICAgICAgYWxpYXM6IGNvZGUsXG4gICAgICAgICAgICBIVzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGlyOiB1bmRlZmluZWRcbiAgICAgICAgfTtcbiAgICAgICAgd2hpbGUgKGRlbGltLmFsaWFzKSB7XG4gICAgICAgICAgICBjb2RlID0gZGVsaW0uYWxpYXM7XG4gICAgICAgICAgICBkZWxpbSA9IEZPTlREQVRBLkRFTElNSVRFUlNbY29kZV07XG4gICAgICAgICAgICBpZiAoIWRlbGltKSB7XG4gICAgICAgICAgICAgICAgZGVsaW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIEhXOiBbMCwgRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXV0sXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGxvYWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLmxvYWQpIHtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShFRElUQUJMRVNWRy5mb250RGlyICsgXCIvZm9udGRhdGEtXCIgKyBkZWxpbS5sb2FkICsgXCIuanNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGVsaW0uSFcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMF0gKiBzY2FsZSA+PSBIVyAtIDEwIC0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXIgfHwgKGkgPT0gbSAtIDEgJiYgIWRlbGltLnN0cmV0Y2gpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjYWxlICo9IGRlbGltLkhXW2ldWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bM10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSA9IGRlbGltLkhXW2ldWzNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBbY29kZSwgZGVsaW0uSFdbaV1bMV1dLCBmb250KS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSwgTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkZWxpbS5zdHJldGNoKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uZGlyID09IFwiSFwiKSB7XG4gICAgICAgICAgICAgICAgRURJVEFCTEVTVkcuZXh0ZW5kRGVsaW1pdGVySChzdmcsIGh3LCBkZWxpbS5zdHJldGNoLCBzY2FsZSwgZm9udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkZWxpbS5kaXIgPT0gXCJWXCIpIHtcbiAgICAgICAgICAgICAgICBFRElUQUJMRVNWRy5leHRlbmREZWxpbWl0ZXJWKHN2ZywgaHcsIGRlbGltLnN0cmV0Y2gsIHNjYWxlLCBmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5jcmVhdGVDaGFyID0gZnVuY3Rpb24gKHNjYWxlLCBkYXRhLCBmb250KSB7XG4gICAgICAgIHZhciB0ZXh0ID0gXCJcIiwgdmFyaWFudCA9IHtcbiAgICAgICAgICAgIGZvbnRzOiBbZGF0YVsxXV0sXG4gICAgICAgICAgICBub1JlbWFwOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEKSB7XG4gICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gW2RhdGFbMV0gKyBcIi1ib2xkXCIsIGRhdGFbMV1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgKGRhdGFbMV0pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gZGF0YVsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGRhdGFbMF0ubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbMF1baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNF0pIHtcbiAgICAgICAgICAgIHNjYWxlID0gc2NhbGUgKiBkYXRhWzRdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICBpZiAoZGF0YVsyXSkge1xuICAgICAgICAgICAgc3ZnLnggPSBkYXRhWzJdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVszXSkge1xuICAgICAgICAgICAgc3ZnLnkgPSBkYXRhWzNdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs1XSkge1xuICAgICAgICAgICAgc3ZnLmggKz0gZGF0YVs1XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNl0pIHtcbiAgICAgICAgICAgIHN2Zy5kICs9IGRhdGFbNl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmZpbmRCbG9jayA9IGZ1bmN0aW9uIChmb250LCBjKSB7XG4gICAgICAgIGlmIChmb250LlJhbmdlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBmb250LlJhbmdlcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IGZvbnQuUmFuZ2VzW2ldWzBdKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gZm9udC5SYW5nZXNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBmb250LlJhbmdlc1tpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGZvbnQuUmFuZ2VzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9udC5SYW5nZXNbal1bMl0gPT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQuUmFuZ2VzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQuZGlyZWN0b3J5ICsgXCIvXCIgKyBmaWxlICsgXCIuanNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvYWRGb250ID0gZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmZvbnREaXIgKyBcIi9cIiArIGZpbGUpKTtcbiAgICB9O1xuICAgIHJldHVybiBDaGFyc01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgRW50aXR5TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhFbnRpdHlNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBFbnRpdHlNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEVudGl0eU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy50b1N0cmluZygpLnJlcGxhY2UoL1tcXHUyMDYxLVxcdTIwNjRdL2csIFwiXCIpO1xuICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgIHRleHQgPSByZW1hcCh0ZXh0LCBjaGFycyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW50aXR5TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBIb2xlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoSG9sZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBIb2xlKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgSG9sZS5wcm90b3R5cGUuSW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50eXBlID0gXCJob2xlXCI7XG4gICAgICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBIb2xlLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAoZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuc2ggPSBoO1xuICAgICAgICAgICAgc3ZnLnNkID0gZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOT05UUklWSUFMIEhPTEUhISEnKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdmFyIGhvbGUgPSBuZXcgQkJPWF9SRUNUKDcwMCAqIHRoaXMuc2NhbGUsIDAsIDUyNSAqIHRoaXMuc2NhbGUsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZScsXG4gICAgICAgICAgICBzdHJva2U6ICdibHVlJyxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6ICcyMCdcbiAgICAgICAgfSk7XG4gICAgICAgIHN2Zy5BZGQoaG9sZSwgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb2xlIGRvZXMgbm90IGhhdmUgYSBjaGlsZCcpO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGJib3gud2lkdGggLyAyLjApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBIb2xlO1xufShNQmFzZU1peGluKSk7XG52YXIgTUFjdGlvbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUFjdGlvbk1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1BY3Rpb25NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1BY3Rpb25NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTUFjdGlvbk1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgQkJPWF9TVkcgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1NWRywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1NWRygpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgbnVsbCwgXCJzdmdcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9TVkc7XG59KEJCT1gpKTtcbnZhciBNYXRoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXRoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWF0aE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHNwYW4sIGRpdiwgcmVwbGFjZSkge1xuICAgICAgICB2YXIgQ09ORklHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnO1xuICAgICAgICB0aGlzLmxvYWRUZXhpZnkoKTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbMF0pXG4gICAgICAgICAgICByZXR1cm4gc3BhbjtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50O1xuICAgICAgICBpZiAoU3RyaW5nKE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IFwiMFwiO1xuICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgZGF0YVN2ZyA9IHRoaXMuZGF0YVswXS50b1NWRygpO1xuICAgICAgICBib3guQWRkKGRhdGFTdmcsIDAsIDAsIHRydWUpO1xuICAgICAgICBib3guQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICBVdGlsLkVsZW1lbnQoYm94LmVsZW1lbnQsIHtcbiAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAwLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgVXRpbC5YTElOS05TKTtcbiAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbCA9IE1hdGgubWF4KC1zdmcubCwgMCksIHIgPSBNYXRoLm1heChzdmcuciAtIHN2Zy53LCAwKTtcbiAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIFV0aWwuRXgobCArIHN2Zy53ICsgcikpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgVXRpbC5FeChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0pKTtcbiAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5EIC0gMiAqIFV0aWwuZW0pO1xuICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gVXRpbC5FeCgtbCk7XG4gICAgICAgIHN0eWxlLm1hcmdpblJpZ2h0ID0gVXRpbC5FeCgtcik7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgVXRpbC5GaXhlZCgtbCwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoLXN2Zy5IIC0gVXRpbC5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICBVdGlsLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSwgMSkpO1xuICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gVXRpbC5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgPiBzdmcuZCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gVXRpbC5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsdHRleHQgPSB0aGlzLkdldChcImFsdHRleHRcIik7XG4gICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcInJvbGVcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICBzdmcuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdyZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91cyA9IHNwYW4ucXVlcnlTZWxlY3RvcignLnJlbmRlcmVkLXN2Zy1vdXRwdXQnKTtcbiAgICAgICAgaWYgKHJlcGxhY2UgJiYgcHJldmlvdXMpIHtcbiAgICAgICAgICAgIHNwYW4ucmVwbGFjZUNoaWxkKHN2Zy5lbGVtZW50LCBwcmV2aW91cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuZWxlbWVudCA9IG51bGw7XG4gICAgICAgIGlmICghdGhpcy5pc011bHRpbGluZSAmJiB0aGlzLkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIiAmJiAhc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdmFsdWVzLmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSBcIjBcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5pbmRlbnRzaGlmdCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCAxLCB0aGlzLmVkaXRhYmxlU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICAgICAgc2hpZnQgKz0gKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5SSUdIVCA/IC1pbmRlbnQgOiBpbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LnN0eWxlLnRleHRBbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbjtcbiAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydChzdHlsZSwgKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiBVdGlsLkV4KHNoaWZ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pW3ZhbHVlcy5pbmRlbnRhbGlnbl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzcGFuO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5sb2FkVGV4aWZ5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZEZpbGUoJ3RleGlmeScpO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5pbnN0YWxsQ3Vyc29yTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoYXQub3RoZXJDdXJzb3JzID0ge307XG4gICAgICAgIHZhciBpZCA9ICQodGhhdC5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmF0dHIoXCJpZFwiKTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgZHJhd19vdGhlcl9jdXJzb3JcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzWzFdICE9IGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvY2Vzc2luZyBkcmF3IG90aGVyIGN1cnNvclwiKTtcbiAgICAgICAgICAgIHZhciBjdXJzb3JJRCA9IGFyZ3NbMl07XG4gICAgICAgICAgICB2YXIgcGF0aCA9IGFyZ3NbM107XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBhcmdzWzRdO1xuICAgICAgICAgICAgdmFyIGNvbG9yID0gYXJnc1s1XTtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhhdDtcbiAgICAgICAgICAgIHdoaWxlIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5kYXRhW3BhdGguc2hpZnQoKV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShjdXJzb3JJRCBpbiB0aGF0Lm90aGVyQ3Vyc29ycykpIHtcbiAgICAgICAgICAgICAgICB0aGF0Lm90aGVyQ3Vyc29yc1tjdXJzb3JJRF0gPSBuZXcgQ3Vyc29yKGNvbG9yLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0aGF0Lm90aGVyQ3Vyc29yc1tjdXJzb3JJRF07XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKG5vZGUsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIGN1cnNvci5kcmF3KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBjbGVhcl9vdGhlcl9jdXJzb3JcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvY2Vzc2luZyBjbGVhciBvdGhlciBjdXJzb3JcIik7XG4gICAgICAgICAgICB2YXIgY3Vyc29ySUQgPSBhcmdzWzFdO1xuICAgICAgICAgICAgaWYgKGN1cnNvcklEIGluIHRoYXQub3RoZXJDdXJzb3JzKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdLmJsdXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUub25Nb3ZlQ3Vyc29yTGVmdCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICB0aGlzLm9uTW92ZUN1cnNvckxlZnQgPSBmbjtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUub25Nb3ZlQ3Vyc29yUmlnaHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgdGhpcy5vbk1vdmVDdXJzb3JSaWdodCA9IGZuO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5vbk1vdmVDdXJzb3JVcCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICB0aGlzLm9uTW92ZUN1cnNvclVwID0gZm47XG4gICAgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLm9uTW92ZUN1cnNvckRvd24gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgdGhpcy5vbk1vdmVDdXJzb3JEb3duID0gZm47XG4gICAgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHZhciBpZCA9ICQodGhpcy5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmF0dHIoXCJpZFwiKTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBpZiAodGhhdC5vbk1vdmVDdXJzb3JMZWZ0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHRoYXQub25Nb3ZlQ3Vyc29yTGVmdCgpOyB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBpZiAodGhhdC5vbk1vdmVDdXJzb3JSaWdodCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyB0aGF0Lm9uTW92ZUN1cnNvclJpZ2h0KCk7IH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIGlmICh0aGF0Lm9uTW92ZUN1cnNvclVwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHRoYXQub25Nb3ZlQ3Vyc29yVXAoKTsgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgaWYgKHRoYXQub25Nb3ZlQ3Vyc29yRG93bikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyB0aGF0Lm9uTW92ZUN1cnNvckRvd24oKTsgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIE1hdGhNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1FbmNsb3NlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRW5jbG9zZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FbmNsb3NlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRW5jbG9zZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNRW5jbG9zZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUVycm9yTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRXJyb3JNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRXJyb3JNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FcnJvck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLnN0eWxlcy5mb250U2l6ZSB8fCAxKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGRlZiA9IChzY2FsZSAhPT0gMSA/IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCJcbiAgICAgICAgfSA6IHt9KTtcbiAgICAgICAgdmFyIGJib3ggPSBuZXcgQkJPWChkZWYpO1xuICAgICAgICBiYm94LkFkZCh0aGlzLlNWR2NoaWxkU1ZHKDApKTtcbiAgICAgICAgYmJveC5DbGVhbigpO1xuICAgICAgICBpZiAoc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIGJib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGFkanVzdCA9IFtcIndcIiwgXCJoXCIsIFwiZFwiLCBcImxcIiwgXCJyXCIsIFwiRFwiLCBcIkhcIl07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGFkanVzdC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBiYm94W2FkanVzdFtpXV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChiYm94KTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBVdGlsLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubWVycm9yU3R5bGVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydCh0aGlzLnN0eWxlcywgdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1FcnJvck1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUZlbmNlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZlbmNlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GZW5jZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GZW5jZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLm9wZW4pIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEub3Blbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMSwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW1wic2VwXCIgKyBpXSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW1wic2VwXCIgKyBpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEuY2xvc2UpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEuY2xvc2UpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNRmVuY2VkTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRnJhY01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZyYWNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRnJhY01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIGZyYWMgPSBuZXcgQkJPWCgpO1xuICAgICAgICBmcmFjLnNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKGZyYWMpO1xuICAgICAgICB2YXIgbnVtID0gdGhpcy5TVkdjaGlsZFNWRygwKSwgZGVuID0gdGhpcy5TVkdjaGlsZFNWRygxKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwibGluZXRoaWNrbmVzc1wiLCBcIm51bWFsaWduXCIsIFwiZGVub21hbGlnblwiLCBcImJldmVsbGVkXCIpO1xuICAgICAgICB2YXIgaXNEaXNwbGF5ID0gdmFsdWVzLmRpc3BsYXlzdHlsZTtcbiAgICAgICAgdmFyIGEgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlO1xuICAgICAgICBpZiAodmFsdWVzLmJldmVsbGVkKSB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSAoaXNEaXNwbGF5ID8gNDAwIDogMTUwKTtcbiAgICAgICAgICAgIHZhciBIID0gTWF0aC5tYXgobnVtLmggKyBudW0uZCwgZGVuLmggKyBkZW4uZCkgKyAyICogZGVsdGE7XG4gICAgICAgICAgICB2YXIgYmV2ZWwgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDJGLCBIKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKG51bSwgMCwgKG51bS5kIC0gbnVtLmgpIC8gMiArIGEgKyBkZWx0YSk7XG4gICAgICAgICAgICBmcmFjLkFkZChiZXZlbCwgbnVtLncgLSBkZWx0YSAvIDIsIChiZXZlbC5kIC0gYmV2ZWwuaCkgLyAyICsgYSk7XG4gICAgICAgICAgICBmcmFjLkFkZChkZW4sIG51bS53ICsgYmV2ZWwudyAtIGRlbHRhLCAoZGVuLmQgLSBkZW4uaCkgLyAyICsgYSAtIGRlbHRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBXID0gTWF0aC5tYXgobnVtLncsIGRlbi53KTtcbiAgICAgICAgICAgIHZhciB0ID0gVXRpbC50aGlja25lc3MyZW0odmFsdWVzLmxpbmV0aGlja25lc3MsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGUsIHAsIHEsIHUsIHY7XG4gICAgICAgICAgICB2YXIgbXQgPSBVdGlsLlRlWC5taW5fcnVsZV90aGlja25lc3MgLyBVdGlsLmVtICogMTAwMDtcbiAgICAgICAgICAgIGlmIChpc0Rpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICB1ID0gVXRpbC5UZVgubnVtMTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdSA9ICh0ID09PSAwID8gVXRpbC5UZVgubnVtMyA6IFV0aWwuVGVYLm51bTIpO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1ICo9IHNjYWxlO1xuICAgICAgICAgICAgdiAqPSBzY2FsZTtcbiAgICAgICAgICAgIGlmICh0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyA3IDogMykgKiBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcywgMiAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgdiArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy53ID0gVztcbiAgICAgICAgICAgICAgICB0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gMiA6IDApICogbXQgKyB0LCB0IC8gMiArIDEuNSAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoYSArIHQgLyAyKTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcSA9IChhIC0gdCAvIDIpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMuQWRkKG5ldyBCQk9YX1JFQ1QodCAvIDIsIHQgLyAyLCBXICsgMiAqIHQpLCAwLCBhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWMuQWxpZ24obnVtLCB2YWx1ZXMubnVtYWxpZ24sIHQsIHUpO1xuICAgICAgICAgICAgZnJhYy5BbGlnbihkZW4sIHZhbHVlcy5kZW5vbWFsaWduLCB0LCAtdik7XG4gICAgICAgIH1cbiAgICAgICAgZnJhYy5DbGVhbigpO1xuICAgICAgICBzdmcuQWRkKGZyYWMsIDAsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnRleFdpdGhEZWxpbXMgJiYgIXRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UuY2FsbCh0aGlzLCBzdmcpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBtaWRsaW5lWSA9IGJiLnkgKyAoYmIuaGVpZ2h0IC8gMi4wKTtcbiAgICAgICAgdmFyIG1pZGxpbmVYID0gYmIueCArIChiYi53aWR0aCAvIDIuMCk7XG4gICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAoeCA8IG1pZGxpbmVYKSA/IDAgOiAxLFxuICAgICAgICAgICAgaGFsZjogKHkgPCBtaWRsaW5lWSkgPyAwIDogMSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvcicpO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdmFyIGlzTnVtZXJhdG9yID0gdGhpcy5kYXRhWzBdID09PSBjaGlsZDtcbiAgICAgICAgdmFyIGlzRGVub21pbmF0b3IgPSB0aGlzLmRhdGFbMV0gPT09IGNoaWxkO1xuICAgICAgICBpZiAoIWlzTnVtZXJhdG9yICYmICFpc0Rlbm9taW5hdG9yKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTcGVjaWZpZWQgY2hpbGQgbm90IGZvdW5kIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIGlmIChpc051bWVyYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0Rlbm9taW5hdG9yICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2VlcCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKGlzTnVtZXJhdG9yID8gMCA6IDEsIGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9IYWxmID0gZnVuY3Rpb24gKGhhbGYsIGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaGFsZl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICAgIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW2hhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmIChiYiAmJiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMikge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIGhhbGY6IGhhbGYsXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDAsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9EZW5vbWluYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigxLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5MRUZUOlxuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uUklHSFQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVswXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICAgICAgICAgIGhhbGY6IDAsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDAgOiAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uVVA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5ET1dOOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPyBiYm94LndpZHRoICsgMTAwIDogLTEwMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICByZXR1cm4gTUZyYWNNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1HbHlwaE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUdseXBoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUdseXBoTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNR2x5cGhNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICA7XG4gICAgcmV0dXJuIE1HbHlwaE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTU11bHRpU2NyaXB0c01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTU11bHRpU2NyaXB0c01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1NdWx0aVNjcmlwdHNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1NdWx0aVNjcmlwdHNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTU11bHRpU2NyaXB0c01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTW5NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW5NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1uTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZ2V0Q3Vyc29yTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLmRhdGFbMF0ubGVuZ3RoO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgYXMgY3Vyc29yIGNvbnRhaW5lcicpO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmdldEN1cnNvckxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmdldEN1cnNvckxlbmd0aCgpOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTW5NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1vTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNb01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1vTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNb01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICBpZiAoSFcgPT09IHZvaWQgMCkgeyBIVyA9IG51bGw7IH1cbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImxhcmdlb3BcIiwgXCJkaXNwbGF5c3R5bGVcIik7XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwiLWxhcmdlT3BcIiA6IFwiLXNtYWxsT3BcIl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICB2YXIgaXNTY3JpcHQgPSAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKSAmJiB0aGlzICE9PSBwYXJlbnQuZGF0YVswXSk7XG4gICAgICAgIHZhciBtYXBjaGFycyA9IChpc1NjcmlwdCA/IHRoaXMucmVtYXBDaGFycyA6IG51bGwpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXVuZGVyb3ZlcikgJiZcbiAgICAgICAgICAgIHRoaXMuQ29yZVRleHQocGFyZW50LmRhdGFbcGFyZW50LmJhc2VdKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBvdmVyID0gcGFyZW50LmRhdGFbcGFyZW50Lm92ZXJdLCB1bmRlciA9IHBhcmVudC5kYXRhW3BhcmVudC51bmRlcl07XG4gICAgICAgICAgICBpZiAob3ZlciAmJiB0aGlzID09PSBvdmVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnRcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgbWFwY2hhcnMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFVOREVSO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1NjcmlwdCAmJiB0aGlzLmRhdGEuam9pbihcIlwiKS5tYXRjaCgvWydgXCJcXHUwMEI0XFx1MjAzMi1cXHUyMDM3XFx1MjA1N10vKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbXCItVGVYLXZhcmlhbnRcIl07XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGFbaV0udG9TVkcodmFyaWFudCwgc2NhbGUsIHRoaXMucmVtYXAsIG1hcGNoYXJzKSwgeCA9IHN2Zy53O1xuICAgICAgICAgICAgICAgIGlmICh4ID09PSAwICYmIC10ZXh0LmwgPiAxMCAqIHRleHQudykge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IC10ZXh0Lmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQodGV4dCwgeCwgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRleHQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IHRleHQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmxhcmdlb3ApIHtcbiAgICAgICAgICAgIHN2Zy55ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoc3ZnLmggLSBzdmcuZCkgLyAyIC8gc2NhbGU7XG4gICAgICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXRoaXMuR2V0KFwic3RyZXRjaHlcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYyA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoYy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFtjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVJbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjID0gRk9OVERBVEEuREVMSU1JVEVSU1tjLmNoYXJDb2RlQXQoMCldO1xuICAgICAgICB2YXIgY2FuID0gKGMgJiYgYy5kaXIgPT0gZGlyZWN0aW9uLnN1YnN0cigwLCAxKSk7XG4gICAgICAgIGlmICghY2FuKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSBjYW4gJiYgKHRoaXMuR2V0KFwibWluc2l6ZVwiLCB0cnVlKSB8fCB0aGlzLkdldChcIm1heHNpemVcIiwgdHJ1ZSkpO1xuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzeW1tZXRyaWNcIiwgXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiKTtcbiAgICAgICAgdmFyIGF4aXMgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHN2Zy5zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2ZyksIEg7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gMiAqIE1hdGgubWF4KGggLSBheGlzLCBkICsgYXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gaCArIGQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIEggPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIEgpKTtcbiAgICAgICAgaWYgKEggIT0gdmFsdWVzLm1pbnNpemUpIHtcbiAgICAgICAgICAgIEggPSBbTWF0aC5tYXgoSCAqIFV0aWwuVGVYLmRlbGltaXRlcmZhY3RvciAvIDEwMDAsIEggLSBVdGlsLlRlWC5kZWxpbWl0ZXJzaG9ydGZhbGwpLCBIXTtcbiAgICAgICAgfVxuICAgICAgICBzdmcgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCBILCBzdmcuc2NhbGUpO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAvIDIgKyBheGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAqIGggLyAoaCArIGQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy55ID0gSCAtIHN2Zy5oO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiLCBcIm1hdGh2YXJpYW50XCIsIFwiZm9udHdlaWdodFwiKTtcbiAgICAgICAgaWYgKCh2YWx1ZXMuZm9udHdlaWdodCA9PT0gXCJib2xkXCIgfHwgcGFyc2VJbnQodmFsdWVzLmZvbnR3ZWlnaHQpID49IDYwMCkgJiZcbiAgICAgICAgICAgICF0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHZhcmlhbnQgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB3ID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCB3KSk7XG4gICAgICAgIHN2ZyA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIHcsIHN2Zy5zY2FsZSwgdmFsdWVzLm1hdGh2YXJpYW50KTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1vTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUGFkZGVkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGFkZGVkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBhZGRlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgcGFkID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIiwgXCJsc3BhY2VcIiwgXCJ2b2Zmc2V0XCIpLCBYID0gMCwgWSA9IDA7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSkge1xuICAgICAgICAgICAgICAgIFggPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy5sc3BhY2UsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMudm9mZnNldCkge1xuICAgICAgICAgICAgICAgIFkgPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy52b2Zmc2V0LCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaCA9IHBhZC5oLCBkID0gcGFkLmQsIHcgPSBwYWQudywgeSA9IHBhZC55O1xuICAgICAgICAgICAgc3ZnLkFkZChwYWQsIFgsIFkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBzdmcuaCA9IGggKyB5O1xuICAgICAgICAgICAgc3ZnLmQgPSBkIC0geTtcbiAgICAgICAgICAgIHN2Zy53ID0gdztcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmhlaWdodCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5oID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuaGVpZ2h0LCBtdSwgXCJoXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5kZXB0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5kID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuZGVwdGgsIG11LCBcImRcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLndpZHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy53aWR0aCwgbXUsIFwid1wiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaCA+IHN2Zy5IKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkggPSBzdmcuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChzdmcuZCA+IHN2Zy5EKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkQgPSBzdmcuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTVBhZGRlZE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVBoYW50b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QaGFudG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBoYW50b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QaGFudG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUNoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1QaGFudG9tTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3FydE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNxcnRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3FydE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApO1xuICAgICAgICB2YXIgcnVsZTtcbiAgICAgICAgdmFyIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIHZhciBxO1xuICAgICAgICB2YXIgSDtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoYywgZCwgdGhpcyk7XG4gICAgfTtcbiAgICBNU3FydE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoYywgZCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVNxcnRNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1Sb290TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm9vdE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb290TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCk7XG4gICAgICAgIHZhciBydWxlO1xuICAgICAgICB2YXIgc3VyZDtcbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgdmFyIHE7XG4gICAgICAgIHZhciBIO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIoMHgyMjFBLCBILCBzY2FsZSk7XG4gICAgICAgIGlmIChzdXJkLmggKyBzdXJkLmQgPiBIKSB7XG4gICAgICAgICAgICBxID0gKChzdXJkLmggKyBzdXJkLmQpIC0gKEggLSB0KSkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGUgPSBuZXcgQkJPWF9SRUNUKHQsIDAsIGJhc2Uudyk7XG4gICAgICAgIEggPSBiYXNlLmggKyBxICsgdDtcbiAgICAgICAgeCA9IHRoaXMuU1ZHYWRkUm9vdChzdmcsIHN1cmQsIHgsIHN1cmQuaCArIHN1cmQuZCAtIEgsIHNjYWxlKTtcbiAgICAgICAgc3ZnLkFkZChzdXJkLCB4LCBIIC0gc3VyZC5oKTtcbiAgICAgICAgc3ZnLkFkZChydWxlLCB4ICsgc3VyZC53LCBIIC0gcnVsZS5oKTtcbiAgICAgICAgc3ZnLkFkZChiYXNlLCB4ICsgc3VyZC53LCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5oICs9IHQ7XG4gICAgICAgIHN2Zy5IICs9IHQ7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHZhciBkeCA9IChzdXJkLmlzTXVsdGlDaGFyID8gLjU1IDogLjY1KSAqIHN1cmQudztcbiAgICAgICAgaWYgKHRoaXMuZGF0YVsxXSkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmRhdGFbMV0udG9TVkcoKTtcbiAgICAgICAgICAgIHJvb3QueCA9IDA7XG4gICAgICAgICAgICB2YXIgaCA9IHRoaXMuU1ZHcm9vdEhlaWdodChzdXJkLmggKyBzdXJkLmQsIHNjYWxlLCByb290KSAtIGQ7XG4gICAgICAgICAgICB2YXIgdyA9IE1hdGgubWluKHJvb3Qudywgcm9vdC5yKTtcbiAgICAgICAgICAgIHggPSBNYXRoLm1heCh3LCBkeCk7XG4gICAgICAgICAgICBzdmcuQWRkKHJvb3QsIHggLSB3LCBoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGR4ID0geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCAtIGR4O1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHcm9vdEhlaWdodCA9IGZ1bmN0aW9uIChkLCBzY2FsZSwgcm9vdCkge1xuICAgICAgICByZXR1cm4gLjQ1ICogKGQgLSA5MDAgKiBzY2FsZSkgKyA2MDAgKiBzY2FsZSArIE1hdGgubWF4KDAsIHJvb3QuZCAtIDc1KTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoYywgZCwgdGhpcyk7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoYywgZCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvb3RNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIEJCT1hfUk9XID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ST1csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ST1coKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmVsZW1zID0gW107XG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLnNkID0gMDtcbiAgICB9XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLkNoZWNrID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRhdGEudG9TVkcoKTtcbiAgICAgICAgdGhpcy5lbGVtcy5wdXNoKHN2Zyk7XG4gICAgICAgIGlmIChkYXRhLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgc3ZnLm1tbCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oID4gdGhpcy5zaCkge1xuICAgICAgICAgICAgdGhpcy5zaCA9IHN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCA+IHRoaXMuc2QpIHtcbiAgICAgICAgICAgIHRoaXMuc2QgPSBzdmcuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLlN0cmV0Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5lbGVtcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSB0aGlzLmVsZW1zW2ldLCBtbWwgPSBzdmcubW1sO1xuICAgICAgICAgICAgaWYgKG1tbCkge1xuICAgICAgICAgICAgICAgIGlmIChtbWwuZm9yY2VTdHJldGNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuaCAhPT0gdGhpcy5zaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmQgIT09IHRoaXMuc2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnID0gbW1sLlNWR3N0cmV0Y2hWKHRoaXMuc2gsIHRoaXMuc2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkhXID0gdGhpcy5zaDtcbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkQgPSB0aGlzLnNkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWMgPSBzdmcuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuQWRkKHN2ZywgdGhpcy53LCAwLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5lbGVtcztcbiAgICB9O1xuICAgIHJldHVybiBCQk9YX1JPVztcbn0oQkJPWCkpO1xudmFyIE1Sb3dNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZvY3VzIScpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAoZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuc2ggPSBoO1xuICAgICAgICAgICAgc3ZnLnNkID0gZDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT09IDEgJiYgdGhpcy5kYXRhWzBdKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YVswXS5FZGl0YWJsZVNWR2RhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5za2V3KSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBkYXRhLnNrZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuU1ZHbGluZUJyZWFrcyhzdmcpKVxuICAgICAgICAgICAgc3ZnID0gdGhpcy5TVkdtdWx0aWxpbmUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR2xpbmVCcmVha3MgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy5wYXJlbnQubGluZWJyZWFrQ29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWMgJiZcbiAgICAgICAgICAgIHN2Zy53ID4gdGhpcy5lZGl0YWJsZVNWRy5saW5lYnJlYWtXaWR0aCkgfHwgdGhpcy5oYXNOZXdsaW5lKCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR211bHRpbGluZSA9IGZ1bmN0aW9uIChzcGFuKSB7XG4gICAgICAgIHJldHVybiBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZShcIm11bHRpbGluZVwiKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIHcpLCBzdmcudywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvclBhc3N0aHJvdWdoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4ICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJiLnggKyAoYmIud2lkdGggLyAyKTtcbiAgICAgICAgICAgIGlmICh4IDwgbWlkcG9pbnQpIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5kYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoaWxkUG9zaXRpb24gPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gY3Vyc29yLnBvc2l0aW9uIC0gMSA6IGN1cnNvci5wb3NpdGlvbjtcbiAgICAgICAgaWYgKGN1cnNvci5tb2RlID09PSBjdXJzb3IuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW2NoaWxkUG9zaXRpb25dLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBwcmVlZGdlO1xuICAgICAgICB2YXIgcG9zdGVkZ2U7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBiYm94Lng7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJlYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBwcmVib3gueCArIHByZWJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IGJib3gueCArIGJib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9zdGJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gcG9zdGJveC54O1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gKHBvc3RlZGdlICsgcHJlZWRnZSkgLyAyO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uU3RhcnQubm9kZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgdmFyIGN1ciA9IGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlO1xuICAgICAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLnBhcmVudCA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZGF0YS5pbmRleE9mKGN1cikgKyAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyID0gY3VyLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnNlbGVjdGlvbkVuZC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggc2VsZWN0aW9uU3RhcnQgbm90IGluIG1yb3dcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbihjdXJzb3Iuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIGN1cnNvci5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIGlmIChwb3MxID09PSBwb3MyKSB7XG4gICAgICAgICAgICBjdXJzb3IuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeDEgPSB0aGlzLmRhdGFbcG9zMV0uZ2V0U1ZHQkJveCgpLng7XG4gICAgICAgIHZhciBwb3MyYmIgPSB0aGlzLmRhdGFbcG9zMiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHgyID0gcG9zMmJiLnggKyBwb3MyYmIud2lkdGg7XG4gICAgICAgIHZhciB3aWR0aCA9IHgyIC0geDE7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdIaWdobGlnaHRBdChzdmdlbGVtLCB4MSwgYmIueSwgd2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvd01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTXNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1zTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTXNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1zTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1zTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3BhY2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TcGFjZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcGFjZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNwYWNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIpO1xuICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLm1hdGhiYWNrZ3JvdW5kO1xuICAgICAgICBpZiAodGhpcy5iYWNrZ3JvdW5kICYmICF0aGlzLm1hdGhiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLmJhY2tncm91bmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5tc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICBzdmcuaCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5oZWlnaHQsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcuZCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5kZXB0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMud2lkdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBpZiAoc3ZnLncgPCAwKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oIDwgLXN2Zy5kKSB7XG4gICAgICAgICAgICBzdmcuZCA9IC1zdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBzdmcubCA9IDA7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3BhY2VNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIEJCT1hfTlVMTCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTlVMTCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05VTEwoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBhcmdzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLkNsZWFuKCk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05VTEw7XG59KEJCT1gpKTtcbnZhciBNU3R5bGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdHlsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdHlsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgbWF0aCA9IHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBpZiAobWF0aC5pYykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IG1hdGguaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoSCh3KSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hWKGgsIGQpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIHJldHVybiBNU3R5bGVNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TdWJTdXBNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdWJTdXBNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3ViU3VwTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLmVuZGluZ1BvcyA9IDE7XG4gICAgfVxuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCh0aGlzLmJhc2UsIEhXLCBEKSk7XG4gICAgICAgIHZhciBzc2NhbGUgPSAodGhpcy5kYXRhW3RoaXMuc3VwXSB8fCB0aGlzLmRhdGFbdGhpcy5zdWJdIHx8IHRoaXMpLlNWR2dldFNjYWxlKCk7XG4gICAgICAgIHZhciB4X2hlaWdodCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGUsIHMgPSBVdGlsLlRlWC5zY3JpcHRzcGFjZSAqIHNjYWxlO1xuICAgICAgICB2YXIgc3VwLCBzdWI7XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1cF0pKSB7XG4gICAgICAgICAgICBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdXAudyArPSBzO1xuICAgICAgICAgICAgc3VwLnIgPSBNYXRoLm1heChzdXAudywgc3VwLnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1Yl0pKSB7XG4gICAgICAgICAgICBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdWIudyArPSBzO1xuICAgICAgICAgICAgc3ViLnIgPSBNYXRoLm1heChzdWIudywgc3ViLnIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBxID0gVXRpbC5UZVguc3VwX2Ryb3AgKiBzc2NhbGUsIHIgPSBVdGlsLlRlWC5zdWJfZHJvcCAqIHNzY2FsZTtcbiAgICAgICAgdmFyIHUgPSBiYXNlLmggKyAoYmFzZS55IHx8IDApIC0gcSwgdiA9IGJhc2UuZCAtIChiYXNlLnkgfHwgMCkgKyByLCBkZWx0YSA9IDAsIHA7XG4gICAgICAgIGlmIChiYXNlLmljKSB7XG4gICAgICAgICAgICBiYXNlLncgLT0gYmFzZS5pYztcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0gJiZcbiAgICAgICAgICAgICh0aGlzLmRhdGFbdGhpcy5iYXNlXS50eXBlID09PSBcIm1pXCIgfHwgdGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtb1wiKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgYmFzZS5zY2FsZSA9PT0gMSAmJlxuICAgICAgICAgICAgICAgICFiYXNlLnN0cmV0Y2hlZCAmJiAhdGhpcy5kYXRhW3RoaXMuYmFzZV0uR2V0KFwibGFyZ2VvcFwiKSkge1xuICAgICAgICAgICAgICAgIHUgPSB2ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgbWluID0gdGhpcy5nZXRWYWx1ZXMoXCJzdWJzY3JpcHRzaGlmdFwiLCBcInN1cGVyc2NyaXB0c2hpZnRcIik7XG4gICAgICAgIG1pbi5zdWJzY3JpcHRzaGlmdCA9IChtaW4uc3Vic2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1YnNjcmlwdHNoaWZ0LCBtdSkpO1xuICAgICAgICBtaW4uc3VwZXJzY3JpcHRzaGlmdCA9IChtaW4uc3VwZXJzY3JpcHRzaGlmdCA9PT0gXCJcIiA/IDAgOiBVdGlsLmxlbmd0aDJlbShtaW4uc3VwZXJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgdmFyIHggPSBiYXNlLncgKyBiYXNlLng7XG4gICAgICAgIGlmICghc3VwKSB7XG4gICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjEgKiBzY2FsZSwgc3ViLmggLSAoNCAvIDUpICogeF9oZWlnaHQsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC12KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC12O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFzdWIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJ0ZXhwcmltZXN0eWxlXCIpO1xuICAgICAgICAgICAgICAgIHAgPSBVdGlsLlRlWFsodmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwic3VwMVwiIDogKHZhbHVlcy50ZXhwcmltZXN0eWxlID8gXCJzdXAzXCIgOiBcInN1cDJcIikpXTtcbiAgICAgICAgICAgICAgICB1ID0gTWF0aC5tYXgodSwgcCAqIHNjYWxlLCBzdXAuZCArICgxIC8gNCkgKiB4X2hlaWdodCwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIHUpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSB1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjIgKiBzY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIGlmICgodSAtIHN1cC5kKSAtIChzdWIuaCAtIHYpIDwgMyAqIHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IDMgKiB0IC0gdSArIHN1cC5kICsgc3ViLmg7XG4gICAgICAgICAgICAgICAgICAgIHEgPSAoNCAvIDUpICogeF9oZWlnaHQgLSAodSAtIHN1cC5kKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHEgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1ICs9IHE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2IC09IHE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1YiwgeCwgLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN1YlN1cE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGFibGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJjb2x1bW5hbGlnblwiLCBcInJvd2FsaWduXCIsIFwiY29sdW1uc3BhY2luZ1wiLCBcInJvd3NwYWNpbmdcIiwgXCJjb2x1bW53aWR0aFwiLCBcImVxdWFsY29sdW1uc1wiLCBcImVxdWFscm93c1wiLCBcImNvbHVtbmxpbmVzXCIsIFwicm93bGluZXNcIiwgXCJmcmFtZVwiLCBcImZyYW1lc3BhY2luZ1wiLCBcImFsaWduXCIsIFwidXNlSGVpZ2h0XCIsIFwid2lkdGhcIiwgXCJzaWRlXCIsIFwibWlubGFiZWxzcGFjaW5nXCIpO1xuICAgICAgICBpZiAodmFsdWVzLndpZHRoLm1hdGNoKC8lJC8pKSB7XG4gICAgICAgICAgICBzdmcud2lkdGggPSB2YWx1ZXMud2lkdGggPSBVdGlsLkVtKChVdGlsLmN3aWR0aCAvIDEwMDApICogKHBhcnNlRmxvYXQodmFsdWVzLndpZHRoKSAvIDEwMCkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIExBQkVMID0gLTE7XG4gICAgICAgIHZhciBIID0gW10sIEQgPSBbXSwgVyA9IFtdLCBBID0gW10sIEMgPSBbXSwgaSwgaiwgSiA9IC0xLCBtLCBNLCBzLCByb3csIGNlbGwsIG1vLCBIRDtcbiAgICAgICAgdmFyIExIID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEubGluZUggKiBzY2FsZSAqIHZhbHVlcy51c2VIZWlnaHQsIExEID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEubGluZUQgKiBzY2FsZSAqIHZhbHVlcy51c2VIZWlnaHQ7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICByb3cgPSB0aGlzLmRhdGFbaV07XG4gICAgICAgICAgICBzID0gKHJvdy50eXBlID09PSBcIm1sYWJlbGVkdHJcIiA/IExBQkVMIDogMCk7XG4gICAgICAgICAgICBBW2ldID0gW107XG4gICAgICAgICAgICBIW2ldID0gTEg7XG4gICAgICAgICAgICBEW2ldID0gTEQ7XG4gICAgICAgICAgICBmb3IgKGogPSBzLCBNID0gcm93LmRhdGEubGVuZ3RoICsgczsgaiA8IE07IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChXW2pdID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGogPiBKKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBKID0gajtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBDW2pdID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNlbGwgPSByb3cuZGF0YVtqIC0gc107XG4gICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwudG9TVkcoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2VsbC5pc0VtYmVsbGlzaGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbW8gPSBjZWxsLkNvcmVNTygpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWluID0gbW8uR2V0KFwibWluc2l6ZVwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1pbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhEID0gbW8uRWRpdGFibGVTVkdkYXRhLmggKyBtby5FZGl0YWJsZVNWR2RhdGEuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSEQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluID0gVXRpbC5sZW5ndGgyZW0obWluLCBtdSwgSEQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluICogbW8uRWRpdGFibGVTVkdkYXRhLmggLyBIRCA+IEhbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhbaV0gPSBtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuaCAvIEhEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuZCAvIEhEID4gRFtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRFtpXSA9IG1pbiAqIG1vLkVkaXRhYmxlU1ZHZGF0YS5kIC8gSEQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChtby5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbiA9IFV0aWwubGVuZ3RoMmVtKG1pbiwgbXUsIG1vLkVkaXRhYmxlU1ZHZGF0YS53KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluID4gV1tqXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXW2pdID0gbWluO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS5oID4gSFtpXSkge1xuICAgICAgICAgICAgICAgICAgICBIW2ldID0gQVtpXVtqXS5oO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS5kID4gRFtpXSkge1xuICAgICAgICAgICAgICAgICAgICBEW2ldID0gQVtpXVtqXS5kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS53ID4gV1tqXSkge1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gQVtpXVtqXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgU1BMSVQgPSBNYXRoSmF4Lkh1Yi5TcGxpdExpc3Q7XG4gICAgICAgIHZhciBDU1BBQ0UgPSBTUExJVCh2YWx1ZXMuY29sdW1uc3BhY2luZyksIFJTUEFDRSA9IFNQTElUKHZhbHVlcy5yb3dzcGFjaW5nKSwgQ0FMSUdOID0gU1BMSVQodmFsdWVzLmNvbHVtbmFsaWduKSwgUkFMSUdOID0gU1BMSVQodmFsdWVzLnJvd2FsaWduKSwgQ0xJTkVTID0gU1BMSVQodmFsdWVzLmNvbHVtbmxpbmVzKSwgUkxJTkVTID0gU1BMSVQodmFsdWVzLnJvd2xpbmVzKSwgQ1dJRFRIID0gU1BMSVQodmFsdWVzLmNvbHVtbndpZHRoKSwgUkNBTElHTiA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQ1NQQUNFLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgQ1NQQUNFW2ldID0gVXRpbC5sZW5ndGgyZW0oQ1NQQUNFW2ldLCBtdSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbSA9IFJTUEFDRS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIFJTUEFDRVtpXSA9IFV0aWwubGVuZ3RoMmVtKFJTUEFDRVtpXSwgbXUpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDU1BBQ0UubGVuZ3RoIDwgSikge1xuICAgICAgICAgICAgQ1NQQUNFLnB1c2goQ1NQQUNFW0NTUEFDRS5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENBTElHTi5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgQ0FMSUdOLnB1c2goQ0FMSUdOW0NBTElHTi5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENMSU5FUy5sZW5ndGggPCBKKSB7XG4gICAgICAgICAgICBDTElORVMucHVzaChDTElORVNbQ0xJTkVTLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoQ1dJRFRILmxlbmd0aCA8PSBKKSB7XG4gICAgICAgICAgICBDV0lEVEgucHVzaChDV0lEVEhbQ1dJRFRILmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoUlNQQUNFLmxlbmd0aCA8IEEubGVuZ3RoKSB7XG4gICAgICAgICAgICBSU1BBQ0UucHVzaChSU1BBQ0VbUlNQQUNFLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoUkFMSUdOLmxlbmd0aCA8PSBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUkFMSUdOLnB1c2goUkFMSUdOW1JBTElHTi5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJMSU5FUy5sZW5ndGggPCBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUkxJTkVTLnB1c2goUkxJTkVTW1JMSU5FUy5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKENbTEFCRUxdKSB7XG4gICAgICAgICAgICBDQUxJR05bTEFCRUxdID0gKHZhbHVlcy5zaWRlLnN1YnN0cigwLCAxKSA9PT0gXCJsXCIgPyBcImxlZnRcIiA6IFwicmlnaHRcIik7XG4gICAgICAgICAgICBDU1BBQ0VbTEFCRUxdID0gLVdbTEFCRUxdO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgcm93ID0gdGhpcy5kYXRhW2ldO1xuICAgICAgICAgICAgUkNBTElHTltpXSA9IFtdO1xuICAgICAgICAgICAgaWYgKHJvdy5yb3dhbGlnbikge1xuICAgICAgICAgICAgICAgIFJBTElHTltpXSA9IHJvdy5yb3dhbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyb3cuY29sdW1uYWxpZ24pIHtcbiAgICAgICAgICAgICAgICBSQ0FMSUdOW2ldID0gU1BMSVQocm93LmNvbHVtbmFsaWduKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoUkNBTElHTltpXS5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgICAgICAgICBSQ0FMSUdOW2ldLnB1c2goUkNBTElHTltpXVtSQ0FMSUdOW2ldLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5lcXVhbHJvd3MpIHtcbiAgICAgICAgICAgIHZhciBIbSA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIEgpLCBEbSA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIEQpO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcyA9ICgoSG0gKyBEbSkgLSAoSFtpXSArIERbaV0pKSAvIDI7XG4gICAgICAgICAgICAgICAgSFtpXSArPSBzO1xuICAgICAgICAgICAgICAgIERbaV0gKz0gcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBIRCA9IEhbMF0gKyBEW0EubGVuZ3RoIC0gMV07XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aCAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIEhEICs9IE1hdGgubWF4KDAsIERbaV0gKyBIW2kgKyAxXSArIFJTUEFDRVtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZ4ID0gMCwgZnkgPSAwLCBmVywgZkggPSBIRDtcbiAgICAgICAgaWYgKHZhbHVlcy5mcmFtZSAhPT0gXCJub25lXCIgfHxcbiAgICAgICAgICAgICh2YWx1ZXMuY29sdW1ubGluZXMgKyB2YWx1ZXMucm93bGluZXMpLm1hdGNoKC9zb2xpZHxkYXNoZWQvKSkge1xuICAgICAgICAgICAgdmFyIGZyYW1lU3BhY2luZyA9IFNQTElUKHZhbHVlcy5mcmFtZXNwYWNpbmcpO1xuICAgICAgICAgICAgaWYgKGZyYW1lU3BhY2luZy5sZW5ndGggIT0gMikge1xuICAgICAgICAgICAgICAgIGZyYW1lU3BhY2luZyA9IFNQTElUKHRoaXMuZGVmYXVsdHMuZnJhbWVzcGFjaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ4ID0gVXRpbC5sZW5ndGgyZW0oZnJhbWVTcGFjaW5nWzBdLCBtdSk7XG4gICAgICAgICAgICBmeSA9IFV0aWwubGVuZ3RoMmVtKGZyYW1lU3BhY2luZ1sxXSwgbXUpO1xuICAgICAgICAgICAgZkggPSBIRCArIDIgKiBmeTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgWSwgZlksIG4gPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mICh2YWx1ZXMuYWxpZ24pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSBTdHJpbmcodmFsdWVzLmFsaWduKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmFsaWduLm1hdGNoKC8odG9wfGJvdHRvbXxjZW50ZXJ8YmFzZWxpbmV8YXhpcykoICsoLT9cXGQrKSk/LykpIHtcbiAgICAgICAgICAgIG4gPSBSZWdFeHAuJDMgfHwgXCJcIjtcbiAgICAgICAgICAgIHZhbHVlcy5hbGlnbiA9IFJlZ0V4cC4kMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlcy5hbGlnbiA9IHRoaXMuZGVmYXVsdHMuYWxpZ247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG4gIT09IFwiXCIpIHtcbiAgICAgICAgICAgIG4gPSBwYXJzZUludChuKTtcbiAgICAgICAgICAgIGlmIChuIDwgMCkge1xuICAgICAgICAgICAgICAgIG4gPSBBLmxlbmd0aCArIDEgKyBuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gPCAxKSB7XG4gICAgICAgICAgICAgICAgbiA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChuID4gQS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBuID0gQS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBZID0gMDtcbiAgICAgICAgICAgIGZZID0gLShIRCArIGZ5KSArIEhbMF07XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gbiAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZFkgPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICAgICAgICAgIFkgKz0gZFk7XG4gICAgICAgICAgICAgICAgZlkgKz0gZFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBZID0gKHtcbiAgICAgICAgICAgICAgICB0b3A6IC0oSFswXSArIGZ5KSxcbiAgICAgICAgICAgICAgICBib3R0b206IEhEICsgZnkgLSBIWzBdLFxuICAgICAgICAgICAgICAgIGNlbnRlcjogSEQgLyAyIC0gSFswXSxcbiAgICAgICAgICAgICAgICBiYXNlbGluZTogSEQgLyAyIC0gSFswXSxcbiAgICAgICAgICAgICAgICBheGlzOiBIRCAvIDIgKyBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlIC0gSFswXVxuICAgICAgICAgICAgfSlbdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgIGZZID0gKHtcbiAgICAgICAgICAgICAgICB0b3A6IC0oSEQgKyAyICogZnkpLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgICAgICBjZW50ZXI6IC0oSEQgLyAyICsgZnkpLFxuICAgICAgICAgICAgICAgIGJhc2VsaW5lOiAtKEhEIC8gMiArIGZ5KSxcbiAgICAgICAgICAgICAgICBheGlzOiBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlIC0gSEQgLyAyIC0gZnlcbiAgICAgICAgICAgIH0pW3ZhbHVlcy5hbGlnbl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFdXLCBXUCA9IDAsIFd0ID0gMCwgV3AgPSAwLCBwID0gMCwgZiA9IDAsIFAgPSBbXSwgRiA9IFtdLCBXZiA9IDE7XG4gICAgICAgIGlmICh2YWx1ZXMuZXF1YWxjb2x1bW5zICYmIHZhbHVlcy53aWR0aCAhPT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgIFdXID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gTWF0aC5taW4oSiArIDEsIENTUEFDRS5sZW5ndGgpOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1cgLT0gQ1NQQUNFW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgV1cgLz0gSiArIDE7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gTWF0aC5taW4oSiArIDEsIENXSURUSC5sZW5ndGgpOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1tpXSA9IFdXO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDV0lEVEgubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChDV0lEVEhbaV0gPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIFd0ICs9IFdbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKENXSURUSFtpXSA9PT0gXCJmaXRcIikge1xuICAgICAgICAgICAgICAgICAgICBGW2ZdID0gaTtcbiAgICAgICAgICAgICAgICAgICAgZisrO1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDV0lEVEhbaV0ubWF0Y2goLyUkLykpIHtcbiAgICAgICAgICAgICAgICAgICAgUFtwXSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIHArKztcbiAgICAgICAgICAgICAgICAgICAgV3AgKz0gV1tpXTtcbiAgICAgICAgICAgICAgICAgICAgV1AgKz0gVXRpbC5sZW5ndGgyZW0oQ1dJRFRIW2ldLCBtdSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBXW2ldID0gVXRpbC5sZW5ndGgyZW0oQ1dJRFRIW2ldLCBtdSk7XG4gICAgICAgICAgICAgICAgICAgIFd0ICs9IFdbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53aWR0aCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoV1AgPiAuOTgpIHtcbiAgICAgICAgICAgICAgICAgICAgV2YgPSBXcCAvIChXdCArIFdwKTtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXdCArIFdwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXdCAvICgxIC0gV1ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFdXID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDU1BBQ0UubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBXVyAtPSBDU1BBQ0VbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IFAubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1tQW2ldXSA9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtQW2ldXSwgbXUsIFdXICogV2YpO1xuICAgICAgICAgICAgICAgIFd0ICs9IFdbUFtpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoV1cgLSBXdCkgPiAuMDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZiAmJiBXVyA+IFd0KSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gKFdXIC0gV3QpIC8gZjtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEYubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBXW0ZbaV1dICs9IFdXO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IFdXIC8gV3Q7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPD0gSjsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBXW2pdICo9IFdXO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5lcXVhbGNvbHVtbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgV20gPSBNYXRoLm1heC5hcHBseShNYXRoLCBXKTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gV207XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB5ID0gWSwgZHksIGFsaWduO1xuICAgICAgICBzID0gKENbTEFCRUxdID8gTEFCRUwgOiAwKTtcbiAgICAgICAgZm9yIChqID0gczsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgIENbal0udyA9IFdbal07XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICBzID0gKHRoaXMuZGF0YVtpXS50eXBlID09PSBcIm1sYWJlbGVkdHJcIiA/IExBQkVMIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwgPSB0aGlzLmRhdGFbaV0uZGF0YVtqIC0gc107XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZWxsLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBW2ldW2pdID0gY2VsbC5TVkdzdHJldGNoSChXW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjZWxsLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbW8gPSBjZWxsLkNvcmVNTygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN5bW1ldHJpYyA9IG1vLnN5bW1ldHJpYztcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vLnN5bW1ldHJpYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwuU1ZHc3RyZXRjaFYoSFtpXSwgRFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtby5zeW1tZXRyaWMgPSBzeW1tZXRyaWM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPSBjZWxsLnJvd2FsaWduIHx8IHRoaXMuZGF0YVtpXS5yb3dhbGlnbiB8fCBSQUxJR05baV07XG4gICAgICAgICAgICAgICAgICAgIGR5ID0gKHsgdG9wOiBIW2ldIC0gQVtpXVtqXS5oLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiBBW2ldW2pdLmQgLSBEW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoKEhbaV0gLSBEW2ldKSAtIChBW2ldW2pdLmggLSBBW2ldW2pdLmQpKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlbGluZTogMCwgYXhpczogMCB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPSAoY2VsbC5jb2x1bW5hbGlnbiB8fCBSQ0FMSUdOW2ldW2pdIHx8IENBTElHTltqXSk7XG4gICAgICAgICAgICAgICAgICAgIENbal0uQWxpZ24oQVtpXVtqXSwgYWxpZ24sIDAsIHkgKyBkeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpIDwgQS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB5ID0gWTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbHcgPSAxLjUgKiBVdGlsLmVtO1xuICAgICAgICB2YXIgeCA9IGZ4IC0gbHcgLyAyO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgc3ZnLkFkZChDW2pdLCB4LCAwKTtcbiAgICAgICAgICAgIHggKz0gV1tqXSArIENTUEFDRVtqXTtcbiAgICAgICAgICAgIGlmIChDTElORVNbal0gIT09IFwibm9uZVwiICYmIGogPCBKICYmIGogIT09IExBQkVMKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIENMSU5FU1tqXSksIHggLSBDU1BBQ0Vbal0gLyAyLCBmWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLncgKz0gZng7XG4gICAgICAgIHN2Zy5kID0gLWZZO1xuICAgICAgICBzdmcuaCA9IGZIICsgZlk7XG4gICAgICAgIGZXID0gc3ZnLnc7XG4gICAgICAgIGlmICh2YWx1ZXMuZnJhbWUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkgKyBmSCAtIGx3KTtcbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfSExJTkUoZlcsIGx3LCB2YWx1ZXMuZnJhbWUpLCAwLCBmWSk7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1ZMSU5FKGZILCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkpO1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIHZhbHVlcy5mcmFtZSksIGZXIC0gbHcsIGZZKTtcbiAgICAgICAgfVxuICAgICAgICB5ID0gWSAtIGx3IC8gMjtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoIC0gMTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgZHkgPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICAgICAgaWYgKFJMSU5FU1tpXSAhPT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgUkxJTkVTW2ldKSwgMCwgeSAtIERbaV0gLSAoZHkgLSBEW2ldIC0gSFtpICsgMV0pIC8gMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB5IC09IGR5O1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgaWYgKENbTEFCRUxdKSB7XG4gICAgICAgICAgICBzdmcudHcgPSBNYXRoLm1heChzdmcudywgc3ZnLnIpIC0gTWF0aC5taW4oMCwgc3ZnLmwpO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudGFsaWduID0gaW5kZW50LmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5kZW50LmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnQuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRzaGlmdCA9IGluZGVudC5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIgfHwgaW5kZW50LmluZGVudHNoaWZ0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBVdGlsLmxlbmd0aDJlbShpbmRlbnQuaW5kZW50c2hpZnQsIG11LCBVdGlsLmN3aWR0aCk7XG4gICAgICAgICAgICB2YXIgbGFiZWxzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5sYWJlbHNwYWNpbmcsIG11LCBVdGlsLmN3aWR0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5kaXNwbGF5SW5kZW50ICE9PSBcIjBcIikge1xuICAgICAgICAgICAgICAgIHZhciBkSW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIHNoaWZ0ICs9IChpbmRlbnQuaW5kZW50QWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uUklHSFQgPyAtZEluZGVudCA6IGRJbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGVxbiA9IHN2ZztcbiAgICAgICAgICAgIHN2ZyA9IG5ldyBCQk9YX1NWRygpO1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuY3dpZHRoO1xuICAgICAgICAgICAgc3ZnLmhhc0luZGVudCA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWxpZ24oQ1tMQUJFTF0sIENBTElHTltMQUJFTF0sIGxhYmVsc2hpZnQsIDApO1xuICAgICAgICAgICAgc3ZnLkFsaWduKGVxbiwgaW5kZW50LmluZGVudGFsaWduLCAwLCAwLCBzaGlmdCk7XG4gICAgICAgICAgICBzdmcudHcgKz0gQ1tMQUJFTF0udyArIHNoaWZ0ICtcbiAgICAgICAgICAgICAgICAoaW5kZW50LmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkNFTlRFUiA/IDggOiA0KSAqIGxhYmVsc2hpZnQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRnJhbWUgJiYgIXN2Zy53aWR0aCkge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IDE2NztcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlLmNhbGwodGhpcywgc3ZnKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgICAgIHZhciBtdGQgPSBtdHIuZGF0YVswXTtcbiAgICAgICAgICAgIHJldHVybiBtdGQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICB2YXIgbXRyID0gdGhpcy5kYXRhW3RoaXMuZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHZhciBtdGQgPSBtdHIuZGF0YVttdHIuZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiBtdGQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRPRE86IHVuaW1wbGVtZW50ZWQgZGlyZWN0aW9uIGZvciBtb3ZlQ3Vyc29yRnJvbVBhcmVudCBpbiBtdGFibGVfbWl4aW4udHNcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmVDdXJzb3JGcm9tQ2hpbGQgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSwgY2xpZW50WCwgY2xpZW50WSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVtpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbXRyLmRhdGEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbal07XG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBtdGQuZGF0YVswXTtcbiAgICAgICAgICAgICAgICBpZiAoVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludChub2RlLCBjbGllbnRYLCBjbGllbnRZKSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcIkRpZG4ndCBtYW5hZ2UgdG8gbW92ZSBjdXJzb3JcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmVDdXJzb3IgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcImRyYXdDdXJzb3IgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBjb25zb2xlLmxvZygnZHJhd0N1cnNvckhpZ2hsaWdodCBjYWxsZWQhJyk7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuYWRkUm93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgTU1MID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbDtcbiAgICAgICAgdmFyIG51bUNvbHMgPSB0aGlzLmRhdGFbMF0uZGF0YS5sZW5ndGg7XG4gICAgICAgIHZhciBuZXdSb3cgPSBuZXcgTU1MLm10cigpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNvbHM7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICBuZXdSb3cuU2V0RGF0YShpLCBtdGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU2V0RGF0YSh0aGlzLmRhdGEubGVuZ3RoLCBuZXdSb3cpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLmFkZENvbHVtbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbXRkID0gbmV3IE1NTC5tdGQoKTtcbiAgICAgICAgICAgIG10ZC5TZXREYXRhKDAsIG5ldyBNTUwuaG9sZSgpKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtpXS5TZXREYXRhKHRoaXMuZGF0YVtpXS5kYXRhLmxlbmd0aCwgbXRkKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlUm93TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVSb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGFibGVSb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm10ciBtb3ZlQ3Vyc29yRnJvbUNoaWxkIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlUm93TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVGFibGVDZWxsTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVDZWxsTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlQ2VsbE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRhYmxlQ2VsbE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMucGFyZW50O1xuICAgICAgICB2YXIgbXRhYmxlID0gdGhpcy5wYXJlbnQucGFyZW50O1xuICAgICAgICB2YXIgY29sSW5kZXggPSByb3cuZGF0YS5pbmRleE9mKHRoaXMpO1xuICAgICAgICB2YXIgcm93SW5kZXggPSBtdGFibGUuZGF0YS5pbmRleE9mKHJvdyk7XG4gICAgICAgIHZhciB3ID0gcm93LmRhdGEubGVuZ3RoO1xuICAgICAgICB2YXIgaCA9IG10YWJsZS5kYXRhLmxlbmd0aDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGlmIChjb2xJbmRleCA9PSB3IC0gMSkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvck10ZCA9IHJvdy5kYXRhW2NvbEluZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgaWYgKGNvbEluZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSByb3cuZGF0YVtjb2xJbmRleCAtIDFdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIGlmIChyb3dJbmRleCA9PSBoIC0gMSkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvclJvdyA9IG10YWJsZS5kYXRhW3Jvd0luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gbmVpZ2hib3JSb3cuZGF0YVtjb2xJbmRleF07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIGlmIChyb3dJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbXRhYmxlLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCBtdGFibGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yUm93ID0gbXRhYmxlLmRhdGFbcm93SW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSBuZWlnaGJvclJvdy5kYXRhW2NvbEluZGV4XTtcbiAgICAgICAgICAgICAgICBuZWlnaGJvck10ZC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIHJldHVybiBNVGFibGVDZWxsTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVGV4dE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRleHRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGV4dE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRleHRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgICAgICB2YXIgZGVmID0geyBkaXJlY3Rpb246IHRoaXMuR2V0KFwiZGlyXCIpIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVEVYVChzY2FsZSAqIDEwMCAvIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5zY2FsZSwgdGhpcy5kYXRhLmpvaW4oXCJcIiksIGRlZikpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UZXh0TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVW5kZXJPdmVyTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVW5kZXJPdmVyTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVVuZGVyT3Zlck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAwO1xuICAgICAgICB0aGlzLnJpZ2h0TW92ZVN0YXkgPSB0cnVlO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2VtYW50aWNzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBUZVhBdG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhUZVhBdG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVGVYQXRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVEVYQ0xBU1MuVkNFTlRFUikge1xuICAgICAgICAgICAgICAgIHkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChib3guaCArIGJveC5kKSAvIDIgKyBib3guZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94LCAwLCB5KTtcbiAgICAgICAgICAgIHN2Zy5pYyA9IGJveC5pYztcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gYm94LnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVYQXRvbSBkcmF3Q3Vyc29yIE5PVCBJTVBMRU1FTlRFRCcpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBUZVhBdG9tTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBCQk9YX0ZSQU1FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9GUkFNRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0ZSQU1FKGgsIGQsIHcsIHQsIGRhc2gsIGNvbG9yLCBzdmcsIGh1YiwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICBkZWYuZmlsbCA9IFwibm9uZVwiO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYud2lkdGggPSBNYXRoLmZsb29yKHcgLSB0KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQgLSB0KTtcbiAgICAgICAgZGVmLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcih0IC8gMikgKyBcIixcIiArIE1hdGguZmxvb3IoLWQgKyB0IC8gMikgKyBcIilcIjtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbTWF0aC5mbG9vcig2ICogVXRpbC5lbSksIE1hdGguZmxvb3IoNiAqIFV0aWwuZW0pXS5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IGQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0ZSQU1FO1xufShCQk9YKSk7XG52YXIgQkJPWF9ITElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfSExJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ITElORSh3LCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpXG4gICAgICAgICAgICBkZWYuc3Ryb2tlID0gY29sb3I7XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFV0aWwuRml4ZWQodCwgMik7XG4gICAgICAgIGRlZi54MSA9IGRlZi55MSA9IGRlZi55MiA9IE1hdGguZmxvb3IodCAvIDIpO1xuICAgICAgICBkZWYueDIgPSBNYXRoLmZsb29yKHcgLSB0IC8gMik7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICB2YXIgbiA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgdyAtIHQpIC8gKDYgKiB0KSksIG0gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICgyICogbiArIDEpKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBtICsgXCIgXCIgKyBtO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXNoID09PSBcImRvdHRlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gWzEsIE1hdGgubWF4KDE1MCwgTWF0aC5mbG9vcigyICogdCkpXS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1saW5lY2FwXCJdID0gXCJyb3VuZFwiO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJsaW5lXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gdDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfSExJTkU7XG59KEJCT1gpKTtcbnZhciBCQk9YX05PTlJFTU9WQUJMRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTk9OUkVNT1ZBQkxFLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTk9OUkVNT1ZBQkxFKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTk9OUkVNT1ZBQkxFO1xufShCQk9YX0cpKTtcbnZhciBCQk9YX1ZMSU5FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9WTElORSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1ZMSU5FKGgsIHQsIGRhc2gsIGNvbG9yLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFV0aWwuRml4ZWQodCwgMik7XG4gICAgICAgIGRlZi54MSA9IGRlZi54MiA9IGRlZi55MSA9IE1hdGguZmxvb3IodCAvIDIpO1xuICAgICAgICBkZWYueTIgPSBNYXRoLmZsb29yKGggLSB0IC8gMik7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICB2YXIgbiA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDYgKiB0KSksIG0gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICgyICogbiArIDEpKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBtICsgXCIgXCIgKyBtO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXNoID09PSBcImRvdHRlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gWzEsIE1hdGgubWF4KDE1MCwgTWF0aC5mbG9vcigyICogdCkpXS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1saW5lY2FwXCJdID0gXCJyb3VuZFwiO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJsaW5lXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfVkxJTkU7XG59KEJCT1gpKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
