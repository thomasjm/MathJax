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
    function Cursor() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.mode = Cursor.CursorMode.NORMAL;
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
            celem.setAttribute('fill', '#777777');
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
        var jax = MathJax.Hub.getAllJax('#' + svgelem.parentNode.id)[0];
        if (!skipScroll)
            this.scrollIntoView(svgelem);
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
        var id = $(that.EditableSVGelem).parent().attr("id");
        console.log("Registering listeners on ID: ", id);
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_left", function (args) {
            if (args[1] != id)
                return;
            MathJax.Hub.Startup.signal.Clear();
            var cursor = that.cursor;
            console.log("Got move into from left! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.RIGHT);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_right", function (args) {
            if (args[1] != id)
                return;
            MathJax.Hub.Startup.signal.Clear();
            var cursor = that.cursor;
            console.log("Got move into from right! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.LEFT);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_top", function (args) {
            if (args[1] != id)
                return;
            MathJax.Hub.Startup.signal.Clear();
            var cursor = that.cursor;
            console.log("Got move into from top! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.UP);
            $(that.EditableSVGelem).parent().focus();
        });
        MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_bottom", function (args) {
            if (args[1] != id)
                return;
            MathJax.Hub.Startup.signal.Clear();
            var cursor = that.cursor;
            console.log("Got move into from bottom! ID: ");
            that.data[0].moveCursorFromParent(cursor, Direction.DOWN);
            $(that.EditableSVGelem).parent().focus();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiamF4LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgRGlyZWN0aW9uO1xuKGZ1bmN0aW9uIChEaXJlY3Rpb24pIHtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiVVBcIl0gPSAwXSA9IFwiVVBcIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiUklHSFRcIl0gPSAxXSA9IFwiUklHSFRcIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiRE9XTlwiXSA9IDJdID0gXCJET1dOXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIkxFRlRcIl0gPSAzXSA9IFwiTEVGVFwiO1xufSkoRGlyZWN0aW9uIHx8IChEaXJlY3Rpb24gPSB7fSkpO1xudmFyIEN1cnNvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ3Vyc29yKCkge1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHRoaXMuaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMik7XG4gICAgICAgIHRoaXMud2lkdGggPSA1MDtcbiAgICB9XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZWZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMubm9kZSB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0gfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LnBhcmVudE5vZGUpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgICBwYXJlbnQuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmVUb0NsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG4gICAgICAgIHZhciBzdmcgPSB0YXJnZXQubm9kZU5hbWUgPT09ICdzdmcnID8gdGFyZ2V0IDogdGFyZ2V0Lm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKCFzdmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBjcCA9IFV0aWwuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKHN2ZywgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgIHZhciBqYXggPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5nZXRKYXhGcm9tTWF0aChzdmcucGFyZW50Tm9kZSk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gamF4LnJvb3Q7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZEl0ZW1zID0gY3VycmVudC5kYXRhLmZpbHRlcihmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0h1aD8gbWF0Y2hlZCBtb3JlIHRoYW4gb25lIGNoaWxkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IG1hdGNoZWRJdGVtc1swXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IG1hdGNoZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50Lm1vdmVDdXJzb3JGcm9tQ2xpY2sodGhpcywgY3AueCwgY3AueSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uIChub2RlLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgIW5vZGUuYmFja3NsYXNoUm93KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnVwZGF0ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uIChzaGlmdEtleSkge1xuICAgICAgICBpZiAoc2hpZnRLZXkgJiYgdGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUwpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBpZiAoc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFySGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24sIHNoaWZ0S2V5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uKHNoaWZ0S2V5KTtcbiAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ub2RlLmRyYXdDdXJzb3IodGhpcyk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICB2YXIgZGlyZWN0aW9uO1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrc3BhY2UoZXZlbnQsIHJlY2FsbCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoZGlyZWN0aW9uLCBldmVudC5zaGlmdEtleSk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm1vdmVUb0NsaWNrKGV2ZW50KTtcbiAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VIb2xlSWZOZWVkZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByb3dpbmRleCA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50LlNldERhdGEocm93aW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgaG9sZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5leGl0QmFja3NsYXNoTW9kZSA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdmFyIHBwb3MgPSB0aGlzLm5vZGUucGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuZGF0YS5zcGxpY2UocHBvcywgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMubm9kZS5wYXJlbnQuZGF0YTtcbiAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwbGFjZS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICBhcnIucHVzaChudWxsKTtcbiAgICAgICAgICAgIGRhdGEuc3BsaWNlLmFwcGx5KGRhdGEsIFtwcG9zLCAxXS5jb25jYXQoYXJyKSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LlNldERhdGEocHBvcyArIGksIHJlcGxhY2VbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUby5hcHBseSh0aGlzLCByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUucGFyZW50LCBwcG9zICsgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuYmFja3NwYWNlID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZS50eXBlID09PSAnbXJvdycgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUgPT09IHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUuZGF0YS5zcGxpY2UocG9zMSwgcG9zMiAtIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHRoaXMubm9kZSwgcG9zMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkbyB0aGlzIGJhY2tzcGFjZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICBpZiAoIXByZXYuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgdGhpcy5ub2RlLmRhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24gLSAxLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSAxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvbiAtIDFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdob2xlJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JhY2tzcGFjZSBvbiBob2xlIScpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNbyA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtbyA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbW8uQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtbztcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZUVudGl0eU1pID0gZnVuY3Rpb24gKHVuaWNvZGUpIHtcbiAgICAgICAgdmFyIG1pID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkoKTtcbiAgICAgICAgdmFyIGVudGl0eSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgpO1xuICAgICAgICBlbnRpdHkuQXBwZW5kKHVuaWNvZGUpO1xuICAgICAgICBtaS5BcHBlbmQoZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIG1pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jcmVhdGVBbmRNb3ZlSW50b0hvbGUgPSBmdW5jdGlvbiAobXN1YnN1cCwgaW5kZXgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NSRUFUSU5HIEhPTEUnKTtcbiAgICAgICAgdmFyIGhvbGUgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgIG1zdWJzdXAuU2V0RGF0YShpbmRleCwgaG9sZSk7XG4gICAgICAgIHRoaXMubW92ZVRvKGhvbGUsIDApO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oYW5kbGVTdXBlck9yU3Vic2NyaXB0ID0gZnVuY3Rpb24gKHJlY2FsbCwgYykge1xuICAgICAgICBpZiAodGhpcy5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICB2YXIgaW5kZXggPSAoYyA9PT0gXCJfXCIpID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3ViIDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCkuc3VwO1xuICAgICAgICBpZiAocHJldi50eXBlID09PSBcIm1zdWJzdXBcIiB8fCBwcmV2LnR5cGUgPT09IFwibXVuZGVyb3ZlclwiKSB7XG4gICAgICAgICAgICBpZiAocHJldi5kYXRhW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIHZhciB0aGluZyA9IHByZXYuZGF0YVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaW5nLm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMsIERpcmVjdGlvbi5MRUZUKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHByZXYsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAxLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShwcmV2LCBpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbXN1YnN1cCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpO1xuICAgICAgICAgICAgbXN1YnN1cC5TZXREYXRhKG1zdWJzdXAuYmFzZSwgcHJldik7XG4gICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uIC0gMSwgbXN1YnN1cCk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZShtc3Vic3VwLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAocmVjYWxsLCBjKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgdmFyIGxhdGV4ID0gXCJcIjtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdGhpcy5ub2RlLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbWkgPSB0aGlzLm5vZGUuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAobWkudHlwZSAhPT0gJ21pJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIG5vbi1pZGVudGlmaWVyIGluIGJhY2tzbGFzaCBleHByZXNzaW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjaGFycyA9IG1pLmRhdGFbMF07XG4gICAgICAgICAgICAgICAgbGF0ZXggKz0gY2hhcnMuZGF0YVswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UobGF0ZXgpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLmNsYXNzTGlzdC5hZGQoJ2ludmFsaWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCByZXN1bHQ6IFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgdmFyIG1yb3cgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKHJlc3VsdCk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBjb2RlID0gZXZlbnQuY2hhckNvZGUgfHwgZXZlbnQua2V5Q29kZSB8fCBldmVudC53aGljaDtcbiAgICAgICAgdmFyIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgICB2YXIgdG9JbnNlcnQ7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LnJlbW92ZSgnaW52YWxpZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC5jdHJsS2V5ICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcIm10YWJsZVwiICYmIGNvZGUgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hZGRDb2x1bW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7IHRoaXMucmVmb2N1cygpOyB9XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFwibXRhYmxlXCIgJiYgY29kZSA9PSAxMCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmFkZFJvdygpO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHsgdGhpcy5yZWZvY3VzKCk7IH1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ2hvbGUnKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5ub2RlLnBhcmVudDtcbiAgICAgICAgICAgIHZhciBob2xlSW5kZXggPSBwYXJlbnQuZGF0YS5pbmRleE9mKHRoaXMubm9kZSk7XG4gICAgICAgICAgICB2YXIgcm93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KCk7XG4gICAgICAgICAgICBwYXJlbnQuU2V0RGF0YShob2xlSW5kZXgsIHJvdyk7XG4gICAgICAgICAgICByb3cubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcywgRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSAhPT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyYXlSb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gwMDVDJykpKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JheVJvdy5iYWNrc2xhc2hSb3cgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiwgMCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24sIGdyYXlSb3cpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ2xhc3MgPSBncmF5Um93LmNsYXNzID8gZ3JheVJvdy5jbGFzcyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNsYXNzID0gb2xkQ2xhc3MgKyBcImJhY2tzbGFzaC1tb2RlXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKGdyYXlSb3csIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVE9ETzogaW5zZXJ0IGEgXFxcXCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiXlwiIHx8IGMgPT09IFwiX1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VwZXJPclN1YnNjcmlwdChyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIgXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTcGFjZShyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLmxldHRlci50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5taShuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5udW1iZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW4obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gnICsgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09ICcrJyB8fCBjID09PSAnLycgfHwgYyA9PT0gJz0nIHx8IGMgPT09ICcuJyB8fCBjID09PSAnKCcgfHwgYyA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b0luc2VydClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCB0b0luc2VydCk7XG4gICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgfV0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ib3hlcykge1xuICAgICAgICAgICAgdGhpcy5ib3hlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm94ZXMgPSBbXTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlnaGxpZ2h0Qm94ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBjdXIgPSB0aGlzLm5vZGU7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gY3VyLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlcyA9IHRoaXMuYm94ZXMuY29uY2F0KFV0aWwuaGlnaGxpZ2h0Qm94KHN2ZywgYmIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0F0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIGhlaWdodCwgc2tpcFNjcm9sbCkge1xuICAgICAgICB0aGlzLnJlbmRlcmVkUG9zaXRpb24gPSB7IHg6IHgsIHk6IHksIGhlaWdodDogaGVpZ2h0IH07XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICcjNzc3Nzc3Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yJyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItJyArIHRoaXMuaWQ7XG4gICAgICAgICAgICBzdmdlbGVtLmFwcGVuZENoaWxkKGNlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRjbGFzcyA9IGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBvbGRjbGFzcy5zcGxpdCgnYmxpbmsnKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdGhpcy53aWR0aC50b1N0cmluZygpKTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5zdGFydEJsaW5rKTtcbiAgICAgICAgdGhpcy5zdGFydEJsaW5rID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgY2VsZW0uZ2V0QXR0cmlidXRlKCdjbGFzcycpICsgJyBibGluaycpO1xuICAgICAgICB9LmJpbmQodGhpcyksIDUwMCk7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0Qm94ZXMoc3ZnZWxlbSk7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUudHlwZSA9PT0gJ21yb3cnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQubm9kZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0KHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBNYXRoSmF4Lkh1Yi5nZXRBbGxKYXgoJyMnICsgc3ZnZWxlbS5wYXJlbnROb2RlLmlkKVswXTtcbiAgICAgICAgaWYgKCFza2lwU2Nyb2xsKVxuICAgICAgICAgICAgdGhpcy5zY3JvbGxJbnRvVmlldyhzdmdlbGVtKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY2xlYXJIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgdGhpcy5oaWRlSGlnaGxpZ2h0KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhpZGVIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEhpZ2hsaWdodCgpO1xuICAgICAgICBpZiAoY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXdIaWdobGlnaHRBdCA9IGZ1bmN0aW9uIChzdmdlbGVtLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEhpZ2hsaWdodCgpO1xuICAgICAgICBpZiAoIWNlbGVtKSB7XG4gICAgICAgICAgICBjZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAncmVjdCcpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdmaWxsJywgJ3JnYmEoMTczLCAyMTYsIDI1MCwgMC41KScpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdtYXRoLWN1cnNvci1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIGNlbGVtLmlkID0gJ2N1cnNvci1oaWdobGlnaHQtJyArIHRoaXMuaWQ7XG4gICAgICAgICAgICBzdmdlbGVtLmFwcGVuZENoaWxkKGNlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3gnLCB4KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd5JywgeSk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbiAoc3ZnZWxlbSkge1xuICAgICAgICBpZiAoIXRoaXMucmVuZGVyZWRQb3NpdGlvbilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIHggPSB0aGlzLnJlbmRlcmVkUG9zaXRpb24ueDtcbiAgICAgICAgdmFyIHkgPSB0aGlzLnJlbmRlcmVkUG9zaXRpb24ueTtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi5oZWlnaHQ7XG4gICAgICAgIHZhciBjbGllbnRQb2ludCA9IFV0aWwuZWxlbUNvb3Jkc1RvU2NyZWVuQ29vcmRzKHN2Z2VsZW0sIHgsIHkgKyBoZWlnaHQgLyAyKTtcbiAgICAgICAgdmFyIGNsaWVudFdpZHRoID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcbiAgICAgICAgdmFyIGNsaWVudEhlaWdodCA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0O1xuICAgICAgICB2YXIgc3ggPSAwLCBzeSA9IDA7XG4gICAgICAgIGlmIChjbGllbnRQb2ludC54IDwgMCB8fCBjbGllbnRQb2ludC54ID4gY2xpZW50V2lkdGgpIHtcbiAgICAgICAgICAgIHN4ID0gY2xpZW50UG9pbnQueCAtIGNsaWVudFdpZHRoIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2xpZW50UG9pbnQueSA8IDAgfHwgY2xpZW50UG9pbnQueSA+IGNsaWVudEhlaWdodCkge1xuICAgICAgICAgICAgc3kgPSBjbGllbnRQb2ludC55IC0gY2xpZW50SGVpZ2h0IC8gMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ggfHwgc3kpIHtcbiAgICAgICAgICAgIHdpbmRvdy5zY3JvbGxCeShzeCwgc3kpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKGN1cnNvcilcbiAgICAgICAgICAgIGN1cnNvci5yZW1vdmUoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuYmx1ciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNsZWFyQm94ZXMoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5mb2N1c0ZpcnN0SG9sZSA9IGZ1bmN0aW9uIChyb290KSB7XG4gICAgICAgIGlmICghcm9vdClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gXCJob2xlXCIpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZSA9IHJvb3Q7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gMDtcbiAgICAgICAgICAgIHRoaXMuZHJhdygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvY3VzRmlyc3RIb2xlKHJvb3QuZGF0YVtpXSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgQ3Vyc29yLkN1cnNvck1vZGUgPSB7XG4gICAgICAgIEJBQ0tTTEFTSDogXCJiYWNrc2xhc2hcIixcbiAgICAgICAgTk9STUFMOiBcIm5vcm1hbFwiLFxuICAgICAgICBTRUxFQ1RJT046IFwic2VsZWN0aW9uXCJcbiAgICB9O1xuICAgIHJldHVybiBDdXJzb3I7XG59KCkpO1xudmFyIEVkaXRhYmxlU1ZHQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFZGl0YWJsZVNWR0NvbmZpZygpIHtcbiAgICB9XG4gICAgRWRpdGFibGVTVkdDb25maWcuc3R5bGVzID0ge1xuICAgICAgICBcIi5NYXRoSmF4X1NWR1wiOiB7XG4gICAgICAgICAgICBcImRpc3BsYXlcIjogXCJpbmxpbmVcIixcbiAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJmb250LXdlaWdodFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJsaW5lLWhlaWdodFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJmb250LXNpemVcIjogXCIxMDAlXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZS1hZGp1c3RcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcInRleHQtaW5kZW50XCI6IDAsXG4gICAgICAgICAgICBcInRleHQtYWxpZ25cIjogXCJsZWZ0XCIsXG4gICAgICAgICAgICBcInRleHQtdHJhbnNmb3JtXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJsZXR0ZXItc3BhY2luZ1wiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3b3JkLXNwYWNpbmdcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid29yZC13cmFwXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndoaXRlLXNwYWNlXCI6IFwibm93cmFwXCIsXG4gICAgICAgICAgICBcImZsb2F0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJkaXJlY3Rpb25cIjogXCJsdHJcIixcbiAgICAgICAgICAgIFwibWF4LXdpZHRoXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgIG1hcmdpbjogMFxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19EaXNwbGF5XCI6IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcInJlbGF0aXZlXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgXCJ0ZXh0LWluZGVudFwiOiAwLFxuICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICB3aWR0aDogXCIxMDAlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkcgKlwiOiB7XG4gICAgICAgICAgICB0cmFuc2l0aW9uOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLXdlYmtpdC10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItbW96LXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1tcy10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItby10cmFuc2l0aW9uXCI6IFwibm9uZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLm1qeC1zdmctaHJlZlwiOiB7XG4gICAgICAgICAgICBmaWxsOiBcImJsdWVcIixcbiAgICAgICAgICAgIHN0cm9rZTogXCJibHVlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiOiB7XG4gICAgICAgICAgICB2aXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjoge1xuICAgICAgICAgICAgZGlzcGxheTogXCJub25lIWltcG9ydGFudFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX0V4Qm94XCI6IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIHdpZHRoOiBcIjFweFwiLFxuICAgICAgICAgICAgaGVpZ2h0OiBcIjYwZXhcIixcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgIG1hcmdpbjogMFxuICAgICAgICB9LFxuICAgICAgICBcIi5iYWNrc2xhc2gtbW9kZSB1c2VcIjoge1xuICAgICAgICAgICAgZmlsbDogXCJncmF5XCIsXG4gICAgICAgICAgICBzdHJva2U6IFwiZ3JheVwiXG4gICAgICAgIH0sXG4gICAgICAgICcuYmFja3NsYXNoLW1vZGUuaW52YWxpZCB1c2UnOiB7XG4gICAgICAgICAgICBmaWxsOiAnI2ZmMDAwMCcsXG4gICAgICAgICAgICBzdHJva2U6ICcjZmYwMDAwJyxcbiAgICAgICAgfSxcbiAgICAgICAgJy5tYXRoLWN1cnNvci5ibGluayc6IHtcbiAgICAgICAgICAgICdhbmltYXRpb24nOiAnYmxpbmsgMS4wNnMgc3RlcHMoMiwgc3RhcnQpIGluZmluaXRlJyxcbiAgICAgICAgICAgICctd2Via2l0LWFuaW1hdGlvbic6ICdibGluayAxLjA2cyBzdGVwcygyLCBzdGFydCkgaW5maW5pdGUnLFxuICAgICAgICB9LFxuICAgICAgICAnQGtleWZyYW1lcyBibGluayc6ICd0byB7dmlzaWJpbGl0eTogaGlkZGVufScsXG4gICAgICAgICdALXdlYmtpdC1rZXlmcmFtZXMgYmxpbmsnOiAndG8ge3Zpc2liaWxpdHk6IGhpZGRlbn0nLFxuICAgICAgICBcIiNNYXRoSmF4X1NWR19Ub29sdGlwXCI6IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgd2lkdGg6IFwiYXV0b1wiLFxuICAgICAgICAgICAgaGVpZ2h0OiBcImF1dG9cIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZVwiXG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBFZGl0YWJsZVNWR0NvbmZpZztcbn0oKSk7XG52YXIgRWRpdGFibGVTVkcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHKCkge1xuICAgICAgICB0aGlzLlRPVUNIID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmhpZGVQcm9jZXNzZWRNYXRoID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mb250TmFtZXMgPSBbXCJUZVhcIiwgXCJTVElYXCIsIFwiU1RJWC1XZWJcIiwgXCJBc2FuYS1NYXRoXCIsXG4gICAgICAgICAgICBcIkd5cmUtVGVybWVzXCIsIFwiR3lyZS1QYWdlbGxhXCIsIFwiTGF0aW4tTW9kZXJuXCIsIFwiTmVvLUV1bGVyXCJdO1xuICAgICAgICB0aGlzLlRleHROb2RlID0gTWF0aEpheC5IVE1MLlRleHROb2RlO1xuICAgICAgICB0aGlzLmFkZFRleHQgPSBNYXRoSmF4LkhUTUwuYWRkVGV4dDtcbiAgICAgICAgdGhpcy51Y01hdGNoID0gTWF0aEpheC5IVE1MLnVjTWF0Y2g7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwibW1sIEpheCBSZWFkeVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgTU1MID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbDtcbiAgICAgICAgICAgIE1NTC5ob2xlLkF1Z21lbnQoSG9sZS5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYmFzZS5BdWdtZW50KE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuY2hhcnMuQXVnbWVudChDaGFyc01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLmVudGl0eS5BdWdtZW50KEVudGl0eU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1vLkF1Z21lbnQoTW9NaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdGV4dC5BdWdtZW50KE1UZXh0TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVycm9yLkF1Z21lbnQoTUVycm9yTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXMuQXVnbWVudChNc01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1nbHlwaC5BdWdtZW50KE1HbHlwaE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcGFjZS5BdWdtZW50KE1TcGFjZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1waGFudG9tLkF1Z21lbnQoTVBoYW50b21NaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcGFkZGVkLkF1Z21lbnQoTVBhZGRlZE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb3cuQXVnbWVudChNUm93TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXN0eWxlLkF1Z21lbnQoTVN0eWxlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWZyYWMuQXVnbWVudChNRnJhY01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcXJ0LkF1Z21lbnQoTVNxcnRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcm9vdC5BdWdtZW50KE1Sb290TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWZlbmNlZC5BdWdtZW50KE1GZW5jZWRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZW5jbG9zZS5BdWdtZW50KE1FbmNsb3NlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWFjdGlvbi5BdWdtZW50KE1BY3Rpb25NaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5zZW1hbnRpY3MuQXVnbWVudChTZW1hbnRpY3NNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdW5kZXJvdmVyLkF1Z21lbnQoTVVuZGVyT3Zlck1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zdWJzdXAuQXVnbWVudChNU3ViU3VwTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubW11bHRpc2NyaXB0cy5BdWdtZW50KE1NdWx0aVNjcmlwdHNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYXRoLkF1Z21lbnQoTWF0aE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLlRlWEF0b20uQXVnbWVudChUZVhBdG9tTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRhYmxlLkF1Z21lbnQoTVRhYmxlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRyLkF1Z21lbnQoTVRhYmxlUm93TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRkLkF1Z21lbnQoTVRhYmxlQ2VsbE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MW1wiYW5ub3RhdGlvbi14bWxcIl0uQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgdG9TVkc6IE1NTC5tYmFzZS5TVkdhdXRvbG9hZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIm9uTG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJ5aW5nIGVkaXRhYmxlc3ZnOiAnLCBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KE1hdGhKYXguQ2FsbGJhY2soW1wibG9hZENvbXBsZXRlXCIsIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLCBcImpheC5qc1wiXSksIDApO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuQnJvd3Nlci5TZWxlY3Qoe1xuICAgICAgICAgICAgT3BlcmE6IGZ1bmN0aW9uIChicm93c2VyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWRy5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgb3BlcmFab29tUmVmcmVzaDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJFbmQgQ29va2llXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLnpvb20gIT09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5BamF4LlJlcXVpcmUoXCJbTWF0aEpheF0vZXh0ZW5zaW9ucy9NYXRoWm9vbS5qc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jdW1lbnQ7XG4gICAgICAgICAgICBpZiAoIWRvYy5uYW1lc3BhY2VzLnN2Zykge1xuICAgICAgICAgICAgICAgIGRvYy5uYW1lc3BhY2VzLmFkZChcInN2Z1wiLCBVdGlsLlNWR05TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnQVVUT0xPQUQgRElSICcsIHRoaXMuYXV0b2xvYWREaXIpO1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSBNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLCBjb25maWcgPSB0aGlzLmNvbmZpZywgZm9udCA9IHNldHRpbmdzLmZvbnQ7XG4gICAgICAgIGlmIChzZXR0aW5ncy5zY2FsZSkge1xuICAgICAgICAgICAgY29uZmlnLnNjYWxlID0gc2V0dGluZ3Muc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCAhPT0gXCJBdXRvXCIpIHtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhMb2NhbHxXZWJ8SW1hZ2UpJC9pLCBcIlwiKTtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pLywgXCIkMS0kMlwiKTtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gZm9udDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gY29uZmlnLmZvbnQgfHwgXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb250TmFtZXMuaW5kZXhPZih0aGlzLmZvbnRJblVzZSkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250RGlyICs9IFwiL1wiICsgdGhpcy5mb250SW5Vc2U7XG4gICAgICAgIGlmICghdGhpcy5yZXF1aXJlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaCh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS5qc1wiKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2goTWF0aEpheC5PdXRwdXRKYXguZXh0ZW5zaW9uRGlyICsgXCIvTWF0aEV2ZW50cy5qc1wiKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgRVZFTlQgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50O1xuICAgICAgICB0aGlzLlRPVUNIID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ub3VjaDtcbiAgICAgICAgdmFyIEhPVkVSID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ib3ZlcjtcbiAgICAgICAgdGhpcy5Db250ZXh0TWVudSA9IEVWRU5ULkNvbnRleHRNZW51O1xuICAgICAgICB0aGlzLk1vdXNlb3ZlciA9IEhPVkVSLk1vdXNlb3ZlcjtcbiAgICAgICAgdGhpcy5Nb3VzZW91dCA9IEhPVkVSLk1vdXNlb3V0O1xuICAgICAgICB0aGlzLk1vdXNlbW92ZSA9IEhPVkVSLk1vdXNlbW92ZTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgICAgICAgICB0ZXh0SW5kZW50OiAwLFxuICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm06IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgbGV0dGVyU3BhY2luZzogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICB3b3JkU3BhY2luZzogXCJub3JtYWxcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5EaXYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUodGhpcy5oaWRkZW5EaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfSGlkZGVuXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogXCI1aW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgVXRpbC5weFBlckluY2ggPSBkaXYub2Zmc2V0V2lkdGggLyA1O1xuICAgICAgICB0aGlzLmhpZGRlbkRpdi5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB0aGlzLnRleHRTVkcgPSBVdGlsLkVsZW1lbnQoXCJzdmdcIiwgbnVsbCk7XG4gICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IFV0aWwuYWRkRWxlbWVudChVdGlsLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYucGFyZW50Tm9kZSwgXCJzdmdcIiksIFwiZGVmc1wiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19nbHlwaHNcIlxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5FeFNwYW4gPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXG4gICAgICAgICAgICBbXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0V4Qm94XCJcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFtcbiAgICAgICAgICAgIFtcImhyXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHRoaXMuY29uZmlnLnN0eWxlcztcbiAgICAgICAgZm9yICh2YXIgcyBpbiBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMpIHtcbiAgICAgICAgICAgIHN0eWxlc1tzXSA9IEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlc1tzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5BamF4LlN0eWxlcyhzdHlsZXMsIFtcIkluaXRpYWxpemVTVkdcIiwgdGhpc10pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkluaXRpYWxpemVTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIHRoaXMuZGVmYXVsdEV4ID0gdGhpcy5FeFNwYW4uZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5kZWZhdWx0V2lkdGggPSB0aGlzLmxpbmVicmVha1NwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgbSA9IHNjcmlwdHMubGVuZ3RoO1xuICAgICAgICB2YXIgc2NyaXB0O1xuICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgdmFyIHNwYW47XG4gICAgICAgIHZhciBkaXY7XG4gICAgICAgIHZhciB0ZXN0O1xuICAgICAgICB2YXIgamF4O1xuICAgICAgICB2YXIgZXg7XG4gICAgICAgIHZhciBlbTtcbiAgICAgICAgdmFyIG1heHdpZHRoO1xuICAgICAgICB2YXIgcmVsd2lkdGggPSBmYWxzZTtcbiAgICAgICAgdmFyIGN3aWR0aDtcbiAgICAgICAgdmFyIGxpbmVicmVhayA9IHRoaXMuY29uZmlnLmxpbmVicmVha3MuYXV0b21hdGljO1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLndpZHRoO1xuICAgICAgICBpZiAobGluZWJyZWFrKSB7XG4gICAgICAgICAgICByZWx3aWR0aCA9ICh3aWR0aC5tYXRjaCgvXlxccyooXFxkKyhcXC5cXGQqKT8lXFxzKik/Y29udGFpbmVyXFxzKiQvKSAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgvXFxzKmNvbnRhaW5lclxccyovLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2lkdGggPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWF4d2lkdGggPSAxMDAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwcmV2ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIFN0cmluZyhwcmV2LmNsYXNzTmFtZSkubWF0Y2goL15NYXRoSmF4KF9TVkcpPyhfRGlzcGxheSk/KCBNYXRoSmF4KF9TVkcpP19Qcm9jZXNzaW5nKT8kLykpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBqYXguRWRpdGFibGVTVkcgPSB7XG4gICAgICAgICAgICAgICAgZGlzcGxheTogKGpheC5yb290LkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzcGFuID0gZGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiB0aGlzLmNvbmZpZy5zY2FsZSArIFwiJVwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImlubGluZS1ibG9ja1wiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdcIixcbiAgICAgICAgICAgICAgICBpZDogamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiLFxuICAgICAgICAgICAgICAgIGlzTWF0aEpheDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBqYXhJRDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBvbmNvbnRleHRtZW51OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1lbnUsXG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd246IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2Vkb3duLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdmVyOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3ZlcixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3V0LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vtb3ZlOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlbW92ZSxcbiAgICAgICAgICAgICAgICBvbmNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkNsaWNrLFxuICAgICAgICAgICAgICAgIG9uZGJsY2xpY2s6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuRGJsQ2xpY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLkJyb3dzZXIubm9Db250ZXh0TWVudSkge1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaHN0YXJ0ID0gdGhpcy5UT1VDSC5zdGFydDtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hlbmQgPSB0aGlzLlRPVUNILmVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSksIHNjcmlwdCk7XG4gICAgICAgICAgICBkaXYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5saW5lYnJlYWtTcGFuLmNsb25lTm9kZSh0cnVlKSwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgZGl2ID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBleCA9IHRlc3QuZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgICAgIGN3aWR0aCA9IGRpdi5wcmV2aW91c1NpYmxpbmcuZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4ID09PSAwIHx8IGV4ID09PSBcIk5hTlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5EaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgICAgICAgICAgICBqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGV4ID0gdGhpcy5kZWZhdWx0RXg7XG4gICAgICAgICAgICAgICAgY3dpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFV0aWwuZXggPSBleDtcbiAgICAgICAgICAgIFV0aWwuZW0gPSBlbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5jd2lkdGggPSBjd2lkdGggLyBlbSAqIDEwMDA7XG4gICAgICAgICAgICBVdGlsLmxpbmVXaWR0aCA9IChsaW5lYnJlYWsgPyBVdGlsLmxlbmd0aDJlbSh3aWR0aCwgMSwgbWF4d2lkdGggLyBlbSAqIDEwMDApIDogVXRpbC5CSUdESU1FTik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0c1tpXS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBzcGFuID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHRzW2ldLk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKCFqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB0ZXN0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuU1ZHZXFuID0gc3RhdGUuU1ZHbGFzdCA9IDA7XG4gICAgICAgIHN0YXRlLlNWR2kgPSAtMTtcbiAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSB0aGlzLmNvbmZpZy5FcW5DaHVuaztcbiAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5UcmFuc2xhdGUgPSBmdW5jdGlvbiAoc2NyaXB0LCBzdGF0ZSkge1xuICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoc3RhdGUuU1ZHZGVsYXkpIHtcbiAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5DYWxsYmFjay5EZWxheSh0aGlzLmNvbmZpZy5FcW5DaHVua0RlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgIHZhciBtYXRoID0gamF4LnJvb3Q7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgdmFyIGRpdiA9IChqYXguRWRpdGFibGVTVkcuZGlzcGxheSA/IChzcGFuIHx8IHsgcGFyZW50Tm9kZTogdW5kZWZpbmVkIH0pLnBhcmVudE5vZGUgOiBzcGFuKTtcbiAgICAgICAgdmFyIGxvY2FsQ2FjaGUgPSAodGhpcy5jb25maWcudXNlRm9udENhY2hlICYmICF0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSk7XG4gICAgICAgIGlmICghZGl2KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBqYXguRWRpdGFibGVTVkcuZW07XG4gICAgICAgIHRoaXMuZXggPSBqYXguRWRpdGFibGVTVkcuZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIHRoaXMubWF0aERpdiA9IGRpdjtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEdseXBocygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5pdFNWRyhtYXRoLCBzcGFuKTtcbiAgICAgICAgbWF0aC5zZXRUZVhjbGFzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0aC50b1NWRyhzcGFuLCBkaXYpO1xuICAgICAgICAgICAgbWF0aC5pbnN0YWxsQ3Vyc29yTGlzdGVuZXJzKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5yZXN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHNwYW4uZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHNwYW4uZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvY2FsQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILm4tLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHRoaXMuQWRkSW5wdXRIYW5kbGVycyhtYXRoLCBzcGFuLCBkaXYpO1xuICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZGl2LCBzY3JpcHQpO1xuICAgICAgICB9XG4gICAgICAgIGRpdi5jbGFzc05hbWUgPSBkaXYuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgIGlmICh0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKSB7XG4gICAgICAgICAgICBkaXYuY2xhc3NOYW1lICs9IFwiIE1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiO1xuICAgICAgICAgICAgaWYgKHNjcmlwdC5NYXRoSmF4LnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICBqYXguRWRpdGFibGVTVkcucHJldmlldyA9IHNjcmlwdC5NYXRoSmF4LnByZXZpZXc7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNjcmlwdC5NYXRoSmF4LnByZXZpZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5TVkdlcW4gKz0gKHN0YXRlLmkgLSBzdGF0ZS5TVkdpKTtcbiAgICAgICAgICAgIHN0YXRlLlNWR2kgPSBzdGF0ZS5pO1xuICAgICAgICAgICAgaWYgKHN0YXRlLlNWR2VxbiA+PSBzdGF0ZS5TVkdsYXN0ICsgc3RhdGUuU1ZHY2h1bmspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvc3RUcmFuc2xhdGUoc3RhdGUsIHRydWUpO1xuICAgICAgICAgICAgICAgIHN0YXRlLlNWR2NodW5rID0gTWF0aC5mbG9vcihzdGF0ZS5TVkdjaHVuayAqIHRoaXMuY29uZmlnLkVxbkNodW5rRmFjdG9yKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wb3N0VHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlLCBwYXJ0aWFsKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdO1xuICAgICAgICBpZiAoIXRoaXMuaGlkZVByb2Nlc3NlZE1hdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGF0ZS5TVkdsYXN0LCBtID0gc3RhdGUuU1ZHZXFuOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmIChzY3JpcHQgJiYgc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheCkge1xuICAgICAgICAgICAgICAgIHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lID0gc2NyaXB0LnByZXZpb3VzU2libGluZy5jbGFzc05hbWUuc3BsaXQoLyAvKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnByZXZpZXcuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0Lk1hdGhKYXgucHJldmlldyA9IGRhdGEucHJldmlldztcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGEucHJldmlldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuU1ZHbGFzdCA9IHN0YXRlLlNWR2VxbjtcbiAgICAgICAgdmFyIGlkID0gc2NyaXB0LmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyByZXJlbmRlclwiLCBpZF0pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnJlc2V0R2x5cGhzID0gZnVuY3Rpb24gKHJlc2V0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSRVNFVFRJTkcgR0xZUEhTJyk7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VGb250Q2FjaGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWF0aEpheF9TVkdfZ2x5cGhzXCIpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gVXRpbC5FbGVtZW50KFwiZGVmc1wiLCBudWxsKTtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILm4rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEJCT1hfR0xZUEguZ2x5cGhzID0ge307XG4gICAgICAgICAgICBpZiAocmVzZXQpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILm4gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheCA9IGZ1bmN0aW9uIChyb290KSB7XG4gICAgICAgIGlmIChyb290LnR5cGUgPT09ICd0ZXhhdG9tJykge1xuICAgICAgICAgICAgaWYgKHJvb3QuZGF0YS5sZW5ndGggIT09IDEpXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ1VuZXhwZWN0ZWQgbGVuZ3RoIGluIHRleGF0b20nKTtcbiAgICAgICAgICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4KHJvb3QuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocm9vdC50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LmlzQ3Vyc29yYWJsZSgpIHx8IHJvb3QudHlwZSA9PT0gJ21hdGgnKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjdXIgPSByb290LmRhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFjdXIpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gY3VyLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVbMF0gIT09ICdtJyB8fCB0eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgoY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV3JhcHBpbmcgYSB0aGluZyBpbiBhbiBtcm93XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm9vdDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5BZGRJbnB1dEhhbmRsZXJzID0gZnVuY3Rpb24gKG1hdGgsIHNwYW4sIGRpdikge1xuICAgICAgICBtYXRoLmN1cnNvciA9IG5ldyBDdXJzb3IoKTtcbiAgICAgICAgbWF0aC5yZXJlbmRlciA9IHJlcmVuZGVyO1xuICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuICAgICAgICB2YXIgYWRkVGV4VG9ET00gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGV4ID0gbWF0aC50b1RleCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJUZXg6IFwiLCB0ZXgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtYXRoOiBcIiwgbWF0aCk7XG4gICAgICAgICAgICBtYXRoLkVkaXRhYmxlU1ZHZWxlbS5zZXRBdHRyaWJ1dGUoXCJ0ZXhcIiwgdGV4KTtcbiAgICAgICAgfTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJFbmRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYWRkVGV4VG9ET00oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIHJlcmVuZGVyKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4KG1hdGgpLnRvU1ZHKHNwYW4sIGRpdiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgbWF0aC5jdXJzb3IucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgIGFkZFRleFRvRE9NKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5yZXN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2suQWZ0ZXIoW3JlcmVuZGVyLCBjYWxsYmFja10sIGVyci5yZXN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNYXRoSmF4LkNhbGxiYWNrKGNhbGxiYWNrKSgpO1xuICAgICAgICAgICAgdmFyIGlkID0gc3Bhbi5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5Qb3N0KFtcIkVkaXRhYmxlU1ZHIHJlcmVuZGVyXCIsIGlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlcihlKSB7XG4gICAgICAgICAgICBpZiAobWF0aC5jdXJzb3IuY29uc3RydWN0b3IucHJvdG90eXBlW2UudHlwZV0pXG4gICAgICAgICAgICAgICAgbWF0aC5jdXJzb3IuY29uc3RydWN0b3IucHJvdG90eXBlW2UudHlwZV0uY2FsbChtYXRoLmN1cnNvciwgZSwgcmVyZW5kZXIpO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgaGFuZGxlcik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJTcGFuID0gZnVuY3Rpb24gKGpheCwgbWF0aCkge1xuICAgICAgICBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICByZXR1cm4gbWF0aC5maXJzdENoaWxkO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyQkJveCA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgpIHtcbiAgICAgICAgdmFyIGJib3ggPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3Bhbi5wYXJlbnROb2RlKTtcbiAgICAgICAgYmJveC5oICs9IDI7XG4gICAgICAgIGJib3guZCAtPSAyO1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5ab29tID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCwgTXcsIE1oKSB7XG4gICAgICAgIHNwYW4uY2xhc3NOYW1lID0gXCJNYXRoSmF4X1NWR1wiO1xuICAgICAgICB2YXIgZW1leCA9IHNwYW4uYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgdmFyIGV4ID0gZW1leC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgdGhpcy5leCA9IGV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguRWRpdGFibGVTVkcuY3dpZHRoO1xuICAgICAgICBlbWV4LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZW1leCk7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5tYXRoRElWID0gc3BhbjtcbiAgICAgICAgdmFyIHR3ID0gamF4LnJvb3QuZGF0YVswXS5FZGl0YWJsZVNWR2RhdGEudHc7XG4gICAgICAgIGlmICh0dyAmJiB0dyA8IHRoaXMuY3dpZHRoKVxuICAgICAgICAgICAgdGhpcy5jd2lkdGggPSB0dztcbiAgICAgICAgdGhpcy5pZFBvc3RmaXggPSBcIi16b29tXCI7XG4gICAgICAgIGpheC5yb290LnRvU1ZHKHNwYW4sIHNwYW4pO1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiXCI7XG4gICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdmFyIHN2ZyA9IHNwYW4uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdmdcIilbMF0uc3R5bGU7XG4gICAgICAgIHN2Zy5tYXJnaW5Ub3AgPSBzdmcubWFyZ2luUmlnaHQgPSBzdmcubWFyZ2luTGVmdCA9IDA7XG4gICAgICAgIGlmIChzdmcubWFyZ2luQm90dG9tLmNoYXJBdCgwKSA9PT0gXCItXCIpXG4gICAgICAgICAgICBzcGFuLnN0eWxlLm1hcmdpbkJvdHRvbSA9IHN2Zy5tYXJnaW5Cb3R0b20uc3Vic3RyKDEpO1xuICAgICAgICBpZiAodGhpcy5vcGVyYVpvb21SZWZyZXNoKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzcGFuLmZpcnN0Q2hpbGQuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgdHJhbnNwYXJlbnRcIjtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGFuLm9mZnNldFdpZHRoIDwgc3Bhbi5maXJzdENoaWxkLm9mZnNldFdpZHRoKSB7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLm1pbldpZHRoID0gc3Bhbi5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgbWF0aC5zdHlsZS5taW5XaWR0aCA9IG1hdGguZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgfVxuICAgICAgICBzcGFuLnN0eWxlLnBvc2l0aW9uID0gbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgdmFyIHpXID0gc3Bhbi5vZmZzZXRXaWR0aCwgekggPSBzcGFuLm9mZnNldEhlaWdodCwgbUggPSBtYXRoLm9mZnNldEhlaWdodCwgbVcgPSBtYXRoLm9mZnNldFdpZHRoO1xuICAgICAgICBzcGFuLnN0eWxlLnBvc2l0aW9uID0gbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwiXCI7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBZOiAtTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5nZXRCQm94KHNwYW4pLmgsXG4gICAgICAgICAgICBtVzogbVcsXG4gICAgICAgICAgICBtSDogbUgsXG4gICAgICAgICAgICB6VzogelcsXG4gICAgICAgICAgICB6SDogekhcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5pbml0U1ZHID0gZnVuY3Rpb24gKG1hdGgsIHNwYW4pIHsgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuUmVtb3ZlID0gZnVuY3Rpb24gKGpheCkge1xuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGpheC5pbnB1dElEICsgXCItRnJhbWVcIik7XG4gICAgICAgIGlmIChzcGFuKSB7XG4gICAgICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBqYXguRWRpdGFibGVTVkc7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJWID0gZnVuY3Rpb24gKHN2ZywgSCwgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciB0b3AgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS50b3AgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBib3QgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS5ib3QgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBoID0gdG9wLmggKyB0b3AuZCArIGJvdC5oICsgYm90LmQ7XG4gICAgICAgIHZhciB5ID0gLXRvcC5oO1xuICAgICAgICBzdmcuQWRkKHRvcCwgMCwgeSk7XG4gICAgICAgIHkgLT0gdG9wLmQ7XG4gICAgICAgIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHZhciBtaWQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLm1pZCwgZm9udCk7XG4gICAgICAgICAgICBoICs9IG1pZC5oICsgbWlkLmQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBIIDwgaCAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgSCA9IGggKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEggPiBoKSB7XG4gICAgICAgICAgICB2YXIgZXh0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5leHQsIGZvbnQpO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCBlSCA9IChIIC0gaCkgLyBrLCBzID0gKGVIICsgMTAwKSAvIChleHQuaCArIGV4dC5kKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArIGV4dC55ICsgXCIsXCIgKyAoeSAtIHMgKiBleHQuaCArIDUwICsgZXh0LnkpICsgXCIpIHNjYWxlKDEsXCIgKyBzICsgXCIpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGV4dC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHkgLT0gZUg7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCAwLCB5IC0gbWlkLmgpO1xuICAgICAgICAgICAgICAgICAgICB5IC09IChtaWQuaCArIG1pZC5kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB5ICs9IChoIC0gSCkgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICB5ICs9IC0obWlkLmggKyBtaWQuZCkgKyAoaCAtIEgpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJvdCwgMCwgeSAtIGJvdC5oKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZXh0ZW5kRGVsaW1pdGVySCA9IGZ1bmN0aW9uIChzdmcsIFcsIGRlbGltLCBzY2FsZSwgZm9udCkge1xuICAgICAgICB2YXIgbGVmdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmxlZnQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHZhciByaWdodCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnJpZ2h0IHx8IGRlbGltLnJlcCksIGZvbnQpO1xuICAgICAgICBzdmcuQWRkKGxlZnQsIC1sZWZ0LmwsIDApO1xuICAgICAgICB2YXIgdyA9IChsZWZ0LnIgLSBsZWZ0LmwpICsgKHJpZ2h0LnIgLSByaWdodC5sKSwgeCA9IGxlZnQuciAtIGxlZnQubDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIHcgKz0gbWlkLnc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBXIDwgdyAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgVyA9IHcgKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFcgPiB3KSB7XG4gICAgICAgICAgICB2YXIgcmVwID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5yZXAsIGZvbnQpLCBmdXp6ID0gZGVsaW0uZnV6eiB8fCAwO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCByVyA9IChXIC0gdykgLyBrLCBzID0gKHJXICsgZnV6eikgLyAocmVwLnIgLSByZXAubCk7XG4gICAgICAgICAgICB3aGlsZSAoay0tID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBnID0gVXRpbC5FbGVtZW50KFwiZ1wiLCB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogXCJ0cmFuc2xhdGUoXCIgKyAoeCAtIGZ1enogLyAyIC0gcyAqIHJlcC5sICsgcmVwLngpICsgXCIsXCIgKyByZXAueSArIFwiKSBzY2FsZShcIiArIHMgKyBcIiwxKVwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChyZXAuZWxlbWVudC5jbG9uZU5vZGUoZmFsc2UpKTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5hcHBlbmRDaGlsZChnKTtcbiAgICAgICAgICAgICAgICB4ICs9IHJXO1xuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5taWQgJiYgaykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKG1pZCwgeCwgMCk7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gbWlkLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpIC8gMjtcbiAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgIHggKz0gbWlkLncgLSAodyAtIFcpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHggLT0gKHcgLSBXKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKHJpZ2h0LCB4IC0gcmlnaHQubCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgc3ZnLmlzTXVsdGlDaGFyID0gdHJ1ZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmdldEpheEZyb21NYXRoID0gZnVuY3Rpb24gKG1hdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChtYXRoLnBhcmVudE5vZGUuY2xhc3NOYW1lID09PSBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIikge1xuICAgICAgICAgICAgICAgIG1hdGggPSBtYXRoLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgbWF0aCA9IG1hdGgubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9IHdoaWxlIChtYXRoICYmIG1hdGgubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJzY3JpcHRcIik7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5IdWIuZ2V0SmF4Rm9yKG1hdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgaW4gZ2V0SmF4RnJvbU1hdGhcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBFZGl0YWJsZVNWRztcbn0oKSk7XG52YXIgbG9hZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGNvbnNvbGUubG9nKCdMT0FESU5HJyk7XG4gICAgRWRpdGFibGVTVkcuYXBwbHkoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIGZvciAodmFyIGlkIGluIEVkaXRhYmxlU1ZHLnByb3RvdHlwZSkge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkcucHJvdG90eXBlW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcpIHtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkdbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbn07XG5TVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgPSBTVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgfHwgZnVuY3Rpb24gKGVsZW0pIHtcbiAgICByZXR1cm4gZWxlbS5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkubXVsdGlwbHkodGhpcy5nZXRTY3JlZW5DVE0oKSk7XG59O1xuc2V0VGltZW91dChsb2FkLCAxMDAwKTtcbnZhciBQYXJzZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBhcnNlcigpIHtcbiAgICB9XG4gICAgUGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlID0gZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MoY3MpO1xuICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgdmFyIG1hdGhqYXhQYXJzZXIgPSBNYXRoSmF4LklucHV0SmF4LlRlWC5QYXJzZShjcyk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuY3NVbmRlZmluZWQgPSBtYXRoamF4UGFyc2VyLmNzRmluZE1hY3JvID0gZnVuY3Rpb24gKCkgeyB9O1xuICAgICAgICBtYXRoamF4UGFyc2VyLkdldENTID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gY3M7IH07XG4gICAgICAgIG1hdGhqYXhQYXJzZXIubW1sVG9rZW4gPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geDsgfTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5QdXNoID0gKGZ1bmN0aW9uICh4KSB7IHJlc3VsdCA9IHg7IH0pO1xuICAgICAgICBtYXRoamF4UGFyc2VyLkNvbnRyb2xTZXF1ZW5jZSgpO1xuICAgICAgICByZXR1cm4gW3Jlc3VsdF07XG4gICAgfTtcbiAgICBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIG1hY3JvcyA9IE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLm1hY3JvcztcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIGlmIChjcyA9PT0gJ2ZyYWMnKSB7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgdmFyIG1mcmFjID0gbmV3IE1NTC5tZnJhYyhob2xlLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gW21mcmFjXTtcbiAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjcyA9PT0gJ3NxcnQnKSB7XG4gICAgICAgICAgICB2YXIgbXNxcnQgPSBuZXcgTU1MLm1zcXJ0KCk7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgbXNxcnQuU2V0RGF0YSgwLCBob2xlKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbbXNxcnRdO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNzID09PSAnbWF0cml4JyB8fCBjcyA9PT0gJ2JtYXRyaXgnKSB7XG4gICAgICAgICAgICB2YXIgbXRhYmxlID0gbmV3IE1NTC5tdGFibGUoKTtcbiAgICAgICAgICAgIHZhciBtdHIgPSBuZXcgTU1MLm10cigpO1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgbXRhYmxlLlNldERhdGEoMCwgbXRyKTtcbiAgICAgICAgICAgIG10ci5TZXREYXRhKDAsIG10ZCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBob2xlKTtcbiAgICAgICAgICAgIHZhciBsYnJhY2tldCA9IG5ldyBNTUwubW8obmV3IE1NTC5jaGFycyhcIltcIikpO1xuICAgICAgICAgICAgdmFyIHJicmFja2V0ID0gbmV3IE1NTC5tbyhuZXcgTU1MLmNoYXJzKFwiXVwiKSk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gW2xicmFja2V0LCBtdGFibGUsIHJicmFja2V0XTtcbiAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYWNyb3NbY3NdKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtYWNyb3NbY3NdKTtcbiAgICAgICAgICAgIHZhciBuYW1lZERpcmVjdGx5ID0gbWFjcm9zW2NzXSA9PT0gJ05hbWVkT3AnIHx8IG1hY3Jvc1tjc10gPT09ICdOYW1lZEZuJztcbiAgICAgICAgICAgIHZhciBuYW1lZEFycmF5ID0gbWFjcm9zW2NzXVswXSAmJiAobWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkRm4nIHx8IG1hY3Jvc1tjc11bMF0gPT09ICdOYW1lZE9wJyk7XG4gICAgICAgICAgICBpZiAobmFtZWREaXJlY3RseSB8fCBuYW1lZEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lZEFycmF5ICYmIG1hY3Jvc1tjc11bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBtYWNyb3NbY3NdWzFdLnJlcGxhY2UoLyZ0aGluc3A7LywgXCJcXHUyMDA2XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBjcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtuZXcgTU1MLm1vKG5ldyBNTUwuY2hhcnModmFsdWUpKV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBQYXJzZXI7XG59KCkpO1xudmFyIEJCT1ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJCT1goZGVmLCB0eXBlKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmICh0eXBlID09PSB2b2lkIDApIHsgdHlwZSA9IFwiZ1wiOyB9XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLkggPSB0aGlzLkQgPSAwO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSAwO1xuICAgICAgICB0aGlzLmwgPSBVdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLnggPSB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnNjYWxlID0gMTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gVXRpbC5FbGVtZW50KHR5cGUsIGRlZik7XG4gICAgfVxuICAgIEJCT1gucHJvdG90eXBlLldpdGggPSBmdW5jdGlvbiAoZGVmLCBIVUIpIHtcbiAgICAgICAgcmV0dXJuIEhVQi5JbnNlcnQodGhpcywgZGVmKTtcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFkZCA9IGZ1bmN0aW9uIChzdmcsIGR4LCBkeSwgZm9yY2V3LCBpbmZyb250KSB7XG4gICAgICAgIGlmIChkeCkge1xuICAgICAgICAgICAgc3ZnLnggKz0gZHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR5KSB7XG4gICAgICAgICAgICBzdmcueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiBzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBzdmcubiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIG5vZGVOYW1lID0gY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwidXNlXCIgfHwgbm9kZU5hbWUgPT09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHN2Zy5jaGlsZFNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHN2Zy5jaGlsZFgsIHkgPSBzdmcuY2hpbGRZO1xuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcueSArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuaCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuZCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuSCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuRCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcudyAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcuciAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcubCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN2Zy54KSA8IDEgJiYgTWF0aC5hYnMoc3ZnLnkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09PSBcImxpbmVcIiB8fCBub2RlTmFtZSA9PT0gXCJwb2x5Z29uXCIgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPT09IFwicGF0aFwiIHx8IG5vZGVOYW1lID09PSBcImFcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm4gKz0gc3ZnLm47XG4gICAgICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZnJvbnQgJiYgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZnJvbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGFzSW5kZW50ID0gc3ZnLmhhc0luZGVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kIC0gc3ZnLnkgPiB0aGlzLmQpIHtcbiAgICAgICAgICAgIHRoaXMuZCA9IHN2Zy5kIC0gc3ZnLnk7XG4gICAgICAgICAgICBpZiAodGhpcy5kID4gdGhpcy5EKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5EID0gdGhpcy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5oID4gdGhpcy5oKSB7XG4gICAgICAgICAgICB0aGlzLmggPSBzdmcueSArIHN2Zy5oO1xuICAgICAgICAgICAgaWYgKHRoaXMuaCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuSCA9IHRoaXMuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgLSBzdmcueSA+IHRoaXMuRClcbiAgICAgICAgICAgIHRoaXMuRCA9IHN2Zy5EIC0gc3ZnLnk7XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5IID4gdGhpcy5IKVxuICAgICAgICAgICAgdGhpcy5IID0gc3ZnLnkgKyBzdmcuSDtcbiAgICAgICAgaWYgKHN2Zy54ICsgc3ZnLmwgPCB0aGlzLmwpXG4gICAgICAgICAgICB0aGlzLmwgPSBzdmcueCArIHN2Zy5sO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcuciA+IHRoaXMucilcbiAgICAgICAgICAgIHRoaXMuciA9IHN2Zy54ICsgc3ZnLnI7XG4gICAgICAgIGlmIChmb3JjZXcgfHwgc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKSA+IHRoaXMudylcbiAgICAgICAgICAgIHRoaXMudyA9IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCk7XG4gICAgICAgIHRoaXMuY2hpbGRTY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5jaGlsZFggPSBzdmcueDtcbiAgICAgICAgdGhpcy5jaGlsZFkgPSBzdmcueTtcbiAgICAgICAgdGhpcy5uKys7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BbGlnbiA9IGZ1bmN0aW9uIChzdmcsIGFsaWduLCBkeCwgZHksIHNoaWZ0KSB7XG4gICAgICAgIGlmIChzaGlmdCA9PT0gdm9pZCAwKSB7IHNoaWZ0ID0gbnVsbDsgfVxuICAgICAgICBkeCA9ICh7XG4gICAgICAgICAgICBsZWZ0OiBkeCxcbiAgICAgICAgICAgIGNlbnRlcjogKHRoaXMudyAtIHN2Zy53KSAvIDIsXG4gICAgICAgICAgICByaWdodDogdGhpcy53IC0gc3ZnLncgLSBkeFxuICAgICAgICB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgICAgIHRoaXMuQWRkKHN2ZywgZHggKyAoc2hpZnQgfHwgMCksIGR5KTtcbiAgICAgICAgdGhpcy53ID0gdztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkNsZWFuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oID09PSAtVXRpbC5CSUdESU1FTikge1xuICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gdGhpcy5sID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEJCT1guZGVmcyA9IG51bGw7XG4gICAgQkJPWC5uID0gMDtcbiAgICByZXR1cm4gQkJPWDtcbn0oKSk7XG52YXIgQkJPWF9HID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfRygpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0c7XG59KEJCT1gpKTtcbnZhciBCQk9YX1RFWFQgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1RFWFQsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9URVhUKHNjYWxlLCB0ZXh0LCBkZWYpIHtcbiAgICAgICAgaWYgKCFkZWYpXG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgZGVmLnN0cm9rZSA9IFwibm9uZVwiO1xuICAgICAgICBpZiAoZGVmW1wiZm9udC1zdHlsZVwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXN0eWxlXCJdO1xuICAgICAgICBpZiAoZGVmW1wiZm9udC13ZWlnaHRcIl0gPT09IFwiXCIpXG4gICAgICAgICAgICBkZWxldGUgZGVmW1wiZm9udC13ZWlnaHRcIl07XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJ0ZXh0XCIpO1xuICAgICAgICBNYXRoSmF4LkhUTUwuYWRkVGV4dCh0aGlzLmVsZW1lbnQsIHRleHQpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy50ZXh0U1ZHLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5lbGVtZW50LmdldEJCb3goKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcudGV4dFNWRy5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICBzY2FsZSAqPSAxMDAwIC8gVXRpbC5lbTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIikgbWF0cml4KDEgMCAwIC0xIDAgMClcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSBiYm94LndpZHRoICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IC1iYm94LnkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gKGJib3guaGVpZ2h0ICsgYmJveC55KSAqIHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9URVhUO1xufShCQk9YKSk7XG52YXIgVXRpbCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXRpbCgpIHtcbiAgICB9XG4gICAgVXRpbC5FbSA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGVtXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImVtXCI7XG4gICAgfTtcbiAgICBVdGlsLkV4ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgbSA9IE1hdGgucm91bmQobSAvIHRoaXMuVGVYLnhfaGVpZ2h0ICogdGhpcy5leCkgLyB0aGlzLmV4O1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBleFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJleFwiO1xuICAgIH07XG4gICAgVXRpbC5QZXJjZW50ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0dXJuICgxMDAgKiBtKS50b0ZpeGVkKDEpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiJVwiO1xuICAgIH07XG4gICAgVXRpbC5GaXhlZCA9IGZ1bmN0aW9uIChtLCBuKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQobiB8fCAzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIik7XG4gICAgfTtcbiAgICBVdGlsLmhhc2hDaGVjayA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH0gd2hpbGUgKHRhcmdldCAmJiB0YXJnZXQuZmlyc3RDaGlsZC5ub2RlTmFtZSAhPT0gXCJzdmdcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICAgIFV0aWwuRWxlbWVudCA9IGZ1bmN0aW9uICh0eXBlLCBkZWYpIHtcbiAgICAgICAgdmFyIG9iajtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3ZnOlwiICsgdHlwZSkgOiB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBvYmouaXNNYXRoSmF4ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGRlZikge1xuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gZGVmKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZi5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZShpZCwgZGVmW2lkXS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIFV0aWwuYWRkRWxlbWVudCA9IGZ1bmN0aW9uIChwYXJlbnQsIHR5cGUsIGRlZikge1xuICAgICAgICByZXR1cm4gcGFyZW50LmFwcGVuZENoaWxkKFV0aWwuRWxlbWVudCh0eXBlLCBkZWYpKTtcbiAgICB9O1xuICAgIFV0aWwubGVuZ3RoMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUsIHNpemUpIHtcbiAgICAgICAgaWYgKG11ID09PSB2b2lkIDApIHsgbXUgPSBudWxsOyB9XG4gICAgICAgIGlmIChzaXplID09PSB2b2lkIDApIHsgc2l6ZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGVvZiAobGVuZ3RoKSAhPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGxlbmd0aCA9IGxlbmd0aC50b1N0cmluZygpO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcIlwiKVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5OT1JNQUwpXG4gICAgICAgICAgICByZXR1cm4gMTAwMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLkJJRylcbiAgICAgICAgICAgIHJldHVybiAyMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuU01BTEwpXG4gICAgICAgICAgICByZXR1cm4gNzEwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcImluZmluaXR5XCIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5CSUdESU1FTjtcbiAgICAgICAgaWYgKGxlbmd0aC5tYXRjaCgvbWF0aHNwYWNlJC8pKVxuICAgICAgICAgICAgcmV0dXJuIDEwMDAgKiB0aGlzLk1BVEhTUEFDRVtsZW5ndGhdO1xuICAgICAgICB2YXIgem9vbVNjYWxlID0gcGFyc2VJbnQoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgZW1GYWN0b3IgPSAoem9vbVNjYWxlIHx8IDEpIC8gVXRpbC5lbTtcbiAgICAgICAgdmFyIG1hdGNoID0gbGVuZ3RoLm1hdGNoKC9eXFxzKihbLStdPyg/OlxcLlxcZCt8XFxkKyg/OlxcLlxcZCopPykpPyhwdHxlbXxleHxtdXxweHxwY3xpbnxtbXxjbXwlKT8vKTtcbiAgICAgICAgdmFyIG0gPSBwYXJzZUZsb2F0KG1hdGNoWzFdIHx8IFwiMVwiKSAqIDEwMDAsIHVuaXQgPSBtYXRjaFsyXTtcbiAgICAgICAgaWYgKHNpemUgPT0gbnVsbClcbiAgICAgICAgICAgIHNpemUgPSAxMDAwO1xuICAgICAgICBpZiAobXUgPT0gbnVsbClcbiAgICAgICAgICAgIG11ID0gMTtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZW1cIilcbiAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJleFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLlRlWC54X2hlaWdodCAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcIiVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTAwICogc2l6ZSAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwdFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicGNcIilcbiAgICAgICAgICAgIHJldHVybiBtICogMS4yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJpblwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJjbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMi41NDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibW1cIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvciAvIDI1LjQ7XG4gICAgICAgIGlmICh1bml0ID09PSBcIm11XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDE4ICogbXU7XG4gICAgICAgIHJldHVybiBtICogc2l6ZSAvIDEwMDA7XG4gICAgfTtcbiAgICBVdGlsLmdldFBhZGRpbmcgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gcGFkZGluZykge1xuICAgICAgICAgICAgaWYgKHBhZGRpbmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZCA9IHN0eWxlc1tcInBhZGRpbmdcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdbaWRdID0gVXRpbC5sZW5ndGgyZW0ocGFkKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBwYWRkaW5nIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC5nZXRCb3JkZXJzID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICAgICAgICB2YXIgYm9yZGVyID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH0sIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBib3JkZXIpIHtcbiAgICAgICAgICAgIGlmIChib3JkZXIuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gXCJib3JkZXJcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWRdID0gVXRpbC5sZW5ndGgyZW0oc3R5bGVzW0lEICsgXCJXaWR0aFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiU3R5bGVcIl0gPSBzdHlsZXNbSUQgKyBcIlN0eWxlXCJdO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gc3R5bGVzW0lEICsgXCJDb2xvclwiXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPT09IFwiaW5pdGlhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJvcmRlcltpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaGFzID8gYm9yZGVyIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC50aGlja25lc3MyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSkge1xuICAgICAgICB2YXIgdGhpY2sgPSB0aGlzLlRlWC5ydWxlX3RoaWNrbmVzcztcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLk1FRElVTSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElOKSB7XG4gICAgICAgICAgICByZXR1cm4gMC42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElDSykge1xuICAgICAgICAgICAgcmV0dXJuIDEuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgdGhpY2spO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpKTtcbiAgICB9O1xuICAgIFV0aWwuZWxlbUNvb3Jkc1RvVmlld3BvcnRDb29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChzdmcpKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0U1ZHRWxlbSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmICghZWxlbSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHN2ZyA9IGVsZW0ubm9kZU5hbWUgPT09ICdzdmcnID8gZWxlbSA6IGVsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2Zykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gb3duZXIgU1ZHIGVsZW1lbnQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgfTtcbiAgICBVdGlsLmJveENvbnRhaW5zID0gZnVuY3Rpb24gKGJiLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBiYiAmJiBiYi54IDw9IHggJiYgeCA8PSBiYi54ICsgYmIud2lkdGggJiYgYmIueSA8PSB5ICYmIHkgPD0gYmIueSArIGJiLmhlaWdodDtcbiAgICB9O1xuICAgIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQgPSBmdW5jdGlvbiAobm9kZSwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSBub2RlLmdldEJCICYmIG5vZGUuZ2V0QkIoKTtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3Jkcyhub2RlLkVkaXRhYmxlU1ZHZWxlbSwgeCwgeSk7XG4gICAgICAgIGlmICghYmIgfHwgIXApXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBVdGlsLmJveENvbnRhaW5zKGJiLCBwLngsIHAueSk7XG4gICAgfTtcbiAgICBVdGlsLmhpZ2hsaWdodEJveCA9IGZ1bmN0aW9uIChzdmcsIGJiKSB7XG4gICAgICAgIHZhciBkID0gMTAwO1xuICAgICAgICB2YXIgZHJhd0xpbmUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFV0aWwuU1ZHTlMsICdsaW5lJyk7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnc3Ryb2tlOnJnYigwLDAsMjU1KTtzdHJva2Utd2lkdGg6MjAnKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgyKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkyKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCArIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCwgYmIueSArIGQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGggLSBkLCBiYi55KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSwgYmIueCArIGJiLndpZHRoLCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54LCBiYi55ICsgYmIuaGVpZ2h0IC0gZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkgKyBiYi5oZWlnaHQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKVxuICAgICAgICBdO1xuICAgIH07XG4gICAgVXRpbC5nZXRDdXJzb3JWYWx1ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGlzTmFOKGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uWzBdLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1JzogcmV0dXJuIERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBjYXNlICdkJzogcmV0dXJuIERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2wnOiByZXR1cm4gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICAgICAgY2FzZSAncic6IHJldHVybiBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yIHZhbHVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBVdGlsLlNWR05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xuICAgIFV0aWwuWExJTktOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiO1xuICAgIFV0aWwuTkJTUCA9IFwiXFx1MDBBMFwiO1xuICAgIFV0aWwuQklHRElNRU4gPSAxMDAwMDAwMDtcbiAgICBVdGlsLlRlWCA9IHtcbiAgICAgICAgeF9oZWlnaHQ6IDQzMC41NTQsXG4gICAgICAgIHF1YWQ6IDEwMDAsXG4gICAgICAgIG51bTE6IDY3Ni41MDgsXG4gICAgICAgIG51bTI6IDM5My43MzIsXG4gICAgICAgIG51bTM6IDQ0My43MyxcbiAgICAgICAgZGVub20xOiA2ODUuOTUxLFxuICAgICAgICBkZW5vbTI6IDM0NC44NDEsXG4gICAgICAgIHN1cDE6IDQxMi44OTIsXG4gICAgICAgIHN1cDI6IDM2Mi44OTIsXG4gICAgICAgIHN1cDM6IDI4OC44ODgsXG4gICAgICAgIHN1YjE6IDE1MCxcbiAgICAgICAgc3ViMjogMjQ3LjIxNyxcbiAgICAgICAgc3VwX2Ryb3A6IDM4Ni4xMDgsXG4gICAgICAgIHN1Yl9kcm9wOiA1MCxcbiAgICAgICAgZGVsaW0xOiAyMzkwLFxuICAgICAgICBkZWxpbTI6IDEwMDAsXG4gICAgICAgIGF4aXNfaGVpZ2h0OiAyNTAsXG4gICAgICAgIHJ1bGVfdGhpY2tuZXNzOiA2MCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmcxOiAxMTEuMTExLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzI6IDE2Ni42NjYsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMzogMjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzQ6IDYwMCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmc1OiAxMDAsXG4gICAgICAgIHNjcmlwdHNwYWNlOiAxMDAsXG4gICAgICAgIG51bGxkZWxpbWl0ZXJzcGFjZTogMTIwLFxuICAgICAgICBkZWxpbWl0ZXJmYWN0b3I6IDkwMSxcbiAgICAgICAgZGVsaW1pdGVyc2hvcnRmYWxsOiAzMDAsXG4gICAgICAgIG1pbl9ydWxlX3RoaWNrbmVzczogMS4yNSxcbiAgICAgICAgbWluX3Jvb3Rfc3BhY2U6IDEuNVxuICAgIH07XG4gICAgVXRpbC5NQVRIU1BBQ0UgPSB7XG4gICAgICAgIHZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogMSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpbm1hdGhzcGFjZTogMiAvIDE4LFxuICAgICAgICB0aGlubWF0aHNwYWNlOiAzIC8gMTgsXG4gICAgICAgIG1lZGl1bW1hdGhzcGFjZTogNCAvIDE4LFxuICAgICAgICB0aGlja21hdGhzcGFjZTogNSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpY2ttYXRoc3BhY2U6IDYgLyAxOCxcbiAgICAgICAgdmVyeXZlcnl0aGlja21hdGhzcGFjZTogNyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogLTEgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpbm1hdGhzcGFjZTogLTIgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlubWF0aHNwYWNlOiAtMyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZW1lZGl1bW1hdGhzcGFjZTogLTQgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlja21hdGhzcGFjZTogLTUgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpY2ttYXRoc3BhY2U6IC02IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlja21hdGhzcGFjZTogLTcgLyAxOFxuICAgIH07XG4gICAgcmV0dXJuIFV0aWw7XG59KCkpO1xudmFyIEJCT1hfRlJBTUUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0ZSQU1FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfRlJBTUUoaCwgZCwgdywgdCwgZGFzaCwgY29sb3IsIHN2ZywgaHViLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGRlZi5maWxsID0gXCJub25lXCI7XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFV0aWwuRml4ZWQodCwgMik7XG4gICAgICAgIGRlZi53aWR0aCA9IE1hdGguZmxvb3IodyAtIHQpO1xuICAgICAgICBkZWYuaGVpZ2h0ID0gTWF0aC5mbG9vcihoICsgZCAtIHQpO1xuICAgICAgICBkZWYudHJhbnNmb3JtID0gXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHQgLyAyKSArIFwiLFwiICsgTWF0aC5mbG9vcigtZCArIHQgLyAyKSArIFwiKVwiO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFtNYXRoLmZsb29yKDYgKiBVdGlsLmVtKSwgTWF0aC5mbG9vcig2ICogVXRpbC5lbSldLmpvaW4oXCIgXCIpO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJyZWN0XCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gZDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRlJBTUU7XG59KEJCT1gpKTtcbnZhciBCQk9YX0dMWVBIID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HTFlQSCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0dMWVBIKHNjYWxlLCBpZCwgaCwgZCwgdywgbCwgciwgcCkge1xuICAgICAgICB0aGlzLmdseXBocyA9IHt9O1xuICAgICAgICB0aGlzLm4gPSAwO1xuICAgICAgICB2YXIgZGVmO1xuICAgICAgICB2YXIgdCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5ibGFja2VyO1xuICAgICAgICB2YXIgY2FjaGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlRm9udENhY2hlO1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gKHNjYWxlID09PSAxID8gbnVsbCA6IFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKVwiKTtcbiAgICAgICAgaWYgKGNhY2hlICYmICFNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIGlkID0gXCJFXCIgKyB0aGlzLm4gKyBcIi1cIiArIGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2FjaGUgfHwgIXRoaXMuZ2x5cGhzW2lkXSkge1xuICAgICAgICAgICAgZGVmID0geyBcInN0cm9rZS13aWR0aFwiOiB0IH07XG4gICAgICAgICAgICBpZiAoY2FjaGUpXG4gICAgICAgICAgICAgICAgZGVmLmlkID0gaWQ7XG4gICAgICAgICAgICBlbHNlIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIGRlZi5kID0gKHAgPyBcIk1cIiArIHAgKyBcIlpcIiA6IFwiXCIpO1xuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInBhdGhcIik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdseXBoc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtKVxuICAgICAgICAgICAgICAgIGRlZi50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQoXCJ1c2VcIiwgZGVmKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCBcIiNcIiArIGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oID0gKGggKyB0KSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSAoZCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMudyA9ICh3ICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IChsICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuciA9IChyICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuSCA9IE1hdGgubWF4KDAsIHRoaXMuaCk7XG4gICAgICAgIHRoaXMuRCA9IE1hdGgubWF4KDAsIHRoaXMuZCk7XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfR0xZUEg7XG59KEJCT1gpKTtcbnZhciBCQk9YX0hMSU5FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ITElORSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0hMSU5FKHcsIHQsIGRhc2gsIGNvbG9yLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIilcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLnkxID0gZGVmLnkyID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi54MiA9IE1hdGguZmxvb3IodyAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgdyAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSB0O1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9ITElORTtcbn0oQkJPWCkpO1xudmFyIEJCT1hfTk9OUkVNT1ZBQkxFID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OT05SRU1PVkFCTEUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9OT05SRU1PVkFCTEUoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9OT05SRU1PVkFCTEU7XG59KEJCT1hfRykpO1xudmFyIEJCT1hfTlVMTCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTlVMTCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05VTEwoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBhcmdzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLkNsZWFuKCk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05VTEw7XG59KEJCT1gpKTtcbnZhciBCQk9YX1JFQ1QgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1JFQ1QsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9SRUNUKGgsIGQsIHcsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGRlZi53aWR0aCA9IE1hdGguZmxvb3Iodyk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkKTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoICsgZDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy55ID0gLWQ7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1JFQ1Q7XG59KEJCT1gpKTtcbnZhciBCQk9YX1JPVyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUk9XLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUk9XKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbGVtcyA9IFtdO1xuICAgICAgICB0aGlzLnNoID0gdGhpcy5zZCA9IDA7XG4gICAgfVxuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5DaGVjayA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciBzdmcgPSBkYXRhLnRvU1ZHKCk7XG4gICAgICAgIHRoaXMuZWxlbXMucHVzaChzdmcpO1xuICAgICAgICBpZiAoZGF0YS5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgIHN2Zy5tbWwgPSBkYXRhO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA+IHRoaXMuc2gpIHtcbiAgICAgICAgICAgIHRoaXMuc2ggPSBzdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgPiB0aGlzLnNkKSB7XG4gICAgICAgICAgICB0aGlzLnNkID0gc3ZnLmQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5TdHJldGNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZWxlbXMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gdGhpcy5lbGVtc1tpXSwgbW1sID0gc3ZnLm1tbDtcbiAgICAgICAgICAgIGlmIChtbWwpIHtcbiAgICAgICAgICAgICAgICBpZiAobW1sLmZvcmNlU3RyZXRjaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmggIT09IHRoaXMuc2ggfHwgbW1sLkVkaXRhYmxlU1ZHZGF0YS5kICE9PSB0aGlzLnNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2ZyA9IG1tbC5TVkdzdHJldGNoVih0aGlzLnNoLCB0aGlzLnNkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5IVyA9IHRoaXMuc2g7XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5EID0gdGhpcy5zZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaWMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmljID0gc3ZnLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLkFkZChzdmcsIHRoaXMudywgMCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMuZWxlbXM7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWF9ST1c7XG59KEJCT1gpKTtcbnZhciBCQk9YX1NWRyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfU1ZHLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfU1ZHKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBudWxsLCBcInN2Z1wiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1NWRztcbn0oQkJPWCkpO1xudmFyIEJCT1hfVkxJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1ZMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVkxJTkUoaCwgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICBkZWYuc3Ryb2tlID0gY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLngyID0gZGVmLnkxID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi55MiA9IE1hdGguZmxvb3IoaCAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB0O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9WTElORTtcbn0oQkJPWCkpO1xudmFyIEVsZW1lbnRKYXggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVsZW1lbnRKYXgoKSB7XG4gICAgfVxuICAgIHJldHVybiBFbGVtZW50SmF4O1xufSgpKTtcbnZhciBNQmFzZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUJhc2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQmFzZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0QkIgPSBmdW5jdGlvbiAocmVsYXRpdmVUbykge1xuICAgICAgICB2YXIgZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT2ggbm8hIENvdWxkbid0IGZpbmQgZWxlbSBmb3IgdGhpczogXCIsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uIChlZGl0YWJsZVNWRykge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9iai5wcm90b3R5cGUgPSB7fTtcbiAgICAgICAgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnByb3RvdHlwZSkge1xuICAgICAgICAgICAgb2JqW2lkXSA9IHRoaXMucHJvdG90eXBlW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBvYmouZWRpdGFibGVTVkcgPSBlZGl0YWJsZVNWRztcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciByZW5kZXJlZCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzdmcuc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5BZGQocmVuZGVyZWQsIHN2Zy53LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGNoaWxkLnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoc3ZnLnNrZXcgJiYgdGV4dC5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudyAmJiB0ZXh0Lmxlbmd0aCA9PT0gMSAmJiAhdmFyaWFudC5ub0lDKSB7XG4gICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NoaWxkU1ZHID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbaV0gPyB0aGlzLmRhdGFbaV0udG9TVkcoKSA6IG5ldyBCQk9YKCkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkID0gZnVuY3Rpb24gKGksIEhXLCBEKSB7XG4gICAgICAgIGlmIChEID09PSB2b2lkIDApIHsgRCA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7XG4gICAgICAgICAgICBIVzogSFcsXG4gICAgICAgICAgICBEOiBEXG4gICAgICAgIH07XG4gICAgICAgIGlmICghdGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEJCT1goKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS50b1NWRygpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc2F2ZURhdGEgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIGlmICghdGhpcy5FZGl0YWJsZVNWR2RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudyA9IHN2Zy53LCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS54ID0gc3ZnLng7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggPSBzdmcuaCwgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCA9IHN2Zy5kO1xuICAgICAgICBpZiAoc3ZnLnkpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggKz0gc3ZnLnk7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kIC09IHN2Zy55O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuWCAhPSBudWxsKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuWCA9IHN2Zy5YO1xuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS50dyA9IHN2Zy50dztcbiAgICAgICAgaWYgKHN2Zy5za2V3KVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuc2tldyA9IHN2Zy5za2V3O1xuICAgICAgICBpZiAoc3ZnLmljKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaWMgPSBzdmcuaWM7XG4gICAgICAgIGlmICh0aGlzW1wiY2xhc3NcIl0pIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IHRoaXNbXCJjbGFzc1wiXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaWQpIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBVdGlsLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHRoaXMuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhyZWYpIHtcbiAgICAgICAgICAgIHZhciBhID0gVXRpbC5FbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgICAgICAgXCJjbGFzc1wiOiBcIm1qeC1zdmctaHJlZlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlTlMoVXRpbC5YTElOS05TLCBcImhyZWZcIiwgdGhpcy5ocmVmKTtcbiAgICAgICAgICAgIGEub25jbGljayA9IHRoaXMuU1ZHbGluaztcbiAgICAgICAgICAgIFV0aWwuYWRkRWxlbWVudChhLCBcInJlY3RcIiwge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBzdmcudyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHN2Zy5oICsgc3ZnLmQsXG4gICAgICAgICAgICAgICAgeTogLXN2Zy5kLFxuICAgICAgICAgICAgICAgIGZpbGw6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJwb2ludGVyLWV2ZW50c1wiOiBcImFsbFwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdmcudHlwZSA9PT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZy5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoZy5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5hZGRNTUxjbGFzc2VzKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2FkZENsYXNzKHN2Zy5lbGVtZW50LCBcIm1qeC1zdmctXCIgKyB0aGlzLnR5cGUpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3R5bGUgPSB0aGlzLnN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUgJiYgc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICAgICAgICAgIGlmIChzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmJvcmRlciA9IHN2Zy5lbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSAoc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9PT0gXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdhZGRBdHRyaWJ1dGVzKHN2Zyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRDbGFzcyA9IGZ1bmN0aW9uIChub2RlLCBuYW1lKSB7XG4gICAgICAgIHZhciBjbGFzc2VzID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTtcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCAoY2xhc3NlcyA/IGNsYXNzZXMgKyBcIiBcIiA6IFwiXCIpICsgbmFtZSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy5hdHRyTmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gdGhpcy5hdHRyTmFtZXMsIHNraXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm5vY29weUF0dHJpYnV0ZXMsIGlnbm9yZSA9IE1hdGhKYXguSHViLmNvbmZpZy5pZ25vcmVNTUxhdHRyaWJ1dGVzO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0gKHRoaXMudHlwZSA9PT0gXCJtc3R5bGVcIiA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWF0aC5wcm90b3R5cGUuZGVmYXVsdHMgOiB0aGlzLmRlZmF1bHRzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gY29weS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBjb3B5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChpZ25vcmVbaWRdID09IGZhbHNlIHx8ICghc2tpcFtpZF0gJiYgIWlnbm9yZVtpZF0gJiZcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNbaWRdID09IG51bGwgJiYgdHlwZW9mIChzdmcuZWxlbWVudFtpZF0pID09PSBcInVuZGVmaW5lZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoaWQsIHRoaXMuYXR0cltpZF0pO1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhyZWYgPSB0aGlzLmhyZWYuYW5pbVZhbDtcbiAgICAgICAgaWYgKGhyZWYuY2hhckF0KDApID09PSBcIiNcIikge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IFV0aWwuaGFzaENoZWNrKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGhyZWYuc3Vic3RyKDEpKSk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5zY3JvbGxJbnRvVmlldykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGFyZW50Tm9kZS5zY3JvbGxJbnRvVmlldyh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGhyZWY7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHcHJvY2Vzc1N0eWxlcyA9IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB2YXIgc3R5bGVzID0ge1xuICAgICAgICAgICAgYm9yZGVyOiBVdGlsLmdldEJvcmRlcnMoc3R5bGUpLFxuICAgICAgICAgICAgcGFkZGluZzogVXRpbC5nZXRQYWRkaW5nKHN0eWxlKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXN0eWxlcy5ib3JkZXIpXG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLmJvcmRlcjtcbiAgICAgICAgaWYgKCFzdHlsZXMucGFkZGluZylcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMucGFkZGluZztcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTaXplKVxuICAgICAgICAgICAgc3R5bGVzWydmb250U2l6ZSddID0gc3R5bGUuZm9udFNpemU7XG4gICAgICAgIGlmIChzdHlsZS5jb2xvcilcbiAgICAgICAgICAgIHN0eWxlc1snY29sb3InXSA9IHN0eWxlLmNvbG9yO1xuICAgICAgICBpZiAoc3R5bGUuYmFja2dyb3VuZENvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydiYWNrZ3JvdW5kJ10gPSBzdHlsZS5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5mb250U3R5bGUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTdHlsZSddID0gc3R5bGUuZm9udFN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFdlaWdodClcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gc3R5bGUuZm9udFdlaWdodDtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRGYW1pbHkpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRGYW1pbHknXSA9IHN0eWxlLmZvbnRGYW1pbHk7XG4gICAgICAgIGlmIChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSAmJiBzdHlsZXNbJ2ZvbnRXZWlnaHQnXS5tYXRjaCgvXlxcZCskLykpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRXZWlnaHQnXSA9IChwYXJzZUludChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSkgPiA2MDAgPyBcImJvbGRcIiA6IFwibm9ybWFsXCIpO1xuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFwibW9cIilcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImxzcGFjZVwiLCBcInJzcGFjZVwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPD0gMCB8fCB0aGlzLmhhc1ZhbHVlKFwibHNwYWNlXCIpIHx8IHRoaXMuaGFzVmFsdWUoXCJyc3BhY2VcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmxzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5sc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnJzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5yc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLCBwYXJlbnQgPSB0aGlzLlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQgJiYgcGFyZW50LmlzRW1iZWxsaXNoZWQoKSAmJiBwYXJlbnQuQ29yZSgpID09PSBjb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvcmUgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHZhbHVlcy5sc3BhY2U7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5yc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy5YID0gdmFsdWVzLnJzcGFjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGFjZSA9IHRoaXMudGV4U3BhY2luZygpO1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZSgpO1xuICAgICAgICAgICAgaWYgKHNwYWNlICE9PSBcIlwiKVxuICAgICAgICAgICAgICAgIHN2Zy54ICs9IFV0aWwubGVuZ3RoMmVtKHNwYWNlLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVDb2xvciA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aGNvbG9yXCIsIFwiY29sb3JcIik7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlcyAmJiB0aGlzLnN0eWxlcy5jb2xvciAmJiAhdmFsdWVzLmNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMuY29sb3IgPSB0aGlzLnN0eWxlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmNvbG9yICYmICF0aGlzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhjb2xvciA9IHZhbHVlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgVXRpbC5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLm1hdGhjb2xvcixcbiAgICAgICAgICAgICAgICBzdHJva2U6IHZhbHVlcy5tYXRoY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9yZGVycyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkuYm9yZGVyLCBwYWRkaW5nID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5wYWRkaW5nLCBibGVmdCA9ICgoYm9yZGVycyB8fCB7fSkubGVmdCB8fCAwKSwgcGxlZnQgPSAoKHBhZGRpbmcgfHwge30pLmxlZnQgfHwgMCksIGlkO1xuICAgICAgICB2YWx1ZXMuYmFja2dyb3VuZCA9ICh0aGlzLm1hdGhiYWNrZ3JvdW5kIHx8IHRoaXMuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgKHRoaXMuc3R5bGVzIHx8IHt9KS5iYWNrZ3JvdW5kIHx8IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpO1xuICAgICAgICBpZiAoYmxlZnQgKyBwbGVmdCkge1xuICAgICAgICAgICAgdmFyIGR1cCA9IG5ldyBCQk9YKE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc3ZnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN2Zy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVwW2lkXSA9IHN2Z1tpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHVwLnggPSAwO1xuICAgICAgICAgICAgZHVwLnkgPSAwO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFkZChkdXAsIGJsZWZ0ICsgcGxlZnQsIDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYWRkaW5nKSB7XG4gICAgICAgICAgICBzdmcudyArPSBwYWRkaW5nLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBwYWRkaW5nLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gcGFkZGluZy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgc3ZnLncgKz0gYm9yZGVycy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gYm9yZGVycy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IGJvcmRlcnMuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5iYWNrZ3JvdW5kICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkNPTE9SLlRSQU5TUEFSRU5UKSB7XG4gICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKG5vZGVOYW1lICE9PSBcImdcIiAmJiBub2RlTmFtZSAhPT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gVXRpbC5FbGVtZW50KFwiZ1wiKTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGc7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9SRUNUKHN2Zy5oLCBzdmcuZCwgc3ZnLncsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMuYmFja2dyb3VuZCxcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9KSwgMCwgMCwgZmFsc2UsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICB2YXIgZGQgPSA1O1xuICAgICAgICAgICAgdmFyIHNpZGVzID0ge1xuICAgICAgICAgICAgICAgIGxlZnQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgLWRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIHN2Zy53IC0gYm9yZGVycy5yaWdodCArIGRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHRvcDogW1wiSFwiLCBzdmcudywgMCwgc3ZnLmggLSBib3JkZXJzLnRvcCArIGRkXSxcbiAgICAgICAgICAgICAgICBib3R0b206IFtcIkhcIiwgc3ZnLncsIDAsIC1zdmcuZCAtIGRkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc2lkZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2lkZXMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3JkZXJzW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNpZGUgPSBzaWRlc1tpZF0sIGJveCA9IEJCT1hbc2lkZVswXSArIFwiTElORVwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94KHNpZGVbMV0sIGJvcmRlcnNbaWRdLCBib3JkZXJzW2lkICsgXCJTdHlsZVwiXSwgYm9yZGVyc1tpZCArIFwiQ29sb3JcIl0pLCBzaWRlWzJdLCBzaWRlWzNdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0VmFyaWFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aHZhcmlhbnRcIiwgXCJmb250ZmFtaWx5XCIsIFwiZm9udHdlaWdodFwiLCBcImZvbnRzdHlsZVwiKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB2YWx1ZXMubWF0aHZhcmlhbnQ7XG4gICAgICAgIGlmICh0aGlzLnZhcmlhbnRGb3JtKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCItVGVYLXZhcmlhbnRcIjtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMuaGFzVmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSk7XG4gICAgICAgIGlmICghdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB2YWx1ZXMuZm9udGZhbWlseTtcbiAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB2YWx1ZXMuZm9udHdlaWdodDtcbiAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHZhbHVlcy5mb250c3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB0aGlzLnN0eWxlcy5mb250U3R5bGUpXG4gICAgICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdGhpcy5zdHlsZXMuZm9udFN0eWxlO1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQpXG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQ7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5mYW1pbHkgJiYgdGhpcy5zdHlsZXMuZm9udEZhbWlseSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdGhpcy5zdHlsZXMuZm9udEZhbWlseTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmZhbWlseSAmJiAhdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2JvbGQvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvaXRhbGljLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBmb3JjZUZhbWlseTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb250OiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFsdWVzLmZhbWlseVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFsdWVzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC1zdHlsZVwiXSA9IHZhbHVlcy5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC13ZWlnaHRcIl0gPSB2YWx1ZXMud2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwiYm9sZFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQsXG4gICAgICAgICAgICAgICAgaXRhbGljOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBmcmFrdHVyOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MREZSQUtUVVIsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNDUklQVCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgYm9sZDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULm5vcm1hbCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgXCJib2xkLWZyYWt0dXJcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkZSQUtUVVIsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNjcmlwdFwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0NSSVBULFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnN0eWxlID09PSBcIml0YWxpY1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy5zdHlsZSA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0FOU1NFUklGXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEodmFyaWFudCBpbiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IFwibm9ybWFsXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlRbdmFyaWFudF07XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTY2FsZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHNjYWxlID0gMTtcbiAgICAgICAgaWYgKHRoaXMubXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IHRoaXMuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImZvbnRzaXplXCIpO1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhzaXplID0gKHRoaXMuaXNUb2tlbiA/IHRoaXMgOiB0aGlzLlBhcmVudCgpKS5HZXQoXCJtYXRoc2l6ZVwiKTtcbiAgICAgICAgICAgIGlmICgodGhpcy5zdHlsZXMgfHwge30pLmZvbnRTaXplICYmICF2YWx1ZXMuZm9udHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZm9udHNpemUgPSB0aGlzLnN0eWxlcy5mb250U2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZm9udHNpemUgJiYgIXRoaXMubWF0aHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSB2YWx1ZXMuZm9udHNpemU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdGxldmVsID0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2NhbGUgPSBNYXRoLnBvdyh0aGlzLkdldChcInNjcmlwdHNpemVtdWx0aXBsaWVyXCIpLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRtaW5zaXplID0gVXRpbC5sZW5ndGgyZW0odGhpcy5HZXQoXCJzY3JpcHRtaW5zaXplXCIpKSAvIDEwMDA7XG4gICAgICAgICAgICAgICAgaWYgKHNjYWxlIDwgdmFsdWVzLnNjcmlwdG1pbnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgPSB2YWx1ZXMuc2NyaXB0bWluc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICB0aGlzLm1zY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXRoc2l6ZSkgLyAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcpIHtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb2tlbikge1xuICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSAqPSB0aGlzLm1zY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NhbGUgKiB0aGlzLm1zY2FsZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldE11ID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgbXUgPSAxLCB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIik7XG4gICAgICAgIGlmIChzdmcuc2NhbGUgJiYgc3ZnLnNjYWxlICE9PSAxKSB7XG4gICAgICAgICAgICBtdSA9IDEgLyBzdmcuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCAhPT0gMCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXUgPSBNYXRoLnNxcnQoTWF0aC5wb3codmFsdWVzLnNjcmlwdHNpemVtdWx0aXBsaWVyLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbXU7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdub3RFbXB0eSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHdoaWxlIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoKGRhdGEudHlwZSAhPT0gXCJtcm93XCIgJiYgZGF0YS50eXBlICE9PSBcInRleGF0b21cIikgfHxcbiAgICAgICAgICAgICAgICBkYXRhLmRhdGEubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YSA9IGRhdGEuZGF0YVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgY2FuID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlzRW1iZWxsaXNoZWQoKSkge1xuICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLkNvcmUoKTtcbiAgICAgICAgICAgIGlmIChjb3JlICYmIGNvcmUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjYW4gPSBjb3JlLlNWR2NhblN0cmV0Y2goZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FuICYmIGNvcmUuZm9yY2VTdHJldGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9yY2VTdHJldGNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcoaCwgZCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvU1ZHKHcpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYXV0b2xvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIHRoaXMudHlwZSArIFwiLmpzXCI7XG4gICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIG5hbWUgKyBcIi5qc1wiO1xuICAgICAgICByZXR1cm4gTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBkcmF3IGN1cnNvcicpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIGJiLngsIGJiLnksIGJiLndpZHRoLCBiYi5oZWlnaHQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0U1ZHQkJveCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBlbGVtID0gZWxlbSB8fCB0aGlzLkVkaXRhYmxlU1ZHZWxlbTtcbiAgICAgICAgaWYgKCFlbGVtIHx8ICFlbGVtLm93bmVyU1ZHRWxlbWVudClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGJiID0gZWxlbS5nZXRCQm94KCk7XG4gICAgICAgIGlmIChlbGVtLm5vZGVOYW1lID09PSAndXNlJykge1xuICAgICAgICAgICAgYmIueCArPSBOdW1iZXIoZWxlbS5nZXRBdHRyaWJ1dGUoJ3gnKSk7XG4gICAgICAgICAgICBiYi55ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneScpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gZWxlbS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQoZWxlbS5vd25lclNWR0VsZW1lbnQpO1xuICAgICAgICB2YXIgcHRtcCA9IGVsZW0ub3duZXJTVkdFbGVtZW50LmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHZhciBseCA9IDEgLyAwLCBseSA9IDEgLyAwLCBoeCA9IC0xIC8gMCwgaHkgPSAtMSAvIDA7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54LCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgY2hlY2soYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IGx4LFxuICAgICAgICAgICAgeTogbHksXG4gICAgICAgICAgICB3aWR0aDogaHggLSBseCxcbiAgICAgICAgICAgIGhlaWdodDogaHkgLSBseSxcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gY2hlY2soeCwgeSkge1xuICAgICAgICAgICAgcHRtcC54ID0geDtcbiAgICAgICAgICAgIHB0bXAueSA9IHk7XG4gICAgICAgICAgICB2YXIgcCA9IHB0bXAubWF0cml4VHJhbnNmb3JtKHRyYW5zZm9ybSk7XG4gICAgICAgICAgICBseCA9IE1hdGgubWluKGx4LCBwLngpO1xuICAgICAgICAgICAgbHkgPSBNYXRoLm1pbihseSwgcC55KTtcbiAgICAgICAgICAgIGh4ID0gTWF0aC5tYXgoaHgsIHAueCk7XG4gICAgICAgICAgICBoeSA9IE1hdGgubWF4KGh5LCBwLnkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTUJhc2VNaXhpbjtcbn0oRWxlbWVudEpheCkpO1xudmFyIENoYXJzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDaGFyc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENoYXJzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBDaGFyc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIikucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50ID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCB0ZXh0KSB7XG4gICAgICAgIHZhciBFRElUQUJMRVNWRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIG4sIE4sIGMsIGZvbnQsIFZBUklBTlQsIGksIG0sIGlkLCBNLCBSQU5HRVM7XG4gICAgICAgIGlmICghdmFyaWFudCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhcmlhbnQuZm9yY2VGYW1pbHkpIHtcbiAgICAgICAgICAgIHRleHQgPSBuZXcgQkJPWF9URVhUKHNjYWxlLCB0ZXh0LCB2YXJpYW50LmZvbnQpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKHRleHQpO1xuICAgICAgICAgICAgdGV4dCA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgVkFSSUFOVCA9IHZhcmlhbnQ7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0ZXh0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyaWFudCA9IFZBUklBTlQ7XG4gICAgICAgICAgICBuID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgYyA9IHRleHQuY2hhckF0KGkpO1xuICAgICAgICAgICAgaWYgKG4gPj0gMHhEODAwICYmIG4gPCAweERCRkYpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgbiA9ICgoKG4gLSAweEQ4MDApIDw8IDEwKSArICh0ZXh0LmNoYXJDb2RlQXQoaSkgLSAweERDMDApKSArIDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgaWYgKEZPTlREQVRBLlJlbWFwUGxhbmUxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudiA9IEZPTlREQVRBLlJlbWFwUGxhbmUxKG4sIHZhcmlhbnQpO1xuICAgICAgICAgICAgICAgICAgICBuID0gbnYubjtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IG52LnZhcmlhbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgUkFOR0VTID0gRk9OVERBVEEuUkFOR0VTO1xuICAgICAgICAgICAgICAgIGZvciAoaWQgPSAwLCBNID0gUkFOR0VTLmxlbmd0aDsgaWQgPCBNOyBpZCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLm5hbWUgPT09IFwiYWxwaGFcIiAmJiB2YXJpYW50Lm5vTG93ZXJDYXNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIE4gPSB2YXJpYW50W1wib2Zmc2V0XCIgKyBSQU5HRVNbaWRdLm9mZnNldF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChOICYmIG4gPj0gUkFOR0VTW2lkXS5sb3cgJiYgbiA8PSBSQU5HRVNbaWRdLmhpZ2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLnJlbWFwICYmIFJBTkdFU1tpZF0ucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gTiArIFJBTkdFU1tpZF0ucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gbiAtIFJBTkdFU1tpZF0ubG93ICsgTjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5hZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbiArPSBSQU5HRVNbaWRdLmFkZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcCAmJiB2YXJpYW50LnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgbiA9IHZhcmlhbnQucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAudmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50LnJlbWFwLnZhcmlhbnRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLlJFTUFQW25dICYmICF2YXJpYW50Lm5vUmVtYXApIHtcbiAgICAgICAgICAgICAgICBuID0gRk9OVERBVEEuUkVNQVBbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbblsxXV07XG4gICAgICAgICAgICAgICAgbiA9IG5bMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIChuKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHRleHQgPSBuICsgdGV4dC5zdWJzdHIoaSArIDEpO1xuICAgICAgICAgICAgICAgIG0gPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpID0gLTE7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb250ID0gQ2hhcnNNaXhpbi5sb29rdXBDaGFyKHZhcmlhbnQsIG4pO1xuICAgICAgICAgICAgYyA9IGZvbnRbbl07XG4gICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgIGlmICgoY1s1XSAmJiBjWzVdLnNwYWNlKSB8fCAoY1s1XSA9PT0gXCJcIiAmJiBjWzBdICsgY1sxXSA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLncgKz0gY1syXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBbc2NhbGUsIGZvbnQuaWQgKyBcIi1cIiArIG4udG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCldLmNvbmNhdChjKTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gRihhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQkJPWF9HTFlQSC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IEJCT1hfR0xZUEgucHJvdG90eXBlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2x5cGggPSBuZXcgRihjKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChnbHlwaCwgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0pIHtcbiAgICAgICAgICAgICAgICBjID0gdGhpcy5jcmVhdGVEZWxpbWl0ZXIobiwgMCwgMSwgZm9udCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0uZGlyID09PSBcIlZcIiA/IGMuZCA6IDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuIDw9IDB4RkZGRikge1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIE4gPSBuIC0gMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gPj4gMTApICsgMHhEODAwKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gJiAweDNGRikgKyAweERDMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfVEVYVChzY2FsZSAqIDEwMCAvIEVESVRBQkxFU1ZHLmNvbmZpZy5zY2FsZSwgYywge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6IHZhcmlhbnQuZGVmYXVsdEZhbWlseSB8fCBFRElUQUJMRVNWRy5jb25maWcudW5kZWZpbmVkRmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogKHZhcmlhbnQuaXRhbGljID8gXCJpdGFsaWNcIiA6IFwiXCIpLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6ICh2YXJpYW50LmJvbGQgPyBcImJvbGRcIiA6IFwiXCIpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYm94LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICAgICAgYyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICBjLkFkZChib3gpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYywgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLnNpZ25hbC5Qb3N0KFtcIlNWRyBKYXggLSB1bmtub3duIGNoYXJcIiwgbiwgdmFyaWFudF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAxICYmIGZvbnQuc2tldyAmJiBmb250LnNrZXdbbl0pIHtcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gZm9udC5za2V3W25dICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5sb29rdXBDaGFyID0gZnVuY3Rpb24gKHZhcmlhbnQsIG4pIHtcbiAgICAgICAgdmFyIGksIG07XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXZhcmlhbnQuRk9OVFMpIHtcbiAgICAgICAgICAgIHZhciBGT05UUyA9IEZPTlREQVRBLkZPTlRTO1xuICAgICAgICAgICAgdmFyIGZvbnRzID0gKHZhcmlhbnQuZm9udHMgfHwgRk9OVERBVEEuVkFSSUFOVC5ub3JtYWwuZm9udHMpO1xuICAgICAgICAgICAgaWYgKCEoZm9udHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICBmb250cyA9IFtmb250c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5mb250cyAhPSBmb250cykge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBmb250cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBmb250cy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVFNbZm9udHNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMucHVzaChGT05UU1tmb250c1tpXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdmFyaWFudC5GT05UUy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmb250ID0gdmFyaWFudC5GT05UU1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGZvbnQpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHZhcmlhbnQuRk9OVFM7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkRm9udChmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmb250W25dKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRCbG9jayhmb250LCBuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IFwidW5rbm93blwiXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlciA9IGZ1bmN0aW9uIChjb2RlLCBIVywgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgaWYgKHNjYWxlID09PSB2b2lkIDApIHsgc2NhbGUgPSBudWxsOyB9XG4gICAgICAgIGlmIChmb250ID09PSB2b2lkIDApIHsgZm9udCA9IG51bGw7IH1cbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHNjYWxlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShIVyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgSFcgPSBbSFcsIEhXXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaHcgPSBIV1sxXTtcbiAgICAgICAgSFcgPSBIV1swXTtcbiAgICAgICAgdmFyIGRlbGltID0ge1xuICAgICAgICAgICAgYWxpYXM6IGNvZGUsXG4gICAgICAgICAgICBIVzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGlyOiB1bmRlZmluZWRcbiAgICAgICAgfTtcbiAgICAgICAgd2hpbGUgKGRlbGltLmFsaWFzKSB7XG4gICAgICAgICAgICBjb2RlID0gZGVsaW0uYWxpYXM7XG4gICAgICAgICAgICBkZWxpbSA9IEZPTlREQVRBLkRFTElNSVRFUlNbY29kZV07XG4gICAgICAgICAgICBpZiAoIWRlbGltKSB7XG4gICAgICAgICAgICAgICAgZGVsaW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIEhXOiBbMCwgRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXV0sXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGxvYWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLmxvYWQpIHtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShFRElUQUJMRVNWRy5mb250RGlyICsgXCIvZm9udGRhdGEtXCIgKyBkZWxpbS5sb2FkICsgXCIuanNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGVsaW0uSFcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMF0gKiBzY2FsZSA+PSBIVyAtIDEwIC0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXIgfHwgKGkgPT0gbSAtIDEgJiYgIWRlbGltLnN0cmV0Y2gpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjYWxlICo9IGRlbGltLkhXW2ldWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bM10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSA9IGRlbGltLkhXW2ldWzNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBbY29kZSwgZGVsaW0uSFdbaV1bMV1dLCBmb250KS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSwgTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkZWxpbS5zdHJldGNoKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uZGlyID09IFwiSFwiKSB7XG4gICAgICAgICAgICAgICAgRURJVEFCTEVTVkcuZXh0ZW5kRGVsaW1pdGVySChzdmcsIGh3LCBkZWxpbS5zdHJldGNoLCBzY2FsZSwgZm9udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkZWxpbS5kaXIgPT0gXCJWXCIpIHtcbiAgICAgICAgICAgICAgICBFRElUQUJMRVNWRy5leHRlbmREZWxpbWl0ZXJWKHN2ZywgaHcsIGRlbGltLnN0cmV0Y2gsIHNjYWxlLCBmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5jcmVhdGVDaGFyID0gZnVuY3Rpb24gKHNjYWxlLCBkYXRhLCBmb250KSB7XG4gICAgICAgIHZhciB0ZXh0ID0gXCJcIiwgdmFyaWFudCA9IHtcbiAgICAgICAgICAgIGZvbnRzOiBbZGF0YVsxXV0sXG4gICAgICAgICAgICBub1JlbWFwOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEKSB7XG4gICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gW2RhdGFbMV0gKyBcIi1ib2xkXCIsIGRhdGFbMV1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgKGRhdGFbMV0pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gZGF0YVsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGRhdGFbMF0ubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbMF1baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNF0pIHtcbiAgICAgICAgICAgIHNjYWxlID0gc2NhbGUgKiBkYXRhWzRdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICBpZiAoZGF0YVsyXSkge1xuICAgICAgICAgICAgc3ZnLnggPSBkYXRhWzJdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVszXSkge1xuICAgICAgICAgICAgc3ZnLnkgPSBkYXRhWzNdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs1XSkge1xuICAgICAgICAgICAgc3ZnLmggKz0gZGF0YVs1XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNl0pIHtcbiAgICAgICAgICAgIHN2Zy5kICs9IGRhdGFbNl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmZpbmRCbG9jayA9IGZ1bmN0aW9uIChmb250LCBjKSB7XG4gICAgICAgIGlmIChmb250LlJhbmdlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBmb250LlJhbmdlcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IGZvbnQuUmFuZ2VzW2ldWzBdKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gZm9udC5SYW5nZXNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBmb250LlJhbmdlc1tpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGZvbnQuUmFuZ2VzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9udC5SYW5nZXNbal1bMl0gPT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQuUmFuZ2VzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQuZGlyZWN0b3J5ICsgXCIvXCIgKyBmaWxlICsgXCIuanNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvYWRGb250ID0gZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmZvbnREaXIgKyBcIi9cIiArIGZpbGUpKTtcbiAgICB9O1xuICAgIHJldHVybiBDaGFyc01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgRW50aXR5TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhFbnRpdHlNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBFbnRpdHlNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEVudGl0eU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy50b1N0cmluZygpLnJlcGxhY2UoL1tcXHUyMDYxLVxcdTIwNjRdL2csIFwiXCIpO1xuICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgIHRleHQgPSByZW1hcCh0ZXh0LCBjaGFycyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW50aXR5TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBIb2xlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoSG9sZSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBIb2xlKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgSG9sZS5wcm90b3R5cGUuSW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50eXBlID0gXCJob2xlXCI7XG4gICAgICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBIb2xlLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAoZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuc2ggPSBoO1xuICAgICAgICAgICAgc3ZnLnNkID0gZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOT05UUklWSUFMIEhPTEUhISEnKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdmFyIGhvbGUgPSBuZXcgQkJPWF9SRUNUKDQwMCwgMCwgMzAwLCB7XG4gICAgICAgICAgICBmaWxsOiAnd2hpdGUnLFxuICAgICAgICAgICAgc3Ryb2tlOiAnYmx1ZScsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAnMjAnXG4gICAgICAgIH0pO1xuICAgICAgICBzdmcuQWRkKGhvbGUsIDAsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSG9sZSBkb2VzIG5vdCBoYXZlIGEgY2hpbGQnKTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChiYm94LndpZHRoIC8gMi4wKTtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdCh0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQsIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gSG9sZTtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1BY3Rpb25NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1BY3Rpb25NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQWN0aW9uTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQWN0aW9uTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1BY3Rpb25NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1hdGhNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1hdGhNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNYXRoTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoc3BhbiwgZGl2LCByZXBsYWNlKSB7XG4gICAgICAgIHZhciBDT05GSUcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWc7XG4gICAgICAgIHRoaXMubG9hZFRleGlmeSgpO1xuICAgICAgICBpZiAoIXRoaXMuZGF0YVswXSlcbiAgICAgICAgICAgIHJldHVybiBzcGFuO1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5QWxpZ24gPSBNYXRoSmF4Lkh1Yi5jb25maWcuZGlzcGxheUFsaWduO1xuICAgICAgICBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5SW5kZW50ID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlJbmRlbnQ7XG4gICAgICAgIGlmIChTdHJpbmcoTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlJbmRlbnQpLm1hdGNoKC9eMCgkfFthLXolXSkvaSkpXG4gICAgICAgICAgICBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5SW5kZW50ID0gXCIwXCI7XG4gICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIHZhciBkYXRhU3ZnID0gdGhpcy5kYXRhWzBdLnRvU1ZHKCk7XG4gICAgICAgIGJveC5BZGQoZGF0YVN2ZywgMCwgMCwgdHJ1ZSk7XG4gICAgICAgIGJveC5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKGJveCk7XG4gICAgICAgIFV0aWwuRWxlbWVudChib3guZWxlbWVudCwge1xuICAgICAgICAgICAgc3Ryb2tlOiBcImN1cnJlbnRDb2xvclwiLFxuICAgICAgICAgICAgZmlsbDogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICB0cmFuc2Zvcm06IFwibWF0cml4KDEgMCAwIC0xIDAgMClcIlxuICAgICAgICB9KTtcbiAgICAgICAgYm94LnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1NWRygpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4bWxuczp4bGlua1wiLCBVdGlsLlhMSU5LTlMpO1xuICAgICAgICBpZiAoQ09ORklHLnVzZUZvbnRDYWNoZSAmJiAhQ09ORklHLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5hcHBlbmRDaGlsZChCQk9YLmRlZnMpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm94KTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgaWYgKCFzcGFuKSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIik7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsID0gTWF0aC5tYXgoLXN2Zy5sLCAwKSwgciA9IE1hdGgubWF4KHN2Zy5yIC0gc3ZnLncsIDApO1xuICAgICAgICB2YXIgc3R5bGUgPSBzdmcuZWxlbWVudC5zdHlsZTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgVXRpbC5FeChsICsgc3ZnLncgKyByKSk7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcImhlaWdodFwiLCBVdGlsLkV4KHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSkpO1xuICAgICAgICBzdHlsZS52ZXJ0aWNhbEFsaWduID0gVXRpbC5FeCgtc3ZnLkQgLSAyICogVXRpbC5lbSk7XG4gICAgICAgIHN0eWxlLm1hcmdpbkxlZnQgPSBVdGlsLkV4KC1sKTtcbiAgICAgICAgc3R5bGUubWFyZ2luUmlnaHQgPSBVdGlsLkV4KC1yKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidmlld0JveFwiLCBVdGlsLkZpeGVkKC1sLCAxKSArIFwiIFwiICsgVXRpbC5GaXhlZCgtc3ZnLkggLSBVdGlsLmVtLCAxKSArIFwiIFwiICtcbiAgICAgICAgICAgIFV0aWwuRml4ZWQobCArIHN2Zy53ICsgciwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoc3ZnLkggKyBzdmcuRCArIDIgKiBVdGlsLmVtLCAxKSk7XG4gICAgICAgIHN0eWxlLm1hcmdpblRvcCA9IHN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiMXB4XCI7XG4gICAgICAgIGlmIChzdmcuSCA+IHN2Zy5oKSB7XG4gICAgICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBVdGlsLkV4KHN2Zy5oIC0gc3ZnLkgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuRCA+IHN2Zy5kKSB7XG4gICAgICAgICAgICBzdHlsZS5tYXJnaW5Cb3R0b20gPSBVdGlsLkV4KHN2Zy5kIC0gc3ZnLkQpO1xuICAgICAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5kKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYWx0dGV4dCA9IHRoaXMuR2V0KFwiYWx0dGV4dFwiKTtcbiAgICAgICAgaWYgKGFsdHRleHQgJiYgIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgYWx0dGV4dCk7XG4gICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZ2V0QXR0cmlidXRlKFwicm9sZVwiKSlcbiAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcIm1hdGhcIik7XG4gICAgICAgIHN2Zy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3JlbmRlcmVkLXN2Zy1vdXRwdXQnKTtcbiAgICAgICAgdmFyIHByZXZpb3VzID0gc3Bhbi5xdWVyeVNlbGVjdG9yKCcucmVuZGVyZWQtc3ZnLW91dHB1dCcpO1xuICAgICAgICBpZiAocmVwbGFjZSAmJiBwcmV2aW91cykge1xuICAgICAgICAgICAgc3Bhbi5yZXBsYWNlQ2hpbGQoc3ZnLmVsZW1lbnQsIHByZXZpb3VzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgaWYgKCF0aGlzLmlzTXVsdGlsaW5lICYmIHRoaXMuR2V0KFwiZGlzcGxheVwiKSA9PT0gXCJibG9ja1wiICYmICFzdmcuaGFzSW5kZW50KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJpbmRlbnRhbGlnbmZpcnN0XCIsIFwiaW5kZW50c2hpZnRmaXJzdFwiLCBcImluZGVudGFsaWduXCIsIFwiaW5kZW50c2hpZnRcIik7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduZmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uSU5ERU5UQUxJR04pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ25maXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50YWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uQVVUTykge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHRoaXMuZGlzcGxheUFsaWduO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVFNISUZULklOREVOVFNISUZUKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudHNoaWZ0ID0gdmFsdWVzLmluZGVudHNoaWZ0Zmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0ID09PSBcImF1dG9cIikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IFwiMFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNoaWZ0ID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmluZGVudHNoaWZ0LCAxLCB0aGlzLmVkaXRhYmxlU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5kaXNwbGF5SW5kZW50ICE9PSBcIjBcIikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRlbnQgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLmRpc3BsYXlJbmRlbnQsIDEsIHRoaXMuZWRpdGFibGVTVkcuY3dpZHRoKTtcbiAgICAgICAgICAgICAgICBzaGlmdCArPSAodmFsdWVzLmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLlJJR0hUID8gLWluZGVudCA6IGluZGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXYuc3R5bGUudGV4dEFsaWduID0gdmFsdWVzLmluZGVudGFsaWduO1xuICAgICAgICAgICAgaWYgKHNoaWZ0KSB7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5IdWIuSW5zZXJ0KHN0eWxlLCAoe1xuICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiBVdGlsLkV4KHNoaWZ0KVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IFV0aWwuRXgoLXNoaWZ0KVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IFV0aWwuRXgoc2hpZnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IFV0aWwuRXgoLXNoaWZ0KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlbdmFsdWVzLmluZGVudGFsaWduXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNwYW47XG4gICAgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLmxvYWRUZXhpZnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZSgndGV4aWZ5Jyk7XG4gICAgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLmluc3RhbGxDdXJzb3JMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIGlkID0gJCh0aGF0LkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuYXR0cihcImlkXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlZ2lzdGVyaW5nIGxpc3RlbmVycyBvbiBJRDogXCIsIGlkKTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgbW92ZV9pbnRvX2Zyb21fbGVmdFwiLCBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgaWYgKGFyZ3NbMV0gIT0gaWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuU3RhcnR1cC5zaWduYWwuQ2xlYXIoKTtcbiAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0aGF0LmN1cnNvcjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR290IG1vdmUgaW50byBmcm9tIGxlZnQhIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgJCh0aGF0LkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5NZXNzYWdlSG9vayhcIkVkaXRhYmxlU1ZHIG1vdmVfaW50b19mcm9tX3JpZ2h0XCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5TdGFydHVwLnNpZ25hbC5DbGVhcigpO1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRoYXQuY3Vyc29yO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3QgbW92ZSBpbnRvIGZyb20gcmlnaHQhIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uTEVGVCk7XG4gICAgICAgICAgICAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLk1lc3NhZ2VIb29rKFwiRWRpdGFibGVTVkcgbW92ZV9pbnRvX2Zyb21fdG9wXCIsIGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1sxXSAhPSBpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5TdGFydHVwLnNpZ25hbC5DbGVhcigpO1xuICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRoYXQuY3Vyc29yO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3QgbW92ZSBpbnRvIGZyb20gdG9wISBJRDogXCIpO1xuICAgICAgICAgICAgdGhhdC5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgRGlyZWN0aW9uLlVQKTtcbiAgICAgICAgICAgICQodGhhdC5FZGl0YWJsZVNWR2VsZW0pLnBhcmVudCgpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuTWVzc2FnZUhvb2soXCJFZGl0YWJsZVNWRyBtb3ZlX2ludG9fZnJvbV9ib3R0b21cIiwgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzWzFdICE9IGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlN0YXJ0dXAuc2lnbmFsLkNsZWFyKCk7XG4gICAgICAgICAgICB2YXIgY3Vyc29yID0gdGhhdC5jdXJzb3I7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBtb3ZlIGludG8gZnJvbSBib3R0b20hIElEOiBcIik7XG4gICAgICAgICAgICB0aGF0LmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAkKHRoYXQuRWRpdGFibGVTVkdlbGVtKS5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzLkVkaXRhYmxlU1ZHZWxlbSkucGFyZW50KCkuYXR0cihcImlkXCIpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBtb3ZlX2N1cnNvcl9sZWZ0XCIsIGlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgTWF0aEpheC5oaXRlU2lnbmFsLlBvc3QoW1wiRWRpdGFibGVTVkcgbW92ZV9jdXJzb3JfcmlnaHRcIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICBNYXRoSmF4LmhpdGVTaWduYWwuUG9zdChbXCJFZGl0YWJsZVNWRyBtb3ZlX2N1cnNvcl91cFwiLCBpZF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIE1hdGhKYXguaGl0ZVNpZ25hbC5Qb3N0KFtcIkVkaXRhYmxlU1ZHIG1vdmVfY3Vyc29yX2Rvd25cIiwgaWRdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRXJyb3JNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FcnJvck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FcnJvck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKGRlZik7XG4gICAgICAgIGJib3guQWRkKHRoaXMuU1ZHY2hpbGRTVkcoMCkpO1xuICAgICAgICBiYm94LkNsZWFuKCk7XG4gICAgICAgIGlmIChzY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgYmJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ID0gW1wid1wiLCBcImhcIiwgXCJkXCIsIFwibFwiLCBcInJcIiwgXCJEXCIsIFwiSFwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gYWRqdXN0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGJib3hbYWRqdXN0W2ldXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3BhbiA9IFV0aWwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5tZXJyb3JTdHlsZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuSW5zZXJ0KHRoaXMuc3R5bGVzLCB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTUVycm9yTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNRmVuY2VkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRmVuY2VkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZlbmNlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZlbmNlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEub3Blbikge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5vcGVuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAxLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbXCJzZXBcIiArIGldKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbXCJzZXBcIiArIGldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YS5jbG9zZSkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5jbG9zZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLlN0cmV0Y2goKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1GZW5jZWRNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1GcmFjTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRnJhY01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GcmFjTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgZnJhYyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGZyYWMuc2NhbGUgPSBzdmcuc2NhbGU7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2UoZnJhYyk7XG4gICAgICAgIHZhciBudW0gPSB0aGlzLlNWR2NoaWxkU1ZHKDApLCBkZW4gPSB0aGlzLlNWR2NoaWxkU1ZHKDEpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJsaW5ldGhpY2tuZXNzXCIsIFwibnVtYWxpZ25cIiwgXCJkZW5vbWFsaWduXCIsIFwiYmV2ZWxsZWRcIik7XG4gICAgICAgIHZhciBpc0Rpc3BsYXkgPSB2YWx1ZXMuZGlzcGxheXN0eWxlO1xuICAgICAgICB2YXIgYSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIGlmICh2YWx1ZXMuYmV2ZWxsZWQpIHtcbiAgICAgICAgICAgIHZhciBkZWx0YSA9IChpc0Rpc3BsYXkgPyA0MDAgOiAxNTApO1xuICAgICAgICAgICAgdmFyIEggPSBNYXRoLm1heChudW0uaCArIG51bS5kLCBkZW4uaCArIGRlbi5kKSArIDIgKiBkZWx0YTtcbiAgICAgICAgICAgIHZhciBiZXZlbCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MkYsIEgpO1xuICAgICAgICAgICAgZnJhYy5BZGQobnVtLCAwLCAobnVtLmQgLSBudW0uaCkgLyAyICsgYSArIGRlbHRhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGJldmVsLCBudW0udyAtIGRlbHRhIC8gMiwgKGJldmVsLmQgLSBiZXZlbC5oKSAvIDIgKyBhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGRlbiwgbnVtLncgKyBiZXZlbC53IC0gZGVsdGEsIChkZW4uZCAtIGRlbi5oKSAvIDIgKyBhIC0gZGVsdGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIFcgPSBNYXRoLm1heChudW0udywgZGVuLncpO1xuICAgICAgICAgICAgdmFyIHQgPSBVdGlsLnRoaWNrbmVzczJlbSh2YWx1ZXMubGluZXRoaWNrbmVzcywgdGhpcy5zY2FsZSkgKiB0aGlzLm1zY2FsZSwgcCwgcSwgdSwgdjtcbiAgICAgICAgICAgIHZhciBtdCA9IFV0aWwuVGVYLm1pbl9ydWxlX3RoaWNrbmVzcyAvIFV0aWwuZW0gKiAxMDAwO1xuICAgICAgICAgICAgaWYgKGlzRGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHUgPSBVdGlsLlRlWC5udW0xO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1ID0gKHQgPT09IDAgPyBVdGlsLlRlWC5udW0zIDogVXRpbC5UZVgubnVtMik7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHUgKj0gc2NhbGU7XG4gICAgICAgICAgICB2ICo9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDcgOiAzKSAqIFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzLCAyICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgICAgICB2ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLncgPSBXO1xuICAgICAgICAgICAgICAgIHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyAyIDogMCkgKiBtdCArIHQsIHQgLyAyICsgMS41ICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChhICsgdCAvIDIpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBxID0gKGEgLSB0IC8gMikgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdiArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy5BZGQobmV3IEJCT1hfUkVDVCh0IC8gMiwgdCAvIDIsIFcgKyAyICogdCksIDAsIGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhYy5BbGlnbihudW0sIHZhbHVlcy5udW1hbGlnbiwgdCwgdSk7XG4gICAgICAgICAgICBmcmFjLkFsaWduKGRlbiwgdmFsdWVzLmRlbm9tYWxpZ24sIHQsIC12KTtcbiAgICAgICAgfVxuICAgICAgICBmcmFjLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5BZGQoZnJhYywgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMudGV4V2l0aERlbGltcyAmJiAhdGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy5YID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZS5jYWxsKHRoaXMsIHN2Zyk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIG1pZGxpbmVZID0gYmIueSArIChiYi5oZWlnaHQgLyAyLjApO1xuICAgICAgICB2YXIgbWlkbGluZVggPSBiYi54ICsgKGJiLndpZHRoIC8gMi4wKTtcbiAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgcG9zaXRpb246ICh4IDwgbWlkbGluZVgpID8gMCA6IDEsXG4gICAgICAgICAgICBoYWxmOiAoeSA8IG1pZGxpbmVZKSA/IDAgOiAxLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yJyk7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCwga2VlcCkge1xuICAgICAgICB2YXIgaXNOdW1lcmF0b3IgPSB0aGlzLmRhdGFbMF0gPT09IGNoaWxkO1xuICAgICAgICB2YXIgaXNEZW5vbWluYXRvciA9IHRoaXMuZGF0YVsxXSA9PT0gY2hpbGQ7XG4gICAgICAgIGlmICghaXNOdW1lcmF0b3IgJiYgIWlzRGVub21pbmF0b3IpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NwZWNpZmllZCBjaGlsZCBub3QgZm91bmQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKGlzTnVtZXJhdG9yICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzRGVub21pbmF0b3IgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChrZWVwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoaXNOdW1lcmF0b3IgPyAwIDogMSwgY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b0hhbGYgPSBmdW5jdGlvbiAoaGFsZiwgY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtoYWxmXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtoYWxmXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgICAgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbaGFsZl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKGJiICYmIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgaGFsZjogaGFsZixcbiAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9OdW1lcmF0b3IgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoMCwgYywgZCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDEsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLkxFRlQ6XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5SSUdIVDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhWzBdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgICAgICAgICAgaGFsZjogMCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMCA6IDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5VUDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLkRPV046XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvcicpO1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA/IGJib3gud2lkdGggKyAxMDAgOiAtMTAwKTtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5uYW1lID0gXCJtZnJhY1wiO1xuICAgIHJldHVybiBNRnJhY01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTUdseXBoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNR2x5cGhNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNR2x5cGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1HbHlwaE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIDtcbiAgICByZXR1cm4gTUdseXBoTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNTXVsdGlTY3JpcHRzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNTXVsdGlTY3JpcHRzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTU11bHRpU2NyaXB0c01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTU11bHRpU2NyaXB0c01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNTXVsdGlTY3JpcHRzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW5NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5nZXRDdXJzb3JMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0uZGF0YVswXS5sZW5ndGg7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmdldEN1cnNvckxlbmd0aCgpKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCk7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHRoaXMuZGF0YVtjaGlsZElkeF07XG4gICAgICAgICAgICB2YXIgYmIgPSBjaGlsZC5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYi54ICsgKGJiLndpZHRoIC8gMik7XG4gICAgICAgICAgICBpZiAoeCA8IG1pZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgcHJlZWRnZTtcbiAgICAgICAgdmFyIHBvc3RlZGdlO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICBwcmVlZGdlID0gYmJveC54O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZWJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24gLSAxXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwcmVlZGdlID0gcHJlYm94LnggKyBwcmVib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBiYm94LnggKyBiYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBvc3Rib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IHBvc3Rib3gueDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCA9IChwb3N0ZWRnZSArIHByZWVkZ2UpIC8gMjtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNbk1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTW9NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1vTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW9NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1vTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIGlmIChIVyA9PT0gdm9pZCAwKSB7IEhXID0gbnVsbDsgfVxuICAgICAgICBpZiAoRCA9PT0gdm9pZCAwKSB7IEQgPSBudWxsOyB9XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibGFyZ2VvcFwiLCBcImRpc3BsYXlzdHlsZVwiKTtcbiAgICAgICAgaWYgKHZhbHVlcy5sYXJnZW9wKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCItbGFyZ2VPcFwiIDogXCItc21hbGxPcFwiXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5Db3JlUGFyZW50KCk7XG4gICAgICAgIHZhciBpc1NjcmlwdCA9IChwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXApICYmIHRoaXMgIT09IHBhcmVudC5kYXRhWzBdKTtcbiAgICAgICAgdmFyIG1hcGNoYXJzID0gKGlzU2NyaXB0ID8gdGhpcy5yZW1hcENoYXJzIDogbnVsbCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgcGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRk9OVERBVEEuUkVNQVBBQ0NFTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2NyaXB0ICYmIHRoaXMuZGF0YS5qb2luKFwiXCIpLm1hdGNoKC9bJ2BcIlxcdTAwQjRcXHUyMDMyLVxcdTIwMzdcXHUyMDU3XS8pKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtcIi1UZVgtdmFyaWFudFwiXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzY2FsZSwgdGhpcy5yZW1hcCwgbWFwY2hhcnMpLCB4ID0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IDAgJiYgLXRleHQubCA+IDEwICogdGV4dC53KSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gLXRleHQubDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0LCB4LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gdGV4dC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgc3ZnLnkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChzdmcuaCAtIHN2Zy5kKSAvIDIgLyBzY2FsZTtcbiAgICAgICAgICAgIGlmIChzdmcuciA+IHN2Zy53KSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghdGhpcy5HZXQoXCJzdHJldGNoeVwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjID0gdGhpcy5kYXRhLmpvaW4oXCJcIik7XG4gICAgICAgIGlmIChjLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5Db3JlUGFyZW50KCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm11bmRlcm92ZXIpICYmXG4gICAgICAgICAgICB0aGlzLkNvcmVUZXh0KHBhcmVudC5kYXRhW3BhcmVudC5iYXNlXSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgb3ZlciA9IHBhcmVudC5kYXRhW3BhcmVudC5vdmVyXSwgdW5kZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQudW5kZXJdO1xuICAgICAgICAgICAgaWYgKG92ZXIgJiYgdGhpcyA9PT0gb3Zlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50XCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UW2NdIHx8IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBjID0gRk9OVERBVEEuUkVNQVBBQ0NFTlRVTkRFUltjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGMgPSBGT05UREFUQS5ERUxJTUlURVJTW2MuY2hhckNvZGVBdCgwKV07XG4gICAgICAgIHZhciBjYW4gPSAoYyAmJiBjLmRpciA9PSBkaXJlY3Rpb24uc3Vic3RyKDAsIDEpKTtcbiAgICAgICAgaWYgKCFjYW4pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN2ZztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZvcmNlU3RyZXRjaCA9IGNhbiAmJiAodGhpcy5HZXQoXCJtaW5zaXplXCIsIHRydWUpIHx8IHRoaXMuR2V0KFwibWF4c2l6ZVwiLCB0cnVlKSk7XG4gICAgICAgIHJldHVybiBjYW47XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInN5bW1ldHJpY1wiLCBcIm1heHNpemVcIiwgXCJtaW5zaXplXCIpO1xuICAgICAgICB2YXIgYXhpcyA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc3ZnLnNjYWxlLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKSwgSDtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAyICogTWF0aC5tYXgoaCAtIGF4aXMsIGQgKyBheGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSBoICsgZDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcuaCArIHN2Zy5kKTtcbiAgICAgICAgSCA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgSCkpO1xuICAgICAgICBpZiAoSCAhPSB2YWx1ZXMubWluc2l6ZSkge1xuICAgICAgICAgICAgSCA9IFtNYXRoLm1heChIICogVXRpbC5UZVguZGVsaW1pdGVyZmFjdG9yIC8gMTAwMCwgSCAtIFV0aWwuVGVYLmRlbGltaXRlcnNob3J0ZmFsbCksIEhdO1xuICAgICAgICB9XG4gICAgICAgIHN2ZyA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIEgsIHN2Zy5zY2FsZSk7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gKHN2Zy5oICsgc3ZnLmQpIC8gMiArIGF4aXM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gKHN2Zy5oICsgc3ZnLmQpICogaCAvIChoICsgZCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLnkgPSBIIC0gc3ZnLmg7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICBkZWxldGUgdGhpcy5zdmcuZWxlbWVudDtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBzdmcuc3RyZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnIHx8IHRoaXMudG9TVkcoKSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcIm1heHNpemVcIiwgXCJtaW5zaXplXCIsIFwibWF0aHZhcmlhbnRcIiwgXCJmb250d2VpZ2h0XCIpO1xuICAgICAgICBpZiAoKHZhbHVlcy5mb250d2VpZ2h0ID09PSBcImJvbGRcIiB8fCBwYXJzZUludCh2YWx1ZXMuZm9udHdlaWdodCkgPj0gNjAwKSAmJlxuICAgICAgICAgICAgIXRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRodmFyaWFudCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5tYXhzaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1heHNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHcgPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIHcpKTtcbiAgICAgICAgc3ZnID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgdywgc3ZnLnNjYWxlLCB2YWx1ZXMubWF0aHZhcmlhbnQpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTW9NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1QYWRkZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QYWRkZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGFkZGVkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBwYWQgPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiLCBcImxzcGFjZVwiLCBcInZvZmZzZXRcIiksIFggPSAwLCBZID0gMDtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgWCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLmxzcGFjZSwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy52b2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgWSA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLnZvZmZzZXQsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoID0gcGFkLmgsIGQgPSBwYWQuZCwgdyA9IHBhZC53LCB5ID0gcGFkLnk7XG4gICAgICAgICAgICBzdmcuQWRkKHBhZCwgWCwgWSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHN2Zy5oID0gaCArIHk7XG4gICAgICAgICAgICBzdmcuZCA9IGQgLSB5O1xuICAgICAgICAgICAgc3ZnLncgPSB3O1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaGVpZ2h0ICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmggPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5oZWlnaHQsIG11LCBcImhcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmRlcHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmQgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5kZXB0aCwgbXUsIFwiZFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcudyA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLndpZHRoLCBtdSwgXCJ3XCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5oID4gc3ZnLkgpIHtcbiAgICAgICAgICAgICAgICBzdmcuSCA9IHN2Zy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgaWYgKHN2Zy5kID4gc3ZnLkQpIHtcbiAgICAgICAgICAgICAgICBzdmcuRCA9IHN2Zy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS5TVkdsZW5ndGgyZW0gPSBmdW5jdGlvbiAoc3ZnLCBsZW5ndGgsIG11LCBkLCBtKSB7XG4gICAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgICAgIG0gPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF0Y2ggPSBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvd2lkdGh8aGVpZ2h0fGRlcHRoLyk7XG4gICAgICAgIHZhciBzaXplID0gKG1hdGNoID8gc3ZnW21hdGNoWzBdLmNoYXJBdCgwKV0gOiAoZCA/IHN2Z1tkXSA6IDApKTtcbiAgICAgICAgdmFyIHYgPSBVdGlsLmxlbmd0aDJlbShsZW5ndGgsIG11LCBzaXplIC8gdGhpcy5tc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIGlmIChkICYmIFN0cmluZyhsZW5ndGgpLm1hdGNoKC9eXFxzKlstK10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KG0sIHN2Z1tkXSArIHYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNUGFkZGVkTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUGhhbnRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBoYW50b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGhhbnRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBoYW50b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHdoaWxlIChzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiAhc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVBoYW50b21NaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TcXJ0TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3FydE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcXJ0TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3FydE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCk7XG4gICAgICAgIHZhciBydWxlO1xuICAgICAgICB2YXIgc3VyZDtcbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgdmFyIHE7XG4gICAgICAgIHZhciBIO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIoMHgyMjFBLCBILCBzY2FsZSk7XG4gICAgICAgIGlmIChzdXJkLmggKyBzdXJkLmQgPiBIKSB7XG4gICAgICAgICAgICBxID0gKChzdXJkLmggKyBzdXJkLmQpIC0gKEggLSB0KSkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGUgPSBuZXcgQkJPWF9SRUNUKHQsIDAsIGJhc2Uudyk7XG4gICAgICAgIEggPSBiYXNlLmggKyBxICsgdDtcbiAgICAgICAgeCA9IHRoaXMuU1ZHYWRkUm9vdChzdmcsIHN1cmQsIHgsIHN1cmQuaCArIHN1cmQuZCAtIEgsIHNjYWxlKTtcbiAgICAgICAgc3ZnLkFkZChzdXJkLCB4LCBIIC0gc3VyZC5oKTtcbiAgICAgICAgc3ZnLkFkZChydWxlLCB4ICsgc3VyZC53LCBIIC0gcnVsZS5oKTtcbiAgICAgICAgc3ZnLkFkZChiYXNlLCB4ICsgc3VyZC53LCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5oICs9IHQ7XG4gICAgICAgIHN2Zy5IICs9IHQ7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH07XG4gICAgcmV0dXJuIE1TcXJ0TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUm9vdE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvb3RNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm9vdE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCk7XG4gICAgICAgIHZhciBydWxlO1xuICAgICAgICB2YXIgc3VyZDtcbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgdmFyIHE7XG4gICAgICAgIHZhciBIO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIoMHgyMjFBLCBILCBzY2FsZSk7XG4gICAgICAgIGlmIChzdXJkLmggKyBzdXJkLmQgPiBIKSB7XG4gICAgICAgICAgICBxID0gKChzdXJkLmggKyBzdXJkLmQpIC0gKEggLSB0KSkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGUgPSBuZXcgQkJPWF9SRUNUKHQsIDAsIGJhc2Uudyk7XG4gICAgICAgIEggPSBiYXNlLmggKyBxICsgdDtcbiAgICAgICAgeCA9IHRoaXMuU1ZHYWRkUm9vdChzdmcsIHN1cmQsIHgsIHN1cmQuaCArIHN1cmQuZCAtIEgsIHNjYWxlKTtcbiAgICAgICAgc3ZnLkFkZChzdXJkLCB4LCBIIC0gc3VyZC5oKTtcbiAgICAgICAgc3ZnLkFkZChydWxlLCB4ICsgc3VyZC53LCBIIC0gcnVsZS5oKTtcbiAgICAgICAgc3ZnLkFkZChiYXNlLCB4ICsgc3VyZC53LCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5oICs9IHQ7XG4gICAgICAgIHN2Zy5IICs9IHQ7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHZhciBkeCA9IChzdXJkLmlzTXVsdGlDaGFyID8gLjU1IDogLjY1KSAqIHN1cmQudztcbiAgICAgICAgaWYgKHRoaXMuZGF0YVsxXSkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmRhdGFbMV0udG9TVkcoKTtcbiAgICAgICAgICAgIHJvb3QueCA9IDA7XG4gICAgICAgICAgICB2YXIgaCA9IHRoaXMuU1ZHcm9vdEhlaWdodChzdXJkLmggKyBzdXJkLmQsIHNjYWxlLCByb290KSAtIGQ7XG4gICAgICAgICAgICB2YXIgdyA9IE1hdGgubWluKHJvb3Qudywgcm9vdC5yKTtcbiAgICAgICAgICAgIHggPSBNYXRoLm1heCh3LCBkeCk7XG4gICAgICAgICAgICBzdmcuQWRkKHJvb3QsIHggLSB3LCBoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGR4ID0geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCAtIGR4O1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHcm9vdEhlaWdodCA9IGZ1bmN0aW9uIChkLCBzY2FsZSwgcm9vdCkge1xuICAgICAgICByZXR1cm4gLjQ1ICogKGQgLSA5MDAgKiBzY2FsZSkgKyA2MDAgKiBzY2FsZSArIE1hdGgubWF4KDAsIHJvb3QuZCAtIDc1KTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGMsIGQsIHRoaXMpO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGMsIGQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1Sb290TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNUm93TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm93TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvd01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmb2N1cyEnKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKGQgIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLnNoID0gaDtcbiAgICAgICAgICAgIHN2Zy5zZCA9IGQ7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLlN0cmV0Y2goKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09PSAxICYmIHRoaXMuZGF0YVswXSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGFbMF0uRWRpdGFibGVTVkdkYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuc2tldykge1xuICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gZGF0YS5za2V3O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLlNWR2xpbmVCcmVha3Moc3ZnKSlcbiAgICAgICAgICAgIHN2ZyA9IHRoaXMuU1ZHbXVsdGlsaW5lKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMucGFyZW50LmxpbmVicmVha0NvbnRhaW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmxpbmVicmVha3MuYXV0b21hdGljICYmXG4gICAgICAgICAgICBzdmcudyA+IHRoaXMuZWRpdGFibGVTVkcubGluZWJyZWFrV2lkdGgpIHx8IHRoaXMuaGFzTmV3bGluZSgpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdtdWx0aWxpbmUgPSBmdW5jdGlvbiAoc3Bhbikge1xuICAgICAgICByZXR1cm4gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZEZpbGUoXCJtdWx0aWxpbmVcIik7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZChpLCB3KSwgc3ZnLncsIDApO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JQYXNzdGhyb3VnaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGlmICh0aGlzLmlzQ3Vyc29yUGFzc3Rocm91Z2goKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24gJiZcbiAgICAgICAgICAgIHRoaXMubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLngsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGlmICh0aGlzLmlzQ3Vyc29yUGFzc3Rocm91Z2goKSB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBmb3IgKHZhciBjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBmb3IgKHZhciBjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gdGhpcy5kYXRhW2NoaWxkSWR4XTtcbiAgICAgICAgICAgIHZhciBiYiA9IGNoaWxkLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmIpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYi54ICsgKGJiLndpZHRoIC8gMik7XG4gICAgICAgICAgICBpZiAoeCA8IG1pZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICBpZiAodmVydGljYWwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIHZhciBuZXdQb3NpdGlvbiA9IGN1cnNvci5wb3NpdGlvbiArIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gLTEgOiAxKTtcbiAgICAgICAgaWYgKG5ld1Bvc2l0aW9uIDwgMCB8fCBuZXdQb3NpdGlvbiA+IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZFBvc2l0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IGN1cnNvci5wb3NpdGlvbiAtIDEgOiBjdXJzb3IucG9zaXRpb247XG4gICAgICAgIGlmIChjdXJzb3IubW9kZSA9PT0gY3Vyc29yLlNFTEVDVElPTikge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjaGlsZFBvc2l0aW9uXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbikpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgcHJlZWRnZTtcbiAgICAgICAgdmFyIHBvc3RlZGdlO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICBwcmVlZGdlID0gYmJveC54O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZWJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24gLSAxXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwcmVlZGdlID0gcHJlYm94LnggKyBwcmVib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gdGhpcy5kYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBiYm94LnggKyBiYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBvc3Rib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IHBvc3Rib3gueDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCA9IChwb3N0ZWRnZSArIHByZWVkZ2UpIC8gMjtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHZhciBjdXIgPSBjdXJzb3Iuc2VsZWN0aW9uU3RhcnQubm9kZTtcbiAgICAgICAgICAgIHZhciBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1ci5wYXJlbnQgPT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLmRhdGEuaW5kZXhPZihjdXIpICsgMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggc2VsZWN0aW9uU3RhcnQgbm90IGluIG1yb3dcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rpb25FbmQubm9kZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHNlbGVjdGlvblN0YXJ0IG5vdCBpbiBtcm93XCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3MxID0gTWF0aC5taW4oY3Vyc29yLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCBjdXJzb3Iuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgdmFyIHBvczIgPSBNYXRoLm1heChjdXJzb3Iuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIGN1cnNvci5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICBpZiAocG9zMSA9PT0gcG9zMikge1xuICAgICAgICAgICAgY3Vyc29yLmNsZWFySGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHgxID0gdGhpcy5kYXRhW3BvczFdLmdldFNWR0JCb3goKS54O1xuICAgICAgICB2YXIgcG9zMmJiID0gdGhpcy5kYXRhW3BvczIgLSAxXS5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciB4MiA9IHBvczJiYi54ICsgcG9zMmJiLndpZHRoO1xuICAgICAgICB2YXIgd2lkdGggPSB4MiAtIHgxO1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3SGlnaGxpZ2h0QXQoc3ZnZWxlbSwgeDEsIGJiLnksIHdpZHRoLCBiYi5oZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1Sb3dNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1zTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1zTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNc01peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVNwYWNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3BhY2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3BhY2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TcGFjZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiKTtcbiAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5tYXRoYmFja2dyb3VuZDtcbiAgICAgICAgaWYgKHRoaXMuYmFja2dyb3VuZCAmJiAhdGhpcy5tYXRoYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5iYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMubXNjYWxlLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgc3ZnLmggPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuaGVpZ2h0LCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLmQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuZGVwdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgaWYgKHN2Zy53IDwgMCkge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcudztcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA8IC1zdmcuZCkge1xuICAgICAgICAgICAgc3ZnLmQgPSAtc3ZnLmg7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLmwgPSAwO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVNwYWNlTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNU3R5bGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdHlsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdHlsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgbWF0aCA9IHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBpZiAobWF0aC5pYykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IG1hdGguaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoSCh3KSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hWKGgsIGQpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIHJldHVybiBNU3R5bGVNaXhpbjtcbn0oTUJhc2VNaXhpbikpO1xudmFyIE1TdWJTdXBNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdWJTdXBNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3ViU3VwTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLmVuZGluZ1BvcyA9IDE7XG4gICAgfVxuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCh0aGlzLmJhc2UsIEhXLCBEKSk7XG4gICAgICAgIHZhciBzc2NhbGUgPSAodGhpcy5kYXRhW3RoaXMuc3VwXSB8fCB0aGlzLmRhdGFbdGhpcy5zdWJdIHx8IHRoaXMpLlNWR2dldFNjYWxlKCk7XG4gICAgICAgIHZhciB4X2hlaWdodCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGUsIHMgPSBVdGlsLlRlWC5zY3JpcHRzcGFjZSAqIHNjYWxlO1xuICAgICAgICB2YXIgc3VwLCBzdWI7XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1cF0pKSB7XG4gICAgICAgICAgICBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdXAudyArPSBzO1xuICAgICAgICAgICAgc3VwLnIgPSBNYXRoLm1heChzdXAudywgc3VwLnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1Yl0pKSB7XG4gICAgICAgICAgICBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdWIudyArPSBzO1xuICAgICAgICAgICAgc3ViLnIgPSBNYXRoLm1heChzdWIudywgc3ViLnIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBxID0gVXRpbC5UZVguc3VwX2Ryb3AgKiBzc2NhbGUsIHIgPSBVdGlsLlRlWC5zdWJfZHJvcCAqIHNzY2FsZTtcbiAgICAgICAgdmFyIHUgPSBiYXNlLmggKyAoYmFzZS55IHx8IDApIC0gcSwgdiA9IGJhc2UuZCAtIChiYXNlLnkgfHwgMCkgKyByLCBkZWx0YSA9IDAsIHA7XG4gICAgICAgIGlmIChiYXNlLmljKSB7XG4gICAgICAgICAgICBiYXNlLncgLT0gYmFzZS5pYztcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0gJiZcbiAgICAgICAgICAgICh0aGlzLmRhdGFbdGhpcy5iYXNlXS50eXBlID09PSBcIm1pXCIgfHwgdGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtb1wiKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgYmFzZS5zY2FsZSA9PT0gMSAmJlxuICAgICAgICAgICAgICAgICFiYXNlLnN0cmV0Y2hlZCAmJiAhdGhpcy5kYXRhW3RoaXMuYmFzZV0uR2V0KFwibGFyZ2VvcFwiKSkge1xuICAgICAgICAgICAgICAgIHUgPSB2ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgbWluID0gdGhpcy5nZXRWYWx1ZXMoXCJzdWJzY3JpcHRzaGlmdFwiLCBcInN1cGVyc2NyaXB0c2hpZnRcIik7XG4gICAgICAgIG1pbi5zdWJzY3JpcHRzaGlmdCA9IChtaW4uc3Vic2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1YnNjcmlwdHNoaWZ0LCBtdSkpO1xuICAgICAgICBtaW4uc3VwZXJzY3JpcHRzaGlmdCA9IChtaW4uc3VwZXJzY3JpcHRzaGlmdCA9PT0gXCJcIiA/IDAgOiBVdGlsLmxlbmd0aDJlbShtaW4uc3VwZXJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgdmFyIHggPSBiYXNlLncgKyBiYXNlLng7XG4gICAgICAgIGlmICghc3VwKSB7XG4gICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjEgKiBzY2FsZSwgc3ViLmggLSAoNCAvIDUpICogeF9oZWlnaHQsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC12KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC12O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFzdWIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJ0ZXhwcmltZXN0eWxlXCIpO1xuICAgICAgICAgICAgICAgIHAgPSBVdGlsLlRlWFsodmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwic3VwMVwiIDogKHZhbHVlcy50ZXhwcmltZXN0eWxlID8gXCJzdXAzXCIgOiBcInN1cDJcIikpXTtcbiAgICAgICAgICAgICAgICB1ID0gTWF0aC5tYXgodSwgcCAqIHNjYWxlLCBzdXAuZCArICgxIC8gNCkgKiB4X2hlaWdodCwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIHUpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSB1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjIgKiBzY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIGlmICgodSAtIHN1cC5kKSAtIChzdWIuaCAtIHYpIDwgMyAqIHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IDMgKiB0IC0gdSArIHN1cC5kICsgc3ViLmg7XG4gICAgICAgICAgICAgICAgICAgIHEgPSAoNCAvIDUpICogeF9oZWlnaHQgLSAodSAtIHN1cC5kKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHEgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1ICs9IHE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2IC09IHE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1YiwgeCwgLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN1YlN1cE1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGFibGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJjb2x1bW5hbGlnblwiLCBcInJvd2FsaWduXCIsIFwiY29sdW1uc3BhY2luZ1wiLCBcInJvd3NwYWNpbmdcIiwgXCJjb2x1bW53aWR0aFwiLCBcImVxdWFsY29sdW1uc1wiLCBcImVxdWFscm93c1wiLCBcImNvbHVtbmxpbmVzXCIsIFwicm93bGluZXNcIiwgXCJmcmFtZVwiLCBcImZyYW1lc3BhY2luZ1wiLCBcImFsaWduXCIsIFwidXNlSGVpZ2h0XCIsIFwid2lkdGhcIiwgXCJzaWRlXCIsIFwibWlubGFiZWxzcGFjaW5nXCIpO1xuICAgICAgICBpZiAodmFsdWVzLndpZHRoLm1hdGNoKC8lJC8pKSB7XG4gICAgICAgICAgICBzdmcud2lkdGggPSB2YWx1ZXMud2lkdGggPSBVdGlsLkVtKChVdGlsLmN3aWR0aCAvIDEwMDApICogKHBhcnNlRmxvYXQodmFsdWVzLndpZHRoKSAvIDEwMCkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIExBQkVMID0gLTE7XG4gICAgICAgIHZhciBIID0gW10sIEQgPSBbXSwgVyA9IFtdLCBBID0gW10sIEMgPSBbXSwgaSwgaiwgSiA9IC0xLCBtLCBNLCBzLCByb3csIGNlbGwsIG1vLCBIRDtcbiAgICAgICAgdmFyIExIID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEubGluZUggKiBzY2FsZSAqIHZhbHVlcy51c2VIZWlnaHQsIExEID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEubGluZUQgKiBzY2FsZSAqIHZhbHVlcy51c2VIZWlnaHQ7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICByb3cgPSB0aGlzLmRhdGFbaV07XG4gICAgICAgICAgICBzID0gKHJvdy50eXBlID09PSBcIm1sYWJlbGVkdHJcIiA/IExBQkVMIDogMCk7XG4gICAgICAgICAgICBBW2ldID0gW107XG4gICAgICAgICAgICBIW2ldID0gTEg7XG4gICAgICAgICAgICBEW2ldID0gTEQ7XG4gICAgICAgICAgICBmb3IgKGogPSBzLCBNID0gcm93LmRhdGEubGVuZ3RoICsgczsgaiA8IE07IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChXW2pdID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGogPiBKKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBKID0gajtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBDW2pdID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNlbGwgPSByb3cuZGF0YVtqIC0gc107XG4gICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwudG9TVkcoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2VsbC5pc0VtYmVsbGlzaGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbW8gPSBjZWxsLkNvcmVNTygpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWluID0gbW8uR2V0KFwibWluc2l6ZVwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1pbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhEID0gbW8uRWRpdGFibGVTVkdkYXRhLmggKyBtby5FZGl0YWJsZVNWR2RhdGEuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSEQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluID0gVXRpbC5sZW5ndGgyZW0obWluLCBtdSwgSEQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluICogbW8uRWRpdGFibGVTVkdkYXRhLmggLyBIRCA+IEhbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhbaV0gPSBtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuaCAvIEhEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtaW4gKiBtby5FZGl0YWJsZVNWR2RhdGEuZCAvIEhEID4gRFtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRFtpXSA9IG1pbiAqIG1vLkVkaXRhYmxlU1ZHZGF0YS5kIC8gSEQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChtby5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbiA9IFV0aWwubGVuZ3RoMmVtKG1pbiwgbXUsIG1vLkVkaXRhYmxlU1ZHZGF0YS53KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWluID4gV1tqXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXW2pdID0gbWluO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS5oID4gSFtpXSkge1xuICAgICAgICAgICAgICAgICAgICBIW2ldID0gQVtpXVtqXS5oO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS5kID4gRFtpXSkge1xuICAgICAgICAgICAgICAgICAgICBEW2ldID0gQVtpXVtqXS5kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXS53ID4gV1tqXSkge1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gQVtpXVtqXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgU1BMSVQgPSBNYXRoSmF4Lkh1Yi5TcGxpdExpc3Q7XG4gICAgICAgIHZhciBDU1BBQ0UgPSBTUExJVCh2YWx1ZXMuY29sdW1uc3BhY2luZyksIFJTUEFDRSA9IFNQTElUKHZhbHVlcy5yb3dzcGFjaW5nKSwgQ0FMSUdOID0gU1BMSVQodmFsdWVzLmNvbHVtbmFsaWduKSwgUkFMSUdOID0gU1BMSVQodmFsdWVzLnJvd2FsaWduKSwgQ0xJTkVTID0gU1BMSVQodmFsdWVzLmNvbHVtbmxpbmVzKSwgUkxJTkVTID0gU1BMSVQodmFsdWVzLnJvd2xpbmVzKSwgQ1dJRFRIID0gU1BMSVQodmFsdWVzLmNvbHVtbndpZHRoKSwgUkNBTElHTiA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gQ1NQQUNFLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgQ1NQQUNFW2ldID0gVXRpbC5sZW5ndGgyZW0oQ1NQQUNFW2ldLCBtdSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbSA9IFJTUEFDRS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIFJTUEFDRVtpXSA9IFV0aWwubGVuZ3RoMmVtKFJTUEFDRVtpXSwgbXUpO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChDU1BBQ0UubGVuZ3RoIDwgSikge1xuICAgICAgICAgICAgQ1NQQUNFLnB1c2goQ1NQQUNFW0NTUEFDRS5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENBTElHTi5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgQ0FMSUdOLnB1c2goQ0FMSUdOW0NBTElHTi5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKENMSU5FUy5sZW5ndGggPCBKKSB7XG4gICAgICAgICAgICBDTElORVMucHVzaChDTElORVNbQ0xJTkVTLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoQ1dJRFRILmxlbmd0aCA8PSBKKSB7XG4gICAgICAgICAgICBDV0lEVEgucHVzaChDV0lEVEhbQ1dJRFRILmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoUlNQQUNFLmxlbmd0aCA8IEEubGVuZ3RoKSB7XG4gICAgICAgICAgICBSU1BBQ0UucHVzaChSU1BBQ0VbUlNQQUNFLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoUkFMSUdOLmxlbmd0aCA8PSBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUkFMSUdOLnB1c2goUkFMSUdOW1JBTElHTi5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKFJMSU5FUy5sZW5ndGggPCBBLmxlbmd0aCkge1xuICAgICAgICAgICAgUkxJTkVTLnB1c2goUkxJTkVTW1JMSU5FUy5sZW5ndGggLSAxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKENbTEFCRUxdKSB7XG4gICAgICAgICAgICBDQUxJR05bTEFCRUxdID0gKHZhbHVlcy5zaWRlLnN1YnN0cigwLCAxKSA9PT0gXCJsXCIgPyBcImxlZnRcIiA6IFwicmlnaHRcIik7XG4gICAgICAgICAgICBDU1BBQ0VbTEFCRUxdID0gLVdbTEFCRUxdO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgcm93ID0gdGhpcy5kYXRhW2ldO1xuICAgICAgICAgICAgUkNBTElHTltpXSA9IFtdO1xuICAgICAgICAgICAgaWYgKHJvdy5yb3dhbGlnbikge1xuICAgICAgICAgICAgICAgIFJBTElHTltpXSA9IHJvdy5yb3dhbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyb3cuY29sdW1uYWxpZ24pIHtcbiAgICAgICAgICAgICAgICBSQ0FMSUdOW2ldID0gU1BMSVQocm93LmNvbHVtbmFsaWduKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoUkNBTElHTltpXS5sZW5ndGggPD0gSikge1xuICAgICAgICAgICAgICAgICAgICBSQ0FMSUdOW2ldLnB1c2goUkNBTElHTltpXVtSQ0FMSUdOW2ldLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5lcXVhbHJvd3MpIHtcbiAgICAgICAgICAgIHZhciBIbSA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIEgpLCBEbSA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIEQpO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcyA9ICgoSG0gKyBEbSkgLSAoSFtpXSArIERbaV0pKSAvIDI7XG4gICAgICAgICAgICAgICAgSFtpXSArPSBzO1xuICAgICAgICAgICAgICAgIERbaV0gKz0gcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBIRCA9IEhbMF0gKyBEW0EubGVuZ3RoIC0gMV07XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSBBLmxlbmd0aCAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIEhEICs9IE1hdGgubWF4KDAsIERbaV0gKyBIW2kgKyAxXSArIFJTUEFDRVtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZ4ID0gMCwgZnkgPSAwLCBmVywgZkggPSBIRDtcbiAgICAgICAgaWYgKHZhbHVlcy5mcmFtZSAhPT0gXCJub25lXCIgfHxcbiAgICAgICAgICAgICh2YWx1ZXMuY29sdW1ubGluZXMgKyB2YWx1ZXMucm93bGluZXMpLm1hdGNoKC9zb2xpZHxkYXNoZWQvKSkge1xuICAgICAgICAgICAgdmFyIGZyYW1lU3BhY2luZyA9IFNQTElUKHZhbHVlcy5mcmFtZXNwYWNpbmcpO1xuICAgICAgICAgICAgaWYgKGZyYW1lU3BhY2luZy5sZW5ndGggIT0gMikge1xuICAgICAgICAgICAgICAgIGZyYW1lU3BhY2luZyA9IFNQTElUKHRoaXMuZGVmYXVsdHMuZnJhbWVzcGFjaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ4ID0gVXRpbC5sZW5ndGgyZW0oZnJhbWVTcGFjaW5nWzBdLCBtdSk7XG4gICAgICAgICAgICBmeSA9IFV0aWwubGVuZ3RoMmVtKGZyYW1lU3BhY2luZ1sxXSwgbXUpO1xuICAgICAgICAgICAgZkggPSBIRCArIDIgKiBmeTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgWSwgZlksIG4gPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mICh2YWx1ZXMuYWxpZ24pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YWx1ZXMuYWxpZ24gPSBTdHJpbmcodmFsdWVzLmFsaWduKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmFsaWduLm1hdGNoKC8odG9wfGJvdHRvbXxjZW50ZXJ8YmFzZWxpbmV8YXhpcykoICsoLT9cXGQrKSk/LykpIHtcbiAgICAgICAgICAgIG4gPSBSZWdFeHAuJDMgfHwgXCJcIjtcbiAgICAgICAgICAgIHZhbHVlcy5hbGlnbiA9IFJlZ0V4cC4kMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlcy5hbGlnbiA9IHRoaXMuZGVmYXVsdHMuYWxpZ247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG4gIT09IFwiXCIpIHtcbiAgICAgICAgICAgIG4gPSBwYXJzZUludChuKTtcbiAgICAgICAgICAgIGlmIChuIDwgMCkge1xuICAgICAgICAgICAgICAgIG4gPSBBLmxlbmd0aCArIDEgKyBuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gPCAxKSB7XG4gICAgICAgICAgICAgICAgbiA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChuID4gQS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBuID0gQS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBZID0gMDtcbiAgICAgICAgICAgIGZZID0gLShIRCArIGZ5KSArIEhbMF07XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gbiAtIDE7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZFkgPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICAgICAgICAgIFkgKz0gZFk7XG4gICAgICAgICAgICAgICAgZlkgKz0gZFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBZID0gKHtcbiAgICAgICAgICAgICAgICB0b3A6IC0oSFswXSArIGZ5KSxcbiAgICAgICAgICAgICAgICBib3R0b206IEhEICsgZnkgLSBIWzBdLFxuICAgICAgICAgICAgICAgIGNlbnRlcjogSEQgLyAyIC0gSFswXSxcbiAgICAgICAgICAgICAgICBiYXNlbGluZTogSEQgLyAyIC0gSFswXSxcbiAgICAgICAgICAgICAgICBheGlzOiBIRCAvIDIgKyBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlIC0gSFswXVxuICAgICAgICAgICAgfSlbdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgIGZZID0gKHtcbiAgICAgICAgICAgICAgICB0b3A6IC0oSEQgKyAyICogZnkpLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgICAgICBjZW50ZXI6IC0oSEQgLyAyICsgZnkpLFxuICAgICAgICAgICAgICAgIGJhc2VsaW5lOiAtKEhEIC8gMiArIGZ5KSxcbiAgICAgICAgICAgICAgICBheGlzOiBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlIC0gSEQgLyAyIC0gZnlcbiAgICAgICAgICAgIH0pW3ZhbHVlcy5hbGlnbl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIFdXLCBXUCA9IDAsIFd0ID0gMCwgV3AgPSAwLCBwID0gMCwgZiA9IDAsIFAgPSBbXSwgRiA9IFtdLCBXZiA9IDE7XG4gICAgICAgIGlmICh2YWx1ZXMuZXF1YWxjb2x1bW5zICYmIHZhbHVlcy53aWR0aCAhPT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgIFdXID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gTWF0aC5taW4oSiArIDEsIENTUEFDRS5sZW5ndGgpOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1cgLT0gQ1NQQUNFW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgV1cgLz0gSiArIDE7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gTWF0aC5taW4oSiArIDEsIENXSURUSC5sZW5ndGgpOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1tpXSA9IFdXO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDV0lEVEgubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChDV0lEVEhbaV0gPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIFd0ICs9IFdbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKENXSURUSFtpXSA9PT0gXCJmaXRcIikge1xuICAgICAgICAgICAgICAgICAgICBGW2ZdID0gaTtcbiAgICAgICAgICAgICAgICAgICAgZisrO1xuICAgICAgICAgICAgICAgICAgICBXdCArPSBXW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChDV0lEVEhbaV0ubWF0Y2goLyUkLykpIHtcbiAgICAgICAgICAgICAgICAgICAgUFtwXSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIHArKztcbiAgICAgICAgICAgICAgICAgICAgV3AgKz0gV1tpXTtcbiAgICAgICAgICAgICAgICAgICAgV1AgKz0gVXRpbC5sZW5ndGgyZW0oQ1dJRFRIW2ldLCBtdSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBXW2ldID0gVXRpbC5sZW5ndGgyZW0oQ1dJRFRIW2ldLCBtdSk7XG4gICAgICAgICAgICAgICAgICAgIFd0ICs9IFdbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53aWR0aCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoV1AgPiAuOTgpIHtcbiAgICAgICAgICAgICAgICAgICAgV2YgPSBXcCAvIChXdCArIFdwKTtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXdCArIFdwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBXdCAvICgxIC0gV1ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFdXID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IE1hdGgubWluKEogKyAxLCBDU1BBQ0UubGVuZ3RoKTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBXVyAtPSBDU1BBQ0VbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IFAubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgV1tQW2ldXSA9IFV0aWwubGVuZ3RoMmVtKENXSURUSFtQW2ldXSwgbXUsIFdXICogV2YpO1xuICAgICAgICAgICAgICAgIFd0ICs9IFdbUFtpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoV1cgLSBXdCkgPiAuMDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZiAmJiBXVyA+IFd0KSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gKFdXIC0gV3QpIC8gZjtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IEYubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBXW0ZbaV1dICs9IFdXO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IFdXIC8gV3Q7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPD0gSjsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBXW2pdICo9IFdXO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5lcXVhbGNvbHVtbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgV20gPSBNYXRoLm1heC5hcHBseShNYXRoLCBXKTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBXW2pdID0gV207XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB5ID0gWSwgZHksIGFsaWduO1xuICAgICAgICBzID0gKENbTEFCRUxdID8gTEFCRUwgOiAwKTtcbiAgICAgICAgZm9yIChqID0gczsgaiA8PSBKOyBqKyspIHtcbiAgICAgICAgICAgIENbal0udyA9IFdbal07XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gQS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoQVtpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICBzID0gKHRoaXMuZGF0YVtpXS50eXBlID09PSBcIm1sYWJlbGVkdHJcIiA/IExBQkVMIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwgPSB0aGlzLmRhdGFbaV0uZGF0YVtqIC0gc107XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZWxsLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBW2ldW2pdID0gY2VsbC5TVkdzdHJldGNoSChXW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjZWxsLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbW8gPSBjZWxsLkNvcmVNTygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN5bW1ldHJpYyA9IG1vLnN5bW1ldHJpYztcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vLnN5bW1ldHJpYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgQVtpXVtqXSA9IGNlbGwuU1ZHc3RyZXRjaFYoSFtpXSwgRFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtby5zeW1tZXRyaWMgPSBzeW1tZXRyaWM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPSBjZWxsLnJvd2FsaWduIHx8IHRoaXMuZGF0YVtpXS5yb3dhbGlnbiB8fCBSQUxJR05baV07XG4gICAgICAgICAgICAgICAgICAgIGR5ID0gKHsgdG9wOiBIW2ldIC0gQVtpXVtqXS5oLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiBBW2ldW2pdLmQgLSBEW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoKEhbaV0gLSBEW2ldKSAtIChBW2ldW2pdLmggLSBBW2ldW2pdLmQpKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlbGluZTogMCwgYXhpczogMCB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPSAoY2VsbC5jb2x1bW5hbGlnbiB8fCBSQ0FMSUdOW2ldW2pdIHx8IENBTElHTltqXSk7XG4gICAgICAgICAgICAgICAgICAgIENbal0uQWxpZ24oQVtpXVtqXSwgYWxpZ24sIDAsIHkgKyBkeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpIDwgQS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gTWF0aC5tYXgoMCwgRFtpXSArIEhbaSArIDFdICsgUlNQQUNFW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB5ID0gWTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbHcgPSAxLjUgKiBVdGlsLmVtO1xuICAgICAgICB2YXIgeCA9IGZ4IC0gbHcgLyAyO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDw9IEo7IGorKykge1xuICAgICAgICAgICAgc3ZnLkFkZChDW2pdLCB4LCAwKTtcbiAgICAgICAgICAgIHggKz0gV1tqXSArIENTUEFDRVtqXTtcbiAgICAgICAgICAgIGlmIChDTElORVNbal0gIT09IFwibm9uZVwiICYmIGogPCBKICYmIGogIT09IExBQkVMKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIENMSU5FU1tqXSksIHggLSBDU1BBQ0Vbal0gLyAyLCBmWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLncgKz0gZng7XG4gICAgICAgIHN2Zy5kID0gLWZZO1xuICAgICAgICBzdmcuaCA9IGZIICsgZlk7XG4gICAgICAgIGZXID0gc3ZnLnc7XG4gICAgICAgIGlmICh2YWx1ZXMuZnJhbWUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkgKyBmSCAtIGx3KTtcbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfSExJTkUoZlcsIGx3LCB2YWx1ZXMuZnJhbWUpLCAwLCBmWSk7XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1ZMSU5FKGZILCBsdywgdmFsdWVzLmZyYW1lKSwgMCwgZlkpO1xuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9WTElORShmSCwgbHcsIHZhbHVlcy5mcmFtZSksIGZXIC0gbHcsIGZZKTtcbiAgICAgICAgfVxuICAgICAgICB5ID0gWSAtIGx3IC8gMjtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IEEubGVuZ3RoIC0gMTsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgZHkgPSBNYXRoLm1heCgwLCBEW2ldICsgSFtpICsgMV0gKyBSU1BBQ0VbaV0pO1xuICAgICAgICAgICAgaWYgKFJMSU5FU1tpXSAhPT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX0hMSU5FKGZXLCBsdywgUkxJTkVTW2ldKSwgMCwgeSAtIERbaV0gLSAoZHkgLSBEW2ldIC0gSFtpICsgMV0pIC8gMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB5IC09IGR5O1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgaWYgKENbTEFCRUxdKSB7XG4gICAgICAgICAgICBzdmcudHcgPSBNYXRoLm1heChzdmcudywgc3ZnLnIpIC0gTWF0aC5taW4oMCwgc3ZnLmwpO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudGFsaWduID0gaW5kZW50LmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5kZW50LmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnQuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpbmRlbnQuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIGluZGVudC5pbmRlbnRzaGlmdCA9IGluZGVudC5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluZGVudC5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIgfHwgaW5kZW50LmluZGVudHNoaWZ0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50LmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBVdGlsLmxlbmd0aDJlbShpbmRlbnQuaW5kZW50c2hpZnQsIG11LCBVdGlsLmN3aWR0aCk7XG4gICAgICAgICAgICB2YXIgbGFiZWxzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5sYWJlbHNwYWNpbmcsIG11LCBVdGlsLmN3aWR0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5kaXNwbGF5SW5kZW50ICE9PSBcIjBcIikge1xuICAgICAgICAgICAgICAgIHZhciBkSW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCBtdSwgVXRpbC5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIHNoaWZ0ICs9IChpbmRlbnQuaW5kZW50QWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uUklHSFQgPyAtZEluZGVudCA6IGRJbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGVxbiA9IHN2ZztcbiAgICAgICAgICAgIHN2ZyA9IG5ldyBCQk9YX1NWRygpO1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuY3dpZHRoO1xuICAgICAgICAgICAgc3ZnLmhhc0luZGVudCA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWxpZ24oQ1tMQUJFTF0sIENBTElHTltMQUJFTF0sIGxhYmVsc2hpZnQsIDApO1xuICAgICAgICAgICAgc3ZnLkFsaWduKGVxbiwgaW5kZW50LmluZGVudGFsaWduLCAwLCAwLCBzaGlmdCk7XG4gICAgICAgICAgICBzdmcudHcgKz0gQ1tMQUJFTF0udyArIHNoaWZ0ICtcbiAgICAgICAgICAgICAgICAoaW5kZW50LmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkNFTlRFUiA/IDggOiA0KSAqIGxhYmVsc2hpZnQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRnJhbWUgJiYgIXN2Zy53aWR0aCkge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IDE2NztcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlLmNhbGwodGhpcywgc3ZnKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgICAgIHZhciBtdGQgPSBtdHIuZGF0YVswXTtcbiAgICAgICAgICAgIHJldHVybiBtdGQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICB2YXIgbXRyID0gdGhpcy5kYXRhW3RoaXMuZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHZhciBtdGQgPSBtdHIuZGF0YVttdHIuZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiBtdGQuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRPRE86IHVuaW1wbGVtZW50ZWQgZGlyZWN0aW9uIGZvciBtb3ZlQ3Vyc29yRnJvbVBhcmVudCBpbiBtdGFibGVfbWl4aW4udHNcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmVDdXJzb3JGcm9tQ2hpbGQgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSwgY2xpZW50WCwgY2xpZW50WSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ciA9IHRoaXMuZGF0YVtpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbXRyLmRhdGEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbXRkID0gbXRyLmRhdGFbal07XG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBtdGQuZGF0YVswXTtcbiAgICAgICAgICAgICAgICBpZiAoVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludChub2RlLCBjbGllbnRYLCBjbGllbnRZKSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcIkRpZG4ndCBtYW5hZ2UgdG8gbW92ZSBjdXJzb3JcIik7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmVDdXJzb3IgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcImRyYXdDdXJzb3IgY2FsbGVkIVwiKTtcbiAgICB9O1xuICAgIE1UYWJsZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBjb25zb2xlLmxvZygnZHJhd0N1cnNvckhpZ2hsaWdodCBjYWxsZWQhJyk7XG4gICAgfTtcbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUuYWRkUm93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgTU1MID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbDtcbiAgICAgICAgdmFyIG51bUNvbHMgPSB0aGlzLmRhdGFbMF0uZGF0YS5sZW5ndGg7XG4gICAgICAgIHZhciBuZXdSb3cgPSBuZXcgTU1MLm10cigpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNvbHM7IGkrKykge1xuICAgICAgICAgICAgdmFyIG10ZCA9IG5ldyBNTUwubXRkKCk7XG4gICAgICAgICAgICBtdGQuU2V0RGF0YSgwLCBuZXcgTU1MLmhvbGUoKSk7XG4gICAgICAgICAgICBuZXdSb3cuU2V0RGF0YShpLCBtdGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU2V0RGF0YSh0aGlzLmRhdGEubGVuZ3RoLCBuZXdSb3cpO1xuICAgIH07XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLmFkZENvbHVtbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbXRkID0gbmV3IE1NTC5tdGQoKTtcbiAgICAgICAgICAgIG10ZC5TZXREYXRhKDAsIG5ldyBNTUwuaG9sZSgpKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtpXS5TZXREYXRhKHRoaXMuZGF0YVtpXS5kYXRhLmxlbmd0aCwgbXRkKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZU1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgTVRhYmxlUm93TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVSb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGFibGVSb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UYWJsZVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm10ciBtb3ZlQ3Vyc29yRnJvbUNoaWxkIGNhbGxlZCFcIik7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlUm93TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVGFibGVDZWxsTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVDZWxsTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlQ2VsbE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRhYmxlQ2VsbE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMucGFyZW50O1xuICAgICAgICB2YXIgbXRhYmxlID0gdGhpcy5wYXJlbnQucGFyZW50O1xuICAgICAgICB2YXIgY29sSW5kZXggPSByb3cuZGF0YS5pbmRleE9mKHRoaXMpO1xuICAgICAgICB2YXIgcm93SW5kZXggPSBtdGFibGUuZGF0YS5pbmRleE9mKHJvdyk7XG4gICAgICAgIHZhciB3ID0gcm93LmRhdGEubGVuZ3RoO1xuICAgICAgICB2YXIgaCA9IG10YWJsZS5kYXRhLmxlbmd0aDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGlmIChjb2xJbmRleCA9PSB3IC0gMSkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvck10ZCA9IHJvdy5kYXRhW2NvbEluZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgaWYgKGNvbEluZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICBtdGFibGUucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIG10YWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSByb3cuZGF0YVtjb2xJbmRleCAtIDFdO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yTXRkLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIGlmIChyb3dJbmRleCA9PSBoIC0gMSkge1xuICAgICAgICAgICAgICAgIG10YWJsZS5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgbXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvclJvdyA9IG10YWJsZS5kYXRhW3Jvd0luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yTXRkID0gbmVpZ2hib3JSb3cuZGF0YVtjb2xJbmRleF07XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JNdGQubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgIGlmIChyb3dJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbXRhYmxlLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCBtdGFibGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yUm93ID0gbXRhYmxlLmRhdGFbcm93SW5kZXggLSAxXTtcbiAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3JNdGQgPSBuZWlnaGJvclJvdy5kYXRhW2NvbEluZGV4XTtcbiAgICAgICAgICAgICAgICBuZWlnaGJvck10ZC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1UYWJsZUNlbGxNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIHJldHVybiBNVGFibGVDZWxsTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVGV4dE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRleHRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGV4dE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRleHRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgICAgICB2YXIgZGVmID0geyBkaXJlY3Rpb246IHRoaXMuR2V0KFwiZGlyXCIpIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVEVYVChzY2FsZSAqIDEwMCAvIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5zY2FsZSwgdGhpcy5kYXRhLmpvaW4oXCJcIiksIGRlZikpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UZXh0TWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBNVW5kZXJPdmVyTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVW5kZXJPdmVyTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVVuZGVyT3Zlck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAwO1xuICAgICAgICB0aGlzLnJpZ2h0TW92ZVN0YXkgPSB0cnVlO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufShNQmFzZU1peGluKSk7XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2VtYW50aWNzTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbnZhciBUZVhBdG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhUZVhBdG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVGVYQXRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVEVYQ0xBU1MuVkNFTlRFUikge1xuICAgICAgICAgICAgICAgIHkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChib3guaCArIGJveC5kKSAvIDIgKyBib3guZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94LCAwLCB5KTtcbiAgICAgICAgICAgIHN2Zy5pYyA9IGJveC5pYztcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gYm94LnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVYQXRvbSBkcmF3Q3Vyc29yIE5PVCBJTVBMRU1FTlRFRCcpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBUZVhBdG9tTWl4aW47XG59KE1CYXNlTWl4aW4pKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
