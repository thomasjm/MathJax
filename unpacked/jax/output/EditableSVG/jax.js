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
        MathJax.hiteSignal.Post(["EditableSVG rerender", id]);
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
    console.log('LOADING');
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
var BBOX_SVG = (function (_super) {
    __extends(BBOX_SVG, _super);
    function BBOX_SVG() {
        _super.call(this, null, "svg");
        this.removeable = false;
    }
    return BBOX_SVG;
}(BBOX));
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
        console.log("Registering listeners on ID: ", id);
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_left", function (args) {
            if (args[1] != id)
                return;
            var cursor = that.cursor;
            console.log("Got move into from left! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.RIGHT);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_right", function (args) {
            if (args[1] != id)
                return;
            var cursor = that.cursor;
            console.log("Got move into from right! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.LEFT);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_top", function (args) {
            if (args[1] != id)
                return;
            var cursor = that.cursor;
            console.log("Got move into from top! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.UP);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_bottom", function (args) {
            if (args[1] != id)
                return;
            var cursor = that.cursor;
            console.log("Got move into from bottom! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.DOWN);
            $(that.EditableSVGelem).parent().focus();
        });
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
    MathMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        var id = $(this.EditableSVGelem).parent().attr("id");
        if (direction == Direction.LEFT) {
            MathJax.hiteSignal.Post(["EditableSVG move_cursor_left", id]);
        }
        else if (direction == Direction.RIGHT) {
            MathJax.hiteSignal.Post(["EditableSVG move_cursor_right", id]);
        }
        else if (direction == Direction.UP) {
            MathJax.hiteSignal.Post(["EditableSVG move_cursor_up", id]);
        }
        if (direction == Direction.DOWN) {
            MathJax.hiteSignal.Post(["EditableSVG move_cursor_down", id]);
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
    return MSqrtMixin;
}(MBaseMixin));
var MRootMixin = (function (_super) {
    __extends(MRootMixin, _super);
    function MRootMixin() {
        _super.apply(this, arguments);
    }
    MRootMixin.prototype.isCursorable = function () { return true; };
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
    MRootMixin.prototype.moveCursorFromChild = function (c, d) {
        this.parent.moveCursorFromChild(c, d, this);
    };
    MRootMixin.prototype.moveCursorFromParent = function (c, d) {
        return this.data[0].moveCursorFromParent(c, d);
    };
    return MRootMixin;
}(MBaseMixin));
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImpheC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIERpcmVjdGlvbjtcbihmdW5jdGlvbiAoRGlyZWN0aW9uKSB7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlVQXCJdID0gMF0gPSBcIlVQXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlJJR0hUXCJdID0gMV0gPSBcIlJJR0hUXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIkRPV05cIl0gPSAyXSA9IFwiRE9XTlwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJMRUZUXCJdID0gM10gPSBcIkxFRlRcIjtcbn0pKERpcmVjdGlvbiB8fCAoRGlyZWN0aW9uID0ge30pKTtcbnZhciBDdXJzb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEN1cnNvcihjb2xvciwgaXNPdGhlckN1cnNvcikge1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHRoaXMuY29sb3IgPSBjb2xvciB8fCAnIzc3Nzc3Nyc7XG4gICAgICAgIHRoaXMuaXNPdGhlckN1cnNvciA9IGlzT3RoZXJDdXJzb3I7XG4gICAgICAgIHRoaXMuaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMik7XG4gICAgICAgIHRoaXMud2lkdGggPSA1MDtcbiAgICB9XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZWZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMubm9kZSB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0gfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LnBhcmVudE5vZGUpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgICBwYXJlbnQuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmVUb0NsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG4gICAgICAgIHZhciBzdmcgPSB0YXJnZXQubm9kZU5hbWUgPT09ICdzdmcnID8gdGFyZ2V0IDogdGFyZ2V0Lm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKCFzdmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBjcCA9IFV0aWwuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKHN2ZywgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgIHZhciBqYXggPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5nZXRKYXhGcm9tTWF0aChzdmcucGFyZW50Tm9kZSk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gamF4LnJvb3Q7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZEl0ZW1zID0gY3VycmVudC5kYXRhLmZpbHRlcihmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0h1aD8gbWF0Y2hlZCBtb3JlIHRoYW4gb25lIGNoaWxkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IG1hdGNoZWRJdGVtc1swXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IG1hdGNoZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50Lm1vdmVDdXJzb3JGcm9tQ2xpY2sodGhpcywgY3AueCwgY3AueSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uIChub2RlLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgIW5vZGUuYmFja3NsYXNoUm93KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc090aGVyQ3Vyc29yKVxuICAgICAgICAgICAgdGhpcy5zaWduYWxDdXJzb3JNb3ZlbWVudCgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS51cGRhdGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAoc2hpZnRLZXkpIHtcbiAgICAgICAgaWYgKHNoaWZ0S2V5ICYmIHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBzaGlmdEtleSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGlvbihzaGlmdEtleSk7XG4gICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubm9kZS5kcmF3Q3Vyc29yKHRoaXMpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbjtcbiAgICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgIHRoaXMuYmFja3NwYWNlKGV2ZW50LCByZWNhbGwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyNzpcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uVVA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlKGRpcmVjdGlvbiwgZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdXNlZG93biA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uKGV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgICAgdGhpcy5tb3ZlVG9DbGljayhldmVudCk7XG4gICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlSG9sZUlmTmVlZGVkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBob2xlID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgICAgICB2YXIgcm93aW5kZXggPSBub2RlLnBhcmVudC5kYXRhLmluZGV4T2Yobm9kZSk7XG4gICAgICAgICAgICBub2RlLnBhcmVudC5TZXREYXRhKHJvd2luZGV4LCBob2xlKTtcbiAgICAgICAgICAgIGhvbGUubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZXhpdEJhY2tzbGFzaE1vZGUgPSBmdW5jdGlvbiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHZhciBwcG9zID0gdGhpcy5ub2RlLnBhcmVudC5kYXRhLmluZGV4T2YodGhpcy5ub2RlKTtcbiAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LmRhdGEuc3BsaWNlKHBwb3MsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLm5vZGUucGFyZW50LmRhdGE7XG4gICAgICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcGxhY2UubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgYXJyLnB1c2gobnVsbCk7XG4gICAgICAgICAgICBkYXRhLnNwbGljZS5hcHBseShkYXRhLCBbcHBvcywgMV0uY29uY2F0KGFycikpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBsYWNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudC5TZXREYXRhKHBwb3MgKyBpLCByZXBsYWNlW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVwbGFjZSAmJiByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcikge1xuICAgICAgICAgICAgdGhpcy5tb3ZlVG8uYXBwbHkodGhpcywgcmVwbGFjZS5tb3ZlQ3Vyc29yQWZ0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlVG8odGhpcy5ub2RlLnBhcmVudCwgcHBvcyArIDEpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmJhY2tzcGFjZSA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUudHlwZSA9PT0gJ21yb3cnICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlID09PSB0aGlzLnNlbGVjdGlvbkVuZC5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbih0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdmFyIHBvczIgPSBNYXRoLm1heCh0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlLmRhdGEuc3BsaWNlKHBvczEsIHBvczIgLSBwb3MxKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUsIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZG8gdGhpcyBiYWNrc3BhY2VcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICAgICAgaWYgKCFwcmV2LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIICYmIHRoaXMubm9kZS5kYXRhLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5kYXRhLnNwbGljZSh0aGlzLnBvc2l0aW9uIC0gMSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWtlSG9sZUlmTmVlZGVkKHRoaXMubm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb24gLSAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiYWNrc3BhY2Ugb24gaG9sZSEnKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlRW50aXR5TW8gPSBmdW5jdGlvbiAodW5pY29kZSkge1xuICAgICAgICB2YXIgbW8gPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbygpO1xuICAgICAgICB2YXIgZW50aXR5ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuZW50aXR5KCk7XG4gICAgICAgIGVudGl0eS5BcHBlbmQodW5pY29kZSk7XG4gICAgICAgIG1vLkFwcGVuZChlbnRpdHkpO1xuICAgICAgICByZXR1cm4gbW87XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNaSA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtaSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1pKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbWkuQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtaTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY3JlYXRlQW5kTW92ZUludG9Ib2xlID0gZnVuY3Rpb24gKG1zdWJzdXAsIGluZGV4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdDUkVBVElORyBIT0xFJyk7XG4gICAgICAgIHZhciBob2xlID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuaG9sZSgpO1xuICAgICAgICBtc3Vic3VwLlNldERhdGEoaW5kZXgsIGhvbGUpO1xuICAgICAgICB0aGlzLm1vdmVUbyhob2xlLCAwKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFuZGxlU3VwZXJPclN1YnNjcmlwdCA9IGZ1bmN0aW9uIChyZWNhbGwsIGMpIHtcbiAgICAgICAgaWYgKHRoaXMucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJldiA9IHRoaXMubm9kZS5kYXRhW3RoaXMucG9zaXRpb24gLSAxXTtcbiAgICAgICAgdmFyIGluZGV4ID0gKGMgPT09IFwiX1wiKSA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1YiA6IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1cDtcbiAgICAgICAgaWYgKHByZXYudHlwZSA9PT0gXCJtc3Vic3VwXCIgfHwgcHJldi50eXBlID09PSBcIm11bmRlcm92ZXJcIikge1xuICAgICAgICAgICAgaWYgKHByZXYuZGF0YVtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpbmcgPSBwcmV2LmRhdGFbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICh0aGluZy5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGluZy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uTEVGVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhwcmV2LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVBbmRNb3ZlSW50b0hvbGUocHJldiwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1zdWJzdXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAoKTtcbiAgICAgICAgICAgIG1zdWJzdXAuU2V0RGF0YShtc3Vic3VwLmJhc2UsIHByZXYpO1xuICAgICAgICAgICAgdGhpcy5ub2RlLlNldERhdGEodGhpcy5wb3NpdGlvbiAtIDEsIG1zdWJzdXApO1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVBbmRNb3ZlSW50b0hvbGUobXN1YnN1cCwgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHJlY2FsbCwgYykge1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHZhciBsYXRleCA9IFwiXCI7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHRoaXMubm9kZS5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1pID0gdGhpcy5ub2RlLmRhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKG1pLnR5cGUgIT09ICdtaScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBub24taWRlbnRpZmllciBpbiBiYWNrc2xhc2ggZXhwcmVzc2lvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2hhcnMgPSBtaS5kYXRhWzBdO1xuICAgICAgICAgICAgICAgIGxhdGV4ICs9IGNoYXJzLmRhdGFbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gUGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlKGxhdGV4KTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5jbGFzc0xpc3QuYWRkKCdpbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3QgcmVzdWx0OiBcIiwgcmVzdWx0KTtcbiAgICAgICAgICAgIHZhciBtcm93ID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbXJvdy5wYXJlbnQuZGF0YS5pbmRleE9mKG1yb3cpO1xuICAgICAgICAgICAgdGhpcy5leGl0QmFja3NsYXNoTW9kZShyZXN1bHQpO1xuICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsIERpcmVjdGlvbi5SSUdIVCk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgY29kZSA9IGV2ZW50LmNoYXJDb2RlIHx8IGV2ZW50LmtleUNvZGUgfHwgZXZlbnQud2hpY2g7XG4gICAgICAgIHZhciBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgdmFyIHRvSW5zZXJ0O1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLmNsYXNzTGlzdC5yZW1vdmUoJ2ludmFsaWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSAmJiBldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gXCJtdGFibGVcIiAmJiBjb2RlID09IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuYWRkQ29sdW1uKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkgeyB0aGlzLnJlZm9jdXMoKTsgfV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcIm10YWJsZVwiICYmIGNvZGUgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hZGRSb3coKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7IHRoaXMucmVmb2N1cygpOyB9XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdob2xlJykge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMubm9kZS5wYXJlbnQ7XG4gICAgICAgICAgICB2YXIgaG9sZUluZGV4ID0gcGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXJvdygpO1xuICAgICAgICAgICAgcGFyZW50LlNldERhdGEoaG9sZUluZGV4LCByb3cpO1xuICAgICAgICAgICAgcm93Lm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMsIERpcmVjdGlvbi5SSUdIVCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIGlmIChjID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vZGUgIT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0g7XG4gICAgICAgICAgICAgICAgICAgIHZhciBncmF5Um93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8oTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoJyN4MDA1QycpKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYXlSb3cuYmFja3NsYXNoUm93ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCBncmF5Um93KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENsYXNzID0gZ3JheVJvdy5jbGFzcyA/IGdyYXlSb3cuY2xhc3MgKyAnICcgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgZ3JheVJvdy5jbGFzcyA9IG9sZENsYXNzICsgXCJiYWNrc2xhc2gtbW9kZVwiO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhncmF5Um93LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RPRE86IGluc2VydCBhIFxcXFwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSBcIl5cIiB8fCBjID09PSBcIl9cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1cGVyT3JTdWJzY3JpcHQocmVjYWxsLCBjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiIFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3BhY2UocmVjYWxsLCBjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5sZXR0ZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkobmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubnVtYmVyLnRlc3QoYykpIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1uKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmNoYXJzKGMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLnJlbWFwW2NdKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoJyN4JyArIE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLnJlbWFwW2NdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSAnKycgfHwgYyA9PT0gJy8nIHx8IGMgPT09ICc9JyB8fCBjID09PSAnLicgfHwgYyA9PT0gJygnIHx8IGMgPT09ICcpJykge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghdG9JbnNlcnQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMubm9kZS5kYXRhLnNwbGljZSh0aGlzLnBvc2l0aW9uLCAwLCBudWxsKTtcbiAgICAgICAgdGhpcy5ub2RlLlNldERhdGEodGhpcy5wb3NpdGlvbiwgdG9JbnNlcnQpO1xuICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgIH1dKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY2xlYXJCb3hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuYm94ZXMpIHtcbiAgICAgICAgICAgIHRoaXMuYm94ZXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJveGVzID0gW107XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhpZ2hsaWdodEJveGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgY3VyID0gdGhpcy5ub2RlO1xuICAgICAgICB0aGlzLmNsZWFyQm94ZXMoKTtcbiAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgaWYgKGN1ci5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHZhciBiYiA9IGN1ci5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94ZXMgPSB0aGlzLmJveGVzLmNvbmNhdChVdGlsLmhpZ2hsaWdodEJveChzdmcsIGJiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1cnNvci0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXdBdCA9IGZ1bmN0aW9uIChzdmdlbGVtLCB4LCB5LCBoZWlnaHQsIHNraXBTY3JvbGwpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlZFBvc2l0aW9uID0geyB4OiB4LCB5OiB5LCBoZWlnaHQ6IGhlaWdodCB9O1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCB0aGlzLmNvbG9yKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnbWF0aC1jdXJzb3InKTtcbiAgICAgICAgICAgIGNlbGVtLmlkID0gJ2N1cnNvci0nICsgdGhpcy5pZDtcbiAgICAgICAgICAgIHN2Z2VsZW0uYXBwZW5kQ2hpbGQoY2VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG9sZGNsYXNzID0gY2VsZW0uZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsIG9sZGNsYXNzLnNwbGl0KCdibGluaycpLmpvaW4oJycpKTtcbiAgICAgICAgfVxuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3gnLCB4KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd5JywgeSk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB0aGlzLndpZHRoLnRvU3RyaW5nKCkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnN0YXJ0QmxpbmspO1xuICAgICAgICB0aGlzLnN0YXJ0QmxpbmsgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgKyAnIGJsaW5rJyk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgNTAwKTtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRCb3hlcyhzdmdlbGVtKTtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3Rpb25FbmQubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLmRyYXdDdXJzb3JIaWdobGlnaHQodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFza2lwU2Nyb2xsKVxuICAgICAgICAgICAgdGhpcy5zY3JvbGxJbnRvVmlldyhzdmdlbGVtKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuc2lnbmFsQ3Vyc29yTW92ZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgICAgICBpZiAoIW5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb247XG4gICAgICAgIHZhciBwYXRoID0gW107XG4gICAgICAgIHdoaWxlIChub2RlLnBhcmVudCkge1xuICAgICAgICAgICAgdmFyIGkgPSBub2RlLnBhcmVudC5kYXRhLmluZGV4T2Yobm9kZSk7XG4gICAgICAgICAgICBwYXRoLnVuc2hpZnQoaSk7XG4gICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gbm9kZS5pbnB1dElEICsgXCItRnJhbWVcIjtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgY3Vyc29yX2RyYXduXCIsIGlkLCBwYXRoLCBwb3NpdGlvbl0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLmhpZGVIaWdobGlnaHQoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlkZUhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmIChjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0hpZ2hsaWdodEF0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAncmdiYSgxNzMsIDIxNiwgMjUwLCAwLjUpJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZDtcbiAgICAgICAgICAgIHN2Z2VsZW0uYXBwZW5kQ2hpbGQoY2VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uIChzdmdlbGVtKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW5kZXJlZFBvc2l0aW9uKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgeCA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi54O1xuICAgICAgICB2YXIgeSA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLmhlaWdodDtcbiAgICAgICAgdmFyIGNsaWVudFBvaW50ID0gVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMoc3ZnZWxlbSwgeCwgeSArIGhlaWdodCAvIDIpO1xuICAgICAgICB2YXIgY2xpZW50V2lkdGggPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuICAgICAgICB2YXIgY2xpZW50SGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG4gICAgICAgIHZhciBzeCA9IDAsIHN5ID0gMDtcbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnggPCAwIHx8IGNsaWVudFBvaW50LnggPiBjbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc3ggPSBjbGllbnRQb2ludC54IC0gY2xpZW50V2lkdGggLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbGllbnRQb2ludC55IDwgMCB8fCBjbGllbnRQb2ludC55ID4gY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICBzeSA9IGNsaWVudFBvaW50LnkgLSBjbGllbnRIZWlnaHQgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeCB8fCBzeSkge1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbEJ5KHN4LCBzeSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kRWxlbWVudCgpO1xuICAgICAgICBpZiAoY3Vyc29yKVxuICAgICAgICAgICAgY3Vyc29yLnJlbW92ZSgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5ibHVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzRmlyc3RIb2xlID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKCFyb290KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocm9vdC50eXBlID09PSBcImhvbGVcIikge1xuICAgICAgICAgICAgdGhpcy5ub2RlID0gcm9vdDtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNGaXJzdEhvbGUocm9vdC5kYXRhW2ldKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBDdXJzb3IuQ3Vyc29yTW9kZSA9IHtcbiAgICAgICAgQkFDS1NMQVNIOiBcImJhY2tzbGFzaFwiLFxuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXG4gICAgICAgIFNFTEVDVElPTjogXCJzZWxlY3Rpb25cIlxuICAgIH07XG4gICAgcmV0dXJuIEN1cnNvcjtcbn0oKSk7XG52YXIgRWRpdGFibGVTVkdDb25maWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHQ29uZmlnKCkge1xuICAgIH1cbiAgICBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMgPSB7XG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHXCI6IHtcbiAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiBcIjEwMCVcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwidGV4dC1hbGlnblwiOiBcImxlZnRcIixcbiAgICAgICAgICAgIFwidGV4dC10cmFuc2Zvcm1cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtc3BhY2luZ1wiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3b3JkLXdyYXBcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgIFwiZmxvYXRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImRpcmVjdGlvblwiOiBcImx0clwiLFxuICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICBcInRleHQtaW5kZW50XCI6IDAsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcIjEwMCVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgIHRyYW5zaXRpb246IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItd2Via2l0LXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1zLXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1vLXRyYW5zaXRpb25cIjogXCJub25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIubWp4LXN2Zy1ocmVmXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiYmx1ZVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI6IHtcbiAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmUhaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiNjBleFwiLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiLmJhY2tzbGFzaC1tb2RlIHVzZVwiOiB7XG4gICAgICAgICAgICBmaWxsOiBcImdyYXlcIixcbiAgICAgICAgICAgIHN0cm9rZTogXCJncmF5XCJcbiAgICAgICAgfSxcbiAgICAgICAgJy5iYWNrc2xhc2gtbW9kZS5pbnZhbGlkIHVzZSc6IHtcbiAgICAgICAgICAgIGZpbGw6ICcjZmYwMDAwJyxcbiAgICAgICAgICAgIHN0cm9rZTogJyNmZjAwMDAnLFxuICAgICAgICB9LFxuICAgICAgICAnLm1hdGgtY3Vyc29yLmJsaW5rJzoge1xuICAgICAgICAgICAgJ2FuaW1hdGlvbic6ICdibGluayAxLjA2cyBzdGVwcygyLCBzdGFydCkgaW5maW5pdGUnLFxuICAgICAgICAgICAgJy13ZWJraXQtYW5pbWF0aW9uJzogJ2JsaW5rIDEuMDZzIHN0ZXBzKDIsIHN0YXJ0KSBpbmZpbml0ZScsXG4gICAgICAgIH0sXG4gICAgICAgICdAa2V5ZnJhbWVzIGJsaW5rJzogJ3RvIHt2aXNpYmlsaXR5OiBoaWRkZW59JyxcbiAgICAgICAgJ0Atd2Via2l0LWtleWZyYW1lcyBibGluayc6ICd0byB7dmlzaWJpbGl0eTogaGlkZGVufScsXG4gICAgICAgIFwiI01hdGhKYXhfU1ZHX1Rvb2x0aXBcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiYXV0b1wiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJub25lXCJcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHQ29uZmlnO1xufSgpKTtcbnZhciBFZGl0YWJsZVNWRyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkcoKSB7XG4gICAgICAgIHRoaXMuVE9VQ0ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuaGlkZVByb2Nlc3NlZE1hdGggPSB0cnVlO1xuICAgICAgICB0aGlzLmZvbnROYW1lcyA9IFtcIlRlWFwiLCBcIlNUSVhcIiwgXCJTVElYLVdlYlwiLCBcIkFzYW5hLU1hdGhcIixcbiAgICAgICAgICAgIFwiR3lyZS1UZXJtZXNcIiwgXCJHeXJlLVBhZ2VsbGFcIiwgXCJMYXRpbi1Nb2Rlcm5cIiwgXCJOZW8tRXVsZXJcIl07XG4gICAgICAgIHRoaXMuVGV4dE5vZGUgPSBNYXRoSmF4LkhUTUwuVGV4dE5vZGU7XG4gICAgICAgIHRoaXMuYWRkVGV4dCA9IE1hdGhKYXguSFRNTC5hZGRUZXh0O1xuICAgICAgICB0aGlzLnVjTWF0Y2ggPSBNYXRoSmF4LkhUTUwudWNNYXRjaDtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJtbWwgSmF4IFJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICAgICAgTU1MLmhvbGUuQXVnbWVudChIb2xlLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1iYXNlLkF1Z21lbnQoTUJhc2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5jaGFycy5BdWdtZW50KENoYXJzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuZW50aXR5LkF1Z21lbnQoRW50aXR5TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubW8uQXVnbWVudChNb01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ZXh0LkF1Z21lbnQoTVRleHRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZXJyb3IuQXVnbWVudChNRXJyb3JNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcy5BdWdtZW50KE1zTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWdseXBoLkF1Z21lbnQoTUdseXBoTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXNwYWNlLkF1Z21lbnQoTVNwYWNlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBoYW50b20uQXVnbWVudChNUGhhbnRvbU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1wYWRkZWQuQXVnbWVudChNUGFkZGVkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXJvdy5BdWdtZW50KE1Sb3dNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3R5bGUuQXVnbWVudChNU3R5bGVNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZnJhYy5BdWdtZW50KE1GcmFjTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXNxcnQuQXVnbWVudChNU3FydE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb290LkF1Z21lbnQoTVJvb3RNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZmVuY2VkLkF1Z21lbnQoTUZlbmNlZE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1lbmNsb3NlLkF1Z21lbnQoTUVuY2xvc2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYWN0aW9uLkF1Z21lbnQoTUFjdGlvbk1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLnNlbWFudGljcy5BdWdtZW50KFNlbWFudGljc01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm11bmRlcm92ZXIuQXVnbWVudChNVW5kZXJPdmVyTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXN1YnN1cC5BdWdtZW50KE1TdWJTdXBNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tbXVsdGlzY3JpcHRzLkF1Z21lbnQoTU11bHRpU2NyaXB0c01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hdGguQXVnbWVudChNYXRoTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuVGVYQXRvbS5BdWdtZW50KFRlWEF0b21NaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdGFibGUuQXVnbWVudChNVGFibGVNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdHIuQXVnbWVudChNVGFibGVSb3dNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdGQuQXVnbWVudChNVGFibGVDZWxsTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUxbXCJhbm5vdGF0aW9uLXhtbFwiXS5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICB0b1NWRzogTU1MLm1iYXNlLlNWR2F1dG9sb2FkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwib25Mb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgZWRpdGFibGVzdmc6ICcsIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoTWF0aEpheC5DYWxsYmFjayhbXCJsb2FkQ29tcGxldGVcIiwgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcsIFwiamF4LmpzXCJdKSwgMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5Ccm93c2VyLlNlbGVjdCh7XG4gICAgICAgICAgICBPcGVyYTogZnVuY3Rpb24gKGJyb3dzZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgICAgICBvcGVyYVpvb21SZWZyZXNoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZCBDb29raWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLmNvbmZpZy5tZW51U2V0dGluZ3Muem9vbSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4LkFqYXguUmVxdWlyZShcIltNYXRoSmF4XS9leHRlbnNpb25zL01hdGhab29tLmpzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSBkb2N1bWVudDtcbiAgICAgICAgICAgIGlmICghZG9jLm5hbWVzcGFjZXMuc3ZnKSB7XG4gICAgICAgICAgICAgICAgZG9jLm5hbWVzcGFjZXMuYWRkKFwic3ZnXCIsIFV0aWwuU1ZHTlMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Db25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBVVRPTE9BRCBESVIgJywgdGhpcy5hdXRvbG9hZERpcik7XG4gICAgICAgIHZhciBzZXR0aW5ncyA9IE1hdGhKYXguSHViLmNvbmZpZy5tZW51U2V0dGluZ3MsIGNvbmZpZyA9IHRoaXMuY29uZmlnLCBmb250ID0gc2V0dGluZ3MuZm9udDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnNjYWxlKSB7XG4gICAgICAgICAgICBjb25maWcuc2NhbGUgPSBzZXR0aW5ncy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZm9udCAmJiBmb250ICE9PSBcIkF1dG9cIikge1xuICAgICAgICAgICAgZm9udCA9IGZvbnQucmVwbGFjZSgvKExvY2FsfFdlYnxJbWFnZSkkL2ksIFwiXCIpO1xuICAgICAgICAgICAgZm9udCA9IGZvbnQucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvLCBcIiQxLSQyXCIpO1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBmb250O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBjb25maWcuZm9udCB8fCBcIlRlWFwiO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZvbnROYW1lcy5pbmRleE9mKHRoaXMuZm9udEluVXNlKSA8IDApIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZvbnREaXIgKz0gXCIvXCIgKyB0aGlzLmZvbnRJblVzZTtcbiAgICAgICAgaWYgKCF0aGlzLnJlcXVpcmUpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWlyZSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVxdWlyZS5wdXNoKHRoaXMuZm9udERpciArIFwiL2ZvbnRkYXRhLmpzXCIpO1xuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaChNYXRoSmF4Lk91dHB1dEpheC5leHRlbnNpb25EaXIgKyBcIi9NYXRoRXZlbnRzLmpzXCIpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlN0YXJ0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBFVkVOVCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQ7XG4gICAgICAgIHRoaXMuVE9VQ0ggPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLlRvdWNoO1xuICAgICAgICB2YXIgSE9WRVIgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkhvdmVyO1xuICAgICAgICB0aGlzLkNvbnRleHRNZW51ID0gRVZFTlQuQ29udGV4dE1lbnU7XG4gICAgICAgIHRoaXMuTW91c2VvdmVyID0gSE9WRVIuTW91c2VvdmVyO1xuICAgICAgICB0aGlzLk1vdXNlb3V0ID0gSE9WRVIuTW91c2VvdXQ7XG4gICAgICAgIHRoaXMuTW91c2Vtb3ZlID0gSE9WRVIuTW91c2Vtb3ZlO1xuICAgICAgICB0aGlzLmhpZGRlbkRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IFwiMXB4XCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiYXV0b1wiLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgICAgICAgICB0ZXh0QWxpZ246IFwibGVmdFwiLFxuICAgICAgICAgICAgICAgIHRleHRJbmRlbnQ6IDAsXG4gICAgICAgICAgICAgICAgdGV4dFRyYW5zZm9ybTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgbGluZUhlaWdodDogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICBsZXR0ZXJTcGFjaW5nOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIHdvcmRTcGFjaW5nOiBcIm5vcm1hbFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbkRpdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZSh0aGlzLmhpZGRlbkRpdiwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhpZGRlbkRpdiA9IE1hdGhKYXguSFRNTC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LCBcImRpdlwiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19IaWRkZW5cIlxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRpdiA9IE1hdGhKYXguSFRNTC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LCBcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBcIjVpblwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBVdGlsLnB4UGVySW5jaCA9IGRpdi5vZmZzZXRXaWR0aCAvIDU7XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIHRoaXMudGV4dFNWRyA9IFV0aWwuRWxlbWVudChcInN2Z1wiLCBudWxsKTtcbiAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gVXRpbC5hZGRFbGVtZW50KFV0aWwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdi5wYXJlbnROb2RlLCBcInN2Z1wiKSwgXCJkZWZzXCIsIHtcbiAgICAgICAgICAgIGlkOiBcIk1hdGhKYXhfU1ZHX2dseXBoc1wiXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLkV4U3BhbiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIFtcbiAgICAgICAgICAgIFtcInNwYW5cIiwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdfRXhCb3hcIlxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIF0pO1xuICAgICAgICB0aGlzLmxpbmVicmVha1NwYW4gPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwgbnVsbCwgW1xuICAgICAgICAgICAgW1wiaHJcIiwge1xuICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IFwiYXV0b1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIF0pO1xuICAgICAgICB2YXIgc3R5bGVzID0gdGhpcy5jb25maWcuc3R5bGVzO1xuICAgICAgICBmb3IgKHZhciBzIGluIEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlcykge1xuICAgICAgICAgICAgc3R5bGVzW3NdID0gRWRpdGFibGVTVkdDb25maWcuc3R5bGVzW3NdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoSmF4LkFqYXguU3R5bGVzKHN0eWxlcywgW1wiSW5pdGlhbGl6ZVNWR1wiLCB0aGlzXSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuSW5pdGlhbGl6ZVNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLkV4U3Bhbik7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5saW5lYnJlYWtTcGFuKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0RXggPSB0aGlzLkV4U3Bhbi5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICB0aGlzLmRlZmF1bHRXaWR0aCA9IHRoaXMubGluZWJyZWFrU3Bhbi5maXJzdENoaWxkLm9mZnNldFdpZHRoO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnByZVRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBtID0gc2NyaXB0cy5sZW5ndGg7XG4gICAgICAgIHZhciBzY3JpcHQ7XG4gICAgICAgIHZhciBwcmV2O1xuICAgICAgICB2YXIgc3BhbjtcbiAgICAgICAgdmFyIGRpdjtcbiAgICAgICAgdmFyIHRlc3Q7XG4gICAgICAgIHZhciBqYXg7XG4gICAgICAgIHZhciBleDtcbiAgICAgICAgdmFyIGVtO1xuICAgICAgICB2YXIgbWF4d2lkdGg7XG4gICAgICAgIHZhciByZWx3aWR0aCA9IGZhbHNlO1xuICAgICAgICB2YXIgY3dpZHRoO1xuICAgICAgICB2YXIgbGluZWJyZWFrID0gdGhpcy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWM7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuY29uZmlnLmxpbmVicmVha3Mud2lkdGg7XG4gICAgICAgIGlmIChsaW5lYnJlYWspIHtcbiAgICAgICAgICAgIHJlbHdpZHRoID0gKHdpZHRoLm1hdGNoKC9eXFxzKihcXGQrKFxcLlxcZCopPyVcXHMqKT9jb250YWluZXJcXHMqJC8pICE9IG51bGwpO1xuICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgd2lkdGggPSB3aWR0aC5yZXBsYWNlKC9cXHMqY29udGFpbmVyXFxzKi8sIFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWF4d2lkdGggPSB0aGlzLmRlZmF1bHRXaWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3aWR0aCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtYXh3aWR0aCA9IDEwMDAwMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHByZXYgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgaWYgKHByZXYgJiYgU3RyaW5nKHByZXYuY2xhc3NOYW1lKS5tYXRjaCgvXk1hdGhKYXgoX1NWRyk/KF9EaXNwbGF5KT8oIE1hdGhKYXgoX1NWRyk/X1Byb2Nlc3NpbmcpPyQvKSkge1xuICAgICAgICAgICAgICAgIHByZXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGpheC5FZGl0YWJsZVNWRyA9IHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiAoamF4LnJvb3QuR2V0KFwiZGlzcGxheVwiKSA9PT0gXCJibG9ja1wiKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNwYW4gPSBkaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IHRoaXMuY29uZmlnLnNjYWxlICsgXCIlXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwiaW5saW5lLWJsb2NrXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR1wiLFxuICAgICAgICAgICAgICAgIGlkOiBqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIsXG4gICAgICAgICAgICAgICAgaXNNYXRoSmF4OiB0cnVlLFxuICAgICAgICAgICAgICAgIGpheElEOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG9uY29udGV4dG1lbnU6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTWVudSxcbiAgICAgICAgICAgICAgICBvbm1vdXNlZG93bjogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZWRvd24sXG4gICAgICAgICAgICAgICAgb25tb3VzZW92ZXI6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2VvdmVyLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdXQ6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2VvdXQsXG4gICAgICAgICAgICAgICAgb25tb3VzZW1vdmU6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2Vtb3ZlLFxuICAgICAgICAgICAgICAgIG9uY2xpY2s6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuQ2xpY2ssXG4gICAgICAgICAgICAgICAgb25kYmxjbGljazogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5EYmxDbGlja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTWF0aEpheC5IdWIuQnJvd3Nlci5ub0NvbnRleHRNZW51KSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoc3RhcnQgPSB0aGlzLlRPVUNILnN0YXJ0O1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaGVuZCA9IHRoaXMuVE9VQ0guZW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5kaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgZGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZGl2LmFwcGVuZENoaWxkKHNwYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZGl2LCBzY3JpcHQpO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuRXhTcGFuLmNsb25lTm9kZSh0cnVlKSwgc2NyaXB0KTtcbiAgICAgICAgICAgIGRpdi5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxpbmVicmVha1NwYW4uY2xvbmVOb2RlKHRydWUpLCBkaXYpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBkaXYgPSB0ZXN0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGV4ID0gdGVzdC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICAgICAgY3dpZHRoID0gZGl2LnByZXZpb3VzU2libGluZy5maXJzdENoaWxkLm9mZnNldFdpZHRoO1xuICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgbWF4d2lkdGggPSBjd2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXggPT09IDAgfHwgZXggPT09IFwiTmFOXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGRlbkRpdi5hcHBlbmRDaGlsZChkaXYpO1xuICAgICAgICAgICAgICAgIGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgZXggPSB0aGlzLmRlZmF1bHRFeDtcbiAgICAgICAgICAgICAgICBjd2lkdGggPSB0aGlzLmRlZmF1bHRXaWR0aDtcbiAgICAgICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4d2lkdGggPSBjd2lkdGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXRpbC5leCA9IGV4O1xuICAgICAgICAgICAgVXRpbC5lbSA9IGVtID0gZXggLyBVdGlsLlRlWC54X2hlaWdodCAqIDEwMDA7XG4gICAgICAgICAgICBVdGlsLmN3aWR0aCA9IGN3aWR0aCAvIGVtICogMTAwMDtcbiAgICAgICAgICAgIFV0aWwubGluZVdpZHRoID0gKGxpbmVicmVhayA/IFV0aWwubGVuZ3RoMmVtKHdpZHRoLCAxLCBtYXh3aWR0aCAvIGVtICogMTAwMCkgOiBVdGlsLkJJR0RJTUVOKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHRzW2ldLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIHNwYW4gPSB0ZXN0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGpheCA9IHNjcmlwdHNbaV0uTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBpZiAoIWpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYW4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIHRlc3QucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5TVkdlcW4gPSBzdGF0ZS5TVkdsYXN0ID0gMDtcbiAgICAgICAgc3RhdGUuU1ZHaSA9IC0xO1xuICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IHRoaXMuY29uZmlnLkVxbkNodW5rO1xuICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzY3JpcHQsIHN0YXRlKSB7XG4gICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChzdGF0ZS5TVkdkZWxheSkge1xuICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkNhbGxiYWNrLkRlbGF5KHRoaXMuY29uZmlnLkVxbkNodW5rRGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgdmFyIG1hdGggPSBqYXgucm9vdDtcbiAgICAgICAgdmFyIHNwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIpO1xuICAgICAgICB2YXIgZGl2ID0gKGpheC5FZGl0YWJsZVNWRy5kaXNwbGF5ID8gKHNwYW4gfHwgeyBwYXJlbnROb2RlOiB1bmRlZmluZWQgfSkucGFyZW50Tm9kZSA6IHNwYW4pO1xuICAgICAgICB2YXIgbG9jYWxDYWNoZSA9ICh0aGlzLmNvbmZpZy51c2VGb250Q2FjaGUgJiYgIXRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKTtcbiAgICAgICAgaWYgKCFkaXYpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMuZW0gPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5lbSA9IGpheC5FZGl0YWJsZVNWRy5lbTtcbiAgICAgICAgdGhpcy5leCA9IGpheC5FZGl0YWJsZVNWRy5leDtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtXaWR0aCA9IGpheC5FZGl0YWJsZVNWRy5saW5lV2lkdGg7XG4gICAgICAgIHRoaXMuY3dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmN3aWR0aDtcbiAgICAgICAgdGhpcy5tYXRoRGl2ID0gZGl2O1xuICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0R2x5cGhzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbml0U1ZHKG1hdGgsIHNwYW4pO1xuICAgICAgICBtYXRoLnNldFRlWGNsYXNzKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXRoLnRvU1ZHKHNwYW4sIGRpdik7XG4gICAgICAgICAgICBtYXRoLmluc3RhbGxDdXJzb3JMaXN0ZW5lcnMoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3Bhbi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQoc3Bhbi5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubi0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5BZGRJbnB1dEhhbmRsZXJzKG1hdGgsIHNwYW4sIGRpdik7XG4gICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGl2LmNsYXNzTmFtZSA9IGRpdi5jbGFzc05hbWUuc3BsaXQoLyAvKVswXTtcbiAgICAgICAgaWYgKHRoaXMuaGlkZVByb2Nlc3NlZE1hdGgpIHtcbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI7XG4gICAgICAgICAgICBpZiAoc2NyaXB0Lk1hdGhKYXgucHJldmlldykge1xuICAgICAgICAgICAgICAgIGpheC5FZGl0YWJsZVNWRy5wcmV2aWV3ID0gc2NyaXB0Lk1hdGhKYXgucHJldmlldztcbiAgICAgICAgICAgICAgICBkZWxldGUgc2NyaXB0Lk1hdGhKYXgucHJldmlldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLlNWR2VxbiArPSAoc3RhdGUuaSAtIHN0YXRlLlNWR2kpO1xuICAgICAgICAgICAgc3RhdGUuU1ZHaSA9IHN0YXRlLmk7XG4gICAgICAgICAgICBpZiAoc3RhdGUuU1ZHZXFuID49IHN0YXRlLlNWR2xhc3QgKyBzdGF0ZS5TVkdjaHVuaykge1xuICAgICAgICAgICAgICAgIHRoaXMucG9zdFRyYW5zbGF0ZShzdGF0ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSBNYXRoLmZsb29yKHN0YXRlLlNWR2NodW5rICogdGhpcy5jb25maWcuRXFuQ2h1bmtGYWN0b3IpO1xuICAgICAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnBvc3RUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUsIHBhcnRpYWwpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIGlmICghdGhpcy5oaWRlUHJvY2Vzc2VkTWF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXRlLlNWR2xhc3QsIG0gPSBzdGF0ZS5TVkdlcW47IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKHNjcmlwdCAmJiBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4KSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnByZXZpb3VzU2libGluZy5jbGFzc05hbWUgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJldmlldy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQuTWF0aEpheC5wcmV2aWV3ID0gZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5TVkdsYXN0ID0gc3RhdGUuU1ZHZXFuO1xuICAgICAgICB2YXIgaWQgPSBzY3JpcHQuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5Qb3N0KFtcIkVkaXRhYmxlU1ZHIHJlcmVuZGVyXCIsIGlkXSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIsIG51bGwpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4ID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gJ3RleGF0b20nKSB7XG4gICAgICAgICAgICBpZiAocm9vdC5kYXRhLmxlbmd0aCAhPT0gMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignVW5leHBlY3RlZCBsZW5ndGggaW4gdGV4YXRvbScpO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChyb290LmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJvb3QuaXNDdXJzb3JhYmxlKCkgfHwgcm9vdC50eXBlID09PSAnbWF0aCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHJvb3QuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cilcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBjdXIudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZVswXSAhPT0gJ20nIHx8IHR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJXcmFwcGluZyBhIHRoaW5nIGluIGFuIG1yb3dcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb290O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkFkZElucHV0SGFuZGxlcnMgPSBmdW5jdGlvbiAobWF0aCwgc3BhbiwgZGl2KSB7XG4gICAgICAgIG1hdGguY3Vyc29yID0gbmV3IEN1cnNvcigpO1xuICAgICAgICBtYXRoLnJlcmVuZGVyID0gcmVyZW5kZXI7XG4gICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgIHZhciBhZGRUZXhUb0RPTSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXggPSBtYXRoLnRvVGV4KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRleDogXCIsIHRleCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1hdGg6IFwiLCBtYXRoKTtcbiAgICAgICAgICAgIG1hdGguRWRpdGFibGVTVkdlbGVtLnNldEF0dHJpYnV0ZShcInRleFwiLCB0ZXgpO1xuICAgICAgICB9O1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhZGRUZXhUb0RPTSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgZnVuY3Rpb24gcmVyZW5kZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgobWF0aCkudG9TVkcoc3BhbiwgZGl2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgYWRkVGV4VG9ET00oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0aEpheC5DYWxsYmFjay5BZnRlcihbcmVyZW5kZXIsIGNhbGxiYWNrXSwgZXJyLnJlc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2soY2FsbGJhY2spKCk7XG4gICAgICAgICAgICB2YXIgaWQgPSBzcGFuLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgcmVyZW5kZXJcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKGUpIHtcbiAgICAgICAgICAgIGlmIChtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXSlcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXS5jYWxsKG1hdGguY3Vyc29yLCBlLCByZXJlbmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlclNwYW4gPSBmdW5jdGlvbiAoamF4LCBtYXRoKSB7XG4gICAgICAgIG1hdGguc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIHJldHVybiBtYXRoLmZpcnN0Q2hpbGQ7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJCQm94ID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCkge1xuICAgICAgICB2YXIgYmJveCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuLnBhcmVudE5vZGUpO1xuICAgICAgICBiYm94LmggKz0gMjtcbiAgICAgICAgYmJveC5kIC09IDI7XG4gICAgICAgIHJldHVybiBiYm94O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlpvb20gPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoLCBNdywgTWgpIHtcbiAgICAgICAgc3Bhbi5jbGFzc05hbWUgPSBcIk1hdGhKYXhfU1ZHXCI7XG4gICAgICAgIHZhciBlbWV4ID0gc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICB2YXIgZXggPSBlbWV4LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZW0gPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5lbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICB0aGlzLmV4ID0gZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIGVtZXgucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbWV4KTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLm1hdGhESVYgPSBzcGFuO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB2YXIgc3ZnID0gc3Bhbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN2Z1wiKVswXS5zdHlsZTtcbiAgICAgICAgc3ZnLm1hcmdpblRvcCA9IHN2Zy5tYXJnaW5SaWdodCA9IHN2Zy5tYXJnaW5MZWZ0ID0gMDtcbiAgICAgICAgaWYgKHN2Zy5tYXJnaW5Cb3R0b20uY2hhckF0KDApID09PSBcIi1cIilcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWFyZ2luQm90dG9tID0gc3ZnLm1hcmdpbkJvdHRvbS5zdWJzdHIoMSk7XG4gICAgICAgIGlmICh0aGlzLm9wZXJhWm9vbVJlZnJlc2gpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNwYW4uZmlyc3RDaGlsZC5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB0cmFuc3BhcmVudFwiO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwYW4ub2Zmc2V0V2lkdGggPCBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWluV2lkdGggPSBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICBtYXRoLnN0eWxlLm1pbldpZHRoID0gbWF0aC5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB2YXIgelcgPSBzcGFuLm9mZnNldFdpZHRoLCB6SCA9IHNwYW4ub2Zmc2V0SGVpZ2h0LCBtSCA9IG1hdGgub2Zmc2V0SGVpZ2h0LCBtVyA9IG1hdGgub2Zmc2V0V2lkdGg7XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJcIjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFk6IC1NYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGpheC5FZGl0YWJsZVNWRztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmV4dGVuZERlbGltaXRlclYgPSBmdW5jdGlvbiAoc3ZnLCBILCBkZWxpbSwgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRvcCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnRvcCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGJvdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmJvdCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGggPSB0b3AuaCArIHRvcC5kICsgYm90LmggKyBib3QuZDtcbiAgICAgICAgdmFyIHkgPSAtdG9wLmg7XG4gICAgICAgIHN2Zy5BZGQodG9wLCAwLCB5KTtcbiAgICAgICAgeSAtPSB0b3AuZDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIGggKz0gbWlkLmggKyBtaWQuZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIEggPCBoICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBIID0gaCAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSCA+IGgpIHtcbiAgICAgICAgICAgIHZhciBleHQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLmV4dCwgZm9udCk7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIGVIID0gKEggLSBoKSAvIGssIHMgPSAoZUggKyAxMDApIC8gKGV4dC5oICsgZXh0LmQpO1xuICAgICAgICAgICAgd2hpbGUgKGstLSA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IFV0aWwuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArICh4IC0gZnV6eiAvIDIgLSBzICogcmVwLmwgKyByZXAueCkgKyBcIixcIiArIHJlcC55ICsgXCIpIHNjYWxlKFwiICsgcyArIFwiLDEpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHJlcC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHggKz0gclc7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBtaWQudztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVykgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgeCArPSBtaWQudyAtICh3IC0gVykgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQocmlnaHQsIHggLSByaWdodC5sLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZ2V0SmF4RnJvbU1hdGggPSBmdW5jdGlvbiAobWF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICAgICAgbWF0aCA9IG1hdGgucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBtYXRoID0gbWF0aC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH0gd2hpbGUgKG1hdGggJiYgbWF0aC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICE9PSBcInNjcmlwdFwiKTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5nZXRKYXhGb3IobWF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBnZXRKYXhGcm9tTWF0aFwiLCBlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHO1xufSgpKTtcbnZhciBsb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgY29uc29sZS5sb2coJ0xPQURJTkcnKTtcbiAgICBFZGl0YWJsZVNWRy5hcHBseShNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcucHJvdG90eXBlKSB7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHW2lkXSA9IEVkaXRhYmxlU1ZHLnByb3RvdHlwZVtpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpZCBpbiBFZGl0YWJsZVNWRykge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgfVxufTtcblNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCA9IFNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCB8fCBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHJldHVybiBlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKS5tdWx0aXBseSh0aGlzLmdldFNjcmVlbkNUTSgpKTtcbn07XG5zZXRUaW1lb3V0KGxvYWQsIDEwMDApO1xudmFyIFBhcnNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUGFyc2VyKCkge1xuICAgIH1cbiAgICBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFBhcnNlci5jaGVja1NwZWNpYWxDUyhjcyk7XG4gICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB2YXIgbWF0aGpheFBhcnNlciA9IE1hdGhKYXguSW5wdXRKYXguVGVYLlBhcnNlKGNzKTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5jc1VuZGVmaW5lZCA9IG1hdGhqYXhQYXJzZXIuY3NGaW5kTWFjcm8gPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuR2V0Q1MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjczsgfTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5tbWxUb2tlbiA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgICAgICBtYXRoamF4UGFyc2VyLlB1c2ggPSAoZnVuY3Rpb24gKHgpIHsgcmVzdWx0ID0geDsgfSk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuQ29udHJvbFNlcXVlbmNlKCk7XG4gICAgICAgIHJldHVybiBbcmVzdWx0XTtcbiAgICB9O1xuICAgIFBhcnNlci5jaGVja1NwZWNpYWxDUyA9IGZ1bmN0aW9uIChjcykge1xuICAgICAgICB2YXIgbWFjcm9zID0gTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zO1xuICAgICAgICB2YXIgTU1MID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbDtcbiAgICAgICAgaWYgKGNzID09PSAnZnJhYycpIHtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICB2YXIgbWZyYWMgPSBuZXcgTU1MLm1mcmFjKGhvbGUsIG5ldyBNTUwuaG9sZSgpKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbWZyYWNdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNzID09PSAnc3FydCcpIHtcbiAgICAgICAgICAgIHZhciBtc3FydCA9IG5ldyBNTUwubXNxcnQoKTtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICBtc3FydC5TZXREYXRhKDAsIGhvbGUpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFttc3FydF07XG4gICAgICAgICAgICByZXN1bHQubW92ZUN1cnNvckFmdGVyID0gW2hvbGUsIDBdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3MgPT09ICdtYXRyaXgnIHx8IGNzID09PSAnYm1hdHJpeCcpIHtcbiAgICAgICAgICAgIHZhciBtdGFibGUgPSBuZXcgTU1MLm10YWJsZSgpO1xuICAgICAgICAgICAgdmFyIG10ciA9IG5ldyBNTUwubXRyKCk7XG4gICAgICAgICAgICB2YXIgbXRkID0gbmV3IE1NTC5tdGQoKTtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICBtdGFibGUuU2V0RGF0YSgwLCBtdHIpO1xuICAgICAgICAgICAgbXRyLlNldERhdGEoMCwgbXRkKTtcbiAgICAgICAgICAgIG10ZC5TZXREYXRhKDAsIGhvbGUpO1xuICAgICAgICAgICAgdmFyIGxicmFja2V0ID0gbmV3IE1NTC5tbyhuZXcgTU1MLmNoYXJzKFwiW1wiKSk7XG4gICAgICAgICAgICB2YXIgcmJyYWNrZXQgPSBuZXcgTU1MLm1vKG5ldyBNTUwuY2hhcnMoXCJdXCIpKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbGJyYWNrZXQsIG10YWJsZSwgcmJyYWNrZXRdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hY3Jvc1tjc10pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hY3Jvc1tjc10pO1xuICAgICAgICAgICAgdmFyIG5hbWVkRGlyZWN0bHkgPSBtYWNyb3NbY3NdID09PSAnTmFtZWRPcCcgfHwgbWFjcm9zW2NzXSA9PT0gJ05hbWVkRm4nO1xuICAgICAgICAgICAgdmFyIG5hbWVkQXJyYXkgPSBtYWNyb3NbY3NdWzBdICYmIChtYWNyb3NbY3NdWzBdID09PSAnTmFtZWRGbicgfHwgbWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkT3AnKTtcbiAgICAgICAgICAgIGlmIChuYW1lZERpcmVjdGx5IHx8IG5hbWVkQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWVkQXJyYXkgJiYgbWFjcm9zW2NzXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1hY3Jvc1tjc11bMV0ucmVwbGFjZSgvJnRoaW5zcDsvLCBcIlxcdTIwMDZcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGNzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gW25ldyBNTUwubW8obmV3IE1NTC5jaGFycyh2YWx1ZSkpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFBhcnNlcjtcbn0oKSk7XG52YXIgQkJPWCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQkJPWChkZWYsIHR5cGUpIHtcbiAgICAgICAgaWYgKGRlZiA9PT0gdm9pZCAwKSB7IGRlZiA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGUgPT09IHZvaWQgMCkgeyB0eXBlID0gXCJnXCI7IH1cbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMuSCA9IHRoaXMuRCA9IDA7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IDA7XG4gICAgICAgIHRoaXMubCA9IFV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSAxO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQodHlwZSwgZGVmKTtcbiAgICB9XG4gICAgQkJPWC5wcm90b3R5cGUuV2l0aCA9IGZ1bmN0aW9uIChkZWYsIEhVQikge1xuICAgICAgICByZXR1cm4gSFVCLkluc2VydCh0aGlzLCBkZWYpO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWRkID0gZnVuY3Rpb24gKHN2ZywgZHgsIGR5LCBmb3JjZXcsIGluZnJvbnQpIHtcbiAgICAgICAgaWYgKGR4KSB7XG4gICAgICAgICAgICBzdmcueCArPSBkeDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZHkpIHtcbiAgICAgICAgICAgIHN2Zy55ICs9IGR5O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmIHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIHN2Zy5uID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgbm9kZU5hbWUgPSBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJ1c2VcIiB8fCBub2RlTmFtZSA9PT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNjYWxlID0gc3ZnLmNoaWxkU2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gc3ZnLmNoaWxkWCwgeSA9IHN2Zy5jaGlsZFk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy55ICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5oIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5kICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5IIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5EICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy53IC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yIC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5sICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3ZnLngpIDwgMSAmJiBNYXRoLmFicyhzdmcueSkgPCAxKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlID0gc3ZnLnJlbW92ZWFibGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUgPT09IFwibGluZVwiIHx8IG5vZGVOYW1lID09PSBcInBvbHlnb25cIiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9PT0gXCJwYXRoXCIgfHwgbm9kZU5hbWUgPT09IFwiYVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3Ioc3ZnLngpICsgXCIsXCIgKyBNYXRoLmZsb29yKHN2Zy55KSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubiArPSBzdmcubjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCAmJiB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudC5maXJzdENoaWxkLCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKHN2Zy5lbGVtZW50LCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdGhpcy5oYXNJbmRlbnQgPSBzdmcuaGFzSW5kZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy50dyA9IHN2Zy50dztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgLSBzdmcueSA+IHRoaXMuZCkge1xuICAgICAgICAgICAgdGhpcy5kID0gc3ZnLmQgLSBzdmcueTtcbiAgICAgICAgICAgIGlmICh0aGlzLmQgPiB0aGlzLkQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkQgPSB0aGlzLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLmggPiB0aGlzLmgpIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHN2Zy55ICsgc3ZnLmg7XG4gICAgICAgICAgICBpZiAodGhpcy5oID4gdGhpcy5IKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5IID0gdGhpcy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuRCAtIHN2Zy55ID4gdGhpcy5EKVxuICAgICAgICAgICAgdGhpcy5EID0gc3ZnLkQgLSBzdmcueTtcbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLkggPiB0aGlzLkgpXG4gICAgICAgICAgICB0aGlzLkggPSBzdmcueSArIHN2Zy5IO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcubCA8IHRoaXMubClcbiAgICAgICAgICAgIHRoaXMubCA9IHN2Zy54ICsgc3ZnLmw7XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5yID4gdGhpcy5yKVxuICAgICAgICAgICAgdGhpcy5yID0gc3ZnLnggKyBzdmcucjtcbiAgICAgICAgaWYgKGZvcmNldyB8fCBzdmcueCArIHN2Zy53ICsgKHN2Zy5YIHx8IDApID4gdGhpcy53KVxuICAgICAgICAgICAgdGhpcy53ID0gc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKTtcbiAgICAgICAgdGhpcy5jaGlsZFNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLmNoaWxkWCA9IHN2Zy54O1xuICAgICAgICB0aGlzLmNoaWxkWSA9IHN2Zy55O1xuICAgICAgICB0aGlzLm4rKztcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFsaWduID0gZnVuY3Rpb24gKHN2ZywgYWxpZ24sIGR4LCBkeSwgc2hpZnQpIHtcbiAgICAgICAgaWYgKHNoaWZ0ID09PSB2b2lkIDApIHsgc2hpZnQgPSBudWxsOyB9XG4gICAgICAgIGR4ID0gKHtcbiAgICAgICAgICAgIGxlZnQ6IGR4LFxuICAgICAgICAgICAgY2VudGVyOiAodGhpcy53IC0gc3ZnLncpIC8gMixcbiAgICAgICAgICAgIHJpZ2h0OiB0aGlzLncgLSBzdmcudyAtIGR4XG4gICAgICAgIH0pW2FsaWduXSB8fCAwO1xuICAgICAgICB2YXIgdyA9IHRoaXMudztcbiAgICAgICAgdGhpcy5BZGQoc3ZnLCBkeCArIChzaGlmdCB8fCAwKSwgZHkpO1xuICAgICAgICB0aGlzLncgPSB3O1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQ2xlYW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmggPT09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICB0aGlzLmggPSB0aGlzLmQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgQkJPWC5kZWZzID0gbnVsbDtcbiAgICBCQk9YLm4gPSAwO1xuICAgIHJldHVybiBCQk9YO1xufSgpKTtcbnZhciBCQk9YX0cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRztcbn0oQkJPWCkpO1xudmFyIEJCT1hfVEVYVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVEVYVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIGRlZikge1xuICAgICAgICBpZiAoIWRlZilcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICBkZWYuc3Ryb2tlID0gXCJub25lXCI7XG4gICAgICAgIGlmIChkZWZbXCJmb250LXN0eWxlXCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtc3R5bGVcIl07XG4gICAgICAgIGlmIChkZWZbXCJmb250LXdlaWdodFwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXdlaWdodFwiXTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInRleHRcIik7XG4gICAgICAgIE1hdGhKYXguSFRNTC5hZGRUZXh0KHRoaXMuZWxlbWVudCwgdGV4dCk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLnRleHRTVkcuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy50ZXh0U1ZHLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHNjYWxlICo9IDEwMDAgLyBVdGlsLmVtO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKSBtYXRyaXgoMSAwIDAgLTEgMCAwKVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IGJib3gud2lkdGggKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gLWJib3gueSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAoYmJveC5oZWlnaHQgKyBiYm94LnkpICogc2NhbGU7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1RFWFQ7XG59KEJCT1gpKTtcbnZhciBVdGlsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVdGlsKCkge1xuICAgIH1cbiAgICBVdGlsLkVtID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZW1cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZW1cIjtcbiAgICB9O1xuICAgIFV0aWwuRXggPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBtID0gTWF0aC5yb3VuZChtIC8gdGhpcy5UZVgueF9oZWlnaHQgKiB0aGlzLmV4KSAvIHRoaXMuZXg7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGV4XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImV4XCI7XG4gICAgfTtcbiAgICBVdGlsLlBlcmNlbnQgPSBmdW5jdGlvbiAobSkge1xuICAgICAgICByZXR1cm4gKDEwMCAqIG0pLnRvRml4ZWQoMSkucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCIlXCI7XG4gICAgfTtcbiAgICBVdGlsLkZpeGVkID0gZnVuY3Rpb24gKG0sIG4pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZChuIHx8IDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKTtcbiAgICB9O1xuICAgIFV0aWwuaGFzaENoZWNrID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImdcIikge1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldC5maXJzdENoaWxkLm5vZGVOYW1lICE9PSBcInN2Z1wiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gICAgVXRpbC5FbGVtZW50ID0gZnVuY3Rpb24gKHR5cGUsIGRlZikge1xuICAgICAgICB2YXIgb2JqO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdmc6XCIgKyB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5pc01hdGhKYXggPSB0cnVlO1xuICAgICAgICBpZiAoZGVmKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBkZWYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKGlkLCBkZWZbaWRdLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgVXRpbC5hZGRFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmVudCwgdHlwZSwgZGVmKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQoVXRpbC5FbGVtZW50KHR5cGUsIGRlZikpO1xuICAgIH07XG4gICAgVXRpbC5sZW5ndGgyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSwgc2l6ZSkge1xuICAgICAgICBpZiAobXUgPT09IHZvaWQgMCkgeyBtdSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHNpemUgPT09IHZvaWQgMCkgeyBzaXplID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIChsZW5ndGgpICE9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiXCIpXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLk5PUk1BTClcbiAgICAgICAgICAgIHJldHVybiAxMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuQklHKVxuICAgICAgICAgICAgcmV0dXJuIDIwMDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5TTUFMTClcbiAgICAgICAgICAgIHJldHVybiA3MTA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiaW5maW5pdHlcIilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkJJR0RJTUVOO1xuICAgICAgICBpZiAobGVuZ3RoLm1hdGNoKC9tYXRoc3BhY2UkLykpXG4gICAgICAgICAgICByZXR1cm4gMTAwMCAqIHRoaXMuTUFUSFNQQUNFW2xlbmd0aF07XG4gICAgICAgIHZhciB6b29tU2NhbGUgPSBwYXJzZUludChNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLnpzY2FsZSkgLyAxMDA7XG4gICAgICAgIHZhciBlbUZhY3RvciA9ICh6b29tU2NhbGUgfHwgMSkgLyBVdGlsLmVtO1xuICAgICAgICB2YXIgbWF0Y2ggPSBsZW5ndGgubWF0Y2goL15cXHMqKFstK10/KD86XFwuXFxkK3xcXGQrKD86XFwuXFxkKik/KSk/KHB0fGVtfGV4fG11fHB4fHBjfGlufG1tfGNtfCUpPy8pO1xuICAgICAgICB2YXIgbSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0gfHwgXCIxXCIpICogMTAwMCwgdW5pdCA9IG1hdGNoWzJdO1xuICAgICAgICBpZiAoc2l6ZSA9PSBudWxsKVxuICAgICAgICAgICAgc2l6ZSA9IDEwMDA7XG4gICAgICAgIGlmIChtdSA9PSBudWxsKVxuICAgICAgICAgICAgbXUgPSAxO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJlbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIGlmICh1bml0ID09PSBcImV4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMuVGVYLnhfaGVpZ2h0IC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiJVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDAgKiBzaXplIC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHhcIilcbiAgICAgICAgICAgIHJldHVybiBtICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB0XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwY1wiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiAxLjI7XG4gICAgICAgIGlmICh1bml0ID09PSBcImluXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcImNtXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyLjU0O1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJtbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMjUuNDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibXVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTggKiBtdTtcbiAgICAgICAgcmV0dXJuIG0gKiBzaXplIC8gMTAwMDtcbiAgICB9O1xuICAgIFV0aWwuZ2V0UGFkZGluZyA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgICAgICAgdmFyIHBhZGRpbmcgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBwYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAocGFkZGluZy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFkID0gc3R5bGVzW1wicGFkZGluZ1wiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgIGlmIChwYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1tpZF0gPSBVdGlsLmxlbmd0aDJlbShwYWQpO1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGhhcyA/IHBhZGRpbmcgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLmdldEJvcmRlcnMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBib3JkZXIgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfSwgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIGJvcmRlcikge1xuICAgICAgICAgICAgaWYgKGJvcmRlci5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSBcImJvcmRlclwiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZF0gPSBVdGlsLmxlbmd0aDJlbShzdHlsZXNbSUQgKyBcIldpZHRoXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJTdHlsZVwiXSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBzdHlsZXNbSUQgKyBcIkNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9PT0gXCJpbml0aWFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm9yZGVyW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBib3JkZXIgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLnRoaWNrbmVzczJlbSA9IGZ1bmN0aW9uIChsZW5ndGgsIG11KSB7XG4gICAgICAgIHZhciB0aGljayA9IHRoaXMuVGVYLnJ1bGVfdGhpY2tuZXNzO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuTUVESVVNKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISUNLKSB7XG4gICAgICAgICAgICByZXR1cm4gMS42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aDJlbShsZW5ndGgsIG11LCB0aGljayk7XG4gICAgfTtcbiAgICBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkpO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0VHJhbnNmb3JtVG9FbGVtZW50KHN2ZykpO1xuICAgIH07XG4gICAgVXRpbC5nZXRTVkdFbGVtID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgaWYgKCFlbGVtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgc3ZnID0gZWxlbS5ub2RlTmFtZSA9PT0gJ3N2ZycgPyBlbGVtIDogZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBvd25lciBTVkcgZWxlbWVudCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkuaW52ZXJzZSgpKTtcbiAgICB9O1xuICAgIFV0aWwuYm94Q29udGFpbnMgPSBmdW5jdGlvbiAoYmIsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIGJiICYmIGJiLnggPD0geCAmJiB4IDw9IGJiLnggKyBiYi53aWR0aCAmJiBiYi55IDw9IHkgJiYgeSA8PSBiYi55ICsgYmIuaGVpZ2h0O1xuICAgIH07XG4gICAgVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludCA9IGZ1bmN0aW9uIChub2RlLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYiA9IG5vZGUuZ2V0QkIgJiYgbm9kZS5nZXRCQigpO1xuICAgICAgICB2YXIgcCA9IHRoaXMuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKG5vZGUuRWRpdGFibGVTVkdlbGVtLCB4LCB5KTtcbiAgICAgICAgaWYgKCFiYiB8fCAhcClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIFV0aWwuYm94Q29udGFpbnMoYmIsIHAueCwgcC55KTtcbiAgICB9O1xuICAgIFV0aWwuaGlnaGxpZ2h0Qm94ID0gZnVuY3Rpb24gKHN2ZywgYmIpIHtcbiAgICAgICAgdmFyIGQgPSAxMDA7XG4gICAgICAgIHZhciBkcmF3TGluZSA9IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoVXRpbC5TVkdOUywgJ2xpbmUnKTtcbiAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsICdzdHJva2U6cmdiKDAsMCwyNTUpO3N0cm9rZS13aWR0aDoyMCcpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgeDEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgeTEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeDIpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgeTIpO1xuICAgICAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54ICsgZCwgYmIueSksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54LCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnksIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLngsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBkLCBiYi55ICsgYmIuaGVpZ2h0KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCwgYmIueCArIGJiLndpZHRoIC0gZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCAtIGQpXG4gICAgICAgIF07XG4gICAgfTtcbiAgICBVdGlsLmdldEN1cnNvclZhbHVlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoaXNOYU4oZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgc3dpdGNoIChkaXJlY3Rpb25bMF0udG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3UnOiByZXR1cm4gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2QnOiByZXR1cm4gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgY2FzZSAnbCc6IHJldHVybiBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBjYXNlICdyJzogcmV0dXJuIERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3IgdmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFV0aWwuU1ZHTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG4gICAgVXRpbC5YTElOS05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgVXRpbC5OQlNQID0gXCJcXHUwMEEwXCI7XG4gICAgVXRpbC5CSUdESU1FTiA9IDEwMDAwMDAwO1xuICAgIFV0aWwuVGVYID0ge1xuICAgICAgICB4X2hlaWdodDogNDMwLjU1NCxcbiAgICAgICAgcXVhZDogMTAwMCxcbiAgICAgICAgbnVtMTogNjc2LjUwOCxcbiAgICAgICAgbnVtMjogMzkzLjczMixcbiAgICAgICAgbnVtMzogNDQzLjczLFxuICAgICAgICBkZW5vbTE6IDY4NS45NTEsXG4gICAgICAgIGRlbm9tMjogMzQ0Ljg0MSxcbiAgICAgICAgc3VwMTogNDEyLjg5MixcbiAgICAgICAgc3VwMjogMzYyLjg5MixcbiAgICAgICAgc3VwMzogMjg4Ljg4OCxcbiAgICAgICAgc3ViMTogMTUwLFxuICAgICAgICBzdWIyOiAyNDcuMjE3LFxuICAgICAgICBzdXBfZHJvcDogMzg2LjEwOCxcbiAgICAgICAgc3ViX2Ryb3A6IDUwLFxuICAgICAgICBkZWxpbTE6IDIzOTAsXG4gICAgICAgIGRlbGltMjogMTAwMCxcbiAgICAgICAgYXhpc19oZWlnaHQ6IDI1MCxcbiAgICAgICAgcnVsZV90aGlja25lc3M6IDYwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzE6IDExMS4xMTEsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMjogMTY2LjY2NixcbiAgICAgICAgYmlnX29wX3NwYWNpbmczOiAyMDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNDogNjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzU6IDEwMCxcbiAgICAgICAgc2NyaXB0c3BhY2U6IDEwMCxcbiAgICAgICAgbnVsbGRlbGltaXRlcnNwYWNlOiAxMjAsXG4gICAgICAgIGRlbGltaXRlcmZhY3RvcjogOTAxLFxuICAgICAgICBkZWxpbWl0ZXJzaG9ydGZhbGw6IDMwMCxcbiAgICAgICAgbWluX3J1bGVfdGhpY2tuZXNzOiAxLjI1LFxuICAgICAgICBtaW5fcm9vdF9zcGFjZTogMS41XG4gICAgfTtcbiAgICBVdGlsLk1BVEhTUEFDRSA9IHtcbiAgICAgICAgdmVyeXZlcnl0aGlubWF0aHNwYWNlOiAxIC8gMTgsXG4gICAgICAgIHZlcnl0aGlubWF0aHNwYWNlOiAyIC8gMTgsXG4gICAgICAgIHRoaW5tYXRoc3BhY2U6IDMgLyAxOCxcbiAgICAgICAgbWVkaXVtbWF0aHNwYWNlOiA0IC8gMTgsXG4gICAgICAgIHRoaWNrbWF0aHNwYWNlOiA1IC8gMTgsXG4gICAgICAgIHZlcnl0aGlja21hdGhzcGFjZTogNiAvIDE4LFxuICAgICAgICB2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiA3IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlubWF0aHNwYWNlOiAtMSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlubWF0aHNwYWNlOiAtMiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaW5tYXRoc3BhY2U6IC0zIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZlbWVkaXVtbWF0aHNwYWNlOiAtNCAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaWNrbWF0aHNwYWNlOiAtNSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlja21hdGhzcGFjZTogLTYgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiAtNyAvIDE4XG4gICAgfTtcbiAgICByZXR1cm4gVXRpbDtcbn0oKSk7XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgc3ZnLCBodWIsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgZGVmLmZpbGwgPSBcIm5vbmVcIjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3IC0gdCk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkIC0gdCk7XG4gICAgICAgIGRlZi50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3IodCAvIDIpICsgXCIsXCIgKyBNYXRoLmZsb29yKC1kICsgdCAvIDIpICsgXCIpXCI7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gW01hdGguZmxvb3IoNiAqIFV0aWwuZW0pLCBNYXRoLmZsb29yKDYgKiBVdGlsLmVtKV0uam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSBkO1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9GUkFNRTtcbn0oQkJPWCkpO1xudmFyIEJCT1hfR0xZUEggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0dMWVBILCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfR0xZUEgoc2NhbGUsIGlkLCBoLCBkLCB3LCBsLCByLCBwKSB7XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMubiA9IDA7XG4gICAgICAgIHZhciBkZWY7XG4gICAgICAgIHZhciB0ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXI7XG4gICAgICAgIHZhciBjYWNoZSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VGb250Q2FjaGU7XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSAoc2NhbGUgPT09IDEgPyBudWxsIDogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCIpO1xuICAgICAgICBpZiAoY2FjaGUgJiYgIU1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgaWQgPSBcIkVcIiArIHRoaXMubiArIFwiLVwiICsgaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjYWNoZSB8fCAhdGhpcy5nbHlwaHNbaWRdKSB7XG4gICAgICAgICAgICBkZWYgPSB7IFwic3Ryb2tlLXdpZHRoXCI6IHQgfTtcbiAgICAgICAgICAgIGlmIChjYWNoZSlcbiAgICAgICAgICAgICAgICBkZWYuaWQgPSBpZDtcbiAgICAgICAgICAgIGVsc2UgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgZGVmLmQgPSAocCA/IFwiTVwiICsgcCArIFwiWlwiIDogXCJcIik7XG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicGF0aFwiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x5cGhzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcInVzZVwiLCBkZWYpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIFwiI1wiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfSExJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0hMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfSExJTkUodywgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKVxuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueTEgPSBkZWYueTIgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLngyID0gTWF0aC5mbG9vcih3IC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IHQ7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0hMSU5FO1xufShCQk9YKSk7XG52YXIgQkJPWF9OT05SRU1PVkFCTEUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05PTlJFTU9WQUJMRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05PTlJFTU9WQUJMRSgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05PTlJFTU9WQUJMRTtcbn0oQkJPWF9HKSk7XG52YXIgQkJPWF9OVUxMID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OVUxMLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTlVMTCgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuQ2xlYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTlVMTDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfUkVDVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUkVDVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JFQ1QoaCwgZCwgdywgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGggKyBkO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLnkgPSAtZDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfUkVDVDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfUk9XID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ST1csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ST1coKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmVsZW1zID0gW107XG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLnNkID0gMDtcbiAgICB9XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLkNoZWNrID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRhdGEudG9TVkcoKTtcbiAgICAgICAgdGhpcy5lbGVtcy5wdXNoKHN2Zyk7XG4gICAgICAgIGlmIChkYXRhLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgc3ZnLm1tbCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oID4gdGhpcy5zaCkge1xuICAgICAgICAgICAgdGhpcy5zaCA9IHN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCA+IHRoaXMuc2QpIHtcbiAgICAgICAgICAgIHRoaXMuc2QgPSBzdmcuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLlN0cmV0Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5lbGVtcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSB0aGlzLmVsZW1zW2ldLCBtbWwgPSBzdmcubW1sO1xuICAgICAgICAgICAgaWYgKG1tbCkge1xuICAgICAgICAgICAgICAgIGlmIChtbWwuZm9yY2VTdHJldGNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuaCAhPT0gdGhpcy5zaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmQgIT09IHRoaXMuc2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnID0gbW1sLlNWR3N0cmV0Y2hWKHRoaXMuc2gsIHRoaXMuc2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkhXID0gdGhpcy5zaDtcbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkQgPSB0aGlzLnNkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWMgPSBzdmcuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuQWRkKHN2ZywgdGhpcy53LCAwLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5lbGVtcztcbiAgICB9O1xuICAgIHJldHVybiBCQk9YX1JPVztcbn0oQkJPWCkpO1xudmFyIEJCT1hfU1ZHID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9TVkcsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9TVkcoKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG51bGwsIFwic3ZnXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfU1ZHO1xufShCQk9YKSk7XG52YXIgQkJPWF9WTElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVkxJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9WTElORShoLCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueDIgPSBkZWYueTEgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLnkyID0gTWF0aC5mbG9vcihoIC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1ZMSU5FO1xufShCQk9YKSk7XG52YXIgRWxlbWVudEpheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWxlbWVudEpheCgpIHtcbiAgICB9XG4gICAgcmV0dXJuIEVsZW1lbnRKYXg7XG59KCkpO1xudmFyIE1CYXNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQmFzZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1CYXNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPaCBubyEgQ291bGRuJ3QgZmluZCBlbGVtIGZvciB0aGlzOiBcIiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QkJveCgpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5nZXRNZXRob2RzID0gZnVuY3Rpb24gKGVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBvYmouY29uc3RydWN0b3IucHJvdG90eXBlID0ge307XG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAgICAgICBvYmpbaWRdID0gdGhpcy5wcm90b3R5cGVbaWRdO1xuICAgICAgICB9XG4gICAgICAgIG9iai5lZGl0YWJsZVNWRyA9IGVkaXRhYmxlU1ZHO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVkID0gdGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHN2Zy5zY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLkFkZChyZW5kZXJlZCwgc3ZnLncsIDAsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gY2hpbGQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIik7XG4gICAgICAgIGlmIChzdmcuc2tldyAmJiB0ZXh0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuciA+IHN2Zy53ICYmIHRleHQubGVuZ3RoID09PSAxICYmICF2YXJpYW50Lm5vSUMpIHtcbiAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHY2hpbGRTVkcgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVtpXSA/IHRoaXMuZGF0YVtpXS50b1NWRygpIDogbmV3IEJCT1goKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQgPSBmdW5jdGlvbiAoaSwgSFcsIEQpIHtcbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHtcbiAgICAgICAgICAgIEhXOiBIVyxcbiAgICAgICAgICAgIEQ6IERcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQkJPWCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKEhXKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzYXZlRGF0YSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgaWYgKCF0aGlzLkVkaXRhYmxlU1ZHZGF0YSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS53ID0gc3ZnLncsIHRoaXMuRWRpdGFibGVTVkdkYXRhLnggPSBzdmcueDtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCA9IHN2Zy5oLCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kID0gc3ZnLmQ7XG4gICAgICAgIGlmIChzdmcueSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCArPSBzdmcueTtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgLT0gc3ZnLnk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5YICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5YID0gc3ZnLlg7XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbClcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnR3ID0gc3ZnLnR3O1xuICAgICAgICBpZiAoc3ZnLnNrZXcpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5za2V3ID0gc3ZnLnNrZXc7XG4gICAgICAgIGlmIChzdmcuaWMpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5pYyA9IHN2Zy5pYztcbiAgICAgICAgaWYgKHRoaXNbXCJjbGFzc1wiXSkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIFV0aWwuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogdGhpc1tcImNsYXNzXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pZCkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIFV0aWwuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiaWRcIjogdGhpcy5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaHJlZikge1xuICAgICAgICAgICAgdmFyIGEgPSBVdGlsLkVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IFwibWp4LXN2Zy1ocmVmXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCB0aGlzLmhyZWYpO1xuICAgICAgICAgICAgYS5vbmNsaWNrID0gdGhpcy5TVkdsaW5rO1xuICAgICAgICAgICAgVXRpbC5hZGRFbGVtZW50KGEsIFwicmVjdFwiLCB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHN2Zy53LFxuICAgICAgICAgICAgICAgIGhlaWdodDogc3ZnLmggKyBzdmcuZCxcbiAgICAgICAgICAgICAgICB5OiAtc3ZnLmQsXG4gICAgICAgICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcInBvaW50ZXItZXZlbnRzXCI6IFwiYWxsXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHN2Zy50eXBlID09PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChnLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmFkZE1NTGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHYWRkQ2xhc3Moc3ZnLmVsZW1lbnQsIFwibWp4LXN2Zy1cIiArIHRoaXMudHlwZSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdHlsZSA9IHRoaXMuc3R5bGU7XG4gICAgICAgIGlmIChzdHlsZSAmJiBzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuYm9yZGVyID0gc3ZnLmVsZW1lbnQuc3R5bGUucGFkZGluZyA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUpIHtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IChzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID09PSBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2FkZEF0dHJpYnV0ZXMoc3ZnKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZENsYXNzID0gZnVuY3Rpb24gKG5vZGUsIG5hbWUpIHtcbiAgICAgICAgdmFyIGNsYXNzZXMgPSBub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIChjbGFzc2VzID8gY2xhc3NlcyArIFwiIFwiIDogXCJcIikgKyBuYW1lKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLmF0dHJOYW1lcykge1xuICAgICAgICAgICAgdmFyIGNvcHkgPSB0aGlzLmF0dHJOYW1lcywgc2tpcCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubm9jb3B5QXR0cmlidXRlcywgaWdub3JlID0gTWF0aEpheC5IdWIuY29uZmlnLmlnbm9yZU1NTGF0dHJpYnV0ZXM7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSAodGhpcy50eXBlID09PSBcIm1zdHlsZVwiID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYXRoLnByb3RvdHlwZS5kZWZhdWx0cyA6IHRoaXMuZGVmYXVsdHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBjb3B5Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvcHlbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlnbm9yZVtpZF0gPT0gZmFsc2UgfHwgKCFza2lwW2lkXSAmJiAhaWdub3JlW2lkXSAmJlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c1tpZF0gPT0gbnVsbCAmJiB0eXBlb2YgKHN2Zy5lbGVtZW50W2lkXSkgPT09IFwidW5kZWZpbmVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShpZCwgdGhpcy5hdHRyW2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5rID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHJlZiA9IHRoaXMuaHJlZi5hbmltVmFsO1xuICAgICAgICBpZiAoaHJlZi5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gVXRpbC5oYXNoQ2hlY2soZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaHJlZi5zdWJzdHIoMSkpKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0LnNjcm9sbEludG9WaWV3KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXJlbnROb2RlLnNjcm9sbEludG9WaWV3KHRydWUpO1xuICAgICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmxvY2F0aW9uID0gaHJlZjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHZhciBzcGFuID0gdGhpcy5IVE1MLkVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdwcm9jZXNzU3R5bGVzID0gZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHZhciBzdHlsZXMgPSB7XG4gICAgICAgICAgICBib3JkZXI6IFV0aWwuZ2V0Qm9yZGVycyhzdHlsZSksXG4gICAgICAgICAgICBwYWRkaW5nOiBVdGlsLmdldFBhZGRpbmcoc3R5bGUpXG4gICAgICAgIH07XG4gICAgICAgIGlmICghc3R5bGVzLmJvcmRlcilcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMuYm9yZGVyO1xuICAgICAgICBpZiAoIXN0eWxlcy5wYWRkaW5nKVxuICAgICAgICAgICAgZGVsZXRlIHN0eWxlcy5wYWRkaW5nO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFNpemUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTaXplJ10gPSBzdHlsZS5mb250U2l6ZTtcbiAgICAgICAgaWYgKHN0eWxlLmNvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydjb2xvciddID0gc3R5bGUuY29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5iYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAgICAgICBzdHlsZXNbJ2JhY2tncm91bmQnXSA9IHN0eWxlLmJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTdHlsZSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFN0eWxlJ10gPSBzdHlsZS5mb250U3R5bGU7XG4gICAgICAgIGlmIChzdHlsZS5mb250V2VpZ2h0KVxuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSBzdHlsZS5mb250V2VpZ2h0O1xuICAgICAgICBpZiAoc3R5bGUuZm9udEZhbWlseSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udEZhbWlseSddID0gc3R5bGUuZm9udEZhbWlseTtcbiAgICAgICAgaWYgKHN0eWxlc1snZm9udFdlaWdodCddICYmIHN0eWxlc1snZm9udFdlaWdodCddLm1hdGNoKC9eXFxkKyQvKSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gKHBhcnNlSW50KHN0eWxlc1snZm9udFdlaWdodCddKSA+IDYwMCA/IFwiYm9sZFwiIDogXCJub3JtYWxcIik7XG4gICAgICAgIHJldHVybiBzdHlsZXM7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKHRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudHlwZSAhPT0gXCJtb1wiKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwibHNwYWNlXCIsIFwicnNwYWNlXCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA8PSAwIHx8IHRoaXMuaGFzVmFsdWUoXCJsc3BhY2VcIikgfHwgdGhpcy5oYXNWYWx1ZShcInJzcGFjZVwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubHNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLmxzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMucnNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLnJzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMsIHBhcmVudCA9IHRoaXMuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcmVudCAmJiBwYXJlbnQuaXNFbWJlbGxpc2hlZCgpICYmIHBhcmVudC5Db3JlKCkgPT09IGNvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29yZSA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnggKz0gdmFsdWVzLmxzcGFjZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnJzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLlggPSB2YWx1ZXMucnNwYWNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwYWNlID0gdGhpcy50ZXhTcGFjaW5nKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKCk7XG4gICAgICAgICAgICBpZiAoc3BhY2UgIT09IFwiXCIpXG4gICAgICAgICAgICAgICAgc3ZnLnggKz0gVXRpbC5sZW5ndGgyZW0oc3BhY2UsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZUNvbG9yID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRoY29sb3JcIiwgXCJjb2xvclwiKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzICYmIHRoaXMuc3R5bGVzLmNvbG9yICYmICF2YWx1ZXMuY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5jb2xvciA9IHRoaXMuc3R5bGVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuY29sb3IgJiYgIXRoaXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGNvbG9yID0gdmFsdWVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMubWF0aGNvbG9yLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogdmFsdWVzLm1hdGhjb2xvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBib3JkZXJzID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5ib3JkZXIsIHBhZGRpbmcgPSAodGhpcy5zdHlsZXMgfHwge30pLnBhZGRpbmcsIGJsZWZ0ID0gKChib3JkZXJzIHx8IHt9KS5sZWZ0IHx8IDApLCBwbGVmdCA9ICgocGFkZGluZyB8fCB7fSkubGVmdCB8fCAwKSwgaWQ7XG4gICAgICAgIHZhbHVlcy5iYWNrZ3JvdW5kID0gKHRoaXMubWF0aGJhY2tncm91bmQgfHwgdGhpcy5iYWNrZ3JvdW5kIHx8XG4gICAgICAgICAgICAodGhpcy5zdHlsZXMgfHwge30pLmJhY2tncm91bmQgfHwgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5DT0xPUi5UUkFOU1BBUkVOVCk7XG4gICAgICAgIGlmIChibGVmdCArIHBsZWZ0KSB7XG4gICAgICAgICAgICB2YXIgZHVwID0gbmV3IEJCT1goTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzdmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ZnLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkdXBbaWRdID0gc3ZnW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdXAueCA9IDA7XG4gICAgICAgICAgICBkdXAueSA9IDA7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWRkKGR1cCwgYmxlZnQgKyBwbGVmdCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IHBhZGRpbmcudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBwYWRkaW5nLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICBzdmcudyArPSBib3JkZXJzLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBib3JkZXJzLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gYm9yZGVycy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmJhY2tncm91bmQgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpIHtcbiAgICAgICAgICAgIHZhciBub2RlTmFtZSA9IHN2Zy5lbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAobm9kZU5hbWUgIT09IFwiZ1wiICYmIG5vZGVOYW1lICE9PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gZztcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1JFQ1Qoc3ZnLmgsIHN2Zy5kLCBzdmcudywge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5iYWNrZ3JvdW5kLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH0pLCAwLCAwLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHZhciBkZCA9IDU7XG4gICAgICAgICAgICB2YXIgc2lkZXMgPSB7XG4gICAgICAgICAgICAgICAgbGVmdDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCAtZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgcmlnaHQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgc3ZnLncgLSBib3JkZXJzLnJpZ2h0ICsgZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgdG9wOiBbXCJIXCIsIHN2Zy53LCAwLCBzdmcuaCAtIGJvcmRlcnMudG9wICsgZGRdLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogW1wiSFwiLCBzdmcudywgMCwgLXN2Zy5kIC0gZGRdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzaWRlcykge1xuICAgICAgICAgICAgICAgIGlmIChzaWRlcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2lkZSA9IHNpZGVzW2lkXSwgYm94ID0gQkJPWFtzaWRlWzBdICsgXCJMSU5FXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChib3goc2lkZVsxXSwgYm9yZGVyc1tpZF0sIGJvcmRlcnNbaWQgKyBcIlN0eWxlXCJdLCBib3JkZXJzW2lkICsgXCJDb2xvclwiXSksIHNpZGVbMl0sIHNpZGVbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRWYXJpYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRodmFyaWFudFwiLCBcImZvbnRmYW1pbHlcIiwgXCJmb250d2VpZ2h0XCIsIFwiZm9udHN0eWxlXCIpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHZhbHVlcy5tYXRodmFyaWFudDtcbiAgICAgICAgaWYgKHRoaXMudmFyaWFudEZvcm0pIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBcIi1UZVgtdmFyaWFudFwiO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5oYXNWYXJpYW50ID0gdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgdmFsdWVzLmZhbWlseSA9IHZhbHVlcy5mb250ZmFtaWx5O1xuICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHZhbHVlcy5mb250d2VpZ2h0O1xuICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdmFsdWVzLmZvbnRzdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zdHlsZXMpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHRoaXMuc3R5bGVzLmZvbnRTdHlsZSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodClcbiAgICAgICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gdGhpcy5zdHlsZXMuZm9udFdlaWdodDtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLmZhbWlseSAmJiB0aGlzLnN0eWxlcy5mb250RmFtaWx5KVxuICAgICAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB0aGlzLnN0eWxlcy5mb250RmFtaWx5O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZmFtaWx5ICYmICF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvYm9sZC8pKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IFwiYm9sZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuc3R5bGUgJiYgdmFsdWVzLm1hdGh2YXJpYW50Lm1hdGNoKC9pdGFsaWMvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IFwiaXRhbGljXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGZvcmNlRmFtaWx5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiB2YWx1ZXMuZmFtaWx5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXN0eWxlXCJdID0gdmFsdWVzLnN0eWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXdlaWdodFwiXSA9IHZhbHVlcy53ZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJib2xkXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xERlJBS1RVUixcbiAgICAgICAgICAgICAgICBzY3JpcHQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0NSSVBULFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQubm9ybWFsLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuRlJBS1RVUixcbiAgICAgICAgICAgICAgICBcImJvbGQtc2NyaXB0XCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwiaXRhbGljXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuSVRBTElDLFxuICAgICAgICAgICAgICAgIGJvbGQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGSVRBTElDLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLnN0eWxlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGl0YWxpYzogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgbmFtZSArIFwiLmpzXCI7XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGRyYXcgY3Vyc29yJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3SGlnaGxpZ2h0QXQoc3ZnZWxlbSwgYmIueCwgYmIueSwgYmIud2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRTVkdCQm94ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGVsZW0gPSBlbGVtIHx8IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0gfHwgIWVsZW0ub3duZXJTVkdFbGVtZW50KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgYmIgPSBlbGVtLmdldEJCb3goKTtcbiAgICAgICAgaWYgKGVsZW0ubm9kZU5hbWUgPT09ICd1c2UnKSB7XG4gICAgICAgICAgICBiYi54ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneCcpKTtcbiAgICAgICAgICAgIGJiLnkgKz0gTnVtYmVyKGVsZW0uZ2V0QXR0cmlidXRlKCd5JykpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChlbGVtLm93bmVyU1ZHRWxlbWVudCk7XG4gICAgICAgIHZhciBwdG1wID0gZWxlbS5vd25lclNWR0VsZW1lbnQuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgdmFyIGx4ID0gMSAvIDAsIGx5ID0gMSAvIDAsIGh4ID0gLTEgLyAwLCBoeSA9IC0xIC8gMDtcbiAgICAgICAgY2hlY2soYmIueCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLnggKyBiYi53aWR0aCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogbHgsXG4gICAgICAgICAgICB5OiBseSxcbiAgICAgICAgICAgIHdpZHRoOiBoeCAtIGx4LFxuICAgICAgICAgICAgaGVpZ2h0OiBoeSAtIGx5LFxuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBjaGVjayh4LCB5KSB7XG4gICAgICAgICAgICBwdG1wLnggPSB4O1xuICAgICAgICAgICAgcHRtcC55ID0geTtcbiAgICAgICAgICAgIHZhciBwID0gcHRtcC5tYXRyaXhUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICAgICAgICAgIGx4ID0gTWF0aC5taW4obHgsIHAueCk7XG4gICAgICAgICAgICBseSA9IE1hdGgubWluKGx5LCBwLnkpO1xuICAgICAgICAgICAgaHggPSBNYXRoLm1heChoeCwgcC54KTtcbiAgICAgICAgICAgIGh5ID0gTWF0aC5tYXgoaHksIHAueSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNQmFzZU1peGluO1xufShFbGVtZW50SmF4KSk7XG52YXIgQ2hhcnNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoYXJzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ2hhcnNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIENoYXJzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgbiwgTiwgYywgZm9udCwgVkFSSUFOVCwgaSwgbSwgaWQsIE0sIFJBTkdFUztcbiAgICAgICAgaWYgKCF2YXJpYW50KSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFyaWFudC5mb3JjZUZhbWlseSkge1xuICAgICAgICAgICAgdGV4dCA9IG5ldyBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIHZhcmlhbnQuZm9udCk7XG4gICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQodGV4dCk7XG4gICAgICAgICAgICB0ZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBWQVJJQU5UID0gdmFyaWFudDtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRleHQubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gVkFSSUFOVDtcbiAgICAgICAgICAgIG4gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBjID0gdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICBpZiAobiA+PSAweEQ4MDAgJiYgbiA8IDB4REJGRikge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICBuID0gKCgobiAtIDB4RDgwMCkgPDwgMTApICsgKHRleHQuY2hhckNvZGVBdChpKSAtIDB4REMwMCkpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVERBVEEuUmVtYXBQbGFuZTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG52ID0gRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSBGT05UREFUQS5SQU5HRVM7XG4gICAgICAgICAgICAgICAgZm9yIChpZCA9IDAsIE0gPSBSQU5HRVMubGVuZ3RoOyBpZCA8IE07IGlkKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ubmFtZSA9PT0gXCJhbHBoYVwiICYmIHZhcmlhbnQubm9Mb3dlckNhc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgTiA9IHZhcmlhbnRbXCJvZmZzZXRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE4gJiYgbiA+PSBSQU5HRVNbaWRdLmxvdyAmJiBuIDw9IFJBTkdFU1tpZF0uaGlnaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ucmVtYXAgJiYgUkFOR0VTW2lkXS5yZW1hcFtuXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBOICsgUkFOR0VTW2lkXS5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBuIC0gUkFOR0VTW2lkXS5sb3cgKyBOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLmFkZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuICs9IFJBTkdFU1tpZF0uYWRkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50W1widmFyaWFudFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LnJlbWFwICYmIHZhcmlhbnQucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICBuID0gdmFyaWFudC5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcC52YXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuUkVNQVBbbl0gJiYgIXZhcmlhbnQubm9SZW1hcCkge1xuICAgICAgICAgICAgICAgIG4gPSBGT05UREFUQS5SRU1BUFtuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSBDaGFyc01peGluLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBGKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCQk9YX0dMWVBILmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gQkJPWF9HTFlQSC5wcm90b3R5cGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBnbHlwaCA9IG5ldyBGKGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGdseXBoLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuREVMSU1JVEVSU1tuXSkge1xuICAgICAgICAgICAgICAgIGMgPSB0aGlzLmNyZWF0ZURlbGltaXRlcihuLCAwLCAxLCBmb250KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAoRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKHNjYWxlICogMTAwIC8gRURJVEFCTEVTVkcuY29uZmlnLnNjYWxlLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFyaWFudC5kZWZhdWx0RmFtaWx5IHx8IEVESVRBQkxFU1ZHLmNvbmZpZy51bmRlZmluZWRGYW1pbHksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiAodmFyaWFudC5pdGFsaWMgPyBcIml0YWxpY1wiIDogXCJcIiksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogKHZhcmlhbnQuYm9sZCA/IFwiYm9sZFwiIDogXCJcIilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgICAgICBjID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgIGMuQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5IdWIuc2lnbmFsLlBvc3QoW1wiU1ZHIEpheCAtIHVua25vd24gY2hhclwiLCBuLCB2YXJpYW50XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQubGVuZ3RoID09IDEgJiYgZm9udC5za2V3ICYmIGZvbnQuc2tld1tuXSkge1xuICAgICAgICAgICAgc3ZnLnNrZXcgPSBmb250LnNrZXdbbl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvb2t1cENoYXIgPSBmdW5jdGlvbiAodmFyaWFudCwgbikge1xuICAgICAgICB2YXIgaSwgbTtcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghdmFyaWFudC5GT05UUykge1xuICAgICAgICAgICAgdmFyIEZPTlRTID0gRk9OVERBVEEuRk9OVFM7XG4gICAgICAgICAgICB2YXIgZm9udHMgPSAodmFyaWFudC5mb250cyB8fCBGT05UREFUQS5WQVJJQU5ULm5vcm1hbC5mb250cyk7XG4gICAgICAgICAgICBpZiAoIShmb250cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIGZvbnRzID0gW2ZvbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmZvbnRzICE9IGZvbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250cyA9IGZvbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudC5GT05UUyA9IFtdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IGZvbnRzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChGT05UU1tmb250c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudC5GT05UUy5wdXNoKEZPTlRTW2ZvbnRzW2ldXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB2YXJpYW50LkZPTlRTLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIGZvbnQgPSB2YXJpYW50LkZPTlRTW2ldO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAoZm9udCkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdmFyaWFudC5GT05UUztcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZvbnRbbl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9udDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZEJsb2NrKGZvbnQsIG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogXCJ1bmtub3duXCJcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyID0gZnVuY3Rpb24gKGNvZGUsIEhXLCBzY2FsZSwgZm9udCkge1xuICAgICAgICBpZiAoc2NhbGUgPT09IHZvaWQgMCkgeyBzY2FsZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKGZvbnQgPT09IHZvaWQgMCkgeyBmb250ID0gbnVsbDsgfVxuICAgICAgICB2YXIgRURJVEFCTEVTVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gMTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIGlmICghY29kZSkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogc2NhbGU7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKEhXIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBIVyA9IFtIVywgSFddO1xuICAgICAgICB9XG4gICAgICAgIHZhciBodyA9IEhXWzFdO1xuICAgICAgICBIVyA9IEhXWzBdO1xuICAgICAgICB2YXIgZGVsaW0gPSB7XG4gICAgICAgICAgICBhbGlhczogY29kZSxcbiAgICAgICAgICAgIEhXOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsb2FkOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgICAgICB3aGlsZSAoZGVsaW0uYWxpYXMpIHtcbiAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5hbGlhcztcbiAgICAgICAgICAgIGRlbGltID0gRk9OVERBVEEuREVMSU1JVEVSU1tjb2RlXTtcbiAgICAgICAgICAgIGlmICghZGVsaW0pIHtcbiAgICAgICAgICAgICAgICBkZWxpbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgSFc6IFswLCBGT05UREFUQS5WQVJJQU5UW01hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUxdXSxcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGRpcjogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubG9hZCkge1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKEVESVRBQkxFU1ZHLmZvbnREaXIgKyBcIi9mb250ZGF0YS1cIiArIGRlbGltLmxvYWQgKyBcIi5qc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkZWxpbS5IVy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVswXSAqIHNjYWxlID49IEhXIC0gMTAgLSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuYmxhY2tlciB8fCAoaSA9PSBtIC0gMSAmJiAhZGVsaW0uc3RyZXRjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gZGVsaW0uSFdbaV1bMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVszXSkge1xuICAgICAgICAgICAgICAgICAgICBjb2RlID0gZGVsaW0uSFdbaV1bM107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIFtjb2RlLCBkZWxpbS5IV1tpXVsxXV0sIGZvbnQpLldpdGgoe1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLnN0cmV0Y2gpIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5kaXIgPT0gXCJIXCIpIHtcbiAgICAgICAgICAgICAgICBFRElUQUJMRVNWRy5leHRlbmREZWxpbWl0ZXJIKHN2ZywgaHcsIGRlbGltLnN0cmV0Y2gsIHNjYWxlLCBmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRlbGltLmRpciA9PSBcIlZcIikge1xuICAgICAgICAgICAgICAgIEVESVRBQkxFU1ZHLmV4dGVuZERlbGltaXRlclYoc3ZnLCBodywgZGVsaW0uc3RyZXRjaCwgc2NhbGUsIGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZUNoYXIgPSBmdW5jdGlvbiAoc2NhbGUsIGRhdGEsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiLCB2YXJpYW50ID0ge1xuICAgICAgICAgICAgZm9udHM6IFtkYXRhWzFdXSxcbiAgICAgICAgICAgIG5vUmVtYXA6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBbZGF0YVsxXSArIFwiLWJvbGRcIiwgZGF0YVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiAoZGF0YVsxXSkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBkYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGF0YVswXS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs0XSkge1xuICAgICAgICAgICAgc2NhbGUgPSBzY2FsZSAqIGRhdGFbNF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIGlmIChkYXRhWzJdKSB7XG4gICAgICAgICAgICBzdmcueCA9IGRhdGFbMl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzNdKSB7XG4gICAgICAgICAgICBzdmcueSA9IGRhdGFbM10gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzVdKSB7XG4gICAgICAgICAgICBzdmcuaCArPSBkYXRhWzVdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs2XSkge1xuICAgICAgICAgICAgc3ZnLmQgKz0gZGF0YVs2XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uZmluZEJsb2NrID0gZnVuY3Rpb24gKGZvbnQsIGMpIHtcbiAgICAgICAgaWYgKGZvbnQuUmFuZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGZvbnQuUmFuZ2VzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChjIDwgZm9udC5SYW5nZXNbaV1bMF0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSBmb250LlJhbmdlc1tpXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IGZvbnQuUmFuZ2VzW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gZm9udC5SYW5nZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb250LlJhbmdlc1tqXVsyXSA9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udC5SYW5nZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udC5kaXJlY3RvcnkgKyBcIi9cIiArIGZpbGUgKyBcIi5qc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENoYXJzTWl4aW4ubG9hZEZvbnQgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuZm9udERpciArIFwiL1wiICsgZmlsZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIENoYXJzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBFbnRpdHlNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEVudGl0eU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEVudGl0eU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgRW50aXR5TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLnRvU3RyaW5nKCkucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICB9O1xuICAgIHJldHVybiBFbnRpdHlNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIEhvbGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhIb2xlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEhvbGUoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBIb2xlLnByb3RvdHlwZS5Jbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnR5cGUgPSBcImhvbGVcIjtcbiAgICAgICAgdGhpcy5kYXRhID0gW107XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIEhvbGUucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05PTlRSSVZJQUwgSE9MRSEhIScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgaG9sZSA9IG5ldyBCQk9YX1JFQ1QoNDAwLCAwLCAzMDAsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZScsXG4gICAgICAgICAgICBzdHJva2U6ICdibHVlJyxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6ICcyMCdcbiAgICAgICAgfSk7XG4gICAgICAgIHN2Zy5BZGQoaG9sZSwgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb2xlIGRvZXMgbm90IGhhdmUgYSBjaGlsZCcpO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGJib3gud2lkdGggLyAyLjApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBIb2xlO1xufShNQmFzZU1peGluKSk7XG52YXIgTUFjdGlvbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUFjdGlvbk1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1BY3Rpb25NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1BY3Rpb25NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTUFjdGlvbk1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTWF0aE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWF0aE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hdGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChzcGFuLCBkaXYsIHJlcGxhY2UpIHtcbiAgICAgICAgdmFyIENPTkZJRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZztcbiAgICAgICAgdGhpcy5sb2FkVGV4aWZ5KCk7XG4gICAgICAgIGlmICghdGhpcy5kYXRhWzBdKVxuICAgICAgICAgICAgcmV0dXJuIHNwYW47XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlBbGlnbiA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5QWxpZ247XG4gICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSBNYXRoSmF4Lkh1Yi5jb25maWcuZGlzcGxheUluZGVudDtcbiAgICAgICAgaWYgKFN0cmluZyhNYXRoSmF4Lkh1Yi5jb25maWcuZGlzcGxheUluZGVudCkubWF0Y2goL14wKCR8W2EteiVdKS9pKSlcbiAgICAgICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSBcIjBcIjtcbiAgICAgICAgdmFyIGJveCA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIGRhdGFTdmcgPSB0aGlzLmRhdGFbMF0udG9TVkcoKTtcbiAgICAgICAgYm94LkFkZChkYXRhU3ZnLCAwLCAwLCB0cnVlKTtcbiAgICAgICAgYm94LkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3IoYm94KTtcbiAgICAgICAgVXRpbC5FbGVtZW50KGJveC5lbGVtZW50LCB7XG4gICAgICAgICAgICBzdHJva2U6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBmaWxsOiBcImN1cnJlbnRDb2xvclwiLFxuICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogMCxcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJtYXRyaXgoMSAwIDAgLTEgMCAwKVwiXG4gICAgICAgIH0pO1xuICAgICAgICBib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfU1ZHKCk7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhtbG5zOnhsaW5rXCIsIFV0aWwuWExJTktOUyk7XG4gICAgICAgIGlmIChDT05GSUcudXNlRm9udENhY2hlICYmICFDT05GSUcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKEJCT1guZGVmcyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoIXNwYW4pIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGwgPSBNYXRoLm1heCgtc3ZnLmwsIDApLCByID0gTWF0aC5tYXgoc3ZnLnIgLSBzdmcudywgMCk7XG4gICAgICAgIHZhciBzdHlsZSA9IHN2Zy5lbGVtZW50LnN0eWxlO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBVdGlsLkV4KGwgKyBzdmcudyArIHIpKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFV0aWwuRXgoc3ZnLkggKyBzdmcuRCArIDIgKiBVdGlsLmVtKSk7XG4gICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuRCAtIDIgKiBVdGlsLmVtKTtcbiAgICAgICAgc3R5bGUubWFyZ2luTGVmdCA9IFV0aWwuRXgoLWwpO1xuICAgICAgICBzdHlsZS5tYXJnaW5SaWdodCA9IFV0aWwuRXgoLXIpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ2aWV3Qm94XCIsIFV0aWwuRml4ZWQoLWwsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKC1zdmcuSCAtIFV0aWwuZW0sIDEpICsgXCIgXCIgK1xuICAgICAgICAgICAgVXRpbC5GaXhlZChsICsgc3ZnLncgKyByLCAxKSArIFwiIFwiICsgVXRpbC5GaXhlZChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0sIDEpKTtcbiAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gc3R5bGUubWFyZ2luQm90dG9tID0gXCIxcHhcIjtcbiAgICAgICAgaWYgKHN2Zy5IID4gc3ZnLmgpIHtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpblRvcCA9IFV0aWwuRXgoc3ZnLmggLSBzdmcuSCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5EID4gc3ZnLmQpIHtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpbkJvdHRvbSA9IFV0aWwuRXgoc3ZnLmQgLSBzdmcuRCk7XG4gICAgICAgICAgICBzdHlsZS52ZXJ0aWNhbEFsaWduID0gVXRpbC5FeCgtc3ZnLmQpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhbHR0ZXh0ID0gdGhpcy5HZXQoXCJhbHR0ZXh0XCIpO1xuICAgICAgICBpZiAoYWx0dGV4dCAmJiAhc3ZnLmVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiKSlcbiAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBhbHR0ZXh0KTtcbiAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwibWF0aFwiKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncmVuZGVyZWQtc3ZnLW91dHB1dCcpO1xuICAgICAgICB2YXIgcHJldmlvdXMgPSBzcGFuLnF1ZXJ5U2VsZWN0b3IoJy5yZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHByZXZpb3VzKSB7XG4gICAgICAgICAgICBzcGFuLnJlcGxhY2VDaGlsZChzdmcuZWxlbWVudCwgcHJldmlvdXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLmVsZW1lbnQgPSBudWxsO1xuICAgICAgICBpZiAoIXRoaXMuaXNNdWx0aWxpbmUgJiYgdGhpcy5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIgJiYgIXN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50YWxpZ25maXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdGhpcy5kaXNwbGF5QWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0Zmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UU0hJRlQuSU5ERU5UU0hJRlQpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSB2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnQgPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuaW5kZW50c2hpZnQsIDEsIHRoaXMuZWRpdGFibGVTVkcuY3dpZHRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXlJbmRlbnQgIT09IFwiMFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGVudCA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuZGlzcGxheUluZGVudCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIHNoaWZ0ICs9ICh2YWx1ZXMuaW5kZW50YWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uUklHSFQgPyAtaW5kZW50IDogaW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5zdHlsZS50ZXh0QWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ247XG4gICAgICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQoc3R5bGUsICh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IFV0aWwuRXgoc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVt2YWx1ZXMuaW5kZW50YWxpZ25dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhbjtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubG9hZFRleGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlKCd0ZXhpZnknKTtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUuaW5zdGFsbEN1cnNvckxpc3RlbmVycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGF0Lm90aGVyQ3Vyc29ycyA9IHt9O1xuICAgICAgICB2YXIgaWQgPSAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5hdHRyKFwiaWRcIik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVnaXN0ZXJpbmcgbGlzdGVuZXJzIG9uIElEOiBcIiwgaWQpO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBtb3ZlX2ludG9fZnJvbV9sZWZ0XCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5jdXJzb3I7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBtb3ZlIGludG8gZnJvbSBsZWZ0ISBJRDogXCIpO1xuICAgICAgICAgICAgdGhhdC5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgICQodGhhdC5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBtb3ZlX2ludG9fZnJvbV9yaWdodFwiLCBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgaWYgKGFyZ3NbMV0gIT0gaWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRoYXQuY3Vyc29yO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3QgbW92ZSBpbnRvIGZyb20gcmlnaHQhIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uTEVGVCk7XG4gICAgICAgICAgICAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgbW92ZV9pbnRvX2Zyb21fdG9wXCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5jdXJzb3I7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBtb3ZlIGludG8gZnJvbSB0b3AhIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uVVApO1xuICAgICAgICAgICAgJCh0aGF0LkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5NZXNzYWdlSG9vayhcIkVkaXRhYmxlU1ZHIG1vdmVfaW50b19mcm9tX2JvdHRvbVwiLCBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgaWYgKGFyZ3NbMV0gIT0gaWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRoYXQuY3Vyc29yO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3QgbW92ZSBpbnRvIGZyb20gYm90dG9tISBJRDogXCIpO1xuICAgICAgICAgICAgdGhhdC5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgRGlyZWN0aW9uLkRPV04pO1xuICAgICAgICAgICAgJCh0aGF0LkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5NZXNzYWdlSG9vayhcIkVkaXRhYmxlU1ZHIGRyYXdfb3RoZXJfY3Vyc29yXCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlByb2Nlc3NpbmcgZHJhdyBvdGhlciBjdXJzb3JcIik7XG4gICAgICAgICAgICB2YXIgY3Vyc29ySUQgPSBhcmdzWzJdO1xuICAgICAgICAgICAgdmFyIHBhdGggPSBhcmdzWzNdO1xuICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gYXJnc1s0XTtcbiAgICAgICAgICAgIHZhciBjb2xvciA9IGFyZ3NbNV07XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoYXQ7XG4gICAgICAgICAgICB3aGlsZSAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUuZGF0YVtwYXRoLnNoaWZ0KCldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEoY3Vyc29ySUQgaW4gdGhhdC5vdGhlckN1cnNvcnMpKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdID0gbmV3IEN1cnNvcihjb2xvciwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdO1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyhub2RlLCBwb3NpdGlvbik7XG4gICAgICAgICAgICBjdXJzb3IuZHJhdygpO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgY2xlYXJfb3RoZXJfY3Vyc29yXCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlByb2Nlc3NpbmcgY2xlYXIgb3RoZXIgY3Vyc29yXCIpO1xuICAgICAgICAgICAgdmFyIGN1cnNvcklEID0gYXJnc1sxXTtcbiAgICAgICAgICAgIGlmIChjdXJzb3JJRCBpbiB0aGF0Lm90aGVyQ3Vyc29ycykge1xuICAgICAgICAgICAgICAgIHRoYXQub3RoZXJDdXJzb3JzW2N1cnNvcklEXS5ibHVyKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoYXQub3RoZXJDdXJzb3JzW2N1cnNvcklEXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHZhciBpZCA9ICQodGhpcy5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmF0dHIoXCJpZFwiKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgbW92ZV9jdXJzb3JfbGVmdFwiLCBpZF0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5Qb3N0KFtcIkVkaXRhYmxlU1ZHIG1vdmVfY3Vyc29yX3JpZ2h0XCIsIGlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgbW92ZV9jdXJzb3JfdXBcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBtb3ZlX2N1cnNvcl9kb3duXCIsIGlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIE1hdGhNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1FbmNsb3NlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRW5jbG9zZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FbmNsb3NlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRW5jbG9zZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNRW5jbG9zZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUVycm9yTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRXJyb3JNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRXJyb3JNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FcnJvck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLnN0eWxlcy5mb250U2l6ZSB8fCAxKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGRlZiA9IChzY2FsZSAhPT0gMSA/IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCJcbiAgICAgICAgfSA6IHt9KTtcbiAgICAgICAgdmFyIGJib3ggPSBuZXcgQkJPWChkZWYpO1xuICAgICAgICBiYm94LkFkZCh0aGlzLlNWR2NoaWxkU1ZHKDApKTtcbiAgICAgICAgYmJveC5DbGVhbigpO1xuICAgICAgICBpZiAoc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIGJib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGFkanVzdCA9IFtcIndcIiwgXCJoXCIsIFwiZFwiLCBcImxcIiwgXCJyXCIsIFwiRFwiLCBcIkhcIl07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGFkanVzdC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBiYm94W2FkanVzdFtpXV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChiYm94KTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBVdGlsLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubWVycm9yU3R5bGVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydCh0aGlzLnN0eWxlcywgdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1FcnJvck1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUZlbmNlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZlbmNlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GZW5jZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GZW5jZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLm9wZW4pIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEub3Blbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMSwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW1wic2VwXCIgKyBpXSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW1wic2VwXCIgKyBpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEuY2xvc2UpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEuY2xvc2UpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNRmVuY2VkTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRnJhY01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZyYWNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRnJhY01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIGZyYWMgPSBuZXcgQkJPWCgpO1xuICAgICAgICBmcmFjLnNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKGZyYWMpO1xuICAgICAgICB2YXIgbnVtID0gdGhpcy5TVkdjaGlsZFNWRygwKSwgZGVuID0gdGhpcy5TVkdjaGlsZFNWRygxKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwibGluZXRoaWNrbmVzc1wiLCBcIm51bWFsaWduXCIsIFwiZGVub21hbGlnblwiLCBcImJldmVsbGVkXCIpO1xuICAgICAgICB2YXIgaXNEaXNwbGF5ID0gdmFsdWVzLmRpc3BsYXlzdHlsZTtcbiAgICAgICAgdmFyIGEgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlO1xuICAgICAgICBpZiAodmFsdWVzLmJldmVsbGVkKSB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSAoaXNEaXNwbGF5ID8gNDAwIDogMTUwKTtcbiAgICAgICAgICAgIHZhciBIID0gTWF0aC5tYXgobnVtLmggKyBudW0uZCwgZGVuLmggKyBkZW4uZCkgKyAyICogZGVsdGE7XG4gICAgICAgICAgICB2YXIgYmV2ZWwgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDJGLCBIKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKG51bSwgMCwgKG51bS5kIC0gbnVtLmgpIC8gMiArIGEgKyBkZWx0YSk7XG4gICAgICAgICAgICBmcmFjLkFkZChiZXZlbCwgbnVtLncgLSBkZWx0YSAvIDIsIChiZXZlbC5kIC0gYmV2ZWwuaCkgLyAyICsgYSk7XG4gICAgICAgICAgICBmcmFjLkFkZChkZW4sIG51bS53ICsgYmV2ZWwudyAtIGRlbHRhLCAoZGVuLmQgLSBkZW4uaCkgLyAyICsgYSAtIGRlbHRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBXID0gTWF0aC5tYXgobnVtLncsIGRlbi53KTtcbiAgICAgICAgICAgIHZhciB0ID0gVXRpbC50aGlja25lc3MyZW0odmFsdWVzLmxpbmV0aGlja25lc3MsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGUsIHAsIHEsIHUsIHY7XG4gICAgICAgICAgICB2YXIgbXQgPSBVdGlsLlRlWC5taW5fcnVsZV90aGlja25lc3MgLyBVdGlsLmVtICogMTAwMDtcbiAgICAgICAgICAgIGlmIChpc0Rpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICB1ID0gVXRpbC5UZVgubnVtMTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdSA9ICh0ID09PSAwID8gVXRpbC5UZVgubnVtMyA6IFV0aWwuVGVYLm51bTIpO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1ICo9IHNjYWxlO1xuICAgICAgICAgICAgdiAqPSBzY2FsZTtcbiAgICAgICAgICAgIGlmICh0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyA3IDogMykgKiBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcywgMiAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgdiArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy53ID0gVztcbiAgICAgICAgICAgICAgICB0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gMiA6IDApICogbXQgKyB0LCB0IC8gMiArIDEuNSAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoYSArIHQgLyAyKTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcSA9IChhIC0gdCAvIDIpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMuQWRkKG5ldyBCQk9YX1JFQ1QodCAvIDIsIHQgLyAyLCBXICsgMiAqIHQpLCAwLCBhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWMuQWxpZ24obnVtLCB2YWx1ZXMubnVtYWxpZ24sIHQsIHUpO1xuICAgICAgICAgICAgZnJhYy5BbGlnbihkZW4sIHZhbHVlcy5kZW5vbWFsaWduLCB0LCAtdik7XG4gICAgICAgIH1cbiAgICAgICAgZnJhYy5DbGVhbigpO1xuICAgICAgICBzdmcuQWRkKGZyYWMsIDAsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnRleFdpdGhEZWxpbXMgJiYgIXRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UuY2FsbCh0aGlzLCBzdmcpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBtaWRsaW5lWSA9IGJiLnkgKyAoYmIuaGVpZ2h0IC8gMi4wKTtcbiAgICAgICAgdmFyIG1pZGxpbmVYID0gYmIueCArIChiYi53aWR0aCAvIDIuMCk7XG4gICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAoeCA8IG1pZGxpbmVYKSA/IDAgOiAxLFxuICAgICAgICAgICAgaGFsZjogKHkgPCBtaWRsaW5lWSkgPyAwIDogMSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvcicpO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdmFyIGlzTnVtZXJhdG9yID0gdGhpcy5kYXRhWzBdID09PSBjaGlsZDtcbiAgICAgICAgdmFyIGlzRGVub21pbmF0b3IgPSB0aGlzLmRhdGFbMV0gPT09IGNoaWxkO1xuICAgICAgICBpZiAoIWlzTnVtZXJhdG9yICYmICFpc0Rlbm9taW5hdG9yKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTcGVjaWZpZWQgY2hpbGQgbm90IGZvdW5kIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIGlmIChpc051bWVyYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0Rlbm9taW5hdG9yICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2VlcCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKGlzTnVtZXJhdG9yID8gMCA6IDEsIGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9IYWxmID0gZnVuY3Rpb24gKGhhbGYsIGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaGFsZl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICAgIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW2hhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmIChiYiAmJiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMikge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIGhhbGY6IGhhbGYsXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDAsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9EZW5vbWluYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigxLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5MRUZUOlxuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uUklHSFQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVswXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICAgICAgICAgIGhhbGY6IDAsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDAgOiAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uVVA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5ET1dOOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPyBiYm94LndpZHRoICsgMTAwIDogLTEwMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICByZXR1cm4gTUZyYWNNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1HbHlwaE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUdseXBoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUdseXBoTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNR2x5cGhNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICA7XG4gICAgcmV0dXJuIE1HbHlwaE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTU11bHRpU2NyaXB0c01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTU11bHRpU2NyaXB0c01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1NdWx0aVNjcmlwdHNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1NdWx0aVNjcmlwdHNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTU11bHRpU2NyaXB0c01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTW5NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW5NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1uTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZ2V0Q3Vyc29yTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLmRhdGFbMF0ubGVuZ3RoO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgYXMgY3Vyc29yIGNvbnRhaW5lcicpO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmdldEN1cnNvckxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmdldEN1cnNvckxlbmd0aCgpOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTW5NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1vTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNb01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1vTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNb01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICBpZiAoSFcgPT09IHZvaWQgMCkgeyBIVyA9IG51bGw7IH1cbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImxhcmdlb3BcIiwgXCJkaXNwbGF5c3R5bGVcIik7XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwiLWxhcmdlT3BcIiA6IFwiLXNtYWxsT3BcIl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICB2YXIgaXNTY3JpcHQgPSAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKSAmJiB0aGlzICE9PSBwYXJlbnQuZGF0YVswXSk7XG4gICAgICAgIHZhciBtYXBjaGFycyA9IChpc1NjcmlwdCA/IHRoaXMucmVtYXBDaGFycyA6IG51bGwpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXVuZGVyb3ZlcikgJiZcbiAgICAgICAgICAgIHRoaXMuQ29yZVRleHQocGFyZW50LmRhdGFbcGFyZW50LmJhc2VdKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBvdmVyID0gcGFyZW50LmRhdGFbcGFyZW50Lm92ZXJdLCB1bmRlciA9IHBhcmVudC5kYXRhW3BhcmVudC51bmRlcl07XG4gICAgICAgICAgICBpZiAob3ZlciAmJiB0aGlzID09PSBvdmVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnRcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgbWFwY2hhcnMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFVOREVSO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1NjcmlwdCAmJiB0aGlzLmRhdGEuam9pbihcIlwiKS5tYXRjaCgvWydgXCJcXHUwMEI0XFx1MjAzMi1cXHUyMDM3XFx1MjA1N10vKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbXCItVGVYLXZhcmlhbnRcIl07XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGFbaV0udG9TVkcodmFyaWFudCwgc2NhbGUsIHRoaXMucmVtYXAsIG1hcGNoYXJzKSwgeCA9IHN2Zy53O1xuICAgICAgICAgICAgICAgIGlmICh4ID09PSAwICYmIC10ZXh0LmwgPiAxMCAqIHRleHQudykge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IC10ZXh0Lmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQodGV4dCwgeCwgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRleHQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IHRleHQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmxhcmdlb3ApIHtcbiAgICAgICAgICAgIHN2Zy55ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoc3ZnLmggLSBzdmcuZCkgLyAyIC8gc2NhbGU7XG4gICAgICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXRoaXMuR2V0KFwic3RyZXRjaHlcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYyA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoYy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFtjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVJbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjID0gRk9OVERBVEEuREVMSU1JVEVSU1tjLmNoYXJDb2RlQXQoMCldO1xuICAgICAgICB2YXIgY2FuID0gKGMgJiYgYy5kaXIgPT0gZGlyZWN0aW9uLnN1YnN0cigwLCAxKSk7XG4gICAgICAgIGlmICghY2FuKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSBjYW4gJiYgKHRoaXMuR2V0KFwibWluc2l6ZVwiLCB0cnVlKSB8fCB0aGlzLkdldChcIm1heHNpemVcIiwgdHJ1ZSkpO1xuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzeW1tZXRyaWNcIiwgXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiKTtcbiAgICAgICAgdmFyIGF4aXMgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHN2Zy5zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2ZyksIEg7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gMiAqIE1hdGgubWF4KGggLSBheGlzLCBkICsgYXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gaCArIGQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIEggPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIEgpKTtcbiAgICAgICAgaWYgKEggIT0gdmFsdWVzLm1pbnNpemUpIHtcbiAgICAgICAgICAgIEggPSBbTWF0aC5tYXgoSCAqIFV0aWwuVGVYLmRlbGltaXRlcmZhY3RvciAvIDEwMDAsIEggLSBVdGlsLlRlWC5kZWxpbWl0ZXJzaG9ydGZhbGwpLCBIXTtcbiAgICAgICAgfVxuICAgICAgICBzdmcgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCBILCBzdmcuc2NhbGUpO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAvIDIgKyBheGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAqIGggLyAoaCArIGQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy55ID0gSCAtIHN2Zy5oO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiLCBcIm1hdGh2YXJpYW50XCIsIFwiZm9udHdlaWdodFwiKTtcbiAgICAgICAgaWYgKCh2YWx1ZXMuZm9udHdlaWdodCA9PT0gXCJib2xkXCIgfHwgcGFyc2VJbnQodmFsdWVzLmZvbnR3ZWlnaHQpID49IDYwMCkgJiZcbiAgICAgICAgICAgICF0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHZhcmlhbnQgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB3ID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCB3KSk7XG4gICAgICAgIHN2ZyA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIHcsIHN2Zy5zY2FsZSwgdmFsdWVzLm1hdGh2YXJpYW50KTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1vTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUGFkZGVkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGFkZGVkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBhZGRlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgcGFkID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIiwgXCJsc3BhY2VcIiwgXCJ2b2Zmc2V0XCIpLCBYID0gMCwgWSA9IDA7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSkge1xuICAgICAgICAgICAgICAgIFggPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy5sc3BhY2UsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMudm9mZnNldCkge1xuICAgICAgICAgICAgICAgIFkgPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy52b2Zmc2V0LCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaCA9IHBhZC5oLCBkID0gcGFkLmQsIHcgPSBwYWQudywgeSA9IHBhZC55O1xuICAgICAgICAgICAgc3ZnLkFkZChwYWQsIFgsIFkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBzdmcuaCA9IGggKyB5O1xuICAgICAgICAgICAgc3ZnLmQgPSBkIC0geTtcbiAgICAgICAgICAgIHN2Zy53ID0gdztcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmhlaWdodCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5oID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuaGVpZ2h0LCBtdSwgXCJoXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5kZXB0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5kID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuZGVwdGgsIG11LCBcImRcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLndpZHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy53aWR0aCwgbXUsIFwid1wiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaCA+IHN2Zy5IKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkggPSBzdmcuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChzdmcuZCA+IHN2Zy5EKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkQgPSBzdmcuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTVBhZGRlZE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVBoYW50b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QaGFudG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBoYW50b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QaGFudG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUNoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1QaGFudG9tTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3FydE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNxcnRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3FydE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApO1xuICAgICAgICB2YXIgcnVsZTtcbiAgICAgICAgdmFyIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIHZhciBxO1xuICAgICAgICB2YXIgSDtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIHJldHVybiBNU3FydE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVJvb3RNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb290TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvb3RNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApO1xuICAgICAgICB2YXIgcnVsZTtcbiAgICAgICAgdmFyIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIHZhciBxO1xuICAgICAgICB2YXIgSDtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICB2YXIgZHggPSAoc3VyZC5pc011bHRpQ2hhciA/IC41NSA6IC42NSkgKiBzdXJkLnc7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMV0pIHtcbiAgICAgICAgICAgIHZhciByb290ID0gdGhpcy5kYXRhWzFdLnRvU1ZHKCk7XG4gICAgICAgICAgICByb290LnggPSAwO1xuICAgICAgICAgICAgdmFyIGggPSB0aGlzLlNWR3Jvb3RIZWlnaHQoc3VyZC5oICsgc3VyZC5kLCBzY2FsZSwgcm9vdCkgLSBkO1xuICAgICAgICAgICAgdmFyIHcgPSBNYXRoLm1pbihyb290LncsIHJvb3Qucik7XG4gICAgICAgICAgICB4ID0gTWF0aC5tYXgodywgZHgpO1xuICAgICAgICAgICAgc3ZnLkFkZChyb290LCB4IC0gdywgaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkeCA9IHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggLSBkeDtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR3Jvb3RIZWlnaHQgPSBmdW5jdGlvbiAoZCwgc2NhbGUsIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIC40NSAqIChkIC0gOTAwICogc2NhbGUpICsgNjAwICogc2NhbGUgKyBNYXRoLm1heCgwLCByb290LmQgLSA3NSk7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjLCBkLCB0aGlzKTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjLCBkKTtcbiAgICB9O1xuICAgIHJldHVybiBNUm9vdE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvd01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpXG4gICAgICAgICAgICBzdmcgPSB0aGlzLlNWR211bHRpbGluZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5saW5lYnJlYWtDb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYyAmJlxuICAgICAgICAgICAgc3ZnLncgPiB0aGlzLmVkaXRhYmxlU1ZHLmxpbmVicmVha1dpZHRoKSB8fCB0aGlzLmhhc05ld2xpbmUoKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbXVsdGlsaW5lID0gZnVuY3Rpb24gKHNwYW4pIHtcbiAgICAgICAgcmV0dXJuIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlKFwibXVsdGlsaW5lXCIpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgdyksIHN2Zy53LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yUGFzc3Rocm91Z2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gdGhpcy5kYXRhW2NoaWxkSWR4XSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGRJZHggPT09IHRoaXMuZGF0YS5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNwZWNpZmllZCBjaGlsZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHggKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHRoaXMuZGF0YVtjaGlsZElkeF07XG4gICAgICAgICAgICB2YXIgYmIgPSBjaGlsZC5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGRQb3NpdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyBjdXJzb3IucG9zaXRpb24gLSAxIDogY3Vyc29yLnBvc2l0aW9uO1xuICAgICAgICBpZiAoY3Vyc29yLm1vZGUgPT09IGN1cnNvci5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbY2hpbGRQb3NpdGlvbl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3JIaWdobGlnaHQgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB2YXIgY3VyID0gY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGU7XG4gICAgICAgICAgICB2YXIgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgICAgIGlmIChjdXIucGFyZW50ID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5kYXRhLmluZGV4T2YoY3VyKSArIDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHNlbGVjdGlvblN0YXJ0IG5vdCBpbiBtcm93XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uRW5kLm5vZGUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIHZhciBwb3MyID0gTWF0aC5tYXgoY3Vyc29yLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCBjdXJzb3Iuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgaWYgKHBvczEgPT09IHBvczIpIHtcbiAgICAgICAgICAgIGN1cnNvci5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4MSA9IHRoaXMuZGF0YVtwb3MxXS5nZXRTVkdCQm94KCkueDtcbiAgICAgICAgdmFyIHBvczJiYiA9IHRoaXMuZGF0YVtwb3MyIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeDIgPSBwb3MyYmIueCArIHBvczJiYi53aWR0aDtcbiAgICAgICAgdmFyIHdpZHRoID0geDIgLSB4MTtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIHgxLCBiYi55LCB3aWR0aCwgYmIuaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNUm93TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTXNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTXNNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TcGFjZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNwYWNlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNwYWNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3BhY2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIik7XG4gICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMubWF0aGJhY2tncm91bmQ7XG4gICAgICAgIGlmICh0aGlzLmJhY2tncm91bmQgJiYgIXRoaXMubWF0aGJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMuYmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLm1zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHN2Zy5oID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmhlaWdodCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy5kID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmRlcHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIGlmIChzdmcudyA8IDApIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmggPCAtc3ZnLmQpIHtcbiAgICAgICAgICAgIHN2Zy5kID0gLXN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5sID0gMDtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1TcGFjZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVN0eWxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3R5bGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3R5bGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIG1hdGggPSBzdmcuQWRkKHRoaXMuZGF0YVswXS50b1NWRygpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgaWYgKG1hdGguaWMpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBtYXRoLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN0eWxlTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3ViU3VwTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3ViU3VwTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN1YlN1cE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAxO1xuICAgIH1cbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQodGhpcy5iYXNlLCBIVywgRCkpO1xuICAgICAgICB2YXIgc3NjYWxlID0gKHRoaXMuZGF0YVt0aGlzLnN1cF0gfHwgdGhpcy5kYXRhW3RoaXMuc3ViXSB8fCB0aGlzKS5TVkdnZXRTY2FsZSgpO1xuICAgICAgICB2YXIgeF9oZWlnaHQgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlLCBzID0gVXRpbC5UZVguc2NyaXB0c3BhY2UgKiBzY2FsZTtcbiAgICAgICAgdmFyIHN1cCwgc3ViO1xuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdXBdKSkge1xuICAgICAgICAgICAgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXS50b1NWRygpO1xuICAgICAgICAgICAgc3VwLncgKz0gcztcbiAgICAgICAgICAgIHN1cC5yID0gTWF0aC5tYXgoc3VwLncsIHN1cC5yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdWJdKSkge1xuICAgICAgICAgICAgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXS50b1NWRygpO1xuICAgICAgICAgICAgc3ViLncgKz0gcztcbiAgICAgICAgICAgIHN1Yi5yID0gTWF0aC5tYXgoc3ViLncsIHN1Yi5yKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IFV0aWwuVGVYLnN1cF9kcm9wICogc3NjYWxlLCByID0gVXRpbC5UZVguc3ViX2Ryb3AgKiBzc2NhbGU7XG4gICAgICAgIHZhciB1ID0gYmFzZS5oICsgKGJhc2UueSB8fCAwKSAtIHEsIHYgPSBiYXNlLmQgLSAoYmFzZS55IHx8IDApICsgciwgZGVsdGEgPSAwLCBwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgYmFzZS53IC09IGJhc2UuaWM7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdICYmXG4gICAgICAgICAgICAodGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtaVwiIHx8IHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibW9cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIGJhc2Uuc2NhbGUgPT09IDEgJiZcbiAgICAgICAgICAgICAgICAhYmFzZS5zdHJldGNoZWQgJiYgIXRoaXMuZGF0YVt0aGlzLmJhc2VdLkdldChcImxhcmdlb3BcIikpIHtcbiAgICAgICAgICAgICAgICB1ID0gdiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuZ2V0VmFsdWVzKFwic3Vic2NyaXB0c2hpZnRcIiwgXCJzdXBlcnNjcmlwdHNoaWZ0XCIpO1xuICAgICAgICBtaW4uc3Vic2NyaXB0c2hpZnQgPSAobWluLnN1YnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdWJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgbWluLnN1cGVyc2NyaXB0c2hpZnQgPSAobWluLnN1cGVyc2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1cGVyc2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIHZhciB4ID0gYmFzZS53ICsgYmFzZS54O1xuICAgICAgICBpZiAoIXN1cCkge1xuICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIxICogc2NhbGUsIHN1Yi5oIC0gKDQgLyA1KSAqIHhfaGVpZ2h0LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtdik7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwidGV4cHJpbWVzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBwID0gVXRpbC5UZVhbKHZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcInN1cDFcIiA6ICh2YWx1ZXMudGV4cHJpbWVzdHlsZSA/IFwic3VwM1wiIDogXCJzdXAyXCIpKV07XG4gICAgICAgICAgICAgICAgdSA9IE1hdGgubWF4KHUsIHAgKiBzY2FsZSwgc3VwLmQgKyAoMSAvIDQpICogeF9oZWlnaHQsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCB1KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gdTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIyICogc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICBpZiAoKHUgLSBzdXAuZCkgLSAoc3ViLmggLSB2KSA8IDMgKiB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSAzICogdCAtIHUgKyBzdXAuZCArIHN1Yi5oO1xuICAgICAgICAgICAgICAgICAgICBxID0gKDQgLyA1KSAqIHhfaGVpZ2h0IC0gKHUgLSBzdXAuZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdSArPSBxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiAtPSBxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3QubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAxIDogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgdmFyIHNtYWxsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgPyB0aGlzLnN1YiA6IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIGJhc2VCQiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmFzZUJCIHx8ICFjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5kYXRhW3NtYWxsXSA/IHNtYWxsIDogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAmJiB0aGlzLmRhdGFbc21hbGxdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtzbWFsbF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtzbWFsbF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbc21hbGxdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHNtYWxsLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1YjtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1YkJCLnggKyAoc3ViQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1cEJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3VwQkIueCArIChzdXBCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGJhc2UuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1YixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJblZlcnRpY2FsbHkgPSB2ZXJ0aWNhbCAmJiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApID09PSAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViKTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbkhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgIHZhciBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0F3YXkgPSB2ZXJ0aWNhbCA/ICFtb3ZpbmdJblZlcnRpY2FsbHkgOiAhdGhpcy5yaWdodE1vdmVTdGF5ICYmIG1vdmVSaWdodEhvcml6b250YWxseTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbiA9IG1vdmluZ0luVmVydGljYWxseSB8fCBtb3ZpbmdJbkhvcml6b250YWxseSB8fCBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgJiYgdGhpcy5yaWdodE1vdmVTdGF5O1xuICAgICAgICAgICAgaWYgKG1vdmluZ0F3YXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtb3ZpbmdJbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdWJTdXBNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1UYWJsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiY29sdW1uYWxpZ25cIiwgXCJyb3dhbGlnblwiLCBcImNvbHVtbnNwYWNpbmdcIiwgXCJyb3dzcGFjaW5nXCIsIFwiY29sdW1ud2lkdGhcIiwgXCJlcXVhbGNvbHVtbnNcIiwgXCJlcXVhbHJvd3NcIiwgXCJjb2x1bW5saW5lc1wiLCBcInJvd2xpbmVzXCIsIFwiZnJhbWVcIiwgXCJmcmFtZXNwYWNpbmdcIiwgXCJhbGlnblwiLCBcInVzZUhlaWdodFwiLCBcIndpZHRoXCIsIFwic2lkZVwiLCBcIm1pbmxhYmVsc3BhY2luZ1wiKTtcbiAgICAgICAgaWYgKHZhbHVlcy53aWR0aC5tYXRjaCgvJSQvKSkge1xuICAgICAgICAgICAgc3ZnLndpZHRoID0gdmFsdWVzLndpZHRoID0gVXRpbC5FbSgoVXRpbC5jd2lkdGggLyAxMDAwKSAqIChwYXJzZUZsb2F0KHZhbHVlcy53aWR0aCkgLyAxMDApKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciBMQUJFTCA9IC0xO1xuICAgICAgICB2YXIgSCA9IFtdLCBEID0gW10sIFcgPSBbXSwgQSA9IFtdLCBDID0gW10sIGksIGosIEogPSAtMSwgbSwgTSwgcywgcm93LCBjZWxsLCBtbywgSEQ7XG4gICAgICAgIHZhciBMSCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLmxpbmVIICogc2NhbGUgKiB2YWx1ZXMudXNlSGVpZ2h0LCBMRCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLmxpbmVEICogc2NhbGUgKiB2YWx1ZXMudXNlSGVpZ2h0O1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgcm93ID0gdGhpcy5kYXRhW2ldO1xuICAgICAgICAgICAgcyA9IChyb3cudHlwZSA9PT0gXCJtbGFiZWxlZHRyXCIgPyBMQUJFTCA6IDApO1xuICAgICAgICAgICAgQVtpXSA9IFtdO1xuICAgICAgICAgICAgSFtpXSA9IExIO1xuICAgICAgICAgICAgRFtpXSA9IExEO1xuICAgICAgICAgICAgZm9yIChqID0gcywgTSA9IHJvdy5kYXRhLmxlbmd0aCArIHM7IGogPCBNOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoV1tqXSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChqID4gSikge1xuICAgICAgICAgICAgICAgICAgICAgICAgSiA9IGo7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQ1tqXSA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjZWxsID0gcm93LmRhdGFbaiAtIHNdO1xuICAgICAgICAgICAgICAgIEFbaV1bal0gPSBjZWxsLnRvU1ZHKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNlbGwuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vID0gY2VsbC5Db3JlTU8oKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1pbiA9IG1vLkdldChcIm1pbnNpemVcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtby5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBIRCA9IG1vLkVkaXRhYmxlU1ZHZGF0YS5oICsgbW8uRWRpdGFibGVTVkdkYXRhLmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEhEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbiA9IFV0aWwubGVuZ3RoMmVtKG1pbiwgbXUsIEhEKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1pbiAqIG1vLkVkaXRhYmxlU1ZHZGF0YS5oIC8gSEQgPiBIW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIW2ldID0gbWluICogbW8uRWRpdGFibGVTVkdkYXRhLmggLyBIRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluICogbW8uRWRpdGFibGVTVkdkYXRhLmQgLyBIRCA+IERbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERbaV0gPSBtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuZCAvIEhEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobW8uU1ZHY2FuU3RyZXRjaChcIkhvcml6b250YWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW4gPSBVdGlsLmxlbmd0aDJlbShtaW4sIG11LCBtby5FZGl0YWJsZVNWR2RhdGEudyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1pbiA+IFdbal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV1tqXSA9IG1pbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0uaCA+IEhbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgSFtpXSA9IEFbaV1bal0uaDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0uZCA+IERbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgRFtpXSA9IEFbaV1bal0uZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0udyA+IFdbal0pIHtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IEFbaV1bal0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFNQTElUID0gTWF0aEpheC5IdWIuU3BsaXRMaXN0O1xuICAgICAgICB2YXIgQ1NQQUNFID0gU1BMSVQodmFsdWVzLmNvbHVtbnNwYWNpbmcpLCBSU1BBQ0UgPSBTUExJVCh2YWx1ZXMucm93c3BhY2luZyksIENBTElHTiA9IFNQTElUKHZhbHVlcy5jb2x1bW5hbGlnbiksIFJBTElHTiA9IFNQTElUKHZhbHVlcy5yb3dhbGlnbiksIENMSU5FUyA9IFNQTElUKHZhbHVlcy5jb2x1bW5saW5lcyksIFJMSU5FUyA9IFNQTElUKHZhbHVlcy5yb3dsaW5lcyksIENXSURUSCA9IFNQTElUKHZhbHVlcy5jb2x1bW53aWR0aCksIFJDQUxJR04gPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IENTUEFDRS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIENTUEFDRVtpXSA9IFV0aWwubGVuZ3RoMmVtKENTUEFDRVtpXSwgbXUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBSU1BBQ0UubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBSU1BBQ0VbaV0gPSBVdGlsLmxlbmd0aDJlbShSU1BBQ0VbaV0sIG11KTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoQ1NQQUNFLmxlbmd0aCA8IEopIHtcbiAgICAgICAgICAgIENTUEFDRS5wdXNoKENTUEFDRVtDU1BBQ0UubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDQUxJR04ubGVuZ3RoIDw9IEopIHtcbiAgICAgICAgICAgIENBTElHTi5wdXNoKENBTElHTltDQUxJR04ubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDTElORVMubGVuZ3RoIDwgSikge1xuICAgICAgICAgICAgQ0xJTkVTLnB1c2goQ0xJTkVTW0NMSU5FUy5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENXSURUSC5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgQ1dJRFRILnB1c2goQ1dJRFRIW0NXSURUSC5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJTUEFDRS5sZW5ndGggPCBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUlNQQUNFLnB1c2goUlNQQUNFW1JTUEFDRS5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJBTElHTi5sZW5ndGggPD0gQS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFJBTElHTi5wdXNoKFJBTElHTltSQUxJR04ubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChSTElORVMubGVuZ3RoIDwgQS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFJMSU5FUy5wdXNoKFJMSU5FU1tSTElORVMubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChDW0xBQkVMXSkge1xuICAgICAgICAgICAgQ0FMSUdOW0xBQkVMXSA9ICh2YWx1ZXMuc2lkZS5zdWJzdHIoMCwgMSkgPT09IFwibFwiID8gXCJsZWZ0XCIgOiBcInJpZ2h0XCIpO1xuICAgICAgICAgICAgQ1NQQUNFW0xBQkVMXSA9IC1XW0xBQkVMXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHJvdyA9IHRoaXMuZGF0YVtpXTtcbiAgICAgICAgICAgIFJDQUxJR05baV0gPSBbXTtcbiAgICAgICAgICAgIGlmIChyb3cucm93YWxpZ24pIHtcbiAgICAgICAgICAgICAgICBSQUxJR05baV0gPSByb3cucm93YWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocm93LmNvbHVtbmFsaWduKSB7XG4gICAgICAgICAgICAgICAgUkNBTElHTltpXSA9IFNQTElUKHJvdy5jb2x1bW5hbGlnbik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKFJDQUxJR05baV0ubGVuZ3RoIDw9IEopIHtcbiAgICAgICAgICAgICAgICAgICAgUkNBTElHTltpXS5wdXNoKFJDQUxJR05baV1bUkNBTElHTltpXS5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZXF1YWxyb3dzKSB7XG4gICAgICAgICAgICB2YXIgSG0gPSBNYXRoLm1heC5hcHBseShNYXRoLCBIKSwgRG0gPSBNYXRoLm1heC5hcHBseShNYXRoLCBEKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHMgPSAoKEhtICsgRG0pIC0gKEhbaV0gKyBEW2ldKSkgLyAyO1xuICAgICAgICAgICAgICAgIEhbaV0gKz0gcztcbiAgICAgICAgICAgICAgICBEW2ldICs9IHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgSEQgPSBIWzBdICsgRFtBLmxlbmd0aCAtIDFdO1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGggLSAxOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBIRCArPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmeCA9IDAsIGZ5ID0gMCwgZlcsIGZIID0gSEQ7XG4gICAgICAgIGlmICh2YWx1ZXMuZnJhbWUgIT09IFwibm9uZVwiIHx8XG4gICAgICAgICAgICAodmFsdWVzLmNvbHVtbmxpbmVzICsgdmFsdWVzLnJvd2xpbmVzKS5tYXRjaCgvc29saWR8ZGFzaGVkLykpIHtcbiAgICAgICAgICAgIHZhciBmcmFtZVNwYWNpbmcgPSBTUExJVCh2YWx1ZXMuZnJhbWVzcGFjaW5nKTtcbiAgICAgICAgICAgIGlmIChmcmFtZVNwYWNpbmcubGVuZ3RoICE9IDIpIHtcbiAgICAgICAgICAgICAgICBmcmFtZVNwYWNpbmcgPSBTUExJVCh0aGlzLmRlZmF1bHRzLmZyYW1lc3BhY2luZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmeCA9IFV0aWwubGVuZ3RoMmVtKGZyYW1lU3BhY2luZ1swXSwgbXUpO1xuICAgICAgICAgICAgZnkgPSBVdGlsLmxlbmd0aDJlbShmcmFtZVNwYWNpbmdbMV0sIG11KTtcbiAgICAgICAgICAgIGZIID0gSEQgKyAyICogZnk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFksIGZZLCBuID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiAodmFsdWVzLmFsaWduKSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFsdWVzLmFsaWduID0gU3RyaW5nKHZhbHVlcy5hbGlnbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5hbGlnbi5tYXRjaCgvKHRvcHxib3R0b218Y2VudGVyfGJhc2VsaW5lfGF4aXMpKCArKC0/XFxkKykpPy8pKSB7XG4gICAgICAgICAgICBuID0gUmVnRXhwLiQzIHx8IFwiXCI7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSBSZWdFeHAuJDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSB0aGlzLmRlZmF1bHRzLmFsaWduO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuICE9PSBcIlwiKSB7XG4gICAgICAgICAgICBuID0gcGFyc2VJbnQobik7XG4gICAgICAgICAgICBpZiAobiA8IDApIHtcbiAgICAgICAgICAgICAgICBuID0gQS5sZW5ndGggKyAxICsgbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIDwgMSkge1xuICAgICAgICAgICAgICAgIG4gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobiA+IEEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbiA9IEEubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgWSA9IDA7XG4gICAgICAgICAgICBmWSA9IC0oSEQgKyBmeSkgKyBIWzBdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IG4gLSAxOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRZID0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgICAgICBZICs9IGRZO1xuICAgICAgICAgICAgICAgIGZZICs9IGRZO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgWSA9ICh7XG4gICAgICAgICAgICAgICAgdG9wOiAtKEhbMF0gKyBmeSksXG4gICAgICAgICAgICAgICAgYm90dG9tOiBIRCArIGZ5IC0gSFswXSxcbiAgICAgICAgICAgICAgICBjZW50ZXI6IEhEIC8gMiAtIEhbMF0sXG4gICAgICAgICAgICAgICAgYmFzZWxpbmU6IEhEIC8gMiAtIEhbMF0sXG4gICAgICAgICAgICAgICAgYXhpczogSEQgLyAyICsgVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZSAtIEhbMF1cbiAgICAgICAgICAgIH0pW3ZhbHVlcy5hbGlnbl07XG4gICAgICAgICAgICBmWSA9ICh7XG4gICAgICAgICAgICAgICAgdG9wOiAtKEhEICsgMiAqIGZ5KSxcbiAgICAgICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICAgICAgY2VudGVyOiAtKEhEIC8gMiArIGZ5KSxcbiAgICAgICAgICAgICAgICBiYXNlbGluZTogLShIRCAvIDIgKyBmeSksXG4gICAgICAgICAgICAgICAgYXhpczogVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZSAtIEhEIC8gMiAtIGZ5XG4gICAgICAgICAgICB9KVt2YWx1ZXMuYWxpZ25dO1xuICAgICAgICB9XG4gICAgICAgIHZhciBXVywgV1AgPSAwLCBXdCA9IDAsIFdwID0gMCwgcCA9IDAsIGYgPSAwLCBQID0gW10sIEYgPSBbXSwgV2YgPSAxO1xuICAgICAgICBpZiAodmFsdWVzLmVxdWFsY29sdW1ucyAmJiB2YWx1ZXMud2lkdGggIT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICBXVyA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDU1BBQ0UubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdXIC09IENTUEFDRVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFdXIC89IEogKyAxO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDV0lEVEgubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdbaV0gPSBXVztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBNYXRoLm1pbihKICsgMSwgQ1dJRFRILmxlbmd0aCk7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoQ1dJRFRIW2ldID09PSBcImF1dG9cIikge1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDV0lEVEhbaV0gPT09IFwiZml0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgRltmXSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGYrKztcbiAgICAgICAgICAgICAgICAgICAgV3QgKz0gV1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoQ1dJRFRIW2ldLm1hdGNoKC8lJC8pKSB7XG4gICAgICAgICAgICAgICAgICAgIFBbcF0gPSBpO1xuICAgICAgICAgICAgICAgICAgICBwKys7XG4gICAgICAgICAgICAgICAgICAgIFdwICs9IFdbaV07XG4gICAgICAgICAgICAgICAgICAgIFdQICs9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtpXSwgbXUsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1tpXSA9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtpXSwgbXUpO1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKFdQID4gLjk4KSB7XG4gICAgICAgICAgICAgICAgICAgIFdmID0gV3AgLyAoV3QgKyBXcCk7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gV3QgKyBXcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gV3QgLyAoMSAtIFdQKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBXVyA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBNYXRoLm1pbihKICsgMSwgQ1NQQUNFLmxlbmd0aCk7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgLT0gQ1NQQUNFW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBQLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdbUFtpXV0gPSBVdGlsLmxlbmd0aDJlbShDV0lEVEhbUFtpXV0sIG11LCBXVyAqIFdmKTtcbiAgICAgICAgICAgICAgICBXdCArPSBXW1BbaV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKFdXIC0gV3QpID4gLjAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGYgJiYgV1cgPiBXdCkge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IChXVyAtIFd0KSAvIGY7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBGLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgV1tGW2ldXSArPSBXVztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXVyAvIFd0O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgV1tqXSAqPSBXVztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZXF1YWxjb2x1bW5zKSB7XG4gICAgICAgICAgICAgICAgdmFyIFdtID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgVyk7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IFdtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgeSA9IFksIGR5LCBhbGlnbjtcbiAgICAgICAgcyA9IChDW0xBQkVMXSA/IExBQkVMIDogMCk7XG4gICAgICAgIGZvciAoaiA9IHM7IGogPD0gSjsgaisrKSB7XG4gICAgICAgICAgICBDW2pdLncgPSBXW2pdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgcyA9ICh0aGlzLmRhdGFbaV0udHlwZSA9PT0gXCJtbGFiZWxlZHRyXCIgPyBMQUJFTCA6IDApO1xuICAgICAgICAgICAgICAgICAgICBjZWxsID0gdGhpcy5kYXRhW2ldLmRhdGFbaiAtIHNdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VsbC5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwuU1ZHc3RyZXRjaEgoV1tqXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY2VsbC5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vID0gY2VsbC5Db3JlTU8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzeW1tZXRyaWMgPSBtby5zeW1tZXRyaWM7XG4gICAgICAgICAgICAgICAgICAgICAgICBtby5zeW1tZXRyaWMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFbaV1bal0gPSBjZWxsLlNWR3N0cmV0Y2hWKEhbaV0sIERbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW8uc3ltbWV0cmljID0gc3ltbWV0cmljO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID0gY2VsbC5yb3dhbGlnbiB8fCB0aGlzLmRhdGFbaV0ucm93YWxpZ24gfHwgUkFMSUdOW2ldO1xuICAgICAgICAgICAgICAgICAgICBkeSA9ICh7IHRvcDogSFtpXSAtIEFbaV1bal0uaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogQVtpXVtqXS5kIC0gRFtpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNlbnRlcjogKChIW2ldIC0gRFtpXSkgLSAoQVtpXVtqXS5oIC0gQVtpXVtqXS5kKSkgLyAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZWxpbmU6IDAsIGF4aXM6IDAgfSlbYWxpZ25dIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID0gKGNlbGwuY29sdW1uYWxpZ24gfHwgUkNBTElHTltpXVtqXSB8fCBDQUxJR05bal0pO1xuICAgICAgICAgICAgICAgICAgICBDW2pdLkFsaWduKEFbaV1bal0sIGFsaWduLCAwLCB5ICsgZHkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaSA8IEEubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICB5IC09IE1hdGgubWF4KDAsIERbaV0gKyBIW2kgKyAxXSArIFJTUEFDRVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeSA9IFk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGx3ID0gMS41ICogVXRpbC5lbTtcbiAgICAgICAgdmFyIHggPSBmeCAtIGx3IC8gMjtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQoQ1tqXSwgeCwgMCk7XG4gICAgICAgICAgICB4ICs9IFdbal0gKyBDU1BBQ0Vbal07XG4gICAgICAgICAgICBpZiAoQ0xJTkVTW2pdICE9PSBcIm5vbmVcIiAmJiBqIDwgSiAmJiBqICE9PSBMQUJFTCkge1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVkxJTkUoZkgsIGx3LCBDTElORVNbal0pLCB4IC0gQ1NQQUNFW2pdIC8gMiwgZlkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy53ICs9IGZ4O1xuICAgICAgICBzdmcuZCA9IC1mWTtcbiAgICAgICAgc3ZnLmggPSBmSCArIGZZO1xuICAgICAgICBmVyA9IHN2Zy53O1xuICAgICAgICBpZiAodmFsdWVzLmZyYW1lICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9ITElORShmVywgbHcsIHZhbHVlcy5mcmFtZSksIDAsIGZZICsgZkggLSBsdyk7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkpO1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIHZhbHVlcy5mcmFtZSksIDAsIGZZKTtcbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVkxJTkUoZkgsIGx3LCB2YWx1ZXMuZnJhbWUpLCBmVyAtIGx3LCBmWSk7XG4gICAgICAgIH1cbiAgICAgICAgeSA9IFkgLSBsdyAvIDI7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aCAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGR5ID0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgIGlmIChSTElORVNbaV0gIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9ITElORShmVywgbHcsIFJMSU5FU1tpXSksIDAsIHkgLSBEW2ldIC0gKGR5IC0gRFtpXSAtIEhbaSArIDFdKSAvIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeSAtPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGlmIChDW0xBQkVMXSkge1xuICAgICAgICAgICAgc3ZnLnR3ID0gTWF0aC5tYXgoc3ZnLncsIHN2Zy5yKSAtIE1hdGgubWluKDAsIHN2Zy5sKTtcbiAgICAgICAgICAgIHZhciBpbmRlbnQgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50YWxpZ25maXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRhbGlnbiA9IGluZGVudC5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudGFsaWduID0gdGhpcy5kaXNwbGF5QWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5kZW50LmluZGVudHNoaWZ0Zmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UU0hJRlQuSU5ERU5UU0hJRlQpIHtcbiAgICAgICAgICAgICAgICBpbmRlbnQuaW5kZW50c2hpZnQgPSBpbmRlbnQuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50c2hpZnQgPT09IFwiYXV0b1wiIHx8IGluZGVudC5pbmRlbnRzaGlmdCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRzaGlmdCA9IFwiMFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNoaWZ0ID0gVXRpbC5sZW5ndGgyZW0oaW5kZW50LmluZGVudHNoaWZ0LCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgdmFyIGxhYmVsc2hpZnQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWlubGFiZWxzcGFjaW5nLCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZEluZGVudCA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuZGlzcGxheUluZGVudCwgbXUsIFV0aWwuY3dpZHRoKTtcbiAgICAgICAgICAgICAgICBzaGlmdCArPSAoaW5kZW50LmluZGVudEFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLlJJR0hUID8gLWRJbmRlbnQgOiBkSW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBlcW4gPSBzdmc7XG4gICAgICAgICAgICBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmN3aWR0aDtcbiAgICAgICAgICAgIHN2Zy5oYXNJbmRlbnQgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFsaWduKENbTEFCRUxdLCBDQUxJR05bTEFCRUxdLCBsYWJlbHNoaWZ0LCAwKTtcbiAgICAgICAgICAgIHN2Zy5BbGlnbihlcW4sIGluZGVudC5pbmRlbnRhbGlnbiwgMCwgMCwgc2hpZnQpO1xuICAgICAgICAgICAgc3ZnLnR3ICs9IENbTEFCRUxdLncgKyBzaGlmdCArXG4gICAgICAgICAgICAgICAgKGluZGVudC5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5DRU5URVIgPyA4IDogNCkgKiBsYWJlbHNoaWZ0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ZyYW1lICYmICFzdmcud2lkdGgpIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLlggPSAxNjc7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZS5jYWxsKHRoaXMsIHN2Zyk7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIHZhciBtdHIgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbMF07XG4gICAgICAgICAgICByZXR1cm4gbXRkLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVt0aGlzLmRhdGEubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbbXRyLmRhdGEubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gbXRkLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJUT0RPOiB1bmltcGxlbWVudGVkIGRpcmVjdGlvbiBmb3IgbW92ZUN1cnNvckZyb21QYXJlbnQgaW4gbXRhYmxlX21peGluLnRzXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlQ3Vyc29yRnJvbUNoaWxkIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHksIGNsaWVudFgsIGNsaWVudFkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtdHIgPSB0aGlzLmRhdGFbaV07XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG10ci5kYXRhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG10ZCA9IG10ci5kYXRhW2pdO1xuICAgICAgICAgICAgICAgIHZhciBub2RlID0gbXRkLmRhdGFbMF07XG4gICAgICAgICAgICAgICAgaWYgKFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgY2xpZW50WCwgY2xpZW50WSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJEaWRuJ3QgbWFuYWdlIHRvIG1vdmUgY3Vyc29yXCIpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlQ3Vyc29yIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJkcmF3Q3Vyc29yIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2RyYXdDdXJzb3JIaWdobGlnaHQgY2FsbGVkIScpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLmFkZFJvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIHZhciBudW1Db2xzID0gdGhpcy5kYXRhWzBdLmRhdGEubGVuZ3RoO1xuICAgICAgICB2YXIgbmV3Um93ID0gbmV3IE1NTC5tdHIoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Db2xzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtdGQgPSBuZXcgTU1MLm10ZCgpO1xuICAgICAgICAgICAgbXRkLlNldERhdGEoMCwgbmV3IE1NTC5ob2xlKCkpO1xuICAgICAgICAgICAgbmV3Um93LlNldERhdGEoaSwgbXRkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNldERhdGEodGhpcy5kYXRhLmxlbmd0aCwgbmV3Um93KTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5hZGRDb2x1bW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICB0aGlzLmRhdGFbaV0uU2V0RGF0YSh0aGlzLmRhdGFbaV0uZGF0YS5sZW5ndGgsIG10ZCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGFibGVNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1UYWJsZVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlUm93TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVSb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVSb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtdHIgbW92ZUN1cnNvckZyb21DaGlsZCBjYWxsZWQhXCIpO1xuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZVJvd01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlQ2VsbE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlQ2VsbE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1UYWJsZUNlbGxNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVDZWxsTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHZhciByb3cgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgdmFyIG10YWJsZSA9IHRoaXMucGFyZW50LnBhcmVudDtcbiAgICAgICAgdmFyIGNvbEluZGV4ID0gcm93LmRhdGEuaW5kZXhPZih0aGlzKTtcbiAgICAgICAgdmFyIHJvd0luZGV4ID0gbXRhYmxlLmRhdGEuaW5kZXhPZihyb3cpO1xuICAgICAgICB2YXIgdyA9IHJvdy5kYXRhLmxlbmd0aDtcbiAgICAgICAgdmFyIGggPSBtdGFibGUuZGF0YS5sZW5ndGg7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBpZiAoY29sSW5kZXggPT0gdyAtIDEpIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSByb3cuZGF0YVtjb2xJbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGlmIChjb2xJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbXRhYmxlLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCBtdGFibGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gcm93LmRhdGFbY29sSW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICBuZWlnaGJvck10ZC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICBpZiAocm93SW5kZXggPT0gaCAtIDEpIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JSb3cgPSBtdGFibGUuZGF0YVtyb3dJbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvck10ZCA9IG5laWdoYm9yUm93LmRhdGFbY29sSW5kZXhdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICBpZiAocm93SW5kZXggPT0gMCkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvclJvdyA9IG10YWJsZS5kYXRhW3Jvd0luZGV4IC0gMV07XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gbmVpZ2hib3JSb3cuZGF0YVtjb2xJbmRleF07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNVGFibGVDZWxsTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlQ2VsbE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRleHRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UZXh0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRleHRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UZXh0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm10ZXh0Rm9udEluaGVyaXQgfHwgdGhpcy5QYXJlbnQoKS50eXBlID09PSBcIm1lcnJvclwiKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICAgICAgdmFyIGRlZiA9IHsgZGlyZWN0aW9uOiB0aGlzLkdldChcImRpclwiKSB9O1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuYm9sZCkge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtd2VpZ2h0XCJdID0gXCJib2xkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5pdGFsaWMpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJmb250LXN0eWxlXCJdID0gXCJpdGFsaWNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQgPSB0aGlzLkdldChcIm1hdGh2YXJpYW50XCIpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQgPT09IFwibW9ub3NwYWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLW1vbm9zcGFjZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodmFyaWFudC5tYXRjaCgvc2Fucy1zZXJpZi8pKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiY2xhc3NcIl0gPSBcIk1KWC1zYW5zLXNlcmlmXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1RFWFQoc2NhbGUgKiAxMDAgLyBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuc2NhbGUsIHRoaXMuZGF0YS5qb2luKFwiXCIpLCBkZWYpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLnRvU1ZHLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGV4dE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVVuZGVyT3Zlck1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVVuZGVyT3Zlck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1VbmRlck92ZXJNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuZW5kaW5nUG9zID0gMDtcbiAgICAgICAgdGhpcy5yaWdodE1vdmVTdGF5ID0gdHJ1ZTtcbiAgICB9XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJhY2NlbnRcIiwgXCJhY2NlbnR1bmRlclwiLCBcImFsaWduXCIpO1xuICAgICAgICBpZiAoIXZhbHVlcy5kaXNwbGF5c3R5bGUgJiYgdGhpcy5kYXRhW3RoaXMuYmFzZV0gIT0gbnVsbCAmJlxuICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuYmFzZV0uQ29yZU1PKCkuR2V0KFwibW92YWJsZWxpbWl0c1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cC5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBib3hlcyA9IFtdLCBzdHJldGNoID0gW10sIGJveCwgaSwgbSwgVyA9IC1VdGlsLkJJR0RJTUVOLCBXVyA9IFc7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZChpLCBIVywgRCk7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hbaV0gPSAoRCAhPSBudWxsIHx8IEhXID09IG51bGwpICYmIHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm94ZXNbaV0uWDtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyZXRjaFtpXSAmJiBXVyA+IFcpIHtcbiAgICAgICAgICAgICAgICAgICAgVyA9IFdXO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoRCA9PSBudWxsICYmIEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIFcgPSBIVztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXID09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICBXID0gV1c7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gV1cgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJldGNoW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKFcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChib3hlc1tpXS53ID4gV1cpIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBib3hlc1tpXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogdGhpcy5tc2NhbGU7XG4gICAgICAgIHZhciBiYXNlID0gYm94ZXNbdGhpcy5iYXNlXSB8fCB7XG4gICAgICAgICAgICB3OiAwLFxuICAgICAgICAgICAgaDogMCxcbiAgICAgICAgICAgIGQ6IDAsXG4gICAgICAgICAgICBIOiAwLFxuICAgICAgICAgICAgRDogMCxcbiAgICAgICAgICAgIGw6IDAsXG4gICAgICAgICAgICByOiAwLFxuICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgIHNjYWxlOiBzY2FsZVxuICAgICAgICB9O1xuICAgICAgICB2YXIgeCwgeSwgejEsIHoyLCB6MywgZHcsIGssIGRlbHRhID0gMDtcbiAgICAgICAgaWYgKGJhc2UuaWMpIHtcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYm94ID0gYm94ZXNbaV07XG4gICAgICAgICAgICAgICAgejMgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzUgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICB2YXIgYWNjZW50ID0gKGkgIT0gdGhpcy5iYXNlICYmIHZhbHVlc1t0aGlzLkFDQ0VOVFNbaV1dKTtcbiAgICAgICAgICAgICAgICBpZiAoYWNjZW50ICYmIGJveC53IDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94LnggPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gKG5ldyBCQk9YX0coKSkuV2l0aCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkFkZChib3gpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS5DbGVhbigpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS53ID0gLWJveC5sO1xuICAgICAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZHcgPSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjogKFdXIC0gYm94LncpIC8gMixcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IFdXIC0gYm94LndcbiAgICAgICAgICAgICAgICB9W3ZhbHVlcy5hbGlnbl07XG4gICAgICAgICAgICAgICAgeCA9IGR3O1xuICAgICAgICAgICAgICAgIHkgPSAwO1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMub3Zlcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWNjZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gdCAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejMgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2Uuc2tldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gYmFzZS5za2V3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gYmFzZS5za2V3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4ICsgYm94LncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyArPSAoV1cgLSBib3gudyAtIHgpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzMgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBNYXRoLm1heCgwLCBib3guZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heChrLCAxNTAwIC8gVXRpbC5lbSk7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gZGVsdGEgLyAyO1xuICAgICAgICAgICAgICAgICAgICB5ID0gYmFzZS55ICsgYmFzZS5oICsgYm94LmQgKyBrO1xuICAgICAgICAgICAgICAgICAgICBib3guaCArPSB6MztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJveC5oID4gYm94LkgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveC5IID0gYm94Lmg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaSA9PSB0aGlzLnVuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSAzICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejMgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgejEgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzIgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoyID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmc0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gTWF0aC5tYXgoejEsIHoyIC0gYm94LmgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heChrLCAxNTAwIC8gVXRpbC5lbSk7XG4gICAgICAgICAgICAgICAgICAgIHggLT0gZGVsdGEgLyAyO1xuICAgICAgICAgICAgICAgICAgICB5ID0gYmFzZS55IC0gKGJhc2UuZCArIGJveC5oICsgayk7XG4gICAgICAgICAgICAgICAgICAgIGJveC5kICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmQgPiBib3guRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkQgPSBib3guZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKGJveCwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3QubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAxIDogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgdmFyIHNtYWxsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgPyB0aGlzLnN1YiA6IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIGJhc2VCQiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmFzZUJCIHx8ICFjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5kYXRhW3NtYWxsXSA/IHNtYWxsIDogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAmJiB0aGlzLmRhdGFbc21hbGxdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtzbWFsbF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtzbWFsbF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbc21hbGxdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHNtYWxsLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1YjtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1YkJCLnggKyAoc3ViQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1cEJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3VwQkIueCArIChzdXBCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGJhc2UuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1YixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJblZlcnRpY2FsbHkgPSB2ZXJ0aWNhbCAmJiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApID09PSAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViKTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbkhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgIHZhciBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0F3YXkgPSB2ZXJ0aWNhbCA/ICFtb3ZpbmdJblZlcnRpY2FsbHkgOiAhdGhpcy5yaWdodE1vdmVTdGF5ICYmIG1vdmVSaWdodEhvcml6b250YWxseTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbiA9IG1vdmluZ0luVmVydGljYWxseSB8fCBtb3ZpbmdJbkhvcml6b250YWxseSB8fCBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgJiYgdGhpcy5yaWdodE1vdmVTdGF5O1xuICAgICAgICAgICAgaWYgKG1vdmluZ0F3YXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtb3ZpbmdJbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1VbmRlck92ZXJNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIFNlbWFudGljc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU2VtYW50aWNzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2VtYW50aWNzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNlbWFudGljc01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgVGVYQXRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoVGVYQXRvbU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFRlWEF0b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgYm94ID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpLCB5ID0gMDtcbiAgICAgICAgICAgIGlmICh0aGlzLnRleENsYXNzID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlRFWENMQVNTLlZDRU5URVIpIHtcbiAgICAgICAgICAgICAgICB5ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoYm94LmggKyBib3guZCkgLyAyICsgYm94LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKGJveCwgMCwgeSk7XG4gICAgICAgICAgICBzdmcuaWMgPSBib3guaWM7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGJveC5za2V3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RlWEF0b20gZHJhd0N1cnNvciBOT1QgSU1QTEVNRU5URUQnKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5jdXJzb3JhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gVGVYQXRvbU1peGluO1xufShNQmFzZU1peGluKSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
