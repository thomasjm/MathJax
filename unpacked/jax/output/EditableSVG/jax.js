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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiamF4LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgRGlyZWN0aW9uO1xuKGZ1bmN0aW9uIChEaXJlY3Rpb24pIHtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiVVBcIl0gPSAwXSA9IFwiVVBcIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiUklHSFRcIl0gPSAxXSA9IFwiUklHSFRcIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiRE9XTlwiXSA9IDJdID0gXCJET1dOXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIkxFRlRcIl0gPSAzXSA9IFwiTEVGVFwiO1xufSkoRGlyZWN0aW9uIHx8IChEaXJlY3Rpb24gPSB7fSkpO1xudmFyIEN1cnNvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ3Vyc29yKGNvbG9yLCBpc090aGVyQ3Vyc29yKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yIHx8ICcjNzc3Nzc3JztcbiAgICAgICAgdGhpcy5pc090aGVyQ3Vyc29yID0gaXNPdGhlckN1cnNvcjtcbiAgICAgICAgdGhpcy5pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcbiAgICAgICAgdGhpcy53aWR0aCA9IDUwO1xuICAgIH1cbiAgICBDdXJzb3IucHJvdG90eXBlLnJlZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5ub2RlIHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbSB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50IHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICAgIHBhcmVudC5mb2N1cygpO1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZVRvQ2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgdmFyIHN2ZyA9IHRhcmdldC5ub2RlTmFtZSA9PT0gJ3N2ZycgPyB0YXJnZXQgOiB0YXJnZXQub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGNwID0gVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMoc3ZnLCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbiAgICAgICAgdmFyIGpheCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmdldEpheEZyb21NYXRoKHN2Zy5wYXJlbnROb2RlKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBqYXgucm9vdDtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkSXRlbXMgPSBjdXJyZW50LmRhdGEuZmlsdGVyKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludChub2RlLCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG1hdGNoZWRJdGVtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSHVoPyBtYXRjaGVkIG1vcmUgdGhhbiBvbmUgY2hpbGQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1hdGNoZWRJdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gbWF0Y2hlZEl0ZW1zWzBdO1xuICAgICAgICAgICAgaWYgKG1hdGNoZWQuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gbWF0Y2hlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnQubW92ZUN1cnNvckZyb21DbGljayh0aGlzLCBjcC54LCBjcC55LCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZVRvID0gZnVuY3Rpb24gKG5vZGUsIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCAmJiAhbm9kZS5iYWNrc2xhc2hSb3cpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmlzT3RoZXJDdXJzb3IpXG4gICAgICAgICAgICB0aGlzLnNpZ25hbEN1cnNvck1vdmVtZW50KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnVwZGF0ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uIChzaGlmdEtleSkge1xuICAgICAgICBpZiAoc2hpZnRLZXkgJiYgdGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUwpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBpZiAoc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFySGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24sIHNoaWZ0S2V5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uKHNoaWZ0S2V5KTtcbiAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ub2RlLmRyYXdDdXJzb3IodGhpcyk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICB2YXIgZGlyZWN0aW9uO1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrc3BhY2UoZXZlbnQsIHJlY2FsbCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoZGlyZWN0aW9uLCBldmVudC5zaGlmdEtleSk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm1vdmVUb0NsaWNrKGV2ZW50KTtcbiAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VIb2xlSWZOZWVkZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByb3dpbmRleCA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50LlNldERhdGEocm93aW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgaG9sZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5leGl0QmFja3NsYXNoTW9kZSA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdmFyIHBwb3MgPSB0aGlzLm5vZGUucGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuZGF0YS5zcGxpY2UocHBvcywgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMubm9kZS5wYXJlbnQuZGF0YTtcbiAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwbGFjZS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICBhcnIucHVzaChudWxsKTtcbiAgICAgICAgICAgIGRhdGEuc3BsaWNlLmFwcGx5KGRhdGEsIFtwcG9zLCAxXS5jb25jYXQoYXJyKSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LlNldERhdGEocHBvcyArIGksIHJlcGxhY2VbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUby5hcHBseSh0aGlzLCByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUucGFyZW50LCBwcG9zICsgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuYmFja3NwYWNlID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZS50eXBlID09PSAnbXJvdycgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUgPT09IHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUuZGF0YS5zcGxpY2UocG9zMSwgcG9zMiAtIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHRoaXMubm9kZSwgcG9zMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkbyB0aGlzIGJhY2tzcGFjZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICBpZiAoIXByZXYuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgdGhpcy5ub2RlLmRhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24gLSAxLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSAxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvbiAtIDFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdob2xlJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JhY2tzcGFjZSBvbiBob2xlIScpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNbyA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtbyA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbW8uQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtbztcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZUVudGl0eU1pID0gZnVuY3Rpb24gKHVuaWNvZGUpIHtcbiAgICAgICAgdmFyIG1pID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkoKTtcbiAgICAgICAgdmFyIGVudGl0eSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgpO1xuICAgICAgICBlbnRpdHkuQXBwZW5kKHVuaWNvZGUpO1xuICAgICAgICBtaS5BcHBlbmQoZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIG1pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jcmVhdGVBbmRNb3ZlSW50b0hvbGUgPSBmdW5jdGlvbiAobXN1YnN1cCwgaW5kZXgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NSRUFUSU5HIEhPTEUnKTtcbiAgICAgICAgdmFyIGhvbGUgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgIG1zdWJzdXAuU2V0RGF0YShpbmRleCwgaG9sZSk7XG4gICAgICAgIHRoaXMubW92ZVRvKGhvbGUsIDApO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oYW5kbGVTdXBlck9yU3Vic2NyaXB0ID0gZnVuY3Rpb24gKHJlY2FsbCwgYykge1xuICAgICAgICBpZiAodGhpcy5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICB2YXIgaW5kZXggPSAoYyA9PT0gXCJfXCIpID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3ViIDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3VwO1xuICAgICAgICBpZiAocHJldi50eXBlID09PSBcIm1zdWJzdXBcIiB8fCBwcmV2LnR5cGUgPT09IFwibXVuZGVyb3ZlclwiKSB7XG4gICAgICAgICAgICBpZiAocHJldi5kYXRhW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIHZhciB0aGluZyA9IHByZXYuZGF0YVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaW5nLm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMsIERpcmVjdGlvbi5MRUZUKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHByZXYsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAxLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShwcmV2LCBpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbXN1YnN1cCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpO1xuICAgICAgICAgICAgbXN1YnN1cC5TZXREYXRhKG1zdWJzdXAuYmFzZSwgcHJldik7XG4gICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uIC0gMSwgbXN1YnN1cCk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShtc3Vic3VwLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAocmVjYWxsLCBjKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgdmFyIGxhdGV4ID0gXCJcIjtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdGhpcy5ub2RlLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbWkgPSB0aGlzLm5vZGUuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAobWkudHlwZSAhPT0gJ21pJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIG5vbi1pZGVudGlmaWVyIGluIGJhY2tzbGFzaCBleHByZXNzaW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjaGFycyA9IG1pLmRhdGFbMF07XG4gICAgICAgICAgICAgICAgbGF0ZXggKz0gY2hhcnMuZGF0YVswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UobGF0ZXgpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLmNsYXNzTGlzdC5hZGQoJ2ludmFsaWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCByZXN1bHQ6IFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgdmFyIG1yb3cgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKHJlc3VsdCk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBjb2RlID0gZXZlbnQuY2hhckNvZGUgfHwgZXZlbnQua2V5Q29kZSB8fCBldmVudC53aGljaDtcbiAgICAgICAgdmFyIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgICB2YXIgdG9JbnNlcnQ7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LnJlbW92ZSgnaW52YWxpZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC5jdHJsS2V5ICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcIm10YWJsZVwiICYmIGNvZGUgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hZGRDb2x1bW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7IHRoaXMucmVmb2N1cygpOyB9XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFwibXRhYmxlXCIgJiYgY29kZSA9PSAxMCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmFkZFJvdygpO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHsgdGhpcy5yZWZvY3VzKCk7IH1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ2hvbGUnKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5ub2RlLnBhcmVudDtcbiAgICAgICAgICAgIHZhciBob2xlSW5kZXggPSBwYXJlbnQuZGF0YS5pbmRleE9mKHRoaXMubm9kZSk7XG4gICAgICAgICAgICB2YXIgcm93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KCk7XG4gICAgICAgICAgICBwYXJlbnQuU2V0RGF0YShob2xlSW5kZXgsIHJvdyk7XG4gICAgICAgICAgICByb3cubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSAhPT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyYXlSb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gwMDVDJykpKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JheVJvdy5iYWNrc2xhc2hSb3cgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiwgMCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24sIGdyYXlSb3cpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ2xhc3MgPSBncmF5Um93LmNsYXNzID8gZ3JheVJvdy5jbGFzcyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNsYXNzID0gb2xkQ2xhc3MgKyBcImJhY2tzbGFzaC1tb2RlXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKGdyYXlSb3csIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVE9ETzogaW5zZXJ0IGEgXFxcXCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiXlwiIHx8IGMgPT09IFwiX1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VwZXJPclN1YnNjcmlwdChyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIgXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTcGFjZShyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLmxldHRlci50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5taShuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5udW1iZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW4obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gnICsgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09ICcrJyB8fCBjID09PSAnLycgfHwgYyA9PT0gJz0nIHx8IGMgPT09ICcuJyB8fCBjID09PSAnKCcgfHwgYyA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b0luc2VydClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCB0b0luc2VydCk7XG4gICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgfV0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ib3hlcykge1xuICAgICAgICAgICAgdGhpcy5ib3hlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm94ZXMgPSBbXTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlnaGxpZ2h0Qm94ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBjdXIgPSB0aGlzLm5vZGU7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gY3VyLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlcyA9IHRoaXMuYm94ZXMuY29uY2F0KFV0aWwuaGlnaGxpZ2h0Qm94KHN2ZywgYmIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0F0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIGhlaWdodCwgc2tpcFNjcm9sbCkge1xuICAgICAgICB0aGlzLnJlbmRlcmVkUG9zaXRpb24gPSB7IHg6IHgsIHk6IHksIGhlaWdodDogaGVpZ2h0IH07XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsIHRoaXMuY29sb3IpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdtYXRoLWN1cnNvcicpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb2xkY2xhc3MgPSBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgb2xkY2xhc3Muc3BsaXQoJ2JsaW5rJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHRoaXMud2lkdGgudG9TdHJpbmcoKSk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuc3RhcnRCbGluayk7XG4gICAgICAgIHRoaXMuc3RhcnRCbGluayA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsIGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSArICcgYmxpbmsnKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCA1MDApO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodEJveGVzKHN2Z2VsZW0pO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUuZHJhd0N1cnNvckhpZ2hsaWdodCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNraXBTY3JvbGwpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbEludG9WaWV3KHN2Z2VsZW0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zaWduYWxDdXJzb3JNb3ZlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgICAgIGlmICghbm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgICAgdmFyIHBhdGggPSBbXTtcbiAgICAgICAgd2hpbGUgKG5vZGUucGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgaSA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIHBhdGgudW5zaGlmdChpKTtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBub2RlLmlucHV0SUQgKyBcIi1GcmFtZVwiO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBjdXJzb3JfZHJhd25cIiwgaWQsIHBhdGgsIHBvc2l0aW9uXSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmNsZWFySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMuaGlkZUhpZ2hsaWdodCgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oaWRlSGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKGNlbGVtKSB7XG4gICAgICAgICAgICBjZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5kcmF3SGlnaGxpZ2h0QXQgPSBmdW5jdGlvbiAoc3ZnZWxlbSwgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICdyZ2JhKDE3MywgMjE2LCAyNTAsIDAuNSknKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnbWF0aC1jdXJzb3ItaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdyk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24gKHN2Z2VsZW0pIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlbmRlcmVkUG9zaXRpb24pXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciB4ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLng7XG4gICAgICAgIHZhciB5ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLnk7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLnJlbmRlcmVkUG9zaXRpb24uaGVpZ2h0O1xuICAgICAgICB2YXIgY2xpZW50UG9pbnQgPSBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyhzdmdlbGVtLCB4LCB5ICsgaGVpZ2h0IC8gMik7XG4gICAgICAgIHZhciBjbGllbnRXaWR0aCA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG4gICAgICAgIHZhciBjbGllbnRIZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcbiAgICAgICAgdmFyIHN4ID0gMCwgc3kgPSAwO1xuICAgICAgICBpZiAoY2xpZW50UG9pbnQueCA8IDAgfHwgY2xpZW50UG9pbnQueCA+IGNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzeCA9IGNsaWVudFBvaW50LnggLSBjbGllbnRXaWR0aCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnkgPCAwIHx8IGNsaWVudFBvaW50LnkgPiBjbGllbnRIZWlnaHQpIHtcbiAgICAgICAgICAgIHN5ID0gY2xpZW50UG9pbnQueSAtIGNsaWVudEhlaWdodCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN4IHx8IHN5KSB7XG4gICAgICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoc3gsIHN5KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmIChjdXJzb3IpXG4gICAgICAgICAgICBjdXJzb3IucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmJsdXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jbGVhckJveGVzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZm9jdXNGaXJzdEhvbGUgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICBpZiAoIXJvb3QpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChyb290LnR5cGUgPT09IFwiaG9sZVwiKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUgPSByb290O1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mb2N1c0ZpcnN0SG9sZShyb290LmRhdGFbaV0pKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIEN1cnNvci5DdXJzb3JNb2RlID0ge1xuICAgICAgICBCQUNLU0xBU0g6IFwiYmFja3NsYXNoXCIsXG4gICAgICAgIE5PUk1BTDogXCJub3JtYWxcIixcbiAgICAgICAgU0VMRUNUSU9OOiBcInNlbGVjdGlvblwiXG4gICAgfTtcbiAgICByZXR1cm4gQ3Vyc29yO1xufSgpKTtcbnZhciBFZGl0YWJsZVNWR0NvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkdDb25maWcoKSB7XG4gICAgfVxuICAgIEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlcyA9IHtcbiAgICAgICAgXCIuTWF0aEpheF9TVkdcIjoge1xuICAgICAgICAgICAgXCJkaXNwbGF5XCI6IFwiaW5saW5lXCIsXG4gICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwibGluZS1oZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiMTAwJVwiLFxuICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJ0ZXh0LWluZGVudFwiOiAwLFxuICAgICAgICAgICAgXCJ0ZXh0LWFsaWduXCI6IFwibGVmdFwiLFxuICAgICAgICAgICAgXCJ0ZXh0LXRyYW5zZm9ybVwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibGV0dGVyLXNwYWNpbmdcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid29yZC1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtd3JhcFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3aGl0ZS1zcGFjZVwiOiBcIm5vd3JhcFwiLFxuICAgICAgICAgICAgXCJmbG9hdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IFwibHRyXCIsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRGlzcGxheVwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJyZWxhdGl2ZVwiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LXdpZHRoXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgd2lkdGg6IFwiMTAwJVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHICpcIjoge1xuICAgICAgICAgICAgdHJhbnNpdGlvbjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi13ZWJraXQtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1vei10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItbXMtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW8tdHJhbnNpdGlvblwiOiBcIm5vbmVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5tangtc3ZnLWhyZWZcIjoge1xuICAgICAgICAgICAgZmlsbDogXCJibHVlXCIsXG4gICAgICAgICAgICBzdHJva2U6IFwiYmx1ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjoge1xuICAgICAgICAgICAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI6IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZSFpbXBvcnRhbnRcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19FeEJveFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICB3aWR0aDogXCIxcHhcIixcbiAgICAgICAgICAgIGhlaWdodDogXCI2MGV4XCIsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIuYmFja3NsYXNoLW1vZGUgdXNlXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiZ3JheVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImdyYXlcIlxuICAgICAgICB9LFxuICAgICAgICAnLmJhY2tzbGFzaC1tb2RlLmludmFsaWQgdXNlJzoge1xuICAgICAgICAgICAgZmlsbDogJyNmZjAwMDAnLFxuICAgICAgICAgICAgc3Ryb2tlOiAnI2ZmMDAwMCcsXG4gICAgICAgIH0sXG4gICAgICAgICcubWF0aC1jdXJzb3IuYmxpbmsnOiB7XG4gICAgICAgICAgICAnYW5pbWF0aW9uJzogJ2JsaW5rIDEuMDZzIHN0ZXBzKDIsIHN0YXJ0KSBpbmZpbml0ZScsXG4gICAgICAgICAgICAnLXdlYmtpdC1hbmltYXRpb24nOiAnYmxpbmsgMS4wNnMgc3RlcHMoMiwgc3RhcnQpIGluZmluaXRlJyxcbiAgICAgICAgfSxcbiAgICAgICAgJ0BrZXlmcmFtZXMgYmxpbmsnOiAndG8ge3Zpc2liaWxpdHk6IGhpZGRlbn0nLFxuICAgICAgICAnQC13ZWJraXQta2V5ZnJhbWVzIGJsaW5rJzogJ3RvIHt2aXNpYmlsaXR5OiBoaWRkZW59JyxcbiAgICAgICAgXCIjTWF0aEpheF9TVkdfVG9vbHRpcFwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgIGhlaWdodDogXCJhdXRvXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmVcIlxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkdDb25maWc7XG59KCkpO1xudmFyIEVkaXRhYmxlU1ZHID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFZGl0YWJsZVNWRygpIHtcbiAgICAgICAgdGhpcy5UT1VDSCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCA9IHRydWU7XG4gICAgICAgIHRoaXMuZm9udE5hbWVzID0gW1wiVGVYXCIsIFwiU1RJWFwiLCBcIlNUSVgtV2ViXCIsIFwiQXNhbmEtTWF0aFwiLFxuICAgICAgICAgICAgXCJHeXJlLVRlcm1lc1wiLCBcIkd5cmUtUGFnZWxsYVwiLCBcIkxhdGluLU1vZGVyblwiLCBcIk5lby1FdWxlclwiXTtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZSA9IE1hdGhKYXguSFRNTC5UZXh0Tm9kZTtcbiAgICAgICAgdGhpcy5hZGRUZXh0ID0gTWF0aEpheC5IVE1MLmFkZFRleHQ7XG4gICAgICAgIHRoaXMudWNNYXRjaCA9IE1hdGhKYXguSFRNTC51Y01hdGNoO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIm1tbCBKYXggUmVhZHlcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgICAgICBNTUwuaG9sZS5BdWdtZW50KEhvbGUuZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWJhc2UuQXVnbWVudChNQmFzZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5lbnRpdHkuQXVnbWVudChFbnRpdHlNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tby5BdWdtZW50KE1vTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1lcnJvci5BdWdtZW50KE1FcnJvck1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zLkF1Z21lbnQoTXNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3BhY2UuQXVnbWVudChNU3BhY2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcGhhbnRvbS5BdWdtZW50KE1QaGFudG9tTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcm93LkF1Z21lbnQoTVJvd01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zdHlsZS5BdWdtZW50KE1TdHlsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3FydC5BdWdtZW50KE1TcXJ0TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXJvb3QuQXVnbWVudChNUm9vdE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVuY2xvc2UuQXVnbWVudChNRW5jbG9zZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hY3Rpb24uQXVnbWVudChNQWN0aW9uTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXVuZGVyb3Zlci5BdWdtZW50KE1VbmRlck92ZXJNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3Vic3VwLkF1Z21lbnQoTVN1YlN1cE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWF0aC5BdWdtZW50KE1hdGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10YWJsZS5BdWdtZW50KE1UYWJsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ci5BdWdtZW50KE1UYWJsZVJvd01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ZC5BdWdtZW50KE1UYWJsZUNlbGxNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTFtcImFubm90YXRpb24teG1sXCJdLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgIHRvU1ZHOiBNTUwubWJhc2UuU1ZHYXV0b2xvYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJvbkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeWluZyBlZGl0YWJsZXN2ZzogJywgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChNYXRoSmF4LkNhbGxiYWNrKFtcImxvYWRDb21wbGV0ZVwiLCBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRywgXCJqYXguanNcIl0pLCAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLkJyb3dzZXIuU2VsZWN0KHtcbiAgICAgICAgICAgIE9wZXJhOiBmdW5jdGlvbiAoYnJvd3Nlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkcuQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIG9wZXJhWm9vbVJlZnJlc2g6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwiRW5kIENvb2tpZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56b29tICE9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguQWpheC5SZXF1aXJlKFwiW01hdGhKYXhdL2V4dGVuc2lvbnMvTWF0aFpvb20uanNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3VtZW50O1xuICAgICAgICAgICAgaWYgKCFkb2MubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2MubmFtZXNwYWNlcy5hZGQoXCJzdmdcIiwgVXRpbC5TVkdOUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0FVVE9MT0FEIERJUiAnLCB0aGlzLmF1dG9sb2FkRGlyKTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncywgY29uZmlnID0gdGhpcy5jb25maWcsIGZvbnQgPSBzZXR0aW5ncy5mb250O1xuICAgICAgICBpZiAoc2V0dGluZ3Muc2NhbGUpIHtcbiAgICAgICAgICAgIGNvbmZpZy5zY2FsZSA9IHNldHRpbmdzLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgIT09IFwiQXV0b1wiKSB7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oTG9jYWx8V2VifEltYWdlKSQvaSwgXCJcIik7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS8sIFwiJDEtJDJcIik7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGZvbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGNvbmZpZy5mb250IHx8IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9udE5hbWVzLmluZGV4T2YodGhpcy5mb250SW5Vc2UpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBcIlRlWFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9udERpciArPSBcIi9cIiArIHRoaXMuZm9udEluVXNlO1xuICAgICAgICBpZiAoIXRoaXMucmVxdWlyZSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1aXJlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2godGhpcy5mb250RGlyICsgXCIvZm9udGRhdGEuanNcIik7XG4gICAgICAgIHRoaXMucmVxdWlyZS5wdXNoKE1hdGhKYXguT3V0cHV0SmF4LmV4dGVuc2lvbkRpciArIFwiL01hdGhFdmVudHMuanNcIik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuU3RhcnR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIEVWRU5UID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudDtcbiAgICAgICAgdGhpcy5UT1VDSCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuVG91Y2g7XG4gICAgICAgIHZhciBIT1ZFUiA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuSG92ZXI7XG4gICAgICAgIHRoaXMuQ29udGV4dE1lbnUgPSBFVkVOVC5Db250ZXh0TWVudTtcbiAgICAgICAgdGhpcy5Nb3VzZW92ZXIgPSBIT1ZFUi5Nb3VzZW92ZXI7XG4gICAgICAgIHRoaXMuTW91c2VvdXQgPSBIT1ZFUi5Nb3VzZW91dDtcbiAgICAgICAgdGhpcy5Nb3VzZW1vdmUgPSBIT1ZFUi5Nb3VzZW1vdmU7XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogXCIxcHhcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwLFxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJsZWZ0XCIsXG4gICAgICAgICAgICAgICAgdGV4dEluZGVudDogMCxcbiAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0OiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIGxldHRlclNwYWNpbmc6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgd29yZFNwYWNpbmc6IFwibm9ybWFsXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuaGlkZGVuRGl2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKHRoaXMuaGlkZGVuRGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIGlkOiBcIk1hdGhKYXhfU1ZHX0hpZGRlblwiXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiNWluXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFV0aWwucHhQZXJJbmNoID0gZGl2Lm9mZnNldFdpZHRoIC8gNTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgdGhpcy50ZXh0U1ZHID0gVXRpbC5FbGVtZW50KFwic3ZnXCIsIG51bGwpO1xuICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLmFkZEVsZW1lbnQoVXRpbC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LnBhcmVudE5vZGUsIFwic3ZnXCIpLCBcImRlZnNcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfZ2x5cGhzXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuRXhTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZS1hZGp1c3RcIjogXCJub25lXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgW1xuICAgICAgICAgICAgW1wic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19FeEJveFwiXG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHRoaXMubGluZWJyZWFrU3BhbiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCBudWxsLCBbXG4gICAgICAgICAgICBbXCJoclwiLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjogMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHZhciBzdHlsZXMgPSB0aGlzLmNvbmZpZy5zdHlsZXM7XG4gICAgICAgIGZvciAodmFyIHMgaW4gRWRpdGFibGVTVkdDb25maWcuc3R5bGVzKSB7XG4gICAgICAgICAgICBzdHlsZXNbc10gPSBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXNbc107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguQWpheC5TdHlsZXMoc3R5bGVzLCBbXCJJbml0aWFsaXplU1ZHXCIsIHRoaXNdKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Jbml0aWFsaXplU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICB0aGlzLmRlZmF1bHRFeCA9IHRoaXMuRXhTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZGVmYXVsdFdpZHRoID0gdGhpcy5saW5lYnJlYWtTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5saW5lYnJlYWtTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLkV4U3Bhbik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucHJlVHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdO1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgdmFyIG0gPSBzY3JpcHRzLmxlbmd0aDtcbiAgICAgICAgdmFyIHNjcmlwdDtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIHZhciBzcGFuO1xuICAgICAgICB2YXIgZGl2O1xuICAgICAgICB2YXIgdGVzdDtcbiAgICAgICAgdmFyIGpheDtcbiAgICAgICAgdmFyIGV4O1xuICAgICAgICB2YXIgZW07XG4gICAgICAgIHZhciBtYXh3aWR0aDtcbiAgICAgICAgdmFyIHJlbHdpZHRoID0gZmFsc2U7XG4gICAgICAgIHZhciBjd2lkdGg7XG4gICAgICAgIHZhciBsaW5lYnJlYWsgPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYztcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb25maWcubGluZWJyZWFrcy53aWR0aDtcbiAgICAgICAgaWYgKGxpbmVicmVhaykge1xuICAgICAgICAgICAgcmVsd2lkdGggPSAod2lkdGgubWF0Y2goL15cXHMqKFxcZCsoXFwuXFxkKik/JVxccyopP2NvbnRhaW5lclxccyokLykgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoL1xccypjb250YWluZXJcXHMqLywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdpZHRoID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgd2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1heHdpZHRoID0gMTAwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcHJldiA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBpZiAocHJldiAmJiBTdHJpbmcocHJldi5jbGFzc05hbWUpLm1hdGNoKC9eTWF0aEpheChfU1ZHKT8oX0Rpc3BsYXkpPyggTWF0aEpheChfU1ZHKT9fUHJvY2Vzc2luZyk/JC8pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHID0ge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IChqYXgucm9vdC5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc3BhbiA9IGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXNpemVcIjogdGhpcy5jb25maWcuc2NhbGUgKyBcIiVcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJpbmxpbmUtYmxvY2tcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHXCIsXG4gICAgICAgICAgICAgICAgaWQ6IGpheC5pbnB1dElEICsgXCItRnJhbWVcIixcbiAgICAgICAgICAgICAgICBpc01hdGhKYXg6IHRydWUsXG4gICAgICAgICAgICAgICAgamF4SUQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgb25jb250ZXh0bWVudTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5NZW51LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vkb3duOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlZG93bixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3ZlcjogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW92ZXIsXG4gICAgICAgICAgICAgICAgb25tb3VzZW91dDogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW91dCxcbiAgICAgICAgICAgICAgICBvbm1vdXNlbW92ZTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW1vdmUsXG4gICAgICAgICAgICAgICAgb25jbGljazogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5DbGljayxcbiAgICAgICAgICAgICAgICBvbmRibGNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkRibENsaWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChNYXRoSmF4Lkh1Yi5Ccm93c2VyLm5vQ29udGV4dE1lbnUpIHtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hzdGFydCA9IHRoaXMuVE9VQ0guc3RhcnQ7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoZW5kID0gdGhpcy5UT1VDSC5lbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19EaXNwbGF5XCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXYuY2xhc3NOYW1lICs9IFwiIE1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpLCBzY3JpcHQpO1xuICAgICAgICAgICAgZGl2LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGluZWJyZWFrU3Bhbi5jbG9uZU5vZGUodHJ1ZSksIGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGRpdiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZXggPSB0ZXN0LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgICAgICBjd2lkdGggPSBkaXYucHJldmlvdXNTaWJsaW5nLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleCA9PT0gMCB8fCBleCA9PT0gXCJOYU5cIikge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZGVuRGl2LmFwcGVuZENoaWxkKGRpdik7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBleCA9IHRoaXMuZGVmYXVsdEV4O1xuICAgICAgICAgICAgICAgIGN3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBVdGlsLmV4ID0gZXg7XG4gICAgICAgICAgICBVdGlsLmVtID0gZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgICAgIFV0aWwuY3dpZHRoID0gY3dpZHRoIC8gZW0gKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5saW5lV2lkdGggPSAobGluZWJyZWFrID8gVXRpbC5sZW5ndGgyZW0od2lkdGgsIDEsIG1heHdpZHRoIC8gZW0gKiAxMDAwKSA6IFV0aWwuQklHRElNRU4pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdHNbaV0ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgc3BhbiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0c1tpXS5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICghamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICAgICAgdGVzdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2VxbiA9IHN0YXRlLlNWR2xhc3QgPSAwO1xuICAgICAgICBzdGF0ZS5TVkdpID0gLTE7XG4gICAgICAgIHN0YXRlLlNWR2NodW5rID0gdGhpcy5jb25maWcuRXFuQ2h1bms7XG4gICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuVHJhbnNsYXRlID0gZnVuY3Rpb24gKHNjcmlwdCwgc3RhdGUpIHtcbiAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHN0YXRlLlNWR2RlbGF5KSB7XG4gICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQ2FsbGJhY2suRGVsYXkodGhpcy5jb25maWcuRXFuQ2h1bmtEZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICB2YXIgbWF0aCA9IGpheC5yb290O1xuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGpheC5pbnB1dElEICsgXCItRnJhbWVcIik7XG4gICAgICAgIHZhciBkaXYgPSAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkgPyAoc3BhbiB8fCB7IHBhcmVudE5vZGU6IHVuZGVmaW5lZCB9KS5wYXJlbnROb2RlIDogc3Bhbik7XG4gICAgICAgIHZhciBsb2NhbENhY2hlID0gKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSAmJiAhdGhpcy5jb25maWcudXNlR2xvYmFsQ2FjaGUpO1xuICAgICAgICBpZiAoIWRpdilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5lbSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmVtID0gamF4LkVkaXRhYmxlU1ZHLmVtO1xuICAgICAgICB0aGlzLmV4ID0gamF4LkVkaXRhYmxlU1ZHLmV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguRWRpdGFibGVTVkcuY3dpZHRoO1xuICAgICAgICB0aGlzLm1hdGhEaXYgPSBkaXY7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgaWYgKGxvY2FsQ2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRHbHlwaHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRTVkcobWF0aCwgc3Bhbik7XG4gICAgICAgIG1hdGguc2V0VGVYY2xhc3MoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGgudG9TVkcoc3BhbiwgZGl2KTtcbiAgICAgICAgICAgIG1hdGguaW5zdGFsbEN1cnNvckxpc3RlbmVycygpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzcGFuLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZChzcGFuLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5uLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLkFkZElucHV0SGFuZGxlcnMobWF0aCwgc3BhbiwgZGl2KTtcbiAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgfVxuICAgICAgICBkaXYuY2xhc3NOYW1lID0gZGl2LmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICBpZiAodGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCkge1xuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjtcbiAgICAgICAgICAgIGlmIChzY3JpcHQuTWF0aEpheC5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgICAgIHZhciBpZCA9IHNjcmlwdC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgcmVyZW5kZXJcIiwgaWQgKyBcIi1GcmFtZVwiXSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIsIG51bGwpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4ID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gJ3RleGF0b20nKSB7XG4gICAgICAgICAgICBpZiAocm9vdC5kYXRhLmxlbmd0aCAhPT0gMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignVW5leHBlY3RlZCBsZW5ndGggaW4gdGV4YXRvbScpO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChyb290LmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJvb3QuaXNDdXJzb3JhYmxlKCkgfHwgcm9vdC50eXBlID09PSAnbWF0aCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHJvb3QuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cilcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBjdXIudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZVswXSAhPT0gJ20nIHx8IHR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJXcmFwcGluZyBhIHRoaW5nIGluIGFuIG1yb3dcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb290O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkFkZElucHV0SGFuZGxlcnMgPSBmdW5jdGlvbiAobWF0aCwgc3BhbiwgZGl2KSB7XG4gICAgICAgIG1hdGguY3Vyc29yID0gbmV3IEN1cnNvcigpO1xuICAgICAgICBtYXRoLnJlcmVuZGVyID0gcmVyZW5kZXI7XG4gICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgIHZhciBhZGRUZXhUb0RPTSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXggPSBtYXRoLnRvVGV4KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRleDogXCIsIHRleCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1hdGg6IFwiLCBtYXRoKTtcbiAgICAgICAgICAgIG1hdGguRWRpdGFibGVTVkdlbGVtLnNldEF0dHJpYnV0ZShcInRleFwiLCB0ZXgpO1xuICAgICAgICB9O1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhZGRUZXhUb0RPTSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgZnVuY3Rpb24gcmVyZW5kZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgobWF0aCkudG9TVkcoc3BhbiwgZGl2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgYWRkVGV4VG9ET00oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0aEpheC5DYWxsYmFjay5BZnRlcihbcmVyZW5kZXIsIGNhbGxiYWNrXSwgZXJyLnJlc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2soY2FsbGJhY2spKCk7XG4gICAgICAgICAgICB2YXIgaWQgPSBzcGFuLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgcmVyZW5kZXJcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKGUpIHtcbiAgICAgICAgICAgIGlmIChtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXSlcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXS5jYWxsKG1hdGguY3Vyc29yLCBlLCByZXJlbmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlclNwYW4gPSBmdW5jdGlvbiAoamF4LCBtYXRoKSB7XG4gICAgICAgIG1hdGguc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIHJldHVybiBtYXRoLmZpcnN0Q2hpbGQ7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJCQm94ID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCkge1xuICAgICAgICB2YXIgYmJveCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuLnBhcmVudE5vZGUpO1xuICAgICAgICBiYm94LmggKz0gMjtcbiAgICAgICAgYmJveC5kIC09IDI7XG4gICAgICAgIHJldHVybiBiYm94O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlpvb20gPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoLCBNdywgTWgpIHtcbiAgICAgICAgc3Bhbi5jbGFzc05hbWUgPSBcIk1hdGhKYXhfU1ZHXCI7XG4gICAgICAgIHZhciBlbWV4ID0gc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICB2YXIgZXggPSBlbWV4LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZW0gPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5lbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICB0aGlzLmV4ID0gZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIGVtZXgucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbWV4KTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLm1hdGhESVYgPSBzcGFuO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB2YXIgc3ZnID0gc3Bhbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN2Z1wiKVswXS5zdHlsZTtcbiAgICAgICAgc3ZnLm1hcmdpblRvcCA9IHN2Zy5tYXJnaW5SaWdodCA9IHN2Zy5tYXJnaW5MZWZ0ID0gMDtcbiAgICAgICAgaWYgKHN2Zy5tYXJnaW5Cb3R0b20uY2hhckF0KDApID09PSBcIi1cIilcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWFyZ2luQm90dG9tID0gc3ZnLm1hcmdpbkJvdHRvbS5zdWJzdHIoMSk7XG4gICAgICAgIGlmICh0aGlzLm9wZXJhWm9vbVJlZnJlc2gpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNwYW4uZmlyc3RDaGlsZC5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB0cmFuc3BhcmVudFwiO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwYW4ub2Zmc2V0V2lkdGggPCBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWluV2lkdGggPSBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICBtYXRoLnN0eWxlLm1pbldpZHRoID0gbWF0aC5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB2YXIgelcgPSBzcGFuLm9mZnNldFdpZHRoLCB6SCA9IHNwYW4ub2Zmc2V0SGVpZ2h0LCBtSCA9IG1hdGgub2Zmc2V0SGVpZ2h0LCBtVyA9IG1hdGgub2Zmc2V0V2lkdGg7XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJcIjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFk6IC1NYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGpheC5FZGl0YWJsZVNWRztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmV4dGVuZERlbGltaXRlclYgPSBmdW5jdGlvbiAoc3ZnLCBILCBkZWxpbSwgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRvcCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnRvcCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGJvdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmJvdCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGggPSB0b3AuaCArIHRvcC5kICsgYm90LmggKyBib3QuZDtcbiAgICAgICAgdmFyIHkgPSAtdG9wLmg7XG4gICAgICAgIHN2Zy5BZGQodG9wLCAwLCB5KTtcbiAgICAgICAgeSAtPSB0b3AuZDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIGggKz0gbWlkLmggKyBtaWQuZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIEggPCBoICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBIID0gaCAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSCA+IGgpIHtcbiAgICAgICAgICAgIHZhciBleHQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLmV4dCwgZm9udCk7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIGVIID0gKEggLSBoKSAvIGssIHMgPSAoZUggKyAxMDApIC8gKGV4dC5oICsgZXh0LmQpO1xuICAgICAgICAgICAgd2hpbGUgKGstLSA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IFV0aWwuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArICh4IC0gZnV6eiAvIDIgLSBzICogcmVwLmwgKyByZXAueCkgKyBcIixcIiArIHJlcC55ICsgXCIpIHNjYWxlKFwiICsgcyArIFwiLDEpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHJlcC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHggKz0gclc7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBtaWQudztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVykgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgeCArPSBtaWQudyAtICh3IC0gVykgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQocmlnaHQsIHggLSByaWdodC5sLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZ2V0SmF4RnJvbU1hdGggPSBmdW5jdGlvbiAobWF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICAgICAgbWF0aCA9IG1hdGgucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBtYXRoID0gbWF0aC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH0gd2hpbGUgKG1hdGggJiYgbWF0aC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICE9PSBcInNjcmlwdFwiKTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5nZXRKYXhGb3IobWF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBnZXRKYXhGcm9tTWF0aFwiLCBlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHO1xufSgpKTtcbnZhciBsb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgY29uc29sZS5sb2coJ0xPQURJTkcnKTtcbiAgICBFZGl0YWJsZVNWRy5hcHBseShNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcucHJvdG90eXBlKSB7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHW2lkXSA9IEVkaXRhYmxlU1ZHLnByb3RvdHlwZVtpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpZCBpbiBFZGl0YWJsZVNWRykge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgfVxufTtcblNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCA9IFNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCB8fCBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHJldHVybiBlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKS5tdWx0aXBseSh0aGlzLmdldFNjcmVlbkNUTSgpKTtcbn07XG5zZXRUaW1lb3V0KGxvYWQsIDEwMDApO1xudmFyIFBhcnNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUGFyc2VyKCkge1xuICAgIH1cbiAgICBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFBhcnNlci5jaGVja1NwZWNpYWxDUyhjcyk7XG4gICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB2YXIgbWF0aGpheFBhcnNlciA9IE1hdGhKYXguSW5wdXRKYXguVGVYLlBhcnNlKGNzKTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5jc1VuZGVmaW5lZCA9IG1hdGhqYXhQYXJzZXIuY3NGaW5kTWFjcm8gPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuR2V0Q1MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjczsgfTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5tbWxUb2tlbiA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgICAgICBtYXRoamF4UGFyc2VyLlB1c2ggPSAoZnVuY3Rpb24gKHgpIHsgcmVzdWx0ID0geDsgfSk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuQ29udHJvbFNlcXVlbmNlKCk7XG4gICAgICAgIHJldHVybiBbcmVzdWx0XTtcbiAgICB9O1xuICAgIFBhcnNlci5jaGVja1NwZWNpYWxDUyA9IGZ1bmN0aW9uIChjcykge1xuICAgICAgICB2YXIgbWFjcm9zID0gTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zO1xuICAgICAgICB2YXIgTU1MID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbDtcbiAgICAgICAgaWYgKGNzID09PSAnZnJhYycpIHtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICB2YXIgbWZyYWMgPSBuZXcgTU1MLm1mcmFjKGhvbGUsIG5ldyBNTUwuaG9sZSgpKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbWZyYWNdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNzID09PSAnc3FydCcpIHtcbiAgICAgICAgICAgIHZhciBtc3FydCA9IG5ldyBNTUwubXNxcnQoKTtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICBtc3FydC5TZXREYXRhKDAsIGhvbGUpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFttc3FydF07XG4gICAgICAgICAgICByZXN1bHQubW92ZUN1cnNvckFmdGVyID0gW2hvbGUsIDBdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3MgPT09ICdtYXRyaXgnIHx8IGNzID09PSAnYm1hdHJpeCcpIHtcbiAgICAgICAgICAgIHZhciBtdGFibGUgPSBuZXcgTU1MLm10YWJsZSgpO1xuICAgICAgICAgICAgdmFyIG10ciA9IG5ldyBNTUwubXRyKCk7XG4gICAgICAgICAgICB2YXIgbXRkID0gbmV3IE1NTC5tdGQoKTtcbiAgICAgICAgICAgIHZhciBob2xlID0gbmV3IE1NTC5ob2xlKCk7XG4gICAgICAgICAgICBtdGFibGUuU2V0RGF0YSgwLCBtdHIpO1xuICAgICAgICAgICAgbXRyLlNldERhdGEoMCwgbXRkKTtcbiAgICAgICAgICAgIG10ZC5TZXREYXRhKDAsIGhvbGUpO1xuICAgICAgICAgICAgdmFyIGxicmFja2V0ID0gbmV3IE1NTC5tbyhuZXcgTU1MLmNoYXJzKFwiW1wiKSk7XG4gICAgICAgICAgICB2YXIgcmJyYWNrZXQgPSBuZXcgTU1MLm1vKG5ldyBNTUwuY2hhcnMoXCJdXCIpKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbGJyYWNrZXQsIG10YWJsZSwgcmJyYWNrZXRdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hY3Jvc1tjc10pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hY3Jvc1tjc10pO1xuICAgICAgICAgICAgdmFyIG5hbWVkRGlyZWN0bHkgPSBtYWNyb3NbY3NdID09PSAnTmFtZWRPcCcgfHwgbWFjcm9zW2NzXSA9PT0gJ05hbWVkRm4nO1xuICAgICAgICAgICAgdmFyIG5hbWVkQXJyYXkgPSBtYWNyb3NbY3NdWzBdICYmIChtYWNyb3NbY3NdWzBdID09PSAnTmFtZWRGbicgfHwgbWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkT3AnKTtcbiAgICAgICAgICAgIGlmIChuYW1lZERpcmVjdGx5IHx8IG5hbWVkQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWVkQXJyYXkgJiYgbWFjcm9zW2NzXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1hY3Jvc1tjc11bMV0ucmVwbGFjZSgvJnRoaW5zcDsvLCBcIlxcdTIwMDZcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGNzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gW25ldyBNTUwubW8obmV3IE1NTC5jaGFycyh2YWx1ZSkpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFBhcnNlcjtcbn0oKSk7XG52YXIgQkJPWCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQkJPWChkZWYsIHR5cGUpIHtcbiAgICAgICAgaWYgKGRlZiA9PT0gdm9pZCAwKSB7IGRlZiA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGUgPT09IHZvaWQgMCkgeyB0eXBlID0gXCJnXCI7IH1cbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMuSCA9IHRoaXMuRCA9IDA7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IDA7XG4gICAgICAgIHRoaXMubCA9IFV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSAxO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQodHlwZSwgZGVmKTtcbiAgICB9XG4gICAgQkJPWC5wcm90b3R5cGUuV2l0aCA9IGZ1bmN0aW9uIChkZWYsIEhVQikge1xuICAgICAgICByZXR1cm4gSFVCLkluc2VydCh0aGlzLCBkZWYpO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWRkID0gZnVuY3Rpb24gKHN2ZywgZHgsIGR5LCBmb3JjZXcsIGluZnJvbnQpIHtcbiAgICAgICAgaWYgKGR4KSB7XG4gICAgICAgICAgICBzdmcueCArPSBkeDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZHkpIHtcbiAgICAgICAgICAgIHN2Zy55ICs9IGR5O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmIHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIHN2Zy5uID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgbm9kZU5hbWUgPSBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJ1c2VcIiB8fCBub2RlTmFtZSA9PT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNjYWxlID0gc3ZnLmNoaWxkU2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gc3ZnLmNoaWxkWCwgeSA9IHN2Zy5jaGlsZFk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy55ICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5oIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5kICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5IIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5EICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy53IC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yIC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5sICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3ZnLngpIDwgMSAmJiBNYXRoLmFicyhzdmcueSkgPCAxKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlID0gc3ZnLnJlbW92ZWFibGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUgPT09IFwibGluZVwiIHx8IG5vZGVOYW1lID09PSBcInBvbHlnb25cIiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9PT0gXCJwYXRoXCIgfHwgbm9kZU5hbWUgPT09IFwiYVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3Ioc3ZnLngpICsgXCIsXCIgKyBNYXRoLmZsb29yKHN2Zy55KSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubiArPSBzdmcubjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCAmJiB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudC5maXJzdENoaWxkLCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKHN2Zy5lbGVtZW50LCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdGhpcy5oYXNJbmRlbnQgPSBzdmcuaGFzSW5kZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy50dyA9IHN2Zy50dztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgLSBzdmcueSA+IHRoaXMuZCkge1xuICAgICAgICAgICAgdGhpcy5kID0gc3ZnLmQgLSBzdmcueTtcbiAgICAgICAgICAgIGlmICh0aGlzLmQgPiB0aGlzLkQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkQgPSB0aGlzLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLmggPiB0aGlzLmgpIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHN2Zy55ICsgc3ZnLmg7XG4gICAgICAgICAgICBpZiAodGhpcy5oID4gdGhpcy5IKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5IID0gdGhpcy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuRCAtIHN2Zy55ID4gdGhpcy5EKVxuICAgICAgICAgICAgdGhpcy5EID0gc3ZnLkQgLSBzdmcueTtcbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLkggPiB0aGlzLkgpXG4gICAgICAgICAgICB0aGlzLkggPSBzdmcueSArIHN2Zy5IO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcubCA8IHRoaXMubClcbiAgICAgICAgICAgIHRoaXMubCA9IHN2Zy54ICsgc3ZnLmw7XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5yID4gdGhpcy5yKVxuICAgICAgICAgICAgdGhpcy5yID0gc3ZnLnggKyBzdmcucjtcbiAgICAgICAgaWYgKGZvcmNldyB8fCBzdmcueCArIHN2Zy53ICsgKHN2Zy5YIHx8IDApID4gdGhpcy53KVxuICAgICAgICAgICAgdGhpcy53ID0gc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKTtcbiAgICAgICAgdGhpcy5jaGlsZFNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLmNoaWxkWCA9IHN2Zy54O1xuICAgICAgICB0aGlzLmNoaWxkWSA9IHN2Zy55O1xuICAgICAgICB0aGlzLm4rKztcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFsaWduID0gZnVuY3Rpb24gKHN2ZywgYWxpZ24sIGR4LCBkeSwgc2hpZnQpIHtcbiAgICAgICAgaWYgKHNoaWZ0ID09PSB2b2lkIDApIHsgc2hpZnQgPSBudWxsOyB9XG4gICAgICAgIGR4ID0gKHtcbiAgICAgICAgICAgIGxlZnQ6IGR4LFxuICAgICAgICAgICAgY2VudGVyOiAodGhpcy53IC0gc3ZnLncpIC8gMixcbiAgICAgICAgICAgIHJpZ2h0OiB0aGlzLncgLSBzdmcudyAtIGR4XG4gICAgICAgIH0pW2FsaWduXSB8fCAwO1xuICAgICAgICB2YXIgdyA9IHRoaXMudztcbiAgICAgICAgdGhpcy5BZGQoc3ZnLCBkeCArIChzaGlmdCB8fCAwKSwgZHkpO1xuICAgICAgICB0aGlzLncgPSB3O1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQ2xlYW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmggPT09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICB0aGlzLmggPSB0aGlzLmQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgQkJPWC5kZWZzID0gbnVsbDtcbiAgICBCQk9YLm4gPSAwO1xuICAgIHJldHVybiBCQk9YO1xufSgpKTtcbnZhciBCQk9YX0cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRztcbn0oQkJPWCkpO1xudmFyIEJCT1hfVEVYVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVEVYVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIGRlZikge1xuICAgICAgICBpZiAoIWRlZilcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICBkZWYuc3Ryb2tlID0gXCJub25lXCI7XG4gICAgICAgIGlmIChkZWZbXCJmb250LXN0eWxlXCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtc3R5bGVcIl07XG4gICAgICAgIGlmIChkZWZbXCJmb250LXdlaWdodFwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXdlaWdodFwiXTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInRleHRcIik7XG4gICAgICAgIE1hdGhKYXguSFRNTC5hZGRUZXh0KHRoaXMuZWxlbWVudCwgdGV4dCk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLnRleHRTVkcuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy50ZXh0U1ZHLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHNjYWxlICo9IDEwMDAgLyBVdGlsLmVtO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKSBtYXRyaXgoMSAwIDAgLTEgMCAwKVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IGJib3gud2lkdGggKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gLWJib3gueSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAoYmJveC5oZWlnaHQgKyBiYm94LnkpICogc2NhbGU7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1RFWFQ7XG59KEJCT1gpKTtcbnZhciBVdGlsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVdGlsKCkge1xuICAgIH1cbiAgICBVdGlsLkVtID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZW1cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZW1cIjtcbiAgICB9O1xuICAgIFV0aWwuRXggPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBtID0gTWF0aC5yb3VuZChtIC8gdGhpcy5UZVgueF9oZWlnaHQgKiB0aGlzLmV4KSAvIHRoaXMuZXg7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGV4XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImV4XCI7XG4gICAgfTtcbiAgICBVdGlsLlBlcmNlbnQgPSBmdW5jdGlvbiAobSkge1xuICAgICAgICByZXR1cm4gKDEwMCAqIG0pLnRvRml4ZWQoMSkucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCIlXCI7XG4gICAgfTtcbiAgICBVdGlsLkZpeGVkID0gZnVuY3Rpb24gKG0sIG4pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZChuIHx8IDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKTtcbiAgICB9O1xuICAgIFV0aWwuaGFzaENoZWNrID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImdcIikge1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldC5maXJzdENoaWxkLm5vZGVOYW1lICE9PSBcInN2Z1wiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gICAgVXRpbC5FbGVtZW50ID0gZnVuY3Rpb24gKHR5cGUsIGRlZikge1xuICAgICAgICB2YXIgb2JqO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdmc6XCIgKyB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5pc01hdGhKYXggPSB0cnVlO1xuICAgICAgICBpZiAoZGVmKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBkZWYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKGlkLCBkZWZbaWRdLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgVXRpbC5hZGRFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmVudCwgdHlwZSwgZGVmKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQoVXRpbC5FbGVtZW50KHR5cGUsIGRlZikpO1xuICAgIH07XG4gICAgVXRpbC5sZW5ndGgyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSwgc2l6ZSkge1xuICAgICAgICBpZiAobXUgPT09IHZvaWQgMCkgeyBtdSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHNpemUgPT09IHZvaWQgMCkgeyBzaXplID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIChsZW5ndGgpICE9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiXCIpXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLk5PUk1BTClcbiAgICAgICAgICAgIHJldHVybiAxMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuQklHKVxuICAgICAgICAgICAgcmV0dXJuIDIwMDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5TTUFMTClcbiAgICAgICAgICAgIHJldHVybiA3MTA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiaW5maW5pdHlcIilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkJJR0RJTUVOO1xuICAgICAgICBpZiAobGVuZ3RoLm1hdGNoKC9tYXRoc3BhY2UkLykpXG4gICAgICAgICAgICByZXR1cm4gMTAwMCAqIHRoaXMuTUFUSFNQQUNFW2xlbmd0aF07XG4gICAgICAgIHZhciB6b29tU2NhbGUgPSBwYXJzZUludChNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLnpzY2FsZSkgLyAxMDA7XG4gICAgICAgIHZhciBlbUZhY3RvciA9ICh6b29tU2NhbGUgfHwgMSkgLyBVdGlsLmVtO1xuICAgICAgICB2YXIgbWF0Y2ggPSBsZW5ndGgubWF0Y2goL15cXHMqKFstK10/KD86XFwuXFxkK3xcXGQrKD86XFwuXFxkKik/KSk/KHB0fGVtfGV4fG11fHB4fHBjfGlufG1tfGNtfCUpPy8pO1xuICAgICAgICB2YXIgbSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0gfHwgXCIxXCIpICogMTAwMCwgdW5pdCA9IG1hdGNoWzJdO1xuICAgICAgICBpZiAoc2l6ZSA9PSBudWxsKVxuICAgICAgICAgICAgc2l6ZSA9IDEwMDA7XG4gICAgICAgIGlmIChtdSA9PSBudWxsKVxuICAgICAgICAgICAgbXUgPSAxO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJlbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIGlmICh1bml0ID09PSBcImV4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMuVGVYLnhfaGVpZ2h0IC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiJVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDAgKiBzaXplIC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHhcIilcbiAgICAgICAgICAgIHJldHVybiBtICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB0XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwY1wiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiAxLjI7XG4gICAgICAgIGlmICh1bml0ID09PSBcImluXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcImNtXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyLjU0O1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJtbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMjUuNDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibXVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTggKiBtdTtcbiAgICAgICAgcmV0dXJuIG0gKiBzaXplIC8gMTAwMDtcbiAgICB9O1xuICAgIFV0aWwuZ2V0UGFkZGluZyA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgICAgICAgdmFyIHBhZGRpbmcgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBwYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAocGFkZGluZy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFkID0gc3R5bGVzW1wicGFkZGluZ1wiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgIGlmIChwYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1tpZF0gPSBVdGlsLmxlbmd0aDJlbShwYWQpO1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGhhcyA/IHBhZGRpbmcgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLmdldEJvcmRlcnMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBib3JkZXIgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfSwgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIGJvcmRlcikge1xuICAgICAgICAgICAgaWYgKGJvcmRlci5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSBcImJvcmRlclwiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZF0gPSBVdGlsLmxlbmd0aDJlbShzdHlsZXNbSUQgKyBcIldpZHRoXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJTdHlsZVwiXSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBzdHlsZXNbSUQgKyBcIkNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9PT0gXCJpbml0aWFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm9yZGVyW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBib3JkZXIgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLnRoaWNrbmVzczJlbSA9IGZ1bmN0aW9uIChsZW5ndGgsIG11KSB7XG4gICAgICAgIHZhciB0aGljayA9IHRoaXMuVGVYLnJ1bGVfdGhpY2tuZXNzO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuTUVESVVNKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISUNLKSB7XG4gICAgICAgICAgICByZXR1cm4gMS42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aDJlbShsZW5ndGgsIG11LCB0aGljayk7XG4gICAgfTtcbiAgICBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkpO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0VHJhbnNmb3JtVG9FbGVtZW50KHN2ZykpO1xuICAgIH07XG4gICAgVXRpbC5nZXRTVkdFbGVtID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgaWYgKCFlbGVtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgc3ZnID0gZWxlbS5ub2RlTmFtZSA9PT0gJ3N2ZycgPyBlbGVtIDogZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBvd25lciBTVkcgZWxlbWVudCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkuaW52ZXJzZSgpKTtcbiAgICB9O1xuICAgIFV0aWwuYm94Q29udGFpbnMgPSBmdW5jdGlvbiAoYmIsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIGJiICYmIGJiLnggPD0geCAmJiB4IDw9IGJiLnggKyBiYi53aWR0aCAmJiBiYi55IDw9IHkgJiYgeSA8PSBiYi55ICsgYmIuaGVpZ2h0O1xuICAgIH07XG4gICAgVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludCA9IGZ1bmN0aW9uIChub2RlLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYiA9IG5vZGUuZ2V0QkIgJiYgbm9kZS5nZXRCQigpO1xuICAgICAgICB2YXIgcCA9IHRoaXMuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKG5vZGUuRWRpdGFibGVTVkdlbGVtLCB4LCB5KTtcbiAgICAgICAgaWYgKCFiYiB8fCAhcClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIFV0aWwuYm94Q29udGFpbnMoYmIsIHAueCwgcC55KTtcbiAgICB9O1xuICAgIFV0aWwuaGlnaGxpZ2h0Qm94ID0gZnVuY3Rpb24gKHN2ZywgYmIpIHtcbiAgICAgICAgdmFyIGQgPSAxMDA7XG4gICAgICAgIHZhciBkcmF3TGluZSA9IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoVXRpbC5TVkdOUywgJ2xpbmUnKTtcbiAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsICdzdHJva2U6cmdiKDAsMCwyNTUpO3N0cm9rZS13aWR0aDoyMCcpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgeDEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgeTEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeDIpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgeTIpO1xuICAgICAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54ICsgZCwgYmIueSksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54LCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnksIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLngsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBkLCBiYi55ICsgYmIuaGVpZ2h0KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCwgYmIueCArIGJiLndpZHRoIC0gZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCAtIGQpXG4gICAgICAgIF07XG4gICAgfTtcbiAgICBVdGlsLmdldEN1cnNvclZhbHVlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoaXNOYU4oZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgc3dpdGNoIChkaXJlY3Rpb25bMF0udG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3UnOiByZXR1cm4gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2QnOiByZXR1cm4gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgY2FzZSAnbCc6IHJldHVybiBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBjYXNlICdyJzogcmV0dXJuIERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3IgdmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFV0aWwuU1ZHTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG4gICAgVXRpbC5YTElOS05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgVXRpbC5OQlNQID0gXCJcXHUwMEEwXCI7XG4gICAgVXRpbC5CSUdESU1FTiA9IDEwMDAwMDAwO1xuICAgIFV0aWwuVGVYID0ge1xuICAgICAgICB4X2hlaWdodDogNDMwLjU1NCxcbiAgICAgICAgcXVhZDogMTAwMCxcbiAgICAgICAgbnVtMTogNjc2LjUwOCxcbiAgICAgICAgbnVtMjogMzkzLjczMixcbiAgICAgICAgbnVtMzogNDQzLjczLFxuICAgICAgICBkZW5vbTE6IDY4NS45NTEsXG4gICAgICAgIGRlbm9tMjogMzQ0Ljg0MSxcbiAgICAgICAgc3VwMTogNDEyLjg5MixcbiAgICAgICAgc3VwMjogMzYyLjg5MixcbiAgICAgICAgc3VwMzogMjg4Ljg4OCxcbiAgICAgICAgc3ViMTogMTUwLFxuICAgICAgICBzdWIyOiAyNDcuMjE3LFxuICAgICAgICBzdXBfZHJvcDogMzg2LjEwOCxcbiAgICAgICAgc3ViX2Ryb3A6IDUwLFxuICAgICAgICBkZWxpbTE6IDIzOTAsXG4gICAgICAgIGRlbGltMjogMTAwMCxcbiAgICAgICAgYXhpc19oZWlnaHQ6IDI1MCxcbiAgICAgICAgcnVsZV90aGlja25lc3M6IDYwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzE6IDExMS4xMTEsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMjogMTY2LjY2NixcbiAgICAgICAgYmlnX29wX3NwYWNpbmczOiAyMDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNDogNjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzU6IDEwMCxcbiAgICAgICAgc2NyaXB0c3BhY2U6IDEwMCxcbiAgICAgICAgbnVsbGRlbGltaXRlcnNwYWNlOiAxMjAsXG4gICAgICAgIGRlbGltaXRlcmZhY3RvcjogOTAxLFxuICAgICAgICBkZWxpbWl0ZXJzaG9ydGZhbGw6IDMwMCxcbiAgICAgICAgbWluX3J1bGVfdGhpY2tuZXNzOiAxLjI1LFxuICAgICAgICBtaW5fcm9vdF9zcGFjZTogMS41XG4gICAgfTtcbiAgICBVdGlsLk1BVEhTUEFDRSA9IHtcbiAgICAgICAgdmVyeXZlcnl0aGlubWF0aHNwYWNlOiAxIC8gMTgsXG4gICAgICAgIHZlcnl0aGlubWF0aHNwYWNlOiAyIC8gMTgsXG4gICAgICAgIHRoaW5tYXRoc3BhY2U6IDMgLyAxOCxcbiAgICAgICAgbWVkaXVtbWF0aHNwYWNlOiA0IC8gMTgsXG4gICAgICAgIHRoaWNrbWF0aHNwYWNlOiA1IC8gMTgsXG4gICAgICAgIHZlcnl0aGlja21hdGhzcGFjZTogNiAvIDE4LFxuICAgICAgICB2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiA3IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlubWF0aHNwYWNlOiAtMSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlubWF0aHNwYWNlOiAtMiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaW5tYXRoc3BhY2U6IC0zIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZlbWVkaXVtbWF0aHNwYWNlOiAtNCAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaWNrbWF0aHNwYWNlOiAtNSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlja21hdGhzcGFjZTogLTYgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiAtNyAvIDE4XG4gICAgfTtcbiAgICByZXR1cm4gVXRpbDtcbn0oKSk7XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgc3ZnLCBodWIsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgZGVmLmZpbGwgPSBcIm5vbmVcIjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3IC0gdCk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkIC0gdCk7XG4gICAgICAgIGRlZi50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3IodCAvIDIpICsgXCIsXCIgKyBNYXRoLmZsb29yKC1kICsgdCAvIDIpICsgXCIpXCI7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gW01hdGguZmxvb3IoNiAqIFV0aWwuZW0pLCBNYXRoLmZsb29yKDYgKiBVdGlsLmVtKV0uam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSBkO1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9GUkFNRTtcbn0oQkJPWCkpO1xudmFyIEJCT1hfR0xZUEggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0dMWVBILCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfR0xZUEgoc2NhbGUsIGlkLCBoLCBkLCB3LCBsLCByLCBwKSB7XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMubiA9IDA7XG4gICAgICAgIHZhciBkZWY7XG4gICAgICAgIHZhciB0ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXI7XG4gICAgICAgIHZhciBjYWNoZSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VGb250Q2FjaGU7XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSAoc2NhbGUgPT09IDEgPyBudWxsIDogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCIpO1xuICAgICAgICBpZiAoY2FjaGUgJiYgIU1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgaWQgPSBcIkVcIiArIHRoaXMubiArIFwiLVwiICsgaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjYWNoZSB8fCAhdGhpcy5nbHlwaHNbaWRdKSB7XG4gICAgICAgICAgICBkZWYgPSB7IFwic3Ryb2tlLXdpZHRoXCI6IHQgfTtcbiAgICAgICAgICAgIGlmIChjYWNoZSlcbiAgICAgICAgICAgICAgICBkZWYuaWQgPSBpZDtcbiAgICAgICAgICAgIGVsc2UgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgZGVmLmQgPSAocCA/IFwiTVwiICsgcCArIFwiWlwiIDogXCJcIik7XG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicGF0aFwiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x5cGhzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcInVzZVwiLCBkZWYpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIFwiI1wiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfSExJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0hMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfSExJTkUodywgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKVxuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueTEgPSBkZWYueTIgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLngyID0gTWF0aC5mbG9vcih3IC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IHQ7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0hMSU5FO1xufShCQk9YKSk7XG52YXIgQkJPWF9OT05SRU1PVkFCTEUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05PTlJFTU9WQUJMRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05PTlJFTU9WQUJMRSgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05PTlJFTU9WQUJMRTtcbn0oQkJPWF9HKSk7XG52YXIgQkJPWF9OVUxMID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OVUxMLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTlVMTCgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuQ2xlYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTlVMTDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfUkVDVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUkVDVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JFQ1QoaCwgZCwgdywgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGggKyBkO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLnkgPSAtZDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfUkVDVDtcbn0oQkJPWCkpO1xudmFyIEJCT1hfUk9XID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ST1csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ST1coKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmVsZW1zID0gW107XG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLnNkID0gMDtcbiAgICB9XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLkNoZWNrID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRhdGEudG9TVkcoKTtcbiAgICAgICAgdGhpcy5lbGVtcy5wdXNoKHN2Zyk7XG4gICAgICAgIGlmIChkYXRhLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgc3ZnLm1tbCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oID4gdGhpcy5zaCkge1xuICAgICAgICAgICAgdGhpcy5zaCA9IHN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCA+IHRoaXMuc2QpIHtcbiAgICAgICAgICAgIHRoaXMuc2QgPSBzdmcuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLlN0cmV0Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5lbGVtcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSB0aGlzLmVsZW1zW2ldLCBtbWwgPSBzdmcubW1sO1xuICAgICAgICAgICAgaWYgKG1tbCkge1xuICAgICAgICAgICAgICAgIGlmIChtbWwuZm9yY2VTdHJldGNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuaCAhPT0gdGhpcy5zaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmQgIT09IHRoaXMuc2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnID0gbW1sLlNWR3N0cmV0Y2hWKHRoaXMuc2gsIHRoaXMuc2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkhXID0gdGhpcy5zaDtcbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkQgPSB0aGlzLnNkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWMgPSBzdmcuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuQWRkKHN2ZywgdGhpcy53LCAwLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5lbGVtcztcbiAgICB9O1xuICAgIHJldHVybiBCQk9YX1JPVztcbn0oQkJPWCkpO1xudmFyIEJCT1hfU1ZHID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9TVkcsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9TVkcoKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG51bGwsIFwic3ZnXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfU1ZHO1xufShCQk9YKSk7XG52YXIgQkJPWF9WTElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVkxJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9WTElORShoLCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueDIgPSBkZWYueTEgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLnkyID0gTWF0aC5mbG9vcihoIC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1ZMSU5FO1xufShCQk9YKSk7XG52YXIgRWxlbWVudEpheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWxlbWVudEpheCgpIHtcbiAgICB9XG4gICAgcmV0dXJuIEVsZW1lbnRKYXg7XG59KCkpO1xudmFyIE1CYXNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQmFzZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1CYXNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPaCBubyEgQ291bGRuJ3QgZmluZCBlbGVtIGZvciB0aGlzOiBcIiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QkJveCgpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5nZXRNZXRob2RzID0gZnVuY3Rpb24gKGVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBvYmouY29uc3RydWN0b3IucHJvdG90eXBlID0ge307XG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAgICAgICBvYmpbaWRdID0gdGhpcy5wcm90b3R5cGVbaWRdO1xuICAgICAgICB9XG4gICAgICAgIG9iai5lZGl0YWJsZVNWRyA9IGVkaXRhYmxlU1ZHO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVkID0gdGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHN2Zy5zY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLkFkZChyZW5kZXJlZCwgc3ZnLncsIDAsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gY2hpbGQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIik7XG4gICAgICAgIGlmIChzdmcuc2tldyAmJiB0ZXh0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuciA+IHN2Zy53ICYmIHRleHQubGVuZ3RoID09PSAxICYmICF2YXJpYW50Lm5vSUMpIHtcbiAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHY2hpbGRTVkcgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVtpXSA/IHRoaXMuZGF0YVtpXS50b1NWRygpIDogbmV3IEJCT1goKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQgPSBmdW5jdGlvbiAoaSwgSFcsIEQpIHtcbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHtcbiAgICAgICAgICAgIEhXOiBIVyxcbiAgICAgICAgICAgIEQ6IERcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQkJPWCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKEhXKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzYXZlRGF0YSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgaWYgKCF0aGlzLkVkaXRhYmxlU1ZHZGF0YSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS53ID0gc3ZnLncsIHRoaXMuRWRpdGFibGVTVkdkYXRhLnggPSBzdmcueDtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCA9IHN2Zy5oLCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kID0gc3ZnLmQ7XG4gICAgICAgIGlmIChzdmcueSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCArPSBzdmcueTtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgLT0gc3ZnLnk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5YICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5YID0gc3ZnLlg7XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbClcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnR3ID0gc3ZnLnR3O1xuICAgICAgICBpZiAoc3ZnLnNrZXcpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5za2V3ID0gc3ZnLnNrZXc7XG4gICAgICAgIGlmIChzdmcuaWMpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5pYyA9IHN2Zy5pYztcbiAgICAgICAgaWYgKHRoaXNbXCJjbGFzc1wiXSkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIFV0aWwuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogdGhpc1tcImNsYXNzXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pZCkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIFV0aWwuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiaWRcIjogdGhpcy5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaHJlZikge1xuICAgICAgICAgICAgdmFyIGEgPSBVdGlsLkVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IFwibWp4LXN2Zy1ocmVmXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCB0aGlzLmhyZWYpO1xuICAgICAgICAgICAgYS5vbmNsaWNrID0gdGhpcy5TVkdsaW5rO1xuICAgICAgICAgICAgVXRpbC5hZGRFbGVtZW50KGEsIFwicmVjdFwiLCB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHN2Zy53LFxuICAgICAgICAgICAgICAgIGhlaWdodDogc3ZnLmggKyBzdmcuZCxcbiAgICAgICAgICAgICAgICB5OiAtc3ZnLmQsXG4gICAgICAgICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcInBvaW50ZXItZXZlbnRzXCI6IFwiYWxsXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHN2Zy50eXBlID09PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChnLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmFkZE1NTGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHYWRkQ2xhc3Moc3ZnLmVsZW1lbnQsIFwibWp4LXN2Zy1cIiArIHRoaXMudHlwZSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdHlsZSA9IHRoaXMuc3R5bGU7XG4gICAgICAgIGlmIChzdHlsZSAmJiBzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuYm9yZGVyID0gc3ZnLmVsZW1lbnQuc3R5bGUucGFkZGluZyA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUpIHtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IChzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID09PSBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2FkZEF0dHJpYnV0ZXMoc3ZnKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZENsYXNzID0gZnVuY3Rpb24gKG5vZGUsIG5hbWUpIHtcbiAgICAgICAgdmFyIGNsYXNzZXMgPSBub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIChjbGFzc2VzID8gY2xhc3NlcyArIFwiIFwiIDogXCJcIikgKyBuYW1lKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLmF0dHJOYW1lcykge1xuICAgICAgICAgICAgdmFyIGNvcHkgPSB0aGlzLmF0dHJOYW1lcywgc2tpcCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubm9jb3B5QXR0cmlidXRlcywgaWdub3JlID0gTWF0aEpheC5IdWIuY29uZmlnLmlnbm9yZU1NTGF0dHJpYnV0ZXM7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSAodGhpcy50eXBlID09PSBcIm1zdHlsZVwiID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYXRoLnByb3RvdHlwZS5kZWZhdWx0cyA6IHRoaXMuZGVmYXVsdHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBjb3B5Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvcHlbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlnbm9yZVtpZF0gPT0gZmFsc2UgfHwgKCFza2lwW2lkXSAmJiAhaWdub3JlW2lkXSAmJlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c1tpZF0gPT0gbnVsbCAmJiB0eXBlb2YgKHN2Zy5lbGVtZW50W2lkXSkgPT09IFwidW5kZWZpbmVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShpZCwgdGhpcy5hdHRyW2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5rID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHJlZiA9IHRoaXMuaHJlZi5hbmltVmFsO1xuICAgICAgICBpZiAoaHJlZi5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gVXRpbC5oYXNoQ2hlY2soZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaHJlZi5zdWJzdHIoMSkpKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0LnNjcm9sbEludG9WaWV3KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXJlbnROb2RlLnNjcm9sbEludG9WaWV3KHRydWUpO1xuICAgICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmxvY2F0aW9uID0gaHJlZjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHZhciBzcGFuID0gdGhpcy5IVE1MLkVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdwcm9jZXNzU3R5bGVzID0gZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHZhciBzdHlsZXMgPSB7XG4gICAgICAgICAgICBib3JkZXI6IFV0aWwuZ2V0Qm9yZGVycyhzdHlsZSksXG4gICAgICAgICAgICBwYWRkaW5nOiBVdGlsLmdldFBhZGRpbmcoc3R5bGUpXG4gICAgICAgIH07XG4gICAgICAgIGlmICghc3R5bGVzLmJvcmRlcilcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMuYm9yZGVyO1xuICAgICAgICBpZiAoIXN0eWxlcy5wYWRkaW5nKVxuICAgICAgICAgICAgZGVsZXRlIHN0eWxlcy5wYWRkaW5nO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFNpemUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTaXplJ10gPSBzdHlsZS5mb250U2l6ZTtcbiAgICAgICAgaWYgKHN0eWxlLmNvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydjb2xvciddID0gc3R5bGUuY29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5iYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAgICAgICBzdHlsZXNbJ2JhY2tncm91bmQnXSA9IHN0eWxlLmJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTdHlsZSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFN0eWxlJ10gPSBzdHlsZS5mb250U3R5bGU7XG4gICAgICAgIGlmIChzdHlsZS5mb250V2VpZ2h0KVxuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSBzdHlsZS5mb250V2VpZ2h0O1xuICAgICAgICBpZiAoc3R5bGUuZm9udEZhbWlseSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udEZhbWlseSddID0gc3R5bGUuZm9udEZhbWlseTtcbiAgICAgICAgaWYgKHN0eWxlc1snZm9udFdlaWdodCddICYmIHN0eWxlc1snZm9udFdlaWdodCddLm1hdGNoKC9eXFxkKyQvKSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gKHBhcnNlSW50KHN0eWxlc1snZm9udFdlaWdodCddKSA+IDYwMCA/IFwiYm9sZFwiIDogXCJub3JtYWxcIik7XG4gICAgICAgIHJldHVybiBzdHlsZXM7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKHRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudHlwZSAhPT0gXCJtb1wiKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwibHNwYWNlXCIsIFwicnNwYWNlXCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA8PSAwIHx8IHRoaXMuaGFzVmFsdWUoXCJsc3BhY2VcIikgfHwgdGhpcy5oYXNWYWx1ZShcInJzcGFjZVwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubHNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLmxzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMucnNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLnJzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMsIHBhcmVudCA9IHRoaXMuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcmVudCAmJiBwYXJlbnQuaXNFbWJlbGxpc2hlZCgpICYmIHBhcmVudC5Db3JlKCkgPT09IGNvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29yZSA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnggKz0gdmFsdWVzLmxzcGFjZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnJzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLlggPSB2YWx1ZXMucnNwYWNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwYWNlID0gdGhpcy50ZXhTcGFjaW5nKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKCk7XG4gICAgICAgICAgICBpZiAoc3BhY2UgIT09IFwiXCIpXG4gICAgICAgICAgICAgICAgc3ZnLnggKz0gVXRpbC5sZW5ndGgyZW0oc3BhY2UsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZUNvbG9yID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRoY29sb3JcIiwgXCJjb2xvclwiKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzICYmIHRoaXMuc3R5bGVzLmNvbG9yICYmICF2YWx1ZXMuY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5jb2xvciA9IHRoaXMuc3R5bGVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuY29sb3IgJiYgIXRoaXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGNvbG9yID0gdmFsdWVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMubWF0aGNvbG9yLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogdmFsdWVzLm1hdGhjb2xvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBib3JkZXJzID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5ib3JkZXIsIHBhZGRpbmcgPSAodGhpcy5zdHlsZXMgfHwge30pLnBhZGRpbmcsIGJsZWZ0ID0gKChib3JkZXJzIHx8IHt9KS5sZWZ0IHx8IDApLCBwbGVmdCA9ICgocGFkZGluZyB8fCB7fSkubGVmdCB8fCAwKSwgaWQ7XG4gICAgICAgIHZhbHVlcy5iYWNrZ3JvdW5kID0gKHRoaXMubWF0aGJhY2tncm91bmQgfHwgdGhpcy5iYWNrZ3JvdW5kIHx8XG4gICAgICAgICAgICAodGhpcy5zdHlsZXMgfHwge30pLmJhY2tncm91bmQgfHwgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5DT0xPUi5UUkFOU1BBUkVOVCk7XG4gICAgICAgIGlmIChibGVmdCArIHBsZWZ0KSB7XG4gICAgICAgICAgICB2YXIgZHVwID0gbmV3IEJCT1goTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzdmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ZnLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkdXBbaWRdID0gc3ZnW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdXAueCA9IDA7XG4gICAgICAgICAgICBkdXAueSA9IDA7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWRkKGR1cCwgYmxlZnQgKyBwbGVmdCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IHBhZGRpbmcudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBwYWRkaW5nLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICBzdmcudyArPSBib3JkZXJzLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBib3JkZXJzLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gYm9yZGVycy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmJhY2tncm91bmQgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpIHtcbiAgICAgICAgICAgIHZhciBub2RlTmFtZSA9IHN2Zy5lbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAobm9kZU5hbWUgIT09IFwiZ1wiICYmIG5vZGVOYW1lICE9PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gZztcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1JFQ1Qoc3ZnLmgsIHN2Zy5kLCBzdmcudywge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5iYWNrZ3JvdW5kLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH0pLCAwLCAwLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHZhciBkZCA9IDU7XG4gICAgICAgICAgICB2YXIgc2lkZXMgPSB7XG4gICAgICAgICAgICAgICAgbGVmdDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCAtZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgcmlnaHQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgc3ZnLncgLSBib3JkZXJzLnJpZ2h0ICsgZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgdG9wOiBbXCJIXCIsIHN2Zy53LCAwLCBzdmcuaCAtIGJvcmRlcnMudG9wICsgZGRdLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogW1wiSFwiLCBzdmcudywgMCwgLXN2Zy5kIC0gZGRdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzaWRlcykge1xuICAgICAgICAgICAgICAgIGlmIChzaWRlcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2lkZSA9IHNpZGVzW2lkXSwgYm94ID0gQkJPWFtzaWRlWzBdICsgXCJMSU5FXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChib3goc2lkZVsxXSwgYm9yZGVyc1tpZF0sIGJvcmRlcnNbaWQgKyBcIlN0eWxlXCJdLCBib3JkZXJzW2lkICsgXCJDb2xvclwiXSksIHNpZGVbMl0sIHNpZGVbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRWYXJpYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRodmFyaWFudFwiLCBcImZvbnRmYW1pbHlcIiwgXCJmb250d2VpZ2h0XCIsIFwiZm9udHN0eWxlXCIpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHZhbHVlcy5tYXRodmFyaWFudDtcbiAgICAgICAgaWYgKHRoaXMudmFyaWFudEZvcm0pIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBcIi1UZVgtdmFyaWFudFwiO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5oYXNWYXJpYW50ID0gdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgdmFsdWVzLmZhbWlseSA9IHZhbHVlcy5mb250ZmFtaWx5O1xuICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHZhbHVlcy5mb250d2VpZ2h0O1xuICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdmFsdWVzLmZvbnRzdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zdHlsZXMpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHRoaXMuc3R5bGVzLmZvbnRTdHlsZSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodClcbiAgICAgICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gdGhpcy5zdHlsZXMuZm9udFdlaWdodDtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLmZhbWlseSAmJiB0aGlzLnN0eWxlcy5mb250RmFtaWx5KVxuICAgICAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB0aGlzLnN0eWxlcy5mb250RmFtaWx5O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZmFtaWx5ICYmICF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvYm9sZC8pKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IFwiYm9sZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuc3R5bGUgJiYgdmFsdWVzLm1hdGh2YXJpYW50Lm1hdGNoKC9pdGFsaWMvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IFwiaXRhbGljXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGZvcmNlRmFtaWx5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiB2YWx1ZXMuZmFtaWx5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXN0eWxlXCJdID0gdmFsdWVzLnN0eWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXdlaWdodFwiXSA9IHZhbHVlcy53ZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJib2xkXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xERlJBS1RVUixcbiAgICAgICAgICAgICAgICBzY3JpcHQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0NSSVBULFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQubm9ybWFsLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuRlJBS1RVUixcbiAgICAgICAgICAgICAgICBcImJvbGQtc2NyaXB0XCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwiaXRhbGljXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuSVRBTElDLFxuICAgICAgICAgICAgICAgIGJvbGQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGSVRBTElDLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLnN0eWxlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGl0YWxpYzogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgbmFtZSArIFwiLmpzXCI7XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGRyYXcgY3Vyc29yJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3SGlnaGxpZ2h0QXQoc3ZnZWxlbSwgYmIueCwgYmIueSwgYmIud2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRTVkdCQm94ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGVsZW0gPSBlbGVtIHx8IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0gfHwgIWVsZW0ub3duZXJTVkdFbGVtZW50KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgYmIgPSBlbGVtLmdldEJCb3goKTtcbiAgICAgICAgaWYgKGVsZW0ubm9kZU5hbWUgPT09ICd1c2UnKSB7XG4gICAgICAgICAgICBiYi54ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneCcpKTtcbiAgICAgICAgICAgIGJiLnkgKz0gTnVtYmVyKGVsZW0uZ2V0QXR0cmlidXRlKCd5JykpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChlbGVtLm93bmVyU1ZHRWxlbWVudCk7XG4gICAgICAgIHZhciBwdG1wID0gZWxlbS5vd25lclNWR0VsZW1lbnQuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgdmFyIGx4ID0gMSAvIDAsIGx5ID0gMSAvIDAsIGh4ID0gLTEgLyAwLCBoeSA9IC0xIC8gMDtcbiAgICAgICAgY2hlY2soYmIueCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLnggKyBiYi53aWR0aCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogbHgsXG4gICAgICAgICAgICB5OiBseSxcbiAgICAgICAgICAgIHdpZHRoOiBoeCAtIGx4LFxuICAgICAgICAgICAgaGVpZ2h0OiBoeSAtIGx5LFxuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBjaGVjayh4LCB5KSB7XG4gICAgICAgICAgICBwdG1wLnggPSB4O1xuICAgICAgICAgICAgcHRtcC55ID0geTtcbiAgICAgICAgICAgIHZhciBwID0gcHRtcC5tYXRyaXhUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICAgICAgICAgIGx4ID0gTWF0aC5taW4obHgsIHAueCk7XG4gICAgICAgICAgICBseSA9IE1hdGgubWluKGx5LCBwLnkpO1xuICAgICAgICAgICAgaHggPSBNYXRoLm1heChoeCwgcC54KTtcbiAgICAgICAgICAgIGh5ID0gTWF0aC5tYXgoaHksIHAueSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNQmFzZU1peGluO1xufShFbGVtZW50SmF4KSk7XG52YXIgQ2hhcnNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoYXJzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ2hhcnNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIENoYXJzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgbiwgTiwgYywgZm9udCwgVkFSSUFOVCwgaSwgbSwgaWQsIE0sIFJBTkdFUztcbiAgICAgICAgaWYgKCF2YXJpYW50KSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFyaWFudC5mb3JjZUZhbWlseSkge1xuICAgICAgICAgICAgdGV4dCA9IG5ldyBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIHZhcmlhbnQuZm9udCk7XG4gICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQodGV4dCk7XG4gICAgICAgICAgICB0ZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBWQVJJQU5UID0gdmFyaWFudDtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRleHQubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gVkFSSUFOVDtcbiAgICAgICAgICAgIG4gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBjID0gdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICBpZiAobiA+PSAweEQ4MDAgJiYgbiA8IDB4REJGRikge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICBuID0gKCgobiAtIDB4RDgwMCkgPDwgMTApICsgKHRleHQuY2hhckNvZGVBdChpKSAtIDB4REMwMCkpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVERBVEEuUmVtYXBQbGFuZTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG52ID0gRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSBGT05UREFUQS5SQU5HRVM7XG4gICAgICAgICAgICAgICAgZm9yIChpZCA9IDAsIE0gPSBSQU5HRVMubGVuZ3RoOyBpZCA8IE07IGlkKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ubmFtZSA9PT0gXCJhbHBoYVwiICYmIHZhcmlhbnQubm9Mb3dlckNhc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgTiA9IHZhcmlhbnRbXCJvZmZzZXRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE4gJiYgbiA+PSBSQU5HRVNbaWRdLmxvdyAmJiBuIDw9IFJBTkdFU1tpZF0uaGlnaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ucmVtYXAgJiYgUkFOR0VTW2lkXS5yZW1hcFtuXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBOICsgUkFOR0VTW2lkXS5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBuIC0gUkFOR0VTW2lkXS5sb3cgKyBOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLmFkZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuICs9IFJBTkdFU1tpZF0uYWRkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50W1widmFyaWFudFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LnJlbWFwICYmIHZhcmlhbnQucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICBuID0gdmFyaWFudC5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcC52YXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuUkVNQVBbbl0gJiYgIXZhcmlhbnQubm9SZW1hcCkge1xuICAgICAgICAgICAgICAgIG4gPSBGT05UREFUQS5SRU1BUFtuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSBDaGFyc01peGluLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBGKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCQk9YX0dMWVBILmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gQkJPWF9HTFlQSC5wcm90b3R5cGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBnbHlwaCA9IG5ldyBGKGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGdseXBoLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuREVMSU1JVEVSU1tuXSkge1xuICAgICAgICAgICAgICAgIGMgPSB0aGlzLmNyZWF0ZURlbGltaXRlcihuLCAwLCAxLCBmb250KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAoRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKHNjYWxlICogMTAwIC8gRURJVEFCTEVTVkcuY29uZmlnLnNjYWxlLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFyaWFudC5kZWZhdWx0RmFtaWx5IHx8IEVESVRBQkxFU1ZHLmNvbmZpZy51bmRlZmluZWRGYW1pbHksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiAodmFyaWFudC5pdGFsaWMgPyBcIml0YWxpY1wiIDogXCJcIiksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogKHZhcmlhbnQuYm9sZCA/IFwiYm9sZFwiIDogXCJcIilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgICAgICBjID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgIGMuQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5IdWIuc2lnbmFsLlBvc3QoW1wiU1ZHIEpheCAtIHVua25vd24gY2hhclwiLCBuLCB2YXJpYW50XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQubGVuZ3RoID09IDEgJiYgZm9udC5za2V3ICYmIGZvbnQuc2tld1tuXSkge1xuICAgICAgICAgICAgc3ZnLnNrZXcgPSBmb250LnNrZXdbbl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvb2t1cENoYXIgPSBmdW5jdGlvbiAodmFyaWFudCwgbikge1xuICAgICAgICB2YXIgaSwgbTtcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghdmFyaWFudC5GT05UUykge1xuICAgICAgICAgICAgdmFyIEZPTlRTID0gRk9OVERBVEEuRk9OVFM7XG4gICAgICAgICAgICB2YXIgZm9udHMgPSAodmFyaWFudC5mb250cyB8fCBGT05UREFUQS5WQVJJQU5ULm5vcm1hbC5mb250cyk7XG4gICAgICAgICAgICBpZiAoIShmb250cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIGZvbnRzID0gW2ZvbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmZvbnRzICE9IGZvbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250cyA9IGZvbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudC5GT05UUyA9IFtdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IGZvbnRzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChGT05UU1tmb250c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudC5GT05UUy5wdXNoKEZPTlRTW2ZvbnRzW2ldXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB2YXJpYW50LkZPTlRTLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIGZvbnQgPSB2YXJpYW50LkZPTlRTW2ldO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAoZm9udCkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdmFyaWFudC5GT05UUztcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZvbnRbbl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9udDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZEJsb2NrKGZvbnQsIG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogXCJ1bmtub3duXCJcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyID0gZnVuY3Rpb24gKGNvZGUsIEhXLCBzY2FsZSwgZm9udCkge1xuICAgICAgICBpZiAoc2NhbGUgPT09IHZvaWQgMCkgeyBzY2FsZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKGZvbnQgPT09IHZvaWQgMCkgeyBmb250ID0gbnVsbDsgfVxuICAgICAgICB2YXIgRURJVEFCTEVTVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gMTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIGlmICghY29kZSkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogc2NhbGU7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKEhXIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBIVyA9IFtIVywgSFddO1xuICAgICAgICB9XG4gICAgICAgIHZhciBodyA9IEhXWzFdO1xuICAgICAgICBIVyA9IEhXWzBdO1xuICAgICAgICB2YXIgZGVsaW0gPSB7XG4gICAgICAgICAgICBhbGlhczogY29kZSxcbiAgICAgICAgICAgIEhXOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsb2FkOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgICAgICB3aGlsZSAoZGVsaW0uYWxpYXMpIHtcbiAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5hbGlhcztcbiAgICAgICAgICAgIGRlbGltID0gRk9OVERBVEEuREVMSU1JVEVSU1tjb2RlXTtcbiAgICAgICAgICAgIGlmICghZGVsaW0pIHtcbiAgICAgICAgICAgICAgICBkZWxpbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgSFc6IFswLCBGT05UREFUQS5WQVJJQU5UW01hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUxdXSxcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGRpcjogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubG9hZCkge1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKEVESVRBQkxFU1ZHLmZvbnREaXIgKyBcIi9mb250ZGF0YS1cIiArIGRlbGltLmxvYWQgKyBcIi5qc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkZWxpbS5IVy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVswXSAqIHNjYWxlID49IEhXIC0gMTAgLSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuYmxhY2tlciB8fCAoaSA9PSBtIC0gMSAmJiAhZGVsaW0uc3RyZXRjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gZGVsaW0uSFdbaV1bMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVszXSkge1xuICAgICAgICAgICAgICAgICAgICBjb2RlID0gZGVsaW0uSFdbaV1bM107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIFtjb2RlLCBkZWxpbS5IV1tpXVsxXV0sIGZvbnQpLldpdGgoe1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLnN0cmV0Y2gpIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5kaXIgPT0gXCJIXCIpIHtcbiAgICAgICAgICAgICAgICBFRElUQUJMRVNWRy5leHRlbmREZWxpbWl0ZXJIKHN2ZywgaHcsIGRlbGltLnN0cmV0Y2gsIHNjYWxlLCBmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRlbGltLmRpciA9PSBcIlZcIikge1xuICAgICAgICAgICAgICAgIEVESVRBQkxFU1ZHLmV4dGVuZERlbGltaXRlclYoc3ZnLCBodywgZGVsaW0uc3RyZXRjaCwgc2NhbGUsIGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZUNoYXIgPSBmdW5jdGlvbiAoc2NhbGUsIGRhdGEsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiLCB2YXJpYW50ID0ge1xuICAgICAgICAgICAgZm9udHM6IFtkYXRhWzFdXSxcbiAgICAgICAgICAgIG5vUmVtYXA6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBbZGF0YVsxXSArIFwiLWJvbGRcIiwgZGF0YVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiAoZGF0YVsxXSkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBkYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGF0YVswXS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs0XSkge1xuICAgICAgICAgICAgc2NhbGUgPSBzY2FsZSAqIGRhdGFbNF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIGlmIChkYXRhWzJdKSB7XG4gICAgICAgICAgICBzdmcueCA9IGRhdGFbMl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzNdKSB7XG4gICAgICAgICAgICBzdmcueSA9IGRhdGFbM10gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzVdKSB7XG4gICAgICAgICAgICBzdmcuaCArPSBkYXRhWzVdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs2XSkge1xuICAgICAgICAgICAgc3ZnLmQgKz0gZGF0YVs2XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uZmluZEJsb2NrID0gZnVuY3Rpb24gKGZvbnQsIGMpIHtcbiAgICAgICAgaWYgKGZvbnQuUmFuZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGZvbnQuUmFuZ2VzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChjIDwgZm9udC5SYW5nZXNbaV1bMF0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSBmb250LlJhbmdlc1tpXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IGZvbnQuUmFuZ2VzW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gZm9udC5SYW5nZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb250LlJhbmdlc1tqXVsyXSA9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udC5SYW5nZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udC5kaXJlY3RvcnkgKyBcIi9cIiArIGZpbGUgKyBcIi5qc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENoYXJzTWl4aW4ubG9hZEZvbnQgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuZm9udERpciArIFwiL1wiICsgZmlsZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIENoYXJzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBFbnRpdHlNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEVudGl0eU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEVudGl0eU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgRW50aXR5TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLnRvU3RyaW5nKCkucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICB9O1xuICAgIHJldHVybiBFbnRpdHlNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIEhvbGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhIb2xlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEhvbGUoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBIb2xlLnByb3RvdHlwZS5Jbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnR5cGUgPSBcImhvbGVcIjtcbiAgICAgICAgdGhpcy5kYXRhID0gW107XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIEhvbGUucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05PTlRSSVZJQUwgSE9MRSEhIScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgaG9sZSA9IG5ldyBCQk9YX1JFQ1QoNzAwICogdGhpcy5zY2FsZSwgMCwgNTI1ICogdGhpcy5zY2FsZSwge1xuICAgICAgICAgICAgZmlsbDogJ3doaXRlJyxcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsdWUnLFxuICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogJzIwJ1xuICAgICAgICB9KTtcbiAgICAgICAgc3ZnLkFkZChob2xlLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvbGUgZG9lcyBub3QgaGF2ZSBhIGNoaWxkJyk7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHggPSBiYm94LnggKyAoYmJveC53aWR0aCAvIDIuMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQodGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIEhvbGU7XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNQWN0aW9uTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQWN0aW9uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUFjdGlvbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUFjdGlvbk1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNQWN0aW9uTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNYXRoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXRoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWF0aE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHNwYW4sIGRpdiwgcmVwbGFjZSkge1xuICAgICAgICB2YXIgQ09ORklHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnO1xuICAgICAgICB0aGlzLmxvYWRUZXhpZnkoKTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbMF0pXG4gICAgICAgICAgICByZXR1cm4gc3BhbjtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50O1xuICAgICAgICBpZiAoU3RyaW5nKE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IFwiMFwiO1xuICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgZGF0YVN2ZyA9IHRoaXMuZGF0YVswXS50b1NWRygpO1xuICAgICAgICBib3guQWRkKGRhdGFTdmcsIDAsIDAsIHRydWUpO1xuICAgICAgICBib3guQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICBVdGlsLkVsZW1lbnQoYm94LmVsZW1lbnQsIHtcbiAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAwLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgVXRpbC5YTElOS05TKTtcbiAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbCA9IE1hdGgubWF4KC1zdmcubCwgMCksIHIgPSBNYXRoLm1heChzdmcuciAtIHN2Zy53LCAwKTtcbiAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIFV0aWwuRXgobCArIHN2Zy53ICsgcikpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgVXRpbC5FeChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0pKTtcbiAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5EIC0gMiAqIFV0aWwuZW0pO1xuICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gVXRpbC5FeCgtbCk7XG4gICAgICAgIHN0eWxlLm1hcmdpblJpZ2h0ID0gVXRpbC5FeCgtcik7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgVXRpbC5GaXhlZCgtbCwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoLXN2Zy5IIC0gVXRpbC5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICBVdGlsLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSwgMSkpO1xuICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gVXRpbC5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgPiBzdmcuZCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gVXRpbC5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsdHRleHQgPSB0aGlzLkdldChcImFsdHRleHRcIik7XG4gICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcInJvbGVcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICBzdmcuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdyZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91cyA9IHNwYW4ucXVlcnlTZWxlY3RvcignLnJlbmRlcmVkLXN2Zy1vdXRwdXQnKTtcbiAgICAgICAgaWYgKHJlcGxhY2UgJiYgcHJldmlvdXMpIHtcbiAgICAgICAgICAgIHNwYW4ucmVwbGFjZUNoaWxkKHN2Zy5lbGVtZW50LCBwcmV2aW91cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuZWxlbWVudCA9IG51bGw7XG4gICAgICAgIGlmICghdGhpcy5pc011bHRpbGluZSAmJiB0aGlzLkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIiAmJiAhc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdmFsdWVzLmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSBcIjBcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5pbmRlbnRzaGlmdCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCAxLCB0aGlzLmVkaXRhYmxlU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICAgICAgc2hpZnQgKz0gKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5SSUdIVCA/IC1pbmRlbnQgOiBpbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LnN0eWxlLnRleHRBbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbjtcbiAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydChzdHlsZSwgKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiBVdGlsLkV4KHNoaWZ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pW3ZhbHVlcy5pbmRlbnRhbGlnbl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzcGFuO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5sb2FkVGV4aWZ5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZEZpbGUoJ3RleGlmeScpO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5pbnN0YWxsQ3Vyc29yTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoYXQub3RoZXJDdXJzb3JzID0ge307XG4gICAgICAgIHZhciBpZCA9ICQodGhhdC5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmF0dHIoXCJpZFwiKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWdpc3RlcmluZyBsaXN0ZW5lcnMgb24gSUQ6IFwiLCBpZCk7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5NZXNzYWdlSG9vayhcIkVkaXRhYmxlU1ZHIG1vdmVfaW50b19mcm9tX2xlZnRcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzWzFdICE9IGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0aGF0LmN1cnNvcjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR290IG1vdmUgaW50byBmcm9tIGxlZnQhIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgJCh0aGF0LkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5NZXNzYWdlSG9vayhcIkVkaXRhYmxlU1ZHIG1vdmVfaW50b19mcm9tX3JpZ2h0XCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5jdXJzb3I7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBtb3ZlIGludG8gZnJvbSByaWdodCEgSUQ6IFwiKTtcbiAgICAgICAgICAgIHRoYXQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIERpcmVjdGlvbi5MRUZUKTtcbiAgICAgICAgICAgICQodGhhdC5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBtb3ZlX2ludG9fZnJvbV90b3BcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzWzFdICE9IGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0aGF0LmN1cnNvcjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR290IG1vdmUgaW50byBmcm9tIHRvcCEgSUQ6IFwiKTtcbiAgICAgICAgICAgIHRoYXQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIERpcmVjdGlvbi5VUCk7XG4gICAgICAgICAgICAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgbW92ZV9pbnRvX2Zyb21fYm90dG9tXCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5jdXJzb3I7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBtb3ZlIGludG8gZnJvbSBib3R0b20hIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgZHJhd19vdGhlcl9jdXJzb3JcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzWzFdICE9IGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvY2Vzc2luZyBkcmF3IG90aGVyIGN1cnNvclwiKTtcbiAgICAgICAgICAgIHZhciBjdXJzb3JJRCA9IGFyZ3NbMl07XG4gICAgICAgICAgICB2YXIgcGF0aCA9IGFyZ3NbM107XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBhcmdzWzRdO1xuICAgICAgICAgICAgdmFyIGNvbG9yID0gYXJnc1s1XTtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhhdDtcbiAgICAgICAgICAgIHdoaWxlIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5kYXRhW3BhdGguc2hpZnQoKV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShjdXJzb3JJRCBpbiB0aGF0Lm90aGVyQ3Vyc29ycykpIHtcbiAgICAgICAgICAgICAgICB0aGF0Lm90aGVyQ3Vyc29yc1tjdXJzb3JJRF0gPSBuZXcgQ3Vyc29yKGNvbG9yLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0aGF0Lm90aGVyQ3Vyc29yc1tjdXJzb3JJRF07XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKG5vZGUsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIGN1cnNvci5kcmF3KCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBjbGVhcl9vdGhlcl9jdXJzb3JcIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvY2Vzc2luZyBjbGVhciBvdGhlciBjdXJzb3JcIik7XG4gICAgICAgICAgICB2YXIgY3Vyc29ySUQgPSBhcmdzWzFdO1xuICAgICAgICAgICAgaWYgKGN1cnNvcklEIGluIHRoYXQub3RoZXJDdXJzb3JzKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdLmJsdXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhhdC5vdGhlckN1cnNvcnNbY3Vyc29ySURdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzLkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuYXR0cihcImlkXCIpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBtb3ZlX2N1cnNvcl9sZWZ0XCIsIGlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgbW92ZV9jdXJzb3JfcmlnaHRcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBtb3ZlX2N1cnNvcl91cFwiLCBpZF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5Qb3N0KFtcIkVkaXRhYmxlU1ZHIG1vdmVfY3Vyc29yX2Rvd25cIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRXJyb3JNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FcnJvck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FcnJvck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKGRlZik7XG4gICAgICAgIGJib3guQWRkKHRoaXMuU1ZHY2hpbGRTVkcoMCkpO1xuICAgICAgICBiYm94LkNsZWFuKCk7XG4gICAgICAgIGlmIChzY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgYmJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ID0gW1wid1wiLCBcImhcIiwgXCJkXCIsIFwibFwiLCBcInJcIiwgXCJEXCIsIFwiSFwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gYWRqdXN0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGJib3hbYWRqdXN0W2ldXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3BhbiA9IFV0aWwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5tZXJyb3JTdHlsZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuSW5zZXJ0KHRoaXMuc3R5bGVzLCB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTUVycm9yTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRmVuY2VkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRmVuY2VkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZlbmNlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZlbmNlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEub3Blbikge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5vcGVuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAxLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbXCJzZXBcIiArIGldKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbXCJzZXBcIiArIGldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YS5jbG9zZSkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5jbG9zZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLlN0cmV0Y2goKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1GZW5jZWRNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1GcmFjTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRnJhY01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GcmFjTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgZnJhYyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGZyYWMuc2NhbGUgPSBzdmcuc2NhbGU7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2UoZnJhYyk7XG4gICAgICAgIHZhciBudW0gPSB0aGlzLlNWR2NoaWxkU1ZHKDApLCBkZW4gPSB0aGlzLlNWR2NoaWxkU1ZHKDEpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJsaW5ldGhpY2tuZXNzXCIsIFwibnVtYWxpZ25cIiwgXCJkZW5vbWFsaWduXCIsIFwiYmV2ZWxsZWRcIik7XG4gICAgICAgIHZhciBpc0Rpc3BsYXkgPSB2YWx1ZXMuZGlzcGxheXN0eWxlO1xuICAgICAgICB2YXIgYSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIGlmICh2YWx1ZXMuYmV2ZWxsZWQpIHtcbiAgICAgICAgICAgIHZhciBkZWx0YSA9IChpc0Rpc3BsYXkgPyA0MDAgOiAxNTApO1xuICAgICAgICAgICAgdmFyIEggPSBNYXRoLm1heChudW0uaCArIG51bS5kLCBkZW4uaCArIGRlbi5kKSArIDIgKiBkZWx0YTtcbiAgICAgICAgICAgIHZhciBiZXZlbCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MkYsIEgpO1xuICAgICAgICAgICAgZnJhYy5BZGQobnVtLCAwLCAobnVtLmQgLSBudW0uaCkgLyAyICsgYSArIGRlbHRhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGJldmVsLCBudW0udyAtIGRlbHRhIC8gMiwgKGJldmVsLmQgLSBiZXZlbC5oKSAvIDIgKyBhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGRlbiwgbnVtLncgKyBiZXZlbC53IC0gZGVsdGEsIChkZW4uZCAtIGRlbi5oKSAvIDIgKyBhIC0gZGVsdGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIFcgPSBNYXRoLm1heChudW0udywgZGVuLncpO1xuICAgICAgICAgICAgdmFyIHQgPSBVdGlsLnRoaWNrbmVzczJlbSh2YWx1ZXMubGluZXRoaWNrbmVzcywgdGhpcy5zY2FsZSkgKiB0aGlzLm1zY2FsZSwgcCwgcSwgdSwgdjtcbiAgICAgICAgICAgIHZhciBtdCA9IFV0aWwuVGVYLm1pbl9ydWxlX3RoaWNrbmVzcyAvIFV0aWwuZW0gKiAxMDAwO1xuICAgICAgICAgICAgaWYgKGlzRGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHUgPSBVdGlsLlRlWC5udW0xO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1ID0gKHQgPT09IDAgPyBVdGlsLlRlWC5udW0zIDogVXRpbC5UZVgubnVtMik7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHUgKj0gc2NhbGU7XG4gICAgICAgICAgICB2ICo9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDcgOiAzKSAqIFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzLCAyICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgICAgICB2ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLncgPSBXO1xuICAgICAgICAgICAgICAgIHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyAyIDogMCkgKiBtdCArIHQsIHQgLyAyICsgMS41ICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChhICsgdCAvIDIpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBxID0gKGEgLSB0IC8gMikgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdiArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy5BZGQobmV3IEJCT1hfUkVDVCh0IC8gMiwgdCAvIDIsIFcgKyAyICogdCksIDAsIGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhYy5BbGlnbihudW0sIHZhbHVlcy5udW1hbGlnbiwgdCwgdSk7XG4gICAgICAgICAgICBmcmFjLkFsaWduKGRlbiwgdmFsdWVzLmRlbm9tYWxpZ24sIHQsIC12KTtcbiAgICAgICAgfVxuICAgICAgICBmcmFjLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5BZGQoZnJhYywgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMudGV4V2l0aERlbGltcyAmJiAhdGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy5YID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZS5jYWxsKHRoaXMsIHN2Zyk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIG1pZGxpbmVZID0gYmIueSArIChiYi5oZWlnaHQgLyAyLjApO1xuICAgICAgICB2YXIgbWlkbGluZVggPSBiYi54ICsgKGJiLndpZHRoIC8gMi4wKTtcbiAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgcG9zaXRpb246ICh4IDwgbWlkbGluZVgpID8gMCA6IDEsXG4gICAgICAgICAgICBoYWxmOiAoeSA8IG1pZGxpbmVZKSA/IDAgOiAxLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yJyk7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCwga2VlcCkge1xuICAgICAgICB2YXIgaXNOdW1lcmF0b3IgPSB0aGlzLmRhdGFbMF0gPT09IGNoaWxkO1xuICAgICAgICB2YXIgaXNEZW5vbWluYXRvciA9IHRoaXMuZGF0YVsxXSA9PT0gY2hpbGQ7XG4gICAgICAgIGlmICghaXNOdW1lcmF0b3IgJiYgIWlzRGVub21pbmF0b3IpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NwZWNpZmllZCBjaGlsZCBub3QgZm91bmQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKGlzTnVtZXJhdG9yICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzRGVub21pbmF0b3IgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChrZWVwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoaXNOdW1lcmF0b3IgPyAwIDogMSwgY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b0hhbGYgPSBmdW5jdGlvbiAoaGFsZiwgY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtoYWxmXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtoYWxmXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgICAgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbaGFsZl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKGJiICYmIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgaGFsZjogaGFsZixcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9OdW1lcmF0b3IgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoMCwgYywgZCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDEsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLkxFRlQ6XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5SSUdIVDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhWzBdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgICAgICAgICAgaGFsZjogMCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMCA6IDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5VUDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLkRPV046XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvcicpO1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA/IGJib3gud2lkdGggKyAxMDAgOiAtMTAwKTtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5uYW1lID0gXCJtZnJhY1wiO1xuICAgIHJldHVybiBNRnJhY01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUdseXBoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNR2x5cGhNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNR2x5cGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1HbHlwaE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIDtcbiAgICByZXR1cm4gTUdseXBoTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNTXVsdGlTY3JpcHRzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNTXVsdGlTY3JpcHRzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTU11bHRpU2NyaXB0c01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTU11bHRpU2NyaXB0c01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNTXVsdGlTY3JpcHRzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW5NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5nZXRDdXJzb3JMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0uZGF0YVswXS5sZW5ndGg7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmdldEN1cnNvckxlbmd0aCgpKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCk7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHRoaXMuZGF0YVtjaGlsZElkeF07XG4gICAgICAgICAgICB2YXIgYmIgPSBjaGlsZC5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYi54ICsgKGJiLndpZHRoIC8gMik7XG4gICAgICAgICAgICBpZiAoeCA8IG1pZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgcHJlZWRnZTtcbiAgICAgICAgdmFyIHBvc3RlZGdlO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICBwcmVlZGdlID0gYmJveC54O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZWJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24gLSAxXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwcmVlZGdlID0gcHJlYm94LnggKyBwcmVib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBiYm94LnggKyBiYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBvc3Rib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IHBvc3Rib3gueDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCA9IChwb3N0ZWRnZSArIHByZWVkZ2UpIC8gMjtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNbk1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTW9NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1vTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW9NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1vTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIGlmIChIVyA9PT0gdm9pZCAwKSB7IEhXID0gbnVsbDsgfVxuICAgICAgICBpZiAoRCA9PT0gdm9pZCAwKSB7IEQgPSBudWxsOyB9XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibGFyZ2VvcFwiLCBcImRpc3BsYXlzdHlsZVwiKTtcbiAgICAgICAgaWYgKHZhbHVlcy5sYXJnZW9wKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCItbGFyZ2VPcFwiIDogXCItc21hbGxPcFwiXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5Db3JlUGFyZW50KCk7XG4gICAgICAgIHZhciBpc1NjcmlwdCA9IChwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXApICYmIHRoaXMgIT09IHBhcmVudC5kYXRhWzBdKTtcbiAgICAgICAgdmFyIG1hcGNoYXJzID0gKGlzU2NyaXB0ID8gdGhpcy5yZW1hcENoYXJzIDogbnVsbCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgcGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRk9OVERBVEEuUkVNQVBBQ0NFTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2NyaXB0ICYmIHRoaXMuZGF0YS5qb2luKFwiXCIpLm1hdGNoKC9bJ2BcIlxcdTAwQjRcXHUyMDMyLVxcdTIwMzdcXHUyMDU3XS8pKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtcIi1UZVgtdmFyaWFudFwiXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzY2FsZSwgdGhpcy5yZW1hcCwgbWFwY2hhcnMpLCB4ID0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IDAgJiYgLXRleHQubCA+IDEwICogdGV4dC53KSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gLXRleHQubDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0LCB4LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gdGV4dC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgc3ZnLnkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChzdmcuaCAtIHN2Zy5kKSAvIDIgLyBzY2FsZTtcbiAgICAgICAgICAgIGlmIChzdmcuciA+IHN2Zy53KSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghdGhpcy5HZXQoXCJzdHJldGNoeVwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjID0gdGhpcy5kYXRhLmpvaW4oXCJcIik7XG4gICAgICAgIGlmIChjLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5Db3JlUGFyZW50KCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm11bmRlcm92ZXIpICYmXG4gICAgICAgICAgICB0aGlzLkNvcmVUZXh0KHBhcmVudC5kYXRhW3BhcmVudC5iYXNlXSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgb3ZlciA9IHBhcmVudC5kYXRhW3BhcmVudC5vdmVyXSwgdW5kZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQudW5kZXJdO1xuICAgICAgICAgICAgaWYgKG92ZXIgJiYgdGhpcyA9PT0gb3Zlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50XCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UW2NdIHx8IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBjID0gRk9OVERBVEEuUkVNQVBBQ0NFTlRVTkRFUltjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGMgPSBGT05UREFUQS5ERUxJTUlURVJTW2MuY2hhckNvZGVBdCgwKV07XG4gICAgICAgIHZhciBjYW4gPSAoYyAmJiBjLmRpciA9PSBkaXJlY3Rpb24uc3Vic3RyKDAsIDEpKTtcbiAgICAgICAgaWYgKCFjYW4pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN2ZztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZvcmNlU3RyZXRjaCA9IGNhbiAmJiAodGhpcy5HZXQoXCJtaW5zaXplXCIsIHRydWUpIHx8IHRoaXMuR2V0KFwibWF4c2l6ZVwiLCB0cnVlKSk7XG4gICAgICAgIHJldHVybiBjYW47XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInN5bW1ldHJpY1wiLCBcIm1heHNpemVcIiwgXCJtaW5zaXplXCIpO1xuICAgICAgICB2YXIgYXhpcyA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc3ZnLnNjYWxlLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKSwgSDtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAyICogTWF0aC5tYXgoaCAtIGF4aXMsIGQgKyBheGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSBoICsgZDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcuaCArIHN2Zy5kKTtcbiAgICAgICAgSCA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgSCkpO1xuICAgICAgICBpZiAoSCAhPSB2YWx1ZXMubWluc2l6ZSkge1xuICAgICAgICAgICAgSCA9IFtNYXRoLm1heChIICogVXRpbC5UZVguZGVsaW1pdGVyZmFjdG9yIC8gMTAwMCwgSCAtIFV0aWwuVGVYLmRlbGltaXRlcnNob3J0ZmFsbCksIEhdO1xuICAgICAgICB9XG4gICAgICAgIHN2ZyA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIEgsIHN2Zy5zY2FsZSk7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gKHN2Zy5oICsgc3ZnLmQpIC8gMiArIGF4aXM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gKHN2Zy5oICsgc3ZnLmQpICogaCAvIChoICsgZCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLnkgPSBIIC0gc3ZnLmg7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICBkZWxldGUgdGhpcy5zdmcuZWxlbWVudDtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBzdmcuc3RyZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnIHx8IHRoaXMudG9TVkcoKSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcIm1heHNpemVcIiwgXCJtaW5zaXplXCIsIFwibWF0aHZhcmlhbnRcIiwgXCJmb250d2VpZ2h0XCIpO1xuICAgICAgICBpZiAoKHZhbHVlcy5mb250d2VpZ2h0ID09PSBcImJvbGRcIiB8fCBwYXJzZUludCh2YWx1ZXMuZm9udHdlaWdodCkgPj0gNjAwKSAmJlxuICAgICAgICAgICAgIXRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRodmFyaWFudCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5tYXhzaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1heHNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHcgPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIHcpKTtcbiAgICAgICAgc3ZnID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgdywgc3ZnLnNjYWxlLCB2YWx1ZXMubWF0aHZhcmlhbnQpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTW9NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1QYWRkZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QYWRkZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGFkZGVkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBwYWQgPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiLCBcImxzcGFjZVwiLCBcInZvZmZzZXRcIiksIFggPSAwLCBZID0gMDtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgWCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLmxzcGFjZSwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy52b2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgWSA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLnZvZmZzZXQsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoID0gcGFkLmgsIGQgPSBwYWQuZCwgdyA9IHBhZC53LCB5ID0gcGFkLnk7XG4gICAgICAgICAgICBzdmcuQWRkKHBhZCwgWCwgWSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHN2Zy5oID0gaCArIHk7XG4gICAgICAgICAgICBzdmcuZCA9IGQgLSB5O1xuICAgICAgICAgICAgc3ZnLncgPSB3O1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaGVpZ2h0ICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmggPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5oZWlnaHQsIG11LCBcImhcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmRlcHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmQgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5kZXB0aCwgbXUsIFwiZFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcudyA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLndpZHRoLCBtdSwgXCJ3XCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5oID4gc3ZnLkgpIHtcbiAgICAgICAgICAgICAgICBzdmcuSCA9IHN2Zy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgaWYgKHN2Zy5kID4gc3ZnLkQpIHtcbiAgICAgICAgICAgICAgICBzdmcuRCA9IHN2Zy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS5TVkdsZW5ndGgyZW0gPSBmdW5jdGlvbiAoc3ZnLCBsZW5ndGgsIG11LCBkLCBtKSB7XG4gICAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgICAgIG0gPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF0Y2ggPSBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvd2lkdGh8aGVpZ2h0fGRlcHRoLyk7XG4gICAgICAgIHZhciBzaXplID0gKG1hdGNoID8gc3ZnW21hdGNoWzBdLmNoYXJBdCgwKV0gOiAoZCA/IHN2Z1tkXSA6IDApKTtcbiAgICAgICAgdmFyIHYgPSBVdGlsLmxlbmd0aDJlbShsZW5ndGgsIG11LCBzaXplIC8gdGhpcy5tc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIGlmIChkICYmIFN0cmluZyhsZW5ndGgpLm1hdGNoKC9eXFxzKlstK10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KG0sIHN2Z1tkXSArIHYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNUGFkZGVkTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUGhhbnRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBoYW50b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGhhbnRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBoYW50b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHdoaWxlIChzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiAhc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVBoYW50b21NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TcXJ0TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3FydE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcXJ0TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3FydE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCk7XG4gICAgICAgIHZhciBydWxlO1xuICAgICAgICB2YXIgc3VyZDtcbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgdmFyIHE7XG4gICAgICAgIHZhciBIO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIoMHgyMjFBLCBILCBzY2FsZSk7XG4gICAgICAgIGlmIChzdXJkLmggKyBzdXJkLmQgPiBIKSB7XG4gICAgICAgICAgICBxID0gKChzdXJkLmggKyBzdXJkLmQpIC0gKEggLSB0KSkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGUgPSBuZXcgQkJPWF9SRUNUKHQsIDAsIGJhc2Uudyk7XG4gICAgICAgIEggPSBiYXNlLmggKyBxICsgdDtcbiAgICAgICAgeCA9IHRoaXMuU1ZHYWRkUm9vdChzdmcsIHN1cmQsIHgsIHN1cmQuaCArIHN1cmQuZCAtIEgsIHNjYWxlKTtcbiAgICAgICAgc3ZnLkFkZChzdXJkLCB4LCBIIC0gc3VyZC5oKTtcbiAgICAgICAgc3ZnLkFkZChydWxlLCB4ICsgc3VyZC53LCBIIC0gcnVsZS5oKTtcbiAgICAgICAgc3ZnLkFkZChiYXNlLCB4ICsgc3VyZC53LCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5oICs9IHQ7XG4gICAgICAgIHN2Zy5IICs9IHQ7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH07XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNU3FydE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjLCBkLCB0aGlzKTtcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjLCBkKTtcbiAgICB9O1xuICAgIHJldHVybiBNU3FydE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVJvb3RNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb290TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvb3RNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5TVkdjaGlsZFNWRygwKTtcbiAgICAgICAgdmFyIHJ1bGU7XG4gICAgICAgIHZhciBzdXJkO1xuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgIHZhciBwO1xuICAgICAgICB2YXIgcTtcbiAgICAgICAgdmFyIEg7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgaWYgKHRoaXMuR2V0KFwiZGlzcGxheXN0eWxlXCIpKSB7XG4gICAgICAgICAgICBwID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSB0O1xuICAgICAgICB9XG4gICAgICAgIHEgPSBNYXRoLm1heCh0ICsgcCAvIDQsIDEwMDAgKiBVdGlsLlRlWC5taW5fcm9vdF9zcGFjZSAvIFV0aWwuZW0pO1xuICAgICAgICBIID0gYmFzZS5oICsgYmFzZS5kICsgcSArIHQ7XG4gICAgICAgIHN1cmQgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDIyMUEsIEgsIHNjYWxlKTtcbiAgICAgICAgaWYgKHN1cmQuaCArIHN1cmQuZCA+IEgpIHtcbiAgICAgICAgICAgIHEgPSAoKHN1cmQuaCArIHN1cmQuZCkgLSAoSCAtIHQpKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IG5ldyBCQk9YX1JFQ1QodCwgMCwgYmFzZS53KTtcbiAgICAgICAgSCA9IGJhc2UuaCArIHEgKyB0O1xuICAgICAgICB4ID0gdGhpcy5TVkdhZGRSb290KHN2Zywgc3VyZCwgeCwgc3VyZC5oICsgc3VyZC5kIC0gSCwgc2NhbGUpO1xuICAgICAgICBzdmcuQWRkKHN1cmQsIHgsIEggLSBzdXJkLmgpO1xuICAgICAgICBzdmcuQWRkKHJ1bGUsIHggKyBzdXJkLncsIEggLSBydWxlLmgpO1xuICAgICAgICBzdmcuQWRkKGJhc2UsIHggKyBzdXJkLncsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLmggKz0gdDtcbiAgICAgICAgc3ZnLkggKz0gdDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5TVkdhZGRSb290ID0gZnVuY3Rpb24gKHN2Zywgc3VyZCwgeCwgZCwgc2NhbGUpIHtcbiAgICAgICAgdmFyIGR4ID0gKHN1cmQuaXNNdWx0aUNoYXIgPyAuNTUgOiAuNjUpICogc3VyZC53O1xuICAgICAgICBpZiAodGhpcy5kYXRhWzFdKSB7XG4gICAgICAgICAgICB2YXIgcm9vdCA9IHRoaXMuZGF0YVsxXS50b1NWRygpO1xuICAgICAgICAgICAgcm9vdC54ID0gMDtcbiAgICAgICAgICAgIHZhciBoID0gdGhpcy5TVkdyb290SGVpZ2h0KHN1cmQuaCArIHN1cmQuZCwgc2NhbGUsIHJvb3QpIC0gZDtcbiAgICAgICAgICAgIHZhciB3ID0gTWF0aC5taW4ocm9vdC53LCByb290LnIpO1xuICAgICAgICAgICAgeCA9IE1hdGgubWF4KHcsIGR4KTtcbiAgICAgICAgICAgIHN2Zy5BZGQocm9vdCwgeCAtIHcsIGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZHggPSB4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IC0gZHg7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5TVkdyb290SGVpZ2h0ID0gZnVuY3Rpb24gKGQsIHNjYWxlLCByb290KSB7XG4gICAgICAgIHJldHVybiAuNDUgKiAoZCAtIDkwMCAqIHNjYWxlKSArIDYwMCAqIHNjYWxlICsgTWF0aC5tYXgoMCwgcm9vdC5kIC0gNzUpO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjLCBkLCB0aGlzKTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjLCBkKTtcbiAgICB9O1xuICAgIHJldHVybiBNUm9vdE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvd01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpXG4gICAgICAgICAgICBzdmcgPSB0aGlzLlNWR211bHRpbGluZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5saW5lYnJlYWtDb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYyAmJlxuICAgICAgICAgICAgc3ZnLncgPiB0aGlzLmVkaXRhYmxlU1ZHLmxpbmVicmVha1dpZHRoKSB8fCB0aGlzLmhhc05ld2xpbmUoKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbXVsdGlsaW5lID0gZnVuY3Rpb24gKHNwYW4pIHtcbiAgICAgICAgcmV0dXJuIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlKFwibXVsdGlsaW5lXCIpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgdyksIHN2Zy53LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yUGFzc3Rocm91Z2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gdGhpcy5kYXRhW2NoaWxkSWR4XSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGRJZHggPT09IHRoaXMuZGF0YS5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNwZWNpZmllZCBjaGlsZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHggKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHRoaXMuZGF0YVtjaGlsZElkeF07XG4gICAgICAgICAgICB2YXIgYmIgPSBjaGlsZC5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGRQb3NpdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyBjdXJzb3IucG9zaXRpb24gLSAxIDogY3Vyc29yLnBvc2l0aW9uO1xuICAgICAgICBpZiAoY3Vyc29yLm1vZGUgPT09IGN1cnNvci5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbY2hpbGRQb3NpdGlvbl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3JIaWdobGlnaHQgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB2YXIgY3VyID0gY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGU7XG4gICAgICAgICAgICB2YXIgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgICAgIGlmIChjdXIucGFyZW50ID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5kYXRhLmluZGV4T2YoY3VyKSArIDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHNlbGVjdGlvblN0YXJ0IG5vdCBpbiBtcm93XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uRW5kLm5vZGUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIHZhciBwb3MyID0gTWF0aC5tYXgoY3Vyc29yLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCBjdXJzb3Iuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgaWYgKHBvczEgPT09IHBvczIpIHtcbiAgICAgICAgICAgIGN1cnNvci5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4MSA9IHRoaXMuZGF0YVtwb3MxXS5nZXRTVkdCQm94KCkueDtcbiAgICAgICAgdmFyIHBvczJiYiA9IHRoaXMuZGF0YVtwb3MyIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeDIgPSBwb3MyYmIueCArIHBvczJiYi53aWR0aDtcbiAgICAgICAgdmFyIHdpZHRoID0geDIgLSB4MTtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIHgxLCBiYi55LCB3aWR0aCwgYmIuaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNUm93TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTXNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTXNNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TcGFjZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNwYWNlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNwYWNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3BhY2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIik7XG4gICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMubWF0aGJhY2tncm91bmQ7XG4gICAgICAgIGlmICh0aGlzLmJhY2tncm91bmQgJiYgIXRoaXMubWF0aGJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMuYmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLm1zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHN2Zy5oID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmhlaWdodCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy5kID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmRlcHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIGlmIChzdmcudyA8IDApIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmggPCAtc3ZnLmQpIHtcbiAgICAgICAgICAgIHN2Zy5kID0gLXN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5sID0gMDtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1TcGFjZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVN0eWxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3R5bGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3R5bGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIG1hdGggPSBzdmcuQWRkKHRoaXMuZGF0YVswXS50b1NWRygpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgaWYgKG1hdGguaWMpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBtYXRoLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN0eWxlTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3ViU3VwTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3ViU3VwTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN1YlN1cE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAxO1xuICAgIH1cbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQodGhpcy5iYXNlLCBIVywgRCkpO1xuICAgICAgICB2YXIgc3NjYWxlID0gKHRoaXMuZGF0YVt0aGlzLnN1cF0gfHwgdGhpcy5kYXRhW3RoaXMuc3ViXSB8fCB0aGlzKS5TVkdnZXRTY2FsZSgpO1xuICAgICAgICB2YXIgeF9oZWlnaHQgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlLCBzID0gVXRpbC5UZVguc2NyaXB0c3BhY2UgKiBzY2FsZTtcbiAgICAgICAgdmFyIHN1cCwgc3ViO1xuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdXBdKSkge1xuICAgICAgICAgICAgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXS50b1NWRygpO1xuICAgICAgICAgICAgc3VwLncgKz0gcztcbiAgICAgICAgICAgIHN1cC5yID0gTWF0aC5tYXgoc3VwLncsIHN1cC5yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdWJdKSkge1xuICAgICAgICAgICAgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXS50b1NWRygpO1xuICAgICAgICAgICAgc3ViLncgKz0gcztcbiAgICAgICAgICAgIHN1Yi5yID0gTWF0aC5tYXgoc3ViLncsIHN1Yi5yKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IFV0aWwuVGVYLnN1cF9kcm9wICogc3NjYWxlLCByID0gVXRpbC5UZVguc3ViX2Ryb3AgKiBzc2NhbGU7XG4gICAgICAgIHZhciB1ID0gYmFzZS5oICsgKGJhc2UueSB8fCAwKSAtIHEsIHYgPSBiYXNlLmQgLSAoYmFzZS55IHx8IDApICsgciwgZGVsdGEgPSAwLCBwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgYmFzZS53IC09IGJhc2UuaWM7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdICYmXG4gICAgICAgICAgICAodGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtaVwiIHx8IHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibW9cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIGJhc2Uuc2NhbGUgPT09IDEgJiZcbiAgICAgICAgICAgICAgICAhYmFzZS5zdHJldGNoZWQgJiYgIXRoaXMuZGF0YVt0aGlzLmJhc2VdLkdldChcImxhcmdlb3BcIikpIHtcbiAgICAgICAgICAgICAgICB1ID0gdiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuZ2V0VmFsdWVzKFwic3Vic2NyaXB0c2hpZnRcIiwgXCJzdXBlcnNjcmlwdHNoaWZ0XCIpO1xuICAgICAgICBtaW4uc3Vic2NyaXB0c2hpZnQgPSAobWluLnN1YnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdWJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgbWluLnN1cGVyc2NyaXB0c2hpZnQgPSAobWluLnN1cGVyc2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1cGVyc2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIHZhciB4ID0gYmFzZS53ICsgYmFzZS54O1xuICAgICAgICBpZiAoIXN1cCkge1xuICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIxICogc2NhbGUsIHN1Yi5oIC0gKDQgLyA1KSAqIHhfaGVpZ2h0LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtdik7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwidGV4cHJpbWVzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBwID0gVXRpbC5UZVhbKHZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcInN1cDFcIiA6ICh2YWx1ZXMudGV4cHJpbWVzdHlsZSA/IFwic3VwM1wiIDogXCJzdXAyXCIpKV07XG4gICAgICAgICAgICAgICAgdSA9IE1hdGgubWF4KHUsIHAgKiBzY2FsZSwgc3VwLmQgKyAoMSAvIDQpICogeF9oZWlnaHQsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCB1KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gdTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIyICogc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICBpZiAoKHUgLSBzdXAuZCkgLSAoc3ViLmggLSB2KSA8IDMgKiB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSAzICogdCAtIHUgKyBzdXAuZCArIHN1Yi5oO1xuICAgICAgICAgICAgICAgICAgICBxID0gKDQgLyA1KSAqIHhfaGVpZ2h0IC0gKHUgLSBzdXAuZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdSArPSBxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiAtPSBxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3QubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAxIDogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgdmFyIHNtYWxsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgPyB0aGlzLnN1YiA6IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIGJhc2VCQiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmFzZUJCIHx8ICFjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5kYXRhW3NtYWxsXSA/IHNtYWxsIDogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAmJiB0aGlzLmRhdGFbc21hbGxdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtzbWFsbF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtzbWFsbF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbc21hbGxdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHNtYWxsLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1YjtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1YkJCLnggKyAoc3ViQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1cEJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3VwQkIueCArIChzdXBCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGJhc2UuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1YixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJblZlcnRpY2FsbHkgPSB2ZXJ0aWNhbCAmJiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApID09PSAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViKTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbkhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgIHZhciBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0F3YXkgPSB2ZXJ0aWNhbCA/ICFtb3ZpbmdJblZlcnRpY2FsbHkgOiAhdGhpcy5yaWdodE1vdmVTdGF5ICYmIG1vdmVSaWdodEhvcml6b250YWxseTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbiA9IG1vdmluZ0luVmVydGljYWxseSB8fCBtb3ZpbmdJbkhvcml6b250YWxseSB8fCBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgJiYgdGhpcy5yaWdodE1vdmVTdGF5O1xuICAgICAgICAgICAgaWYgKG1vdmluZ0F3YXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtb3ZpbmdJbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdWJTdXBNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1UYWJsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiY29sdW1uYWxpZ25cIiwgXCJyb3dhbGlnblwiLCBcImNvbHVtbnNwYWNpbmdcIiwgXCJyb3dzcGFjaW5nXCIsIFwiY29sdW1ud2lkdGhcIiwgXCJlcXVhbGNvbHVtbnNcIiwgXCJlcXVhbHJvd3NcIiwgXCJjb2x1bW5saW5lc1wiLCBcInJvd2xpbmVzXCIsIFwiZnJhbWVcIiwgXCJmcmFtZXNwYWNpbmdcIiwgXCJhbGlnblwiLCBcInVzZUhlaWdodFwiLCBcIndpZHRoXCIsIFwic2lkZVwiLCBcIm1pbmxhYmVsc3BhY2luZ1wiKTtcbiAgICAgICAgaWYgKHZhbHVlcy53aWR0aC5tYXRjaCgvJSQvKSkge1xuICAgICAgICAgICAgc3ZnLndpZHRoID0gdmFsdWVzLndpZHRoID0gVXRpbC5FbSgoVXRpbC5jd2lkdGggLyAxMDAwKSAqIChwYXJzZUZsb2F0KHZhbHVlcy53aWR0aCkgLyAxMDApKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciBMQUJFTCA9IC0xO1xuICAgICAgICB2YXIgSCA9IFtdLCBEID0gW10sIFcgPSBbXSwgQSA9IFtdLCBDID0gW10sIGksIGosIEogPSAtMSwgbSwgTSwgcywgcm93LCBjZWxsLCBtbywgSEQ7XG4gICAgICAgIHZhciBMSCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLmxpbmVIICogc2NhbGUgKiB2YWx1ZXMudXNlSGVpZ2h0LCBMRCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLmxpbmVEICogc2NhbGUgKiB2YWx1ZXMudXNlSGVpZ2h0O1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgcm93ID0gdGhpcy5kYXRhW2ldO1xuICAgICAgICAgICAgcyA9IChyb3cudHlwZSA9PT0gXCJtbGFiZWxlZHRyXCIgPyBMQUJFTCA6IDApO1xuICAgICAgICAgICAgQVtpXSA9IFtdO1xuICAgICAgICAgICAgSFtpXSA9IExIO1xuICAgICAgICAgICAgRFtpXSA9IExEO1xuICAgICAgICAgICAgZm9yIChqID0gcywgTSA9IHJvdy5kYXRhLmxlbmd0aCArIHM7IGogPCBNOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoV1tqXSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChqID4gSikge1xuICAgICAgICAgICAgICAgICAgICAgICAgSiA9IGo7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQ1tqXSA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjZWxsID0gcm93LmRhdGFbaiAtIHNdO1xuICAgICAgICAgICAgICAgIEFbaV1bal0gPSBjZWxsLnRvU1ZHKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNlbGwuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vID0gY2VsbC5Db3JlTU8oKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1pbiA9IG1vLkdldChcIm1pbnNpemVcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtby5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBIRCA9IG1vLkVkaXRhYmxlU1ZHZGF0YS5oICsgbW8uRWRpdGFibGVTVkdkYXRhLmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEhEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbiA9IFV0aWwubGVuZ3RoMmVtKG1pbiwgbXUsIEhEKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1pbiAqIG1vLkVkaXRhYmxlU1ZHZGF0YS5oIC8gSEQgPiBIW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIW2ldID0gbWluICogbW8uRWRpdGFibGVTVkdkYXRhLmggLyBIRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluICogbW8uRWRpdGFibGVTVkdkYXRhLmQgLyBIRCA+IERbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERbaV0gPSBtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuZCAvIEhEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobW8uU1ZHY2FuU3RyZXRjaChcIkhvcml6b250YWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW4gPSBVdGlsLmxlbmd0aDJlbShtaW4sIG11LCBtby5FZGl0YWJsZVNWR2RhdGEudyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1pbiA+IFdbal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV1tqXSA9IG1pbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0uaCA+IEhbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgSFtpXSA9IEFbaV1bal0uaDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0uZCA+IERbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgRFtpXSA9IEFbaV1bal0uZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0udyA+IFdbal0pIHtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IEFbaV1bal0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFNQTElUID0gTWF0aEpheC5IdWIuU3BsaXRMaXN0O1xuICAgICAgICB2YXIgQ1NQQUNFID0gU1BMSVQodmFsdWVzLmNvbHVtbnNwYWNpbmcpLCBSU1BBQ0UgPSBTUExJVCh2YWx1ZXMucm93c3BhY2luZyksIENBTElHTiA9IFNQTElUKHZhbHVlcy5jb2x1bW5hbGlnbiksIFJBTElHTiA9IFNQTElUKHZhbHVlcy5yb3dhbGlnbiksIENMSU5FUyA9IFNQTElUKHZhbHVlcy5jb2x1bW5saW5lcyksIFJMSU5FUyA9IFNQTElUKHZhbHVlcy5yb3dsaW5lcyksIENXSURUSCA9IFNQTElUKHZhbHVlcy5jb2x1bW53aWR0aCksIFJDQUxJR04gPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IENTUEFDRS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIENTUEFDRVtpXSA9IFV0aWwubGVuZ3RoMmVtKENTUEFDRVtpXSwgbXUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBSU1BBQ0UubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBSU1BBQ0VbaV0gPSBVdGlsLmxlbmd0aDJlbShSU1BBQ0VbaV0sIG11KTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoQ1NQQUNFLmxlbmd0aCA8IEopIHtcbiAgICAgICAgICAgIENTUEFDRS5wdXNoKENTUEFDRVtDU1BBQ0UubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDQUxJR04ubGVuZ3RoIDw9IEopIHtcbiAgICAgICAgICAgIENBTElHTi5wdXNoKENBTElHTltDQUxJR04ubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDTElORVMubGVuZ3RoIDwgSikge1xuICAgICAgICAgICAgQ0xJTkVTLnB1c2goQ0xJTkVTW0NMSU5FUy5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENXSURUSC5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgQ1dJRFRILnB1c2goQ1dJRFRIW0NXSURUSC5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJTUEFDRS5sZW5ndGggPCBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUlNQQUNFLnB1c2goUlNQQUNFW1JTUEFDRS5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJBTElHTi5sZW5ndGggPD0gQS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFJBTElHTi5wdXNoKFJBTElHTltSQUxJR04ubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChSTElORVMubGVuZ3RoIDwgQS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFJMSU5FUy5wdXNoKFJMSU5FU1tSTElORVMubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChDW0xBQkVMXSkge1xuICAgICAgICAgICAgQ0FMSUdOW0xBQkVMXSA9ICh2YWx1ZXMuc2lkZS5zdWJzdHIoMCwgMSkgPT09IFwibFwiID8gXCJsZWZ0XCIgOiBcInJpZ2h0XCIpO1xuICAgICAgICAgICAgQ1NQQUNFW0xBQkVMXSA9IC1XW0xBQkVMXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHJvdyA9IHRoaXMuZGF0YVtpXTtcbiAgICAgICAgICAgIFJDQUxJR05baV0gPSBbXTtcbiAgICAgICAgICAgIGlmIChyb3cucm93YWxpZ24pIHtcbiAgICAgICAgICAgICAgICBSQUxJR05baV0gPSByb3cucm93YWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocm93LmNvbHVtbmFsaWduKSB7XG4gICAgICAgICAgICAgICAgUkNBTElHTltpXSA9IFNQTElUKHJvdy5jb2x1bW5hbGlnbik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKFJDQUxJR05baV0ubGVuZ3RoIDw9IEopIHtcbiAgICAgICAgICAgICAgICAgICAgUkNBTElHTltpXS5wdXNoKFJDQUxJR05baV1bUkNBTElHTltpXS5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZXF1YWxyb3dzKSB7XG4gICAgICAgICAgICB2YXIgSG0gPSBNYXRoLm1heC5hcHBseShNYXRoLCBIKSwgRG0gPSBNYXRoLm1heC5hcHBseShNYXRoLCBEKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHMgPSAoKEhtICsgRG0pIC0gKEhbaV0gKyBEW2ldKSkgLyAyO1xuICAgICAgICAgICAgICAgIEhbaV0gKz0gcztcbiAgICAgICAgICAgICAgICBEW2ldICs9IHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgSEQgPSBIWzBdICsgRFtBLmxlbmd0aCAtIDFdO1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGggLSAxOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBIRCArPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmeCA9IDAsIGZ5ID0gMCwgZlcsIGZIID0gSEQ7XG4gICAgICAgIGlmICh2YWx1ZXMuZnJhbWUgIT09IFwibm9uZVwiIHx8XG4gICAgICAgICAgICAodmFsdWVzLmNvbHVtbmxpbmVzICsgdmFsdWVzLnJvd2xpbmVzKS5tYXRjaCgvc29saWR8ZGFzaGVkLykpIHtcbiAgICAgICAgICAgIHZhciBmcmFtZVNwYWNpbmcgPSBTUExJVCh2YWx1ZXMuZnJhbWVzcGFjaW5nKTtcbiAgICAgICAgICAgIGlmIChmcmFtZVNwYWNpbmcubGVuZ3RoICE9IDIpIHtcbiAgICAgICAgICAgICAgICBmcmFtZVNwYWNpbmcgPSBTUExJVCh0aGlzLmRlZmF1bHRzLmZyYW1lc3BhY2luZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmeCA9IFV0aWwubGVuZ3RoMmVtKGZyYW1lU3BhY2luZ1swXSwgbXUpO1xuICAgICAgICAgICAgZnkgPSBVdGlsLmxlbmd0aDJlbShmcmFtZVNwYWNpbmdbMV0sIG11KTtcbiAgICAgICAgICAgIGZIID0gSEQgKyAyICogZnk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFksIGZZLCBuID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiAodmFsdWVzLmFsaWduKSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFsdWVzLmFsaWduID0gU3RyaW5nKHZhbHVlcy5hbGlnbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5hbGlnbi5tYXRjaCgvKHRvcHxib3R0b218Y2VudGVyfGJhc2VsaW5lfGF4aXMpKCArKC0/XFxkKykpPy8pKSB7XG4gICAgICAgICAgICBuID0gUmVnRXhwLiQzIHx8IFwiXCI7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSBSZWdFeHAuJDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSB0aGlzLmRlZmF1bHRzLmFsaWduO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuICE9PSBcIlwiKSB7XG4gICAgICAgICAgICBuID0gcGFyc2VJbnQobik7XG4gICAgICAgICAgICBpZiAobiA8IDApIHtcbiAgICAgICAgICAgICAgICBuID0gQS5sZW5ndGggKyAxICsgbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIDwgMSkge1xuICAgICAgICAgICAgICAgIG4gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobiA+IEEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbiA9IEEubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgWSA9IDA7XG4gICAgICAgICAgICBmWSA9IC0oSEQgKyBmeSkgKyBIWzBdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IG4gLSAxOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRZID0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgICAgICBZICs9IGRZO1xuICAgICAgICAgICAgICAgIGZZICs9IGRZO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgWSA9ICh7XG4gICAgICAgICAgICAgICAgdG9wOiAtKEhbMF0gKyBmeSksXG4gICAgICAgICAgICAgICAgYm90dG9tOiBIRCArIGZ5IC0gSFswXSxcbiAgICAgICAgICAgICAgICBjZW50ZXI6IEhEIC8gMiAtIEhbMF0sXG4gICAgICAgICAgICAgICAgYmFzZWxpbmU6IEhEIC8gMiAtIEhbMF0sXG4gICAgICAgICAgICAgICAgYXhpczogSEQgLyAyICsgVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZSAtIEhbMF1cbiAgICAgICAgICAgIH0pW3ZhbHVlcy5hbGlnbl07XG4gICAgICAgICAgICBmWSA9ICh7XG4gICAgICAgICAgICAgICAgdG9wOiAtKEhEICsgMiAqIGZ5KSxcbiAgICAgICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICAgICAgY2VudGVyOiAtKEhEIC8gMiArIGZ5KSxcbiAgICAgICAgICAgICAgICBiYXNlbGluZTogLShIRCAvIDIgKyBmeSksXG4gICAgICAgICAgICAgICAgYXhpczogVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZSAtIEhEIC8gMiAtIGZ5XG4gICAgICAgICAgICB9KVt2YWx1ZXMuYWxpZ25dO1xuICAgICAgICB9XG4gICAgICAgIHZhciBXVywgV1AgPSAwLCBXdCA9IDAsIFdwID0gMCwgcCA9IDAsIGYgPSAwLCBQID0gW10sIEYgPSBbXSwgV2YgPSAxO1xuICAgICAgICBpZiAodmFsdWVzLmVxdWFsY29sdW1ucyAmJiB2YWx1ZXMud2lkdGggIT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICBXVyA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDU1BBQ0UubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdXIC09IENTUEFDRVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFdXIC89IEogKyAxO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDV0lEVEgubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdbaV0gPSBXVztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBNYXRoLm1pbihKICsgMSwgQ1dJRFRILmxlbmd0aCk7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoQ1dJRFRIW2ldID09PSBcImF1dG9cIikge1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDV0lEVEhbaV0gPT09IFwiZml0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgRltmXSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGYrKztcbiAgICAgICAgICAgICAgICAgICAgV3QgKz0gV1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoQ1dJRFRIW2ldLm1hdGNoKC8lJC8pKSB7XG4gICAgICAgICAgICAgICAgICAgIFBbcF0gPSBpO1xuICAgICAgICAgICAgICAgICAgICBwKys7XG4gICAgICAgICAgICAgICAgICAgIFdwICs9IFdbaV07XG4gICAgICAgICAgICAgICAgICAgIFdQICs9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtpXSwgbXUsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1tpXSA9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtpXSwgbXUpO1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKFdQID4gLjk4KSB7XG4gICAgICAgICAgICAgICAgICAgIFdmID0gV3AgLyAoV3QgKyBXcCk7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gV3QgKyBXcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gV3QgLyAoMSAtIFdQKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBXVyA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBNYXRoLm1pbihKICsgMSwgQ1NQQUNFLmxlbmd0aCk7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgLT0gQ1NQQUNFW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBQLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIFdbUFtpXV0gPSBVdGlsLmxlbmd0aDJlbShDV0lEVEhbUFtpXV0sIG11LCBXVyAqIFdmKTtcbiAgICAgICAgICAgICAgICBXdCArPSBXW1BbaV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKFdXIC0gV3QpID4gLjAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGYgJiYgV1cgPiBXdCkge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IChXVyAtIFd0KSAvIGY7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBGLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgV1tGW2ldXSArPSBXVztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXVyAvIFd0O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgV1tqXSAqPSBXVztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZXF1YWxjb2x1bW5zKSB7XG4gICAgICAgICAgICAgICAgdmFyIFdtID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgVyk7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgV1tqXSA9IFdtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgeSA9IFksIGR5LCBhbGlnbjtcbiAgICAgICAgcyA9IChDW0xBQkVMXSA/IExBQkVMIDogMCk7XG4gICAgICAgIGZvciAoaiA9IHM7IGogPD0gSjsgaisrKSB7XG4gICAgICAgICAgICBDW2pdLncgPSBXW2pdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFbaV1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgcyA9ICh0aGlzLmRhdGFbaV0udHlwZSA9PT0gXCJtbGFiZWxlZHRyXCIgPyBMQUJFTCA6IDApO1xuICAgICAgICAgICAgICAgICAgICBjZWxsID0gdGhpcy5kYXRhW2ldLmRhdGFbaiAtIHNdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VsbC5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwuU1ZHc3RyZXRjaEgoV1tqXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY2VsbC5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vID0gY2VsbC5Db3JlTU8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzeW1tZXRyaWMgPSBtby5zeW1tZXRyaWM7XG4gICAgICAgICAgICAgICAgICAgICAgICBtby5zeW1tZXRyaWMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFbaV1bal0gPSBjZWxsLlNWR3N0cmV0Y2hWKEhbaV0sIERbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW8uc3ltbWV0cmljID0gc3ltbWV0cmljO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID0gY2VsbC5yb3dhbGlnbiB8fCB0aGlzLmRhdGFbaV0ucm93YWxpZ24gfHwgUkFMSUdOW2ldO1xuICAgICAgICAgICAgICAgICAgICBkeSA9ICh7IHRvcDogSFtpXSAtIEFbaV1bal0uaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogQVtpXVtqXS5kIC0gRFtpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNlbnRlcjogKChIW2ldIC0gRFtpXSkgLSAoQVtpXVtqXS5oIC0gQVtpXVtqXS5kKSkgLyAyLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZWxpbmU6IDAsIGF4aXM6IDAgfSlbYWxpZ25dIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID0gKGNlbGwuY29sdW1uYWxpZ24gfHwgUkNBTElHTltpXVtqXSB8fCBDQUxJR05bal0pO1xuICAgICAgICAgICAgICAgICAgICBDW2pdLkFsaWduKEFbaV1bal0sIGFsaWduLCAwLCB5ICsgZHkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaSA8IEEubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICB5IC09IE1hdGgubWF4KDAsIERbaV0gKyBIW2kgKyAxXSArIFJTUEFDRVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeSA9IFk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGx3ID0gMS41ICogVXRpbC5lbTtcbiAgICAgICAgdmFyIHggPSBmeCAtIGx3IC8gMjtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQoQ1tqXSwgeCwgMCk7XG4gICAgICAgICAgICB4ICs9IFdbal0gKyBDU1BBQ0Vbal07XG4gICAgICAgICAgICBpZiAoQ0xJTkVTW2pdICE9PSBcIm5vbmVcIiAmJiBqIDwgSiAmJiBqICE9PSBMQUJFTCkge1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVkxJTkUoZkgsIGx3LCBDTElORVNbal0pLCB4IC0gQ1NQQUNFW2pdIC8gMiwgZlkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy53ICs9IGZ4O1xuICAgICAgICBzdmcuZCA9IC1mWTtcbiAgICAgICAgc3ZnLmggPSBmSCArIGZZO1xuICAgICAgICBmVyA9IHN2Zy53O1xuICAgICAgICBpZiAodmFsdWVzLmZyYW1lICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9ITElORShmVywgbHcsIHZhbHVlcy5mcmFtZSksIDAsIGZZICsgZkggLSBsdyk7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkpO1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIHZhbHVlcy5mcmFtZSksIDAsIGZZKTtcbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVkxJTkUoZkgsIGx3LCB2YWx1ZXMuZnJhbWUpLCBmVyAtIGx3LCBmWSk7XG4gICAgICAgIH1cbiAgICAgICAgeSA9IFkgLSBsdyAvIDI7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aCAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGR5ID0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgIGlmIChSTElORVNbaV0gIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9ITElORShmVywgbHcsIFJMSU5FU1tpXSksIDAsIHkgLSBEW2ldIC0gKGR5IC0gRFtpXSAtIEhbaSArIDFdKSAvIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeSAtPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGlmIChDW0xBQkVMXSkge1xuICAgICAgICAgICAgc3ZnLnR3ID0gTWF0aC5tYXgoc3ZnLncsIHN2Zy5yKSAtIE1hdGgubWluKDAsIHN2Zy5sKTtcbiAgICAgICAgICAgIHZhciBpbmRlbnQgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50YWxpZ25maXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRhbGlnbiA9IGluZGVudC5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudGFsaWduID0gdGhpcy5kaXNwbGF5QWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5kZW50LmluZGVudHNoaWZ0Zmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UU0hJRlQuSU5ERU5UU0hJRlQpIHtcbiAgICAgICAgICAgICAgICBpbmRlbnQuaW5kZW50c2hpZnQgPSBpbmRlbnQuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50c2hpZnQgPT09IFwiYXV0b1wiIHx8IGluZGVudC5pbmRlbnRzaGlmdCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRzaGlmdCA9IFwiMFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNoaWZ0ID0gVXRpbC5sZW5ndGgyZW0oaW5kZW50LmluZGVudHNoaWZ0LCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgdmFyIGxhYmVsc2hpZnQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWlubGFiZWxzcGFjaW5nLCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZEluZGVudCA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuZGlzcGxheUluZGVudCwgbXUsIFV0aWwuY3dpZHRoKTtcbiAgICAgICAgICAgICAgICBzaGlmdCArPSAoaW5kZW50LmluZGVudEFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLlJJR0hUID8gLWRJbmRlbnQgOiBkSW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBlcW4gPSBzdmc7XG4gICAgICAgICAgICBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmN3aWR0aDtcbiAgICAgICAgICAgIHN2Zy5oYXNJbmRlbnQgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFsaWduKENbTEFCRUxdLCBDQUxJR05bTEFCRUxdLCBsYWJlbHNoaWZ0LCAwKTtcbiAgICAgICAgICAgIHN2Zy5BbGlnbihlcW4sIGluZGVudC5pbmRlbnRhbGlnbiwgMCwgMCwgc2hpZnQpO1xuICAgICAgICAgICAgc3ZnLnR3ICs9IENbTEFCRUxdLncgKyBzaGlmdCArXG4gICAgICAgICAgICAgICAgKGluZGVudC5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5DRU5URVIgPyA4IDogNCkgKiBsYWJlbHNoaWZ0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ZyYW1lICYmICFzdmcud2lkdGgpIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLlggPSAxNjc7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZS5jYWxsKHRoaXMsIHN2Zyk7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIHZhciBtdHIgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbMF07XG4gICAgICAgICAgICByZXR1cm4gbXRkLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVt0aGlzLmRhdGEubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbbXRyLmRhdGEubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gbXRkLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJUT0RPOiB1bmltcGxlbWVudGVkIGRpcmVjdGlvbiBmb3IgbW92ZUN1cnNvckZyb21QYXJlbnQgaW4gbXRhYmxlX21peGluLnRzXCIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlQ3Vyc29yRnJvbUNoaWxkIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHksIGNsaWVudFgsIGNsaWVudFkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtdHIgPSB0aGlzLmRhdGFbaV07XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG10ci5kYXRhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG10ZCA9IG10ci5kYXRhW2pdO1xuICAgICAgICAgICAgICAgIHZhciBub2RlID0gbXRkLmRhdGFbMF07XG4gICAgICAgICAgICAgICAgaWYgKFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgY2xpZW50WCwgY2xpZW50WSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJEaWRuJ3QgbWFuYWdlIHRvIG1vdmUgY3Vyc29yXCIpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlQ3Vyc29yIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJkcmF3Q3Vyc29yIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2RyYXdDdXJzb3JIaWdobGlnaHQgY2FsbGVkIScpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLmFkZFJvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIHZhciBudW1Db2xzID0gdGhpcy5kYXRhWzBdLmRhdGEubGVuZ3RoO1xuICAgICAgICB2YXIgbmV3Um93ID0gbmV3IE1NTC5tdHIoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Db2xzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtdGQgPSBuZXcgTU1MLm10ZCgpO1xuICAgICAgICAgICAgbXRkLlNldERhdGEoMCwgbmV3IE1NTC5ob2xlKCkpO1xuICAgICAgICAgICAgbmV3Um93LlNldERhdGEoaSwgbXRkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNldERhdGEodGhpcy5kYXRhLmxlbmd0aCwgbmV3Um93KTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5hZGRDb2x1bW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICB0aGlzLmRhdGFbaV0uU2V0RGF0YSh0aGlzLmRhdGFbaV0uZGF0YS5sZW5ndGgsIG10ZCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGFibGVNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1UYWJsZVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlUm93TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVSb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVSb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtdHIgbW92ZUN1cnNvckZyb21DaGlsZCBjYWxsZWQhXCIpO1xuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZVJvd01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlQ2VsbE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlQ2VsbE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1UYWJsZUNlbGxNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNVGFibGVDZWxsTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHZhciByb3cgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgdmFyIG10YWJsZSA9IHRoaXMucGFyZW50LnBhcmVudDtcbiAgICAgICAgdmFyIGNvbEluZGV4ID0gcm93LmRhdGEuaW5kZXhPZih0aGlzKTtcbiAgICAgICAgdmFyIHJvd0luZGV4ID0gbXRhYmxlLmRhdGEuaW5kZXhPZihyb3cpO1xuICAgICAgICB2YXIgdyA9IHJvdy5kYXRhLmxlbmd0aDtcbiAgICAgICAgdmFyIGggPSBtdGFibGUuZGF0YS5sZW5ndGg7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBpZiAoY29sSW5kZXggPT0gdyAtIDEpIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSByb3cuZGF0YVtjb2xJbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGlmIChjb2xJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbXRhYmxlLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCBtdGFibGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gcm93LmRhdGFbY29sSW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICBuZWlnaGJvck10ZC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICBpZiAocm93SW5kZXggPT0gaCAtIDEpIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JSb3cgPSBtdGFibGUuZGF0YVtyb3dJbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvck10ZCA9IG5laWdoYm9yUm93LmRhdGFbY29sSW5kZXhdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICBpZiAocm93SW5kZXggPT0gMCkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvclJvdyA9IG10YWJsZS5kYXRhW3Jvd0luZGV4IC0gMV07XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gbmVpZ2hib3JSb3cuZGF0YVtjb2xJbmRleF07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNVGFibGVDZWxsTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlQ2VsbE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRleHRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UZXh0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRleHRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UZXh0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm10ZXh0Rm9udEluaGVyaXQgfHwgdGhpcy5QYXJlbnQoKS50eXBlID09PSBcIm1lcnJvclwiKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICAgICAgdmFyIGRlZiA9IHsgZGlyZWN0aW9uOiB0aGlzLkdldChcImRpclwiKSB9O1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuYm9sZCkge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtd2VpZ2h0XCJdID0gXCJib2xkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5pdGFsaWMpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJmb250LXN0eWxlXCJdID0gXCJpdGFsaWNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQgPSB0aGlzLkdldChcIm1hdGh2YXJpYW50XCIpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQgPT09IFwibW9ub3NwYWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLW1vbm9zcGFjZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodmFyaWFudC5tYXRjaCgvc2Fucy1zZXJpZi8pKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiY2xhc3NcIl0gPSBcIk1KWC1zYW5zLXNlcmlmXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1RFWFQoc2NhbGUgKiAxMDAgLyBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuc2NhbGUsIHRoaXMuZGF0YS5qb2luKFwiXCIpLCBkZWYpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLnRvU1ZHLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGV4dE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVVuZGVyT3Zlck1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVVuZGVyT3Zlck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1VbmRlck92ZXJNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuZW5kaW5nUG9zID0gMDtcbiAgICAgICAgdGhpcy5yaWdodE1vdmVTdGF5ID0gdHJ1ZTtcbiAgICB9XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJhY2NlbnRcIiwgXCJhY2NlbnR1bmRlclwiLCBcImFsaWduXCIpO1xuICAgICAgICBpZiAoIXZhbHVlcy5kaXNwbGF5c3R5bGUgJiYgdGhpcy5kYXRhW3RoaXMuYmFzZV0gIT0gbnVsbCAmJlxuICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuYmFzZV0uQ29yZU1PKCkuR2V0KFwibW92YWJsZWxpbWl0c1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cC5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBib3hlcyA9IFtdLCBzdHJldGNoID0gW10sIGJveCwgaSwgbSwgVyA9IC1VdGlsLkJJR0RJTUVOLCBXVyA9IFc7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZChpLCBIVywgRCk7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hbaV0gPSAoRCAhPSBudWxsIHx8IEhXID09IG51bGwpICYmIHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm94ZXNbaV0uWDtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyZXRjaFtpXSAmJiBXVyA+IFcpIHtcbiAgICAgICAgICAgICAgICAgICAgVyA9IFdXO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoRCA9PSBudWxsICYmIEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIFcgPSBIVztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXID09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICBXID0gV1c7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gV1cgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJldGNoW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKFcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChib3hlc1tpXS53ID4gV1cpIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBib3hlc1tpXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogdGhpcy5tc2NhbGU7XG4gICAgICAgIHZhciBiYXNlID0gYm94ZXNbdGhpcy5iYXNlXSB8fCB7XG4gICAgICAgICAgICB3OiAwLFxuICAgICAgICAgICAgaDogMCxcbiAgICAgICAgICAgIGQ6IDAsXG4gICAgICAgICAgICBIOiAwLFxuICAgICAgICAgICAgRDogMCxcbiAgICAgICAgICAgIGw6IDAsXG4gICAgICAgICAgICByOiAwLFxuICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgIHNjYWxlOiBzY2FsZVxuICAgICAgICB9O1xuICAgICAgICB2YXIgeCwgeSwgejEsIHoyLCB6MywgZHcsIGssIGRlbHRhID0gMDtcbiAgICAgICAgaWYgKGJhc2UuaWMpIHtcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYm94ID0gYm94ZXNbaV07XG4gICAgICAgICAgICAgICAgejMgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzUgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICB2YXIgYWNjZW50ID0gKGkgIT0gdGhpcy5iYXNlICYmIHZhbHVlc1t0aGlzLkFDQ0VOVFNbaV1dKTtcbiAgICAgICAgICAgICAgICBpZiAoYWNjZW50ICYmIGJveC53IDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94LnggPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gKG5ldyBCQk9YX0coKSkuV2l0aCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkFkZChib3gpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS5DbGVhbigpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS53ID0gLWJveC5sO1xuICAgICAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZHcgPSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjogKFdXIC0gYm94LncpIC8gMixcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IFdXIC0gYm94LndcbiAgICAgICAgICAgICAgICB9W3ZhbHVlcy5hbGlnbl07XG4gICAgICAgICAgICAgICAgeCA9IGR3O1xuICAgICAgICAgICAgICAgIHkgPSAwO1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMub3Zlcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWNjZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gdCAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejMgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2Uuc2tldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gYmFzZS5za2V3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gYmFzZS5za2V3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4ICsgYm94LncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyArPSAoV1cgLSBib3gudyAtIHgpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzMgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBNYXRoLm1heCgwLCBib3guZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heChrLCAxNTAwIC8gVXRpbC5lbSk7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gZGVsdGEgLyAyO1xuICAgICAgICAgICAgICAgICAgICB5ID0gYmFzZS55ICsgYmFzZS5oICsgYm94LmQgKyBrO1xuICAgICAgICAgICAgICAgICAgICBib3guaCArPSB6MztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJveC5oID4gYm94LkgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveC5IID0gYm94Lmg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaSA9PSB0aGlzLnVuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSAzICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejMgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgejEgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzIgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoyID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmc0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gTWF0aC5tYXgoejEsIHoyIC0gYm94LmgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heChrLCAxNTAwIC8gVXRpbC5lbSk7XG4gICAgICAgICAgICAgICAgICAgIHggLT0gZGVsdGEgLyAyO1xuICAgICAgICAgICAgICAgICAgICB5ID0gYmFzZS55IC0gKGJhc2UuZCArIGJveC5oICsgayk7XG4gICAgICAgICAgICAgICAgICAgIGJveC5kICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmQgPiBib3guRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkQgPSBib3guZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKGJveCwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3QubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAxIDogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgdmFyIHNtYWxsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgPyB0aGlzLnN1YiA6IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIGJhc2VCQiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmFzZUJCIHx8ICFjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5kYXRhW3NtYWxsXSA/IHNtYWxsIDogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAmJiB0aGlzLmRhdGFbc21hbGxdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtzbWFsbF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtzbWFsbF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbc21hbGxdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHNtYWxsLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1YjtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1YkJCLnggKyAoc3ViQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1cEJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3VwQkIueCArIChzdXBCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGJhc2UuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1YixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJblZlcnRpY2FsbHkgPSB2ZXJ0aWNhbCAmJiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApID09PSAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViKTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbkhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgIHZhciBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0F3YXkgPSB2ZXJ0aWNhbCA/ICFtb3ZpbmdJblZlcnRpY2FsbHkgOiAhdGhpcy5yaWdodE1vdmVTdGF5ICYmIG1vdmVSaWdodEhvcml6b250YWxseTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbiA9IG1vdmluZ0luVmVydGljYWxseSB8fCBtb3ZpbmdJbkhvcml6b250YWxseSB8fCBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgJiYgdGhpcy5yaWdodE1vdmVTdGF5O1xuICAgICAgICAgICAgaWYgKG1vdmluZ0F3YXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtb3ZpbmdJbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1VbmRlck92ZXJNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIFNlbWFudGljc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoU2VtYW50aWNzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2VtYW50aWNzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNlbWFudGljc01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgVGVYQXRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoVGVYQXRvbU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFRlWEF0b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgYm94ID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpLCB5ID0gMDtcbiAgICAgICAgICAgIGlmICh0aGlzLnRleENsYXNzID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlRFWENMQVNTLlZDRU5URVIpIHtcbiAgICAgICAgICAgICAgICB5ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoYm94LmggKyBib3guZCkgLyAyICsgYm94LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKGJveCwgMCwgeSk7XG4gICAgICAgICAgICBzdmcuaWMgPSBib3guaWM7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGJveC5za2V3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RlWEF0b20gZHJhd0N1cnNvciBOT1QgSU1QTEVNRU5URUQnKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5jdXJzb3JhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gVGVYQXRvbU1peGluO1xufShNQmFzZU1peGluKSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
