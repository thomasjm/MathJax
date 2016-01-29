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
        if (!this.node || !this.node.EditableSVGelem || !this.node.EditableSVGelem.ownerSVGElement
            || !this.node.EditableSVGelem.ownerSVGElement.parentNode)
            return false;
        this.node.EditableSVGelem.ownerSVGElement.parentNode.focus();
        this.draw();
    };
    Cursor.prototype.moveToClick = function (event) {
        var target = event.target;
        var svg = target.nodeName === 'svg' ? target : target.ownerSVGElement;
        if (!svg)
            return;
        var cp = Util.screenCoordsToElemCoords(svg, event.clientX, event.clientY);
        var jax = Util.getJaxFromMath(svg.parentNode);
        var current = jax.root;
        while (true) {
            var matchedItems = current.data.filter(function (node) {
                if (node === null)
                    return false;
                return Util.nodeContainsScreenPoint(node, event.clientX, event.clientY);
            });
            if (matchedItems.length > 1) {
                console.error('huh? matched more than one child');
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
        current.moveCursorFromClick(this, cp.x, cp.y);
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
                this.exitBackslashMode();
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
        if (direction) {
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
            this.node.parent.SetData(ppos++, replace);
        }
        if (replace && replace.moveCursorAfter) {
            this.moveTo.apply(this, replace.moveCursorAfter);
        }
        else {
            this.moveTo(this.node.parent, ppos);
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
                    this.exitBackslashMode();
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
    Cursor.prototype.makeParser = function () {
        var obj = {
            mmlToken: function (x) {
                return x;
            },
            Push: function (x) {
                this.result = x;
            },
            noop: function () { },
            parseControlSequence: function (cs) {
                if (this.checkSpecialCS(cs))
                    return this.result;
                this.cs = cs;
                this.csUndefined = this.csFindMacro = this.noop;
                this.ControlSequence();
                delete this.csFindMacro;
                delete this.csUndefined;
                return this.result;
            },
            GetCS: function () {
                return this.cs;
            },
            checkSpecialCS: function (cs) {
                if (cs === 'frac') {
                    var hole = new MathJax.ElementJax.mml.hole();
                    var result = new MathJax.ElementJax.mml.mfrac(hole, new MathJax.ElementJax.mml.hole());
                    result.moveCursorAfter = [hole, 0];
                    return this.result = result;
                }
                if (cs === 'sqrt') {
                    var result = new MathJax.ElementJax.mml.msqrt();
                    var hole = new MathJax.ElementJax.mml.hole();
                    result.SetData(0, hole);
                    result.moveCursorAfter = [hole, 0];
                    return this.result = result;
                }
                if (MathJax.InputJax.TeX.Definitions.macros[cs]) {
                    console.log(MathJax.InputJax.TeX.Definitions.macros[cs]);
                    var namedDirectly = MathJax.InputJax.TeX.Definitions.macros[cs] === 'NamedOp' || MathJax.InputJax.TeX.Definitions.macros[cs] === 'NamedFn';
                    var namedArray = MathJax.InputJax.TeX.Definitions.macros[cs][0] && (MathJax.InputJax.TeX.Definitions.macros[cs][0] === 'NamedFn' || MathJax.InputJax.TeX.Definitions.macros[cs][0] === 'NamedOp');
                    if (namedDirectly || namedArray) {
                        var value;
                        if (namedArray && MathJax.InputJax.TeX.Definitions.macros[cs][1]) {
                            value = MathJax.InputJax.TeX.Definitions.macros[cs][1].replace(/&thinsp;/, "\u2006");
                        }
                        else {
                            value = cs;
                        }
                        return this.result = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.chars(value));
                    }
                }
            },
            stack: { env: {} },
        };
        obj.__proto__ = MathJax.InputJax.TeX.Parse.prototype;
        return obj;
    };
    Cursor.prototype.keypress = function (event, recall) {
        event.preventDefault();
        var code = event.charCode || event.keyCode || event.which;
        var c = String.fromCharCode(code);
        var toInsert;
        if (!this.node)
            return;
        if (this.node.type === 'hole') {
            var parent = this.node.parent;
            var holeIndex = parent.data.indexOf(this.node);
            var row = MathJax.ElementJax.mml.mrow();
            parent.SetData(holeIndex, row);
            row.moveCursorFromParent(this, Direction.RIGHT);
        }
        if (this.mode === Cursor.CursorMode.BACKSLASH) {
            this.node.EditableSVGelem.classList.remove('invalid');
        }
        if (this.node.type === 'mrow') {
            if (c === "\\") {
                if (this.mode !== Cursor.CursorMode.BACKSLASH) {
                    this.mode = Cursor.CursorMode.BACKSLASH;
                    var grayRow = MathJax.ElementJax.mml.mrow(MathJax.ElementJax.mml.mo(MathJax.ElementJax.mml.entity('#x005C')));
                    grayRow.backslashRow = true;
                    this.node.data.splice(this.position, 0, null);
                    this.node.SetData(this.position, grayRow);
                    var oldClass = grayRow.cls ? grayRow.cls + ' ' : '';
                    grayRow.cls = oldClass + "backslash-mode";
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
                if (this.position === 0) {
                    return;
                }
                var prev = this.node.data[this.position - 1];
                var createAndMoveIntoHole = function (msubsup, index) {
                    var hole = MathJax.ElementJax.mml.hole();
                    msubsup.SetData(index, hole);
                    this.moveTo(hole, 0);
                }.bind(this);
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
                        createAndMoveIntoHole(prev, index);
                    }
                }
                else {
                    var msubsup = MathJax.ElementJax.mml.msubsup();
                    msubsup.SetData(msubsup.base, prev);
                    this.node.SetData(this.position - 1, msubsup);
                    createAndMoveIntoHole(msubsup, index);
                }
                recall(['refocus', this]);
                return;
            }
            else if (c === " ") {
                if (this.mode === Cursor.CursorMode.BACKSLASH) {
                    var latex = "";
                    for (var i = 1; i < this.node.data.length; i++) {
                        var mi = this.node.data[i];
                        if (mi.type !== 'mi') {
                            throw new Error('Found non-identifier in backslash expression');
                        }
                        var chars = mi.data[0];
                        var c = chars.data[0];
                        latex += c;
                    }
                    var parser = this.makeParser();
                    var result = parser.parseControlSequence(latex);
                    if (!result) {
                        this.node.EditableSVGelem.classList.add('invalid');
                        return;
                    }
                    var mrow = this.node;
                    var index = mrow.parent.data.indexOf(mrow);
                    this.exitBackslashMode(result);
                    recall([this, function () {
                            this.refocus();
                        }]);
                    return;
                }
                else {
                    this.node.moveCursor(this, 'r');
                    recall([this, function () {
                            this.refocus();
                            this.mode = Cursor.CursorMode.NORMAL;
                        }]);
                    return;
                }
            }
            if (MathJax.InputJax.TeX.Definitions.letter.test(c) || MathJax.InputJax.TeX.Definitions.number.test(c)) {
                toInsert = new MathJax.ElementJax.mml.mi(new MathJax.ElementJax.mml.chars(c));
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
        celem.setAttribute('width', this.width);
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
        try {
            Util.visualizeJax(jax, $('#mmlviz'), this);
        }
        catch (err) {
            console.error('Failed to visualize jax');
        }
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
})();
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
})();
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
            MML.hole = MML.hole = MML.mbase.Subclass({});
            MML.hole.Augment(HoleMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mbase.Augment(MBaseMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.chars.Augment(CharsMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.entity.Augment(EntityMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mo.Augment(MoMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mtext.Augment(MTextMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.merror.Augment(MErrorMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.ms.Augment(MsMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mglyph.Augment(MGlyphMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mspace.Augment(MSpaceMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mphantom.Augment(MPhantomMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mpadded.Augment(MPaddedMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mrow.Augment(MRowMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mstyle.Augment(MStyleMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mfrac.Augment(MFracMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.msqrt.Augment(MSqrtMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mroot.Augment(MRootMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mfenced.Augment(MFencedMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.menclose.Augment(MEncloseMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.maction.Augment(MActionMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.semantics.Augment(SemanticsMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.munderover.Augment(MUnderOverMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.msubsup.Augment(MSubSupMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mmultiscripts.Augment(MMultiScriptsMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.mtable.Augment(MTableMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.math.Augment(MathMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
            MML.TeXAtom.Augment(TeXAtomMixin.getMethods(MathJax.Ajax, MathJax.Hub, MathJax.HTML, this));
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
            if (!document.namespaces.svg) {
                document.namespaces.add("svg", Util.SVGNS);
            }
        }
    }
    EditableSVG.prototype.Config = function () {
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
        this.textSVG = Util.Element("svg");
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
    };
    EditableSVG.prototype.resetGlyphs = function (reset) {
        console.log('RESETTING GLYPHS');
        if (this.config.useFontCache) {
            if (this.config.useGlobalCache) {
                BBOX_GLYPH.defs = document.getElementById("MathJax_SVG_glyphs");
                BBOX_GLYPH.defs.innerHTML = "";
            }
            else {
                BBOX_GLYPH.defs = Util.Element("defs");
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
                    var row = new MML.mrow();
                    row.Append(EditableSVG.preprocessElementJax(cur));
                    root.SetData(i, row);
                }
            }
        }
        return root;
    };
    EditableSVG.prototype.AddInputHandlers = function (math, span, div) {
        math.cursor = new Cursor();
        math.rerender = rerender;
        span.setAttribute('tabindex', '0');
        function rerender(callback) {
            try {
                EditableSVG.preprocessElementJax(math).toSVG(span, div, true);
                math.cursor.refocus();
            }
            catch (err) {
                if (err.restart) {
                    MathJax.Callback.After([rerender, callback], err.restart);
                    return;
                }
                throw err;
            }
            MathJax.Callback(callback)();
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
        this.zoomScale = parseInt(MathJax.Hub.config.menuSettings.zscale) / 100;
        var tw = jax.root.data[0].EditableSVGdata.tw;
        if (tw && tw < this.cwidth)
            this.cwidth = tw;
        this.idPostfix = "-zoom";
        jax.root.toSVG(span, span);
        this.idPostfix = "";
        this.zoomScale = 1;
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
                var g = EditableSVG.Element("g", {
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
                var g = SVG.Element("g", {
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
    return EditableSVG;
})();
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
var SubSupCursor = (function () {
    function SubSupCursor() {
    }
    SubSupCursor.prototype.moveCursorFromParent = function (cursor, direction) {
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
    SubSupCursor.prototype.moveCursorFromChild = function (cursor, direction, child) {
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
    SubSupCursor.prototype.moveCursorFromClick = function (cursor, x, y) {
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
    SubSupCursor.prototype.moveCursor = function (cursor, direction) {
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
    SubSupCursor.prototype.drawCursor = function (cursor) {
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
    SubSupCursor.cursorable = true;
    return SubSupCursor;
})();
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
    BBOX.type = "g";
    BBOX.removeable = true;
    BBOX.defs = null;
    BBOX.n = 0;
    return BBOX;
})();
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BBOX_G = (function (_super) {
    __extends(BBOX_G, _super);
    function BBOX_G() {
        _super.apply(this, arguments);
    }
    return BBOX_G;
})(BBOX);
var BBOX_TEXT = (function (_super) {
    __extends(BBOX_TEXT, _super);
    function BBOX_TEXT(HTML, scale, text, def) {
        if (!def)
            def = {};
        def.stroke = "none";
        if (def["font-style"] === "")
            delete def["font-style"];
        if (def["font-weight"] === "")
            delete def["font-weight"];
        _super.call(this, def, "text");
        HTML.addText(this.element, text);
        this.EditableSVG.textSVG.appendChild(this.element);
        var bbox = this.element.getBBox();
        this.EditableSVG.textSVG.removeChild(this.element);
        scale *= 1000 / Util.em;
        this.element.setAttribute("transform", "scale(" + Util.Fixed(scale) + ") matrix(1 0 0 -1 0 0)");
        this.w = this.r = bbox.width * scale;
        this.l = 0;
        this.h = this.H = -bbox.y * scale;
        this.d = this.D = (bbox.height + bbox.y) * scale;
    }
    BBOX_TEXT.removeable = false;
    return BBOX_TEXT;
})(BBOX);
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
            return "";
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
        var emFactor = (EditableSVG.zoomScale || 1) / Util.em;
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
        return bb.x <= p.x && p.x <= bb.x + bb.width && bb.y <= p.y && p.y <= bb.y + bb.height;
    };
    Util.highlightBox = function (svg, bb) {
        var d = 100;
        var drawLine = function (x1, y1, x2, y2) {
            var line = document.createElementNS(this.SVGNS, 'line');
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
    Util.visualizeJax = function (jax, selector, cursor) {
        selector.empty();
        var hb = this.highlightBox;
        var f = function (j, spacer) {
            var s;
            var end;
            if (typeof (j) === "string") {
                s = spacer + j + "\n";
                end = true;
            }
            else {
                s = spacer + (j ? j.type : "null") + "\n";
            }
            var item = $('<li><pre style="margin: 0;">' + s + '</pre></li>');
            item.appendTo(selector);
            if (end)
                return;
            item.on('click', function () {
                var bb = j.getSVGBBox();
                var svg = j.EditableSVGelem.ownerSVGElement;
                hb(svg, bb);
            });
            if (!j)
                return;
            for (var i = 0; i < j.data.length; i++) {
                f(j.data[i], spacer + " ");
            }
        };
        f(jax.root || jax, "");
        cursorInfo = cursor ? JSON.stringify({
            type: cursor.node.type,
            position: cursor.position,
            mode: cursor.mode,
            selectionStart: cursor.selectionStart ? cursor.selectionStart.node.type : "null",
            selectionEnd: cursor.selectionEnd ? cursor.selectionEnd.node.type : "null"
        }) : "(no cursor)";
        selector.prepend('<pre>' + cursorInfo + '</pre>');
    };
    Util.getJaxFromMath = function (math) {
        if (math.parentNode.className === "MathJax_SVG_Display") {
            math = math.parentNode;
        }
        do {
            math = math.nextSibling;
        } while (math && math.nodeName.toLowerCase() !== "script");
        return MathJax.Hub.getJaxFor(math);
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
})();
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
        this.w = this.r = w;
        this.h = this.H = h;
        this.d = this.D = d;
        this.l = 0;
    }
    BBOX_FRAME.removeable = false;
    return BBOX_FRAME;
})(BBOX);
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
    BBOX_GLYPH.removeable = false;
    return BBOX_GLYPH;
})(BBOX);
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
        this.w = this.r = w;
        this.l = 0;
        this.h = this.H = t;
        this.d = this.D = 0;
    }
    BBOX_HLINE.removeable = false;
    return BBOX_HLINE;
})(BBOX);
var BBOX_NONREMOVABLE = (function (_super) {
    __extends(BBOX_NONREMOVABLE, _super);
    function BBOX_NONREMOVABLE() {
        _super.apply(this, arguments);
    }
    return BBOX_NONREMOVABLE;
})(BBOX_G);
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
})(BBOX);
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
        _super.call(this, def);
        this.w = this.r = w;
        this.h = this.H = h + d;
        this.d = this.D = this.l = 0;
        this.y = -d;
    }
    BBOX_RECT.type = "rect";
    BBOX_RECT.removeable = false;
    return BBOX_RECT;
})(BBOX);
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
})(BBOX);
var BBOX_SVG = (function (_super) {
    __extends(BBOX_SVG, _super);
    function BBOX_SVG(scale, id, h, d, w, l, r, p) {
        _super.call(this, null, "svg");
    }
    BBOX_SVG.type = "svg";
    BBOX_SVG.removeable = false;
    return BBOX_SVG;
})(BBOX);
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
        this.w = this.r = t;
        this.l = 0;
        this.h = this.H = h;
        this.d = this.D = 0;
    }
    BBOX_VLINE.removeable = false;
    return BBOX_VLINE;
})(BBOX);
var ElementJax = (function () {
    function ElementJax() {
    }
    return ElementJax;
})();
var MBaseMixin = (function (_super) {
    __extends(MBaseMixin, _super);
    function MBaseMixin() {
        _super.apply(this, arguments);
    }
    MBaseMixin.prototype.getBB = function (relativeTo) {
        var elem = this.EditableSVGelem;
        if (!elem) {
            console.log('Oh no! Couldn\'t find elem for this');
            return;
        }
        return elem.getBBox();
    };
    MBaseMixin.getMethods = function (AJAX, HUB, HTML, editableSVG) {
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
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
                "class": this["class"]
            });
        }
        if (this.id) {
            svg.removeable = false;
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
                "id": this.id
            });
        }
        if (this.href) {
            var a = MathJax.OutputJax.EditableSVG.Element("a", {
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
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
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
            svg.element = MathJax.OutputJax.EditableSVG.Element("g");
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
                var g = MathJax.OutputJax.EditableSVG.Element("g");
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
    MBaseMixin.prototype.SVGlineBreaks = function () {
        return false;
    };
    MBaseMixin.prototype.SVGautoload = function () {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + this.type + ".js";
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
    };
    MBaseMixin.prototype.SVGautoloadFile = function (name) {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + name + ".js";
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
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
    MBaseMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
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
})(ElementJax);
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
            text = new BBOX_TEXT(MathJax.HTML, scale, text, variant.font);
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
                var box = new BBOX_TEXT(MathJax.HTML, scale * 100 / EDITABLESVG.config.scale, c, {
                    "font-family": variant.defaultFamily || EDITABLESVG.config.undefinedFamily,
                    "font-style": (variant.italic ? "italic" : ""),
                    "font-weight": (variant.bold ? "bold" : "")
                });
                if (variant.h !== null) {
                    box.h = variant.h;
                }
                if (variant.d !== null) {
                    box.d = variant.d;
                }
                c = new BBOX_G();
                c.Add(box);
                svg.Add(c, svg.w, 0);
                MathJax.Hub.signal.Post(["SVG Jax - unknown char", n, variant]);
            }
            return svg;
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
            stretch: undefined
        };
        while (delim.alias) {
            code = delim.alias;
            delim = FONTDATA.DELIMITERS[code];
            if (!delim) {
                delim = {
                    HW: [0, FONTDATA.VARIANT[MathJax.ElementJax.mml.VARIANT.NORMAL]]
                };
            }
        }
        if (delim.load) {
            MathJax.Hub.RestartAfter(MathJax.Ajax.Require(EDITABLESVG.fontDir + "/fontdata-" + delim.load + ".js"));
        }
        for (var i = 0, m = delim.HW.length; i < m; i++) {
            if (delim.HW[i][0] * scale >= HW - 10 - EditableSVG.config.blacker || (i == m - 1 && !delim.stretch)) {
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
            this["extendDelimiter" + delim.dir](svg, hw, delim.stretch, scale, font);
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
})(MBaseMixin);
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
})(MBaseMixin);
var HoleMixin = (function (_super) {
    __extends(HoleMixin, _super);
    function HoleMixin() {
        _super.call(this);
        this.type = "hole";
    }
    HoleMixin.prototype.isCursorable = function () { return true; };
    HoleMixin.prototype.toSVG = function (h, d) {
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
    HoleMixin.prototype.moveCursorFromParent = function (cursor, direction) {
        cursor.moveTo(this, 0);
        return true;
    };
    HoleMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        throw new Error('Hole does not have a child');
    };
    HoleMixin.prototype.moveCursorFromClick = function (cursor, x, y) {
        cursor.moveTo(this, 0);
        return true;
    };
    HoleMixin.prototype.moveCursor = function (cursor, direction) {
        return this.parent.moveCursorFromChild(cursor, direction, this);
    };
    HoleMixin.prototype.drawCursor = function (cursor) {
        var bbox = this.getSVGBBox();
        var x = bbox.x + (bbox.width / 2.0);
        var y = bbox.y;
        var height = bbox.height;
        cursor.drawAt(this.EditableSVGelem.ownerSVGElement, x, y, height);
    };
    return HoleMixin;
})(MBaseMixin);
var MActionMixin = (function (_super) {
    __extends(MActionMixin, _super);
    function MActionMixin() {
        _super.apply(this, arguments);
    }
    MActionMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MActionMixin;
})(MBaseMixin);
var MathMixin = (function (_super) {
    __extends(MathMixin, _super);
    function MathMixin() {
        _super.apply(this, arguments);
    }
    MathMixin.prototype.isCursorable = function () { return false; };
    MathMixin.prototype.toSVG = function (span, div, replace) {
        var CONFIG = MathJax.OutputJax.EditableSVG.config;
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
    MathMixin.prototype.moveCursorFromChild = function (cursor, direction, child) {
        return false;
    };
    return MathMixin;
})(MBaseMixin);
var MEncloseMixin = (function (_super) {
    __extends(MEncloseMixin, _super);
    function MEncloseMixin() {
        _super.apply(this, arguments);
    }
    MEncloseMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MEncloseMixin;
})(MBaseMixin);
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
        var span = this.HTML.Element("span", {
            style: MathJax.OutputJax.EditableSVG.config.merrorStyle
        });
        this.styles = this.SVGprocessStyles(span.style);
        if (this.style) {
            span.style.cssText = this.style;
            MathJax.Hub.Insert(this.styles, this.SVGprocessStyles(span.style));
        }
    };
    return MErrorMixin;
})(MBaseMixin);
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
})(MBaseMixin);
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
            var bevel = EditableSVG.createDelimiter(0x2F, H);
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
        cursor.moveTo(this, cursor.position);
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
})(MBaseMixin);
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
})(MBaseMixin);
var MMultiScriptsMixin = (function (_super) {
    __extends(MMultiScriptsMixin, _super);
    function MMultiScriptsMixin() {
        _super.apply(this, arguments);
    }
    MMultiScriptsMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    ;
    return MMultiScriptsMixin;
})(MBaseMixin);
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
            var bb = this.getSVGBBox(this.EditableSVGelem.children[childIdx]);
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
        var preedge, postedge;
        if (cursor.position === 0) {
            preedge = bbox.x;
        }
        else {
            var prebox = this.getSVGBBox(this.EditableSVGelem.children[cursor.position - 1]);
            preedge = prebox.x + prebox.width;
        }
        if (cursor.position === this.getCursorLength()) {
            postedge = bbox.x + bbox.width;
        }
        else {
            var postbox = this.getSVGBBox(this.EditableSVGelem.children[cursor.position]);
            postedge = postbox.x;
        }
        var x = (postedge + preedge) / 2;
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawAt(svgelem, x, y, height);
    };
    return MnMixin;
})(MBaseMixin);
var MoMixin = (function (_super) {
    __extends(MoMixin, _super);
    function MoMixin() {
        _super.apply(this, arguments);
    }
    MoMixin.prototype.toSVG = function (HW, D) {
        if (HW === void 0) { HW = null; }
        if (D === void 0) { D = null; }
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
            variant = EditableSVG.FONTDATA.VARIANT[values.displaystyle ? "-largeOp" : "-smallOp"];
        }
        var parent = this.CoreParent();
        var isScript = (parent && parent.isa(MathJax.ElementJax.mml.msubsup) && this !== parent.data[0]);
        var mapchars = (isScript ? this.remapChars : null);
        if (this.data.join("").length === 1 && parent && parent.isa(MathJax.ElementJax.mml.munderover) &&
            this.CoreText(parent.data[parent.base]).length === 1) {
            var over = parent.data[parent.over], under = parent.data[parent.under];
            if (over && this === over.CoreMO() && parent.Get("accent")) {
                mapchars = EditableSVG.FONTDATA.REMAPACCENT;
            }
            else if (under && this === under.CoreMO() && parent.Get("accentunder")) {
                mapchars = EditableSVG.FONTDATA.REMAPACCENTUNDER;
            }
        }
        if (isScript && this.data.join("").match(/['`"\u00B4\u2032-\u2037\u2057]/)) {
            variant = EditableSVG.FONTDATA.VARIANT["-TeX-variant"];
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
                c = EditableSVG.FONTDATA.REMAPACCENT[c] || c;
            }
            else if (under && this === under.CoreMO() && parent.Get("accentunder")) {
                c = EditableSVG.FONTDATA.REMAPACCENTUNDER[c] || c;
            }
        }
        c = EditableSVG.FONTDATA.DELIMITERS[c.charCodeAt(0)];
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
        svg = EditableSVG.createDelimiter(this.data.join("").charCodeAt(0), w, svg.scale, values.mathvariant);
        this.SVGhandleSpace(svg);
        this.SVGhandleColor(svg);
        delete this.svg.element;
        this.SVGsaveData(svg);
        svg.stretched = true;
        return svg;
    };
    return MoMixin;
})(MBaseMixin);
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
})(MBaseMixin);
var MPhantomMixin = (function (_super) {
    __extends(MPhantomMixin, _super);
    function MPhantomMixin() {
        _super.apply(this, arguments);
    }
    MPhantomMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
})(MBaseMixin);
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
        var base = this.SVGchildSVG(0), rule, surd;
        var t = Util.TeX.rule_thickness * scale, p, q, H, x = 0;
        if (this.Get("displaystyle")) {
            p = Util.TeX.x_height * scale;
        }
        else {
            p = t;
        }
        q = Math.max(t + p / 4, 1000 * Util.TeX.min_root_space / Util.em);
        H = base.h + base.d + q + t;
        surd = EditableSVG.createDelimiter(0x221A, H, scale);
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
})(MBaseMixin);
var MRootMixin = (function (_super) {
    __extends(MRootMixin, _super);
    function MRootMixin() {
        _super.apply(this, arguments);
        this.toSVG = MSqrtMixin.toSVG;
    }
    MRootMixin.prototype.isCursorable = function () { return true; };
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
})(MBaseMixin);
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
        return MathJax.ElementJax.mml.mbase.SVGautoloadFile("multiline");
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
        var childIdx;
        for (childIdx = 0; childIdx < this.data.length; ++childIdx) {
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
        var preedge, postedge;
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
})(MBaseMixin);
var MsMixin = (function (_super) {
    __extends(MsMixin, _super);
    function MsMixin() {
        _super.apply(this, arguments);
        this.toSVG = MBaseMixin.SVGautoload;
    }
    return MsMixin;
})(MBaseMixin);
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
})(MBaseMixin);
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
})(MBaseMixin);
var MSubSupMixin = (function (_super) {
    __extends(MSubSupMixin, _super);
    function MSubSupMixin() {
        _super.apply(this, arguments);
        this.endingPos = 1;
    }
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
    return MSubSupMixin;
})(MBaseMixin);
var MTableMixin = (function (_super) {
    __extends(MTableMixin, _super);
    function MTableMixin() {
        _super.apply(this, arguments);
    }
    MTableMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
    return MTableMixin;
})(MBaseMixin);
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
            svg.Add(new BBOX_TEXT(this.HTML, scale * 100 / MathJax.OutputJax.EditableSVG.config.scale, this.data.join(""), def));
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
})(MBaseMixin);
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
    return MUnderOverMixin;
})(MBaseMixin);
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
})(MBaseMixin);
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
})(MBaseMixin);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiamF4LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIERpcmVjdGlvbjtcbihmdW5jdGlvbiAoRGlyZWN0aW9uKSB7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlVQXCJdID0gMF0gPSBcIlVQXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlJJR0hUXCJdID0gMV0gPSBcIlJJR0hUXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIkRPV05cIl0gPSAyXSA9IFwiRE9XTlwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJMRUZUXCJdID0gM10gPSBcIkxFRlRcIjtcbn0pKERpcmVjdGlvbiB8fCAoRGlyZWN0aW9uID0ge30pKTtcbnZhciBDdXJzb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEN1cnNvcigpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIpO1xuICAgICAgICB0aGlzLndpZHRoID0gNTA7XG4gICAgfVxuICAgIEN1cnNvci5wcm90b3R5cGUucmVmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUgfHwgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0gfHwgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50XG4gICAgICAgICAgICB8fCAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZS5mb2N1cygpO1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZVRvQ2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgdmFyIHN2ZyA9IHRhcmdldC5ub2RlTmFtZSA9PT0gJ3N2ZycgPyB0YXJnZXQgOiB0YXJnZXQub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGNwID0gVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMoc3ZnLCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbiAgICAgICAgdmFyIGpheCA9IFV0aWwuZ2V0SmF4RnJvbU1hdGgoc3ZnLnBhcmVudE5vZGUpO1xuICAgICAgICB2YXIgY3VycmVudCA9IGpheC5yb290O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoZWRJdGVtcyA9IGN1cnJlbnQuZGF0YS5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBVdGlsLm5vZGVDb250YWluc1NjcmVlblBvaW50KG5vZGUsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdodWg/IG1hdGNoZWQgbW9yZSB0aGFuIG9uZSBjaGlsZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBtYXRjaGVkSXRlbXNbMF07XG4gICAgICAgICAgICBpZiAobWF0Y2hlZC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBtYXRjaGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKHRoaXMsIGNwLngsIGNwLnkpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG8gPSBmdW5jdGlvbiAobm9kZSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIICYmICFub2RlLmJhY2tzbGFzaFJvdylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS51cGRhdGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAoc2hpZnRLZXkpIHtcbiAgICAgICAgaWYgKHNoaWZ0S2V5ICYmIHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBzaGlmdEtleSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGlvbihzaGlmdEtleSk7XG4gICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubm9kZS5kcmF3Q3Vyc29yKHRoaXMpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbjtcbiAgICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgIHRoaXMuYmFja3NwYWNlKGV2ZW50LCByZWNhbGwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyNzpcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKCk7XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoZGlyZWN0aW9uLCBldmVudC5zaGlmdEtleSk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm1vdmVUb0NsaWNrKGV2ZW50KTtcbiAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VIb2xlSWZOZWVkZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByb3dpbmRleCA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50LlNldERhdGEocm93aW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgaG9sZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5leGl0QmFja3NsYXNoTW9kZSA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdmFyIHBwb3MgPSB0aGlzLm5vZGUucGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuZGF0YS5zcGxpY2UocHBvcywgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LlNldERhdGEocHBvcysrLCByZXBsYWNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVwbGFjZSAmJiByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcikge1xuICAgICAgICAgICAgdGhpcy5tb3ZlVG8uYXBwbHkodGhpcywgcmVwbGFjZS5tb3ZlQ3Vyc29yQWZ0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlVG8odGhpcy5ub2RlLnBhcmVudCwgcHBvcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuYmFja3NwYWNlID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZS50eXBlID09PSAnbXJvdycgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUgPT09IHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KHRoaXMuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIHRoaXMuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUuZGF0YS5zcGxpY2UocG9zMSwgcG9zMiAtIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKHRoaXMubm9kZSwgcG9zMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkbyB0aGlzIGJhY2tzcGFjZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICBpZiAoIXByZXYuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgdGhpcy5ub2RlLmRhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5kYXRhLnNwbGljZSh0aGlzLnBvc2l0aW9uIC0gMSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWtlSG9sZUlmTmVlZGVkKHRoaXMubm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb24gLSAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiYWNrc3BhY2Ugb24gaG9sZSEnKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlRW50aXR5TW8gPSBmdW5jdGlvbiAodW5pY29kZSkge1xuICAgICAgICB2YXIgbW8gPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbygpO1xuICAgICAgICB2YXIgZW50aXR5ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuZW50aXR5KCk7XG4gICAgICAgIGVudGl0eS5BcHBlbmQodW5pY29kZSk7XG4gICAgICAgIG1vLkFwcGVuZChlbnRpdHkpO1xuICAgICAgICByZXR1cm4gbW87XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNaSA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtaSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1pKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbWkuQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtaTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZVBhcnNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtcbiAgICAgICAgICAgIG1tbFRva2VuOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFB1c2g6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN1bHQgPSB4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vb3A6IGZ1bmN0aW9uICgpIHsgfSxcbiAgICAgICAgICAgIHBhcnNlQ29udHJvbFNlcXVlbmNlOiBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGVja1NwZWNpYWxDUyhjcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLmNzID0gY3M7XG4gICAgICAgICAgICAgICAgdGhpcy5jc1VuZGVmaW5lZCA9IHRoaXMuY3NGaW5kTWFjcm8gPSB0aGlzLm5vb3A7XG4gICAgICAgICAgICAgICAgdGhpcy5Db250cm9sU2VxdWVuY2UoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5jc0ZpbmRNYWNybztcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5jc1VuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR2V0Q1M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGVja1NwZWNpYWxDUzogZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNzID09PSAnZnJhYycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhvbGUgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tZnJhYyhob2xlLCBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCkpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQubW92ZUN1cnNvckFmdGVyID0gW2hvbGUsIDBdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjcyA9PT0gJ3NxcnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3FydCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LlNldERhdGEoMCwgaG9sZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLm1hY3Jvc1tjc10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zW2NzXSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuYW1lZERpcmVjdGx5ID0gTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zW2NzXSA9PT0gJ05hbWVkT3AnIHx8IE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLm1hY3Jvc1tjc10gPT09ICdOYW1lZEZuJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWVkQXJyYXkgPSBNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5tYWNyb3NbY3NdWzBdICYmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5tYWNyb3NbY3NdWzBdID09PSAnTmFtZWRGbicgfHwgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkT3AnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWVkRGlyZWN0bHkgfHwgbmFtZWRBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWVkQXJyYXkgJiYgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zW2NzXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubWFjcm9zW2NzXVsxXS5yZXBsYWNlKC8mdGhpbnNwOy8sIFwiXFx1MjAwNlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gY3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YWNrOiB7IGVudjoge30gfSxcbiAgICAgICAgfTtcbiAgICAgICAgb2JqLl9fcHJvdG9fXyA9IE1hdGhKYXguSW5wdXRKYXguVGVYLlBhcnNlLnByb3RvdHlwZTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgY29kZSA9IGV2ZW50LmNoYXJDb2RlIHx8IGV2ZW50LmtleUNvZGUgfHwgZXZlbnQud2hpY2g7XG4gICAgICAgIHZhciBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgdmFyIHRvSW5zZXJ0O1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUucGFyZW50O1xuICAgICAgICAgICAgdmFyIGhvbGVJbmRleCA9IHBhcmVudC5kYXRhLmluZGV4T2YodGhpcy5ub2RlKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coKTtcbiAgICAgICAgICAgIHBhcmVudC5TZXREYXRhKGhvbGVJbmRleCwgcm93KTtcbiAgICAgICAgICAgIHJvdy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdpbnZhbGlkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIGlmIChjID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vZGUgIT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0g7XG4gICAgICAgICAgICAgICAgICAgIHZhciBncmF5Um93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8oTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoJyN4MDA1QycpKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYXlSb3cuYmFja3NsYXNoUm93ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCBncmF5Um93KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENsYXNzID0gZ3JheVJvdy5jbHMgPyBncmF5Um93LmNscyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNscyA9IG9sZENsYXNzICsgXCJiYWNrc2xhc2gtbW9kZVwiO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhncmF5Um93LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RPRE86IGluc2VydCBhIFxcXFwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSBcIl5cIiB8fCBjID09PSBcIl9cIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICAgICAgdmFyIGNyZWF0ZUFuZE1vdmVJbnRvSG9sZSA9IGZ1bmN0aW9uIChtc3Vic3VwLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9sZSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwuaG9sZSgpO1xuICAgICAgICAgICAgICAgICAgICBtc3Vic3VwLlNldERhdGEoaW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhob2xlLCAwKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gKGMgPT09IFwiX1wiKSA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1YiA6IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1cDtcbiAgICAgICAgICAgICAgICBpZiAocHJldi50eXBlID09PSBcIm1zdWJzdXBcIiB8fCBwcmV2LnR5cGUgPT09IFwibXVuZGVyb3ZlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2LmRhdGFbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhpbmcgPSBwcmV2LmRhdGFbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpbmcubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcywgRGlyZWN0aW9uLkxFRlQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlVG8ocHJldiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlQW5kTW92ZUludG9Ib2xlKHByZXYsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1zdWJzdXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAoKTtcbiAgICAgICAgICAgICAgICAgICAgbXN1YnN1cC5TZXREYXRhKG1zdWJzdXAuYmFzZSwgcHJldik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24gLSAxLCBtc3Vic3VwKTtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQW5kTW92ZUludG9Ib2xlKG1zdWJzdXAsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSBcIiBcIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ZXggPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHRoaXMubm9kZS5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWkgPSB0aGlzLm5vZGUuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtaS50eXBlICE9PSAnbWknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBub24taWRlbnRpZmllciBpbiBiYWNrc2xhc2ggZXhwcmVzc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNoYXJzID0gbWkuZGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjID0gY2hhcnMuZGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdGV4ICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlciA9IHRoaXMubWFrZVBhcnNlcigpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlKGxhdGV4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LmFkZCgnaW52YWxpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtcm93ID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsICdyJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5sZXR0ZXIudGVzdChjKSB8fCBNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5udW1iZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkobmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gnICsgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09ICcrJyB8fCBjID09PSAnLycgfHwgYyA9PT0gJz0nIHx8IGMgPT09ICcuJyB8fCBjID09PSAnKCcgfHwgYyA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b0luc2VydClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCB0b0luc2VydCk7XG4gICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgfV0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ib3hlcykge1xuICAgICAgICAgICAgdGhpcy5ib3hlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm94ZXMgPSBbXTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlnaGxpZ2h0Qm94ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBjdXIgPSB0aGlzLm5vZGU7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gY3VyLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlcyA9IHRoaXMuYm94ZXMuY29uY2F0KFV0aWwuaGlnaGxpZ2h0Qm94KHN2ZywgYmIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0F0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIGhlaWdodCwgc2tpcFNjcm9sbCkge1xuICAgICAgICB0aGlzLnJlbmRlcmVkUG9zaXRpb24gPSB7IHg6IHgsIHk6IHksIGhlaWdodDogaGVpZ2h0IH07XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICcjNzc3Nzc3Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yJyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItJyArIHRoaXMuaWQ7XG4gICAgICAgICAgICBzdmdlbGVtLmFwcGVuZENoaWxkKGNlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRjbGFzcyA9IGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBvbGRjbGFzcy5zcGxpdCgnYmxpbmsnKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdGhpcy53aWR0aCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuc3RhcnRCbGluayk7XG4gICAgICAgIHRoaXMuc3RhcnRCbGluayA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsIGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSArICcgYmxpbmsnKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCA1MDApO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodEJveGVzKHN2Z2VsZW0pO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUuZHJhd0N1cnNvckhpZ2hsaWdodCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgamF4ID0gTWF0aEpheC5IdWIuZ2V0QWxsSmF4KCcjJyArIHN2Z2VsZW0ucGFyZW50Tm9kZS5pZClbMF07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBVdGlsLnZpc3VhbGl6ZUpheChqYXgsICQoJyNtbWx2aXonKSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHZpc3VhbGl6ZSBqYXgnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNraXBTY3JvbGwpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbEludG9WaWV3KHN2Z2VsZW0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLmhpZGVIaWdobGlnaHQoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlkZUhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmIChjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0hpZ2hsaWdodEF0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAncmdiYSgxNzMsIDIxNiwgMjUwLCAwLjUpJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZDtcbiAgICAgICAgICAgIHN2Z2VsZW0uYXBwZW5kQ2hpbGQoY2VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uIChzdmdlbGVtKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW5kZXJlZFBvc2l0aW9uKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgeCA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi54O1xuICAgICAgICB2YXIgeSA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLmhlaWdodDtcbiAgICAgICAgdmFyIGNsaWVudFBvaW50ID0gVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMoc3ZnZWxlbSwgeCwgeSArIGhlaWdodCAvIDIpO1xuICAgICAgICB2YXIgY2xpZW50V2lkdGggPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuICAgICAgICB2YXIgY2xpZW50SGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG4gICAgICAgIHZhciBzeCA9IDAsIHN5ID0gMDtcbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnggPCAwIHx8IGNsaWVudFBvaW50LnggPiBjbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc3ggPSBjbGllbnRQb2ludC54IC0gY2xpZW50V2lkdGggLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbGllbnRQb2ludC55IDwgMCB8fCBjbGllbnRQb2ludC55ID4gY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICBzeSA9IGNsaWVudFBvaW50LnkgLSBjbGllbnRIZWlnaHQgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeCB8fCBzeSkge1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbEJ5KHN4LCBzeSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kRWxlbWVudCgpO1xuICAgICAgICBpZiAoY3Vyc29yKVxuICAgICAgICAgICAgY3Vyc29yLnJlbW92ZSgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5ibHVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzRmlyc3RIb2xlID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKCFyb290KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocm9vdC50eXBlID09PSBcImhvbGVcIikge1xuICAgICAgICAgICAgdGhpcy5ub2RlID0gcm9vdDtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNGaXJzdEhvbGUocm9vdC5kYXRhW2ldKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBDdXJzb3IuQ3Vyc29yTW9kZSA9IHtcbiAgICAgICAgQkFDS1NMQVNIOiBcImJhY2tzbGFzaFwiLFxuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXG4gICAgICAgIFNFTEVDVElPTjogXCJzZWxlY3Rpb25cIlxuICAgIH07XG4gICAgcmV0dXJuIEN1cnNvcjtcbn0pKCk7XG52YXIgRWRpdGFibGVTVkdDb25maWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHQ29uZmlnKCkge1xuICAgIH1cbiAgICBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMgPSB7XG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHXCI6IHtcbiAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiBcIjEwMCVcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwidGV4dC1hbGlnblwiOiBcImxlZnRcIixcbiAgICAgICAgICAgIFwidGV4dC10cmFuc2Zvcm1cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtc3BhY2luZ1wiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3b3JkLXdyYXBcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgIFwiZmxvYXRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImRpcmVjdGlvblwiOiBcImx0clwiLFxuICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICBcInRleHQtaW5kZW50XCI6IDAsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcIjEwMCVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgIHRyYW5zaXRpb246IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItd2Via2l0LXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1zLXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1vLXRyYW5zaXRpb25cIjogXCJub25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIubWp4LXN2Zy1ocmVmXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiYmx1ZVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI6IHtcbiAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmUhaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiNjBleFwiLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiI01hdGhKYXhfU1ZHX1Rvb2x0aXBcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiYXV0b1wiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJub25lXCJcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHQ29uZmlnO1xufSkoKTtcbnZhciBFZGl0YWJsZVNWRyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkcoKSB7XG4gICAgICAgIHRoaXMuVE9VQ0ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuaGlkZVByb2Nlc3NlZE1hdGggPSB0cnVlO1xuICAgICAgICB0aGlzLmZvbnROYW1lcyA9IFtcIlRlWFwiLCBcIlNUSVhcIiwgXCJTVElYLVdlYlwiLCBcIkFzYW5hLU1hdGhcIixcbiAgICAgICAgICAgIFwiR3lyZS1UZXJtZXNcIiwgXCJHeXJlLVBhZ2VsbGFcIiwgXCJMYXRpbi1Nb2Rlcm5cIiwgXCJOZW8tRXVsZXJcIl07XG4gICAgICAgIHRoaXMuVGV4dE5vZGUgPSBNYXRoSmF4LkhUTUwuVGV4dE5vZGU7XG4gICAgICAgIHRoaXMuYWRkVGV4dCA9IE1hdGhKYXguSFRNTC5hZGRUZXh0O1xuICAgICAgICB0aGlzLnVjTWF0Y2ggPSBNYXRoSmF4LkhUTUwudWNNYXRjaDtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJtbWwgSmF4IFJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICAgICAgTU1MLmhvbGUgPSBNTUwuaG9sZSA9IE1NTC5tYmFzZS5TdWJjbGFzcyh7fSk7XG4gICAgICAgICAgICBNTUwuaG9sZS5BdWdtZW50KEhvbGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1iYXNlLkF1Z21lbnQoTUJhc2VNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLmVudGl0eS5BdWdtZW50KEVudGl0eU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubW8uQXVnbWVudChNb01peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVycm9yLkF1Z21lbnQoTUVycm9yTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcy5BdWdtZW50KE1zTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcGFjZS5BdWdtZW50KE1TcGFjZU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBoYW50b20uQXVnbWVudChNUGhhbnRvbU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb3cuQXVnbWVudChNUm93TWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3R5bGUuQXVnbWVudChNU3R5bGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcXJ0LkF1Z21lbnQoTVNxcnRNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb290LkF1Z21lbnQoTVJvb3RNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZW5jbG9zZS5BdWdtZW50KE1FbmNsb3NlTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYWN0aW9uLkF1Z21lbnQoTUFjdGlvbk1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdW5kZXJvdmVyLkF1Z21lbnQoTVVuZGVyT3Zlck1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXN1YnN1cC5BdWdtZW50KE1TdWJTdXBNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdGFibGUuQXVnbWVudChNVGFibGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hdGguQXVnbWVudChNYXRoTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUxbXCJhbm5vdGF0aW9uLXhtbFwiXS5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICB0b1NWRzogTU1MLm1iYXNlLlNWR2F1dG9sb2FkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwib25Mb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgZWRpdGFibGVzdmc6ICcsIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoTWF0aEpheC5DYWxsYmFjayhbXCJsb2FkQ29tcGxldGVcIiwgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcsIFwiamF4LmpzXCJdKSwgMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5Ccm93c2VyLlNlbGVjdCh7XG4gICAgICAgICAgICBPcGVyYTogZnVuY3Rpb24gKGJyb3dzZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgICAgICBvcGVyYVpvb21SZWZyZXNoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZCBDb29raWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLmNvbmZpZy5tZW51U2V0dGluZ3Muem9vbSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4LkFqYXguUmVxdWlyZShcIltNYXRoSmF4XS9leHRlbnNpb25zL01hdGhab29tLmpzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICAgICAgICAgIGlmICghZG9jdW1lbnQubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5uYW1lc3BhY2VzLmFkZChcInN2Z1wiLCBVdGlsLlNWR05TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSBNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLCBjb25maWcgPSB0aGlzLmNvbmZpZywgZm9udCA9IHNldHRpbmdzLmZvbnQ7XG4gICAgICAgIGlmIChzZXR0aW5ncy5zY2FsZSkge1xuICAgICAgICAgICAgY29uZmlnLnNjYWxlID0gc2V0dGluZ3Muc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCAhPT0gXCJBdXRvXCIpIHtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhMb2NhbHxXZWJ8SW1hZ2UpJC9pLCBcIlwiKTtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pLywgXCIkMS0kMlwiKTtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gZm9udDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gY29uZmlnLmZvbnQgfHwgXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb250TmFtZXMuaW5kZXhPZih0aGlzLmZvbnRJblVzZSkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250RGlyICs9IFwiL1wiICsgdGhpcy5mb250SW5Vc2U7XG4gICAgICAgIGlmICghdGhpcy5yZXF1aXJlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaCh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS5qc1wiKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2goTWF0aEpheC5PdXRwdXRKYXguZXh0ZW5zaW9uRGlyICsgXCIvTWF0aEV2ZW50cy5qc1wiKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgRVZFTlQgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50O1xuICAgICAgICB0aGlzLlRPVUNIID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ub3VjaDtcbiAgICAgICAgdmFyIEhPVkVSID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ib3ZlcjtcbiAgICAgICAgdGhpcy5Db250ZXh0TWVudSA9IEVWRU5ULkNvbnRleHRNZW51O1xuICAgICAgICB0aGlzLk1vdXNlb3ZlciA9IEhPVkVSLk1vdXNlb3ZlcjtcbiAgICAgICAgdGhpcy5Nb3VzZW91dCA9IEhPVkVSLk1vdXNlb3V0O1xuICAgICAgICB0aGlzLk1vdXNlbW92ZSA9IEhPVkVSLk1vdXNlbW92ZTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgICAgICAgICB0ZXh0SW5kZW50OiAwLFxuICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm06IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgbGV0dGVyU3BhY2luZzogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICB3b3JkU3BhY2luZzogXCJub3JtYWxcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5EaXYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUodGhpcy5oaWRkZW5EaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfSGlkZGVuXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogXCI1aW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgVXRpbC5weFBlckluY2ggPSBkaXYub2Zmc2V0V2lkdGggLyA1O1xuICAgICAgICB0aGlzLmhpZGRlbkRpdi5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB0aGlzLnRleHRTVkcgPSBVdGlsLkVsZW1lbnQoXCJzdmdcIik7XG4gICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IFV0aWwuYWRkRWxlbWVudChVdGlsLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYucGFyZW50Tm9kZSwgXCJzdmdcIiksIFwiZGVmc1wiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19nbHlwaHNcIlxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5FeFNwYW4gPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXG4gICAgICAgICAgICBbXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0V4Qm94XCJcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFtcbiAgICAgICAgICAgIFtcImhyXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHRoaXMuY29uZmlnLnN0eWxlcztcbiAgICAgICAgZm9yICh2YXIgcyBpbiBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMpIHtcbiAgICAgICAgICAgIHN0eWxlc1tzXSA9IEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlc1tzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5BamF4LlN0eWxlcyhzdHlsZXMsIFtcIkluaXRpYWxpemVTVkdcIiwgdGhpc10pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkluaXRpYWxpemVTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIHRoaXMuZGVmYXVsdEV4ID0gdGhpcy5FeFNwYW4uZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5kZWZhdWx0V2lkdGggPSB0aGlzLmxpbmVicmVha1NwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgbSA9IHNjcmlwdHMubGVuZ3RoO1xuICAgICAgICB2YXIgc2NyaXB0O1xuICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgdmFyIHNwYW47XG4gICAgICAgIHZhciBkaXY7XG4gICAgICAgIHZhciB0ZXN0O1xuICAgICAgICB2YXIgamF4O1xuICAgICAgICB2YXIgZXg7XG4gICAgICAgIHZhciBlbTtcbiAgICAgICAgdmFyIG1heHdpZHRoO1xuICAgICAgICB2YXIgcmVsd2lkdGggPSBmYWxzZTtcbiAgICAgICAgdmFyIGN3aWR0aDtcbiAgICAgICAgdmFyIGxpbmVicmVhayA9IHRoaXMuY29uZmlnLmxpbmVicmVha3MuYXV0b21hdGljO1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLndpZHRoO1xuICAgICAgICBpZiAobGluZWJyZWFrKSB7XG4gICAgICAgICAgICByZWx3aWR0aCA9ICh3aWR0aC5tYXRjaCgvXlxccyooXFxkKyhcXC5cXGQqKT8lXFxzKik/Y29udGFpbmVyXFxzKiQvKSAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgvXFxzKmNvbnRhaW5lclxccyovLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2lkdGggPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWF4d2lkdGggPSAxMDAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwcmV2ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIFN0cmluZyhwcmV2LmNsYXNzTmFtZSkubWF0Y2goL15NYXRoSmF4KF9TVkcpPyhfRGlzcGxheSk/KCBNYXRoSmF4KF9TVkcpP19Qcm9jZXNzaW5nKT8kLykpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBqYXguRWRpdGFibGVTVkcgPSB7XG4gICAgICAgICAgICAgICAgZGlzcGxheTogKGpheC5yb290LkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzcGFuID0gZGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiB0aGlzLmNvbmZpZy5zY2FsZSArIFwiJVwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImlubGluZS1ibG9ja1wiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdcIixcbiAgICAgICAgICAgICAgICBpZDogamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiLFxuICAgICAgICAgICAgICAgIGlzTWF0aEpheDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBqYXhJRDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBvbmNvbnRleHRtZW51OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1lbnUsXG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd246IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2Vkb3duLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdmVyOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3ZlcixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3V0LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vtb3ZlOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlbW92ZSxcbiAgICAgICAgICAgICAgICBvbmNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkNsaWNrLFxuICAgICAgICAgICAgICAgIG9uZGJsY2xpY2s6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuRGJsQ2xpY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLkJyb3dzZXIubm9Db250ZXh0TWVudSkge1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaHN0YXJ0ID0gdGhpcy5UT1VDSC5zdGFydDtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hlbmQgPSB0aGlzLlRPVUNILmVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSksIHNjcmlwdCk7XG4gICAgICAgICAgICBkaXYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5saW5lYnJlYWtTcGFuLmNsb25lTm9kZSh0cnVlKSwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgZGl2ID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBleCA9IHRlc3QuZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgICAgIGN3aWR0aCA9IGRpdi5wcmV2aW91c1NpYmxpbmcuZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4ID09PSAwIHx8IGV4ID09PSBcIk5hTlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5EaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgICAgICAgICAgICBqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGV4ID0gdGhpcy5kZWZhdWx0RXg7XG4gICAgICAgICAgICAgICAgY3dpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFV0aWwuZXggPSBleDtcbiAgICAgICAgICAgIFV0aWwuZW0gPSBlbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5jd2lkdGggPSBjd2lkdGggLyBlbSAqIDEwMDA7XG4gICAgICAgICAgICBVdGlsLmxpbmVXaWR0aCA9IChsaW5lYnJlYWsgPyBVdGlsLmxlbmd0aDJlbSh3aWR0aCwgMSwgbWF4d2lkdGggLyBlbSAqIDEwMDApIDogVXRpbC5CSUdESU1FTik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0c1tpXS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBzcGFuID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHRzW2ldLk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKCFqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB0ZXN0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuU1ZHZXFuID0gc3RhdGUuU1ZHbGFzdCA9IDA7XG4gICAgICAgIHN0YXRlLlNWR2kgPSAtMTtcbiAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSB0aGlzLmNvbmZpZy5FcW5DaHVuaztcbiAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5UcmFuc2xhdGUgPSBmdW5jdGlvbiAoc2NyaXB0LCBzdGF0ZSkge1xuICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoc3RhdGUuU1ZHZGVsYXkpIHtcbiAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5DYWxsYmFjay5EZWxheSh0aGlzLmNvbmZpZy5FcW5DaHVua0RlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgIHZhciBtYXRoID0gamF4LnJvb3Q7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgdmFyIGRpdiA9IChqYXguRWRpdGFibGVTVkcuZGlzcGxheSA/IChzcGFuIHx8IHsgcGFyZW50Tm9kZTogdW5kZWZpbmVkIH0pLnBhcmVudE5vZGUgOiBzcGFuKTtcbiAgICAgICAgdmFyIGxvY2FsQ2FjaGUgPSAodGhpcy5jb25maWcudXNlRm9udENhY2hlICYmICF0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSk7XG4gICAgICAgIGlmICghZGl2KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBqYXguRWRpdGFibGVTVkcuZW07XG4gICAgICAgIHRoaXMuZXggPSBqYXguRWRpdGFibGVTVkcuZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIHRoaXMubWF0aERpdiA9IGRpdjtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEdseXBocygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5pdFNWRyhtYXRoLCBzcGFuKTtcbiAgICAgICAgbWF0aC5zZXRUZVhjbGFzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0aC50b1NWRyhzcGFuLCBkaXYpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzcGFuLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZChzcGFuLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5uLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLkFkZElucHV0SGFuZGxlcnMobWF0aCwgc3BhbiwgZGl2KTtcbiAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgfVxuICAgICAgICBkaXYuY2xhc3NOYW1lID0gZGl2LmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICBpZiAodGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCkge1xuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjtcbiAgICAgICAgICAgIGlmIChzY3JpcHQuTWF0aEpheC5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4ID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gJ3RleGF0b20nKSB7XG4gICAgICAgICAgICBpZiAocm9vdC5kYXRhLmxlbmd0aCAhPT0gMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignVW5leHBlY3RlZCBsZW5ndGggaW4gdGV4YXRvbScpO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChyb290LmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJvb3QuaXNDdXJzb3JhYmxlKCkgfHwgcm9vdC50eXBlID09PSAnbWF0aCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHJvb3QuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cilcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBjdXIudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZVswXSAhPT0gJ20nIHx8IHR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJvdyA9IG5ldyBNTUwubXJvdygpO1xuICAgICAgICAgICAgICAgICAgICByb3cuQXBwZW5kKEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4KGN1cikpO1xuICAgICAgICAgICAgICAgICAgICByb290LlNldERhdGEoaSwgcm93KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJvb3Q7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuQWRkSW5wdXRIYW5kbGVycyA9IGZ1bmN0aW9uIChtYXRoLCBzcGFuLCBkaXYpIHtcbiAgICAgICAgbWF0aC5jdXJzb3IgPSBuZXcgQ3Vyc29yKCk7XG4gICAgICAgIG1hdGgucmVyZW5kZXIgPSByZXJlbmRlcjtcbiAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJzAnKTtcbiAgICAgICAgZnVuY3Rpb24gcmVyZW5kZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgobWF0aCkudG9TVkcoc3BhbiwgZGl2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5yZWZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5yZXN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2suQWZ0ZXIoW3JlcmVuZGVyLCBjYWxsYmFja10sIGVyci5yZXN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNYXRoSmF4LkNhbGxiYWNrKGNhbGxiYWNrKSgpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoZSkge1xuICAgICAgICAgICAgaWYgKG1hdGguY3Vyc29yLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtlLnR5cGVdKVxuICAgICAgICAgICAgICAgIG1hdGguY3Vyc29yLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtlLnR5cGVdLmNhbGwobWF0aC5jdXJzb3IsIGUsIHJlcmVuZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIGhhbmRsZXIpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyU3BhbiA9IGZ1bmN0aW9uIChqYXgsIG1hdGgpIHtcbiAgICAgICAgbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgcmV0dXJuIG1hdGguZmlyc3RDaGlsZDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlckJCb3ggPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoKSB7XG4gICAgICAgIHZhciBiYm94ID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5nZXRCQm94KHNwYW4ucGFyZW50Tm9kZSk7XG4gICAgICAgIGJib3guaCArPSAyO1xuICAgICAgICBiYm94LmQgLT0gMjtcbiAgICAgICAgcmV0dXJuIGJib3g7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuWm9vbSA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgsIE13LCBNaCkge1xuICAgICAgICBzcGFuLmNsYXNzTmFtZSA9IFwiTWF0aEpheF9TVkdcIjtcbiAgICAgICAgdmFyIGVtZXggPSBzcGFuLmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIHZhciBleCA9IGVtZXguZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5lbSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmVtID0gZXggLyBVdGlsLlRlWC54X2hlaWdodCAqIDEwMDA7XG4gICAgICAgIHRoaXMuZXggPSBleDtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtXaWR0aCA9IGpheC5FZGl0YWJsZVNWRy5saW5lV2lkdGg7XG4gICAgICAgIHRoaXMuY3dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmN3aWR0aDtcbiAgICAgICAgZW1leC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVtZXgpO1xuICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHRoaXMubWF0aERJViA9IHNwYW47XG4gICAgICAgIHRoaXMuem9vbVNjYWxlID0gcGFyc2VJbnQoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSAxO1xuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHZhciBzdmcgPSBzcGFuLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3ZnXCIpWzBdLnN0eWxlO1xuICAgICAgICBzdmcubWFyZ2luVG9wID0gc3ZnLm1hcmdpblJpZ2h0ID0gc3ZnLm1hcmdpbkxlZnQgPSAwO1xuICAgICAgICBpZiAoc3ZnLm1hcmdpbkJvdHRvbS5jaGFyQXQoMCkgPT09IFwiLVwiKVxuICAgICAgICAgICAgc3Bhbi5zdHlsZS5tYXJnaW5Cb3R0b20gPSBzdmcubWFyZ2luQm90dG9tLnN1YnN0cigxKTtcbiAgICAgICAgaWYgKHRoaXMub3BlcmFab29tUmVmcmVzaCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5maXJzdENoaWxkLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Bhbi5vZmZzZXRXaWR0aCA8IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5taW5XaWR0aCA9IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIG1hdGguc3R5bGUubWluV2lkdGggPSBtYXRoLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIHZhciB6VyA9IHNwYW4ub2Zmc2V0V2lkdGgsIHpIID0gc3Bhbi5vZmZzZXRIZWlnaHQsIG1IID0gbWF0aC5vZmZzZXRIZWlnaHQsIG1XID0gbWF0aC5vZmZzZXRXaWR0aDtcbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcIlwiO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgWTogLU1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuKS5oLFxuICAgICAgICAgICAgbVc6IG1XLFxuICAgICAgICAgICAgbUg6IG1ILFxuICAgICAgICAgICAgelc6IHpXLFxuICAgICAgICAgICAgekg6IHpIXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuaW5pdFNWRyA9IGZ1bmN0aW9uIChtYXRoLCBzcGFuKSB7IH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlJlbW92ZSA9IGZ1bmN0aW9uIChqYXgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIpO1xuICAgICAgICBpZiAoc3Bhbikge1xuICAgICAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5kaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYW4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzcGFuKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgamF4LkVkaXRhYmxlU1ZHO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZXh0ZW5kRGVsaW1pdGVyViA9IGZ1bmN0aW9uIChzdmcsIEgsIGRlbGltLCBzY2FsZSwgZm9udCkge1xuICAgICAgICB2YXIgdG9wID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0udG9wIHx8IGRlbGltLmV4dCksIGZvbnQpO1xuICAgICAgICB2YXIgYm90ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0uYm90IHx8IGRlbGltLmV4dCksIGZvbnQpO1xuICAgICAgICB2YXIgaCA9IHRvcC5oICsgdG9wLmQgKyBib3QuaCArIGJvdC5kO1xuICAgICAgICB2YXIgeSA9IC10b3AuaDtcbiAgICAgICAgc3ZnLkFkZCh0b3AsIDAsIHkpO1xuICAgICAgICB5IC09IHRvcC5kO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgaCArPSBtaWQuaCArIG1pZC5kO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZWxpbS5taW4gJiYgSCA8IGggKiBkZWxpbS5taW4pIHtcbiAgICAgICAgICAgIEggPSBoICogZGVsaW0ubWluO1xuICAgICAgICB9XG4gICAgICAgIGlmIChIID4gaCkge1xuICAgICAgICAgICAgdmFyIGV4dCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0uZXh0LCBmb250KTtcbiAgICAgICAgICAgIHZhciBrID0gKGRlbGltLm1pZCA/IDIgOiAxKSwgZUggPSAoSCAtIGgpIC8gaywgcyA9IChlSCArIDEwMCkgLyAoZXh0LmggKyBleHQuZCk7XG4gICAgICAgICAgICB3aGlsZSAoay0tID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBnID0gRWRpdGFibGVTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgKHggLSBmdXp6IC8gMiAtIHMgKiByZXAubCArIHJlcC54KSArIFwiLFwiICsgcmVwLnkgKyBcIikgc2NhbGUoXCIgKyBzICsgXCIsMSlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQocmVwLmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeCArPSByVztcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgICAgICAgICB4ICs9IG1pZC53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHggLT0gKHcgLSBXKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgeCwgMCk7XG4gICAgICAgICAgICB4ICs9IG1pZC53IC0gKHcgLSBXKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChyaWdodCwgeCAtIHJpZ2h0LmwsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkc7XG59KSgpO1xudmFyIGxvYWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBjb25zb2xlLmxvZygnTE9BRElORycpO1xuICAgIEVkaXRhYmxlU1ZHLmFwcGx5KE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICBmb3IgKHZhciBpZCBpbiBFZGl0YWJsZVNWRy5wcm90b3R5cGUpIHtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkdbaWRdID0gRWRpdGFibGVTVkcucHJvdG90eXBlW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uc3RydWN0b3IucHJvdG90eXBlW2lkXSA9IEVkaXRhYmxlU1ZHLnByb3RvdHlwZVtpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgfVxuICAgIGZvciAodmFyIGlkIGluIEVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHW2lkXSA9IEVkaXRhYmxlU1ZHW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uc3RydWN0b3IucHJvdG90eXBlW2lkXSA9IEVkaXRhYmxlU1ZHW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICB9XG59O1xuU1ZHRWxlbWVudC5wcm90b3R5cGUuZ2V0VHJhbnNmb3JtVG9FbGVtZW50ID0gU1ZHRWxlbWVudC5wcm90b3R5cGUuZ2V0VHJhbnNmb3JtVG9FbGVtZW50IHx8IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgcmV0dXJuIGVsZW0uZ2V0U2NyZWVuQ1RNKCkuaW52ZXJzZSgpLm11bHRpcGx5KHRoaXMuZ2V0U2NyZWVuQ1RNKCkpO1xufTtcbnNldFRpbWVvdXQobG9hZCwgMTAwMCk7XG52YXIgU3ViU3VwQ3Vyc29yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTdWJTdXBDdXJzb3IoKSB7XG4gICAgfVxuICAgIFN1YlN1cEN1cnNvci5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIGRlc3Q7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBkZXN0ID0gdGhpcy5kYXRhW3RoaXMuYmFzZV07XG4gICAgICAgICAgICBpZiAoZGVzdC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkZXN0Lm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gMSA6IDAsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHZhciBzbWFsbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQID8gdGhpcy5zdWIgOiB0aGlzLnN1cDtcbiAgICAgICAgICAgIHZhciBiYXNlQkIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoIWJhc2VCQiB8fCAhY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuZGF0YVtzbWFsbF0gPyBzbWFsbCA6IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggJiYgdGhpcy5kYXRhW3NtYWxsXSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbc21hbGxdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbc21hbGxdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW3NtYWxsXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBzbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMiA/IDEgOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVt0aGlzLmJhc2VdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoIC8gMiA/IDEgOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIFN1YlN1cEN1cnNvci5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc2VjdGlvbiwgcG9zO1xuICAgICAgICB2YXIgY2hpbGRJZHg7XG4gICAgICAgIGZvciAoY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gdGhpcy5kYXRhW2NoaWxkSWR4XSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGRJZHggPT09IHRoaXMuZGF0YS5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNwZWNpZmllZCBjaGlsZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICB2YXIgY3VycmVudFNlY3Rpb24gPSBjaGlsZElkeDtcbiAgICAgICAgdmFyIG9sZCA9IFtjdXJzb3Iubm9kZSwgY3Vyc29yLnBvc2l0aW9uXTtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBjdXJyZW50U2VjdGlvbixcbiAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgPyAxIDogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghdGhpcy5tb3ZlQ3Vyc29yKGN1cnNvciwgZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUby5hcHBseShjdXJzb3IsIG9sZCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBTdWJTdXBDdXJzb3IucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5kYXRhWzBdO1xuICAgICAgICB2YXIgYmFzZUJCID0gYmFzZS5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICB2YXIgc3ViQkIgPSBzdWIgJiYgc3ViLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdXBCQiA9IHN1cCAmJiBzdXAuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc2VjdGlvbjtcbiAgICAgICAgdmFyIHBvcztcbiAgICAgICAgaWYgKHN1YkJCICYmIFV0aWwuYm94Q29udGFpbnMoc3ViQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Yi5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdWI7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdWJCQi54ICsgKHN1YkJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3VwQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdXBCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1cDtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1cEJCLnggKyAoc3VwQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChiYXNlLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2UubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuYmFzZTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJhc2VCQi54ICsgKGJhc2VCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogc2VjdGlvbixcbiAgICAgICAgICAgIHBvczogcG9zLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFN1YlN1cEN1cnNvci5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgICAgIGlmIChzdXApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5zdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgICAgIGlmIChzdWIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Yi5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5zdWIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvcyA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPyAwIDogMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5WZXJ0aWNhbGx5ID0gdmVydGljYWwgJiYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSA9PT0gKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1Yik7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5Ib3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICB2YXIgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdBd2F5ID0gdmVydGljYWwgPyAhbW92aW5nSW5WZXJ0aWNhbGx5IDogIXRoaXMucmlnaHRNb3ZlU3RheSAmJiBtb3ZlUmlnaHRIb3Jpem9udGFsbHk7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW4gPSBtb3ZpbmdJblZlcnRpY2FsbHkgfHwgbW92aW5nSW5Ib3Jpem9udGFsbHkgfHwgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ICYmIHRoaXMucmlnaHRNb3ZlU3RheTtcbiAgICAgICAgICAgIGlmIChtb3ZpbmdBd2F5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobW92aW5nSW4pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVt0aGlzLmJhc2VdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViID8gRGlyZWN0aW9uLlVQIDogRGlyZWN0aW9uLkRPV04pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPyAxIDogdGhpcy5lbmRpbmdQb3MgfHwgMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvcyA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPyAwIDogMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgU3ViU3VwQ3Vyc29yLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmI7XG4gICAgICAgIHZhciB4LCB5LCBoZWlnaHQ7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBiYiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHZhciBtYWluQkIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBtYWluQkIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IG1haW5CQi5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBiYiA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uc2VjdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IGJiLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBiYi5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgeCA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgPyBiYi54IDogYmIueCArIGJiLndpZHRoO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIFN1YlN1cEN1cnNvci5jdXJzb3JhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gU3ViU3VwQ3Vyc29yO1xufSkoKTtcbnZhciBCQk9YID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBCQk9YKGRlZiwgdHlwZSkge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZSA9PT0gdm9pZCAwKSB7IHR5cGUgPSBcImdcIjsgfVxuICAgICAgICB0aGlzLmdseXBocyA9IHt9O1xuICAgICAgICB0aGlzLmggPSB0aGlzLmQgPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgdGhpcy5IID0gdGhpcy5EID0gMDtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gMDtcbiAgICAgICAgdGhpcy5sID0gVXRpbC5CSUdESU1FTjtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IDE7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IFV0aWwuRWxlbWVudCh0eXBlLCBkZWYpO1xuICAgIH1cbiAgICBCQk9YLnByb3RvdHlwZS5XaXRoID0gZnVuY3Rpb24gKGRlZiwgSFVCKSB7XG4gICAgICAgIHJldHVybiBIVUIuSW5zZXJ0KHRoaXMsIGRlZik7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BZGQgPSBmdW5jdGlvbiAoc3ZnLCBkeCwgZHksIGZvcmNldywgaW5mcm9udCkge1xuICAgICAgICBpZiAoZHgpIHtcbiAgICAgICAgICAgIHN2Zy54ICs9IGR4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChkeSkge1xuICAgICAgICAgICAgc3ZnLnkgKz0gZHk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5lbGVtZW50KSB7XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgc3ZnLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEgJiYgc3ZnLm4gPT09IDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkLCBub2RlTmFtZSA9IGNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lID09PSBcInVzZVwiIHx8IG5vZGVOYW1lID09PSBcInJlY3RcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGNoaWxkO1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2NhbGUgPSBzdmcuY2hpbGRTY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHggPSBzdmcuY2hpbGRYLCB5ID0gc3ZnLmNoaWxkWTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnggKz0geDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnkgKz0geTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmggLT0geTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmQgKz0geTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkggLT0geTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkQgKz0geTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLncgLT0geDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnIgLT0geDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmwgKz0geDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieFwiLCBNYXRoLmZsb29yKHN2Zy54IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShcInlcIiwgTWF0aC5mbG9vcihzdmcueSAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhzdmcueCkgPCAxICYmIE1hdGguYWJzKHN2Zy55KSA8IDEpIHtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlID0gc3ZnLnJlbW92ZWFibGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlTmFtZSA9IHN2Zy5lbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lID09PSBcImdcIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3Ioc3ZnLngpICsgXCIsXCIgKyBNYXRoLmZsb29yKHN2Zy55KSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChub2RlTmFtZSA9PT0gXCJsaW5lXCIgfHwgbm9kZU5hbWUgPT09IFwicG9seWdvblwiIHx8XG4gICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lID09PSBcInBhdGhcIiB8fCBub2RlTmFtZSA9PT0gXCJhXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieFwiLCBNYXRoLmZsb29yKHN2Zy54IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInlcIiwgTWF0aC5mbG9vcihzdmcueSAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uICs9IHN2Zy5uO1xuICAgICAgICAgICAgICAgIHdoaWxlIChzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZyb250ICYmIHRoaXMuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIHRoaXMuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChzdmcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpbmZyb250KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQsIHRoaXMuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaGFzSW5kZW50KSB7XG4gICAgICAgICAgICB0aGlzLmhhc0luZGVudCA9IHN2Zy5oYXNJbmRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy50dyAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnR3ID0gc3ZnLnR3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCAtIHN2Zy55ID4gdGhpcy5kKSB7XG4gICAgICAgICAgICB0aGlzLmQgPSBzdmcuZCAtIHN2Zy55O1xuICAgICAgICAgICAgaWYgKHRoaXMuZCA+IHRoaXMuRCkge1xuICAgICAgICAgICAgICAgIHRoaXMuRCA9IHRoaXMuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnkgKyBzdmcuaCA+IHRoaXMuaCkge1xuICAgICAgICAgICAgdGhpcy5oID0gc3ZnLnkgKyBzdmcuaDtcbiAgICAgICAgICAgIGlmICh0aGlzLmggPiB0aGlzLkgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkggPSB0aGlzLmg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5EIC0gc3ZnLnkgPiB0aGlzLkQpXG4gICAgICAgICAgICB0aGlzLkQgPSBzdmcuRCAtIHN2Zy55O1xuICAgICAgICBpZiAoc3ZnLnkgKyBzdmcuSCA+IHRoaXMuSClcbiAgICAgICAgICAgIHRoaXMuSCA9IHN2Zy55ICsgc3ZnLkg7XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5sIDwgdGhpcy5sKVxuICAgICAgICAgICAgdGhpcy5sID0gc3ZnLnggKyBzdmcubDtcbiAgICAgICAgaWYgKHN2Zy54ICsgc3ZnLnIgPiB0aGlzLnIpXG4gICAgICAgICAgICB0aGlzLnIgPSBzdmcueCArIHN2Zy5yO1xuICAgICAgICBpZiAoZm9yY2V3IHx8IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCkgPiB0aGlzLncpXG4gICAgICAgICAgICB0aGlzLncgPSBzdmcueCArIHN2Zy53ICsgKHN2Zy5YIHx8IDApO1xuICAgICAgICB0aGlzLmNoaWxkU2NhbGUgPSBzdmcuc2NhbGU7XG4gICAgICAgIHRoaXMuY2hpbGRYID0gc3ZnLng7XG4gICAgICAgIHRoaXMuY2hpbGRZID0gc3ZnLnk7XG4gICAgICAgIHRoaXMubisrO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWxpZ24gPSBmdW5jdGlvbiAoc3ZnLCBhbGlnbiwgZHgsIGR5LCBzaGlmdCkge1xuICAgICAgICBpZiAoc2hpZnQgPT09IHZvaWQgMCkgeyBzaGlmdCA9IG51bGw7IH1cbiAgICAgICAgZHggPSAoe1xuICAgICAgICAgICAgbGVmdDogZHgsXG4gICAgICAgICAgICBjZW50ZXI6ICh0aGlzLncgLSBzdmcudykgLyAyLFxuICAgICAgICAgICAgcmlnaHQ6IHRoaXMudyAtIHN2Zy53IC0gZHhcbiAgICAgICAgfSlbYWxpZ25dIHx8IDA7XG4gICAgICAgIHZhciB3ID0gdGhpcy53O1xuICAgICAgICB0aGlzLkFkZChzdmcsIGR4ICsgKHNoaWZ0IHx8IDApLCBkeSk7XG4gICAgICAgIHRoaXMudyA9IHc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5DbGVhbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaCA9PT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IHRoaXMubCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBCQk9YLnR5cGUgPSBcImdcIjtcbiAgICBCQk9YLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgIEJCT1guZGVmcyA9IG51bGw7XG4gICAgQkJPWC5uID0gMDtcbiAgICByZXR1cm4gQkJPWDtcbn0pKCk7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBCQk9YX0cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRztcbn0pKEJCT1gpO1xudmFyIEJCT1hfVEVYVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVEVYVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1RFWFQoSFRNTCwgc2NhbGUsIHRleHQsIGRlZikge1xuICAgICAgICBpZiAoIWRlZilcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICBkZWYuc3Ryb2tlID0gXCJub25lXCI7XG4gICAgICAgIGlmIChkZWZbXCJmb250LXN0eWxlXCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtc3R5bGVcIl07XG4gICAgICAgIGlmIChkZWZbXCJmb250LXdlaWdodFwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXdlaWdodFwiXTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInRleHRcIik7XG4gICAgICAgIEhUTUwuYWRkVGV4dCh0aGlzLmVsZW1lbnQsIHRleHQpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHLnRleHRTVkcuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHLnRleHRTVkcucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgc2NhbGUgKj0gMTAwMCAvIFV0aWwuZW07XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpIG1hdHJpeCgxIDAgMCAtMSAwIDApXCIpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSBiYm94LndpZHRoICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IC1iYm94LnkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gKGJib3guaGVpZ2h0ICsgYmJveC55KSAqIHNjYWxlO1xuICAgIH1cbiAgICBCQk9YX1RFWFQucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX1RFWFQ7XG59KShCQk9YKTtcbnZhciBVdGlsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVdGlsKCkge1xuICAgIH1cbiAgICBVdGlsLkVtID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZW1cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZW1cIjtcbiAgICB9O1xuICAgIFV0aWwuRXggPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBtID0gTWF0aC5yb3VuZChtIC8gdGhpcy5UZVgueF9oZWlnaHQgKiB0aGlzLmV4KSAvIHRoaXMuZXg7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGV4XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImV4XCI7XG4gICAgfTtcbiAgICBVdGlsLlBlcmNlbnQgPSBmdW5jdGlvbiAobSkge1xuICAgICAgICByZXR1cm4gKDEwMCAqIG0pLnRvRml4ZWQoMSkucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCIlXCI7XG4gICAgfTtcbiAgICBVdGlsLkZpeGVkID0gZnVuY3Rpb24gKG0sIG4pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZChuIHx8IDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKTtcbiAgICB9O1xuICAgIFV0aWwuaGFzaENoZWNrID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImdcIikge1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldC5maXJzdENoaWxkLm5vZGVOYW1lICE9PSBcInN2Z1wiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gICAgVXRpbC5FbGVtZW50ID0gZnVuY3Rpb24gKHR5cGUsIGRlZikge1xuICAgICAgICB2YXIgb2JqO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdmc6XCIgKyB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5pc01hdGhKYXggPSB0cnVlO1xuICAgICAgICBpZiAoZGVmKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBkZWYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKGlkLCBkZWZbaWRdLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgVXRpbC5hZGRFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmVudCwgdHlwZSwgZGVmKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQoVXRpbC5FbGVtZW50KHR5cGUsIGRlZikpO1xuICAgIH07XG4gICAgVXRpbC5sZW5ndGgyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSwgc2l6ZSkge1xuICAgICAgICBpZiAobXUgPT09IHZvaWQgMCkgeyBtdSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHNpemUgPT09IHZvaWQgMCkgeyBzaXplID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIChsZW5ndGgpICE9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiXCIpXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLk5PUk1BTClcbiAgICAgICAgICAgIHJldHVybiAxMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuQklHKVxuICAgICAgICAgICAgcmV0dXJuIDIwMDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5TTUFMTClcbiAgICAgICAgICAgIHJldHVybiA3MTA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiaW5maW5pdHlcIilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkJJR0RJTUVOO1xuICAgICAgICBpZiAobGVuZ3RoLm1hdGNoKC9tYXRoc3BhY2UkLykpXG4gICAgICAgICAgICByZXR1cm4gMTAwMCAqIHRoaXMuTUFUSFNQQUNFW2xlbmd0aF07XG4gICAgICAgIHZhciBlbUZhY3RvciA9IChFZGl0YWJsZVNWRy56b29tU2NhbGUgfHwgMSkgLyBVdGlsLmVtO1xuICAgICAgICB2YXIgbWF0Y2ggPSBsZW5ndGgubWF0Y2goL15cXHMqKFstK10/KD86XFwuXFxkK3xcXGQrKD86XFwuXFxkKik/KSk/KHB0fGVtfGV4fG11fHB4fHBjfGlufG1tfGNtfCUpPy8pO1xuICAgICAgICB2YXIgbSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0gfHwgXCIxXCIpICogMTAwMCwgdW5pdCA9IG1hdGNoWzJdO1xuICAgICAgICBpZiAoc2l6ZSA9PSBudWxsKVxuICAgICAgICAgICAgc2l6ZSA9IDEwMDA7XG4gICAgICAgIGlmIChtdSA9PSBudWxsKVxuICAgICAgICAgICAgbXUgPSAxO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJlbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIGlmICh1bml0ID09PSBcImV4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMuVGVYLnhfaGVpZ2h0IC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiJVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDAgKiBzaXplIC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHhcIilcbiAgICAgICAgICAgIHJldHVybiBtICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB0XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwY1wiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiAxLjI7XG4gICAgICAgIGlmICh1bml0ID09PSBcImluXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcImNtXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyLjU0O1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJtbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMjUuNDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibXVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTggKiBtdTtcbiAgICAgICAgcmV0dXJuIG0gKiBzaXplIC8gMTAwMDtcbiAgICB9O1xuICAgIFV0aWwuZ2V0UGFkZGluZyA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgICAgICAgdmFyIHBhZGRpbmcgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBwYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAocGFkZGluZy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFkID0gc3R5bGVzW1wicGFkZGluZ1wiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgIGlmIChwYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1tpZF0gPSBVdGlsLmxlbmd0aDJlbShwYWQpO1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGhhcyA/IHBhZGRpbmcgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLmdldEJvcmRlcnMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBib3JkZXIgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfSwgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIGJvcmRlcikge1xuICAgICAgICAgICAgaWYgKGJvcmRlci5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSBcImJvcmRlclwiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZF0gPSBVdGlsLmxlbmd0aDJlbShzdHlsZXNbSUQgKyBcIldpZHRoXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJTdHlsZVwiXSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBzdHlsZXNbSUQgKyBcIkNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9PT0gXCJpbml0aWFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm9yZGVyW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBib3JkZXIgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLnRoaWNrbmVzczJlbSA9IGZ1bmN0aW9uIChsZW5ndGgsIG11KSB7XG4gICAgICAgIHZhciB0aGljayA9IHRoaXMuVGVYLnJ1bGVfdGhpY2tuZXNzO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuTUVESVVNKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISUNLKSB7XG4gICAgICAgICAgICByZXR1cm4gMS42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aDJlbShsZW5ndGgsIG11LCB0aGljayk7XG4gICAgfTtcbiAgICBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkpO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0VHJhbnNmb3JtVG9FbGVtZW50KHN2ZykpO1xuICAgIH07XG4gICAgVXRpbC5nZXRTVkdFbGVtID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgaWYgKCFlbGVtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgc3ZnID0gZWxlbS5ub2RlTmFtZSA9PT0gJ3N2ZycgPyBlbGVtIDogZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBvd25lciBTVkcgZWxlbWVudCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkuaW52ZXJzZSgpKTtcbiAgICB9O1xuICAgIFV0aWwuYm94Q29udGFpbnMgPSBmdW5jdGlvbiAoYmIsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIGJiICYmIGJiLnggPD0geCAmJiB4IDw9IGJiLnggKyBiYi53aWR0aCAmJiBiYi55IDw9IHkgJiYgeSA8PSBiYi55ICsgYmIuaGVpZ2h0O1xuICAgIH07XG4gICAgVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludCA9IGZ1bmN0aW9uIChub2RlLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYiA9IG5vZGUuZ2V0QkIgJiYgbm9kZS5nZXRCQigpO1xuICAgICAgICB2YXIgcCA9IHRoaXMuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKG5vZGUuRWRpdGFibGVTVkdlbGVtLCB4LCB5KTtcbiAgICAgICAgaWYgKCFiYiB8fCAhcClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGJiLnggPD0gcC54ICYmIHAueCA8PSBiYi54ICsgYmIud2lkdGggJiYgYmIueSA8PSBwLnkgJiYgcC55IDw9IGJiLnkgKyBiYi5oZWlnaHQ7XG4gICAgfTtcbiAgICBVdGlsLmhpZ2hsaWdodEJveCA9IGZ1bmN0aW9uIChzdmcsIGJiKSB7XG4gICAgICAgIHZhciBkID0gMTAwO1xuICAgICAgICB2YXIgZHJhd0xpbmUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHRoaXMuU1ZHTlMsICdsaW5lJyk7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnc3Ryb2tlOnJnYigwLDAsMjU1KTtzdHJva2Utd2lkdGg6MjAnKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgyKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkyKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCArIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCwgYmIueSArIGQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGggLSBkLCBiYi55KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSwgYmIueCArIGJiLndpZHRoLCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54LCBiYi55ICsgYmIuaGVpZ2h0IC0gZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkgKyBiYi5oZWlnaHQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKVxuICAgICAgICBdO1xuICAgIH07XG4gICAgVXRpbC52aXN1YWxpemVKYXggPSBmdW5jdGlvbiAoamF4LCBzZWxlY3RvciwgY3Vyc29yKSB7XG4gICAgICAgIHNlbGVjdG9yLmVtcHR5KCk7XG4gICAgICAgIHZhciBoYiA9IHRoaXMuaGlnaGxpZ2h0Qm94O1xuICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uIChqLCBzcGFjZXIpIHtcbiAgICAgICAgICAgIHZhciBzO1xuICAgICAgICAgICAgdmFyIGVuZDtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGopID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgcyA9IHNwYWNlciArIGogKyBcIlxcblwiO1xuICAgICAgICAgICAgICAgIGVuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzID0gc3BhY2VyICsgKGogPyBqLnR5cGUgOiBcIm51bGxcIikgKyBcIlxcblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGl0ZW0gPSAkKCc8bGk+PHByZSBzdHlsZT1cIm1hcmdpbjogMDtcIj4nICsgcyArICc8L3ByZT48L2xpPicpO1xuICAgICAgICAgICAgaXRlbS5hcHBlbmRUbyhzZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAoZW5kKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGl0ZW0ub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBiYiA9IGouZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIHZhciBzdmcgPSBqLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgICAgICAgICAgaGIoc3ZnLCBiYik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghailcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGouZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGYoai5kYXRhW2ldLCBzcGFjZXIgKyBcIiBcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGYoamF4LnJvb3QgfHwgamF4LCBcIlwiKTtcbiAgICAgICAgY3Vyc29ySW5mbyA9IGN1cnNvciA/IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHR5cGU6IGN1cnNvci5ub2RlLnR5cGUsXG4gICAgICAgICAgICBwb3NpdGlvbjogY3Vyc29yLnBvc2l0aW9uLFxuICAgICAgICAgICAgbW9kZTogY3Vyc29yLm1vZGUsXG4gICAgICAgICAgICBzZWxlY3Rpb25TdGFydDogY3Vyc29yLnNlbGVjdGlvblN0YXJ0ID8gY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGUudHlwZSA6IFwibnVsbFwiLFxuICAgICAgICAgICAgc2VsZWN0aW9uRW5kOiBjdXJzb3Iuc2VsZWN0aW9uRW5kID8gY3Vyc29yLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgOiBcIm51bGxcIlxuICAgICAgICB9KSA6IFwiKG5vIGN1cnNvcilcIjtcbiAgICAgICAgc2VsZWN0b3IucHJlcGVuZCgnPHByZT4nICsgY3Vyc29ySW5mbyArICc8L3ByZT4nKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0SmF4RnJvbU1hdGggPSBmdW5jdGlvbiAobWF0aCkge1xuICAgICAgICBpZiAobWF0aC5wYXJlbnROb2RlLmNsYXNzTmFtZSA9PT0gXCJNYXRoSmF4X1NWR19EaXNwbGF5XCIpIHtcbiAgICAgICAgICAgIG1hdGggPSBtYXRoLnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgbWF0aCA9IG1hdGgubmV4dFNpYmxpbmc7XG4gICAgICAgIH0gd2hpbGUgKG1hdGggJiYgbWF0aC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICE9PSBcInNjcmlwdFwiKTtcbiAgICAgICAgcmV0dXJuIE1hdGhKYXguSHViLmdldEpheEZvcihtYXRoKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0Q3Vyc29yVmFsdWUgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmIChpc05hTihkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvblswXS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAndSc6IHJldHVybiBEaXJlY3Rpb24uVVA7XG4gICAgICAgICAgICAgICAgY2FzZSAnZCc6IHJldHVybiBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgICAgICBjYXNlICdsJzogcmV0dXJuIERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3InOiByZXR1cm4gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvciB2YWx1ZScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgVXRpbC5TVkdOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcbiAgICBVdGlsLlhMSU5LTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIjtcbiAgICBVdGlsLk5CU1AgPSBcIlxcdTAwQTBcIjtcbiAgICBVdGlsLkJJR0RJTUVOID0gMTAwMDAwMDA7XG4gICAgVXRpbC5UZVggPSB7XG4gICAgICAgIHhfaGVpZ2h0OiA0MzAuNTU0LFxuICAgICAgICBxdWFkOiAxMDAwLFxuICAgICAgICBudW0xOiA2NzYuNTA4LFxuICAgICAgICBudW0yOiAzOTMuNzMyLFxuICAgICAgICBudW0zOiA0NDMuNzMsXG4gICAgICAgIGRlbm9tMTogNjg1Ljk1MSxcbiAgICAgICAgZGVub20yOiAzNDQuODQxLFxuICAgICAgICBzdXAxOiA0MTIuODkyLFxuICAgICAgICBzdXAyOiAzNjIuODkyLFxuICAgICAgICBzdXAzOiAyODguODg4LFxuICAgICAgICBzdWIxOiAxNTAsXG4gICAgICAgIHN1YjI6IDI0Ny4yMTcsXG4gICAgICAgIHN1cF9kcm9wOiAzODYuMTA4LFxuICAgICAgICBzdWJfZHJvcDogNTAsXG4gICAgICAgIGRlbGltMTogMjM5MCxcbiAgICAgICAgZGVsaW0yOiAxMDAwLFxuICAgICAgICBheGlzX2hlaWdodDogMjUwLFxuICAgICAgICBydWxlX3RoaWNrbmVzczogNjAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMTogMTExLjExMSxcbiAgICAgICAgYmlnX29wX3NwYWNpbmcyOiAxNjYuNjY2LFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzM6IDIwMCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmc0OiA2MDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNTogMTAwLFxuICAgICAgICBzY3JpcHRzcGFjZTogMTAwLFxuICAgICAgICBudWxsZGVsaW1pdGVyc3BhY2U6IDEyMCxcbiAgICAgICAgZGVsaW1pdGVyZmFjdG9yOiA5MDEsXG4gICAgICAgIGRlbGltaXRlcnNob3J0ZmFsbDogMzAwLFxuICAgICAgICBtaW5fcnVsZV90aGlja25lc3M6IDEuMjUsXG4gICAgICAgIG1pbl9yb290X3NwYWNlOiAxLjVcbiAgICB9O1xuICAgIFV0aWwuTUFUSFNQQUNFID0ge1xuICAgICAgICB2ZXJ5dmVyeXRoaW5tYXRoc3BhY2U6IDEgLyAxOCxcbiAgICAgICAgdmVyeXRoaW5tYXRoc3BhY2U6IDIgLyAxOCxcbiAgICAgICAgdGhpbm1hdGhzcGFjZTogMyAvIDE4LFxuICAgICAgICBtZWRpdW1tYXRoc3BhY2U6IDQgLyAxOCxcbiAgICAgICAgdGhpY2ttYXRoc3BhY2U6IDUgLyAxOCxcbiAgICAgICAgdmVyeXRoaWNrbWF0aHNwYWNlOiA2IC8gMTgsXG4gICAgICAgIHZlcnl2ZXJ5dGhpY2ttYXRoc3BhY2U6IDcgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaW5tYXRoc3BhY2U6IC0xIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXRoaW5tYXRoc3BhY2U6IC0yIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldGhpbm1hdGhzcGFjZTogLTMgLyAxOCxcbiAgICAgICAgbmVnYXRpdmVtZWRpdW1tYXRoc3BhY2U6IC00IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldGhpY2ttYXRoc3BhY2U6IC01IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXRoaWNrbWF0aHNwYWNlOiAtNiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl2ZXJ5dGhpY2ttYXRoc3BhY2U6IC03IC8gMThcbiAgICB9O1xuICAgIHJldHVybiBVdGlsO1xufSkoKTtcbnZhciBCQk9YX0ZSQU1FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9GUkFNRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0ZSQU1FKGgsIGQsIHcsIHQsIGRhc2gsIGNvbG9yLCBzdmcsIGh1YiwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICBkZWYuZmlsbCA9IFwibm9uZVwiO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYud2lkdGggPSBNYXRoLmZsb29yKHcgLSB0KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQgLSB0KTtcbiAgICAgICAgZGVmLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcih0IC8gMikgKyBcIixcIiArIE1hdGguZmxvb3IoLWQgKyB0IC8gMikgKyBcIilcIjtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbTWF0aC5mbG9vcig2ICogVXRpbC5lbSksIE1hdGguZmxvb3IoNiAqIFV0aWwuZW0pXS5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gZDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICB9XG4gICAgQkJPWF9GUkFNRS5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIEJCT1hfRlJBTUU7XG59KShCQk9YKTtcbnZhciBCQk9YX0dMWVBIID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HTFlQSCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0dMWVBIKHNjYWxlLCBpZCwgaCwgZCwgdywgbCwgciwgcCkge1xuICAgICAgICB0aGlzLmdseXBocyA9IHt9O1xuICAgICAgICB0aGlzLm4gPSAwO1xuICAgICAgICB2YXIgZGVmO1xuICAgICAgICB2YXIgdCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5ibGFja2VyO1xuICAgICAgICB2YXIgY2FjaGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlRm9udENhY2hlO1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gKHNjYWxlID09PSAxID8gbnVsbCA6IFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKVwiKTtcbiAgICAgICAgaWYgKGNhY2hlICYmICFNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIGlkID0gXCJFXCIgKyB0aGlzLm4gKyBcIi1cIiArIGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2FjaGUgfHwgIXRoaXMuZ2x5cGhzW2lkXSkge1xuICAgICAgICAgICAgZGVmID0geyBcInN0cm9rZS13aWR0aFwiOiB0IH07XG4gICAgICAgICAgICBpZiAoY2FjaGUpXG4gICAgICAgICAgICAgICAgZGVmLmlkID0gaWQ7XG4gICAgICAgICAgICBlbHNlIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIGRlZi5kID0gKHAgPyBcIk1cIiArIHAgKyBcIlpcIiA6IFwiXCIpO1xuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInBhdGhcIik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdseXBoc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtKVxuICAgICAgICAgICAgICAgIGRlZi50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQoXCJ1c2VcIiwgZGVmKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCBcIiNcIiArIGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICBCQk9YX0dMWVBILnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0pKEJCT1gpO1xudmFyIEJCT1hfSExJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0hMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfSExJTkUodywgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKVxuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueTEgPSBkZWYueTIgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLngyID0gTWF0aC5mbG9vcih3IC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gdDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gMDtcbiAgICB9XG4gICAgQkJPWF9ITElORS5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIEJCT1hfSExJTkU7XG59KShCQk9YKTtcbnZhciBCQk9YX05PTlJFTU9WQUJMRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTk9OUkVNT1ZBQkxFLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTk9OUkVNT1ZBQkxFKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTk9OUkVNT1ZBQkxFO1xufSkoQkJPWF9HKTtcbnZhciBCQk9YX05VTEwgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05VTEwsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9OVUxMKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgYXJnc1tfaSAtIDBdID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5DbGVhbigpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9OVUxMO1xufSkoQkJPWCk7XG52YXIgQkJPWF9SRUNUID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9SRUNULCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUkVDVChoLCBkLCB3LCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PT0gdm9pZCAwKSB7IGRlZiA9IG51bGw7IH1cbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBkZWYud2lkdGggPSBNYXRoLmZsb29yKHcpO1xuICAgICAgICBkZWYuaGVpZ2h0ID0gTWF0aC5mbG9vcihoICsgZCk7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGggKyBkO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLnkgPSAtZDtcbiAgICB9XG4gICAgQkJPWF9SRUNULnR5cGUgPSBcInJlY3RcIjtcbiAgICBCQk9YX1JFQ1QucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX1JFQ1Q7XG59KShCQk9YKTtcbnZhciBCQk9YX1JPVyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUk9XLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUk9XKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbGVtcyA9IFtdO1xuICAgICAgICB0aGlzLnNoID0gdGhpcy5zZCA9IDA7XG4gICAgfVxuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5DaGVjayA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciBzdmcgPSBkYXRhLnRvU1ZHKCk7XG4gICAgICAgIHRoaXMuZWxlbXMucHVzaChzdmcpO1xuICAgICAgICBpZiAoZGF0YS5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgIHN2Zy5tbWwgPSBkYXRhO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA+IHRoaXMuc2gpIHtcbiAgICAgICAgICAgIHRoaXMuc2ggPSBzdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgPiB0aGlzLnNkKSB7XG4gICAgICAgICAgICB0aGlzLnNkID0gc3ZnLmQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5TdHJldGNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZWxlbXMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gdGhpcy5lbGVtc1tpXSwgbW1sID0gc3ZnLm1tbDtcbiAgICAgICAgICAgIGlmIChtbWwpIHtcbiAgICAgICAgICAgICAgICBpZiAobW1sLmZvcmNlU3RyZXRjaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmggIT09IHRoaXMuc2ggfHwgbW1sLkVkaXRhYmxlU1ZHZGF0YS5kICE9PSB0aGlzLnNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2ZyA9IG1tbC5TVkdzdHJldGNoVih0aGlzLnNoLCB0aGlzLnNkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5IVyA9IHRoaXMuc2g7XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5EID0gdGhpcy5zZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaWMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmljID0gc3ZnLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLkFkZChzdmcsIHRoaXMudywgMCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMuZWxlbXM7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWF9ST1c7XG59KShCQk9YKTtcbnZhciBCQk9YX1NWRyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfU1ZHLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfU1ZHKHNjYWxlLCBpZCwgaCwgZCwgdywgbCwgciwgcCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBudWxsLCBcInN2Z1wiKTtcbiAgICB9XG4gICAgQkJPWF9TVkcudHlwZSA9IFwic3ZnXCI7XG4gICAgQkJPWF9TVkcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX1NWRztcbn0pKEJCT1gpO1xudmFyIEJCT1hfVkxJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1ZMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVkxJTkUoaCwgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICBkZWYuc3Ryb2tlID0gY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLngyID0gZGVmLnkxID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi55MiA9IE1hdGguZmxvb3IoaCAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIEJCT1hfVkxJTkUucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX1ZMSU5FO1xufSkoQkJPWCk7XG52YXIgRWxlbWVudEpheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWxlbWVudEpheCgpIHtcbiAgICB9XG4gICAgcmV0dXJuIEVsZW1lbnRKYXg7XG59KSgpO1xudmFyIE1CYXNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQmFzZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1CYXNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ09oIG5vISBDb3VsZG5cXCd0IGZpbmQgZWxlbSBmb3IgdGhpcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uIChBSkFYLCBIVUIsIEhUTUwsIGVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBvYmouY29uc3RydWN0b3IucHJvdG90eXBlID0ge307XG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAgICAgICBvYmpbaWRdID0gdGhpcy5wcm90b3R5cGVbaWRdO1xuICAgICAgICB9XG4gICAgICAgIG9iai5lZGl0YWJsZVNWRyA9IGVkaXRhYmxlU1ZHO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVkID0gdGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHN2Zy5zY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLkFkZChyZW5kZXJlZCwgc3ZnLncsIDAsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gY2hpbGQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIik7XG4gICAgICAgIGlmIChzdmcuc2tldyAmJiB0ZXh0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuciA+IHN2Zy53ICYmIHRleHQubGVuZ3RoID09PSAxICYmICF2YXJpYW50Lm5vSUMpIHtcbiAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHY2hpbGRTVkcgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVtpXSA/IHRoaXMuZGF0YVtpXS50b1NWRygpIDogbmV3IEJCT1goKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQgPSBmdW5jdGlvbiAoaSwgSFcsIEQpIHtcbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHtcbiAgICAgICAgICAgIEhXOiBIVyxcbiAgICAgICAgICAgIEQ6IERcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQkJPWCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKEhXKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzYXZlRGF0YSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgaWYgKCF0aGlzLkVkaXRhYmxlU1ZHZGF0YSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS53ID0gc3ZnLncsIHRoaXMuRWRpdGFibGVTVkdkYXRhLnggPSBzdmcueDtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCA9IHN2Zy5oLCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kID0gc3ZnLmQ7XG4gICAgICAgIGlmIChzdmcueSkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaCArPSBzdmcueTtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgLT0gc3ZnLnk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5YICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5YID0gc3ZnLlg7XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbClcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnR3ID0gc3ZnLnR3O1xuICAgICAgICBpZiAoc3ZnLnNrZXcpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5za2V3ID0gc3ZnLnNrZXc7XG4gICAgICAgIGlmIChzdmcuaWMpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5pYyA9IHN2Zy5pYztcbiAgICAgICAgaWYgKHRoaXNbXCJjbGFzc1wiXSkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IHRoaXNbXCJjbGFzc1wiXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaWQpIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgXCJpZFwiOiB0aGlzLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ocmVmKSB7XG4gICAgICAgICAgICB2YXIgYSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IFwibWp4LXN2Zy1ocmVmXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCB0aGlzLmhyZWYpO1xuICAgICAgICAgICAgYS5vbmNsaWNrID0gdGhpcy5TVkdsaW5rO1xuICAgICAgICAgICAgVXRpbC5hZGRFbGVtZW50KGEsIFwicmVjdFwiLCB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHN2Zy53LFxuICAgICAgICAgICAgICAgIGhlaWdodDogc3ZnLmggKyBzdmcuZCxcbiAgICAgICAgICAgICAgICB5OiAtc3ZnLmQsXG4gICAgICAgICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcInBvaW50ZXItZXZlbnRzXCI6IFwiYWxsXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHN2Zy50eXBlID09PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChnLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmFkZE1NTGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHYWRkQ2xhc3Moc3ZnLmVsZW1lbnQsIFwibWp4LXN2Zy1cIiArIHRoaXMudHlwZSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdHlsZSA9IHRoaXMuc3R5bGU7XG4gICAgICAgIGlmIChzdHlsZSAmJiBzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuYm9yZGVyID0gc3ZnLmVsZW1lbnQuc3R5bGUucGFkZGluZyA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUpIHtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IChzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID09PSBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2FkZEF0dHJpYnV0ZXMoc3ZnKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZENsYXNzID0gZnVuY3Rpb24gKG5vZGUsIG5hbWUpIHtcbiAgICAgICAgdmFyIGNsYXNzZXMgPSBub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIChjbGFzc2VzID8gY2xhc3NlcyArIFwiIFwiIDogXCJcIikgKyBuYW1lKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLmF0dHJOYW1lcykge1xuICAgICAgICAgICAgdmFyIGNvcHkgPSB0aGlzLmF0dHJOYW1lcywgc2tpcCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubm9jb3B5QXR0cmlidXRlcywgaWdub3JlID0gTWF0aEpheC5IdWIuY29uZmlnLmlnbm9yZU1NTGF0dHJpYnV0ZXM7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSAodGhpcy50eXBlID09PSBcIm1zdHlsZVwiID8gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYXRoLnByb3RvdHlwZS5kZWZhdWx0cyA6IHRoaXMuZGVmYXVsdHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBjb3B5Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvcHlbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlnbm9yZVtpZF0gPT0gZmFsc2UgfHwgKCFza2lwW2lkXSAmJiAhaWdub3JlW2lkXSAmJlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c1tpZF0gPT0gbnVsbCAmJiB0eXBlb2YgKHN2Zy5lbGVtZW50W2lkXSkgPT09IFwidW5kZWZpbmVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShpZCwgdGhpcy5hdHRyW2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5rID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHJlZiA9IHRoaXMuaHJlZi5hbmltVmFsO1xuICAgICAgICBpZiAoaHJlZi5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gVXRpbC5oYXNoQ2hlY2soZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaHJlZi5zdWJzdHIoMSkpKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0LnNjcm9sbEludG9WaWV3KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXJlbnROb2RlLnNjcm9sbEludG9WaWV3KHRydWUpO1xuICAgICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmxvY2F0aW9uID0gaHJlZjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHZhciBzcGFuID0gdGhpcy5IVE1MLkVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdwcm9jZXNzU3R5bGVzID0gZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHZhciBzdHlsZXMgPSB7XG4gICAgICAgICAgICBib3JkZXI6IFV0aWwuZ2V0Qm9yZGVycyhzdHlsZSksXG4gICAgICAgICAgICBwYWRkaW5nOiBVdGlsLmdldFBhZGRpbmcoc3R5bGUpXG4gICAgICAgIH07XG4gICAgICAgIGlmICghc3R5bGVzLmJvcmRlcilcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMuYm9yZGVyO1xuICAgICAgICBpZiAoIXN0eWxlcy5wYWRkaW5nKVxuICAgICAgICAgICAgZGVsZXRlIHN0eWxlcy5wYWRkaW5nO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFNpemUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTaXplJ10gPSBzdHlsZS5mb250U2l6ZTtcbiAgICAgICAgaWYgKHN0eWxlLmNvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydjb2xvciddID0gc3R5bGUuY29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5iYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAgICAgICBzdHlsZXNbJ2JhY2tncm91bmQnXSA9IHN0eWxlLmJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTdHlsZSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFN0eWxlJ10gPSBzdHlsZS5mb250U3R5bGU7XG4gICAgICAgIGlmIChzdHlsZS5mb250V2VpZ2h0KVxuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSBzdHlsZS5mb250V2VpZ2h0O1xuICAgICAgICBpZiAoc3R5bGUuZm9udEZhbWlseSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udEZhbWlseSddID0gc3R5bGUuZm9udEZhbWlseTtcbiAgICAgICAgaWYgKHN0eWxlc1snZm9udFdlaWdodCddICYmIHN0eWxlc1snZm9udFdlaWdodCddLm1hdGNoKC9eXFxkKyQvKSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gKHBhcnNlSW50KHN0eWxlc1snZm9udFdlaWdodCddKSA+IDYwMCA/IFwiYm9sZFwiIDogXCJub3JtYWxcIik7XG4gICAgICAgIHJldHVybiBzdHlsZXM7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKHRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudHlwZSAhPT0gXCJtb1wiKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwibHNwYWNlXCIsIFwicnNwYWNlXCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA8PSAwIHx8IHRoaXMuaGFzVmFsdWUoXCJsc3BhY2VcIikgfHwgdGhpcy5oYXNWYWx1ZShcInJzcGFjZVwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubHNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLmxzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMucnNwYWNlID0gTWF0aC5tYXgoMCwgVXRpbC5sZW5ndGgyZW0odmFsdWVzLnJzcGFjZSwgbXUpKTtcbiAgICAgICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMsIHBhcmVudCA9IHRoaXMuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcmVudCAmJiBwYXJlbnQuaXNFbWJlbGxpc2hlZCgpICYmIHBhcmVudC5Db3JlKCkgPT09IGNvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29yZSA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnggKz0gdmFsdWVzLmxzcGFjZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnJzcGFjZSlcbiAgICAgICAgICAgICAgICAgICAgc3ZnLlggPSB2YWx1ZXMucnNwYWNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwYWNlID0gdGhpcy50ZXhTcGFjaW5nKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKCk7XG4gICAgICAgICAgICBpZiAoc3BhY2UgIT09IFwiXCIpXG4gICAgICAgICAgICAgICAgc3ZnLnggKz0gVXRpbC5sZW5ndGgyZW0oc3BhY2UsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZUNvbG9yID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRoY29sb3JcIiwgXCJjb2xvclwiKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzICYmIHRoaXMuc3R5bGVzLmNvbG9yICYmICF2YWx1ZXMuY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5jb2xvciA9IHRoaXMuc3R5bGVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuY29sb3IgJiYgIXRoaXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGNvbG9yID0gdmFsdWVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLm1hdGhjb2xvcixcbiAgICAgICAgICAgICAgICBzdHJva2U6IHZhbHVlcy5tYXRoY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9yZGVycyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkuYm9yZGVyLCBwYWRkaW5nID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5wYWRkaW5nLCBibGVmdCA9ICgoYm9yZGVycyB8fCB7fSkubGVmdCB8fCAwKSwgcGxlZnQgPSAoKHBhZGRpbmcgfHwge30pLmxlZnQgfHwgMCksIGlkO1xuICAgICAgICB2YWx1ZXMuYmFja2dyb3VuZCA9ICh0aGlzLm1hdGhiYWNrZ3JvdW5kIHx8IHRoaXMuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgKHRoaXMuc3R5bGVzIHx8IHt9KS5iYWNrZ3JvdW5kIHx8IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpO1xuICAgICAgICBpZiAoYmxlZnQgKyBwbGVmdCkge1xuICAgICAgICAgICAgdmFyIGR1cCA9IG5ldyBCQk9YKE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc3ZnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN2Zy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVwW2lkXSA9IHN2Z1tpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHVwLnggPSAwO1xuICAgICAgICAgICAgZHVwLnkgPSAwO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KFwiZ1wiKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIHN2Zy5BZGQoZHVwLCBibGVmdCArIHBsZWZ0LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFkZGluZykge1xuICAgICAgICAgICAgc3ZnLncgKz0gcGFkZGluZy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gcGFkZGluZy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IHBhZGRpbmcuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IGJvcmRlcnMucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IGJvcmRlcnMudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBib3JkZXJzLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuYmFja2dyb3VuZCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5DT0xPUi5UUkFOU1BBUkVOVCkge1xuICAgICAgICAgICAgdmFyIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChub2RlTmFtZSAhPT0gXCJnXCIgJiYgbm9kZU5hbWUgIT09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gZztcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1JFQ1Qoc3ZnLmgsIHN2Zy5kLCBzdmcudywge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5iYWNrZ3JvdW5kLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH0pLCAwLCAwLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHZhciBkZCA9IDU7XG4gICAgICAgICAgICB2YXIgc2lkZXMgPSB7XG4gICAgICAgICAgICAgICAgbGVmdDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCAtZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgcmlnaHQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgc3ZnLncgLSBib3JkZXJzLnJpZ2h0ICsgZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgdG9wOiBbXCJIXCIsIHN2Zy53LCAwLCBzdmcuaCAtIGJvcmRlcnMudG9wICsgZGRdLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogW1wiSFwiLCBzdmcudywgMCwgLXN2Zy5kIC0gZGRdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzaWRlcykge1xuICAgICAgICAgICAgICAgIGlmIChzaWRlcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2lkZSA9IHNpZGVzW2lkXSwgYm94ID0gQkJPWFtzaWRlWzBdICsgXCJMSU5FXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChib3goc2lkZVsxXSwgYm9yZGVyc1tpZF0sIGJvcmRlcnNbaWQgKyBcIlN0eWxlXCJdLCBib3JkZXJzW2lkICsgXCJDb2xvclwiXSksIHNpZGVbMl0sIHNpZGVbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRWYXJpYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRodmFyaWFudFwiLCBcImZvbnRmYW1pbHlcIiwgXCJmb250d2VpZ2h0XCIsIFwiZm9udHN0eWxlXCIpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHZhbHVlcy5tYXRodmFyaWFudDtcbiAgICAgICAgaWYgKHRoaXMudmFyaWFudEZvcm0pIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBcIi1UZVgtdmFyaWFudFwiO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5oYXNWYXJpYW50ID0gdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgdmFsdWVzLmZhbWlseSA9IHZhbHVlcy5mb250ZmFtaWx5O1xuICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHZhbHVlcy5mb250d2VpZ2h0O1xuICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdmFsdWVzLmZvbnRzdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zdHlsZXMpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHRoaXMuc3R5bGVzLmZvbnRTdHlsZSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodClcbiAgICAgICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gdGhpcy5zdHlsZXMuZm9udFdlaWdodDtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLmZhbWlseSAmJiB0aGlzLnN0eWxlcy5mb250RmFtaWx5KVxuICAgICAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB0aGlzLnN0eWxlcy5mb250RmFtaWx5O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZmFtaWx5ICYmICF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvYm9sZC8pKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IFwiYm9sZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuc3R5bGUgJiYgdmFsdWVzLm1hdGh2YXJpYW50Lm1hdGNoKC9pdGFsaWMvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IFwiaXRhbGljXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGZvcmNlRmFtaWx5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiB2YWx1ZXMuZmFtaWx5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXN0eWxlXCJdID0gdmFsdWVzLnN0eWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXdlaWdodFwiXSA9IHZhbHVlcy53ZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJib2xkXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xERlJBS1RVUixcbiAgICAgICAgICAgICAgICBzY3JpcHQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0NSSVBULFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQubm9ybWFsLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuRlJBS1RVUixcbiAgICAgICAgICAgICAgICBcImJvbGQtc2NyaXB0XCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwiaXRhbGljXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuSVRBTElDLFxuICAgICAgICAgICAgICAgIGJvbGQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGSVRBTElDLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLnN0eWxlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGl0YWxpYzogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2F1dG9sb2FkRmlsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIG5hbWUgKyBcIi5qc1wiO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGRyYXcgY3Vyc29yJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3SGlnaGxpZ2h0QXQoc3ZnZWxlbSwgYmIueCwgYmIueSwgYmIud2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRTVkdCQm94ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGVsZW0gPSBlbGVtIHx8IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0gfHwgIWVsZW0ub3duZXJTVkdFbGVtZW50KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgYmIgPSBlbGVtLmdldEJCb3goKTtcbiAgICAgICAgaWYgKGVsZW0ubm9kZU5hbWUgPT09ICd1c2UnKSB7XG4gICAgICAgICAgICBiYi54ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneCcpKTtcbiAgICAgICAgICAgIGJiLnkgKz0gTnVtYmVyKGVsZW0uZ2V0QXR0cmlidXRlKCd5JykpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChlbGVtLm93bmVyU1ZHRWxlbWVudCk7XG4gICAgICAgIHZhciBwdG1wID0gZWxlbS5vd25lclNWR0VsZW1lbnQuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgdmFyIGx4ID0gMSAvIDAsIGx5ID0gMSAvIDAsIGh4ID0gLTEgLyAwLCBoeSA9IC0xIC8gMDtcbiAgICAgICAgY2hlY2soYmIueCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLnggKyBiYi53aWR0aCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogbHgsXG4gICAgICAgICAgICB5OiBseSxcbiAgICAgICAgICAgIHdpZHRoOiBoeCAtIGx4LFxuICAgICAgICAgICAgaGVpZ2h0OiBoeSAtIGx5LFxuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBjaGVjayh4LCB5KSB7XG4gICAgICAgICAgICBwdG1wLnggPSB4O1xuICAgICAgICAgICAgcHRtcC55ID0geTtcbiAgICAgICAgICAgIHZhciBwID0gcHRtcC5tYXRyaXhUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICAgICAgICAgIGx4ID0gTWF0aC5taW4obHgsIHAueCk7XG4gICAgICAgICAgICBseSA9IE1hdGgubWluKGx5LCBwLnkpO1xuICAgICAgICAgICAgaHggPSBNYXRoLm1heChoeCwgcC54KTtcbiAgICAgICAgICAgIGh5ID0gTWF0aC5tYXgoaHksIHAueSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNQmFzZU1peGluO1xufSkoRWxlbWVudEpheCk7XG52YXIgQ2hhcnNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoYXJzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ2hhcnNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIENoYXJzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgbiwgTiwgYywgZm9udCwgVkFSSUFOVCwgaSwgbSwgaWQsIE0sIFJBTkdFUztcbiAgICAgICAgaWYgKCF2YXJpYW50KSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFyaWFudC5mb3JjZUZhbWlseSkge1xuICAgICAgICAgICAgdGV4dCA9IG5ldyBCQk9YX1RFWFQoTWF0aEpheC5IVE1MLCBzY2FsZSwgdGV4dCwgdmFyaWFudC5mb250KTtcbiAgICAgICAgICAgIGlmICh2YXJpYW50LmggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5kID0gdmFyaWFudC5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0KTtcbiAgICAgICAgICAgIHRleHQgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIFZBUklBTlQgPSB2YXJpYW50O1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGV4dC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBWQVJJQU5UO1xuICAgICAgICAgICAgbiA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIGMgPSB0ZXh0LmNoYXJBdChpKTtcbiAgICAgICAgICAgIGlmIChuID49IDB4RDgwMCAmJiBuIDwgMHhEQkZGKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIG4gPSAoKChuIC0gMHhEODAwKSA8PCAxMCkgKyAodGV4dC5jaGFyQ29kZUF0KGkpIC0gMHhEQzAwKSkgKyAweDEwMDAwO1xuICAgICAgICAgICAgICAgIGlmIChGT05UREFUQS5SZW1hcFBsYW5lMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbnYgPSBGT05UREFUQS5SZW1hcFBsYW5lMShuLCB2YXJpYW50KTtcbiAgICAgICAgICAgICAgICAgICAgbiA9IG52Lm47XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBudi52YXJpYW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFJBTkdFUyA9IEZPTlREQVRBLlJBTkdFUztcbiAgICAgICAgICAgICAgICBmb3IgKGlkID0gMCwgTSA9IFJBTkdFUy5sZW5ndGg7IGlkIDwgTTsgaWQrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5uYW1lID09PSBcImFscGhhXCIgJiYgdmFyaWFudC5ub0xvd2VyQ2FzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBOID0gdmFyaWFudFtcIm9mZnNldFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoTiAmJiBuID49IFJBTkdFU1tpZF0ubG93ICYmIG4gPD0gUkFOR0VTW2lkXS5oaWdoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5yZW1hcCAmJiBSQU5HRVNbaWRdLnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IE4gKyBSQU5HRVNbaWRdLnJlbWFwW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IG4gLSBSQU5HRVNbaWRdLmxvdyArIE47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0uYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gKz0gUkFOR0VTW2lkXS5hZGQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50W1widmFyaWFudFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAgJiYgdmFyaWFudC5yZW1hcFtuXSkge1xuICAgICAgICAgICAgICAgIG4gPSB2YXJpYW50LnJlbWFwW25dO1xuICAgICAgICAgICAgICAgIGlmICh2YXJpYW50LnJlbWFwLnZhcmlhbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFyaWFudC5yZW1hcC52YXJpYW50XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChGT05UREFUQS5SRU1BUFtuXSAmJiAhdmFyaWFudC5ub1JlbWFwKSB7XG4gICAgICAgICAgICAgICAgbiA9IEZPTlREQVRBLlJFTUFQW25dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW25bMV1dO1xuICAgICAgICAgICAgICAgIG4gPSBuWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiAobikgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gbiArIHRleHQuc3Vic3RyKGkgKyAxKTtcbiAgICAgICAgICAgICAgICBtID0gdGV4dC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaSA9IC0xO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9udCA9IENoYXJzTWl4aW4ubG9va3VwQ2hhcih2YXJpYW50LCBuKTtcbiAgICAgICAgICAgIGMgPSBmb250W25dO1xuICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICBpZiAoKGNbNV0gJiYgY1s1XS5zcGFjZSkgfHwgKGNbNV0gPT09IFwiXCIgJiYgY1swXSArIGNbMV0gPT09IDApKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy53ICs9IGNbMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjID0gW3NjYWxlLCBmb250LmlkICsgXCItXCIgKyBuLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpXS5jb25jYXQoYyk7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIEYoYXJncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJCT1hfR0xZUEguYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgRi5wcm90b3R5cGUgPSBCQk9YX0dMWVBILnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdseXBoID0gbmV3IEYoYyk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQoZ2x5cGgsIHN2Zy53LCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChGT05UREFUQS5ERUxJTUlURVJTW25dKSB7XG4gICAgICAgICAgICAgICAgYyA9IHRoaXMuY3JlYXRlRGVsaW1pdGVyKG4sIDAsIDEsIGZvbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYywgc3ZnLncsIChGT05UREFUQS5ERUxJTUlURVJTW25dLmRpciA9PT0gXCJWXCIgPyBjLmQgOiAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAobiA8PSAweEZGRkYpIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUobik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBOID0gbiAtIDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChOID4+IDEwKSArIDB4RDgwMCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKChOICYgMHgzRkYpICsgMHhEQzAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGJveCA9IG5ldyBCQk9YX1RFWFQoTWF0aEpheC5IVE1MLCBzY2FsZSAqIDEwMCAvIEVESVRBQkxFU1ZHLmNvbmZpZy5zY2FsZSwgYywge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6IHZhcmlhbnQuZGVmYXVsdEZhbWlseSB8fCBFRElUQUJMRVNWRy5jb25maWcudW5kZWZpbmVkRmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogKHZhcmlhbnQuaXRhbGljID8gXCJpdGFsaWNcIiA6IFwiXCIpLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6ICh2YXJpYW50LmJvbGQgPyBcImJvbGRcIiA6IFwiXCIpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBib3guaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBib3guZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICBjLkFkZChib3gpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYywgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLnNpZ25hbC5Qb3N0KFtcIlNWRyBKYXggLSB1bmtub3duIGNoYXJcIiwgbiwgdmFyaWFudF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGV4dC5sZW5ndGggPT0gMSAmJiBmb250LnNrZXcgJiYgZm9udC5za2V3W25dKSB7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGZvbnQuc2tld1tuXSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4ubG9va3VwQ2hhciA9IGZ1bmN0aW9uICh2YXJpYW50LCBuKSB7XG4gICAgICAgIHZhciBpLCBtO1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgaWYgKCF2YXJpYW50LkZPTlRTKSB7XG4gICAgICAgICAgICB2YXIgRk9OVFMgPSBGT05UREFUQS5GT05UUztcbiAgICAgICAgICAgIHZhciBmb250cyA9ICh2YXJpYW50LmZvbnRzIHx8IEZPTlREQVRBLlZBUklBTlQubm9ybWFsLmZvbnRzKTtcbiAgICAgICAgICAgIGlmICghKGZvbnRzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgZm9udHMgPSBbZm9udHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZm9udHMgIT0gZm9udHMpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gZm9udHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50LkZPTlRTID0gW107XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gZm9udHMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEZPTlRTW2ZvbnRzW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50LkZPTlRTLnB1c2goRk9OVFNbZm9udHNbaV1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHZhcmlhbnQuRk9OVFMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZm9udCA9IHZhcmlhbnQuRk9OVFNbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIChmb250KSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB2YXJpYW50LkZPTlRTO1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZm9udFtuXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb250O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5kQmxvY2soZm9udCwgbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiBcInVua25vd25cIlxuICAgICAgICB9O1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIgPSBmdW5jdGlvbiAoY29kZSwgSFcsIHNjYWxlLCBmb250KSB7XG4gICAgICAgIGlmIChzY2FsZSA9PT0gdm9pZCAwKSB7IHNjYWxlID0gbnVsbDsgfVxuICAgICAgICBpZiAoZm9udCA9PT0gdm9pZCAwKSB7IGZvbnQgPSBudWxsOyB9XG4gICAgICAgIHZhciBFRElUQUJMRVNWRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgaWYgKCFzY2FsZSkge1xuICAgICAgICAgICAgc2NhbGUgPSAxO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgaWYgKCFjb2RlKSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLlRlWC5udWxsZGVsaW1pdGVyc3BhY2UgKiBzY2FsZTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEoSFcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIEhXID0gW0hXLCBIV107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGh3ID0gSFdbMV07XG4gICAgICAgIEhXID0gSFdbMF07XG4gICAgICAgIHZhciBkZWxpbSA9IHtcbiAgICAgICAgICAgIGFsaWFzOiBjb2RlLFxuICAgICAgICAgICAgSFc6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGxvYWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0cmV0Y2g6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgICAgICB3aGlsZSAoZGVsaW0uYWxpYXMpIHtcbiAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5hbGlhcztcbiAgICAgICAgICAgIGRlbGltID0gRk9OVERBVEEuREVMSU1JVEVSU1tjb2RlXTtcbiAgICAgICAgICAgIGlmICghZGVsaW0pIHtcbiAgICAgICAgICAgICAgICBkZWxpbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgSFc6IFswLCBGT05UREFUQS5WQVJJQU5UW01hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUxdXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLmxvYWQpIHtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShFRElUQUJMRVNWRy5mb250RGlyICsgXCIvZm9udGRhdGEtXCIgKyBkZWxpbS5sb2FkICsgXCIuanNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGVsaW0uSFcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMF0gKiBzY2FsZSA+PSBIVyAtIDEwIC0gRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXIgfHwgKGkgPT0gbSAtIDEgJiYgIWRlbGltLnN0cmV0Y2gpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjYWxlICo9IGRlbGltLkhXW2ldWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bM10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSA9IGRlbGltLkhXW2ldWzNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBbY29kZSwgZGVsaW0uSFdbaV1bMV1dLCBmb250KS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSwgTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkZWxpbS5zdHJldGNoKSB7XG4gICAgICAgICAgICB0aGlzW1wiZXh0ZW5kRGVsaW1pdGVyXCIgKyBkZWxpbS5kaXJdKHN2ZywgaHcsIGRlbGltLnN0cmV0Y2gsIHNjYWxlLCBmb250KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5jcmVhdGVDaGFyID0gZnVuY3Rpb24gKHNjYWxlLCBkYXRhLCBmb250KSB7XG4gICAgICAgIHZhciB0ZXh0ID0gXCJcIiwgdmFyaWFudCA9IHtcbiAgICAgICAgICAgIGZvbnRzOiBbZGF0YVsxXV0sXG4gICAgICAgICAgICBub1JlbWFwOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEKSB7XG4gICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gW2RhdGFbMV0gKyBcIi1ib2xkXCIsIGRhdGFbMV1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgKGRhdGFbMV0pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gZGF0YVsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGRhdGFbMF0ubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbMF1baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNF0pIHtcbiAgICAgICAgICAgIHNjYWxlID0gc2NhbGUgKiBkYXRhWzRdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICBpZiAoZGF0YVsyXSkge1xuICAgICAgICAgICAgc3ZnLnggPSBkYXRhWzJdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVszXSkge1xuICAgICAgICAgICAgc3ZnLnkgPSBkYXRhWzNdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs1XSkge1xuICAgICAgICAgICAgc3ZnLmggKz0gZGF0YVs1XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNl0pIHtcbiAgICAgICAgICAgIHN2Zy5kICs9IGRhdGFbNl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmZpbmRCbG9jayA9IGZ1bmN0aW9uIChmb250LCBjKSB7XG4gICAgICAgIGlmIChmb250LlJhbmdlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBmb250LlJhbmdlcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IGZvbnQuUmFuZ2VzW2ldWzBdKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gZm9udC5SYW5nZXNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBmb250LlJhbmdlc1tpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGZvbnQuUmFuZ2VzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9udC5SYW5nZXNbal1bMl0gPT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQuUmFuZ2VzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQuZGlyZWN0b3J5ICsgXCIvXCIgKyBmaWxlICsgXCIuanNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvYWRGb250ID0gZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmZvbnREaXIgKyBcIi9cIiArIGZpbGUpKTtcbiAgICB9O1xuICAgIHJldHVybiBDaGFyc01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgRW50aXR5TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhFbnRpdHlNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBFbnRpdHlNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEVudGl0eU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy50b1N0cmluZygpLnJlcGxhY2UoL1tcXHUyMDYxLVxcdTIwNjRdL2csIFwiXCIpO1xuICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgIHRleHQgPSByZW1hcCh0ZXh0LCBjaGFycyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW50aXR5TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBIb2xlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhIb2xlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gSG9sZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy50eXBlID0gXCJob2xlXCI7XG4gICAgfVxuICAgIEhvbGVNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBIb2xlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05PTlRSSVZJQUwgSE9MRSEhIScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgaG9sZSA9IG5ldyBCQk9YX1JFQ1QoNDAwLCAwLCAzMDAsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZScsXG4gICAgICAgICAgICBzdHJva2U6ICdibHVlJyxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6ICcyMCdcbiAgICAgICAgfSk7XG4gICAgICAgIHN2Zy5BZGQoaG9sZSwgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEhvbGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSG9sZSBkb2VzIG5vdCBoYXZlIGEgY2hpbGQnKTtcbiAgICB9O1xuICAgIEhvbGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgSG9sZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChiYm94LndpZHRoIC8gMi4wKTtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdCh0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQsIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gSG9sZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUFjdGlvbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUFjdGlvbk1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1BY3Rpb25NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1BY3Rpb25NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTUFjdGlvbk1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTWF0aE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWF0aE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hdGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChzcGFuLCBkaXYsIHJlcGxhY2UpIHtcbiAgICAgICAgdmFyIENPTkZJRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZztcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbMF0pXG4gICAgICAgICAgICByZXR1cm4gc3BhbjtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50O1xuICAgICAgICBpZiAoU3RyaW5nKE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IFwiMFwiO1xuICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgZGF0YVN2ZyA9IHRoaXMuZGF0YVswXS50b1NWRygpO1xuICAgICAgICBib3guQWRkKGRhdGFTdmcsIDAsIDAsIHRydWUpO1xuICAgICAgICBib3guQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICBVdGlsLkVsZW1lbnQoYm94LmVsZW1lbnQsIHtcbiAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAwLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgVXRpbC5YTElOS05TKTtcbiAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbCA9IE1hdGgubWF4KC1zdmcubCwgMCksIHIgPSBNYXRoLm1heChzdmcuciAtIHN2Zy53LCAwKTtcbiAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIFV0aWwuRXgobCArIHN2Zy53ICsgcikpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgVXRpbC5FeChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0pKTtcbiAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5EIC0gMiAqIFV0aWwuZW0pO1xuICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gVXRpbC5FeCgtbCk7XG4gICAgICAgIHN0eWxlLm1hcmdpblJpZ2h0ID0gVXRpbC5FeCgtcik7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgVXRpbC5GaXhlZCgtbCwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoLXN2Zy5IIC0gVXRpbC5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICBVdGlsLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSwgMSkpO1xuICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gVXRpbC5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgPiBzdmcuZCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gVXRpbC5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsdHRleHQgPSB0aGlzLkdldChcImFsdHRleHRcIik7XG4gICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcInJvbGVcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICBzdmcuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdyZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91cyA9IHNwYW4ucXVlcnlTZWxlY3RvcignLnJlbmRlcmVkLXN2Zy1vdXRwdXQnKTtcbiAgICAgICAgaWYgKHJlcGxhY2UgJiYgcHJldmlvdXMpIHtcbiAgICAgICAgICAgIHNwYW4ucmVwbGFjZUNoaWxkKHN2Zy5lbGVtZW50LCBwcmV2aW91cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuZWxlbWVudCA9IG51bGw7XG4gICAgICAgIGlmICghdGhpcy5pc011bHRpbGluZSAmJiB0aGlzLkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIiAmJiAhc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdmFsdWVzLmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSBcIjBcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5pbmRlbnRzaGlmdCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCAxLCB0aGlzLmVkaXRhYmxlU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICAgICAgc2hpZnQgKz0gKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5SSUdIVCA/IC1pbmRlbnQgOiBpbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LnN0eWxlLnRleHRBbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbjtcbiAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydChzdHlsZSwgKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiBVdGlsLkV4KHNoaWZ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pW3ZhbHVlcy5pbmRlbnRhbGlnbl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzcGFuO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNRXJyb3JNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FcnJvck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FcnJvck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKGRlZik7XG4gICAgICAgIGJib3guQWRkKHRoaXMuU1ZHY2hpbGRTVkcoMCkpO1xuICAgICAgICBiYm94LkNsZWFuKCk7XG4gICAgICAgIGlmIChzY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgYmJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ID0gW1wid1wiLCBcImhcIiwgXCJkXCIsIFwibFwiLCBcInJcIiwgXCJEXCIsIFwiSFwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gYWRqdXN0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGJib3hbYWRqdXN0W2ldXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZTogTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm1lcnJvclN0eWxlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQodGhpcy5zdHlsZXMsIHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNRXJyb3JNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1GZW5jZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GZW5jZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRmVuY2VkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRmVuY2VkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5vcGVuKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLm9wZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDEsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmNsb3NlKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLmNsb3NlKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTUZlbmNlZE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUZyYWNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GcmFjTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZyYWNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHZhciBmcmFjID0gbmV3IEJCT1goKTtcbiAgICAgICAgZnJhYy5zY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShmcmFjKTtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCksIGRlbiA9IHRoaXMuU1ZHY2hpbGRTVkcoMSk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImxpbmV0aGlja25lc3NcIiwgXCJudW1hbGlnblwiLCBcImRlbm9tYWxpZ25cIiwgXCJiZXZlbGxlZFwiKTtcbiAgICAgICAgdmFyIGlzRGlzcGxheSA9IHZhbHVlcy5kaXNwbGF5c3R5bGU7XG4gICAgICAgIHZhciBhID0gVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgaWYgKHZhbHVlcy5iZXZlbGxlZCkge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gKGlzRGlzcGxheSA/IDQwMCA6IDE1MCk7XG4gICAgICAgICAgICB2YXIgSCA9IE1hdGgubWF4KG51bS5oICsgbnVtLmQsIGRlbi5oICsgZGVuLmQpICsgMiAqIGRlbHRhO1xuICAgICAgICAgICAgdmFyIGJldmVsID0gRWRpdGFibGVTVkcuY3JlYXRlRGVsaW1pdGVyKDB4MkYsIEgpO1xuICAgICAgICAgICAgZnJhYy5BZGQobnVtLCAwLCAobnVtLmQgLSBudW0uaCkgLyAyICsgYSArIGRlbHRhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGJldmVsLCBudW0udyAtIGRlbHRhIC8gMiwgKGJldmVsLmQgLSBiZXZlbC5oKSAvIDIgKyBhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGRlbiwgbnVtLncgKyBiZXZlbC53IC0gZGVsdGEsIChkZW4uZCAtIGRlbi5oKSAvIDIgKyBhIC0gZGVsdGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIFcgPSBNYXRoLm1heChudW0udywgZGVuLncpO1xuICAgICAgICAgICAgdmFyIHQgPSBVdGlsLnRoaWNrbmVzczJlbSh2YWx1ZXMubGluZXRoaWNrbmVzcywgdGhpcy5zY2FsZSkgKiB0aGlzLm1zY2FsZSwgcCwgcSwgdSwgdjtcbiAgICAgICAgICAgIHZhciBtdCA9IFV0aWwuVGVYLm1pbl9ydWxlX3RoaWNrbmVzcyAvIFV0aWwuZW0gKiAxMDAwO1xuICAgICAgICAgICAgaWYgKGlzRGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHUgPSBVdGlsLlRlWC5udW0xO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1ID0gKHQgPT09IDAgPyBVdGlsLlRlWC5udW0zIDogVXRpbC5UZVgubnVtMik7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHUgKj0gc2NhbGU7XG4gICAgICAgICAgICB2ICo9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDcgOiAzKSAqIFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzLCAyICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgICAgICB2ICs9IChwIC0gcSkgLyAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLncgPSBXO1xuICAgICAgICAgICAgICAgIHQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyAyIDogMCkgKiBtdCArIHQsIHQgLyAyICsgMS41ICogbXQpO1xuICAgICAgICAgICAgICAgIHEgPSAodSAtIG51bS5kKSAtIChhICsgdCAvIDIpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB1ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBxID0gKGEgLSB0IC8gMikgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdiArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy5BZGQobmV3IEJCT1hfUkVDVCh0IC8gMiwgdCAvIDIsIFcgKyAyICogdCksIDAsIGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnJhYy5BbGlnbihudW0sIHZhbHVlcy5udW1hbGlnbiwgdCwgdSk7XG4gICAgICAgICAgICBmcmFjLkFsaWduKGRlbiwgdmFsdWVzLmRlbm9tYWxpZ24sIHQsIC12KTtcbiAgICAgICAgfVxuICAgICAgICBmcmFjLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5BZGQoZnJhYywgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMudGV4V2l0aERlbGltcyAmJiAhdGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy5YID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogdGhpcy5tc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZS5jYWxsKHRoaXMsIHN2Zyk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIG1pZGxpbmVZID0gYmIueSArIChiYi5oZWlnaHQgLyAyLjApO1xuICAgICAgICB2YXIgbWlkbGluZVggPSBiYi54ICsgKGJiLndpZHRoIC8gMi4wKTtcbiAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgcG9zaXRpb246ICh4IDwgbWlkbGluZVgpID8gMCA6IDEsXG4gICAgICAgICAgICBoYWxmOiAoeSA8IG1pZGxpbmVZKSA/IDAgOiAxLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHZhciBpc051bWVyYXRvciA9IHRoaXMuZGF0YVswXSA9PT0gY2hpbGQ7XG4gICAgICAgIHZhciBpc0Rlbm9taW5hdG9yID0gdGhpcy5kYXRhWzFdID09PSBjaGlsZDtcbiAgICAgICAgaWYgKCFpc051bWVyYXRvciAmJiAhaXNEZW5vbWluYXRvcilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3BlY2lmaWVkIGNoaWxkIG5vdCBmb3VuZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoaXNOdW1lcmF0b3IgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNEZW5vbWluYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGtlZXApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZihpc051bWVyYXRvciA/IDAgOiAxLCBjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvSGFsZiA9IGZ1bmN0aW9uIChoYWxmLCBjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAodGhpcy5kYXRhW2hhbGZdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2hhbGZdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgICBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24pIHtcbiAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtoYWxmXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoYmIgJiYgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBoYWxmOiBoYWxmLFxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b051bWVyYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigwLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoMSwgYywgZCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uTEVGVDpcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLlJJR0hUOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbMF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgICAgICAgICBoYWxmOiAwLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgPyAwIDogMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLlVQOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uRE9XTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yJyk7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHggPSBiYm94LnggKyAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID8gYmJveC53aWR0aCArIDEwMCA6IC0xMDApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLm5hbWUgPSBcIm1mcmFjXCI7XG4gICAgcmV0dXJuIE1GcmFjTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNR2x5cGhNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1HbHlwaE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1HbHlwaE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUdseXBoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBNR2x5cGhNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1NdWx0aVNjcmlwdHNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1NdWx0aVNjcmlwdHNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNTXVsdGlTY3JpcHRzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNTXVsdGlTY3JpcHRzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBNTXVsdGlTY3JpcHRzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW5NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5nZXRDdXJzb3JMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0uZGF0YVswXS5sZW5ndGg7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmdldEN1cnNvckxlbmd0aCgpKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCk7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCh0aGlzLkVkaXRhYmxlU1ZHZWxlbS5jaGlsZHJlbltjaGlsZElkeF0pO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2UsIHBvc3RlZGdlO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICBwcmVlZGdlID0gYmJveC54O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZWJveCA9IHRoaXMuZ2V0U1ZHQkJveCh0aGlzLkVkaXRhYmxlU1ZHZWxlbS5jaGlsZHJlbltjdXJzb3IucG9zaXRpb24gLSAxXSk7XG4gICAgICAgICAgICBwcmVlZGdlID0gcHJlYm94LnggKyBwcmVib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBiYm94LnggKyBiYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBvc3Rib3ggPSB0aGlzLmdldFNWR0JCb3godGhpcy5FZGl0YWJsZVNWR2VsZW0uY2hpbGRyZW5bY3Vyc29yLnBvc2l0aW9uXSk7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IHBvc3Rib3gueDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCA9IChwb3N0ZWRnZSArIHByZWVkZ2UpIC8gMjtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNbk1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTW9NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1vTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW9NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1vTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIGlmIChIVyA9PT0gdm9pZCAwKSB7IEhXID0gbnVsbDsgfVxuICAgICAgICBpZiAoRCA9PT0gdm9pZCAwKSB7IEQgPSBudWxsOyB9XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlNWR3N0cmV0Y2hIKEhXKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJsYXJnZW9wXCIsIFwiZGlzcGxheXN0eWxlXCIpO1xuICAgICAgICBpZiAodmFsdWVzLmxhcmdlb3ApIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UW3ZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcIi1sYXJnZU9wXCIgOiBcIi1zbWFsbE9wXCJdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgdmFyIGlzU2NyaXB0ID0gKHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCkgJiYgdGhpcyAhPT0gcGFyZW50LmRhdGFbMF0pO1xuICAgICAgICB2YXIgbWFwY2hhcnMgPSAoaXNTY3JpcHQgPyB0aGlzLnJlbWFwQ2hhcnMgOiBudWxsKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCA9PT0gMSAmJiBwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm11bmRlcm92ZXIpICYmXG4gICAgICAgICAgICB0aGlzLkNvcmVUZXh0KHBhcmVudC5kYXRhW3BhcmVudC5iYXNlXSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgb3ZlciA9IHBhcmVudC5kYXRhW3BhcmVudC5vdmVyXSwgdW5kZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQudW5kZXJdO1xuICAgICAgICAgICAgaWYgKG92ZXIgJiYgdGhpcyA9PT0gb3Zlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50XCIpKSB7XG4gICAgICAgICAgICAgICAgbWFwY2hhcnMgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5SRU1BUEFDQ0VOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHVuZGVyICYmIHRoaXMgPT09IHVuZGVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnR1bmRlclwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlRVTkRFUjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTY3JpcHQgJiYgdGhpcy5kYXRhLmpvaW4oXCJcIikubWF0Y2goL1snYFwiXFx1MDBCNFxcdTIwMzItXFx1MjAzN1xcdTIwNTddLykpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UW1wiLVRlWC12YXJpYW50XCJdO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHNjYWxlLCB0aGlzLnJlbWFwLCBtYXBjaGFycyksIHggPSBzdmcudztcbiAgICAgICAgICAgICAgICBpZiAoeCA9PT0gMCAmJiAtdGV4dC5sID4gMTAgKiB0ZXh0LncpIHtcbiAgICAgICAgICAgICAgICAgICAgeCArPSAtdGV4dC5sO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKHRleHQsIHgsIDAsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0LnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSB0ZXh0LnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5sYXJnZW9wKSB7XG4gICAgICAgICAgICBzdmcueSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0IC0gKHN2Zy5oIC0gc3ZnLmQpIC8gMiAvIHNjYWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5yID4gc3ZnLncpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMuR2V0KFwic3RyZXRjaHlcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYyA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoYy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5SRU1BUEFDQ0VOVFtjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVJbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjID0gRWRpdGFibGVTVkcuRk9OVERBVEEuREVMSU1JVEVSU1tjLmNoYXJDb2RlQXQoMCldO1xuICAgICAgICB2YXIgY2FuID0gKGMgJiYgYy5kaXIgPT0gZGlyZWN0aW9uLnN1YnN0cigwLCAxKSk7XG4gICAgICAgIGlmICghY2FuKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSBjYW4gJiYgKHRoaXMuR2V0KFwibWluc2l6ZVwiLCB0cnVlKSB8fCB0aGlzLkdldChcIm1heHNpemVcIiwgdHJ1ZSkpO1xuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzeW1tZXRyaWNcIiwgXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiKTtcbiAgICAgICAgdmFyIGF4aXMgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHN2Zy5zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2ZyksIEg7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gMiAqIE1hdGgubWF4KGggLSBheGlzLCBkICsgYXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gaCArIGQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIEggPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIEgpKTtcbiAgICAgICAgaWYgKEggIT0gdmFsdWVzLm1pbnNpemUpIHtcbiAgICAgICAgICAgIEggPSBbTWF0aC5tYXgoSCAqIFV0aWwuVGVYLmRlbGltaXRlcmZhY3RvciAvIDEwMDAsIEggLSBVdGlsLlRlWC5kZWxpbWl0ZXJzaG9ydGZhbGwpLCBIXTtcbiAgICAgICAgfVxuICAgICAgICBzdmcgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCBILCBzdmcuc2NhbGUpO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAvIDIgKyBheGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAqIGggLyAoaCArIGQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy55ID0gSCAtIHN2Zy5oO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiLCBcIm1hdGh2YXJpYW50XCIsIFwiZm9udHdlaWdodFwiKTtcbiAgICAgICAgaWYgKCh2YWx1ZXMuZm9udHdlaWdodCA9PT0gXCJib2xkXCIgfHwgcGFyc2VJbnQodmFsdWVzLmZvbnR3ZWlnaHQpID49IDYwMCkgJiZcbiAgICAgICAgICAgICF0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHZhcmlhbnQgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB3ID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCB3KSk7XG4gICAgICAgIHN2ZyA9IEVkaXRhYmxlU1ZHLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCB3LCBzdmcuc2NhbGUsIHZhbHVlcy5tYXRodmFyaWFudCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICBkZWxldGUgdGhpcy5zdmcuZWxlbWVudDtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBzdmcuc3RyZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNb01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVBhZGRlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBhZGRlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1QYWRkZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIHBhZCA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIsIFwibHNwYWNlXCIsIFwidm9mZnNldFwiKSwgWCA9IDAsIFkgPSAwO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBYID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMubHNwYWNlLCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnZvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICBZID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMudm9mZnNldCwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGggPSBwYWQuaCwgZCA9IHBhZC5kLCB3ID0gcGFkLncsIHkgPSBwYWQueTtcbiAgICAgICAgICAgIHN2Zy5BZGQocGFkLCBYLCBZKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgc3ZnLmggPSBoICsgeTtcbiAgICAgICAgICAgIHN2Zy5kID0gZCAtIHk7XG4gICAgICAgICAgICBzdmcudyA9IHc7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5oZWlnaHQgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuaCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmhlaWdodCwgbXUsIFwiaFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZGVwdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuZCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmRlcHRoLCBtdSwgXCJkXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53aWR0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy53ID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMud2lkdGgsIG11LCBcIndcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLmggPiBzdmcuSCkge1xuICAgICAgICAgICAgICAgIHN2Zy5IID0gc3ZnLmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoc3ZnLmQgPiBzdmcuRCkge1xuICAgICAgICAgICAgICAgIHN2Zy5EID0gc3ZnLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1QYWRkZWRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1QaGFudG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGhhbnRvbU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1QaGFudG9tTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUGhhbnRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHdoaWxlIChzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiAhc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVBoYW50b21NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1TcXJ0TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3FydE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcXJ0TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3FydE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCksIHJ1bGUsIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZSwgcCwgcSwgSCwgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gRWRpdGFibGVTVkcuY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIHJldHVybiBNU3FydE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVJvb3RNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb290TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvb3RNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMudG9TVkcgPSBNU3FydE1peGluLnRvU1ZHO1xuICAgIH1cbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICB2YXIgZHggPSAoc3VyZC5pc011bHRpQ2hhciA/IC41NSA6IC42NSkgKiBzdXJkLnc7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMV0pIHtcbiAgICAgICAgICAgIHZhciByb290ID0gdGhpcy5kYXRhWzFdLnRvU1ZHKCk7XG4gICAgICAgICAgICByb290LnggPSAwO1xuICAgICAgICAgICAgdmFyIGggPSB0aGlzLlNWR3Jvb3RIZWlnaHQoc3VyZC5oICsgc3VyZC5kLCBzY2FsZSwgcm9vdCkgLSBkO1xuICAgICAgICAgICAgdmFyIHcgPSBNYXRoLm1pbihyb290LncsIHJvb3Qucik7XG4gICAgICAgICAgICB4ID0gTWF0aC5tYXgodywgZHgpO1xuICAgICAgICAgICAgc3ZnLkFkZChyb290LCB4IC0gdywgaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkeCA9IHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggLSBkeDtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR3Jvb3RIZWlnaHQgPSBmdW5jdGlvbiAoZCwgc2NhbGUsIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIC40NSAqIChkIC0gOTAwICogc2NhbGUpICsgNjAwICogc2NhbGUgKyBNYXRoLm1heCgwLCByb290LmQgLSA3NSk7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjLCBkLCB0aGlzKTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjLCBkKTtcbiAgICB9O1xuICAgIHJldHVybiBNUm9vdE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvd01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpXG4gICAgICAgICAgICBzdmcgPSB0aGlzLlNWR211bHRpbGluZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5saW5lYnJlYWtDb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYyAmJlxuICAgICAgICAgICAgc3ZnLncgPiB0aGlzLmVkaXRhYmxlU1ZHLmxpbmVicmVha1dpZHRoKSB8fCB0aGlzLmhhc05ld2xpbmUoKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbXVsdGlsaW5lID0gZnVuY3Rpb24gKHNwYW4pIHtcbiAgICAgICAgcmV0dXJuIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UuU1ZHYXV0b2xvYWRGaWxlKFwibXVsdGlsaW5lXCIpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgdyksIHN2Zy53LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yUGFzc3Rocm91Z2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4ICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJiLnggKyAoYmIud2lkdGggLyAyKTtcbiAgICAgICAgICAgIGlmICh4IDwgbWlkcG9pbnQpIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5kYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoaWxkUG9zaXRpb24gPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gY3Vyc29yLnBvc2l0aW9uIC0gMSA6IGN1cnNvci5wb3NpdGlvbjtcbiAgICAgICAgaWYgKGN1cnNvci5tb2RlID09PSBjdXJzb3IuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW2NoaWxkUG9zaXRpb25dLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBwcmVlZGdlLCBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3JIaWdobGlnaHQgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB2YXIgY3VyID0gY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGU7XG4gICAgICAgICAgICB2YXIgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgICAgIGlmIChjdXIucGFyZW50ID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5kYXRhLmluZGV4T2YoY3VyKSArIDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHNlbGVjdGlvblN0YXJ0IG5vdCBpbiBtcm93XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uRW5kLm5vZGUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIHZhciBwb3MyID0gTWF0aC5tYXgoY3Vyc29yLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCBjdXJzb3Iuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgaWYgKHBvczEgPT09IHBvczIpIHtcbiAgICAgICAgICAgIGN1cnNvci5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4MSA9IHRoaXMuZGF0YVtwb3MxXS5nZXRTVkdCQm94KCkueDtcbiAgICAgICAgdmFyIHBvczJiYiA9IHRoaXMuZGF0YVtwb3MyIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeDIgPSBwb3MyYmIueCArIHBvczJiYi53aWR0aDtcbiAgICAgICAgdmFyIHdpZHRoID0geDIgLSB4MTtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIHgxLCBiYi55LCB3aWR0aCwgYmIuaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNUm93TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy50b1NWRyA9IE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWQ7XG4gICAgfVxuICAgIHJldHVybiBNc01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVNwYWNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3BhY2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3BhY2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TcGFjZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiKTtcbiAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5tYXRoYmFja2dyb3VuZDtcbiAgICAgICAgaWYgKHRoaXMuYmFja2dyb3VuZCAmJiAhdGhpcy5tYXRoYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5iYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMubXNjYWxlLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgc3ZnLmggPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuaGVpZ2h0LCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLmQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuZGVwdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLndpZHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgaWYgKHN2Zy53IDwgMCkge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcudztcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA8IC1zdmcuZCkge1xuICAgICAgICAgICAgc3ZnLmQgPSAtc3ZnLmg7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLmwgPSAwO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVNwYWNlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3R5bGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdHlsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdHlsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgbWF0aCA9IHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBpZiAobWF0aC5pYykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IG1hdGguaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoSCh3KSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hWKGgsIGQpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIHJldHVybiBNU3R5bGVNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1TdWJTdXBNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdWJTdXBNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3ViU3VwTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLmVuZGluZ1BvcyA9IDE7XG4gICAgfVxuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCksIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKHRoaXMuYmFzZSwgSFcsIEQpKTtcbiAgICAgICAgdmFyIHNzY2FsZSA9ICh0aGlzLmRhdGFbdGhpcy5zdXBdIHx8IHRoaXMuZGF0YVt0aGlzLnN1Yl0gfHwgdGhpcykuU1ZHZ2V0U2NhbGUoKTtcbiAgICAgICAgdmFyIHhfaGVpZ2h0ID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZSwgcyA9IFV0aWwuVGVYLnNjcmlwdHNwYWNlICogc2NhbGU7XG4gICAgICAgIHZhciBzdXAsIHN1YjtcbiAgICAgICAgaWYgKHRoaXMuU1ZHbm90RW1wdHkodGhpcy5kYXRhW3RoaXMuc3VwXSkpIHtcbiAgICAgICAgICAgIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF0udG9TVkcoKTtcbiAgICAgICAgICAgIHN1cC53ICs9IHM7XG4gICAgICAgICAgICBzdXAuciA9IE1hdGgubWF4KHN1cC53LCBzdXAucik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuU1ZHbm90RW1wdHkodGhpcy5kYXRhW3RoaXMuc3ViXSkpIHtcbiAgICAgICAgICAgIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl0udG9TVkcoKTtcbiAgICAgICAgICAgIHN1Yi53ICs9IHM7XG4gICAgICAgICAgICBzdWIuciA9IE1hdGgubWF4KHN1Yi53LCBzdWIucik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHEgPSBVdGlsLlRlWC5zdXBfZHJvcCAqIHNzY2FsZSwgciA9IFV0aWwuVGVYLnN1Yl9kcm9wICogc3NjYWxlO1xuICAgICAgICB2YXIgdSA9IGJhc2UuaCArIChiYXNlLnkgfHwgMCkgLSBxLCB2ID0gYmFzZS5kIC0gKGJhc2UueSB8fCAwKSArIHIsIGRlbHRhID0gMCwgcDtcbiAgICAgICAgaWYgKGJhc2UuaWMpIHtcbiAgICAgICAgICAgIGJhc2UudyAtPSBiYXNlLmljO1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXSAmJlxuICAgICAgICAgICAgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibWlcIiB8fCB0aGlzLmRhdGFbdGhpcy5iYXNlXS50eXBlID09PSBcIm1vXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uZGF0YS5qb2luKFwiXCIpLmxlbmd0aCA9PT0gMSAmJiBiYXNlLnNjYWxlID09PSAxICYmXG4gICAgICAgICAgICAgICAgIWJhc2Uuc3RyZXRjaGVkICYmICF0aGlzLmRhdGFbdGhpcy5iYXNlXS5HZXQoXCJsYXJnZW9wXCIpKSB7XG4gICAgICAgICAgICAgICAgdSA9IHYgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBtaW4gPSB0aGlzLmdldFZhbHVlcyhcInN1YnNjcmlwdHNoaWZ0XCIsIFwic3VwZXJzY3JpcHRzaGlmdFwiKTtcbiAgICAgICAgbWluLnN1YnNjcmlwdHNoaWZ0ID0gKG1pbi5zdWJzY3JpcHRzaGlmdCA9PT0gXCJcIiA/IDAgOiBVdGlsLmxlbmd0aDJlbShtaW4uc3Vic2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIG1pbi5zdXBlcnNjcmlwdHNoaWZ0ID0gKG1pbi5zdXBlcnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdXBlcnNjcmlwdHNoaWZ0LCBtdSkpO1xuICAgICAgICB2YXIgeCA9IGJhc2UudyArIGJhc2UueDtcbiAgICAgICAgaWYgKCFzdXApIHtcbiAgICAgICAgICAgIGlmIChzdWIpIHtcbiAgICAgICAgICAgICAgICB2ID0gTWF0aC5tYXgodiwgVXRpbC5UZVguc3ViMSAqIHNjYWxlLCBzdWIuaCAtICg0IC8gNSkgKiB4X2hlaWdodCwgbWluLnN1YnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1YiwgeCwgLXYpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLXY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXN1Yikge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcInRleHByaW1lc3R5bGVcIik7XG4gICAgICAgICAgICAgICAgcCA9IFV0aWwuVGVYWyh2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCJzdXAxXCIgOiAodmFsdWVzLnRleHByaW1lc3R5bGUgPyBcInN1cDNcIiA6IFwic3VwMlwiKSldO1xuICAgICAgICAgICAgICAgIHUgPSBNYXRoLm1heCh1LCBwICogc2NhbGUsIHN1cC5kICsgKDEgLyA0KSAqIHhfaGVpZ2h0LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgdSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IHU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2ID0gTWF0aC5tYXgodiwgVXRpbC5UZVguc3ViMiAqIHNjYWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgICAgICAgICAgaWYgKCh1IC0gc3VwLmQpIC0gKHN1Yi5oIC0gdikgPCAzICogdCkge1xuICAgICAgICAgICAgICAgICAgICB2ID0gMyAqIHQgLSB1ICsgc3VwLmQgKyBzdWIuaDtcbiAgICAgICAgICAgICAgICAgICAgcSA9ICg0IC8gNSkgKiB4X2hlaWdodCAtICh1IC0gc3VwLmQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHUgKz0gcTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgLT0gcTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3ViU3VwTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVGFibGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UYWJsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1UYWJsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVRleHRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UZXh0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRleHRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UZXh0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm10ZXh0Rm9udEluaGVyaXQgfHwgdGhpcy5QYXJlbnQoKS50eXBlID09PSBcIm1lcnJvclwiKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICAgICAgdmFyIGRlZiA9IHsgZGlyZWN0aW9uOiB0aGlzLkdldChcImRpclwiKSB9O1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuYm9sZCkge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtd2VpZ2h0XCJdID0gXCJib2xkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5pdGFsaWMpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJmb250LXN0eWxlXCJdID0gXCJpdGFsaWNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQgPSB0aGlzLkdldChcIm1hdGh2YXJpYW50XCIpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQgPT09IFwibW9ub3NwYWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLW1vbm9zcGFjZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodmFyaWFudC5tYXRjaCgvc2Fucy1zZXJpZi8pKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiY2xhc3NcIl0gPSBcIk1KWC1zYW5zLXNlcmlmXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1RFWFQodGhpcy5IVE1MLCBzY2FsZSAqIDEwMCAvIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5zY2FsZSwgdGhpcy5kYXRhLmpvaW4oXCJcIiksIGRlZikpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UZXh0TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVW5kZXJPdmVyTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVW5kZXJPdmVyTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVVuZGVyT3Zlck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAwO1xuICAgICAgICB0aGlzLnJpZ2h0TW92ZVN0YXkgPSB0cnVlO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2VtYW50aWNzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBUZVhBdG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhUZVhBdG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVGVYQXRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVEVYQ0xBU1MuVkNFTlRFUikge1xuICAgICAgICAgICAgICAgIHkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChib3guaCArIGJveC5kKSAvIDIgKyBib3guZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94LCAwLCB5KTtcbiAgICAgICAgICAgIHN2Zy5pYyA9IGJveC5pYztcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gYm94LnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVYQXRvbSBkcmF3Q3Vyc29yIE5PVCBJTVBMRU1FTlRFRCcpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBUZVhBdG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
