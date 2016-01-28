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
            if (matched.cursorable) {
                current = matched;
            }
            else {
                break;
            }
        }
        current.moveCursorFromClick(this, cp.x, cp.y);
    };
    Cursor.prototype.moveTo = function (node, position) {
        if (this.mode === Cursor.BACKSLASH && !node.backslashRow)
            return false;
        this.node = node;
        this.position = position;
        if (this.mode === this.SELECTION) {
            this.selectionEnd = {
                node: this.node,
                position: this.position
            };
        }
    };
    Cursor.prototype.updateSelection = function (shiftKey) {
        if (shiftKey && this.mode === this.NORMAL) {
            this.mode = this.SELECTION;
            this.selectionStart = {
                node: this.node,
                position: this.position
            };
        }
        else if (this.mode === this.SELECTION) {
            if (shiftKey) {
                this.selectionEnd = {
                    node: this.node,
                    position: this.position
                };
            }
            else {
                this.mode = this.NORMAL;
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
            var hole = Cursor.MML.hole();
            var rowindex = node.parent.data.indexOf(node);
            node.parent.SetData(rowindex, hole);
            hole.moveCursorFromParent(this);
        }
    };
    Cursor.prototype.exitBackslashMode = function (replace) {
        this.mode = this.NORMAL;
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
        if (this.mode === this.SELECTION) {
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
            if (!prev.cursorable) {
                if (this.mode === Cursor.BACKSLASH && this.node.data.length === 1) {
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
                this.mode = this.SELECTION;
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
        var mo = new Cursor.MML.mo();
        var entity = new Cursor.MML.entity();
        entity.Append(unicode);
        mo.Append(entity);
        return mo;
    };
    Cursor.prototype.makeEntityMi = function (unicode) {
        var mi = new Cursor.MML.mi();
        var entity = new Cursor.MML.entity();
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
                    var hole = new Cursor.MML.hole();
                    var result = new Cursor.MML.mfrac(hole, new Cursor.MML.hole());
                    result.moveCursorAfter = [hole, 0];
                    return this.result = result;
                }
                if (cs === 'sqrt') {
                    var result = new Cursor.MML.msqrt();
                    var hole = new Cursor.MML.hole();
                    result.SetData(0, hole);
                    result.moveCursorAfter = [hole, 0];
                    return this.result = result;
                }
                if (Cursor.DEFS.macros[cs]) {
                    console.log(Cursor.DEFS.macros[cs]);
                    var namedDirectly = Cursor.DEFS.macros[cs] === 'NamedOp' || Cursor.DEFS.macros[cs] === 'NamedFn';
                    var namedArray = Cursor.DEFS.macros[cs][0] && (Cursor.DEFS.macros[cs][0] === 'NamedFn' || Cursor.DEFS.macros[cs][0] === 'NamedOp');
                    if (namedDirectly || namedArray) {
                        var value;
                        if (namedArray && Cursor.DEFS.macros[cs][1]) {
                            value = Cursor.DEFS.macros[cs][1].replace(/&thinsp;/, "\u2006");
                        }
                        else {
                            value = cs;
                        }
                        return this.result = new Cursor.MML.mo(new Cursor.MML.chars(value));
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
            var row = Cursor.MML.mrow();
            parent.SetData(holeIndex, row);
            row.moveCursorFromParent(this, Direction.RIGHT);
        }
        if (this.mode === Cursor.BACKSLASH) {
            this.node.EditableSVGelem.classList.remove('invalid');
        }
        if (this.node.type === 'mrow') {
            if (c === "\\") {
                if (this.mode !== Cursor.BACKSLASH) {
                    this.mode = Cursor.BACKSLASH;
                    var grayRow = Cursor.MML.mrow(Cursor.MML.mo(Cursor.MML.entity('#x005C')));
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
                    var hole = Cursor.MML.hole();
                    msubsup.SetData(index, hole);
                    this.moveTo(hole, 0);
                }.bind(this);
                var index = (c === "_") ? Cursor.MML.msubsup().sub : Cursor.MML.msubsup().sup;
                if (prev.type === "msubsup" || prev.type === "munderover") {
                    if (prev.data[index]) {
                        var thing = prev.data[index];
                        if (thing.cursorable) {
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
                    var msubsup = Cursor.MML.msubsup();
                    msubsup.SetData(msubsup.base, prev);
                    this.node.SetData(this.position - 1, msubsup);
                    createAndMoveIntoHole(msubsup, index);
                }
                recall(['refocus', this]);
                return;
            }
            else if (c === " ") {
                if (this.mode === Cursor.BACKSLASH) {
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
                            this.mode = this.NORMAL;
                        }]);
                    return;
                }
            }
            if (Cursor.DEFS.letter.test(c) || Cursor.DEFS.number.test(c)) {
                toInsert = new Cursor.MML.mi(new Cursor.MML.chars(c));
            }
            else if (Cursor.DEFS.remap[c]) {
                toInsert = new Cursor.MML.mo(new Cursor.MML.entity('#x' + Cursor.DEFS.remap[c]));
            }
            else if (c === '+' || c === '/' || c === '=' || c === '.' || c === '(' || c === ')') {
                toInsert = new Cursor.MML.mo(new Cursor.MML.chars(c));
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
            if (cur.cursorable) {
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
        if (this.mode === this.SELECTION) {
            if (this.selectionEnd.node.type === 'mrow') {
                this.selectionEnd.node.drawCursorHighlight(this);
            }
        }
        var jax = MathJax.Hub.getAllJax('#' + svgelem.parentNode.id)[0];
        Util.visualizeJax(jax, $('#mmlviz'), this);
        if (!skipScroll)
            this.scrollIntoView(svgelem);
    };
    Cursor.prototype.clearHighlight = function () {
        this.mode = this.NORMAL;
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
    Cursor.BACKSLASH = 'backslash';
    Cursor.NORMAL = 'normal';
    Cursor.SELECTION = 'selection';
    Cursor.mode = 'normal';
    Cursor.MML = MathJax.ElementJax.mml;
    Cursor.DEFS = MathJax.InputJax.TeX.Definitions;
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
    EditableSVG.prototype.AddInputHandlers = function (math, span, div) {
        math.cursor = new MathJax.Object.Cursor();
        math.rerender = rerender;
        span.setAttribute('tabindex', '0');
        function rerender(callback) {
            try {
                SVG.preprocessElementJax(math).toSVG(span, div, true);
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
            if (math.cursor[e.type]) {
                math.cursor[e.type](e, rerender);
            }
        }
        span.addEventListener('keydown', handler);
        span.addEventListener('keypress', handler);
        span.addEventListener('mousedown', handler);
        span.addEventListener('blur', handler);
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
setTimeout(load, 1000);
var SubSupCursor = (function () {
    function SubSupCursor() {
    }
    SubSupCursor.prototype.moveCursorFromParent = function (cursor, direction) {
        var direction = Util.getCursorValue(direction);
        var dest;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
            dest = this.data[this.base];
            if (dest.cursorable) {
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
                if (this.data[small].cursorable) {
                    return this.data[small].moveCursorFromParent(cursor, direction);
                }
                var bb = this.data[small].getSVGBBox();
                cursor.position = {
                    section: small,
                    pos: cursor.renderedPosition.x > bb.x + bb.width / 2 ? 1 : 0,
                };
            }
            else {
                if (this.data[this.base].cursorable) {
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
            if (sub.cursorable) {
                return sub.moveCursorFromClick(cursor, x, y);
            }
            section = this.sub;
            var midpoint = subBB.x + (subBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else if (supBB && Util.boxContains(supBB, x, y)) {
            if (sup.cursorable) {
                return sup.moveCursorFromClick(cursor, x, y);
            }
            section = this.sup;
            var midpoint = supBB.x + (supBB.width / 2.0);
            pos = (x < midpoint) ? 0 : 1;
        }
        else {
            if (base.cursorable) {
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
                    if (sup.cursorable) {
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
                    if (sub.cursorable) {
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
                if (this.data[this.base].cursorable) {
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
    Util.prototype.highlightBox = function (svg, bb) {
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
    Util.prototype.visualizeJax = function (jax, selector, cursor) {
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
    function MBaseMixin(AJAX) {
        _super.call(this);
        this.AJAX = AJAX;
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
        var other = {
            AJAX: AJAX,
            HUB: HUB,
            HTML: HTML,
        };
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
        MathJax.Hub.RestartAfter(this.AJAX.Require(file));
    };
    MBaseMixin.prototype.SVGautoloadFile = function (name) {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + name + ".js";
        MathJax.Hub.RestartAfter(this.AJAX.Require(file));
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
        console.log('handling entity: ', text);
        return CharsMixin.HandleVariant(variant, scale, text);
    };
    return EntityMixin;
})(MBaseMixin);
var HoleMixin = (function (_super) {
    __extends(HoleMixin, _super);
    function HoleMixin() {
        _super.apply(this, arguments);
    }
    HoleMixin.prototype.toSVG = function (h, d) {
        this.SVGgetStyles();
        var svg = this.SVG();
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
        svg.Clean();
        var hole = SVG.createHole(300, 400);
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
    HoleMixin.type = "hole";
    HoleMixin.cursorable = true;
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
    MathMixin.prototype.toSVG = function (span, div) {
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
        span.appendChild(svg.element);
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
    MathMixin.cursorable = false;
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
        if (this.data[cursor.position.half].cursorable) {
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
        if (this.data[half].cursorable) {
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
        var direction = getCursorValue(direction);
        switch (direction) {
            case Direction.LEFT:
            case Direction.RIGHT:
                if (this.data[0].cursorable) {
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
    MFracMixin.cursorable = true;
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
    MnMixin.cursorable = true;
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
    MRootMixin.cursorable = true;
    return MRootMixin;
})(MBaseMixin);
var MRowMixin = (function (_super) {
    __extends(MRowMixin, _super);
    function MRowMixin() {
        _super.apply(this, arguments);
    }
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
        if (this.SVGlineBreaks(svg)) {
            svg = this.SVGmultiline(svg);
        }
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
    MRowMixin.cursorable = true;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImpheC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBEaXJlY3Rpb247XG4oZnVuY3Rpb24gKERpcmVjdGlvbikge1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJVUFwiXSA9IDBdID0gXCJVUFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJSSUdIVFwiXSA9IDFdID0gXCJSSUdIVFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJET1dOXCJdID0gMl0gPSBcIkRPV05cIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiTEVGVFwiXSA9IDNdID0gXCJMRUZUXCI7XG59KShEaXJlY3Rpb24gfHwgKERpcmVjdGlvbiA9IHt9KSk7XG52YXIgQ3Vyc29yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDdXJzb3IoKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMuaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMik7XG4gICAgICAgIHRoaXMud2lkdGggPSA1MDtcbiAgICB9XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZWZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMubm9kZSB8fCAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbSB8fCAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnRcbiAgICAgICAgICAgIHx8ICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlLmZvY3VzKCk7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG9DbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICB2YXIgc3ZnID0gdGFyZ2V0Lm5vZGVOYW1lID09PSAnc3ZnJyA/IHRhcmdldCA6IHRhcmdldC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY3AgPSBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyhzdmcsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICB2YXIgamF4ID0gVXRpbC5nZXRKYXhGcm9tTWF0aChzdmcucGFyZW50Tm9kZSk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gamF4LnJvb3Q7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZEl0ZW1zID0gY3VycmVudC5kYXRhLmZpbHRlcihmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2h1aD8gbWF0Y2hlZCBtb3JlIHRoYW4gb25lIGNoaWxkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IG1hdGNoZWRJdGVtc1swXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gbWF0Y2hlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnQubW92ZUN1cnNvckZyb21DbGljayh0aGlzLCBjcC54LCBjcC55KTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZVRvID0gZnVuY3Rpb24gKG5vZGUsIHBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5CQUNLU0xBU0ggJiYgIW5vZGUuYmFja3NsYXNoUm93KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IHRoaXMuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUudXBkYXRlU2VsZWN0aW9uID0gZnVuY3Rpb24gKHNoaWZ0S2V5KSB7XG4gICAgICAgIGlmIChzaGlmdEtleSAmJiB0aGlzLm1vZGUgPT09IHRoaXMuTk9STUFMKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGUgPSB0aGlzLlNFTEVDVElPTjtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubW9kZSA9PT0gdGhpcy5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmIChzaGlmdEtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IHRoaXMuTk9STUFMO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBzaGlmdEtleSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGlvbihzaGlmdEtleSk7XG4gICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubm9kZS5kcmF3Q3Vyc29yKHRoaXMpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbjtcbiAgICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgIHRoaXMuYmFja3NwYWNlKGV2ZW50LCByZWNhbGwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyNzpcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKCk7XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoZGlyZWN0aW9uLCBldmVudC5zaGlmdEtleSk7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb24oZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICB0aGlzLm1vdmVUb0NsaWNrKGV2ZW50KTtcbiAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VIb2xlSWZOZWVkZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBDdXJzb3IuTU1MLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByb3dpbmRleCA9IG5vZGUucGFyZW50LmRhdGEuaW5kZXhPZihub2RlKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50LlNldERhdGEocm93aW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgaG9sZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5leGl0QmFja3NsYXNoTW9kZSA9IGZ1bmN0aW9uIChyZXBsYWNlKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IHRoaXMuTk9STUFMO1xuICAgICAgICB2YXIgcHBvcyA9IHRoaXMubm9kZS5wYXJlbnQuZGF0YS5pbmRleE9mKHRoaXMubm9kZSk7XG4gICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudC5kYXRhLnNwbGljZShwcG9zLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuU2V0RGF0YShwcG9zKyssIHJlcGxhY2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUby5hcHBseSh0aGlzLCByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUucGFyZW50LCBwcG9zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5iYWNrc3BhY2UgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gdGhpcy5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUudHlwZSA9PT0gJ21yb3cnICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlID09PSB0aGlzLnNlbGVjdGlvbkVuZC5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbih0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdmFyIHBvczIgPSBNYXRoLm1heCh0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlLmRhdGEuc3BsaWNlKHBvczEsIHBvczIgLSBwb3MxKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUsIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZG8gdGhpcyBiYWNrc3BhY2VcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICAgICAgaWYgKCFwcmV2LmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQkFDS1NMQVNIICYmIHRoaXMubm9kZS5kYXRhLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiAtIDEsIDEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gdGhpcy5TRUxFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb24gLSAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiYWNrc3BhY2Ugb24gaG9sZSEnKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlRW50aXR5TW8gPSBmdW5jdGlvbiAodW5pY29kZSkge1xuICAgICAgICB2YXIgbW8gPSBuZXcgQ3Vyc29yLk1NTC5tbygpO1xuICAgICAgICB2YXIgZW50aXR5ID0gbmV3IEN1cnNvci5NTUwuZW50aXR5KCk7XG4gICAgICAgIGVudGl0eS5BcHBlbmQodW5pY29kZSk7XG4gICAgICAgIG1vLkFwcGVuZChlbnRpdHkpO1xuICAgICAgICByZXR1cm4gbW87XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNaSA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtaSA9IG5ldyBDdXJzb3IuTU1MLm1pKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgQ3Vyc29yLk1NTC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbWkuQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtaTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZVBhcnNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtcbiAgICAgICAgICAgIG1tbFRva2VuOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFB1c2g6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN1bHQgPSB4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vb3A6IGZ1bmN0aW9uICgpIHsgfSxcbiAgICAgICAgICAgIHBhcnNlQ29udHJvbFNlcXVlbmNlOiBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGVja1NwZWNpYWxDUyhjcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLmNzID0gY3M7XG4gICAgICAgICAgICAgICAgdGhpcy5jc1VuZGVmaW5lZCA9IHRoaXMuY3NGaW5kTWFjcm8gPSB0aGlzLm5vb3A7XG4gICAgICAgICAgICAgICAgdGhpcy5Db250cm9sU2VxdWVuY2UoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5jc0ZpbmRNYWNybztcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5jc1VuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR2V0Q1M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGVja1NwZWNpYWxDUzogZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNzID09PSAnZnJhYycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhvbGUgPSBuZXcgQ3Vyc29yLk1NTC5ob2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQ3Vyc29yLk1NTC5tZnJhYyhob2xlLCBuZXcgQ3Vyc29yLk1NTC5ob2xlKCkpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQubW92ZUN1cnNvckFmdGVyID0gW2hvbGUsIDBdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjcyA9PT0gJ3NxcnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQ3Vyc29yLk1NTC5tc3FydCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBDdXJzb3IuTU1MLmhvbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LlNldERhdGEoMCwgaG9sZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKEN1cnNvci5ERUZTLm1hY3Jvc1tjc10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coQ3Vyc29yLkRFRlMubWFjcm9zW2NzXSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuYW1lZERpcmVjdGx5ID0gQ3Vyc29yLkRFRlMubWFjcm9zW2NzXSA9PT0gJ05hbWVkT3AnIHx8IEN1cnNvci5ERUZTLm1hY3Jvc1tjc10gPT09ICdOYW1lZEZuJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWVkQXJyYXkgPSBDdXJzb3IuREVGUy5tYWNyb3NbY3NdWzBdICYmIChDdXJzb3IuREVGUy5tYWNyb3NbY3NdWzBdID09PSAnTmFtZWRGbicgfHwgQ3Vyc29yLkRFRlMubWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkT3AnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWVkRGlyZWN0bHkgfHwgbmFtZWRBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWVkQXJyYXkgJiYgQ3Vyc29yLkRFRlMubWFjcm9zW2NzXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gQ3Vyc29yLkRFRlMubWFjcm9zW2NzXVsxXS5yZXBsYWNlKC8mdGhpbnNwOy8sIFwiXFx1MjAwNlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gY3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHQgPSBuZXcgQ3Vyc29yLk1NTC5tbyhuZXcgQ3Vyc29yLk1NTC5jaGFycyh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YWNrOiB7IGVudjoge30gfSxcbiAgICAgICAgfTtcbiAgICAgICAgb2JqLl9fcHJvdG9fXyA9IE1hdGhKYXguSW5wdXRKYXguVGVYLlBhcnNlLnByb3RvdHlwZTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgY29kZSA9IGV2ZW50LmNoYXJDb2RlIHx8IGV2ZW50LmtleUNvZGUgfHwgZXZlbnQud2hpY2g7XG4gICAgICAgIHZhciBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgdmFyIHRvSW5zZXJ0O1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUucGFyZW50O1xuICAgICAgICAgICAgdmFyIGhvbGVJbmRleCA9IHBhcmVudC5kYXRhLmluZGV4T2YodGhpcy5ub2RlKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBDdXJzb3IuTU1MLm1yb3coKTtcbiAgICAgICAgICAgIHBhcmVudC5TZXREYXRhKGhvbGVJbmRleCwgcm93KTtcbiAgICAgICAgICAgIHJvdy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LnJlbW92ZSgnaW52YWxpZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ21yb3cnKSB7XG4gICAgICAgICAgICBpZiAoYyA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb2RlICE9PSBDdXJzb3IuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5CQUNLU0xBU0g7XG4gICAgICAgICAgICAgICAgICAgIHZhciBncmF5Um93ID0gQ3Vyc29yLk1NTC5tcm93KEN1cnNvci5NTUwubW8oQ3Vyc29yLk1NTC5lbnRpdHkoJyN4MDA1QycpKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYXlSb3cuYmFja3NsYXNoUm93ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCBncmF5Um93KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENsYXNzID0gZ3JheVJvdy5jbHMgPyBncmF5Um93LmNscyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNscyA9IG9sZENsYXNzICsgXCJiYWNrc2xhc2gtbW9kZVwiO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhncmF5Um93LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RPRE86IGluc2VydCBhIFxcXFwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSBcIl5cIiB8fCBjID09PSBcIl9cIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICAgICAgdmFyIGNyZWF0ZUFuZE1vdmVJbnRvSG9sZSA9IGZ1bmN0aW9uIChtc3Vic3VwLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9sZSA9IEN1cnNvci5NTUwuaG9sZSgpO1xuICAgICAgICAgICAgICAgICAgICBtc3Vic3VwLlNldERhdGEoaW5kZXgsIGhvbGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhob2xlLCAwKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gKGMgPT09IFwiX1wiKSA/IEN1cnNvci5NTUwubXN1YnN1cCgpLnN1YiA6IEN1cnNvci5NTUwubXN1YnN1cCgpLnN1cDtcbiAgICAgICAgICAgICAgICBpZiAocHJldi50eXBlID09PSBcIm1zdWJzdXBcIiB8fCBwcmV2LnR5cGUgPT09IFwibXVuZGVyb3ZlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2LmRhdGFbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhpbmcgPSBwcmV2LmRhdGFbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaW5nLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGluZy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uTEVGVCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhwcmV2LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVBbmRNb3ZlSW50b0hvbGUocHJldiwgaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbXN1YnN1cCA9IEN1cnNvci5NTUwubXN1YnN1cCgpO1xuICAgICAgICAgICAgICAgICAgICBtc3Vic3VwLlNldERhdGEobXN1YnN1cC5iYXNlLCBwcmV2KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLlNldERhdGEodGhpcy5wb3NpdGlvbiAtIDEsIG1zdWJzdXApO1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVBbmRNb3ZlSW50b0hvbGUobXN1YnN1cCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiIFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ZXggPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHRoaXMubm9kZS5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWkgPSB0aGlzLm5vZGUuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtaS50eXBlICE9PSAnbWknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBub24taWRlbnRpZmllciBpbiBiYWNrc2xhc2ggZXhwcmVzc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNoYXJzID0gbWkuZGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjID0gY2hhcnMuZGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdGV4ICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlciA9IHRoaXMubWFrZVBhcnNlcigpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlKGxhdGV4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LmFkZCgnaW52YWxpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtcm93ID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsICdyJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IHRoaXMuTk9STUFMO1xuICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKEN1cnNvci5ERUZTLmxldHRlci50ZXN0KGMpIHx8IEN1cnNvci5ERUZTLm51bWJlci50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgQ3Vyc29yLk1NTC5taShuZXcgQ3Vyc29yLk1NTC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChDdXJzb3IuREVGUy5yZW1hcFtjXSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IEN1cnNvci5NTUwubW8obmV3IEN1cnNvci5NTUwuZW50aXR5KCcjeCcgKyBDdXJzb3IuREVGUy5yZW1hcFtjXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gJysnIHx8IGMgPT09ICcvJyB8fCBjID09PSAnPScgfHwgYyA9PT0gJy4nIHx8IGMgPT09ICcoJyB8fCBjID09PSAnKScpIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBDdXJzb3IuTU1MLm1vKG5ldyBDdXJzb3IuTU1MLmNoYXJzKGMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRvSW5zZXJ0KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiwgMCwgbnVsbCk7XG4gICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24sIHRvSW5zZXJ0KTtcbiAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKERpcmVjdGlvbi5SSUdIVCk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICB9XSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmNsZWFyQm94ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmJveGVzKSB7XG4gICAgICAgICAgICB0aGlzLmJveGVzLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgICAgICBlbGVtLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib3hlcyA9IFtdO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oaWdobGlnaHRCb3hlcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIGN1ciA9IHRoaXMubm9kZTtcbiAgICAgICAgdGhpcy5jbGVhckJveGVzKCk7XG4gICAgICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgICAgIGlmIChjdXIuY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgIHZhciBiYiA9IGN1ci5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94ZXMgPSB0aGlzLmJveGVzLmNvbmNhdChVdGlsLmhpZ2hsaWdodEJveChzdmcsIGJiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1cnNvci0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXdBdCA9IGZ1bmN0aW9uIChzdmdlbGVtLCB4LCB5LCBoZWlnaHQsIHNraXBTY3JvbGwpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlZFBvc2l0aW9uID0geyB4OiB4LCB5OiB5LCBoZWlnaHQ6IGhlaWdodCB9O1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAnIzc3Nzc3NycpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdtYXRoLWN1cnNvcicpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb2xkY2xhc3MgPSBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgb2xkY2xhc3Muc3BsaXQoJ2JsaW5rJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHRoaXMud2lkdGgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnN0YXJ0QmxpbmspO1xuICAgICAgICB0aGlzLnN0YXJ0QmxpbmsgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgKyAnIGJsaW5rJyk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgNTAwKTtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRCb3hlcyhzdmdlbGVtKTtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gdGhpcy5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUuZHJhd0N1cnNvckhpZ2hsaWdodCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgamF4ID0gTWF0aEpheC5IdWIuZ2V0QWxsSmF4KCcjJyArIHN2Z2VsZW0ucGFyZW50Tm9kZS5pZClbMF07XG4gICAgICAgIFV0aWwudmlzdWFsaXplSmF4KGpheCwgJCgnI21tbHZpeicpLCB0aGlzKTtcbiAgICAgICAgaWYgKCFza2lwU2Nyb2xsKVxuICAgICAgICAgICAgdGhpcy5zY3JvbGxJbnRvVmlldyhzdmdlbGVtKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY2xlYXJIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IHRoaXMuTk9STUFMO1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLmhpZGVIaWdobGlnaHQoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlkZUhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmIChjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0hpZ2hsaWdodEF0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAncmdiYSgxNzMsIDIxNiwgMjUwLCAwLjUpJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZDtcbiAgICAgICAgICAgIHN2Z2VsZW0uYXBwZW5kQ2hpbGQoY2VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uIChzdmdlbGVtKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW5kZXJlZFBvc2l0aW9uKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgeCA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi54O1xuICAgICAgICB2YXIgeSA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLmhlaWdodDtcbiAgICAgICAgdmFyIGNsaWVudFBvaW50ID0gVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMoc3ZnZWxlbSwgeCwgeSArIGhlaWdodCAvIDIpO1xuICAgICAgICB2YXIgY2xpZW50V2lkdGggPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuICAgICAgICB2YXIgY2xpZW50SGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG4gICAgICAgIHZhciBzeCA9IDAsIHN5ID0gMDtcbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnggPCAwIHx8IGNsaWVudFBvaW50LnggPiBjbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc3ggPSBjbGllbnRQb2ludC54IC0gY2xpZW50V2lkdGggLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbGllbnRQb2ludC55IDwgMCB8fCBjbGllbnRQb2ludC55ID4gY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICBzeSA9IGNsaWVudFBvaW50LnkgLSBjbGllbnRIZWlnaHQgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeCB8fCBzeSkge1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbEJ5KHN4LCBzeSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kRWxlbWVudCgpO1xuICAgICAgICBpZiAoY3Vyc29yKVxuICAgICAgICAgICAgY3Vyc29yLnJlbW92ZSgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5ibHVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzRmlyc3RIb2xlID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKCFyb290KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocm9vdC50eXBlID09PSBcImhvbGVcIikge1xuICAgICAgICAgICAgdGhpcy5ub2RlID0gcm9vdDtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNGaXJzdEhvbGUocm9vdC5kYXRhW2ldKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBDdXJzb3IuQkFDS1NMQVNIID0gJ2JhY2tzbGFzaCc7XG4gICAgQ3Vyc29yLk5PUk1BTCA9ICdub3JtYWwnO1xuICAgIEN1cnNvci5TRUxFQ1RJT04gPSAnc2VsZWN0aW9uJztcbiAgICBDdXJzb3IubW9kZSA9ICdub3JtYWwnO1xuICAgIEN1cnNvci5NTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgIEN1cnNvci5ERUZTID0gTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnM7XG4gICAgcmV0dXJuIEN1cnNvcjtcbn0pKCk7XG52YXIgRWRpdGFibGVTVkdDb25maWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHQ29uZmlnKCkge1xuICAgIH1cbiAgICBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMgPSB7XG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHXCI6IHtcbiAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiBcIjEwMCVcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwidGV4dC1hbGlnblwiOiBcImxlZnRcIixcbiAgICAgICAgICAgIFwidGV4dC10cmFuc2Zvcm1cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtc3BhY2luZ1wiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3b3JkLXdyYXBcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgIFwiZmxvYXRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImRpcmVjdGlvblwiOiBcImx0clwiLFxuICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICBcInRleHQtaW5kZW50XCI6IDAsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcIjEwMCVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgIHRyYW5zaXRpb246IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItd2Via2l0LXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1zLXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1vLXRyYW5zaXRpb25cIjogXCJub25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIubWp4LXN2Zy1ocmVmXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiYmx1ZVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI6IHtcbiAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmUhaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiNjBleFwiLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiI01hdGhKYXhfU1ZHX1Rvb2x0aXBcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiYXV0b1wiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJub25lXCJcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHQ29uZmlnO1xufSkoKTtcbnZhciBFZGl0YWJsZVNWRyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkcoKSB7XG4gICAgICAgIHRoaXMuVE9VQ0ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuaGlkZVByb2Nlc3NlZE1hdGggPSB0cnVlO1xuICAgICAgICB0aGlzLmZvbnROYW1lcyA9IFtcIlRlWFwiLCBcIlNUSVhcIiwgXCJTVElYLVdlYlwiLCBcIkFzYW5hLU1hdGhcIixcbiAgICAgICAgICAgIFwiR3lyZS1UZXJtZXNcIiwgXCJHeXJlLVBhZ2VsbGFcIiwgXCJMYXRpbi1Nb2Rlcm5cIiwgXCJOZW8tRXVsZXJcIl07XG4gICAgICAgIHRoaXMuVGV4dE5vZGUgPSBNYXRoSmF4LkhUTUwuVGV4dE5vZGU7XG4gICAgICAgIHRoaXMuYWRkVGV4dCA9IE1hdGhKYXguSFRNTC5hZGRUZXh0O1xuICAgICAgICB0aGlzLnVjTWF0Y2ggPSBNYXRoSmF4LkhUTUwudWNNYXRjaDtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJtbWwgSmF4IFJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICAgICAgTU1MLmhvbGUgPSBNTUwuaG9sZSA9IE1NTC5tYmFzZS5TdWJjbGFzcyh7fSk7XG4gICAgICAgICAgICBNTUwuaG9sZS5BdWdtZW50KEhvbGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1iYXNlLkF1Z21lbnQoTUJhc2VNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLmVudGl0eS5BdWdtZW50KEVudGl0eU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubW8uQXVnbWVudChNb01peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVycm9yLkF1Z21lbnQoTUVycm9yTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcy5BdWdtZW50KE1zTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcGFjZS5BdWdtZW50KE1TcGFjZU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBoYW50b20uQXVnbWVudChNUGhhbnRvbU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb3cuQXVnbWVudChNUm93TWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3R5bGUuQXVnbWVudChNU3R5bGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zcXJ0LkF1Z21lbnQoTVNxcnRNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb290LkF1Z21lbnQoTVJvb3RNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZW5jbG9zZS5BdWdtZW50KE1FbmNsb3NlTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYWN0aW9uLkF1Z21lbnQoTUFjdGlvbk1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdW5kZXJvdmVyLkF1Z21lbnQoTVVuZGVyT3Zlck1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXN1YnN1cC5BdWdtZW50KE1TdWJTdXBNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tdGFibGUuQXVnbWVudChNVGFibGVNaXhpbi5nZXRNZXRob2RzKE1hdGhKYXguQWpheCwgTWF0aEpheC5IdWIsIE1hdGhKYXguSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hdGguQXVnbWVudChNYXRoTWl4aW4uZ2V0TWV0aG9kcyhNYXRoSmF4LkFqYXgsIE1hdGhKYXguSHViLCBNYXRoSmF4LkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHMoTWF0aEpheC5BamF4LCBNYXRoSmF4Lkh1YiwgTWF0aEpheC5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUxbXCJhbm5vdGF0aW9uLXhtbFwiXS5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICB0b1NWRzogTU1MLm1iYXNlLlNWR2F1dG9sb2FkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwib25Mb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgZWRpdGFibGVzdmc6ICcsIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoTWF0aEpheC5DYWxsYmFjayhbXCJsb2FkQ29tcGxldGVcIiwgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcsIFwiamF4LmpzXCJdKSwgMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5Ccm93c2VyLlNlbGVjdCh7XG4gICAgICAgICAgICBPcGVyYTogZnVuY3Rpb24gKGJyb3dzZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgICAgICBvcGVyYVpvb21SZWZyZXNoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZCBDb29raWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLmNvbmZpZy5tZW51U2V0dGluZ3Muem9vbSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4LkFqYXguUmVxdWlyZShcIltNYXRoSmF4XS9leHRlbnNpb25zL01hdGhab29tLmpzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICAgICAgICAgIGlmICghZG9jdW1lbnQubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5uYW1lc3BhY2VzLmFkZChcInN2Z1wiLCBVdGlsLlNWR05TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSBNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLCBjb25maWcgPSB0aGlzLmNvbmZpZywgZm9udCA9IHNldHRpbmdzLmZvbnQ7XG4gICAgICAgIGlmIChzZXR0aW5ncy5zY2FsZSkge1xuICAgICAgICAgICAgY29uZmlnLnNjYWxlID0gc2V0dGluZ3Muc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCAhPT0gXCJBdXRvXCIpIHtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhMb2NhbHxXZWJ8SW1hZ2UpJC9pLCBcIlwiKTtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pLywgXCIkMS0kMlwiKTtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gZm9udDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gY29uZmlnLmZvbnQgfHwgXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb250TmFtZXMuaW5kZXhPZih0aGlzLmZvbnRJblVzZSkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250RGlyICs9IFwiL1wiICsgdGhpcy5mb250SW5Vc2U7XG4gICAgICAgIGlmICghdGhpcy5yZXF1aXJlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaCh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS5qc1wiKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2goTWF0aEpheC5PdXRwdXRKYXguZXh0ZW5zaW9uRGlyICsgXCIvTWF0aEV2ZW50cy5qc1wiKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgRVZFTlQgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50O1xuICAgICAgICB0aGlzLlRPVUNIID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ub3VjaDtcbiAgICAgICAgdmFyIEhPVkVSID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ib3ZlcjtcbiAgICAgICAgdGhpcy5Db250ZXh0TWVudSA9IEVWRU5ULkNvbnRleHRNZW51O1xuICAgICAgICB0aGlzLk1vdXNlb3ZlciA9IEhPVkVSLk1vdXNlb3ZlcjtcbiAgICAgICAgdGhpcy5Nb3VzZW91dCA9IEhPVkVSLk1vdXNlb3V0O1xuICAgICAgICB0aGlzLk1vdXNlbW92ZSA9IEhPVkVSLk1vdXNlbW92ZTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgICAgICAgICB0ZXh0SW5kZW50OiAwLFxuICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm06IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgbGV0dGVyU3BhY2luZzogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICB3b3JkU3BhY2luZzogXCJub3JtYWxcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5EaXYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUodGhpcy5oaWRkZW5EaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfSGlkZGVuXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogXCI1aW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgVXRpbC5weFBlckluY2ggPSBkaXYub2Zmc2V0V2lkdGggLyA1O1xuICAgICAgICB0aGlzLmhpZGRlbkRpdi5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB0aGlzLnRleHRTVkcgPSBVdGlsLkVsZW1lbnQoXCJzdmdcIik7XG4gICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IFV0aWwuYWRkRWxlbWVudChVdGlsLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYucGFyZW50Tm9kZSwgXCJzdmdcIiksIFwiZGVmc1wiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19nbHlwaHNcIlxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5FeFNwYW4gPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXG4gICAgICAgICAgICBbXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0V4Qm94XCJcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFtcbiAgICAgICAgICAgIFtcImhyXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHRoaXMuY29uZmlnLnN0eWxlcztcbiAgICAgICAgZm9yICh2YXIgcyBpbiBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMpIHtcbiAgICAgICAgICAgIHN0eWxlc1tzXSA9IEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlc1tzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5BamF4LlN0eWxlcyhzdHlsZXMsIFtcIkluaXRpYWxpemVTVkdcIiwgdGhpc10pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkluaXRpYWxpemVTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIHRoaXMuZGVmYXVsdEV4ID0gdGhpcy5FeFNwYW4uZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5kZWZhdWx0V2lkdGggPSB0aGlzLmxpbmVicmVha1NwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgbSA9IHNjcmlwdHMubGVuZ3RoO1xuICAgICAgICB2YXIgc2NyaXB0O1xuICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgdmFyIHNwYW47XG4gICAgICAgIHZhciBkaXY7XG4gICAgICAgIHZhciB0ZXN0O1xuICAgICAgICB2YXIgamF4O1xuICAgICAgICB2YXIgZXg7XG4gICAgICAgIHZhciBlbTtcbiAgICAgICAgdmFyIG1heHdpZHRoO1xuICAgICAgICB2YXIgcmVsd2lkdGggPSBmYWxzZTtcbiAgICAgICAgdmFyIGN3aWR0aDtcbiAgICAgICAgdmFyIGxpbmVicmVhayA9IHRoaXMuY29uZmlnLmxpbmVicmVha3MuYXV0b21hdGljO1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLndpZHRoO1xuICAgICAgICBpZiAobGluZWJyZWFrKSB7XG4gICAgICAgICAgICByZWx3aWR0aCA9ICh3aWR0aC5tYXRjaCgvXlxccyooXFxkKyhcXC5cXGQqKT8lXFxzKik/Y29udGFpbmVyXFxzKiQvKSAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgvXFxzKmNvbnRhaW5lclxccyovLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2lkdGggPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWF4d2lkdGggPSAxMDAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwcmV2ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIFN0cmluZyhwcmV2LmNsYXNzTmFtZSkubWF0Y2goL15NYXRoSmF4KF9TVkcpPyhfRGlzcGxheSk/KCBNYXRoSmF4KF9TVkcpP19Qcm9jZXNzaW5nKT8kLykpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBqYXguRWRpdGFibGVTVkcgPSB7XG4gICAgICAgICAgICAgICAgZGlzcGxheTogKGpheC5yb290LkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzcGFuID0gZGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiB0aGlzLmNvbmZpZy5zY2FsZSArIFwiJVwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImlubGluZS1ibG9ja1wiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdcIixcbiAgICAgICAgICAgICAgICBpZDogamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiLFxuICAgICAgICAgICAgICAgIGlzTWF0aEpheDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBqYXhJRDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBvbmNvbnRleHRtZW51OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1lbnUsXG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd246IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2Vkb3duLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdmVyOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3ZlcixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3V0LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vtb3ZlOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlbW92ZSxcbiAgICAgICAgICAgICAgICBvbmNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkNsaWNrLFxuICAgICAgICAgICAgICAgIG9uZGJsY2xpY2s6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuRGJsQ2xpY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLkJyb3dzZXIubm9Db250ZXh0TWVudSkge1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaHN0YXJ0ID0gdGhpcy5UT1VDSC5zdGFydDtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hlbmQgPSB0aGlzLlRPVUNILmVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSksIHNjcmlwdCk7XG4gICAgICAgICAgICBkaXYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5saW5lYnJlYWtTcGFuLmNsb25lTm9kZSh0cnVlKSwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgZGl2ID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBleCA9IHRlc3QuZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgICAgIGN3aWR0aCA9IGRpdi5wcmV2aW91c1NpYmxpbmcuZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4ID09PSAwIHx8IGV4ID09PSBcIk5hTlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5EaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgICAgICAgICAgICBqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGV4ID0gdGhpcy5kZWZhdWx0RXg7XG4gICAgICAgICAgICAgICAgY3dpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFV0aWwuZXggPSBleDtcbiAgICAgICAgICAgIFV0aWwuZW0gPSBlbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5jd2lkdGggPSBjd2lkdGggLyBlbSAqIDEwMDA7XG4gICAgICAgICAgICBVdGlsLmxpbmVXaWR0aCA9IChsaW5lYnJlYWsgPyBVdGlsLmxlbmd0aDJlbSh3aWR0aCwgMSwgbWF4d2lkdGggLyBlbSAqIDEwMDApIDogVXRpbC5CSUdESU1FTik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0c1tpXS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBzcGFuID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHRzW2ldLk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKCFqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB0ZXN0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuU1ZHZXFuID0gc3RhdGUuU1ZHbGFzdCA9IDA7XG4gICAgICAgIHN0YXRlLlNWR2kgPSAtMTtcbiAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSB0aGlzLmNvbmZpZy5FcW5DaHVuaztcbiAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5UcmFuc2xhdGUgPSBmdW5jdGlvbiAoc2NyaXB0LCBzdGF0ZSkge1xuICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoc3RhdGUuU1ZHZGVsYXkpIHtcbiAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5DYWxsYmFjay5EZWxheSh0aGlzLmNvbmZpZy5FcW5DaHVua0RlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgIHZhciBtYXRoID0gamF4LnJvb3Q7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgdmFyIGRpdiA9IChqYXguRWRpdGFibGVTVkcuZGlzcGxheSA/IChzcGFuIHx8IHsgcGFyZW50Tm9kZTogdW5kZWZpbmVkIH0pLnBhcmVudE5vZGUgOiBzcGFuKTtcbiAgICAgICAgdmFyIGxvY2FsQ2FjaGUgPSAodGhpcy5jb25maWcudXNlRm9udENhY2hlICYmICF0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSk7XG4gICAgICAgIGlmICghZGl2KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBqYXguRWRpdGFibGVTVkcuZW07XG4gICAgICAgIHRoaXMuZXggPSBqYXguRWRpdGFibGVTVkcuZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIHRoaXMubWF0aERpdiA9IGRpdjtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEdseXBocygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5pdFNWRyhtYXRoLCBzcGFuKTtcbiAgICAgICAgbWF0aC5zZXRUZVhjbGFzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0aC50b1NWRyhzcGFuLCBkaXYpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzcGFuLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZChzcGFuLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5uLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLkFkZElucHV0SGFuZGxlcnMobWF0aCwgc3BhbiwgZGl2KTtcbiAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgfVxuICAgICAgICBkaXYuY2xhc3NOYW1lID0gZGl2LmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICBpZiAodGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCkge1xuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjtcbiAgICAgICAgICAgIGlmIChzY3JpcHQuTWF0aEpheC5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5BZGRJbnB1dEhhbmRsZXJzID0gZnVuY3Rpb24gKG1hdGgsIHNwYW4sIGRpdikge1xuICAgICAgICBtYXRoLmN1cnNvciA9IG5ldyBNYXRoSmF4Lk9iamVjdC5DdXJzb3IoKTtcbiAgICAgICAgbWF0aC5yZXJlbmRlciA9IHJlcmVuZGVyO1xuICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuICAgICAgICBmdW5jdGlvbiByZXJlbmRlcihjYWxsYmFjaykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgobWF0aCkudG9TVkcoc3BhbiwgZGl2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5yZWZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5yZXN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2suQWZ0ZXIoW3JlcmVuZGVyLCBjYWxsYmFja10sIGVyci5yZXN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNYXRoSmF4LkNhbGxiYWNrKGNhbGxiYWNrKSgpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoZSkge1xuICAgICAgICAgICAgaWYgKG1hdGguY3Vyc29yW2UudHlwZV0pIHtcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvcltlLnR5cGVdKGUsIHJlcmVuZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIGhhbmRsZXIpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyU3BhbiA9IGZ1bmN0aW9uIChqYXgsIG1hdGgpIHtcbiAgICAgICAgbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgcmV0dXJuIG1hdGguZmlyc3RDaGlsZDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlckJCb3ggPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoKSB7XG4gICAgICAgIHZhciBiYm94ID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5nZXRCQm94KHNwYW4ucGFyZW50Tm9kZSk7XG4gICAgICAgIGJib3guaCArPSAyO1xuICAgICAgICBiYm94LmQgLT0gMjtcbiAgICAgICAgcmV0dXJuIGJib3g7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuWm9vbSA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgsIE13LCBNaCkge1xuICAgICAgICBzcGFuLmNsYXNzTmFtZSA9IFwiTWF0aEpheF9TVkdcIjtcbiAgICAgICAgdmFyIGVtZXggPSBzcGFuLmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIHZhciBleCA9IGVtZXguZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5lbSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmVtID0gZXggLyBVdGlsLlRlWC54X2hlaWdodCAqIDEwMDA7XG4gICAgICAgIHRoaXMuZXggPSBleDtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtXaWR0aCA9IGpheC5FZGl0YWJsZVNWRy5saW5lV2lkdGg7XG4gICAgICAgIHRoaXMuY3dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmN3aWR0aDtcbiAgICAgICAgZW1leC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVtZXgpO1xuICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHRoaXMubWF0aERJViA9IHNwYW47XG4gICAgICAgIHRoaXMuem9vbVNjYWxlID0gcGFyc2VJbnQoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSAxO1xuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHZhciBzdmcgPSBzcGFuLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3ZnXCIpWzBdLnN0eWxlO1xuICAgICAgICBzdmcubWFyZ2luVG9wID0gc3ZnLm1hcmdpblJpZ2h0ID0gc3ZnLm1hcmdpbkxlZnQgPSAwO1xuICAgICAgICBpZiAoc3ZnLm1hcmdpbkJvdHRvbS5jaGFyQXQoMCkgPT09IFwiLVwiKVxuICAgICAgICAgICAgc3Bhbi5zdHlsZS5tYXJnaW5Cb3R0b20gPSBzdmcubWFyZ2luQm90dG9tLnN1YnN0cigxKTtcbiAgICAgICAgaWYgKHRoaXMub3BlcmFab29tUmVmcmVzaCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5maXJzdENoaWxkLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Bhbi5vZmZzZXRXaWR0aCA8IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5taW5XaWR0aCA9IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIG1hdGguc3R5bGUubWluV2lkdGggPSBtYXRoLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIHZhciB6VyA9IHNwYW4ub2Zmc2V0V2lkdGgsIHpIID0gc3Bhbi5vZmZzZXRIZWlnaHQsIG1IID0gbWF0aC5vZmZzZXRIZWlnaHQsIG1XID0gbWF0aC5vZmZzZXRXaWR0aDtcbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcIlwiO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgWTogLU1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuKS5oLFxuICAgICAgICAgICAgbVc6IG1XLFxuICAgICAgICAgICAgbUg6IG1ILFxuICAgICAgICAgICAgelc6IHpXLFxuICAgICAgICAgICAgekg6IHpIXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuaW5pdFNWRyA9IGZ1bmN0aW9uIChtYXRoLCBzcGFuKSB7IH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlJlbW92ZSA9IGZ1bmN0aW9uIChqYXgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIpO1xuICAgICAgICBpZiAoc3Bhbikge1xuICAgICAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5kaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYW4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzcGFuKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgamF4LkVkaXRhYmxlU1ZHO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZXh0ZW5kRGVsaW1pdGVyViA9IGZ1bmN0aW9uIChzdmcsIEgsIGRlbGltLCBzY2FsZSwgZm9udCkge1xuICAgICAgICB2YXIgdG9wID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0udG9wIHx8IGRlbGltLmV4dCksIGZvbnQpO1xuICAgICAgICB2YXIgYm90ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0uYm90IHx8IGRlbGltLmV4dCksIGZvbnQpO1xuICAgICAgICB2YXIgaCA9IHRvcC5oICsgdG9wLmQgKyBib3QuaCArIGJvdC5kO1xuICAgICAgICB2YXIgeSA9IC10b3AuaDtcbiAgICAgICAgc3ZnLkFkZCh0b3AsIDAsIHkpO1xuICAgICAgICB5IC09IHRvcC5kO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgaCArPSBtaWQuaCArIG1pZC5kO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZWxpbS5taW4gJiYgSCA8IGggKiBkZWxpbS5taW4pIHtcbiAgICAgICAgICAgIEggPSBoICogZGVsaW0ubWluO1xuICAgICAgICB9XG4gICAgICAgIGlmIChIID4gaCkge1xuICAgICAgICAgICAgdmFyIGV4dCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0uZXh0LCBmb250KTtcbiAgICAgICAgICAgIHZhciBrID0gKGRlbGltLm1pZCA/IDIgOiAxKSwgZUggPSAoSCAtIGgpIC8gaywgcyA9IChlSCArIDEwMCkgLyAoZXh0LmggKyBleHQuZCk7XG4gICAgICAgICAgICB3aGlsZSAoay0tID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBnID0gRWRpdGFibGVTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgKHggLSBmdXp6IC8gMiAtIHMgKiByZXAubCArIHJlcC54KSArIFwiLFwiICsgcmVwLnkgKyBcIikgc2NhbGUoXCIgKyBzICsgXCIsMSlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQocmVwLmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeCArPSByVztcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgICAgICAgICB4ICs9IG1pZC53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHggLT0gKHcgLSBXKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgeCwgMCk7XG4gICAgICAgICAgICB4ICs9IG1pZC53IC0gKHcgLSBXKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChyaWdodCwgeCAtIHJpZ2h0LmwsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkc7XG59KSgpO1xudmFyIGxvYWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBjb25zb2xlLmxvZygnTE9BRElORycpO1xuICAgIEVkaXRhYmxlU1ZHLmFwcGx5KE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICBmb3IgKHZhciBpZCBpbiBFZGl0YWJsZVNWRy5wcm90b3R5cGUpIHtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkdbaWRdID0gRWRpdGFibGVTVkcucHJvdG90eXBlW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uc3RydWN0b3IucHJvdG90eXBlW2lkXSA9IEVkaXRhYmxlU1ZHLnByb3RvdHlwZVtpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgfVxuICAgIGZvciAodmFyIGlkIGluIEVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHW2lkXSA9IEVkaXRhYmxlU1ZHW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uc3RydWN0b3IucHJvdG90eXBlW2lkXSA9IEVkaXRhYmxlU1ZHW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICB9XG59O1xuc2V0VGltZW91dChsb2FkLCAxMDAwKTtcbnZhciBTdWJTdXBDdXJzb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN1YlN1cEN1cnNvcigpIHtcbiAgICB9XG4gICAgU3ViU3VwQ3Vyc29yLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5jdXJzb3JhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbc21hbGxdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW3NtYWxsXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBzbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMiA/IDEgOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgU3ViU3VwQ3Vyc29yLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIFN1YlN1cEN1cnNvci5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1cDtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1cEJCLnggKyAoc3VwQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChiYXNlLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU3ViU3VwQ3Vyc29yLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Yi5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5zdWIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvcyA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPyAwIDogMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5WZXJ0aWNhbGx5ID0gdmVydGljYWwgJiYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSA9PT0gKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1Yik7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5Ib3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICB2YXIgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdBd2F5ID0gdmVydGljYWwgPyAhbW92aW5nSW5WZXJ0aWNhbGx5IDogIXRoaXMucmlnaHRNb3ZlU3RheSAmJiBtb3ZlUmlnaHRIb3Jpem9udGFsbHk7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW4gPSBtb3ZpbmdJblZlcnRpY2FsbHkgfHwgbW92aW5nSW5Ib3Jpem9udGFsbHkgfHwgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ICYmIHRoaXMucmlnaHRNb3ZlU3RheTtcbiAgICAgICAgICAgIGlmIChtb3ZpbmdBd2F5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobW92aW5nSW4pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBTdWJTdXBDdXJzb3IucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgU3ViU3VwQ3Vyc29yLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBTdWJTdXBDdXJzb3I7XG59KSgpO1xudmFyIEJCT1ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJCT1goZGVmLCB0eXBlKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmICh0eXBlID09PSB2b2lkIDApIHsgdHlwZSA9IFwiZ1wiOyB9XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLkggPSB0aGlzLkQgPSAwO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSAwO1xuICAgICAgICB0aGlzLmwgPSBVdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLnggPSB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnNjYWxlID0gMTtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gVXRpbC5FbGVtZW50KHR5cGUsIGRlZik7XG4gICAgfVxuICAgIEJCT1gucHJvdG90eXBlLldpdGggPSBmdW5jdGlvbiAoZGVmLCBIVUIpIHtcbiAgICAgICAgcmV0dXJuIEhVQi5JbnNlcnQodGhpcywgZGVmKTtcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFkZCA9IGZ1bmN0aW9uIChzdmcsIGR4LCBkeSwgZm9yY2V3LCBpbmZyb250KSB7XG4gICAgICAgIGlmIChkeCkge1xuICAgICAgICAgICAgc3ZnLnggKz0gZHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR5KSB7XG4gICAgICAgICAgICBzdmcueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiBzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBzdmcubiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIG5vZGVOYW1lID0gY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwidXNlXCIgfHwgbm9kZU5hbWUgPT09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHN2Zy5jaGlsZFNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHN2Zy5jaGlsZFgsIHkgPSBzdmcuY2hpbGRZO1xuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcueSArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuaCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuZCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuSCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuRCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcudyAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcuciAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcubCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN2Zy54KSA8IDEgJiYgTWF0aC5hYnMoc3ZnLnkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09PSBcImxpbmVcIiB8fCBub2RlTmFtZSA9PT0gXCJwb2x5Z29uXCIgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPT09IFwicGF0aFwiIHx8IG5vZGVOYW1lID09PSBcImFcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm4gKz0gc3ZnLm47XG4gICAgICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZnJvbnQgJiYgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZnJvbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGFzSW5kZW50ID0gc3ZnLmhhc0luZGVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kIC0gc3ZnLnkgPiB0aGlzLmQpIHtcbiAgICAgICAgICAgIHRoaXMuZCA9IHN2Zy5kIC0gc3ZnLnk7XG4gICAgICAgICAgICBpZiAodGhpcy5kID4gdGhpcy5EKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5EID0gdGhpcy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5oID4gdGhpcy5oKSB7XG4gICAgICAgICAgICB0aGlzLmggPSBzdmcueSArIHN2Zy5oO1xuICAgICAgICAgICAgaWYgKHRoaXMuaCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuSCA9IHRoaXMuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgLSBzdmcueSA+IHRoaXMuRClcbiAgICAgICAgICAgIHRoaXMuRCA9IHN2Zy5EIC0gc3ZnLnk7XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5IID4gdGhpcy5IKVxuICAgICAgICAgICAgdGhpcy5IID0gc3ZnLnkgKyBzdmcuSDtcbiAgICAgICAgaWYgKHN2Zy54ICsgc3ZnLmwgPCB0aGlzLmwpXG4gICAgICAgICAgICB0aGlzLmwgPSBzdmcueCArIHN2Zy5sO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcuciA+IHRoaXMucilcbiAgICAgICAgICAgIHRoaXMuciA9IHN2Zy54ICsgc3ZnLnI7XG4gICAgICAgIGlmIChmb3JjZXcgfHwgc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKSA+IHRoaXMudylcbiAgICAgICAgICAgIHRoaXMudyA9IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCk7XG4gICAgICAgIHRoaXMuY2hpbGRTY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5jaGlsZFggPSBzdmcueDtcbiAgICAgICAgdGhpcy5jaGlsZFkgPSBzdmcueTtcbiAgICAgICAgdGhpcy5uKys7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BbGlnbiA9IGZ1bmN0aW9uIChzdmcsIGFsaWduLCBkeCwgZHksIHNoaWZ0KSB7XG4gICAgICAgIGlmIChzaGlmdCA9PT0gdm9pZCAwKSB7IHNoaWZ0ID0gbnVsbDsgfVxuICAgICAgICBkeCA9ICh7XG4gICAgICAgICAgICBsZWZ0OiBkeCxcbiAgICAgICAgICAgIGNlbnRlcjogKHRoaXMudyAtIHN2Zy53KSAvIDIsXG4gICAgICAgICAgICByaWdodDogdGhpcy53IC0gc3ZnLncgLSBkeFxuICAgICAgICB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgICAgIHRoaXMuQWRkKHN2ZywgZHggKyAoc2hpZnQgfHwgMCksIGR5KTtcbiAgICAgICAgdGhpcy53ID0gdztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkNsZWFuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oID09PSAtVXRpbC5CSUdESU1FTikge1xuICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gdGhpcy5sID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEJCT1gudHlwZSA9IFwiZ1wiO1xuICAgIEJCT1gucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgQkJPWC5kZWZzID0gbnVsbDtcbiAgICBCQk9YLm4gPSAwO1xuICAgIHJldHVybiBCQk9YO1xufSkoKTtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIEJCT1hfRyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0coKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HO1xufSkoQkJPWCk7XG52YXIgQkJPWF9URVhUID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9URVhULCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVEVYVChIVE1MLCBzY2FsZSwgdGV4dCwgZGVmKSB7XG4gICAgICAgIGlmICghZGVmKVxuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIGRlZi5zdHJva2UgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtc3R5bGVcIl0gPT09IFwiXCIpXG4gICAgICAgICAgICBkZWxldGUgZGVmW1wiZm9udC1zdHlsZVwiXTtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtd2VpZ2h0XCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtd2VpZ2h0XCJdO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwidGV4dFwiKTtcbiAgICAgICAgSFRNTC5hZGRUZXh0KHRoaXMuZWxlbWVudCwgdGV4dCk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkcudGV4dFNWRy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZWxlbWVudC5nZXRCQm94KCk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkcudGV4dFNWRy5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICBzY2FsZSAqPSAxMDAwIC8gVXRpbC5lbTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIikgbWF0cml4KDEgMCAwIC0xIDAgMClcIik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IGJib3gud2lkdGggKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gLWJib3gueSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAoYmJveC5oZWlnaHQgKyBiYm94LnkpICogc2NhbGU7XG4gICAgfVxuICAgIEJCT1hfVEVYVC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIEJCT1hfVEVYVDtcbn0pKEJCT1gpO1xudmFyIFV0aWwgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFV0aWwoKSB7XG4gICAgfVxuICAgIFV0aWwuRW0gPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBlbVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJlbVwiO1xuICAgIH07XG4gICAgVXRpbC5FeCA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIG0gPSBNYXRoLnJvdW5kKG0gLyB0aGlzLlRlWC54X2hlaWdodCAqIHRoaXMuZXgpIC8gdGhpcy5leDtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZXhcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZXhcIjtcbiAgICB9O1xuICAgIFV0aWwuUGVyY2VudCA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIHJldHVybiAoMTAwICogbSkudG9GaXhlZCgxKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcIiVcIjtcbiAgICB9O1xuICAgIFV0aWwuRml4ZWQgPSBmdW5jdGlvbiAobSwgbikge1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKG4gfHwgMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpO1xuICAgIH07XG4gICAgVXRpbC5oYXNoQ2hlY2sgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9IHdoaWxlICh0YXJnZXQgJiYgdGFyZ2V0LmZpcnN0Q2hpbGQubm9kZU5hbWUgIT09IFwic3ZnXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfTtcbiAgICBVdGlsLkVsZW1lbnQgPSBmdW5jdGlvbiAodHlwZSwgZGVmKSB7XG4gICAgICAgIHZhciBvYmo7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICAgICAgICAgIG9iaiA9ICh0eXBlb2YgKHR5cGUpID09PSBcInN0cmluZ1wiID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSkgOiB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9iaiA9ICh0eXBlb2YgKHR5cGUpID09PSBcInN0cmluZ1wiID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN2ZzpcIiArIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgb2JqLmlzTWF0aEpheCA9IHRydWU7XG4gICAgICAgIGlmIChkZWYpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGRlZikge1xuICAgICAgICAgICAgICAgIGlmIChkZWYuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoaWQsIGRlZltpZF0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICBVdGlsLmFkZEVsZW1lbnQgPSBmdW5jdGlvbiAocGFyZW50LCB0eXBlLCBkZWYpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudC5hcHBlbmRDaGlsZChVdGlsLkVsZW1lbnQodHlwZSwgZGVmKSk7XG4gICAgfTtcbiAgICBVdGlsLmxlbmd0aDJlbSA9IGZ1bmN0aW9uIChsZW5ndGgsIG11LCBzaXplKSB7XG4gICAgICAgIGlmIChtdSA9PT0gdm9pZCAwKSB7IG11ID0gbnVsbDsgfVxuICAgICAgICBpZiAoc2l6ZSA9PT0gdm9pZCAwKSB7IHNpemUgPSBudWxsOyB9XG4gICAgICAgIGlmICh0eXBlb2YgKGxlbmd0aCkgIT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICBsZW5ndGggPSBsZW5ndGgudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gXCJcIilcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuTk9STUFMKVxuICAgICAgICAgICAgcmV0dXJuIDEwMDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5CSUcpXG4gICAgICAgICAgICByZXR1cm4gMjAwMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLlNNQUxMKVxuICAgICAgICAgICAgcmV0dXJuIDcxMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gXCJpbmZpbml0eVwiKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuQklHRElNRU47XG4gICAgICAgIGlmIChsZW5ndGgubWF0Y2goL21hdGhzcGFjZSQvKSlcbiAgICAgICAgICAgIHJldHVybiAxMDAwICogdGhpcy5NQVRIU1BBQ0VbbGVuZ3RoXTtcbiAgICAgICAgdmFyIGVtRmFjdG9yID0gKEVkaXRhYmxlU1ZHLnpvb21TY2FsZSB8fCAxKSAvIFV0aWwuZW07XG4gICAgICAgIHZhciBtYXRjaCA9IGxlbmd0aC5tYXRjaCgvXlxccyooWy0rXT8oPzpcXC5cXGQrfFxcZCsoPzpcXC5cXGQqKT8pKT8ocHR8ZW18ZXh8bXV8cHh8cGN8aW58bW18Y218JSk/Lyk7XG4gICAgICAgIHZhciBtID0gcGFyc2VGbG9hdChtYXRjaFsxXSB8fCBcIjFcIikgKiAxMDAwLCB1bml0ID0gbWF0Y2hbMl07XG4gICAgICAgIGlmIChzaXplID09IG51bGwpXG4gICAgICAgICAgICBzaXplID0gMTAwMDtcbiAgICAgICAgaWYgKG11ID09IG51bGwpXG4gICAgICAgICAgICBtdSA9IDE7XG4gICAgICAgIGlmICh1bml0ID09PSBcImVtXCIpXG4gICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZXhcIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5UZVgueF9oZWlnaHQgLyAxMDAwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCIlXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwMCAqIHNpemUgLyAxMDAwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJweFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiBlbUZhY3RvcjtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHRcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTA7XG4gICAgICAgIGlmICh1bml0ID09PSBcInBjXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIDEuMjtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiaW5cIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvcjtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiY21cIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvciAvIDIuNTQ7XG4gICAgICAgIGlmICh1bml0ID09PSBcIm1tXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyNS40O1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJtdVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxOCAqIG11O1xuICAgICAgICByZXR1cm4gbSAqIHNpemUgLyAxMDAwO1xuICAgIH07XG4gICAgVXRpbC5nZXRQYWRkaW5nID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICAgICAgICB2YXIgcGFkZGluZyA9IHtcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIHJpZ2h0OiAwLFxuICAgICAgICAgICAgYm90dG9tOiAwLFxuICAgICAgICAgICAgbGVmdDogMFxuICAgICAgICB9O1xuICAgICAgICB2YXIgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIHBhZGRpbmcpIHtcbiAgICAgICAgICAgIGlmIChwYWRkaW5nLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBwYWQgPSBzdHlsZXNbXCJwYWRkaW5nXCIgKyBpZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGlkLnN1YnN0cigxKV07XG4gICAgICAgICAgICAgICAgaWYgKHBhZCkge1xuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nW2lkXSA9IFV0aWwubGVuZ3RoMmVtKHBhZCk7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaGFzID8gcGFkZGluZyA6IGZhbHNlKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0Qm9yZGVycyA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgICAgICAgdmFyIGJvcmRlciA9IHtcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIHJpZ2h0OiAwLFxuICAgICAgICAgICAgYm90dG9tOiAwLFxuICAgICAgICAgICAgbGVmdDogMFxuICAgICAgICB9LCBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gYm9yZGVyKSB7XG4gICAgICAgICAgICBpZiAoYm9yZGVyLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IFwiYm9yZGVyXCIgKyBpZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGlkLnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICB2YXIgc3R5bGUgPSBzdHlsZXNbSUQgKyBcIlN0eWxlXCJdO1xuICAgICAgICAgICAgICAgIGlmIChzdHlsZSAmJiBzdHlsZSAhPT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkXSA9IFV0aWwubGVuZ3RoMmVtKHN0eWxlc1tJRCArIFwiV2lkdGhcIl0pO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIlN0eWxlXCJdID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9IHN0eWxlc1tJRCArIFwiQ29sb3JcIl07XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3JkZXJbaWQgKyBcIkNvbG9yXCJdID09PSBcImluaXRpYWxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3JkZXJbaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGhhcyA/IGJvcmRlciA6IGZhbHNlKTtcbiAgICB9O1xuICAgIFV0aWwudGhpY2tuZXNzMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUpIHtcbiAgICAgICAgdmFyIHRoaWNrID0gdGhpcy5UZVgucnVsZV90aGlja25lc3M7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5NRURJVU0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuVEhJTikge1xuICAgICAgICAgICAgcmV0dXJuIDAuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuVEhJQ0spIHtcbiAgICAgICAgICAgIHJldHVybiAxLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHRoaWNrKTtcbiAgICB9O1xuICAgIFV0aWwuZWxlbUNvb3Jkc1RvU2NyZWVuQ29vcmRzID0gZnVuY3Rpb24gKGVsZW0sIHgsIHkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuZ2V0U1ZHRWxlbShlbGVtKTtcbiAgICAgICAgaWYgKCFzdmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBwdCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICBwdC54ID0geDtcbiAgICAgICAgcHQueSA9IHk7XG4gICAgICAgIHJldHVybiBwdC5tYXRyaXhUcmFuc2Zvcm0oZWxlbS5nZXRTY3JlZW5DVE0oKSk7XG4gICAgfTtcbiAgICBVdGlsLmVsZW1Db29yZHNUb1ZpZXdwb3J0Q29vcmRzID0gZnVuY3Rpb24gKGVsZW0sIHgsIHkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuZ2V0U1ZHRWxlbShlbGVtKTtcbiAgICAgICAgaWYgKCFzdmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBwdCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICBwdC54ID0geDtcbiAgICAgICAgcHQueSA9IHk7XG4gICAgICAgIHJldHVybiBwdC5tYXRyaXhUcmFuc2Zvcm0oZWxlbS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQoc3ZnKSk7XG4gICAgfTtcbiAgICBVdGlsLmdldFNWR0VsZW0gPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBpZiAoIWVsZW0pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBzdmcgPSBlbGVtLm5vZGVOYW1lID09PSAnc3ZnJyA/IGVsZW0gOiBlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKCFzdmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIG93bmVyIFNWRyBlbGVtZW50Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFV0aWwuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzID0gZnVuY3Rpb24gKGVsZW0sIHgsIHkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuZ2V0U1ZHRWxlbShlbGVtKTtcbiAgICAgICAgaWYgKCFzdmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBwdCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICBwdC54ID0geDtcbiAgICAgICAgcHQueSA9IHk7XG4gICAgICAgIHJldHVybiBwdC5tYXRyaXhUcmFuc2Zvcm0oZWxlbS5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkpO1xuICAgIH07XG4gICAgVXRpbC5ib3hDb250YWlucyA9IGZ1bmN0aW9uIChiYiwgeCwgeSkge1xuICAgICAgICByZXR1cm4gYmIgJiYgYmIueCA8PSB4ICYmIHggPD0gYmIueCArIGJiLndpZHRoICYmIGJiLnkgPD0geSAmJiB5IDw9IGJiLnkgKyBiYi5oZWlnaHQ7XG4gICAgfTtcbiAgICBVdGlsLm5vZGVDb250YWluc1NjcmVlblBvaW50ID0gZnVuY3Rpb24gKG5vZGUsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJiID0gbm9kZS5nZXRCQiAmJiBub2RlLmdldEJCKCk7XG4gICAgICAgIHZhciBwID0gdGhpcy5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMobm9kZS5FZGl0YWJsZVNWR2VsZW0sIHgsIHkpO1xuICAgICAgICBpZiAoIWJiIHx8ICFwKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gYmIueCA8PSBwLnggJiYgcC54IDw9IGJiLnggKyBiYi53aWR0aCAmJiBiYi55IDw9IHAueSAmJiBwLnkgPD0gYmIueSArIGJiLmhlaWdodDtcbiAgICB9O1xuICAgIFV0aWwucHJvdG90eXBlLmhpZ2hsaWdodEJveCA9IGZ1bmN0aW9uIChzdmcsIGJiKSB7XG4gICAgICAgIHZhciBkID0gMTAwO1xuICAgICAgICB2YXIgZHJhd0xpbmUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHRoaXMuU1ZHTlMsICdsaW5lJyk7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnc3Ryb2tlOnJnYigwLDAsMjU1KTtzdHJva2Utd2lkdGg6MjAnKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgyKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkyKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCArIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCwgYmIueSArIGQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGggLSBkLCBiYi55KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSwgYmIueCArIGJiLndpZHRoLCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54LCBiYi55ICsgYmIuaGVpZ2h0IC0gZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkgKyBiYi5oZWlnaHQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKVxuICAgICAgICBdO1xuICAgIH07XG4gICAgVXRpbC5wcm90b3R5cGUudmlzdWFsaXplSmF4ID0gZnVuY3Rpb24gKGpheCwgc2VsZWN0b3IsIGN1cnNvcikge1xuICAgICAgICBzZWxlY3Rvci5lbXB0eSgpO1xuICAgICAgICB2YXIgaGIgPSB0aGlzLmhpZ2hsaWdodEJveDtcbiAgICAgICAgdmFyIGYgPSBmdW5jdGlvbiAoaiwgc3BhY2VyKSB7XG4gICAgICAgICAgICB2YXIgcztcbiAgICAgICAgICAgIHZhciBlbmQ7XG4gICAgICAgICAgICBpZiAodHlwZW9mIChqKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHMgPSBzcGFjZXIgKyBqICsgXCJcXG5cIjtcbiAgICAgICAgICAgICAgICBlbmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcyA9IHNwYWNlciArIChqID8gai50eXBlIDogXCJudWxsXCIpICsgXCJcXG5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpdGVtID0gJCgnPGxpPjxwcmUgc3R5bGU9XCJtYXJnaW46IDA7XCI+JyArIHMgKyAnPC9wcmU+PC9saT4nKTtcbiAgICAgICAgICAgIGl0ZW0uYXBwZW5kVG8oc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKGVuZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpdGVtLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYmIgPSBqLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICB2YXIgc3ZnID0gai5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICAgICAgICAgIGhiKHN2ZywgYmIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWopXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBqLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmKGouZGF0YVtpXSwgc3BhY2VyICsgXCIgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBmKGpheC5yb290IHx8IGpheCwgXCJcIik7XG4gICAgICAgIGN1cnNvckluZm8gPSBjdXJzb3IgPyBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICB0eXBlOiBjdXJzb3Iubm9kZS50eXBlLFxuICAgICAgICAgICAgcG9zaXRpb246IGN1cnNvci5wb3NpdGlvbixcbiAgICAgICAgICAgIG1vZGU6IGN1cnNvci5tb2RlLFxuICAgICAgICAgICAgc2VsZWN0aW9uU3RhcnQ6IGN1cnNvci5zZWxlY3Rpb25TdGFydCA/IGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlLnR5cGUgOiBcIm51bGxcIixcbiAgICAgICAgICAgIHNlbGVjdGlvbkVuZDogY3Vyc29yLnNlbGVjdGlvbkVuZCA/IGN1cnNvci5zZWxlY3Rpb25FbmQubm9kZS50eXBlIDogXCJudWxsXCJcbiAgICAgICAgfSkgOiBcIihubyBjdXJzb3IpXCI7XG4gICAgICAgIHNlbGVjdG9yLnByZXBlbmQoJzxwcmU+JyArIGN1cnNvckluZm8gKyAnPC9wcmU+Jyk7XG4gICAgfTtcbiAgICBVdGlsLmdldEpheEZyb21NYXRoID0gZnVuY3Rpb24gKG1hdGgpIHtcbiAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICBtYXRoID0gbWF0aC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIG1hdGggPSBtYXRoLm5leHRTaWJsaW5nO1xuICAgICAgICB9IHdoaWxlIChtYXRoICYmIG1hdGgubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJzY3JpcHRcIik7XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5nZXRKYXhGb3IobWF0aCk7XG4gICAgfTtcbiAgICBVdGlsLmdldEN1cnNvclZhbHVlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoaXNOYU4oZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgc3dpdGNoIChkaXJlY3Rpb25bMF0udG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3UnOiByZXR1cm4gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2QnOiByZXR1cm4gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgY2FzZSAnbCc6IHJldHVybiBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBjYXNlICdyJzogcmV0dXJuIERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3IgdmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFV0aWwuU1ZHTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG4gICAgVXRpbC5YTElOS05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgVXRpbC5OQlNQID0gXCJcXHUwMEEwXCI7XG4gICAgVXRpbC5CSUdESU1FTiA9IDEwMDAwMDAwO1xuICAgIFV0aWwuVGVYID0ge1xuICAgICAgICB4X2hlaWdodDogNDMwLjU1NCxcbiAgICAgICAgcXVhZDogMTAwMCxcbiAgICAgICAgbnVtMTogNjc2LjUwOCxcbiAgICAgICAgbnVtMjogMzkzLjczMixcbiAgICAgICAgbnVtMzogNDQzLjczLFxuICAgICAgICBkZW5vbTE6IDY4NS45NTEsXG4gICAgICAgIGRlbm9tMjogMzQ0Ljg0MSxcbiAgICAgICAgc3VwMTogNDEyLjg5MixcbiAgICAgICAgc3VwMjogMzYyLjg5MixcbiAgICAgICAgc3VwMzogMjg4Ljg4OCxcbiAgICAgICAgc3ViMTogMTUwLFxuICAgICAgICBzdWIyOiAyNDcuMjE3LFxuICAgICAgICBzdXBfZHJvcDogMzg2LjEwOCxcbiAgICAgICAgc3ViX2Ryb3A6IDUwLFxuICAgICAgICBkZWxpbTE6IDIzOTAsXG4gICAgICAgIGRlbGltMjogMTAwMCxcbiAgICAgICAgYXhpc19oZWlnaHQ6IDI1MCxcbiAgICAgICAgcnVsZV90aGlja25lc3M6IDYwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzE6IDExMS4xMTEsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMjogMTY2LjY2NixcbiAgICAgICAgYmlnX29wX3NwYWNpbmczOiAyMDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNDogNjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzU6IDEwMCxcbiAgICAgICAgc2NyaXB0c3BhY2U6IDEwMCxcbiAgICAgICAgbnVsbGRlbGltaXRlcnNwYWNlOiAxMjAsXG4gICAgICAgIGRlbGltaXRlcmZhY3RvcjogOTAxLFxuICAgICAgICBkZWxpbWl0ZXJzaG9ydGZhbGw6IDMwMCxcbiAgICAgICAgbWluX3J1bGVfdGhpY2tuZXNzOiAxLjI1LFxuICAgICAgICBtaW5fcm9vdF9zcGFjZTogMS41XG4gICAgfTtcbiAgICBVdGlsLk1BVEhTUEFDRSA9IHtcbiAgICAgICAgdmVyeXZlcnl0aGlubWF0aHNwYWNlOiAxIC8gMTgsXG4gICAgICAgIHZlcnl0aGlubWF0aHNwYWNlOiAyIC8gMTgsXG4gICAgICAgIHRoaW5tYXRoc3BhY2U6IDMgLyAxOCxcbiAgICAgICAgbWVkaXVtbWF0aHNwYWNlOiA0IC8gMTgsXG4gICAgICAgIHRoaWNrbWF0aHNwYWNlOiA1IC8gMTgsXG4gICAgICAgIHZlcnl0aGlja21hdGhzcGFjZTogNiAvIDE4LFxuICAgICAgICB2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiA3IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlubWF0aHNwYWNlOiAtMSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlubWF0aHNwYWNlOiAtMiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaW5tYXRoc3BhY2U6IC0zIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZlbWVkaXVtbWF0aHNwYWNlOiAtNCAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaWNrbWF0aHNwYWNlOiAtNSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlja21hdGhzcGFjZTogLTYgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiAtNyAvIDE4XG4gICAgfTtcbiAgICByZXR1cm4gVXRpbDtcbn0pKCk7XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgc3ZnLCBodWIsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgZGVmLmZpbGwgPSBcIm5vbmVcIjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3IC0gdCk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkIC0gdCk7XG4gICAgICAgIGRlZi50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3IodCAvIDIpICsgXCIsXCIgKyBNYXRoLmZsb29yKC1kICsgdCAvIDIpICsgXCIpXCI7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gW01hdGguZmxvb3IoNiAqIFV0aWwuZW0pLCBNYXRoLmZsb29yKDYgKiBVdGlsLmVtKV0uam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IGQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgfVxuICAgIEJCT1hfRlJBTUUucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX0ZSQU1FO1xufSkoQkJPWCk7XG52YXIgQkJPWF9HTFlQSCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfR0xZUEgsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HTFlQSChzY2FsZSwgaWQsIGgsIGQsIHcsIGwsIHIsIHApIHtcbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5uID0gMDtcbiAgICAgICAgdmFyIGRlZjtcbiAgICAgICAgdmFyIHQgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuYmxhY2tlcjtcbiAgICAgICAgdmFyIGNhY2hlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLnVzZUZvbnRDYWNoZTtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IChzY2FsZSA9PT0gMSA/IG51bGwgOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIik7XG4gICAgICAgIGlmIChjYWNoZSAmJiAhTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICBpZCA9IFwiRVwiICsgdGhpcy5uICsgXCItXCIgKyBpZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNhY2hlIHx8ICF0aGlzLmdseXBoc1tpZF0pIHtcbiAgICAgICAgICAgIGRlZiA9IHsgXCJzdHJva2Utd2lkdGhcIjogdCB9O1xuICAgICAgICAgICAgaWYgKGNhY2hlKVxuICAgICAgICAgICAgICAgIGRlZi5pZCA9IGlkO1xuICAgICAgICAgICAgZWxzZSBpZiAodHJhbnNmb3JtKVxuICAgICAgICAgICAgICAgIGRlZi50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgICAgICAgICBkZWYuZCA9IChwID8gXCJNXCIgKyBwICsgXCJaXCIgOiBcIlwiKTtcbiAgICAgICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJwYXRoXCIpO1xuICAgICAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5nbHlwaHNbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50ID0gVXRpbC5FbGVtZW50KFwidXNlXCIsIGRlZik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoVXRpbC5YTElOS05TLCBcImhyZWZcIiwgXCIjXCIgKyBpZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oID0gKGggKyB0KSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSAoZCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMudyA9ICh3ICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IChsICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuciA9IChyICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuSCA9IE1hdGgubWF4KDAsIHRoaXMuaCk7XG4gICAgICAgIHRoaXMuRCA9IE1hdGgubWF4KDAsIHRoaXMuZCk7XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICB9XG4gICAgQkJPWF9HTFlQSC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIEJCT1hfR0xZUEg7XG59KShCQk9YKTtcbnZhciBCQk9YX0hMSU5FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ITElORSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0hMSU5FKHcsIHQsIGRhc2gsIGNvbG9yLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIilcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLnkxID0gZGVmLnkyID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi54MiA9IE1hdGguZmxvb3IodyAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgdyAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IHQ7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIEJCT1hfSExJTkUucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiBCQk9YX0hMSU5FO1xufSkoQkJPWCk7XG52YXIgQkJPWF9OT05SRU1PVkFCTEUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05PTlJFTU9WQUJMRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05PTlJFTU9WQUJMRSgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05PTlJFTU9WQUJMRTtcbn0pKEJCT1hfRyk7XG52YXIgQkJPWF9OVUxMID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OVUxMLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTlVMTCgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuQ2xlYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTlVMTDtcbn0pKEJCT1gpO1xudmFyIEJCT1hfUkVDVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUkVDVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JFQ1QoaCwgZCwgdywgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoICsgZDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy55ID0gLWQ7XG4gICAgfVxuICAgIEJCT1hfUkVDVC50eXBlID0gXCJyZWN0XCI7XG4gICAgQkJPWF9SRUNULnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICByZXR1cm4gQkJPWF9SRUNUO1xufSkoQkJPWCk7XG52YXIgQkJPWF9ST1cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1JPVywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JPVygpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuZWxlbXMgPSBbXTtcbiAgICAgICAgdGhpcy5zaCA9IHRoaXMuc2QgPSAwO1xuICAgIH1cbiAgICBCQk9YX1JPVy5wcm90b3R5cGUuQ2hlY2sgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgc3ZnID0gZGF0YS50b1NWRygpO1xuICAgICAgICB0aGlzLmVsZW1zLnB1c2goc3ZnKTtcbiAgICAgICAgaWYgKGRhdGEuU1ZHY2FuU3RyZXRjaChcIlZlcnRpY2FsXCIpKSB7XG4gICAgICAgICAgICBzdmcubW1sID0gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmggPiB0aGlzLnNoKSB7XG4gICAgICAgICAgICB0aGlzLnNoID0gc3ZnLmg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kID4gdGhpcy5zZCkge1xuICAgICAgICAgICAgdGhpcy5zZCA9IHN2Zy5kO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBCQk9YX1JPVy5wcm90b3R5cGUuU3RyZXRjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmVsZW1zLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHN2ZyA9IHRoaXMuZWxlbXNbaV0sIG1tbCA9IHN2Zy5tbWw7XG4gICAgICAgICAgICBpZiAobW1sKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1tbC5mb3JjZVN0cmV0Y2ggfHwgbW1sLkVkaXRhYmxlU1ZHZGF0YS5oICE9PSB0aGlzLnNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuZCAhPT0gdGhpcy5zZCkge1xuICAgICAgICAgICAgICAgICAgICBzdmcgPSBtbWwuU1ZHc3RyZXRjaFYodGhpcy5zaCwgdGhpcy5zZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1tbC5FZGl0YWJsZVNWR2RhdGEuSFcgPSB0aGlzLnNoO1xuICAgICAgICAgICAgICAgIG1tbC5FZGl0YWJsZVNWR2RhdGEuRCA9IHRoaXMuc2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLmljKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pYyA9IHN2Zy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5BZGQoc3ZnLCB0aGlzLncsIDAsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLmVsZW1zO1xuICAgIH07XG4gICAgcmV0dXJuIEJCT1hfUk9XO1xufSkoQkJPWCk7XG52YXIgQkJPWF9TVkcgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1NWRywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1NWRyhzY2FsZSwgaWQsIGgsIGQsIHcsIGwsIHIsIHApIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgbnVsbCwgXCJzdmdcIik7XG4gICAgfVxuICAgIEJCT1hfU1ZHLnR5cGUgPSBcInN2Z1wiO1xuICAgIEJCT1hfU1ZHLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICByZXR1cm4gQkJPWF9TVkc7XG59KShCQk9YKTtcbnZhciBCQk9YX1ZMSU5FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9WTElORSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1ZMSU5FKGgsIHQsIGRhc2gsIGNvbG9yLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFV0aWwuRml4ZWQodCwgMik7XG4gICAgICAgIGRlZi54MSA9IGRlZi54MiA9IGRlZi55MSA9IE1hdGguZmxvb3IodCAvIDIpO1xuICAgICAgICBkZWYueTIgPSBNYXRoLmZsb29yKGggLSB0IC8gMik7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICB2YXIgbiA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDYgKiB0KSksIG0gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICgyICogbiArIDEpKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBtICsgXCIgXCIgKyBtO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXNoID09PSBcImRvdHRlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gWzEsIE1hdGgubWF4KDE1MCwgTWF0aC5mbG9vcigyICogdCkpXS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1saW5lY2FwXCJdID0gXCJyb3VuZFwiO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJsaW5lXCIpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB0O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICBCQk9YX1ZMSU5FLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICByZXR1cm4gQkJPWF9WTElORTtcbn0pKEJCT1gpO1xudmFyIEVsZW1lbnRKYXggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVsZW1lbnRKYXgoKSB7XG4gICAgfVxuICAgIHJldHVybiBFbGVtZW50SmF4O1xufSkoKTtcbnZhciBNQmFzZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUJhc2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQmFzZU1peGluKEFKQVgpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuQUpBWCA9IEFKQVg7XG4gICAgfVxuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmdldEJCID0gZnVuY3Rpb24gKHJlbGF0aXZlVG8pIHtcbiAgICAgICAgdmFyIGVsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbTtcbiAgICAgICAgaWYgKCFlbGVtKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnT2ggbm8hIENvdWxkblxcJ3QgZmluZCBlbGVtIGZvciB0aGlzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QkJveCgpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5nZXRNZXRob2RzID0gZnVuY3Rpb24gKEFKQVgsIEhVQiwgSFRNTCwgZWRpdGFibGVTVkcpIHtcbiAgICAgICAgdmFyIG90aGVyID0ge1xuICAgICAgICAgICAgQUpBWDogQUpBWCxcbiAgICAgICAgICAgIEhVQjogSFVCLFxuICAgICAgICAgICAgSFRNTDogSFRNTCxcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmoucHJvdG90eXBlID0ge307XG4gICAgICAgIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5wcm90b3R5cGUpIHtcbiAgICAgICAgICAgIG9ialtpZF0gPSB0aGlzLnByb3RvdHlwZVtpZF07XG4gICAgICAgIH1cbiAgICAgICAgb2JqLmVkaXRhYmxlU1ZHID0gZWRpdGFibGVTVkc7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVuZGVyZWQgPSB0aGlzLmRhdGFbaV0udG9TVkcodmFyaWFudCwgc3ZnLnNjYWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBzdmcuQWRkKHJlbmRlcmVkLCBzdmcudywgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBjaGlsZC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKHN2Zy5za2V3ICYmIHRleHQubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5yID4gc3ZnLncgJiYgdGV4dC5sZW5ndGggPT09IDEgJiYgIXZhcmlhbnQubm9JQykge1xuICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjaGlsZFNWRyA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhW2ldID8gdGhpcy5kYXRhW2ldLnRvU1ZHKCkgOiBuZXcgQkJPWCgpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCA9IGZ1bmN0aW9uIChpLCBIVywgRCkge1xuICAgICAgICBpZiAoRCA9PT0gdm9pZCAwKSB7IEQgPSBudWxsOyB9XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge1xuICAgICAgICAgICAgSFc6IEhXLFxuICAgICAgICAgICAgRDogRFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBCQk9YKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3NhdmVEYXRhID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMuRWRpdGFibGVTVkdkYXRhKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLncgPSBzdmcudywgdGhpcy5FZGl0YWJsZVNWR2RhdGEueCA9IHN2Zy54O1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oID0gc3ZnLmgsIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgPSBzdmcuZDtcbiAgICAgICAgaWYgKHN2Zy55KSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oICs9IHN2Zy55O1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCAtPSBzdmcueTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLlggIT0gbnVsbClcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLlggPSBzdmcuWDtcbiAgICAgICAgaWYgKHN2Zy50dyAhPSBudWxsKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudHcgPSBzdmcudHc7XG4gICAgICAgIGlmIChzdmcuc2tldylcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnNrZXcgPSBzdmcuc2tldztcbiAgICAgICAgaWYgKHN2Zy5pYylcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmljID0gc3ZnLmljO1xuICAgICAgICBpZiAodGhpc1tcImNsYXNzXCJdKSB7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogdGhpc1tcImNsYXNzXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pZCkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHRoaXMuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhyZWYpIHtcbiAgICAgICAgICAgIHZhciBhID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChcImFcIiwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogXCJtangtc3ZnLWhyZWZcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIHRoaXMuaHJlZik7XG4gICAgICAgICAgICBhLm9uY2xpY2sgPSB0aGlzLlNWR2xpbms7XG4gICAgICAgICAgICBVdGlsLmFkZEVsZW1lbnQoYSwgXCJyZWN0XCIsIHtcbiAgICAgICAgICAgICAgICB3aWR0aDogc3ZnLncsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBzdmcuaCArIHN2Zy5kLFxuICAgICAgICAgICAgICAgIHk6IC1zdmcuZCxcbiAgICAgICAgICAgICAgICBmaWxsOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwicG9pbnRlci1ldmVudHNcIjogXCJhbGxcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3ZnLnR5cGUgPT09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGcuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBhLmFwcGVuZENoaWxkKGcuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuYWRkTU1MY2xhc3Nlcykge1xuICAgICAgICAgICAgdGhpcy5TVkdhZGRDbGFzcyhzdmcuZWxlbWVudCwgXCJtangtc3ZnLVwiICsgdGhpcy50eXBlKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0eWxlID0gdGhpcy5zdHlsZTtcbiAgICAgICAgaWYgKHN0eWxlICYmIHN2Zy5lbGVtZW50KSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUpIHtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5ib3JkZXIgPSBzdmcuZWxlbWVudC5zdHlsZS5wYWRkaW5nID0gXCJcIjtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gKHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPT09IFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHYWRkQXR0cmlidXRlcyhzdmcpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYWRkQ2xhc3MgPSBmdW5jdGlvbiAobm9kZSwgbmFtZSkge1xuICAgICAgICB2YXIgY2xhc3NlcyA9IG5vZGUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIik7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgKGNsYXNzZXMgPyBjbGFzc2VzICsgXCIgXCIgOiBcIlwiKSArIG5hbWUpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYWRkQXR0cmlidXRlcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKHRoaXMuYXR0ck5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgY29weSA9IHRoaXMuYXR0ck5hbWVzLCBza2lwID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ub2NvcHlBdHRyaWJ1dGVzLCBpZ25vcmUgPSBNYXRoSmF4Lkh1Yi5jb25maWcuaWdub3JlTU1MYXR0cmlidXRlcztcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9ICh0aGlzLnR5cGUgPT09IFwibXN0eWxlXCIgPyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1hdGgucHJvdG90eXBlLmRlZmF1bHRzIDogdGhpcy5kZWZhdWx0cyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGNvcHkubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gY29weVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaWdub3JlW2lkXSA9PSBmYWxzZSB8fCAoIXNraXBbaWRdICYmICFpZ25vcmVbaWRdICYmXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzW2lkXSA9PSBudWxsICYmIHR5cGVvZiAoc3ZnLmVsZW1lbnRbaWRdKSA9PT0gXCJ1bmRlZmluZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKGlkLCB0aGlzLmF0dHJbaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBocmVmID0gdGhpcy5ocmVmLmFuaW1WYWw7XG4gICAgICAgIGlmIChocmVmLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBVdGlsLmhhc2hDaGVjayhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChocmVmLnN1YnN0cigxKSkpO1xuICAgICAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQuc2Nyb2xsSW50b1ZpZXcpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhcmVudE5vZGUuc2Nyb2xsSW50b1ZpZXcodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBocmVmO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgdmFyIHNwYW4gPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3Byb2Nlc3NTdHlsZXMgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHtcbiAgICAgICAgICAgIGJvcmRlcjogVXRpbC5nZXRCb3JkZXJzKHN0eWxlKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IFV0aWwuZ2V0UGFkZGluZyhzdHlsZSlcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFzdHlsZXMuYm9yZGVyKVxuICAgICAgICAgICAgZGVsZXRlIHN0eWxlcy5ib3JkZXI7XG4gICAgICAgIGlmICghc3R5bGVzLnBhZGRpbmcpXG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLnBhZGRpbmc7XG4gICAgICAgIGlmIChzdHlsZS5mb250U2l6ZSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFNpemUnXSA9IHN0eWxlLmZvbnRTaXplO1xuICAgICAgICBpZiAoc3R5bGUuY29sb3IpXG4gICAgICAgICAgICBzdHlsZXNbJ2NvbG9yJ10gPSBzdHlsZS5jb2xvcjtcbiAgICAgICAgaWYgKHN0eWxlLmJhY2tncm91bmRDb2xvcilcbiAgICAgICAgICAgIHN0eWxlc1snYmFja2dyb3VuZCddID0gc3R5bGUuYmFja2dyb3VuZENvbG9yO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFN0eWxlKVxuICAgICAgICAgICAgc3R5bGVzWydmb250U3R5bGUnXSA9IHN0eWxlLmZvbnRTdHlsZTtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRXZWlnaHQpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRXZWlnaHQnXSA9IHN0eWxlLmZvbnRXZWlnaHQ7XG4gICAgICAgIGlmIChzdHlsZS5mb250RmFtaWx5KVxuICAgICAgICAgICAgc3R5bGVzWydmb250RmFtaWx5J10gPSBzdHlsZS5mb250RmFtaWx5O1xuICAgICAgICBpZiAoc3R5bGVzWydmb250V2VpZ2h0J10gJiYgc3R5bGVzWydmb250V2VpZ2h0J10ubWF0Y2goL15cXGQrJC8pKVxuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSAocGFyc2VJbnQoc3R5bGVzWydmb250V2VpZ2h0J10pID4gNjAwID8gXCJib2xkXCIgOiBcIm5vcm1hbFwiKTtcbiAgICAgICAgcmV0dXJuIHN0eWxlcztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50eXBlICE9PSBcIm1vXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJsc3BhY2VcIiwgXCJyc3BhY2VcIik7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsIDw9IDAgfHwgdGhpcy5oYXNWYWx1ZShcImxzcGFjZVwiKSB8fCB0aGlzLmhhc1ZhbHVlKFwicnNwYWNlXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5sc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubHNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5yc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMucnNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhciBjb3JlID0gdGhpcywgcGFyZW50ID0gdGhpcy5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyZW50ICYmIHBhcmVudC5pc0VtYmVsbGlzaGVkKCkgJiYgcGFyZW50LkNvcmUoKSA9PT0gY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBjb3JlID0gcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKVxuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB2YWx1ZXMubHNwYWNlO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMucnNwYWNlKVxuICAgICAgICAgICAgICAgICAgICBzdmcuWCA9IHZhbHVlcy5yc3BhY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BhY2UgPSB0aGlzLnRleFNwYWNpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoKTtcbiAgICAgICAgICAgIGlmIChzcGFjZSAhPT0gXCJcIilcbiAgICAgICAgICAgICAgICBzdmcueCArPSBVdGlsLmxlbmd0aDJlbShzcGFjZSwgdGhpcy5zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlQ29sb3IgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcIm1hdGhjb2xvclwiLCBcImNvbG9yXCIpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZXMgJiYgdGhpcy5zdHlsZXMuY29sb3IgJiYgIXZhbHVlcy5jb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLmNvbG9yID0gdGhpcy5zdHlsZXMuY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5jb2xvciAmJiAhdGhpcy5tYXRoY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoY29sb3IgPSB2YWx1ZXMuY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5tYXRoY29sb3IpIHtcbiAgICAgICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMubWF0aGNvbG9yLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogdmFsdWVzLm1hdGhjb2xvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBib3JkZXJzID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5ib3JkZXIsIHBhZGRpbmcgPSAodGhpcy5zdHlsZXMgfHwge30pLnBhZGRpbmcsIGJsZWZ0ID0gKChib3JkZXJzIHx8IHt9KS5sZWZ0IHx8IDApLCBwbGVmdCA9ICgocGFkZGluZyB8fCB7fSkubGVmdCB8fCAwKSwgaWQ7XG4gICAgICAgIHZhbHVlcy5iYWNrZ3JvdW5kID0gKHRoaXMubWF0aGJhY2tncm91bmQgfHwgdGhpcy5iYWNrZ3JvdW5kIHx8XG4gICAgICAgICAgICAodGhpcy5zdHlsZXMgfHwge30pLmJhY2tncm91bmQgfHwgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5DT0xPUi5UUkFOU1BBUkVOVCk7XG4gICAgICAgIGlmIChibGVmdCArIHBsZWZ0KSB7XG4gICAgICAgICAgICB2YXIgZHVwID0gbmV3IEJCT1goTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzdmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ZnLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkdXBbaWRdID0gc3ZnW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdXAueCA9IDA7XG4gICAgICAgICAgICBkdXAueSA9IDA7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFkZChkdXAsIGJsZWZ0ICsgcGxlZnQsIDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYWRkaW5nKSB7XG4gICAgICAgICAgICBzdmcudyArPSBwYWRkaW5nLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBwYWRkaW5nLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gcGFkZGluZy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgc3ZnLncgKz0gYm9yZGVycy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gYm9yZGVycy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IGJvcmRlcnMuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5iYWNrZ3JvdW5kICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkNPTE9SLlRSQU5TUEFSRU5UKSB7XG4gICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKG5vZGVOYW1lICE9PSBcImdcIiAmJiBub2RlTmFtZSAhPT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBnO1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfUkVDVChzdmcuaCwgc3ZnLmQsIHN2Zy53LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLmJhY2tncm91bmQsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIlxuICAgICAgICAgICAgfSksIDAsIDAsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgdmFyIGRkID0gNTtcbiAgICAgICAgICAgIHZhciBzaWRlcyA9IHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIC1kZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICByaWdodDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCBzdmcudyAtIGJvcmRlcnMucmlnaHQgKyBkZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICB0b3A6IFtcIkhcIiwgc3ZnLncsIDAsIHN2Zy5oIC0gYm9yZGVycy50b3AgKyBkZF0sXG4gICAgICAgICAgICAgICAgYm90dG9tOiBbXCJIXCIsIHN2Zy53LCAwLCAtc3ZnLmQgLSBkZF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmb3IgKGlkIGluIHNpZGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNpZGVzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyc1tpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaWRlID0gc2lkZXNbaWRdLCBib3ggPSBCQk9YW3NpZGVbMF0gKyBcIkxJTkVcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGJveChzaWRlWzFdLCBib3JkZXJzW2lkXSwgYm9yZGVyc1tpZCArIFwiU3R5bGVcIl0sIGJvcmRlcnNbaWQgKyBcIkNvbG9yXCJdKSwgc2lkZVsyXSwgc2lkZVszXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFZhcmlhbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcIm1hdGh2YXJpYW50XCIsIFwiZm9udGZhbWlseVwiLCBcImZvbnR3ZWlnaHRcIiwgXCJmb250c3R5bGVcIik7XG4gICAgICAgIHZhciB2YXJpYW50ID0gdmFsdWVzLm1hdGh2YXJpYW50O1xuICAgICAgICBpZiAodGhpcy52YXJpYW50Rm9ybSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IFwiLVRlWC12YXJpYW50XCI7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLmhhc1ZhcmlhbnQgPSB0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpO1xuICAgICAgICBpZiAoIXZhbHVlcy5oYXNWYXJpYW50KSB7XG4gICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdmFsdWVzLmZvbnRmYW1pbHk7XG4gICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gdmFsdWVzLmZvbnR3ZWlnaHQ7XG4gICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB2YWx1ZXMuZm9udHN0eWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnN0eWxlcykge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuc3R5bGUgJiYgdGhpcy5zdHlsZXMuZm9udFN0eWxlKVxuICAgICAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHRoaXMuc3R5bGVzLmZvbnRTdHlsZTtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB0aGlzLnN0eWxlcy5mb250V2VpZ2h0KVxuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB0aGlzLnN0eWxlcy5mb250V2VpZ2h0O1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuZmFtaWx5ICYmIHRoaXMuc3R5bGVzLmZvbnRGYW1pbHkpXG4gICAgICAgICAgICAgICAgdmFsdWVzLmZhbWlseSA9IHRoaXMuc3R5bGVzLmZvbnRGYW1pbHk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5mYW1pbHkgJiYgIXZhbHVlcy5oYXNWYXJpYW50KSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdmFsdWVzLm1hdGh2YXJpYW50Lm1hdGNoKC9ib2xkLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gXCJib2xkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2l0YWxpYy8pKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gXCJpdGFsaWNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgZm9yY2VGYW1pbHk6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9udDoge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6IHZhbHVlcy5mYW1pbHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zdHlsZSkge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udFtcImZvbnQtc3R5bGVcIl0gPSB2YWx1ZXMuc3R5bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLndlaWdodCkge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udFtcImZvbnQtd2VpZ2h0XCJdID0gdmFsdWVzLndlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0ID09PSBcImJvbGRcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBub3JtYWw6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIGl0YWxpYzogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERJVEFMSUMsXG4gICAgICAgICAgICAgICAgZnJha3R1cjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERGUkFLVFVSLFxuICAgICAgICAgICAgICAgIHNjcmlwdDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0FOU1NFUklGLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRkJPTERJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZXMud2VpZ2h0ID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGJvbGQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5ub3JtYWwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuSVRBTElDLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1mcmFrdHVyXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5GUkFLVFVSLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zY3JpcHRcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNDUklQVCxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1ib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGSVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5zdHlsZSA9PT0gXCJpdGFsaWNcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBub3JtYWw6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgYm9sZDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERJVEFMSUMsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUMsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRkJPTERJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgaXRhbGljOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1ib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNBTlNTRVJJRlxuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICghKHZhcmlhbnQgaW4gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVCkpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBcIm5vcm1hbFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRdO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U2NhbGUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBzY2FsZSA9IDE7XG4gICAgICAgIGlmICh0aGlzLm1zY2FsZSkge1xuICAgICAgICAgICAgc2NhbGUgPSB0aGlzLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJmb250c2l6ZVwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9ICh0aGlzLmlzVG9rZW4gPyB0aGlzIDogdGhpcy5QYXJlbnQoKSkuR2V0KFwibWF0aHNpemVcIik7XG4gICAgICAgICAgICBpZiAoKHRoaXMuc3R5bGVzIHx8IHt9KS5mb250U2l6ZSAmJiAhdmFsdWVzLmZvbnRzaXplKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmZvbnRzaXplID0gdGhpcy5zdHlsZXMuZm9udFNpemU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmZvbnRzaXplICYmICF0aGlzLm1hdGhzaXplKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLm1hdGhzaXplID0gdmFsdWVzLmZvbnRzaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNjYWxlID0gTWF0aC5wb3codGhpcy5HZXQoXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKSwgdmFsdWVzLnNjcmlwdGxldmVsKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuR2V0KFwic2NyaXB0bWluc2l6ZVwiKSkgLyAxMDAwO1xuICAgICAgICAgICAgICAgIGlmIChzY2FsZSA8IHZhbHVlcy5zY3JpcHRtaW5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjYWxlID0gdmFsdWVzLnNjcmlwdG1pbnNpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICAgICAgdGhpcy5tc2NhbGUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF0aHNpemUpIC8gMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnKSB7XG4gICAgICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzVG9rZW4pIHtcbiAgICAgICAgICAgICAgICBzdmcuc2NhbGUgKj0gdGhpcy5tc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjYWxlICogdGhpcy5tc2NhbGU7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRNdSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIG11ID0gMSwgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcInNjcmlwdHNpemVtdWx0aXBsaWVyXCIpO1xuICAgICAgICBpZiAoc3ZnLnNjYWxlICYmIHN2Zy5zY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgbXUgPSAxIC8gc3ZnLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPiAyKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdGxldmVsID0gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG11ID0gTWF0aC5zcXJ0KE1hdGgucG93KHZhbHVlcy5zY3JpcHRzaXplbXVsdGlwbGllciwgdmFsdWVzLnNjcmlwdGxldmVsKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG11O1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbm90RW1wdHkgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB3aGlsZSAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKChkYXRhLnR5cGUgIT09IFwibXJvd1wiICYmIGRhdGEudHlwZSAhPT0gXCJ0ZXhhdG9tXCIpIHx8XG4gICAgICAgICAgICAgICAgZGF0YS5kYXRhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLmRhdGFbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIGNhbiA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0VtYmVsbGlzaGVkKCkpIHtcbiAgICAgICAgICAgIHZhciBjb3JlID0gdGhpcy5Db3JlKCk7XG4gICAgICAgICAgICBpZiAoY29yZSAmJiBjb3JlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY2FuID0gY29yZS5TVkdjYW5TdHJldGNoKGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKGNhbiAmJiBjb3JlLmZvcmNlU3RyZXRjaCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcmNlU3RyZXRjaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYW47XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvU1ZHKGgsIGQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyh3KTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xpbmVCcmVha3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2F1dG9sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZmlsZSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmF1dG9sb2FkRGlyICsgXCIvXCIgKyB0aGlzLnR5cGUgKyBcIi5qc1wiO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIodGhpcy5BSkFYLlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYXV0b2xvYWRGaWxlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgbmFtZSArIFwiLmpzXCI7XG4gICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcih0aGlzLkFKQVguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsZW5ndGgyZW0gPSBmdW5jdGlvbiAoc3ZnLCBsZW5ndGgsIG11LCBkLCBtKSB7XG4gICAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgICAgIG0gPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF0Y2ggPSBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvd2lkdGh8aGVpZ2h0fGRlcHRoLyk7XG4gICAgICAgIHZhciBzaXplID0gKG1hdGNoID8gc3ZnW21hdGNoWzBdLmNoYXJBdCgwKV0gOiAoZCA/IHN2Z1tkXSA6IDApKTtcbiAgICAgICAgdmFyIHYgPSBVdGlsLmxlbmd0aDJlbShsZW5ndGgsIG11LCBzaXplIC8gdGhpcy5tc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIGlmIChkICYmIFN0cmluZyhsZW5ndGgpLm1hdGNoKC9eXFxzKlstK10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KG0sIHN2Z1tkXSArIHYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgYXMgY3Vyc29yIGNvbnRhaW5lcicpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZHJhdyBjdXJzb3InKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3JIaWdobGlnaHQgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdIaWdobGlnaHRBdChzdmdlbGVtLCBiYi54LCBiYi55LCBiYi53aWR0aCwgYmIuaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmdldFNWR0JCb3ggPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgZWxlbSA9IGVsZW0gfHwgdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSB8fCAhZWxlbS5vd25lclNWR0VsZW1lbnQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBiYiA9IGVsZW0uZ2V0QkJveCgpO1xuICAgICAgICBpZiAoZWxlbS5ub2RlTmFtZSA9PT0gJ3VzZScpIHtcbiAgICAgICAgICAgIGJiLnggKz0gTnVtYmVyKGVsZW0uZ2V0QXR0cmlidXRlKCd4JykpO1xuICAgICAgICAgICAgYmIueSArPSBOdW1iZXIoZWxlbS5nZXRBdHRyaWJ1dGUoJ3knKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IGVsZW0uZ2V0VHJhbnNmb3JtVG9FbGVtZW50KGVsZW0ub3duZXJTVkdFbGVtZW50KTtcbiAgICAgICAgdmFyIHB0bXAgPSBlbGVtLm93bmVyU1ZHRWxlbWVudC5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICB2YXIgbHggPSAxIC8gMCwgbHkgPSAxIC8gMCwgaHggPSAtMSAvIDAsIGh5ID0gLTEgLyAwO1xuICAgICAgICBjaGVjayhiYi54LCBiYi55KTtcbiAgICAgICAgY2hlY2soYmIueCArIGJiLndpZHRoLCBiYi55KTtcbiAgICAgICAgY2hlY2soYmIueCwgYmIueSArIGJiLmhlaWdodCk7XG4gICAgICAgIGNoZWNrKGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBseCxcbiAgICAgICAgICAgIHk6IGx5LFxuICAgICAgICAgICAgd2lkdGg6IGh4IC0gbHgsXG4gICAgICAgICAgICBoZWlnaHQ6IGh5IC0gbHksXG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIGNoZWNrKHgsIHkpIHtcbiAgICAgICAgICAgIHB0bXAueCA9IHg7XG4gICAgICAgICAgICBwdG1wLnkgPSB5O1xuICAgICAgICAgICAgdmFyIHAgPSBwdG1wLm1hdHJpeFRyYW5zZm9ybSh0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgbHggPSBNYXRoLm1pbihseCwgcC54KTtcbiAgICAgICAgICAgIGx5ID0gTWF0aC5taW4obHksIHAueSk7XG4gICAgICAgICAgICBoeCA9IE1hdGgubWF4KGh4LCBwLngpO1xuICAgICAgICAgICAgaHkgPSBNYXRoLm1heChoeSwgcC55KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1CYXNlTWl4aW47XG59KShFbGVtZW50SmF4KTtcbnZhciBDaGFyc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQ2hhcnNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBDaGFyc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgQ2hhcnNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHJlbWFwLCBjaGFycykge1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YS5qb2luKFwiXCIpLnJlcGxhY2UoL1tcXHUyMDYxLVxcdTIwNjRdL2csIFwiXCIpO1xuICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgIHRleHQgPSByZW1hcCh0ZXh0LCBjaGFycyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgdGV4dCkge1xuICAgICAgICB2YXIgRURJVEFCTEVTVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIHZhciBuLCBOLCBjLCBmb250LCBWQVJJQU5ULCBpLCBtLCBpZCwgTSwgUkFOR0VTO1xuICAgICAgICBpZiAoIXZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW01hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUxdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YXJpYW50LmZvcmNlRmFtaWx5KSB7XG4gICAgICAgICAgICB0ZXh0ID0gbmV3IEJCT1hfVEVYVChNYXRoSmF4LkhUTUwsIHNjYWxlLCB0ZXh0LCB2YXJpYW50LmZvbnQpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKHRleHQpO1xuICAgICAgICAgICAgdGV4dCA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgVkFSSUFOVCA9IHZhcmlhbnQ7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0ZXh0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyaWFudCA9IFZBUklBTlQ7XG4gICAgICAgICAgICBuID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgYyA9IHRleHQuY2hhckF0KGkpO1xuICAgICAgICAgICAgaWYgKG4gPj0gMHhEODAwICYmIG4gPCAweERCRkYpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgbiA9ICgoKG4gLSAweEQ4MDApIDw8IDEwKSArICh0ZXh0LmNoYXJDb2RlQXQoaSkgLSAweERDMDApKSArIDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgaWYgKEZPTlREQVRBLlJlbWFwUGxhbmUxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudiA9IEZPTlREQVRBLlJlbWFwUGxhbmUxKG4sIHZhcmlhbnQpO1xuICAgICAgICAgICAgICAgICAgICBuID0gbnYubjtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IG52LnZhcmlhbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgUkFOR0VTID0gRk9OVERBVEEuUkFOR0VTO1xuICAgICAgICAgICAgICAgIGZvciAoaWQgPSAwLCBNID0gUkFOR0VTLmxlbmd0aDsgaWQgPCBNOyBpZCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLm5hbWUgPT09IFwiYWxwaGFcIiAmJiB2YXJpYW50Lm5vTG93ZXJDYXNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIE4gPSB2YXJpYW50W1wib2Zmc2V0XCIgKyBSQU5HRVNbaWRdLm9mZnNldF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChOICYmIG4gPj0gUkFOR0VTW2lkXS5sb3cgJiYgbiA8PSBSQU5HRVNbaWRdLmhpZ2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLnJlbWFwICYmIFJBTkdFU1tpZF0ucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gTiArIFJBTkdFU1tpZF0ucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuID0gbiAtIFJBTkdFU1tpZF0ubG93ICsgTjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5hZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbiArPSBSQU5HRVNbaWRdLmFkZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcCAmJiB2YXJpYW50LnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgbiA9IHZhcmlhbnQucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAudmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50LnJlbWFwLnZhcmlhbnRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLlJFTUFQW25dICYmICF2YXJpYW50Lm5vUmVtYXApIHtcbiAgICAgICAgICAgICAgICBuID0gRk9OVERBVEEuUkVNQVBbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbblsxXV07XG4gICAgICAgICAgICAgICAgbiA9IG5bMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIChuKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIHRleHQgPSBuICsgdGV4dC5zdWJzdHIoaSArIDEpO1xuICAgICAgICAgICAgICAgIG0gPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpID0gLTE7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb250ID0gQ2hhcnNNaXhpbi5sb29rdXBDaGFyKHZhcmlhbnQsIG4pO1xuICAgICAgICAgICAgYyA9IGZvbnRbbl07XG4gICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgIGlmICgoY1s1XSAmJiBjWzVdLnNwYWNlKSB8fCAoY1s1XSA9PT0gXCJcIiAmJiBjWzBdICsgY1sxXSA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLncgKz0gY1syXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBbc2NhbGUsIGZvbnQuaWQgKyBcIi1cIiArIG4udG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCldLmNvbmNhdChjKTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gRihhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQkJPWF9HTFlQSC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IEJCT1hfR0xZUEgucHJvdG90eXBlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2x5cGggPSBuZXcgRihjKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChnbHlwaCwgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0pIHtcbiAgICAgICAgICAgICAgICBjID0gdGhpcy5jcmVhdGVEZWxpbWl0ZXIobiwgMCwgMSwgZm9udCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgKEZPTlREQVRBLkRFTElNSVRFUlNbbl0uZGlyID09PSBcIlZcIiA/IGMuZCA6IDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuIDw9IDB4RkZGRikge1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIE4gPSBuIC0gMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gPj4gMTApICsgMHhEODAwKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoKE4gJiAweDNGRikgKyAweERDMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfVEVYVChNYXRoSmF4LkhUTUwsIHNjYWxlICogMTAwIC8gRURJVEFCTEVTVkcuY29uZmlnLnNjYWxlLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFyaWFudC5kZWZhdWx0RmFtaWx5IHx8IEVESVRBQkxFU1ZHLmNvbmZpZy51bmRlZmluZWRGYW1pbHksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiAodmFyaWFudC5pdGFsaWMgPyBcIml0YWxpY1wiIDogXCJcIiksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogKHZhcmlhbnQuYm9sZCA/IFwiYm9sZFwiIDogXCJcIilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveC5kID0gdmFyaWFudC5kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgIGMuQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5IdWIuc2lnbmFsLlBvc3QoW1wiU1ZHIEpheCAtIHVua25vd24gY2hhclwiLCBuLCB2YXJpYW50XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAxICYmIGZvbnQuc2tldyAmJiBmb250LnNrZXdbbl0pIHtcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gZm9udC5za2V3W25dICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5sb29rdXBDaGFyID0gZnVuY3Rpb24gKHZhcmlhbnQsIG4pIHtcbiAgICAgICAgdmFyIGksIG07XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXZhcmlhbnQuRk9OVFMpIHtcbiAgICAgICAgICAgIHZhciBGT05UUyA9IEZPTlREQVRBLkZPTlRTO1xuICAgICAgICAgICAgdmFyIGZvbnRzID0gKHZhcmlhbnQuZm9udHMgfHwgRk9OVERBVEEuVkFSSUFOVC5ub3JtYWwuZm9udHMpO1xuICAgICAgICAgICAgaWYgKCEoZm9udHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICBmb250cyA9IFtmb250c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5mb250cyAhPSBmb250cykge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBmb250cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBmb250cy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVFNbZm9udHNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMucHVzaChGT05UU1tmb250c1tpXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdmFyaWFudC5GT05UUy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmb250ID0gdmFyaWFudC5GT05UU1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGZvbnQpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHZhcmlhbnQuRk9OVFM7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkRm9udChmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmb250W25dKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRCbG9jayhmb250LCBuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IFwidW5rbm93blwiXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlciA9IGZ1bmN0aW9uIChjb2RlLCBIVywgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgaWYgKHNjYWxlID09PSB2b2lkIDApIHsgc2NhbGUgPSBudWxsOyB9XG4gICAgICAgIGlmIChmb250ID09PSB2b2lkIDApIHsgZm9udCA9IG51bGw7IH1cbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHNjYWxlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShIVyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgSFcgPSBbSFcsIEhXXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaHcgPSBIV1sxXTtcbiAgICAgICAgSFcgPSBIV1swXTtcbiAgICAgICAgdmFyIGRlbGltID0ge1xuICAgICAgICAgICAgYWxpYXM6IGNvZGUsXG4gICAgICAgICAgICBIVzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkXG4gICAgICAgIH07XG4gICAgICAgIHdoaWxlIChkZWxpbS5hbGlhcykge1xuICAgICAgICAgICAgY29kZSA9IGRlbGltLmFsaWFzO1xuICAgICAgICAgICAgZGVsaW0gPSBGT05UREFUQS5ERUxJTUlURVJTW2NvZGVdO1xuICAgICAgICAgICAgaWYgKCFkZWxpbSkge1xuICAgICAgICAgICAgICAgIGRlbGltID0ge1xuICAgICAgICAgICAgICAgICAgICBIVzogWzAsIEZPTlREQVRBLlZBUklBTlRbTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTF1dXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubG9hZCkge1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKEVESVRBQkxFU1ZHLmZvbnREaXIgKyBcIi9mb250ZGF0YS1cIiArIGRlbGltLmxvYWQgKyBcIi5qc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkZWxpbS5IVy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVswXSAqIHNjYWxlID49IEhXIC0gMTAgLSBFZGl0YWJsZVNWRy5jb25maWcuYmxhY2tlciB8fCAoaSA9PSBtIC0gMSAmJiAhZGVsaW0uc3RyZXRjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gZGVsaW0uSFdbaV1bMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVszXSkge1xuICAgICAgICAgICAgICAgICAgICBjb2RlID0gZGVsaW0uSFdbaV1bM107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIFtjb2RlLCBkZWxpbS5IV1tpXVsxXV0sIGZvbnQpLldpdGgoe1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLnN0cmV0Y2gpIHtcbiAgICAgICAgICAgIHRoaXNbXCJleHRlbmREZWxpbWl0ZXJcIiArIGRlbGltLmRpcl0oc3ZnLCBodywgZGVsaW0uc3RyZXRjaCwgc2NhbGUsIGZvbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZUNoYXIgPSBmdW5jdGlvbiAoc2NhbGUsIGRhdGEsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiLCB2YXJpYW50ID0ge1xuICAgICAgICAgICAgZm9udHM6IFtkYXRhWzFdXSxcbiAgICAgICAgICAgIG5vUmVtYXA6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBbZGF0YVsxXSArIFwiLWJvbGRcIiwgZGF0YVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiAoZGF0YVsxXSkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBkYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGF0YVswXS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs0XSkge1xuICAgICAgICAgICAgc2NhbGUgPSBzY2FsZSAqIGRhdGFbNF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIGlmIChkYXRhWzJdKSB7XG4gICAgICAgICAgICBzdmcueCA9IGRhdGFbMl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzNdKSB7XG4gICAgICAgICAgICBzdmcueSA9IGRhdGFbM10gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzVdKSB7XG4gICAgICAgICAgICBzdmcuaCArPSBkYXRhWzVdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs2XSkge1xuICAgICAgICAgICAgc3ZnLmQgKz0gZGF0YVs2XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uZmluZEJsb2NrID0gZnVuY3Rpb24gKGZvbnQsIGMpIHtcbiAgICAgICAgaWYgKGZvbnQuUmFuZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGZvbnQuUmFuZ2VzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChjIDwgZm9udC5SYW5nZXNbaV1bMF0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSBmb250LlJhbmdlc1tpXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IGZvbnQuUmFuZ2VzW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gZm9udC5SYW5nZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb250LlJhbmdlc1tqXVsyXSA9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udC5SYW5nZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udC5kaXJlY3RvcnkgKyBcIi9cIiArIGZpbGUgKyBcIi5qc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENoYXJzTWl4aW4ubG9hZEZvbnQgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuZm9udERpciArIFwiL1wiICsgZmlsZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIENoYXJzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBFbnRpdHlNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEVudGl0eU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEVudGl0eU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgRW50aXR5TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLnRvU3RyaW5nKCkucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnaGFuZGxpbmcgZW50aXR5OiAnLCB0ZXh0KTtcbiAgICAgICAgcmV0dXJuIENoYXJzTWl4aW4uSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgfTtcbiAgICByZXR1cm4gRW50aXR5TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBIb2xlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhIb2xlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gSG9sZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgSG9sZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLlNWRygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgaG9sZSA9IFNWRy5jcmVhdGVIb2xlKDMwMCwgNDAwKTtcbiAgICAgICAgc3ZnLkFkZChob2xlLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgSG9sZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEhvbGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb2xlIGRvZXMgbm90IGhhdmUgYSBjaGlsZCcpO1xuICAgIH07XG4gICAgSG9sZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEhvbGVNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBIb2xlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGJib3gud2lkdGggLyAyLjApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIEhvbGVNaXhpbi50eXBlID0gXCJob2xlXCI7XG4gICAgSG9sZU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBIb2xlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNQWN0aW9uTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQWN0aW9uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUFjdGlvbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUFjdGlvbk1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNQWN0aW9uTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNYXRoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXRoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWF0aE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChzcGFuLCBkaXYpIHtcbiAgICAgICAgdmFyIENPTkZJRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZztcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbMF0pXG4gICAgICAgICAgICByZXR1cm4gc3BhbjtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50O1xuICAgICAgICBpZiAoU3RyaW5nKE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IFwiMFwiO1xuICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgZGF0YVN2ZyA9IHRoaXMuZGF0YVswXS50b1NWRygpO1xuICAgICAgICBib3guQWRkKGRhdGFTdmcsIDAsIDAsIHRydWUpO1xuICAgICAgICBib3guQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICBVdGlsLkVsZW1lbnQoYm94LmVsZW1lbnQsIHtcbiAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAwLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgVXRpbC5YTElOS05TKTtcbiAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbCA9IE1hdGgubWF4KC1zdmcubCwgMCksIHIgPSBNYXRoLm1heChzdmcuciAtIHN2Zy53LCAwKTtcbiAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIFV0aWwuRXgobCArIHN2Zy53ICsgcikpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgVXRpbC5FeChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0pKTtcbiAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5EIC0gMiAqIFV0aWwuZW0pO1xuICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gVXRpbC5FeCgtbCk7XG4gICAgICAgIHN0eWxlLm1hcmdpblJpZ2h0ID0gVXRpbC5FeCgtcik7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgVXRpbC5GaXhlZCgtbCwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoLXN2Zy5IIC0gVXRpbC5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICBVdGlsLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSwgMSkpO1xuICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gVXRpbC5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgPiBzdmcuZCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gVXRpbC5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsdHRleHQgPSB0aGlzLkdldChcImFsdHRleHRcIik7XG4gICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcInJvbGVcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgc3ZnLmVsZW1lbnQgPSBudWxsO1xuICAgICAgICBpZiAoIXRoaXMuaXNNdWx0aWxpbmUgJiYgdGhpcy5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIgJiYgIXN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50YWxpZ25maXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdGhpcy5kaXNwbGF5QWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0Zmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UU0hJRlQuSU5ERU5UU0hJRlQpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSB2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnQgPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuaW5kZW50c2hpZnQsIDEsIHRoaXMuZWRpdGFibGVTVkcuY3dpZHRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXlJbmRlbnQgIT09IFwiMFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGVudCA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuZGlzcGxheUluZGVudCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIHNoaWZ0ICs9ICh2YWx1ZXMuaW5kZW50YWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uUklHSFQgPyAtaW5kZW50IDogaW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5zdHlsZS50ZXh0QWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ247XG4gICAgICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQoc3R5bGUsICh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IFV0aWwuRXgoc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVt2YWx1ZXMuaW5kZW50YWxpZ25dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhbjtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTWF0aE1peGluLmN1cnNvcmFibGUgPSBmYWxzZTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNRXJyb3JNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FcnJvck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FcnJvck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKGRlZik7XG4gICAgICAgIGJib3guQWRkKHRoaXMuU1ZHY2hpbGRTVkcoMCkpO1xuICAgICAgICBiYm94LkNsZWFuKCk7XG4gICAgICAgIGlmIChzY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgYmJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ID0gW1wid1wiLCBcImhcIiwgXCJkXCIsIFwibFwiLCBcInJcIiwgXCJEXCIsIFwiSFwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gYWRqdXN0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGJib3hbYWRqdXN0W2ldXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZTogTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm1lcnJvclN0eWxlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQodGhpcy5zdHlsZXMsIHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNRXJyb3JNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1GZW5jZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GZW5jZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRmVuY2VkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRmVuY2VkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5vcGVuKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLm9wZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDEsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmNsb3NlKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLmNsb3NlKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTUZlbmNlZE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUZyYWNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GcmFjTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZyYWNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgZnJhYyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGZyYWMuc2NhbGUgPSBzdmcuc2NhbGU7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2UoZnJhYyk7XG4gICAgICAgIHZhciBudW0gPSB0aGlzLlNWR2NoaWxkU1ZHKDApLCBkZW4gPSB0aGlzLlNWR2NoaWxkU1ZHKDEpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJsaW5ldGhpY2tuZXNzXCIsIFwibnVtYWxpZ25cIiwgXCJkZW5vbWFsaWduXCIsIFwiYmV2ZWxsZWRcIik7XG4gICAgICAgIHZhciBpc0Rpc3BsYXkgPSB2YWx1ZXMuZGlzcGxheXN0eWxlO1xuICAgICAgICB2YXIgYSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIGlmICh2YWx1ZXMuYmV2ZWxsZWQpIHtcbiAgICAgICAgICAgIHZhciBkZWx0YSA9IChpc0Rpc3BsYXkgPyA0MDAgOiAxNTApO1xuICAgICAgICAgICAgdmFyIEggPSBNYXRoLm1heChudW0uaCArIG51bS5kLCBkZW4uaCArIGRlbi5kKSArIDIgKiBkZWx0YTtcbiAgICAgICAgICAgIHZhciBiZXZlbCA9IEVkaXRhYmxlU1ZHLmNyZWF0ZURlbGltaXRlcigweDJGLCBIKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKG51bSwgMCwgKG51bS5kIC0gbnVtLmgpIC8gMiArIGEgKyBkZWx0YSk7XG4gICAgICAgICAgICBmcmFjLkFkZChiZXZlbCwgbnVtLncgLSBkZWx0YSAvIDIsIChiZXZlbC5kIC0gYmV2ZWwuaCkgLyAyICsgYSk7XG4gICAgICAgICAgICBmcmFjLkFkZChkZW4sIG51bS53ICsgYmV2ZWwudyAtIGRlbHRhLCAoZGVuLmQgLSBkZW4uaCkgLyAyICsgYSAtIGRlbHRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBXID0gTWF0aC5tYXgobnVtLncsIGRlbi53KTtcbiAgICAgICAgICAgIHZhciB0ID0gVXRpbC50aGlja25lc3MyZW0odmFsdWVzLmxpbmV0aGlja25lc3MsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGUsIHAsIHEsIHUsIHY7XG4gICAgICAgICAgICB2YXIgbXQgPSBVdGlsLlRlWC5taW5fcnVsZV90aGlja25lc3MgLyBVdGlsLmVtICogMTAwMDtcbiAgICAgICAgICAgIGlmIChpc0Rpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICB1ID0gVXRpbC5UZVgubnVtMTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdSA9ICh0ID09PSAwID8gVXRpbC5UZVgubnVtMyA6IFV0aWwuVGVYLm51bTIpO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1ICo9IHNjYWxlO1xuICAgICAgICAgICAgdiAqPSBzY2FsZTtcbiAgICAgICAgICAgIGlmICh0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyA3IDogMykgKiBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcywgMiAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgdiArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy53ID0gVztcbiAgICAgICAgICAgICAgICB0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gMiA6IDApICogbXQgKyB0LCB0IC8gMiArIDEuNSAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoYSArIHQgLyAyKTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcSA9IChhIC0gdCAvIDIpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMuQWRkKG5ldyBCQk9YX1JFQ1QodCAvIDIsIHQgLyAyLCBXICsgMiAqIHQpLCAwLCBhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWMuQWxpZ24obnVtLCB2YWx1ZXMubnVtYWxpZ24sIHQsIHUpO1xuICAgICAgICAgICAgZnJhYy5BbGlnbihkZW4sIHZhbHVlcy5kZW5vbWFsaWduLCB0LCAtdik7XG4gICAgICAgIH1cbiAgICAgICAgZnJhYy5DbGVhbigpO1xuICAgICAgICBzdmcuQWRkKGZyYWMsIDAsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnRleFdpdGhEZWxpbXMgJiYgIXRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UuY2FsbCh0aGlzLCBzdmcpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBtaWRsaW5lWSA9IGJiLnkgKyAoYmIuaGVpZ2h0IC8gMi4wKTtcbiAgICAgICAgdmFyIG1pZGxpbmVYID0gYmIueCArIChiYi53aWR0aCAvIDIuMCk7XG4gICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAoeCA8IG1pZGxpbmVYKSA/IDAgOiAxLFxuICAgICAgICAgICAgaGFsZjogKHkgPCBtaWRsaW5lWSkgPyAwIDogMSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHZhciBpc051bWVyYXRvciA9IHRoaXMuZGF0YVswXSA9PT0gY2hpbGQ7XG4gICAgICAgIHZhciBpc0Rlbm9taW5hdG9yID0gdGhpcy5kYXRhWzFdID09PSBjaGlsZDtcbiAgICAgICAgaWYgKCFpc051bWVyYXRvciAmJiAhaXNEZW5vbWluYXRvcilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3BlY2lmaWVkIGNoaWxkIG5vdCBmb3VuZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoaXNOdW1lcmF0b3IgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNEZW5vbWluYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGtlZXApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZihpc051bWVyYXRvciA/IDAgOiAxLCBjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvSGFsZiA9IGZ1bmN0aW9uIChoYWxmLCBjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAodGhpcy5kYXRhW2hhbGZdLmN1cnNvcmFibGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaGFsZl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICAgIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW2hhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmIChiYiAmJiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMikge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIGhhbGY6IGhhbGYsXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDAsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9EZW5vbWluYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigxLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBnZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uTEVGVDpcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLlJJR0hUOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbMF0uY3Vyc29yYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICAgICAgICAgIGhhbGY6IDAsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDAgOiAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uVVA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5ET1dOOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPyBiYm94LndpZHRoICsgMTAwIDogLTEwMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICBNRnJhY01peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBNRnJhY01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUdseXBoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNR2x5cGhNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNR2x5cGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1HbHlwaE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIDtcbiAgICByZXR1cm4gTUdseXBoTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNTXVsdGlTY3JpcHRzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNTXVsdGlTY3JpcHRzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTU11bHRpU2NyaXB0c01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTU11bHRpU2NyaXB0c01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIDtcbiAgICByZXR1cm4gTU11bHRpU2NyaXB0c01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTW5NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW5NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1uTWl4aW4ucHJvdG90eXBlLmdldEN1cnNvckxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5kYXRhWzBdLmxlbmd0aDtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICBpZiAodmVydGljYWwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIHZhciBuZXdQb3NpdGlvbiA9IGN1cnNvci5wb3NpdGlvbiArIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gLTEgOiAxKTtcbiAgICAgICAgaWYgKG5ld1Bvc2l0aW9uIDwgMCB8fCBuZXdQb3NpdGlvbiA+IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24gJiZcbiAgICAgICAgICAgIHRoaXMubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLngsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBmb3IgKHZhciBjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5nZXRDdXJzb3JMZW5ndGgoKTsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KHRoaXMuRWRpdGFibGVTVkdlbGVtLmNoaWxkcmVuW2NoaWxkSWR4XSk7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYi54ICsgKGJiLndpZHRoIC8gMik7XG4gICAgICAgICAgICBpZiAoeCA8IG1pZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgcHJlZWRnZSwgcG9zdGVkZ2U7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBiYm94Lng7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJlYm94ID0gdGhpcy5nZXRTVkdCQm94KHRoaXMuRWRpdGFibGVTVkdlbGVtLmNoaWxkcmVuW2N1cnNvci5wb3NpdGlvbiAtIDFdKTtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBwcmVib3gueCArIHByZWJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSB0aGlzLmdldEN1cnNvckxlbmd0aCgpKSB7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IGJib3gueCArIGJib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9zdGJveCA9IHRoaXMuZ2V0U1ZHQkJveCh0aGlzLkVkaXRhYmxlU1ZHZWxlbS5jaGlsZHJlbltjdXJzb3IucG9zaXRpb25dKTtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gcG9zdGJveC54O1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gKHBvc3RlZGdlICsgcHJlZWRnZSkgLyAyO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTW5NaXhpbi5jdXJzb3JhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gTW5NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1vTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNb01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1vTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNb01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICBpZiAoSFcgPT09IHZvaWQgMCkgeyBIVyA9IG51bGw7IH1cbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChEICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibGFyZ2VvcFwiLCBcImRpc3BsYXlzdHlsZVwiKTtcbiAgICAgICAgaWYgKHZhbHVlcy5sYXJnZW9wKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCItbGFyZ2VPcFwiIDogXCItc21hbGxPcFwiXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5Db3JlUGFyZW50KCk7XG4gICAgICAgIHZhciBpc1NjcmlwdCA9IChwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXApICYmIHRoaXMgIT09IHBhcmVudC5kYXRhWzBdKTtcbiAgICAgICAgdmFyIG1hcGNoYXJzID0gKGlzU2NyaXB0ID8gdGhpcy5yZW1hcENoYXJzIDogbnVsbCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgcGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2NyaXB0ICYmIHRoaXMuZGF0YS5qb2luKFwiXCIpLm1hdGNoKC9bJ2BcIlxcdTAwQjRcXHUyMDMyLVxcdTIwMzdcXHUyMDU3XS8pKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFtcIi1UZVgtdmFyaWFudFwiXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzY2FsZSwgdGhpcy5yZW1hcCwgbWFwY2hhcnMpLCB4ID0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IDAgJiYgLXRleHQubCA+IDEwICogdGV4dC53KSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gLXRleHQubDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0LCB4LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gdGV4dC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgc3ZnLnkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChzdmcuaCAtIHN2Zy5kKSAvIDIgLyBzY2FsZTtcbiAgICAgICAgICAgIGlmIChzdmcuciA+IHN2Zy53KSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLkdldChcInN0cmV0Y2h5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGMgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKGMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXVuZGVyb3ZlcikgJiZcbiAgICAgICAgICAgIHRoaXMuQ29yZVRleHQocGFyZW50LmRhdGFbcGFyZW50LmJhc2VdKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBvdmVyID0gcGFyZW50LmRhdGFbcGFyZW50Lm92ZXJdLCB1bmRlciA9IHBhcmVudC5kYXRhW3BhcmVudC51bmRlcl07XG4gICAgICAgICAgICBpZiAob3ZlciAmJiB0aGlzID09PSBvdmVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnRcIikpIHtcbiAgICAgICAgICAgICAgICBjID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlRbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHVuZGVyICYmIHRoaXMgPT09IHVuZGVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnR1bmRlclwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5SRU1BUEFDQ0VOVFVOREVSW2NdIHx8IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLkRFTElNSVRFUlNbYy5jaGFyQ29kZUF0KDApXTtcbiAgICAgICAgdmFyIGNhbiA9IChjICYmIGMuZGlyID09IGRpcmVjdGlvbi5zdWJzdHIoMCwgMSkpO1xuICAgICAgICBpZiAoIWNhbikge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3ZnO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9yY2VTdHJldGNoID0gY2FuICYmICh0aGlzLkdldChcIm1pbnNpemVcIiwgdHJ1ZSkgfHwgdGhpcy5HZXQoXCJtYXhzaXplXCIsIHRydWUpKTtcbiAgICAgICAgcmV0dXJuIGNhbjtcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnIHx8IHRoaXMudG9TVkcoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic3ltbWV0cmljXCIsIFwibWF4c2l6ZVwiLCBcIm1pbnNpemVcIik7XG4gICAgICAgIHZhciBheGlzID0gVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzdmcuc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpLCBIO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IDIgKiBNYXRoLm1heChoIC0gYXhpcywgZCArIGF4aXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IGggKyBkO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5tYXhzaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1heHNpemUsIG11LCBzdmcuaCArIHN2Zy5kKTtcbiAgICAgICAgdmFsdWVzLm1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWluc2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICBIID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCBIKSk7XG4gICAgICAgIGlmIChIICE9IHZhbHVlcy5taW5zaXplKSB7XG4gICAgICAgICAgICBIID0gW01hdGgubWF4KEggKiBVdGlsLlRlWC5kZWxpbWl0ZXJmYWN0b3IgLyAxMDAwLCBIIC0gVXRpbC5UZVguZGVsaW1pdGVyc2hvcnRmYWxsKSwgSF07XG4gICAgICAgIH1cbiAgICAgICAgc3ZnID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgSCwgc3ZnLnNjYWxlKTtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgLyAyICsgYXhpcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgKiBoIC8gKGggKyBkKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcueSA9IEggLSBzdmcuaDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF4c2l6ZVwiLCBcIm1pbnNpemVcIiwgXCJtYXRodmFyaWFudFwiLCBcImZvbnR3ZWlnaHRcIik7XG4gICAgICAgIGlmICgodmFsdWVzLmZvbnR3ZWlnaHQgPT09IFwiYm9sZFwiIHx8IHBhcnNlSW50KHZhbHVlcy5mb250d2VpZ2h0KSA+PSA2MDApICYmXG4gICAgICAgICAgICAhdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKSkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGh2YXJpYW50ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdmFsdWVzLm1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWluc2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdyA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgdykpO1xuICAgICAgICBzdmcgPSBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgdywgc3ZnLnNjYWxlLCB2YWx1ZXMubWF0aHZhcmlhbnQpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTW9NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1QYWRkZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QYWRkZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGFkZGVkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBwYWQgPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiLCBcImxzcGFjZVwiLCBcInZvZmZzZXRcIiksIFggPSAwLCBZID0gMDtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgWCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLmxzcGFjZSwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy52b2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgWSA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLnZvZmZzZXQsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoID0gcGFkLmgsIGQgPSBwYWQuZCwgdyA9IHBhZC53LCB5ID0gcGFkLnk7XG4gICAgICAgICAgICBzdmcuQWRkKHBhZCwgWCwgWSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHN2Zy5oID0gaCArIHk7XG4gICAgICAgICAgICBzdmcuZCA9IGQgLSB5O1xuICAgICAgICAgICAgc3ZnLncgPSB3O1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaGVpZ2h0ICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmggPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5oZWlnaHQsIG11LCBcImhcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmRlcHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmQgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5kZXB0aCwgbXUsIFwiZFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcudyA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLndpZHRoLCBtdSwgXCJ3XCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5oID4gc3ZnLkgpIHtcbiAgICAgICAgICAgICAgICBzdmcuSCA9IHN2Zy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgaWYgKHN2Zy5kID4gc3ZnLkQpIHtcbiAgICAgICAgICAgICAgICBzdmcuRCA9IHN2Zy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS5TVkdsZW5ndGgyZW0gPSBmdW5jdGlvbiAoc3ZnLCBsZW5ndGgsIG11LCBkLCBtKSB7XG4gICAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgICAgIG0gPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF0Y2ggPSBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvd2lkdGh8aGVpZ2h0fGRlcHRoLyk7XG4gICAgICAgIHZhciBzaXplID0gKG1hdGNoID8gc3ZnW21hdGNoWzBdLmNoYXJBdCgwKV0gOiAoZCA/IHN2Z1tkXSA6IDApKTtcbiAgICAgICAgdmFyIHYgPSBVdGlsLmxlbmd0aDJlbShsZW5ndGgsIG11LCBzaXplIC8gdGhpcy5tc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIGlmIChkICYmIFN0cmluZyhsZW5ndGgpLm1hdGNoKC9eXFxzKlstK10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KG0sIHN2Z1tkXSArIHYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNUGFkZGVkTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNUGhhbnRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBoYW50b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGhhbnRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBoYW50b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUNoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1QaGFudG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3FydE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNxcnRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3FydE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApLCBydWxlLCBzdXJkO1xuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGUsIHAsIHEsIEgsIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IEVkaXRhYmxlU1ZHLmNyZWF0ZURlbGltaXRlcigweDIyMUEsIEgsIHNjYWxlKTtcbiAgICAgICAgaWYgKHN1cmQuaCArIHN1cmQuZCA+IEgpIHtcbiAgICAgICAgICAgIHEgPSAoKHN1cmQuaCArIHN1cmQuZCkgLSAoSCAtIHQpKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IG5ldyBCQk9YX1JFQ1QodCwgMCwgYmFzZS53KTtcbiAgICAgICAgSCA9IGJhc2UuaCArIHEgKyB0O1xuICAgICAgICB4ID0gdGhpcy5TVkdhZGRSb290KHN2Zywgc3VyZCwgeCwgc3VyZC5oICsgc3VyZC5kIC0gSCwgc2NhbGUpO1xuICAgICAgICBzdmcuQWRkKHN1cmQsIHgsIEggLSBzdXJkLmgpO1xuICAgICAgICBzdmcuQWRkKHJ1bGUsIHggKyBzdXJkLncsIEggLSBydWxlLmgpO1xuICAgICAgICBzdmcuQWRkKGJhc2UsIHggKyBzdXJkLncsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLmggKz0gdDtcbiAgICAgICAgc3ZnLkggKz0gdDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3FydE1peGluLnByb3RvdHlwZS5TVkdhZGRSb290ID0gZnVuY3Rpb24gKHN2Zywgc3VyZCwgeCwgZCwgc2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgICByZXR1cm4gTVNxcnRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1Sb290TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm9vdE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb290TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnRvU1ZHID0gTVNxcnRNaXhpbi50b1NWRztcbiAgICB9XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHZhciBkeCA9IChzdXJkLmlzTXVsdGlDaGFyID8gLjU1IDogLjY1KSAqIHN1cmQudztcbiAgICAgICAgaWYgKHRoaXMuZGF0YVsxXSkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmRhdGFbMV0udG9TVkcoKTtcbiAgICAgICAgICAgIHJvb3QueCA9IDA7XG4gICAgICAgICAgICB2YXIgaCA9IHRoaXMuU1ZHcm9vdEhlaWdodChzdXJkLmggKyBzdXJkLmQsIHNjYWxlLCByb290KSAtIGQ7XG4gICAgICAgICAgICB2YXIgdyA9IE1hdGgubWluKHJvb3Qudywgcm9vdC5yKTtcbiAgICAgICAgICAgIHggPSBNYXRoLm1heCh3LCBkeCk7XG4gICAgICAgICAgICBzdmcuQWRkKHJvb3QsIHggLSB3LCBoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGR4ID0geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCAtIGR4O1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHcm9vdEhlaWdodCA9IGZ1bmN0aW9uIChkLCBzY2FsZSwgcm9vdCkge1xuICAgICAgICByZXR1cm4gLjQ1ICogKGQgLSA5MDAgKiBzY2FsZSkgKyA2MDAgKiBzY2FsZSArIE1hdGgubWF4KDAsIHJvb3QuZCAtIDc1KTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGMsIGQsIHRoaXMpO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGMsIGQpO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5jdXJzb3JhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gTVJvb3RNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1Sb3dNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpIHtcbiAgICAgICAgICAgIHN2ZyA9IHRoaXMuU1ZHbXVsdGlsaW5lKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR2xpbmVCcmVha3MgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy5wYXJlbnQubGluZWJyZWFrQ29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWMgJiZcbiAgICAgICAgICAgIHN2Zy53ID4gdGhpcy5lZGl0YWJsZVNWRy5saW5lYnJlYWtXaWR0aCkgfHwgdGhpcy5oYXNOZXdsaW5lKCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR211bHRpbGluZSA9IGZ1bmN0aW9uIChzcGFuKSB7XG4gICAgICAgIHJldHVybiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLlNWR2F1dG9sb2FkRmlsZShcIm11bHRpbGluZVwiKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIHcpLCBzdmcudywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvclBhc3N0aHJvdWdoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBmb3IgKHZhciBjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gdGhpcy5kYXRhW2NoaWxkSWR4XTtcbiAgICAgICAgICAgIHZhciBiYiA9IGNoaWxkLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmIpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYi54ICsgKGJiLndpZHRoIC8gMik7XG4gICAgICAgICAgICBpZiAoeCA8IG1pZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICBpZiAodmVydGljYWwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIHZhciBuZXdQb3NpdGlvbiA9IGN1cnNvci5wb3NpdGlvbiArIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gLTEgOiAxKTtcbiAgICAgICAgaWYgKG5ld1Bvc2l0aW9uIDwgMCB8fCBuZXdQb3NpdGlvbiA+IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZFBvc2l0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IGN1cnNvci5wb3NpdGlvbiAtIDEgOiBjdXJzb3IucG9zaXRpb247XG4gICAgICAgIGlmIChjdXJzb3IubW9kZSA9PT0gY3Vyc29yLlNFTEVDVElPTikge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjaGlsZFBvc2l0aW9uXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbikpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgcHJlZWRnZSwgcG9zdGVkZ2U7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBiYm94Lng7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJlYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBwcmVib3gueCArIHByZWJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IGJib3gueCArIGJib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9zdGJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gcG9zdGJveC54O1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gKHBvc3RlZGdlICsgcHJlZWRnZSkgLyAyO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uU3RhcnQubm9kZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgdmFyIGN1ciA9IGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlO1xuICAgICAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLnBhcmVudCA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZGF0YS5pbmRleE9mKGN1cikgKyAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyID0gY3VyLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnNlbGVjdGlvbkVuZC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggc2VsZWN0aW9uU3RhcnQgbm90IGluIG1yb3dcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbihjdXJzb3Iuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIGN1cnNvci5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIGlmIChwb3MxID09PSBwb3MyKSB7XG4gICAgICAgICAgICBjdXJzb3IuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeDEgPSB0aGlzLmRhdGFbcG9zMV0uZ2V0U1ZHQkJveCgpLng7XG4gICAgICAgIHZhciBwb3MyYmIgPSB0aGlzLmRhdGFbcG9zMiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHgyID0gcG9zMmJiLnggKyBwb3MyYmIud2lkdGg7XG4gICAgICAgIHZhciB3aWR0aCA9IHgyIC0geDE7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdIaWdobGlnaHRBdChzdmdlbGVtLCB4MSwgYmIueSwgd2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4uY3Vyc29yYWJsZSA9IHRydWU7XG4gICAgcmV0dXJuIE1Sb3dNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1zTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1zTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnRvU1ZHID0gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZDtcbiAgICB9XG4gICAgcmV0dXJuIE1zTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3BhY2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TcGFjZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcGFjZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNwYWNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIpO1xuICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLm1hdGhiYWNrZ3JvdW5kO1xuICAgICAgICBpZiAodGhpcy5iYWNrZ3JvdW5kICYmICF0aGlzLm1hdGhiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLmJhY2tncm91bmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5tc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICBzdmcuaCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5oZWlnaHQsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcuZCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5kZXB0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMud2lkdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBpZiAoc3ZnLncgPCAwKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oIDwgLXN2Zy5kKSB7XG4gICAgICAgICAgICBzdmcuZCA9IC1zdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBzdmcubCA9IDA7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3BhY2VNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1TdHlsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN0eWxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN0eWxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBtYXRoID0gc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIGlmIChtYXRoLmljKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gbWF0aC5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdHlsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVN1YlN1cE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN1YlN1cE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdWJTdXBNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuZW5kaW5nUG9zID0gMTtcbiAgICB9XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQodGhpcy5iYXNlLCBIVywgRCkpO1xuICAgICAgICB2YXIgc3NjYWxlID0gKHRoaXMuZGF0YVt0aGlzLnN1cF0gfHwgdGhpcy5kYXRhW3RoaXMuc3ViXSB8fCB0aGlzKS5TVkdnZXRTY2FsZSgpO1xuICAgICAgICB2YXIgeF9oZWlnaHQgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlLCBzID0gVXRpbC5UZVguc2NyaXB0c3BhY2UgKiBzY2FsZTtcbiAgICAgICAgdmFyIHN1cCwgc3ViO1xuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdXBdKSkge1xuICAgICAgICAgICAgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXS50b1NWRygpO1xuICAgICAgICAgICAgc3VwLncgKz0gcztcbiAgICAgICAgICAgIHN1cC5yID0gTWF0aC5tYXgoc3VwLncsIHN1cC5yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdWJdKSkge1xuICAgICAgICAgICAgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXS50b1NWRygpO1xuICAgICAgICAgICAgc3ViLncgKz0gcztcbiAgICAgICAgICAgIHN1Yi5yID0gTWF0aC5tYXgoc3ViLncsIHN1Yi5yKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IFV0aWwuVGVYLnN1cF9kcm9wICogc3NjYWxlLCByID0gVXRpbC5UZVguc3ViX2Ryb3AgKiBzc2NhbGU7XG4gICAgICAgIHZhciB1ID0gYmFzZS5oICsgKGJhc2UueSB8fCAwKSAtIHEsIHYgPSBiYXNlLmQgLSAoYmFzZS55IHx8IDApICsgciwgZGVsdGEgPSAwLCBwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgYmFzZS53IC09IGJhc2UuaWM7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdICYmXG4gICAgICAgICAgICAodGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtaVwiIHx8IHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibW9cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIGJhc2Uuc2NhbGUgPT09IDEgJiZcbiAgICAgICAgICAgICAgICAhYmFzZS5zdHJldGNoZWQgJiYgIXRoaXMuZGF0YVt0aGlzLmJhc2VdLkdldChcImxhcmdlb3BcIikpIHtcbiAgICAgICAgICAgICAgICB1ID0gdiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuZ2V0VmFsdWVzKFwic3Vic2NyaXB0c2hpZnRcIiwgXCJzdXBlcnNjcmlwdHNoaWZ0XCIpO1xuICAgICAgICBtaW4uc3Vic2NyaXB0c2hpZnQgPSAobWluLnN1YnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdWJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgbWluLnN1cGVyc2NyaXB0c2hpZnQgPSAobWluLnN1cGVyc2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1cGVyc2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIHZhciB4ID0gYmFzZS53ICsgYmFzZS54O1xuICAgICAgICBpZiAoIXN1cCkge1xuICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIxICogc2NhbGUsIHN1Yi5oIC0gKDQgLyA1KSAqIHhfaGVpZ2h0LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtdik7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwidGV4cHJpbWVzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBwID0gVXRpbC5UZVhbKHZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcInN1cDFcIiA6ICh2YWx1ZXMudGV4cHJpbWVzdHlsZSA/IFwic3VwM1wiIDogXCJzdXAyXCIpKV07XG4gICAgICAgICAgICAgICAgdSA9IE1hdGgubWF4KHUsIHAgKiBzY2FsZSwgc3VwLmQgKyAoMSAvIDQpICogeF9oZWlnaHQsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCB1KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gdTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIyICogc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICBpZiAoKHUgLSBzdXAuZCkgLSAoc3ViLmggLSB2KSA8IDMgKiB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSAzICogdCAtIHUgKyBzdXAuZCArIHN1Yi5oO1xuICAgICAgICAgICAgICAgICAgICBxID0gKDQgLyA1KSAqIHhfaGVpZ2h0IC0gKHUgLSBzdXAuZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdSArPSBxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiAtPSBxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdWJTdXBNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1UYWJsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVGV4dE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRleHRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGV4dE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRleHRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgICAgICB2YXIgZGVmID0geyBkaXJlY3Rpb246IHRoaXMuR2V0KFwiZGlyXCIpIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVEVYVCh0aGlzLkhUTUwsIHNjYWxlICogMTAwIC8gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLnNjYWxlLCB0aGlzLmRhdGEuam9pbihcIlwiKSwgZGVmKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTVRleHRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1VbmRlck92ZXJNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1VbmRlck92ZXJNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVW5kZXJPdmVyTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLmVuZGluZ1BvcyA9IDA7XG4gICAgICAgIHRoaXMucmlnaHRNb3ZlU3RheSA9IHRydWU7XG4gICAgfVxuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwiYWNjZW50XCIsIFwiYWNjZW50dW5kZXJcIiwgXCJhbGlnblwiKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuZGlzcGxheXN0eWxlICYmIHRoaXMuZGF0YVt0aGlzLmJhc2VdICE9IG51bGwgJiZcbiAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLmJhc2VdLkNvcmVNTygpLkdldChcIm1vdmFibGVsaW1pdHNcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAucHJvdG90eXBlLnRvU1ZHLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYm94ZXMgPSBbXSwgc3RyZXRjaCA9IFtdLCBib3gsIGksIG0sIFcgPSAtVXRpbC5CSUdESU1FTiwgV1cgPSBXO1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgSFcsIEQpO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gKEQgIT0gbnVsbCB8fCBIVyA9PSBudWxsKSAmJiB0aGlzLmRhdGFbaV0uU1ZHY2FuU3RyZXRjaChcIkhvcml6b250YWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuZGF0YVtpXS50b1NWRygpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHY2FuU3RyZXRjaChcIkhvcml6b250YWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChib3hlc1tpXS53ID4gV1cpIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBib3hlc1tpXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXN0cmV0Y2hbaV0gJiYgV1cgPiBXKSB7XG4gICAgICAgICAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgPT0gbnVsbCAmJiBIVyAhPSBudWxsKSB7XG4gICAgICAgICAgICBXID0gSFc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoVyA9PSAtVXRpbC5CSUdESU1FTikge1xuICAgICAgICAgICAgVyA9IFdXO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IFdXID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RyZXRjaFtpXSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoSChXKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm94ZXNbaV0uWDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHRoaXMubXNjYWxlO1xuICAgICAgICB2YXIgYmFzZSA9IGJveGVzW3RoaXMuYmFzZV0gfHwge1xuICAgICAgICAgICAgdzogMCxcbiAgICAgICAgICAgIGg6IDAsXG4gICAgICAgICAgICBkOiAwLFxuICAgICAgICAgICAgSDogMCxcbiAgICAgICAgICAgIEQ6IDAsXG4gICAgICAgICAgICBsOiAwLFxuICAgICAgICAgICAgcjogMCxcbiAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICBzY2FsZTogc2NhbGVcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHgsIHksIHoxLCB6MiwgejMsIGR3LCBrLCBkZWx0YSA9IDA7XG4gICAgICAgIGlmIChiYXNlLmljKSB7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIHozID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmc1ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgdmFyIGFjY2VudCA9IChpICE9IHRoaXMuYmFzZSAmJiB2YWx1ZXNbdGhpcy5BQ0NFTlRTW2ldXSk7XG4gICAgICAgICAgICAgICAgaWYgKGFjY2VudCAmJiBib3gudyA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveC54ID0gLWJveC5sO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IChuZXcgQkJPWF9HKCkpLldpdGgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlYWJsZTogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSwgTWF0aEpheC5IdWIpO1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS5BZGQoYm94KTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQ2xlYW4oKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0udyA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ID0gYm94ZXNbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGR3ID0ge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgICAgICAgICBjZW50ZXI6IChXVyAtIGJveC53KSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBXVyAtIGJveC53XG4gICAgICAgICAgICAgICAgfVt2YWx1ZXMuYWxpZ25dO1xuICAgICAgICAgICAgICAgIHggPSBkdztcbiAgICAgICAgICAgICAgICB5ID0gMDtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLm92ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IHQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHozID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYXNlLnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICs9IGJhc2Uuc2tldztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGJhc2Uuc2tldztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoeCArIGJveC53ID4gV1cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgKz0gKFdXIC0gYm94LncgLSB4KSAvIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgejEgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzEgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoyID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmczICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gTWF0aC5tYXgoejEsIHoyIC0gTWF0aC5tYXgoMCwgYm94LmQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBrID0gTWF0aC5tYXgoaywgMTUwMCAvIFV0aWwuZW0pO1xuICAgICAgICAgICAgICAgICAgICB4ICs9IGRlbHRhIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgeSA9IGJhc2UueSArIGJhc2UuaCArIGJveC5kICsgaztcbiAgICAgICAgICAgICAgICAgICAgYm94LmggKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guaCA+IGJveC5IKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guSCA9IGJveC5oO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGkgPT0gdGhpcy51bmRlcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWNjZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gMyAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHozID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcyICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNCAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIGJveC5oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBrID0gTWF0aC5tYXgoaywgMTUwMCAvIFV0aWwuZW0pO1xuICAgICAgICAgICAgICAgICAgICB4IC09IGRlbHRhIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgeSA9IGJhc2UueSAtIChiYXNlLmQgKyBib3guaCArIGspO1xuICAgICAgICAgICAgICAgICAgICBib3guZCArPSB6MztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJveC5kID4gYm94LkQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveC5EID0gYm94LmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChib3gsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNVW5kZXJPdmVyTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBTZW1hbnRpY3NNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNlbWFudGljc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFNlbWFudGljc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuZGF0YVswXS50b1NWRygpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoSCh3KSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hWKGgsIGQpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIHJldHVybiBTZW1hbnRpY3NNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIFRlWEF0b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFRlWEF0b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBUZVhBdG9tTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGJveCA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSwgeSA9IDA7XG4gICAgICAgICAgICBpZiAodGhpcy50ZXhDbGFzcyA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5URVhDTEFTUy5WQ0VOVEVSKSB7XG4gICAgICAgICAgICAgICAgeSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0IC0gKGJveC5oICsgYm94LmQpIC8gMiArIGJveC5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZChib3gsIDAsIHkpO1xuICAgICAgICAgICAgc3ZnLmljID0gYm94LmljO1xuICAgICAgICAgICAgc3ZnLnNrZXcgPSBib3guc2tldztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUZVhBdG9tIGRyYXdDdXJzb3IgTk9UIElNUExFTUVOVEVEJyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4uY3Vyc29yYWJsZSA9IHRydWU7XG4gICAgcmV0dXJuIFRlWEF0b21NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
