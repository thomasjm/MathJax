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
            var result = Parser.parseControlSequence("\\" + latex + "{A}");
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
        }
        else {
            this.node.moveCursor(this, 'r');
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
        try {
            visualizeJax(jax, '#mmlviz', this);
        }
        catch (err) {
            console.error('Failed to visualize jax', err);
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
            MML.hole = MML.mbase.Subclass({});
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
            MML.mtable.Augment(MTableMixin.getMethods(this));
            MML.math.Augment(MathMixin.getMethods(this));
            MML.TeXAtom.Augment(TeXAtomMixin.getMethods(this));
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
                    var row = new MathJax.ElementJax.mml.mrow();
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
var Parser = (function () {
    function Parser() {
    }
    Parser.parseControlSequence = function (cs) {
        var result = Parser.checkSpecialCS(cs);
        if (result)
            return result;
        var mathjaxParser = MathJax.InputJax.TeX.Parse(cs);
        mathjaxParser.Parse();
        return mathjaxParser.stack.data[0].data[0];
    };
    Parser.checkSpecialCS = function (cs) {
        var macros = MathJax.InputJax.TeX.Definitions.macros;
        var MML = MathJax.ElementJax.mml;
        if (cs === 'frac') {
            var hole = new MML.hole();
            var result = new MML.mfrac(hole, new MML.hole());
            result.moveCursorAfter = [hole, 0];
            return result;
        }
        if (cs === 'sqrt') {
            var result = new MML.msqrt();
            var hole = new MML.hole();
            result.SetData(0, hole);
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
                return new MML.mo(new MML.chars(value));
            }
        }
    };
    return Parser;
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
        this.removeable = false;
        this.w = this.r = w;
        this.h = this.H = h;
        this.d = this.D = d;
        this.l = 0;
    }
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
        this.removeable = false;
        this.w = this.r = w;
        this.l = 0;
        this.h = this.H = t;
        this.d = this.D = 0;
    }
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
        _super.call(this, def, "rect");
        this.removeable = false;
        this.w = this.r = w;
        this.h = this.H = h + d;
        this.d = this.D = this.l = 0;
        this.y = -d;
    }
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
    function BBOX_SVG() {
        _super.call(this, null, "svg");
        this.removeable = false;
    }
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
        this.removeable = false;
        this.w = this.r = t;
        this.l = 0;
        this.h = this.H = h;
        this.d = this.D = 0;
    }
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
            if (delim.HW[i][0] * scale >= HW - 10 - MathJax.OutputJax.EditableSVG.blacker || (i == m - 1 && !delim.stretch)) {
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
})(MBaseMixin);
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
})(MBaseMixin);
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
})(MBaseMixin);
var MsMixin = (function (_super) {
    __extends(MsMixin, _super);
    function MsMixin() {
        _super.apply(this, arguments);
    }
    MsMixin.prototype.toSVG = function () {
        return this.SVGautoload();
    };
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImpheC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBEaXJlY3Rpb247XG4oZnVuY3Rpb24gKERpcmVjdGlvbikge1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJVUFwiXSA9IDBdID0gXCJVUFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJSSUdIVFwiXSA9IDFdID0gXCJSSUdIVFwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJET1dOXCJdID0gMl0gPSBcIkRPV05cIjtcbiAgICBEaXJlY3Rpb25bRGlyZWN0aW9uW1wiTEVGVFwiXSA9IDNdID0gXCJMRUZUXCI7XG59KShEaXJlY3Rpb24gfHwgKERpcmVjdGlvbiA9IHt9KSk7XG52YXIgQ3Vyc29yID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDdXJzb3IoKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgdGhpcy5pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcbiAgICAgICAgdGhpcy53aWR0aCA9IDUwO1xuICAgIH1cbiAgICBDdXJzb3IucHJvdG90eXBlLnJlZm9jdXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5ub2RlIHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbSB8fFxuICAgICAgICAgICAgIXRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50IHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICAgIHBhcmVudC5mb2N1cygpO1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZVRvQ2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgdmFyIHN2ZyA9IHRhcmdldC5ub2RlTmFtZSA9PT0gJ3N2ZycgPyB0YXJnZXQgOiB0YXJnZXQub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGNwID0gVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMoc3ZnLCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbiAgICAgICAgdmFyIGpheCA9IFV0aWwuZ2V0SmF4RnJvbU1hdGgoc3ZnLnBhcmVudE5vZGUpO1xuICAgICAgICB2YXIgY3VycmVudCA9IGpheC5yb290O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoZWRJdGVtcyA9IGN1cnJlbnQuZGF0YS5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBVdGlsLm5vZGVDb250YWluc1NjcmVlblBvaW50KG5vZGUsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdodWg/IG1hdGNoZWQgbW9yZSB0aGFuIG9uZSBjaGlsZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWF0Y2hlZEl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBtYXRjaGVkSXRlbXNbMF07XG4gICAgICAgICAgICBpZiAobWF0Y2hlZC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBtYXRjaGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKHRoaXMsIGNwLngsIGNwLnkpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG8gPSBmdW5jdGlvbiAobm9kZSwgcG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIICYmICFub2RlLmJhY2tzbGFzaFJvdylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS51cGRhdGVTZWxlY3Rpb24gPSBmdW5jdGlvbiAoc2hpZnRLZXkpIHtcbiAgICAgICAgaWYgKHNoaWZ0S2V5ICYmIHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBzaGlmdEtleSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGlvbihzaGlmdEtleSk7XG4gICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsIGRpcmVjdGlvbik7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMubm9kZS5kcmF3Q3Vyc29yKHRoaXMpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50LCByZWNhbGwpIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbjtcbiAgICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgIHRoaXMuYmFja3NwYWNlKGV2ZW50LCByZWNhbGwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyNzpcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uVVA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHRoaXMubW92ZShkaXJlY3Rpb24sIGV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgICAgICAgIHRoaXMuZHJhdygpO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3VzZWRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGlvbihldmVudC5zaGlmdEtleSk7XG4gICAgICAgIHRoaXMubW92ZVRvQ2xpY2soZXZlbnQpO1xuICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZUhvbGVJZk5lZWRlZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwuaG9sZSgpO1xuICAgICAgICAgICAgdmFyIHJvd2luZGV4ID0gbm9kZS5wYXJlbnQuZGF0YS5pbmRleE9mKG5vZGUpO1xuICAgICAgICAgICAgbm9kZS5wYXJlbnQuU2V0RGF0YShyb3dpbmRleCwgaG9sZSk7XG4gICAgICAgICAgICBob2xlLm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmV4aXRCYWNrc2xhc2hNb2RlID0gZnVuY3Rpb24gKHJlcGxhY2UpIHtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB2YXIgcHBvcyA9IHRoaXMubm9kZS5wYXJlbnQuZGF0YS5pbmRleE9mKHRoaXMubm9kZSk7XG4gICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudC5kYXRhLnNwbGljZShwcG9zLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnQuU2V0RGF0YShwcG9zKyssIHJlcGxhY2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUby5hcHBseSh0aGlzLCByZXBsYWNlLm1vdmVDdXJzb3JBZnRlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUucGFyZW50LCBwcG9zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5iYWNrc3BhY2UgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlLnR5cGUgPT09ICdtcm93JyAmJlxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZSA9PT0gdGhpcy5zZWxlY3Rpb25FbmQubm9kZSkge1xuICAgICAgICAgICAgICAgIHZhciBwb3MxID0gTWF0aC5taW4odGhpcy5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgdGhpcy5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHZhciBwb3MyID0gTWF0aC5tYXgodGhpcy5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgdGhpcy5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQubm9kZS5kYXRhLnNwbGljZShwb3MxLCBwb3MyIC0gcG9zMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVG8odGhpcy5ub2RlLCBwb3MxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFySGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tYWtlSG9sZUlmTmVlZGVkKHRoaXMubm9kZSk7XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRvIHRoaXMgYmFja3NwYWNlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ21yb3cnKSB7XG4gICAgICAgICAgICB2YXIgcHJldiA9IHRoaXMubm9kZS5kYXRhW3RoaXMucG9zaXRpb24gLSAxXTtcbiAgICAgICAgICAgIGlmICghcHJldi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCAmJiB0aGlzLm5vZGUuZGF0YS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0QmFja3NsYXNoTW9kZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiAtIDEsIDEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFrZUhvbGVJZk5lZWRlZCh0aGlzLm5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0ge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uIC0gMVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVjYWxsKFsncmVmb2N1cycsIHRoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLm5vZGUudHlwZSA9PT0gJ2hvbGUnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYmFja3NwYWNlIG9uIGhvbGUhJyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubWFrZUVudGl0eU1vID0gZnVuY3Rpb24gKHVuaWNvZGUpIHtcbiAgICAgICAgdmFyIG1vID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8oKTtcbiAgICAgICAgdmFyIGVudGl0eSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgpO1xuICAgICAgICBlbnRpdHkuQXBwZW5kKHVuaWNvZGUpO1xuICAgICAgICBtby5BcHBlbmQoZW50aXR5KTtcbiAgICAgICAgcmV0dXJuIG1vO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlRW50aXR5TWkgPSBmdW5jdGlvbiAodW5pY29kZSkge1xuICAgICAgICB2YXIgbWkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5taSgpO1xuICAgICAgICB2YXIgZW50aXR5ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuZW50aXR5KCk7XG4gICAgICAgIGVudGl0eS5BcHBlbmQodW5pY29kZSk7XG4gICAgICAgIG1pLkFwcGVuZChlbnRpdHkpO1xuICAgICAgICByZXR1cm4gbWk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmNyZWF0ZUFuZE1vdmVJbnRvSG9sZSA9IGZ1bmN0aW9uIChtc3Vic3VwLCBpbmRleCkge1xuICAgICAgICBjb25zb2xlLmxvZygnQ1JFQVRJTkcgSE9MRScpO1xuICAgICAgICB2YXIgaG9sZSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmhvbGUoKTtcbiAgICAgICAgbXN1YnN1cC5TZXREYXRhKGluZGV4LCBob2xlKTtcbiAgICAgICAgdGhpcy5tb3ZlVG8oaG9sZSwgMCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhhbmRsZVN1cGVyT3JTdWJzY3JpcHQgPSBmdW5jdGlvbiAocmVjYWxsLCBjKSB7XG4gICAgICAgIGlmICh0aGlzLnBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZXYgPSB0aGlzLm5vZGUuZGF0YVt0aGlzLnBvc2l0aW9uIC0gMV07XG4gICAgICAgIHZhciBpbmRleCA9IChjID09PSBcIl9cIikgPyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAoKS5zdWIgOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAoKS5zdXA7XG4gICAgICAgIGlmIChwcmV2LnR5cGUgPT09IFwibXN1YnN1cFwiIHx8IHByZXYudHlwZSA9PT0gXCJtdW5kZXJvdmVyXCIpIHtcbiAgICAgICAgICAgIGlmIChwcmV2LmRhdGFbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoaW5nID0gcHJldi5kYXRhW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAodGhpbmcuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpbmcubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcywgRGlyZWN0aW9uLkxFRlQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlVG8ocHJldiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlQW5kTW92ZUludG9Ib2xlKHByZXYsIGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtc3Vic3VwID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKCk7XG4gICAgICAgICAgICBtc3Vic3VwLlNldERhdGEobXN1YnN1cC5iYXNlLCBwcmV2KTtcbiAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24gLSAxLCBtc3Vic3VwKTtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQW5kTW92ZUludG9Ib2xlKG1zdWJzdXAsIGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChyZWNhbGwsIGMpIHtcbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICB2YXIgbGF0ZXggPSBcIlwiO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB0aGlzLm5vZGUuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBtaSA9IHRoaXMubm9kZS5kYXRhW2ldO1xuICAgICAgICAgICAgICAgIGlmIChtaS50eXBlICE9PSAnbWknKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgbm9uLWlkZW50aWZpZXIgaW4gYmFja3NsYXNoIGV4cHJlc3Npb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNoYXJzID0gbWkuZGF0YVswXTtcbiAgICAgICAgICAgICAgICBsYXRleCArPSBjaGFycy5kYXRhWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFBhcnNlci5wYXJzZUNvbnRyb2xTZXF1ZW5jZShcIlxcXFxcIiArIGxhdGV4ICsgXCJ7QX1cIik7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZS5FZGl0YWJsZVNWR2VsZW0uY2xhc3NMaXN0LmFkZCgnaW52YWxpZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBtcm93ID0gdGhpcy5ub2RlO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbXJvdy5wYXJlbnQuZGF0YS5pbmRleE9mKG1yb3cpO1xuICAgICAgICAgICAgdGhpcy5leGl0QmFja3NsYXNoTW9kZShyZXN1bHQpO1xuICAgICAgICAgICAgcmVjYWxsKFt0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5tb3ZlQ3Vyc29yKHRoaXMsICdyJyk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLk5PUk1BTDtcbiAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgY29kZSA9IGV2ZW50LmNoYXJDb2RlIHx8IGV2ZW50LmtleUNvZGUgfHwgZXZlbnQud2hpY2g7XG4gICAgICAgIHZhciBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgdmFyIHRvSW5zZXJ0O1xuICAgICAgICBpZiAoIXRoaXMubm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUucGFyZW50O1xuICAgICAgICAgICAgdmFyIGhvbGVJbmRleCA9IHBhcmVudC5kYXRhLmluZGV4T2YodGhpcy5ub2RlKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coKTtcbiAgICAgICAgICAgIHBhcmVudC5TZXREYXRhKGhvbGVJbmRleCwgcm93KTtcbiAgICAgICAgICAgIHJvdy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdpbnZhbGlkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIGlmIChjID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1vZGUgIT09IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0g7XG4gICAgICAgICAgICAgICAgICAgIHZhciBncmF5Um93ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8oTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoJyN4MDA1QycpKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYXlSb3cuYmFja3NsYXNoUm93ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCBncmF5Um93KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENsYXNzID0gZ3JheVJvdy5jbHMgPyBncmF5Um93LmNscyArICcgJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBncmF5Um93LmNscyA9IG9sZENsYXNzICsgXCJiYWNrc2xhc2gtbW9kZVwiO1xuICAgICAgICAgICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhncmF5Um93LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RPRE86IGluc2VydCBhIFxcXFwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSBcIl5cIiB8fCBjID09PSBcIl9cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1cGVyT3JTdWJzY3JpcHQocmVjYWxsLCBjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiIFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3BhY2UocmVjYWxsLCBjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5sZXR0ZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWkobmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMubnVtYmVyLnRlc3QoYykpIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1uKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmNoYXJzKGMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLnJlbWFwW2NdKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoJyN4JyArIE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLnJlbWFwW2NdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjID09PSAnKycgfHwgYyA9PT0gJy8nIHx8IGMgPT09ICc9JyB8fCBjID09PSAnLicgfHwgYyA9PT0gJygnIHx8IGMgPT09ICcpJykge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW8obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghdG9JbnNlcnQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMubm9kZS5kYXRhLnNwbGljZSh0aGlzLnBvc2l0aW9uLCAwLCBudWxsKTtcbiAgICAgICAgdGhpcy5ub2RlLlNldERhdGEodGhpcy5wb3NpdGlvbiwgdG9JbnNlcnQpO1xuICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoRGlyZWN0aW9uLlJJR0hUKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgIH1dKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY2xlYXJCb3hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuYm94ZXMpIHtcbiAgICAgICAgICAgIHRoaXMuYm94ZXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJveGVzID0gW107XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhpZ2hsaWdodEJveGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgY3VyID0gdGhpcy5ub2RlO1xuICAgICAgICB0aGlzLmNsZWFyQm94ZXMoKTtcbiAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgaWYgKGN1ci5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHZhciBiYiA9IGN1ci5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuYm94ZXMgPSB0aGlzLmJveGVzLmNvbmNhdChVdGlsLmhpZ2hsaWdodEJveChzdmcsIGJiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1cnNvci0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZpbmRIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmRyYXdBdCA9IGZ1bmN0aW9uIChzdmdlbGVtLCB4LCB5LCBoZWlnaHQsIHNraXBTY3JvbGwpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlZFBvc2l0aW9uID0geyB4OiB4LCB5OiB5LCBoZWlnaHQ6IGhlaWdodCB9O1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAnIzc3Nzc3NycpO1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICdtYXRoLWN1cnNvcicpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb2xkY2xhc3MgPSBjZWxlbS5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgb2xkY2xhc3Muc3BsaXQoJ2JsaW5rJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHRoaXMud2lkdGgudG9TdHJpbmcoKSk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuc3RhcnRCbGluayk7XG4gICAgICAgIHRoaXMuc3RhcnRCbGluayA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdjbGFzcycsIGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSArICcgYmxpbmsnKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCA1MDApO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodEJveGVzKHN2Z2VsZW0pO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvbkVuZC5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUuZHJhd0N1cnNvckhpZ2hsaWdodCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgamF4ID0gTWF0aEpheC5IdWIuZ2V0QWxsSmF4KCcjJyArIHN2Z2VsZW0ucGFyZW50Tm9kZS5pZClbMF07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2aXN1YWxpemVKYXgoamF4LCAnI21tbHZpeicsIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB2aXN1YWxpemUgamF4JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNraXBTY3JvbGwpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbEludG9WaWV3KHN2Z2VsZW0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSBudWxsO1xuICAgICAgICB0aGlzLmhpZGVIaWdobGlnaHQoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlkZUhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmIChjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0hpZ2hsaWdodEF0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGNlbGVtID0gdGhpcy5maW5kSGlnaGxpZ2h0KCk7XG4gICAgICAgIGlmICghY2VsZW0pIHtcbiAgICAgICAgICAgIGNlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAncmdiYSgxNzMsIDIxNiwgMjUwLCAwLjUpJyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgY2VsZW0uaWQgPSAnY3Vyc29yLWhpZ2hsaWdodC0nICsgdGhpcy5pZDtcbiAgICAgICAgICAgIHN2Z2VsZW0uYXBwZW5kQ2hpbGQoY2VsZW0pO1xuICAgICAgICB9XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneCcsIHgpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3knLCB5KTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHcpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uIChzdmdlbGVtKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW5kZXJlZFBvc2l0aW9uKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgeCA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi54O1xuICAgICAgICB2YXIgeSA9IHRoaXMucmVuZGVyZWRQb3NpdGlvbi55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLmhlaWdodDtcbiAgICAgICAgdmFyIGNsaWVudFBvaW50ID0gVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMoc3ZnZWxlbSwgeCwgeSArIGhlaWdodCAvIDIpO1xuICAgICAgICB2YXIgY2xpZW50V2lkdGggPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuICAgICAgICB2YXIgY2xpZW50SGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG4gICAgICAgIHZhciBzeCA9IDAsIHN5ID0gMDtcbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnggPCAwIHx8IGNsaWVudFBvaW50LnggPiBjbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc3ggPSBjbGllbnRQb2ludC54IC0gY2xpZW50V2lkdGggLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbGllbnRQb2ludC55IDwgMCB8fCBjbGllbnRQb2ludC55ID4gY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICBzeSA9IGNsaWVudFBvaW50LnkgLSBjbGllbnRIZWlnaHQgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeCB8fCBzeSkge1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbEJ5KHN4LCBzeSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5maW5kRWxlbWVudCgpO1xuICAgICAgICBpZiAoY3Vyc29yKVxuICAgICAgICAgICAgY3Vyc29yLnJlbW92ZSgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5ibHVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzRmlyc3RIb2xlID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKCFyb290KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocm9vdC50eXBlID09PSBcImhvbGVcIikge1xuICAgICAgICAgICAgdGhpcy5ub2RlID0gcm9vdDtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXNGaXJzdEhvbGUocm9vdC5kYXRhW2ldKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBDdXJzb3IuQ3Vyc29yTW9kZSA9IHtcbiAgICAgICAgQkFDS1NMQVNIOiBcImJhY2tzbGFzaFwiLFxuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXG4gICAgICAgIFNFTEVDVElPTjogXCJzZWxlY3Rpb25cIlxuICAgIH07XG4gICAgcmV0dXJuIEN1cnNvcjtcbn0pKCk7XG52YXIgRWRpdGFibGVTVkdDb25maWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHQ29uZmlnKCkge1xuICAgIH1cbiAgICBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMgPSB7XG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHXCI6IHtcbiAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiBcIjEwMCVcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwidGV4dC1hbGlnblwiOiBcImxlZnRcIixcbiAgICAgICAgICAgIFwidGV4dC10cmFuc2Zvcm1cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtc3BhY2luZ1wiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3b3JkLXdyYXBcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgIFwiZmxvYXRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcImRpcmVjdGlvblwiOiBcImx0clwiLFxuICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICBcInRleHQtaW5kZW50XCI6IDAsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcIjEwMCVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgIHRyYW5zaXRpb246IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItd2Via2l0LXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1zLXRyYW5zaXRpb25cIjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi1vLXRyYW5zaXRpb25cIjogXCJub25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIubWp4LXN2Zy1ocmVmXCI6IHtcbiAgICAgICAgICAgIGZpbGw6IFwiYmx1ZVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI6IHtcbiAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmUhaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiNjBleFwiLFxuICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiI01hdGhKYXhfU1ZHX1Rvb2x0aXBcIjoge1xuICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICBoZWlnaHQ6IFwiYXV0b1wiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJub25lXCJcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHQ29uZmlnO1xufSkoKTtcbnZhciBFZGl0YWJsZVNWRyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkcoKSB7XG4gICAgICAgIHRoaXMuVE9VQ0ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuaGlkZVByb2Nlc3NlZE1hdGggPSB0cnVlO1xuICAgICAgICB0aGlzLmZvbnROYW1lcyA9IFtcIlRlWFwiLCBcIlNUSVhcIiwgXCJTVElYLVdlYlwiLCBcIkFzYW5hLU1hdGhcIixcbiAgICAgICAgICAgIFwiR3lyZS1UZXJtZXNcIiwgXCJHeXJlLVBhZ2VsbGFcIiwgXCJMYXRpbi1Nb2Rlcm5cIiwgXCJOZW8tRXVsZXJcIl07XG4gICAgICAgIHRoaXMuVGV4dE5vZGUgPSBNYXRoSmF4LkhUTUwuVGV4dE5vZGU7XG4gICAgICAgIHRoaXMuYWRkVGV4dCA9IE1hdGhKYXguSFRNTC5hZGRUZXh0O1xuICAgICAgICB0aGlzLnVjTWF0Y2ggPSBNYXRoSmF4LkhUTUwudWNNYXRjaDtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJtbWwgSmF4IFJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICAgICAgTU1MLmhvbGUgPSBNTUwubWJhc2UuU3ViY2xhc3Moe30pO1xuICAgICAgICAgICAgTU1MLmhvbGUuQXVnbWVudChIb2xlLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1iYXNlLkF1Z21lbnQoTUJhc2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5jaGFycy5BdWdtZW50KENoYXJzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuZW50aXR5LkF1Z21lbnQoRW50aXR5TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubW8uQXVnbWVudChNb01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10ZXh0LkF1Z21lbnQoTVRleHRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZXJyb3IuQXVnbWVudChNRXJyb3JNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcy5BdWdtZW50KE1zTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWdseXBoLkF1Z21lbnQoTUdseXBoTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXNwYWNlLkF1Z21lbnQoTVNwYWNlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBoYW50b20uQXVnbWVudChNUGhhbnRvbU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1wYWRkZWQuQXVnbWVudChNUGFkZGVkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXJvdy5BdWdtZW50KE1Sb3dNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3R5bGUuQXVnbWVudChNU3R5bGVNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZnJhYy5BdWdtZW50KE1GcmFjTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXNxcnQuQXVnbWVudChNU3FydE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1yb290LkF1Z21lbnQoTVJvb3RNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZmVuY2VkLkF1Z21lbnQoTUZlbmNlZE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1lbmNsb3NlLkF1Z21lbnQoTUVuY2xvc2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tYWN0aW9uLkF1Z21lbnQoTUFjdGlvbk1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLnNlbWFudGljcy5BdWdtZW50KFNlbWFudGljc01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm11bmRlcm92ZXIuQXVnbWVudChNVW5kZXJPdmVyTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXN1YnN1cC5BdWdtZW50KE1TdWJTdXBNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tbXVsdGlzY3JpcHRzLkF1Z21lbnQoTU11bHRpU2NyaXB0c01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm10YWJsZS5BdWdtZW50KE1UYWJsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hdGguQXVnbWVudChNYXRoTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuVGVYQXRvbS5BdWdtZW50KFRlWEF0b21NaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTFtcImFubm90YXRpb24teG1sXCJdLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgIHRvU1ZHOiBNTUwubWJhc2UuU1ZHYXV0b2xvYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJvbkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeWluZyBlZGl0YWJsZXN2ZzogJywgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChNYXRoSmF4LkNhbGxiYWNrKFtcImxvYWRDb21wbGV0ZVwiLCBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRywgXCJqYXguanNcIl0pLCAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLkJyb3dzZXIuU2VsZWN0KHtcbiAgICAgICAgICAgIE9wZXJhOiBmdW5jdGlvbiAoYnJvd3Nlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkcuQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIG9wZXJhWm9vbVJlZnJlc2g6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIE1hdGhKYXguSHViLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwiRW5kIENvb2tpZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56b29tICE9PSBcIk5vbmVcIikge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguQWpheC5SZXF1aXJlKFwiW01hdGhKYXhdL2V4dGVuc2lvbnMvTWF0aFpvb20uanNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgdmFyIGRvYyA9IGRvY3VtZW50O1xuICAgICAgICAgICAgaWYgKCFkb2MubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2MubmFtZXNwYWNlcy5hZGQoXCJzdmdcIiwgVXRpbC5TVkdOUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncywgY29uZmlnID0gdGhpcy5jb25maWcsIGZvbnQgPSBzZXR0aW5ncy5mb250O1xuICAgICAgICBpZiAoc2V0dGluZ3Muc2NhbGUpIHtcbiAgICAgICAgICAgIGNvbmZpZy5zY2FsZSA9IHNldHRpbmdzLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgIT09IFwiQXV0b1wiKSB7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oTG9jYWx8V2VifEltYWdlKSQvaSwgXCJcIik7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS8sIFwiJDEtJDJcIik7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGZvbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGNvbmZpZy5mb250IHx8IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9udE5hbWVzLmluZGV4T2YodGhpcy5mb250SW5Vc2UpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBcIlRlWFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9udERpciArPSBcIi9cIiArIHRoaXMuZm9udEluVXNlO1xuICAgICAgICBpZiAoIXRoaXMucmVxdWlyZSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1aXJlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2godGhpcy5mb250RGlyICsgXCIvZm9udGRhdGEuanNcIik7XG4gICAgICAgIHRoaXMucmVxdWlyZS5wdXNoKE1hdGhKYXguT3V0cHV0SmF4LmV4dGVuc2lvbkRpciArIFwiL01hdGhFdmVudHMuanNcIik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuU3RhcnR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIEVWRU5UID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudDtcbiAgICAgICAgdGhpcy5UT1VDSCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuVG91Y2g7XG4gICAgICAgIHZhciBIT1ZFUiA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuSG92ZXI7XG4gICAgICAgIHRoaXMuQ29udGV4dE1lbnUgPSBFVkVOVC5Db250ZXh0TWVudTtcbiAgICAgICAgdGhpcy5Nb3VzZW92ZXIgPSBIT1ZFUi5Nb3VzZW92ZXI7XG4gICAgICAgIHRoaXMuTW91c2VvdXQgPSBIT1ZFUi5Nb3VzZW91dDtcbiAgICAgICAgdGhpcy5Nb3VzZW1vdmUgPSBIT1ZFUi5Nb3VzZW1vdmU7XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogXCIxcHhcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwLFxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJsZWZ0XCIsXG4gICAgICAgICAgICAgICAgdGV4dEluZGVudDogMCxcbiAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0OiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIGxldHRlclNwYWNpbmc6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgd29yZFNwYWNpbmc6IFwibm9ybWFsXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuaGlkZGVuRGl2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuaW5zZXJ0QmVmb3JlKHRoaXMuaGlkZGVuRGl2LCBkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIGlkOiBcIk1hdGhKYXhfU1ZHX0hpZGRlblwiXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGl2ID0gTWF0aEpheC5IVE1MLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYsIFwiZGl2XCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiNWluXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFV0aWwucHhQZXJJbmNoID0gZGl2Lm9mZnNldFdpZHRoIC8gNTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICAgICAgdGhpcy50ZXh0U1ZHID0gVXRpbC5FbGVtZW50KFwic3ZnXCIsIG51bGwpO1xuICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLmFkZEVsZW1lbnQoVXRpbC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LnBhcmVudE5vZGUsIFwic3ZnXCIpLCBcImRlZnNcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfZ2x5cGhzXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuRXhTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZS1hZGp1c3RcIjogXCJub25lXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgW1xuICAgICAgICAgICAgW1wic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19FeEJveFwiXG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHRoaXMubGluZWJyZWFrU3BhbiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCBudWxsLCBbXG4gICAgICAgICAgICBbXCJoclwiLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjogMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgXSk7XG4gICAgICAgIHZhciBzdHlsZXMgPSB0aGlzLmNvbmZpZy5zdHlsZXM7XG4gICAgICAgIGZvciAodmFyIHMgaW4gRWRpdGFibGVTVkdDb25maWcuc3R5bGVzKSB7XG4gICAgICAgICAgICBzdHlsZXNbc10gPSBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXNbc107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguQWpheC5TdHlsZXMoc3R5bGVzLCBbXCJJbml0aWFsaXplU1ZHXCIsIHRoaXNdKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Jbml0aWFsaXplU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICB0aGlzLmRlZmF1bHRFeCA9IHRoaXMuRXhTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZGVmYXVsdFdpZHRoID0gdGhpcy5saW5lYnJlYWtTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5saW5lYnJlYWtTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLkV4U3Bhbik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucHJlVHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdO1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgdmFyIG0gPSBzY3JpcHRzLmxlbmd0aDtcbiAgICAgICAgdmFyIHNjcmlwdDtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIHZhciBzcGFuO1xuICAgICAgICB2YXIgZGl2O1xuICAgICAgICB2YXIgdGVzdDtcbiAgICAgICAgdmFyIGpheDtcbiAgICAgICAgdmFyIGV4O1xuICAgICAgICB2YXIgZW07XG4gICAgICAgIHZhciBtYXh3aWR0aDtcbiAgICAgICAgdmFyIHJlbHdpZHRoID0gZmFsc2U7XG4gICAgICAgIHZhciBjd2lkdGg7XG4gICAgICAgIHZhciBsaW5lYnJlYWsgPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYztcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb25maWcubGluZWJyZWFrcy53aWR0aDtcbiAgICAgICAgaWYgKGxpbmVicmVhaykge1xuICAgICAgICAgICAgcmVsd2lkdGggPSAod2lkdGgubWF0Y2goL15cXHMqKFxcZCsoXFwuXFxkKik/JVxccyopP2NvbnRhaW5lclxccyokLykgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoL1xccypjb250YWluZXJcXHMqLywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdpZHRoID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgd2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1heHdpZHRoID0gMTAwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcHJldiA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBpZiAocHJldiAmJiBTdHJpbmcocHJldi5jbGFzc05hbWUpLm1hdGNoKC9eTWF0aEpheChfU1ZHKT8oX0Rpc3BsYXkpPyggTWF0aEpheChfU1ZHKT9fUHJvY2Vzc2luZyk/JC8pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHID0ge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IChqYXgucm9vdC5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc3BhbiA9IGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXNpemVcIjogdGhpcy5jb25maWcuc2NhbGUgKyBcIiVcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJpbmxpbmUtYmxvY2tcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHXCIsXG4gICAgICAgICAgICAgICAgaWQ6IGpheC5pbnB1dElEICsgXCItRnJhbWVcIixcbiAgICAgICAgICAgICAgICBpc01hdGhKYXg6IHRydWUsXG4gICAgICAgICAgICAgICAgamF4SUQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgb25jb250ZXh0bWVudTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5NZW51LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vkb3duOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlZG93bixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3ZlcjogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW92ZXIsXG4gICAgICAgICAgICAgICAgb25tb3VzZW91dDogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW91dCxcbiAgICAgICAgICAgICAgICBvbm1vdXNlbW92ZTogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5Nb3VzZW1vdmUsXG4gICAgICAgICAgICAgICAgb25jbGljazogTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5DbGljayxcbiAgICAgICAgICAgICAgICBvbmRibGNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkRibENsaWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChNYXRoSmF4Lkh1Yi5Ccm93c2VyLm5vQ29udGV4dE1lbnUpIHtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hzdGFydCA9IHRoaXMuVE9VQ0guc3RhcnQ7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoZW5kID0gdGhpcy5UT1VDSC5lbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR19EaXNwbGF5XCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXYuY2xhc3NOYW1lICs9IFwiIE1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpLCBzY3JpcHQpO1xuICAgICAgICAgICAgZGl2LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGluZWJyZWFrU3Bhbi5jbG9uZU5vZGUodHJ1ZSksIGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGRpdiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgZXggPSB0ZXN0LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgICAgICBjd2lkdGggPSBkaXYucHJldmlvdXNTaWJsaW5nLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleCA9PT0gMCB8fCBleCA9PT0gXCJOYU5cIikge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZGVuRGl2LmFwcGVuZENoaWxkKGRpdik7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBleCA9IHRoaXMuZGVmYXVsdEV4O1xuICAgICAgICAgICAgICAgIGN3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBVdGlsLmV4ID0gZXg7XG4gICAgICAgICAgICBVdGlsLmVtID0gZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgICAgIFV0aWwuY3dpZHRoID0gY3dpZHRoIC8gZW0gKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5saW5lV2lkdGggPSAobGluZWJyZWFrID8gVXRpbC5sZW5ndGgyZW0od2lkdGgsIDEsIG1heHdpZHRoIC8gZW0gKiAxMDAwKSA6IFV0aWwuQklHRElNRU4pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdHNbaV0ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgc3BhbiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0c1tpXS5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICghamF4LkVkaXRhYmxlU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICAgICAgdGVzdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2VxbiA9IHN0YXRlLlNWR2xhc3QgPSAwO1xuICAgICAgICBzdGF0ZS5TVkdpID0gLTE7XG4gICAgICAgIHN0YXRlLlNWR2NodW5rID0gdGhpcy5jb25maWcuRXFuQ2h1bms7XG4gICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuVHJhbnNsYXRlID0gZnVuY3Rpb24gKHNjcmlwdCwgc3RhdGUpIHtcbiAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHN0YXRlLlNWR2RlbGF5KSB7XG4gICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQ2FsbGJhY2suRGVsYXkodGhpcy5jb25maWcuRXFuQ2h1bmtEZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICB2YXIgbWF0aCA9IGpheC5yb290O1xuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGpheC5pbnB1dElEICsgXCItRnJhbWVcIik7XG4gICAgICAgIHZhciBkaXYgPSAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkgPyAoc3BhbiB8fCB7IHBhcmVudE5vZGU6IHVuZGVmaW5lZCB9KS5wYXJlbnROb2RlIDogc3Bhbik7XG4gICAgICAgIHZhciBsb2NhbENhY2hlID0gKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSAmJiAhdGhpcy5jb25maWcudXNlR2xvYmFsQ2FjaGUpO1xuICAgICAgICBpZiAoIWRpdilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5lbSA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmVtID0gamF4LkVkaXRhYmxlU1ZHLmVtO1xuICAgICAgICB0aGlzLmV4ID0gamF4LkVkaXRhYmxlU1ZHLmV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguRWRpdGFibGVTVkcuY3dpZHRoO1xuICAgICAgICB0aGlzLm1hdGhEaXYgPSBkaXY7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgaWYgKGxvY2FsQ2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXRHbHlwaHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRTVkcobWF0aCwgc3Bhbik7XG4gICAgICAgIG1hdGguc2V0VGVYY2xhc3MoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGgudG9TVkcoc3BhbiwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3Bhbi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQoc3Bhbi5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubi0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5BZGRJbnB1dEhhbmRsZXJzKG1hdGgsIHNwYW4sIGRpdik7XG4gICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGl2LmNsYXNzTmFtZSA9IGRpdi5jbGFzc05hbWUuc3BsaXQoLyAvKVswXTtcbiAgICAgICAgaWYgKHRoaXMuaGlkZVByb2Nlc3NlZE1hdGgpIHtcbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI7XG4gICAgICAgICAgICBpZiAoc2NyaXB0Lk1hdGhKYXgucHJldmlldykge1xuICAgICAgICAgICAgICAgIGpheC5FZGl0YWJsZVNWRy5wcmV2aWV3ID0gc2NyaXB0Lk1hdGhKYXgucHJldmlldztcbiAgICAgICAgICAgICAgICBkZWxldGUgc2NyaXB0Lk1hdGhKYXgucHJldmlldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLlNWR2VxbiArPSAoc3RhdGUuaSAtIHN0YXRlLlNWR2kpO1xuICAgICAgICAgICAgc3RhdGUuU1ZHaSA9IHN0YXRlLmk7XG4gICAgICAgICAgICBpZiAoc3RhdGUuU1ZHZXFuID49IHN0YXRlLlNWR2xhc3QgKyBzdGF0ZS5TVkdjaHVuaykge1xuICAgICAgICAgICAgICAgIHRoaXMucG9zdFRyYW5zbGF0ZShzdGF0ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSBNYXRoLmZsb29yKHN0YXRlLlNWR2NodW5rICogdGhpcy5jb25maWcuRXFuQ2h1bmtGYWN0b3IpO1xuICAgICAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnBvc3RUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUsIHBhcnRpYWwpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIGlmICghdGhpcy5oaWRlUHJvY2Vzc2VkTWF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXRlLlNWR2xhc3QsIG0gPSBzdGF0ZS5TVkdlcW47IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKHNjcmlwdCAmJiBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4KSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnByZXZpb3VzU2libGluZy5jbGFzc05hbWUgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJldmlldy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQuTWF0aEpheC5wcmV2aWV3ID0gZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5TVkdsYXN0ID0gc3RhdGUuU1ZHZXFuO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnJlc2V0R2x5cGhzID0gZnVuY3Rpb24gKHJlc2V0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSRVNFVFRJTkcgR0xZUEhTJyk7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VGb250Q2FjaGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWF0aEpheF9TVkdfZ2x5cGhzXCIpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gVXRpbC5FbGVtZW50KFwiZGVmc1wiLCBudWxsKTtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILm4rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEJCT1hfR0xZUEguZ2x5cGhzID0ge307XG4gICAgICAgICAgICBpZiAocmVzZXQpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILm4gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheCA9IGZ1bmN0aW9uIChyb290KSB7XG4gICAgICAgIGlmIChyb290LnR5cGUgPT09ICd0ZXhhdG9tJykge1xuICAgICAgICAgICAgaWYgKHJvb3QuZGF0YS5sZW5ndGggIT09IDEpXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ1VuZXhwZWN0ZWQgbGVuZ3RoIGluIHRleGF0b20nKTtcbiAgICAgICAgICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4KHJvb3QuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocm9vdC50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LmlzQ3Vyc29yYWJsZSgpIHx8IHJvb3QudHlwZSA9PT0gJ21hdGgnKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3QuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjdXIgPSByb290LmRhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFjdXIpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gY3VyLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVbMF0gIT09ICdtJyB8fCB0eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgoY3VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3cgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tcm93KCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5BcHBlbmQoRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgoY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QuU2V0RGF0YShpLCByb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm9vdDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5BZGRJbnB1dEhhbmRsZXJzID0gZnVuY3Rpb24gKG1hdGgsIHNwYW4sIGRpdikge1xuICAgICAgICBtYXRoLmN1cnNvciA9IG5ldyBDdXJzb3IoKTtcbiAgICAgICAgbWF0aC5yZXJlbmRlciA9IHJlcmVuZGVyO1xuICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuICAgICAgICBmdW5jdGlvbiByZXJlbmRlcihjYWxsYmFjaykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChtYXRoKS50b1NWRyhzcGFuLCBkaXYsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hdGguY3Vyc29yLnJlZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0aEpheC5DYWxsYmFjay5BZnRlcihbcmVyZW5kZXIsIGNhbGxiYWNrXSwgZXJyLnJlc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE1hdGhKYXguQ2FsbGJhY2soY2FsbGJhY2spKCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlcihlKSB7XG4gICAgICAgICAgICBpZiAobWF0aC5jdXJzb3IuY29uc3RydWN0b3IucHJvdG90eXBlW2UudHlwZV0pXG4gICAgICAgICAgICAgICAgbWF0aC5jdXJzb3IuY29uc3RydWN0b3IucHJvdG90eXBlW2UudHlwZV0uY2FsbChtYXRoLmN1cnNvciwgZSwgcmVyZW5kZXIpO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgaGFuZGxlcik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJTcGFuID0gZnVuY3Rpb24gKGpheCwgbWF0aCkge1xuICAgICAgICBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICByZXR1cm4gbWF0aC5maXJzdENoaWxkO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyQkJveCA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgpIHtcbiAgICAgICAgdmFyIGJib3ggPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3Bhbi5wYXJlbnROb2RlKTtcbiAgICAgICAgYmJveC5oICs9IDI7XG4gICAgICAgIGJib3guZCAtPSAyO1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5ab29tID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCwgTXcsIE1oKSB7XG4gICAgICAgIHNwYW4uY2xhc3NOYW1lID0gXCJNYXRoSmF4X1NWR1wiO1xuICAgICAgICB2YXIgZW1leCA9IHNwYW4uYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgdmFyIGV4ID0gZW1leC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgdGhpcy5leCA9IGV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LkVkaXRhYmxlU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguRWRpdGFibGVTVkcuY3dpZHRoO1xuICAgICAgICBlbWV4LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZW1leCk7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5tYXRoRElWID0gc3BhbjtcbiAgICAgICAgdmFyIHR3ID0gamF4LnJvb3QuZGF0YVswXS5FZGl0YWJsZVNWR2RhdGEudHc7XG4gICAgICAgIGlmICh0dyAmJiB0dyA8IHRoaXMuY3dpZHRoKVxuICAgICAgICAgICAgdGhpcy5jd2lkdGggPSB0dztcbiAgICAgICAgdGhpcy5pZFBvc3RmaXggPSBcIi16b29tXCI7XG4gICAgICAgIGpheC5yb290LnRvU1ZHKHNwYW4sIHNwYW4pO1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiXCI7XG4gICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdmFyIHN2ZyA9IHNwYW4uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdmdcIilbMF0uc3R5bGU7XG4gICAgICAgIHN2Zy5tYXJnaW5Ub3AgPSBzdmcubWFyZ2luUmlnaHQgPSBzdmcubWFyZ2luTGVmdCA9IDA7XG4gICAgICAgIGlmIChzdmcubWFyZ2luQm90dG9tLmNoYXJBdCgwKSA9PT0gXCItXCIpXG4gICAgICAgICAgICBzcGFuLnN0eWxlLm1hcmdpbkJvdHRvbSA9IHN2Zy5tYXJnaW5Cb3R0b20uc3Vic3RyKDEpO1xuICAgICAgICBpZiAodGhpcy5vcGVyYVpvb21SZWZyZXNoKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzcGFuLmZpcnN0Q2hpbGQuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgdHJhbnNwYXJlbnRcIjtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGFuLm9mZnNldFdpZHRoIDwgc3Bhbi5maXJzdENoaWxkLm9mZnNldFdpZHRoKSB7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLm1pbldpZHRoID0gc3Bhbi5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgbWF0aC5zdHlsZS5taW5XaWR0aCA9IG1hdGguZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgfVxuICAgICAgICBzcGFuLnN0eWxlLnBvc2l0aW9uID0gbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgdmFyIHpXID0gc3Bhbi5vZmZzZXRXaWR0aCwgekggPSBzcGFuLm9mZnNldEhlaWdodCwgbUggPSBtYXRoLm9mZnNldEhlaWdodCwgbVcgPSBtYXRoLm9mZnNldFdpZHRoO1xuICAgICAgICBzcGFuLnN0eWxlLnBvc2l0aW9uID0gbWF0aC5zdHlsZS5wb3NpdGlvbiA9IFwiXCI7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBZOiAtTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudC5nZXRCQm94KHNwYW4pLmgsXG4gICAgICAgICAgICBtVzogbVcsXG4gICAgICAgICAgICBtSDogbUgsXG4gICAgICAgICAgICB6VzogelcsXG4gICAgICAgICAgICB6SDogekhcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5pbml0U1ZHID0gZnVuY3Rpb24gKG1hdGgsIHNwYW4pIHsgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuUmVtb3ZlID0gZnVuY3Rpb24gKGpheCkge1xuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGpheC5pbnB1dElEICsgXCItRnJhbWVcIik7XG4gICAgICAgIGlmIChzcGFuKSB7XG4gICAgICAgICAgICBpZiAoamF4LkVkaXRhYmxlU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBqYXguRWRpdGFibGVTVkc7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJWID0gZnVuY3Rpb24gKHN2ZywgSCwgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciB0b3AgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS50b3AgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBib3QgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS5ib3QgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBoID0gdG9wLmggKyB0b3AuZCArIGJvdC5oICsgYm90LmQ7XG4gICAgICAgIHZhciB5ID0gLXRvcC5oO1xuICAgICAgICBzdmcuQWRkKHRvcCwgMCwgeSk7XG4gICAgICAgIHkgLT0gdG9wLmQ7XG4gICAgICAgIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHZhciBtaWQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLm1pZCwgZm9udCk7XG4gICAgICAgICAgICBoICs9IG1pZC5oICsgbWlkLmQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBIIDwgaCAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgSCA9IGggKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEggPiBoKSB7XG4gICAgICAgICAgICB2YXIgZXh0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5leHQsIGZvbnQpO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCBlSCA9IChIIC0gaCkgLyBrLCBzID0gKGVIICsgMTAwKSAvIChleHQuaCArIGV4dC5kKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArIGV4dC55ICsgXCIsXCIgKyAoeSAtIHMgKiBleHQuaCArIDUwICsgZXh0LnkpICsgXCIpIHNjYWxlKDEsXCIgKyBzICsgXCIpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGV4dC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHkgLT0gZUg7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCAwLCB5IC0gbWlkLmgpO1xuICAgICAgICAgICAgICAgICAgICB5IC09IChtaWQuaCArIG1pZC5kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB5ICs9IChoIC0gSCkgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICB5ICs9IC0obWlkLmggKyBtaWQuZCkgKyAoaCAtIEgpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJvdCwgMCwgeSAtIGJvdC5oKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuZXh0ZW5kRGVsaW1pdGVySCA9IGZ1bmN0aW9uIChzdmcsIFcsIGRlbGltLCBzY2FsZSwgZm9udCkge1xuICAgICAgICB2YXIgbGVmdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmxlZnQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHZhciByaWdodCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnJpZ2h0IHx8IGRlbGltLnJlcCksIGZvbnQpO1xuICAgICAgICBzdmcuQWRkKGxlZnQsIC1sZWZ0LmwsIDApO1xuICAgICAgICB2YXIgdyA9IChsZWZ0LnIgLSBsZWZ0LmwpICsgKHJpZ2h0LnIgLSByaWdodC5sKSwgeCA9IGxlZnQuciAtIGxlZnQubDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIHcgKz0gbWlkLnc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBXIDwgdyAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgVyA9IHcgKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFcgPiB3KSB7XG4gICAgICAgICAgICB2YXIgcmVwID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5yZXAsIGZvbnQpLCBmdXp6ID0gZGVsaW0uZnV6eiB8fCAwO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCByVyA9IChXIC0gdykgLyBrLCBzID0gKHJXICsgZnV6eikgLyAocmVwLnIgLSByZXAubCk7XG4gICAgICAgICAgICB3aGlsZSAoay0tID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBnID0gVXRpbC5FbGVtZW50KFwiZ1wiLCB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogXCJ0cmFuc2xhdGUoXCIgKyAoeCAtIGZ1enogLyAyIC0gcyAqIHJlcC5sICsgcmVwLngpICsgXCIsXCIgKyByZXAueSArIFwiKSBzY2FsZShcIiArIHMgKyBcIiwxKVwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChyZXAuZWxlbWVudC5jbG9uZU5vZGUoZmFsc2UpKTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5hcHBlbmRDaGlsZChnKTtcbiAgICAgICAgICAgICAgICB4ICs9IHJXO1xuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5taWQgJiYgaykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKG1pZCwgeCwgMCk7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gbWlkLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpIC8gMjtcbiAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgIHggKz0gbWlkLncgLSAodyAtIFcpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHggLT0gKHcgLSBXKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKHJpZ2h0LCB4IC0gcmlnaHQubCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgc3ZnLmlzTXVsdGlDaGFyID0gdHJ1ZTtcbiAgICB9O1xuICAgIHJldHVybiBFZGl0YWJsZVNWRztcbn0pKCk7XG52YXIgbG9hZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGNvbnNvbGUubG9nKCdMT0FESU5HJyk7XG4gICAgRWRpdGFibGVTVkcuYXBwbHkoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIGZvciAodmFyIGlkIGluIEVkaXRhYmxlU1ZHLnByb3RvdHlwZSkge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkcucHJvdG90eXBlW2lkXS5iaW5kKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcpIHtcbiAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkdbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbaWRdID0gRWRpdGFibGVTVkdbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbn07XG5TVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgPSBTVkdFbGVtZW50LnByb3RvdHlwZS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQgfHwgZnVuY3Rpb24gKGVsZW0pIHtcbiAgICByZXR1cm4gZWxlbS5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkubXVsdGlwbHkodGhpcy5nZXRTY3JlZW5DVE0oKSk7XG59O1xuc2V0VGltZW91dChsb2FkLCAxMDAwKTtcbnZhciBQYXJzZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFBhcnNlcigpIHtcbiAgICB9XG4gICAgUGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlID0gZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MoY3MpO1xuICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgdmFyIG1hdGhqYXhQYXJzZXIgPSBNYXRoSmF4LklucHV0SmF4LlRlWC5QYXJzZShjcyk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuUGFyc2UoKTtcbiAgICAgICAgcmV0dXJuIG1hdGhqYXhQYXJzZXIuc3RhY2suZGF0YVswXS5kYXRhWzBdO1xuICAgIH07XG4gICAgUGFyc2VyLmNoZWNrU3BlY2lhbENTID0gZnVuY3Rpb24gKGNzKSB7XG4gICAgICAgIHZhciBtYWNyb3MgPSBNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5tYWNyb3M7XG4gICAgICAgIHZhciBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICBpZiAoY3MgPT09ICdmcmFjJykge1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBuZXcgTU1MLmhvbGUoKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgTU1MLm1mcmFjKGhvbGUsIG5ldyBNTUwuaG9sZSgpKTtcbiAgICAgICAgICAgIHJlc3VsdC5tb3ZlQ3Vyc29yQWZ0ZXIgPSBbaG9sZSwgMF07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjcyA9PT0gJ3NxcnQnKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IE1NTC5tc3FydCgpO1xuICAgICAgICAgICAgdmFyIGhvbGUgPSBuZXcgTU1MLmhvbGUoKTtcbiAgICAgICAgICAgIHJlc3VsdC5TZXREYXRhKDAsIGhvbGUpO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hY3Jvc1tjc10pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1hY3Jvc1tjc10pO1xuICAgICAgICAgICAgdmFyIG5hbWVkRGlyZWN0bHkgPSBtYWNyb3NbY3NdID09PSAnTmFtZWRPcCcgfHwgbWFjcm9zW2NzXSA9PT0gJ05hbWVkRm4nO1xuICAgICAgICAgICAgdmFyIG5hbWVkQXJyYXkgPSBtYWNyb3NbY3NdWzBdICYmIChtYWNyb3NbY3NdWzBdID09PSAnTmFtZWRGbicgfHwgbWFjcm9zW2NzXVswXSA9PT0gJ05hbWVkT3AnKTtcbiAgICAgICAgICAgIGlmIChuYW1lZERpcmVjdGx5IHx8IG5hbWVkQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWVkQXJyYXkgJiYgbWFjcm9zW2NzXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1hY3Jvc1tjc11bMV0ucmVwbGFjZSgvJnRoaW5zcDsvLCBcIlxcdTIwMDZcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGNzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1NTC5tbyhuZXcgTU1MLmNoYXJzKHZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBQYXJzZXI7XG59KSgpO1xudmFyIEJCT1ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJCT1goZGVmLCB0eXBlKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmICh0eXBlID09PSB2b2lkIDApIHsgdHlwZSA9IFwiZ1wiOyB9XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLkggPSB0aGlzLkQgPSAwO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSAwO1xuICAgICAgICB0aGlzLmwgPSBVdGlsLkJJR0RJTUVOO1xuICAgICAgICB0aGlzLnggPSB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnNjYWxlID0gMTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gVXRpbC5FbGVtZW50KHR5cGUsIGRlZik7XG4gICAgfVxuICAgIEJCT1gucHJvdG90eXBlLldpdGggPSBmdW5jdGlvbiAoZGVmLCBIVUIpIHtcbiAgICAgICAgcmV0dXJuIEhVQi5JbnNlcnQodGhpcywgZGVmKTtcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFkZCA9IGZ1bmN0aW9uIChzdmcsIGR4LCBkeSwgZm9yY2V3LCBpbmZyb250KSB7XG4gICAgICAgIGlmIChkeCkge1xuICAgICAgICAgICAgc3ZnLnggKz0gZHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR5KSB7XG4gICAgICAgICAgICBzdmcueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiBzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBzdmcubiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIG5vZGVOYW1lID0gY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwidXNlXCIgfHwgbm9kZU5hbWUgPT09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHN2Zy5jaGlsZFNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHN2Zy5jaGlsZFgsIHkgPSBzdmcuY2hpbGRZO1xuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcueSArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuaCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuZCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuSCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuRCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcudyAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcuciAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcubCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN2Zy54KSA8IDEgJiYgTWF0aC5hYnMoc3ZnLnkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09PSBcImxpbmVcIiB8fCBub2RlTmFtZSA9PT0gXCJwb2x5Z29uXCIgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPT09IFwicGF0aFwiIHx8IG5vZGVOYW1lID09PSBcImFcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm4gKz0gc3ZnLm47XG4gICAgICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZnJvbnQgJiYgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZnJvbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGFzSW5kZW50ID0gc3ZnLmhhc0luZGVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kIC0gc3ZnLnkgPiB0aGlzLmQpIHtcbiAgICAgICAgICAgIHRoaXMuZCA9IHN2Zy5kIC0gc3ZnLnk7XG4gICAgICAgICAgICBpZiAodGhpcy5kID4gdGhpcy5EKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5EID0gdGhpcy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5oID4gdGhpcy5oKSB7XG4gICAgICAgICAgICB0aGlzLmggPSBzdmcueSArIHN2Zy5oO1xuICAgICAgICAgICAgaWYgKHRoaXMuaCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuSCA9IHRoaXMuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgLSBzdmcueSA+IHRoaXMuRClcbiAgICAgICAgICAgIHRoaXMuRCA9IHN2Zy5EIC0gc3ZnLnk7XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5IID4gdGhpcy5IKVxuICAgICAgICAgICAgdGhpcy5IID0gc3ZnLnkgKyBzdmcuSDtcbiAgICAgICAgaWYgKHN2Zy54ICsgc3ZnLmwgPCB0aGlzLmwpXG4gICAgICAgICAgICB0aGlzLmwgPSBzdmcueCArIHN2Zy5sO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcuciA+IHRoaXMucilcbiAgICAgICAgICAgIHRoaXMuciA9IHN2Zy54ICsgc3ZnLnI7XG4gICAgICAgIGlmIChmb3JjZXcgfHwgc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKSA+IHRoaXMudylcbiAgICAgICAgICAgIHRoaXMudyA9IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCk7XG4gICAgICAgIHRoaXMuY2hpbGRTY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5jaGlsZFggPSBzdmcueDtcbiAgICAgICAgdGhpcy5jaGlsZFkgPSBzdmcueTtcbiAgICAgICAgdGhpcy5uKys7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BbGlnbiA9IGZ1bmN0aW9uIChzdmcsIGFsaWduLCBkeCwgZHksIHNoaWZ0KSB7XG4gICAgICAgIGlmIChzaGlmdCA9PT0gdm9pZCAwKSB7IHNoaWZ0ID0gbnVsbDsgfVxuICAgICAgICBkeCA9ICh7XG4gICAgICAgICAgICBsZWZ0OiBkeCxcbiAgICAgICAgICAgIGNlbnRlcjogKHRoaXMudyAtIHN2Zy53KSAvIDIsXG4gICAgICAgICAgICByaWdodDogdGhpcy53IC0gc3ZnLncgLSBkeFxuICAgICAgICB9KVthbGlnbl0gfHwgMDtcbiAgICAgICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgICAgIHRoaXMuQWRkKHN2ZywgZHggKyAoc2hpZnQgfHwgMCksIGR5KTtcbiAgICAgICAgdGhpcy53ID0gdztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkNsZWFuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oID09PSAtVXRpbC5CSUdESU1FTikge1xuICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gdGhpcy5sID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIEJCT1guZGVmcyA9IG51bGw7XG4gICAgQkJPWC5uID0gMDtcbiAgICByZXR1cm4gQkJPWDtcbn0pKCk7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciBCQk9YX0cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRztcbn0pKEJCT1gpO1xudmFyIEJCT1hfVEVYVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVEVYVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIGRlZikge1xuICAgICAgICBpZiAoIWRlZilcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICBkZWYuc3Ryb2tlID0gXCJub25lXCI7XG4gICAgICAgIGlmIChkZWZbXCJmb250LXN0eWxlXCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtc3R5bGVcIl07XG4gICAgICAgIGlmIChkZWZbXCJmb250LXdlaWdodFwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXdlaWdodFwiXTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInRleHRcIik7XG4gICAgICAgIE1hdGhKYXguSFRNTC5hZGRUZXh0KHRoaXMuZWxlbWVudCwgdGV4dCk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLnRleHRTVkcuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy50ZXh0U1ZHLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHNjYWxlICo9IDEwMDAgLyBVdGlsLmVtO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKSBtYXRyaXgoMSAwIDAgLTEgMCAwKVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IGJib3gud2lkdGggKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gLWJib3gueSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAoYmJveC5oZWlnaHQgKyBiYm94LnkpICogc2NhbGU7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1RFWFQ7XG59KShCQk9YKTtcbnZhciBVdGlsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVdGlsKCkge1xuICAgIH1cbiAgICBVdGlsLkVtID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZW1cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZW1cIjtcbiAgICB9O1xuICAgIFV0aWwuRXggPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBtID0gTWF0aC5yb3VuZChtIC8gdGhpcy5UZVgueF9oZWlnaHQgKiB0aGlzLmV4KSAvIHRoaXMuZXg7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGV4XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImV4XCI7XG4gICAgfTtcbiAgICBVdGlsLlBlcmNlbnQgPSBmdW5jdGlvbiAobSkge1xuICAgICAgICByZXR1cm4gKDEwMCAqIG0pLnRvRml4ZWQoMSkucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCIlXCI7XG4gICAgfTtcbiAgICBVdGlsLkZpeGVkID0gZnVuY3Rpb24gKG0sIG4pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZChuIHx8IDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKTtcbiAgICB9O1xuICAgIFV0aWwuaGFzaENoZWNrID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImdcIikge1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldC5maXJzdENoaWxkLm5vZGVOYW1lICE9PSBcInN2Z1wiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gICAgVXRpbC5FbGVtZW50ID0gZnVuY3Rpb24gKHR5cGUsIGRlZikge1xuICAgICAgICB2YXIgb2JqO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdmc6XCIgKyB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5pc01hdGhKYXggPSB0cnVlO1xuICAgICAgICBpZiAoZGVmKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBkZWYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKGlkLCBkZWZbaWRdLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgVXRpbC5hZGRFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmVudCwgdHlwZSwgZGVmKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQoVXRpbC5FbGVtZW50KHR5cGUsIGRlZikpO1xuICAgIH07XG4gICAgVXRpbC5sZW5ndGgyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSwgc2l6ZSkge1xuICAgICAgICBpZiAobXUgPT09IHZvaWQgMCkgeyBtdSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHNpemUgPT09IHZvaWQgMCkgeyBzaXplID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIChsZW5ndGgpICE9PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiXCIpXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLk5PUk1BTClcbiAgICAgICAgICAgIHJldHVybiAxMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuQklHKVxuICAgICAgICAgICAgcmV0dXJuIDIwMDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5TTUFMTClcbiAgICAgICAgICAgIHJldHVybiA3MTA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiaW5maW5pdHlcIilcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkJJR0RJTUVOO1xuICAgICAgICBpZiAobGVuZ3RoLm1hdGNoKC9tYXRoc3BhY2UkLykpXG4gICAgICAgICAgICByZXR1cm4gMTAwMCAqIHRoaXMuTUFUSFNQQUNFW2xlbmd0aF07XG4gICAgICAgIHZhciB6b29tU2NhbGUgPSBwYXJzZUludChNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLnpzY2FsZSkgLyAxMDA7XG4gICAgICAgIHZhciBlbUZhY3RvciA9ICh6b29tU2NhbGUgfHwgMSkgLyBVdGlsLmVtO1xuICAgICAgICB2YXIgbWF0Y2ggPSBsZW5ndGgubWF0Y2goL15cXHMqKFstK10/KD86XFwuXFxkK3xcXGQrKD86XFwuXFxkKik/KSk/KHB0fGVtfGV4fG11fHB4fHBjfGlufG1tfGNtfCUpPy8pO1xuICAgICAgICB2YXIgbSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0gfHwgXCIxXCIpICogMTAwMCwgdW5pdCA9IG1hdGNoWzJdO1xuICAgICAgICBpZiAoc2l6ZSA9PSBudWxsKVxuICAgICAgICAgICAgc2l6ZSA9IDEwMDA7XG4gICAgICAgIGlmIChtdSA9PSBudWxsKVxuICAgICAgICAgICAgbXUgPSAxO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJlbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIGlmICh1bml0ID09PSBcImV4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMuVGVYLnhfaGVpZ2h0IC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiJVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDAgKiBzaXplIC8gMTAwMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHhcIilcbiAgICAgICAgICAgIHJldHVybiBtICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB0XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwY1wiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiAxLjI7XG4gICAgICAgIGlmICh1bml0ID09PSBcImluXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3I7XG4gICAgICAgIGlmICh1bml0ID09PSBcImNtXCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyLjU0O1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJtbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMjUuNDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibXVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTggKiBtdTtcbiAgICAgICAgcmV0dXJuIG0gKiBzaXplIC8gMTAwMDtcbiAgICB9O1xuICAgIFV0aWwuZ2V0UGFkZGluZyA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgICAgICAgdmFyIHBhZGRpbmcgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBwYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAocGFkZGluZy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFkID0gc3R5bGVzW1wicGFkZGluZ1wiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgIGlmIChwYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1tpZF0gPSBVdGlsLmxlbmd0aDJlbShwYWQpO1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKGhhcyA/IHBhZGRpbmcgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLmdldEJvcmRlcnMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBib3JkZXIgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfSwgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIGJvcmRlcikge1xuICAgICAgICAgICAgaWYgKGJvcmRlci5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSBcImJvcmRlclwiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZF0gPSBVdGlsLmxlbmd0aDJlbShzdHlsZXNbSUQgKyBcIldpZHRoXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJTdHlsZVwiXSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBzdHlsZXNbSUQgKyBcIkNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9PT0gXCJpbml0aWFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm9yZGVyW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBib3JkZXIgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBVdGlsLnRoaWNrbmVzczJlbSA9IGZ1bmN0aW9uIChsZW5ndGgsIG11KSB7XG4gICAgICAgIHZhciB0aGljayA9IHRoaXMuVGVYLnJ1bGVfdGhpY2tuZXNzO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkxJTkVUSElDS05FU1MuTUVESVVNKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLlRISUNLKSB7XG4gICAgICAgICAgICByZXR1cm4gMS42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aDJlbShsZW5ndGgsIG11LCB0aGljayk7XG4gICAgfTtcbiAgICBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkpO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0VHJhbnNmb3JtVG9FbGVtZW50KHN2ZykpO1xuICAgIH07XG4gICAgVXRpbC5nZXRTVkdFbGVtID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgaWYgKCFlbGVtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgc3ZnID0gZWxlbS5ub2RlTmFtZSA9PT0gJ3N2ZycgPyBlbGVtIDogZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBvd25lciBTVkcgZWxlbWVudCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLmdldFNWR0VsZW0oZWxlbSk7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0U2NyZWVuQ1RNKCkuaW52ZXJzZSgpKTtcbiAgICB9O1xuICAgIFV0aWwuYm94Q29udGFpbnMgPSBmdW5jdGlvbiAoYmIsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIGJiICYmIGJiLnggPD0geCAmJiB4IDw9IGJiLnggKyBiYi53aWR0aCAmJiBiYi55IDw9IHkgJiYgeSA8PSBiYi55ICsgYmIuaGVpZ2h0O1xuICAgIH07XG4gICAgVXRpbC5ub2RlQ29udGFpbnNTY3JlZW5Qb2ludCA9IGZ1bmN0aW9uIChub2RlLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYiA9IG5vZGUuZ2V0QkIgJiYgbm9kZS5nZXRCQigpO1xuICAgICAgICB2YXIgcCA9IHRoaXMuc2NyZWVuQ29vcmRzVG9FbGVtQ29vcmRzKG5vZGUuRWRpdGFibGVTVkdlbGVtLCB4LCB5KTtcbiAgICAgICAgaWYgKCFiYiB8fCAhcClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIFV0aWwuYm94Q29udGFpbnMoYmIsIHAueCwgcC55KTtcbiAgICB9O1xuICAgIFV0aWwuaGlnaGxpZ2h0Qm94ID0gZnVuY3Rpb24gKHN2ZywgYmIpIHtcbiAgICAgICAgdmFyIGQgPSAxMDA7XG4gICAgICAgIHZhciBkcmF3TGluZSA9IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlModGhpcy5TVkdOUywgJ2xpbmUnKTtcbiAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChsaW5lKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsICdzdHJva2U6cmdiKDAsMCwyNTUpO3N0cm9rZS13aWR0aDoyMCcpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgeDEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgeTEpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3gyJywgeDIpO1xuICAgICAgICAgICAgbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgeTIpO1xuICAgICAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54ICsgZCwgYmIueSksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55LCBiYi54LCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnksIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLngsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBkLCBiYi55ICsgYmIuaGVpZ2h0KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCwgYmIueCArIGJiLndpZHRoIC0gZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCwgYmIueSArIGJiLmhlaWdodCAtIGQpXG4gICAgICAgIF07XG4gICAgfTtcbiAgICBVdGlsLmdldEpheEZyb21NYXRoID0gZnVuY3Rpb24gKG1hdGgpIHtcbiAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICBtYXRoID0gbWF0aC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIG1hdGggPSBtYXRoLm5leHRTaWJsaW5nO1xuICAgICAgICB9IHdoaWxlIChtYXRoICYmIG1hdGgubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJzY3JpcHRcIik7XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5nZXRKYXhGb3IobWF0aCk7XG4gICAgfTtcbiAgICBVdGlsLmdldEN1cnNvclZhbHVlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoaXNOYU4oZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgc3dpdGNoIChkaXJlY3Rpb25bMF0udG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3UnOiByZXR1cm4gRGlyZWN0aW9uLlVQO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2QnOiByZXR1cm4gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgY2FzZSAnbCc6IHJldHVybiBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgICAgICBjYXNlICdyJzogcmV0dXJuIERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3IgdmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFV0aWwuU1ZHTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG4gICAgVXRpbC5YTElOS05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgVXRpbC5OQlNQID0gXCJcXHUwMEEwXCI7XG4gICAgVXRpbC5CSUdESU1FTiA9IDEwMDAwMDAwO1xuICAgIFV0aWwuVGVYID0ge1xuICAgICAgICB4X2hlaWdodDogNDMwLjU1NCxcbiAgICAgICAgcXVhZDogMTAwMCxcbiAgICAgICAgbnVtMTogNjc2LjUwOCxcbiAgICAgICAgbnVtMjogMzkzLjczMixcbiAgICAgICAgbnVtMzogNDQzLjczLFxuICAgICAgICBkZW5vbTE6IDY4NS45NTEsXG4gICAgICAgIGRlbm9tMjogMzQ0Ljg0MSxcbiAgICAgICAgc3VwMTogNDEyLjg5MixcbiAgICAgICAgc3VwMjogMzYyLjg5MixcbiAgICAgICAgc3VwMzogMjg4Ljg4OCxcbiAgICAgICAgc3ViMTogMTUwLFxuICAgICAgICBzdWIyOiAyNDcuMjE3LFxuICAgICAgICBzdXBfZHJvcDogMzg2LjEwOCxcbiAgICAgICAgc3ViX2Ryb3A6IDUwLFxuICAgICAgICBkZWxpbTE6IDIzOTAsXG4gICAgICAgIGRlbGltMjogMTAwMCxcbiAgICAgICAgYXhpc19oZWlnaHQ6IDI1MCxcbiAgICAgICAgcnVsZV90aGlja25lc3M6IDYwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzE6IDExMS4xMTEsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMjogMTY2LjY2NixcbiAgICAgICAgYmlnX29wX3NwYWNpbmczOiAyMDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNDogNjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzU6IDEwMCxcbiAgICAgICAgc2NyaXB0c3BhY2U6IDEwMCxcbiAgICAgICAgbnVsbGRlbGltaXRlcnNwYWNlOiAxMjAsXG4gICAgICAgIGRlbGltaXRlcmZhY3RvcjogOTAxLFxuICAgICAgICBkZWxpbWl0ZXJzaG9ydGZhbGw6IDMwMCxcbiAgICAgICAgbWluX3J1bGVfdGhpY2tuZXNzOiAxLjI1LFxuICAgICAgICBtaW5fcm9vdF9zcGFjZTogMS41XG4gICAgfTtcbiAgICBVdGlsLk1BVEhTUEFDRSA9IHtcbiAgICAgICAgdmVyeXZlcnl0aGlubWF0aHNwYWNlOiAxIC8gMTgsXG4gICAgICAgIHZlcnl0aGlubWF0aHNwYWNlOiAyIC8gMTgsXG4gICAgICAgIHRoaW5tYXRoc3BhY2U6IDMgLyAxOCxcbiAgICAgICAgbWVkaXVtbWF0aHNwYWNlOiA0IC8gMTgsXG4gICAgICAgIHRoaWNrbWF0aHNwYWNlOiA1IC8gMTgsXG4gICAgICAgIHZlcnl0aGlja21hdGhzcGFjZTogNiAvIDE4LFxuICAgICAgICB2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiA3IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlubWF0aHNwYWNlOiAtMSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlubWF0aHNwYWNlOiAtMiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaW5tYXRoc3BhY2U6IC0zIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZlbWVkaXVtbWF0aHNwYWNlOiAtNCAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaWNrbWF0aHNwYWNlOiAtNSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlja21hdGhzcGFjZTogLTYgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiAtNyAvIDE4XG4gICAgfTtcbiAgICByZXR1cm4gVXRpbDtcbn0pKCk7XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgc3ZnLCBodWIsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgZGVmLmZpbGwgPSBcIm5vbmVcIjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3IC0gdCk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkIC0gdCk7XG4gICAgICAgIGRlZi50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3IodCAvIDIpICsgXCIsXCIgKyBNYXRoLmZsb29yKC1kICsgdCAvIDIpICsgXCIpXCI7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gW01hdGguZmxvb3IoNiAqIFV0aWwuZW0pLCBNYXRoLmZsb29yKDYgKiBVdGlsLmVtKV0uam9pbihcIiBcIik7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSBkO1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9GUkFNRTtcbn0pKEJCT1gpO1xudmFyIEJCT1hfR0xZUEggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0dMWVBILCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfR0xZUEgoc2NhbGUsIGlkLCBoLCBkLCB3LCBsLCByLCBwKSB7XG4gICAgICAgIHRoaXMuZ2x5cGhzID0ge307XG4gICAgICAgIHRoaXMubiA9IDA7XG4gICAgICAgIHZhciBkZWY7XG4gICAgICAgIHZhciB0ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLmJsYWNrZXI7XG4gICAgICAgIHZhciBjYWNoZSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VGb250Q2FjaGU7XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSAoc2NhbGUgPT09IDEgPyBudWxsIDogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCIpO1xuICAgICAgICBpZiAoY2FjaGUgJiYgIU1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgaWQgPSBcIkVcIiArIHRoaXMubiArIFwiLVwiICsgaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjYWNoZSB8fCAhdGhpcy5nbHlwaHNbaWRdKSB7XG4gICAgICAgICAgICBkZWYgPSB7IFwic3Ryb2tlLXdpZHRoXCI6IHQgfTtcbiAgICAgICAgICAgIGlmIChjYWNoZSlcbiAgICAgICAgICAgICAgICBkZWYuaWQgPSBpZDtcbiAgICAgICAgICAgIGVsc2UgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgZGVmLmQgPSAocCA/IFwiTVwiICsgcCArIFwiWlwiIDogXCJcIik7XG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicGF0aFwiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEguZGVmcy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x5cGhzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IFV0aWwuRWxlbWVudChcInVzZVwiLCBkZWYpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIFwiI1wiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0pKEJCT1gpO1xudmFyIEJCT1hfSExJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0hMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfSExJTkUodywgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKVxuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueTEgPSBkZWYueTIgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLngyID0gTWF0aC5mbG9vcih3IC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IHQ7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0hMSU5FO1xufSkoQkJPWCk7XG52YXIgQkJPWF9OT05SRU1PVkFCTEUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05PTlJFTU9WQUJMRSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05PTlJFTU9WQUJMRSgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05PTlJFTU9WQUJMRTtcbn0pKEJCT1hfRyk7XG52YXIgQkJPWF9OVUxMID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OVUxMLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfTlVMTCgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2kgLSAwXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuQ2xlYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfTlVMTDtcbn0pKEJCT1gpO1xudmFyIEJCT1hfUkVDVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUkVDVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JFQ1QoaCwgZCwgdywgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT09IHZvaWQgMCkgeyBkZWYgPSBudWxsOyB9XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwicmVjdFwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGggKyBkO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLnkgPSAtZDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfUkVDVDtcbn0pKEJCT1gpO1xudmFyIEJCT1hfUk9XID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ST1csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ST1coKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLmVsZW1zID0gW107XG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLnNkID0gMDtcbiAgICB9XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLkNoZWNrID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRhdGEudG9TVkcoKTtcbiAgICAgICAgdGhpcy5lbGVtcy5wdXNoKHN2Zyk7XG4gICAgICAgIGlmIChkYXRhLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgc3ZnLm1tbCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oID4gdGhpcy5zaCkge1xuICAgICAgICAgICAgdGhpcy5zaCA9IHN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCA+IHRoaXMuc2QpIHtcbiAgICAgICAgICAgIHRoaXMuc2QgPSBzdmcuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLlN0cmV0Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5lbGVtcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSB0aGlzLmVsZW1zW2ldLCBtbWwgPSBzdmcubW1sO1xuICAgICAgICAgICAgaWYgKG1tbCkge1xuICAgICAgICAgICAgICAgIGlmIChtbWwuZm9yY2VTdHJldGNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuaCAhPT0gdGhpcy5zaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmQgIT09IHRoaXMuc2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnID0gbW1sLlNWR3N0cmV0Y2hWKHRoaXMuc2gsIHRoaXMuc2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkhXID0gdGhpcy5zaDtcbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkQgPSB0aGlzLnNkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWMgPSBzdmcuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuQWRkKHN2ZywgdGhpcy53LCAwLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5lbGVtcztcbiAgICB9O1xuICAgIHJldHVybiBCQk9YX1JPVztcbn0pKEJCT1gpO1xudmFyIEJCT1hfU1ZHID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9TVkcsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9TVkcoKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIG51bGwsIFwic3ZnXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfU1ZHO1xufSkoQkJPWCk7XG52YXIgQkJPWF9WTElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVkxJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9WTElORShoLCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueDIgPSBkZWYueTEgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLnkyID0gTWF0aC5mbG9vcihoIC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwibGluZVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1ZMSU5FO1xufSkoQkJPWCk7XG52YXIgRWxlbWVudEpheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWxlbWVudEpheCgpIHtcbiAgICB9XG4gICAgcmV0dXJuIEVsZW1lbnRKYXg7XG59KSgpO1xudmFyIE1CYXNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQmFzZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1CYXNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ09oIG5vISBDb3VsZG5cXCd0IGZpbmQgZWxlbSBmb3IgdGhpcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uIChlZGl0YWJsZVNWRykge1xuICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgIG9iai5wcm90b3R5cGUgPSB7fTtcbiAgICAgICAgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnByb3RvdHlwZSkge1xuICAgICAgICAgICAgb2JqW2lkXSA9IHRoaXMucHJvdG90eXBlW2lkXTtcbiAgICAgICAgfVxuICAgICAgICBvYmouZWRpdGFibGVTVkcgPSBlZGl0YWJsZVNWRztcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciByZW5kZXJlZCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzdmcuc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5BZGQocmVuZGVyZWQsIHN2Zy53LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGNoaWxkLnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoc3ZnLnNrZXcgJiYgdGV4dC5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudyAmJiB0ZXh0Lmxlbmd0aCA9PT0gMSAmJiAhdmFyaWFudC5ub0lDKSB7XG4gICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NoaWxkU1ZHID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbaV0gPyB0aGlzLmRhdGFbaV0udG9TVkcoKSA6IG5ldyBCQk9YKCkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkID0gZnVuY3Rpb24gKGksIEhXLCBEKSB7XG4gICAgICAgIGlmIChEID09PSB2b2lkIDApIHsgRCA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEgPSB7XG4gICAgICAgICAgICBIVzogSFcsXG4gICAgICAgICAgICBEOiBEXG4gICAgICAgIH07XG4gICAgICAgIGlmICghdGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEJCT1goKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS50b1NWRygpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc2F2ZURhdGEgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIGlmICghdGhpcy5FZGl0YWJsZVNWR2RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudyA9IHN2Zy53LCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS54ID0gc3ZnLng7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggPSBzdmcuaCwgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCA9IHN2Zy5kO1xuICAgICAgICBpZiAoc3ZnLnkpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggKz0gc3ZnLnk7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kIC09IHN2Zy55O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuWCAhPSBudWxsKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuWCA9IHN2Zy5YO1xuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpXG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS50dyA9IHN2Zy50dztcbiAgICAgICAgaWYgKHN2Zy5za2V3KVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuc2tldyA9IHN2Zy5za2V3O1xuICAgICAgICBpZiAoc3ZnLmljKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaWMgPSBzdmcuaWM7XG4gICAgICAgIGlmICh0aGlzW1wiY2xhc3NcIl0pIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgXCJjbGFzc1wiOiB0aGlzW1wiY2xhc3NcIl1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmlkKSB7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiaWRcIjogdGhpcy5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaHJlZikge1xuICAgICAgICAgICAgdmFyIGEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgICAgICAgXCJjbGFzc1wiOiBcIm1qeC1zdmctaHJlZlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlTlMoVXRpbC5YTElOS05TLCBcImhyZWZcIiwgdGhpcy5ocmVmKTtcbiAgICAgICAgICAgIGEub25jbGljayA9IHRoaXMuU1ZHbGluaztcbiAgICAgICAgICAgIFV0aWwuYWRkRWxlbWVudChhLCBcInJlY3RcIiwge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBzdmcudyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHN2Zy5oICsgc3ZnLmQsXG4gICAgICAgICAgICAgICAgeTogLXN2Zy5kLFxuICAgICAgICAgICAgICAgIGZpbGw6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJwb2ludGVyLWV2ZW50c1wiOiBcImFsbFwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdmcudHlwZSA9PT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZy5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoZy5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5hZGRNTUxjbGFzc2VzKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2FkZENsYXNzKHN2Zy5lbGVtZW50LCBcIm1qeC1zdmctXCIgKyB0aGlzLnR5cGUpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3R5bGUgPSB0aGlzLnN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUgJiYgc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICAgICAgICAgIGlmIChzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmJvcmRlciA9IHN2Zy5lbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSAoc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9PT0gXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdhZGRBdHRyaWJ1dGVzKHN2Zyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRDbGFzcyA9IGZ1bmN0aW9uIChub2RlLCBuYW1lKSB7XG4gICAgICAgIHZhciBjbGFzc2VzID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTtcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCAoY2xhc3NlcyA/IGNsYXNzZXMgKyBcIiBcIiA6IFwiXCIpICsgbmFtZSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy5hdHRyTmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gdGhpcy5hdHRyTmFtZXMsIHNraXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm5vY29weUF0dHJpYnV0ZXMsIGlnbm9yZSA9IE1hdGhKYXguSHViLmNvbmZpZy5pZ25vcmVNTUxhdHRyaWJ1dGVzO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0gKHRoaXMudHlwZSA9PT0gXCJtc3R5bGVcIiA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubWF0aC5wcm90b3R5cGUuZGVmYXVsdHMgOiB0aGlzLmRlZmF1bHRzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gY29weS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBjb3B5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChpZ25vcmVbaWRdID09IGZhbHNlIHx8ICghc2tpcFtpZF0gJiYgIWlnbm9yZVtpZF0gJiZcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNbaWRdID09IG51bGwgJiYgdHlwZW9mIChzdmcuZWxlbWVudFtpZF0pID09PSBcInVuZGVmaW5lZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoaWQsIHRoaXMuYXR0cltpZF0pO1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhyZWYgPSB0aGlzLmhyZWYuYW5pbVZhbDtcbiAgICAgICAgaWYgKGhyZWYuY2hhckF0KDApID09PSBcIiNcIikge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IFV0aWwuaGFzaENoZWNrKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGhyZWYuc3Vic3RyKDEpKSk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5zY3JvbGxJbnRvVmlldykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGFyZW50Tm9kZS5zY3JvbGxJbnRvVmlldyh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGhyZWY7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHcHJvY2Vzc1N0eWxlcyA9IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB2YXIgc3R5bGVzID0ge1xuICAgICAgICAgICAgYm9yZGVyOiBVdGlsLmdldEJvcmRlcnMoc3R5bGUpLFxuICAgICAgICAgICAgcGFkZGluZzogVXRpbC5nZXRQYWRkaW5nKHN0eWxlKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXN0eWxlcy5ib3JkZXIpXG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLmJvcmRlcjtcbiAgICAgICAgaWYgKCFzdHlsZXMucGFkZGluZylcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMucGFkZGluZztcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTaXplKVxuICAgICAgICAgICAgc3R5bGVzWydmb250U2l6ZSddID0gc3R5bGUuZm9udFNpemU7XG4gICAgICAgIGlmIChzdHlsZS5jb2xvcilcbiAgICAgICAgICAgIHN0eWxlc1snY29sb3InXSA9IHN0eWxlLmNvbG9yO1xuICAgICAgICBpZiAoc3R5bGUuYmFja2dyb3VuZENvbG9yKVxuICAgICAgICAgICAgc3R5bGVzWydiYWNrZ3JvdW5kJ10gPSBzdHlsZS5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIGlmIChzdHlsZS5mb250U3R5bGUpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTdHlsZSddID0gc3R5bGUuZm9udFN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFdlaWdodClcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gc3R5bGUuZm9udFdlaWdodDtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRGYW1pbHkpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRGYW1pbHknXSA9IHN0eWxlLmZvbnRGYW1pbHk7XG4gICAgICAgIGlmIChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSAmJiBzdHlsZXNbJ2ZvbnRXZWlnaHQnXS5tYXRjaCgvXlxcZCskLykpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRXZWlnaHQnXSA9IChwYXJzZUludChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSkgPiA2MDAgPyBcImJvbGRcIiA6IFwibm9ybWFsXCIpO1xuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFwibW9cIilcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImxzcGFjZVwiLCBcInJzcGFjZVwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPD0gMCB8fCB0aGlzLmhhc1ZhbHVlKFwibHNwYWNlXCIpIHx8IHRoaXMuaGFzVmFsdWUoXCJyc3BhY2VcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmxzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5sc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnJzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5yc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLCBwYXJlbnQgPSB0aGlzLlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQgJiYgcGFyZW50LmlzRW1iZWxsaXNoZWQoKSAmJiBwYXJlbnQuQ29yZSgpID09PSBjb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvcmUgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHZhbHVlcy5sc3BhY2U7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5yc3BhY2UpXG4gICAgICAgICAgICAgICAgICAgIHN2Zy5YID0gdmFsdWVzLnJzcGFjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGFjZSA9IHRoaXMudGV4U3BhY2luZygpO1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZSgpO1xuICAgICAgICAgICAgaWYgKHNwYWNlICE9PSBcIlwiKVxuICAgICAgICAgICAgICAgIHN2Zy54ICs9IFV0aWwubGVuZ3RoMmVtKHNwYWNlLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVDb2xvciA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aGNvbG9yXCIsIFwiY29sb3JcIik7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlcyAmJiB0aGlzLnN0eWxlcy5jb2xvciAmJiAhdmFsdWVzLmNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMuY29sb3IgPSB0aGlzLnN0eWxlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmNvbG9yICYmICF0aGlzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhjb2xvciA9IHZhbHVlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgVXRpbC5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLm1hdGhjb2xvcixcbiAgICAgICAgICAgICAgICBzdHJva2U6IHZhbHVlcy5tYXRoY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9yZGVycyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkuYm9yZGVyLCBwYWRkaW5nID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5wYWRkaW5nLCBibGVmdCA9ICgoYm9yZGVycyB8fCB7fSkubGVmdCB8fCAwKSwgcGxlZnQgPSAoKHBhZGRpbmcgfHwge30pLmxlZnQgfHwgMCksIGlkO1xuICAgICAgICB2YWx1ZXMuYmFja2dyb3VuZCA9ICh0aGlzLm1hdGhiYWNrZ3JvdW5kIHx8IHRoaXMuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgKHRoaXMuc3R5bGVzIHx8IHt9KS5iYWNrZ3JvdW5kIHx8IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpO1xuICAgICAgICBpZiAoYmxlZnQgKyBwbGVmdCkge1xuICAgICAgICAgICAgdmFyIGR1cCA9IG5ldyBCQk9YKE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc3ZnKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN2Zy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHVwW2lkXSA9IHN2Z1tpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHVwLnggPSAwO1xuICAgICAgICAgICAgZHVwLnkgPSAwO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KFwiZ1wiKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIHN2Zy5BZGQoZHVwLCBibGVmdCArIHBsZWZ0LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFkZGluZykge1xuICAgICAgICAgICAgc3ZnLncgKz0gcGFkZGluZy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gcGFkZGluZy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IHBhZGRpbmcuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IGJvcmRlcnMucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IGJvcmRlcnMudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBib3JkZXJzLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuYmFja2dyb3VuZCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5DT0xPUi5UUkFOU1BBUkVOVCkge1xuICAgICAgICAgICAgdmFyIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChub2RlTmFtZSAhPT0gXCJnXCIgJiYgbm9kZU5hbWUgIT09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gZztcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1JFQ1Qoc3ZnLmgsIHN2Zy5kLCBzdmcudywge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5iYWNrZ3JvdW5kLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH0pLCAwLCAwLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvcmRlcnMpIHtcbiAgICAgICAgICAgIHZhciBkZCA9IDU7XG4gICAgICAgICAgICB2YXIgc2lkZXMgPSB7XG4gICAgICAgICAgICAgICAgbGVmdDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCAtZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgcmlnaHQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgc3ZnLncgLSBib3JkZXJzLnJpZ2h0ICsgZGQsIC1zdmcuZF0sXG4gICAgICAgICAgICAgICAgdG9wOiBbXCJIXCIsIHN2Zy53LCAwLCBzdmcuaCAtIGJvcmRlcnMudG9wICsgZGRdLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogW1wiSFwiLCBzdmcudywgMCwgLXN2Zy5kIC0gZGRdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzaWRlcykge1xuICAgICAgICAgICAgICAgIGlmIChzaWRlcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2lkZSA9IHNpZGVzW2lkXSwgYm94ID0gQkJPWFtzaWRlWzBdICsgXCJMSU5FXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChib3goc2lkZVsxXSwgYm9yZGVyc1tpZF0sIGJvcmRlcnNbaWQgKyBcIlN0eWxlXCJdLCBib3JkZXJzW2lkICsgXCJDb2xvclwiXSksIHNpZGVbMl0sIHNpZGVbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRWYXJpYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRodmFyaWFudFwiLCBcImZvbnRmYW1pbHlcIiwgXCJmb250d2VpZ2h0XCIsIFwiZm9udHN0eWxlXCIpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHZhbHVlcy5tYXRodmFyaWFudDtcbiAgICAgICAgaWYgKHRoaXMudmFyaWFudEZvcm0pIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBcIi1UZVgtdmFyaWFudFwiO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5oYXNWYXJpYW50ID0gdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgdmFsdWVzLmZhbWlseSA9IHZhbHVlcy5mb250ZmFtaWx5O1xuICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHZhbHVlcy5mb250d2VpZ2h0O1xuICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdmFsdWVzLmZvbnRzdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zdHlsZXMpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHRoaXMuc3R5bGVzLmZvbnRTdHlsZSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodClcbiAgICAgICAgICAgICAgICB2YWx1ZXMud2VpZ2h0ID0gdGhpcy5zdHlsZXMuZm9udFdlaWdodDtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLmZhbWlseSAmJiB0aGlzLnN0eWxlcy5mb250RmFtaWx5KVxuICAgICAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB0aGlzLnN0eWxlcy5mb250RmFtaWx5O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuZmFtaWx5ICYmICF2YWx1ZXMuaGFzVmFyaWFudCkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvYm9sZC8pKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IFwiYm9sZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuc3R5bGUgJiYgdmFsdWVzLm1hdGh2YXJpYW50Lm1hdGNoKC9pdGFsaWMvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IFwiaXRhbGljXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGZvcmNlRmFtaWx5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiB2YWx1ZXMuZmFtaWx5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXN0eWxlXCJdID0gdmFsdWVzLnN0eWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRbXCJmb250LXdlaWdodFwiXSA9IHZhbHVlcy53ZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJib2xkXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xERlJBS1RVUixcbiAgICAgICAgICAgICAgICBzY3JpcHQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0NSSVBULFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLndlaWdodCA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQubm9ybWFsLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuRlJBS1RVUixcbiAgICAgICAgICAgICAgICBcImJvbGQtc2NyaXB0XCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwiaXRhbGljXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuSVRBTElDLFxuICAgICAgICAgICAgICAgIGJvbGQ6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGSVRBTElDLFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZCT0xESVRBTElDXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWVzLnN0eWxlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIGl0YWxpYzogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgbmFtZSArIFwiLmpzXCI7XG4gICAgICAgIHJldHVybiBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGRyYXcgY3Vyc29yJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGN1cnNvci5kcmF3SGlnaGxpZ2h0QXQoc3ZnZWxlbSwgYmIueCwgYmIueSwgYmIud2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRTVkdCQm94ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGVsZW0gPSBlbGVtIHx8IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0gfHwgIWVsZW0ub3duZXJTVkdFbGVtZW50KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgYmIgPSBlbGVtLmdldEJCb3goKTtcbiAgICAgICAgaWYgKGVsZW0ubm9kZU5hbWUgPT09ICd1c2UnKSB7XG4gICAgICAgICAgICBiYi54ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneCcpKTtcbiAgICAgICAgICAgIGJiLnkgKz0gTnVtYmVyKGVsZW0uZ2V0QXR0cmlidXRlKCd5JykpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChlbGVtLm93bmVyU1ZHRWxlbWVudCk7XG4gICAgICAgIHZhciBwdG1wID0gZWxlbS5vd25lclNWR0VsZW1lbnQuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgdmFyIGx4ID0gMSAvIDAsIGx5ID0gMSAvIDAsIGh4ID0gLTEgLyAwLCBoeSA9IC0xIC8gMDtcbiAgICAgICAgY2hlY2soYmIueCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLnggKyBiYi53aWR0aCwgYmIueSk7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogbHgsXG4gICAgICAgICAgICB5OiBseSxcbiAgICAgICAgICAgIHdpZHRoOiBoeCAtIGx4LFxuICAgICAgICAgICAgaGVpZ2h0OiBoeSAtIGx5LFxuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBjaGVjayh4LCB5KSB7XG4gICAgICAgICAgICBwdG1wLnggPSB4O1xuICAgICAgICAgICAgcHRtcC55ID0geTtcbiAgICAgICAgICAgIHZhciBwID0gcHRtcC5tYXRyaXhUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICAgICAgICAgIGx4ID0gTWF0aC5taW4obHgsIHAueCk7XG4gICAgICAgICAgICBseSA9IE1hdGgubWluKGx5LCBwLnkpO1xuICAgICAgICAgICAgaHggPSBNYXRoLm1heChoeCwgcC54KTtcbiAgICAgICAgICAgIGh5ID0gTWF0aC5tYXgoaHksIHAueSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNQmFzZU1peGluO1xufSkoRWxlbWVudEpheCk7XG52YXIgQ2hhcnNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoYXJzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ2hhcnNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIENoYXJzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgbiwgTiwgYywgZm9udCwgVkFSSUFOVCwgaSwgbSwgaWQsIE0sIFJBTkdFUztcbiAgICAgICAgaWYgKCF2YXJpYW50KSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFyaWFudC5mb3JjZUZhbWlseSkge1xuICAgICAgICAgICAgdGV4dCA9IG5ldyBCQk9YX1RFWFQoc2NhbGUsIHRleHQsIHZhcmlhbnQuZm9udCk7XG4gICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQodGV4dCk7XG4gICAgICAgICAgICB0ZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBWQVJJQU5UID0gdmFyaWFudDtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRleHQubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gVkFSSUFOVDtcbiAgICAgICAgICAgIG4gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBjID0gdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICBpZiAobiA+PSAweEQ4MDAgJiYgbiA8IDB4REJGRikge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICBuID0gKCgobiAtIDB4RDgwMCkgPDwgMTApICsgKHRleHQuY2hhckNvZGVBdChpKSAtIDB4REMwMCkpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVERBVEEuUmVtYXBQbGFuZTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG52ID0gRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSBGT05UREFUQS5SQU5HRVM7XG4gICAgICAgICAgICAgICAgZm9yIChpZCA9IDAsIE0gPSBSQU5HRVMubGVuZ3RoOyBpZCA8IE07IGlkKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ubmFtZSA9PT0gXCJhbHBoYVwiICYmIHZhcmlhbnQubm9Mb3dlckNhc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgTiA9IHZhcmlhbnRbXCJvZmZzZXRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE4gJiYgbiA+PSBSQU5HRVNbaWRdLmxvdyAmJiBuIDw9IFJBTkdFU1tpZF0uaGlnaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ucmVtYXAgJiYgUkFOR0VTW2lkXS5yZW1hcFtuXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBOICsgUkFOR0VTW2lkXS5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBuIC0gUkFOR0VTW2lkXS5sb3cgKyBOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLmFkZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuICs9IFJBTkdFU1tpZF0uYWRkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50W1widmFyaWFudFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LnJlbWFwICYmIHZhcmlhbnQucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICBuID0gdmFyaWFudC5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcC52YXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuUkVNQVBbbl0gJiYgIXZhcmlhbnQubm9SZW1hcCkge1xuICAgICAgICAgICAgICAgIG4gPSBGT05UREFUQS5SRU1BUFtuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSBDaGFyc01peGluLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBGKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCQk9YX0dMWVBILmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gQkJPWF9HTFlQSC5wcm90b3R5cGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBnbHlwaCA9IG5ldyBGKGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGdseXBoLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuREVMSU1JVEVSU1tuXSkge1xuICAgICAgICAgICAgICAgIGMgPSB0aGlzLmNyZWF0ZURlbGltaXRlcihuLCAwLCAxLCBmb250KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAoRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKHNjYWxlICogMTAwIC8gRURJVEFCTEVTVkcuY29uZmlnLnNjYWxlLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFyaWFudC5kZWZhdWx0RmFtaWx5IHx8IEVESVRBQkxFU1ZHLmNvbmZpZy51bmRlZmluZWRGYW1pbHksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiAodmFyaWFudC5pdGFsaWMgPyBcIml0YWxpY1wiIDogXCJcIiksXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogKHZhcmlhbnQuYm9sZCA/IFwiYm9sZFwiIDogXCJcIilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBib3guZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgICAgICBjID0gbmV3IEJCT1hfRygpO1xuICAgICAgICAgICAgICAgIGMuQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5IdWIuc2lnbmFsLlBvc3QoW1wiU1ZHIEpheCAtIHVua25vd24gY2hhclwiLCBuLCB2YXJpYW50XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAxICYmIGZvbnQuc2tldyAmJiBmb250LnNrZXdbbl0pIHtcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gZm9udC5za2V3W25dICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBzdmcuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5sb29rdXBDaGFyID0gZnVuY3Rpb24gKHZhcmlhbnQsIG4pIHtcbiAgICAgICAgdmFyIGksIG07XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXZhcmlhbnQuRk9OVFMpIHtcbiAgICAgICAgICAgIHZhciBGT05UUyA9IEZPTlREQVRBLkZPTlRTO1xuICAgICAgICAgICAgdmFyIGZvbnRzID0gKHZhcmlhbnQuZm9udHMgfHwgRk9OVERBVEEuVkFSSUFOVC5ub3JtYWwuZm9udHMpO1xuICAgICAgICAgICAgaWYgKCEoZm9udHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICBmb250cyA9IFtmb250c107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5mb250cyAhPSBmb250cykge1xuICAgICAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBmb250cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG0gPSBmb250cy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVFNbZm9udHNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQuRk9OVFMucHVzaChGT05UU1tmb250c1tpXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdmFyaWFudC5GT05UUy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmb250ID0gdmFyaWFudC5GT05UU1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGZvbnQpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHZhcmlhbnQuRk9OVFM7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkRm9udChmb250KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmb250W25dKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRCbG9jayhmb250LCBuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IFwidW5rbm93blwiXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlciA9IGZ1bmN0aW9uIChjb2RlLCBIVywgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgaWYgKHNjYWxlID09PSB2b2lkIDApIHsgc2NhbGUgPSBudWxsOyB9XG4gICAgICAgIGlmIChmb250ID09PSB2b2lkIDApIHsgZm9udCA9IG51bGw7IH1cbiAgICAgICAgdmFyIEVESVRBQkxFU1ZHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkc7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfRygpO1xuICAgICAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5lbGVtZW50O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHNjYWxlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShIVyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgSFcgPSBbSFcsIEhXXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaHcgPSBIV1sxXTtcbiAgICAgICAgSFcgPSBIV1swXTtcbiAgICAgICAgdmFyIGRlbGltID0ge1xuICAgICAgICAgICAgYWxpYXM6IGNvZGUsXG4gICAgICAgICAgICBIVzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGlyOiB1bmRlZmluZWRcbiAgICAgICAgfTtcbiAgICAgICAgd2hpbGUgKGRlbGltLmFsaWFzKSB7XG4gICAgICAgICAgICBjb2RlID0gZGVsaW0uYWxpYXM7XG4gICAgICAgICAgICBkZWxpbSA9IEZPTlREQVRBLkRFTElNSVRFUlNbY29kZV07XG4gICAgICAgICAgICBpZiAoIWRlbGltKSB7XG4gICAgICAgICAgICAgICAgZGVsaW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIEhXOiBbMCwgRk9OVERBVEEuVkFSSUFOVFtNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuTk9STUFMXV0sXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGxvYWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLmxvYWQpIHtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShFRElUQUJMRVNWRy5mb250RGlyICsgXCIvZm9udGRhdGEtXCIgKyBkZWxpbS5sb2FkICsgXCIuanNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGVsaW0uSFcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMF0gKiBzY2FsZSA+PSBIVyAtIDEwIC0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYmxhY2tlciB8fCAoaSA9PSBtIC0gMSAmJiAhZGVsaW0uc3RyZXRjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gZGVsaW0uSFdbaV1bMl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVszXSkge1xuICAgICAgICAgICAgICAgICAgICBjb2RlID0gZGVsaW0uSFdbaV1bM107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIFtjb2RlLCBkZWxpbS5IV1tpXVsxXV0sIGZvbnQpLldpdGgoe1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9LCBNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLnN0cmV0Y2gpIHtcbiAgICAgICAgICAgIHRoaXNbXCJleHRlbmREZWxpbWl0ZXJcIiArIGRlbGltLmRpcl0oc3ZnLCBodywgZGVsaW0uc3RyZXRjaCwgc2NhbGUsIGZvbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmNyZWF0ZUNoYXIgPSBmdW5jdGlvbiAoc2NhbGUsIGRhdGEsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiLCB2YXJpYW50ID0ge1xuICAgICAgICAgICAgZm9udHM6IFtkYXRhWzFdXSxcbiAgICAgICAgICAgIG5vUmVtYXA6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBbZGF0YVsxXSArIFwiLWJvbGRcIiwgZGF0YVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiAoZGF0YVsxXSkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBkYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGF0YVswXS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs0XSkge1xuICAgICAgICAgICAgc2NhbGUgPSBzY2FsZSAqIGRhdGFbNF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIGlmIChkYXRhWzJdKSB7XG4gICAgICAgICAgICBzdmcueCA9IGRhdGFbMl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzNdKSB7XG4gICAgICAgICAgICBzdmcueSA9IGRhdGFbM10gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzVdKSB7XG4gICAgICAgICAgICBzdmcuaCArPSBkYXRhWzVdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs2XSkge1xuICAgICAgICAgICAgc3ZnLmQgKz0gZGF0YVs2XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uZmluZEJsb2NrID0gZnVuY3Rpb24gKGZvbnQsIGMpIHtcbiAgICAgICAgaWYgKGZvbnQuUmFuZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGZvbnQuUmFuZ2VzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChjIDwgZm9udC5SYW5nZXNbaV1bMF0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSBmb250LlJhbmdlc1tpXVsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IGZvbnQuUmFuZ2VzW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gZm9udC5SYW5nZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb250LlJhbmdlc1tqXVsyXSA9PSBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udC5SYW5nZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udC5kaXJlY3RvcnkgKyBcIi9cIiArIGZpbGUgKyBcIi5qc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENoYXJzTWl4aW4ubG9hZEZvbnQgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5BamF4LlJlcXVpcmUoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuZm9udERpciArIFwiL1wiICsgZmlsZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIENoYXJzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBFbnRpdHlNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEVudGl0eU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEVudGl0eU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgRW50aXR5TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLnRvU3RyaW5nKCkucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICB9O1xuICAgIHJldHVybiBFbnRpdHlNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIEhvbGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhIb2xlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEhvbGUoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBIb2xlLnByb3RvdHlwZS5Jbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnR5cGUgPSBcImhvbGVcIjtcbiAgICAgICAgdGhpcy5kYXRhID0gW107XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIEhvbGUucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05PTlRSSVZJQUwgSE9MRSEhIScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgaG9sZSA9IG5ldyBCQk9YX1JFQ1QoNDAwLCAwLCAzMDAsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZScsXG4gICAgICAgICAgICBzdHJva2U6ICdibHVlJyxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6ICcyMCdcbiAgICAgICAgfSk7XG4gICAgICAgIHN2Zy5BZGQoaG9sZSwgMCwgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb2xlIGRvZXMgbm90IGhhdmUgYSBjaGlsZCcpO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciB4ID0gYmJveC54ICsgKGJib3gud2lkdGggLyAyLjApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudCwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBIb2xlO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUFjdGlvbk1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUFjdGlvbk1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1BY3Rpb25NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1BY3Rpb25NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTUFjdGlvbk1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTWF0aE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWF0aE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hdGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChzcGFuLCBkaXYsIHJlcGxhY2UpIHtcbiAgICAgICAgdmFyIENPTkZJRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZztcbiAgICAgICAgdGhpcy5sb2FkVGV4aWZ5KCk7XG4gICAgICAgIGlmICghdGhpcy5kYXRhWzBdKVxuICAgICAgICAgICAgcmV0dXJuIHNwYW47XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlBbGlnbiA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5QWxpZ247XG4gICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSBNYXRoSmF4Lkh1Yi5jb25maWcuZGlzcGxheUluZGVudDtcbiAgICAgICAgaWYgKFN0cmluZyhNYXRoSmF4Lkh1Yi5jb25maWcuZGlzcGxheUluZGVudCkubWF0Y2goL14wKCR8W2EteiVdKS9pKSlcbiAgICAgICAgICAgIE1hdGhKYXguRWxlbWVudEpheC5tbWwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSBcIjBcIjtcbiAgICAgICAgdmFyIGJveCA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIGRhdGFTdmcgPSB0aGlzLmRhdGFbMF0udG9TVkcoKTtcbiAgICAgICAgYm94LkFkZChkYXRhU3ZnLCAwLCAwLCB0cnVlKTtcbiAgICAgICAgYm94LkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3IoYm94KTtcbiAgICAgICAgVXRpbC5FbGVtZW50KGJveC5lbGVtZW50LCB7XG4gICAgICAgICAgICBzdHJva2U6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBmaWxsOiBcImN1cnJlbnRDb2xvclwiLFxuICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogMCxcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJtYXRyaXgoMSAwIDAgLTEgMCAwKVwiXG4gICAgICAgIH0pO1xuICAgICAgICBib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfU1ZHKCk7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhtbG5zOnhsaW5rXCIsIFV0aWwuWExJTktOUyk7XG4gICAgICAgIGlmIChDT05GSUcudXNlRm9udENhY2hlICYmICFDT05GSUcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKEJCT1guZGVmcyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoIXNwYW4pIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGwgPSBNYXRoLm1heCgtc3ZnLmwsIDApLCByID0gTWF0aC5tYXgoc3ZnLnIgLSBzdmcudywgMCk7XG4gICAgICAgIHZhciBzdHlsZSA9IHN2Zy5lbGVtZW50LnN0eWxlO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBVdGlsLkV4KGwgKyBzdmcudyArIHIpKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFV0aWwuRXgoc3ZnLkggKyBzdmcuRCArIDIgKiBVdGlsLmVtKSk7XG4gICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuRCAtIDIgKiBVdGlsLmVtKTtcbiAgICAgICAgc3R5bGUubWFyZ2luTGVmdCA9IFV0aWwuRXgoLWwpO1xuICAgICAgICBzdHlsZS5tYXJnaW5SaWdodCA9IFV0aWwuRXgoLXIpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ2aWV3Qm94XCIsIFV0aWwuRml4ZWQoLWwsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKC1zdmcuSCAtIFV0aWwuZW0sIDEpICsgXCIgXCIgK1xuICAgICAgICAgICAgVXRpbC5GaXhlZChsICsgc3ZnLncgKyByLCAxKSArIFwiIFwiICsgVXRpbC5GaXhlZChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0sIDEpKTtcbiAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gc3R5bGUubWFyZ2luQm90dG9tID0gXCIxcHhcIjtcbiAgICAgICAgaWYgKHN2Zy5IID4gc3ZnLmgpIHtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpblRvcCA9IFV0aWwuRXgoc3ZnLmggLSBzdmcuSCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5EID4gc3ZnLmQpIHtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpbkJvdHRvbSA9IFV0aWwuRXgoc3ZnLmQgLSBzdmcuRCk7XG4gICAgICAgICAgICBzdHlsZS52ZXJ0aWNhbEFsaWduID0gVXRpbC5FeCgtc3ZnLmQpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhbHR0ZXh0ID0gdGhpcy5HZXQoXCJhbHR0ZXh0XCIpO1xuICAgICAgICBpZiAoYWx0dGV4dCAmJiAhc3ZnLmVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiKSlcbiAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBhbHR0ZXh0KTtcbiAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwibWF0aFwiKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncmVuZGVyZWQtc3ZnLW91dHB1dCcpO1xuICAgICAgICB2YXIgcHJldmlvdXMgPSBzcGFuLnF1ZXJ5U2VsZWN0b3IoJy5yZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIGlmIChyZXBsYWNlICYmIHByZXZpb3VzKSB7XG4gICAgICAgICAgICBzcGFuLnJlcGxhY2VDaGlsZChzdmcuZWxlbWVudCwgcHJldmlvdXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLmVsZW1lbnQgPSBudWxsO1xuICAgICAgICBpZiAoIXRoaXMuaXNNdWx0aWxpbmUgJiYgdGhpcy5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIgJiYgIXN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50YWxpZ25maXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdGhpcy5kaXNwbGF5QWxpZ247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0Zmlyc3QgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UU0hJRlQuSU5ERU5UU0hJRlQpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSB2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnQgPT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMuaW5kZW50c2hpZnQsIDEsIHRoaXMuZWRpdGFibGVTVkcuY3dpZHRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXlJbmRlbnQgIT09IFwiMFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGVudCA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuZGlzcGxheUluZGVudCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIHNoaWZ0ICs9ICh2YWx1ZXMuaW5kZW50YWxpZ24gPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuSU5ERU5UQUxJR04uUklHSFQgPyAtaW5kZW50IDogaW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5zdHlsZS50ZXh0QWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ247XG4gICAgICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQoc3R5bGUsICh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IFV0aWwuRXgoc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogVXRpbC5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVt2YWx1ZXMuaW5kZW50YWxpZ25dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhbjtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubG9hZFRleGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlKCd0ZXhpZnknKTtcbiAgICB9O1xuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgcmV0dXJuIE1hdGhNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1FbmNsb3NlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRW5jbG9zZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FbmNsb3NlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRW5jbG9zZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNRW5jbG9zZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUVycm9yTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRXJyb3JNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRXJyb3JNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FcnJvck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLnN0eWxlcy5mb250U2l6ZSB8fCAxKSAvIDEwMDA7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGRlZiA9IChzY2FsZSAhPT0gMSA/IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJzY2FsZShcIiArIFV0aWwuRml4ZWQoc2NhbGUpICsgXCIpXCJcbiAgICAgICAgfSA6IHt9KTtcbiAgICAgICAgdmFyIGJib3ggPSBuZXcgQkJPWChkZWYpO1xuICAgICAgICBiYm94LkFkZCh0aGlzLlNWR2NoaWxkU1ZHKDApKTtcbiAgICAgICAgYmJveC5DbGVhbigpO1xuICAgICAgICBpZiAoc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIGJib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGFkanVzdCA9IFtcIndcIiwgXCJoXCIsIFwiZFwiLCBcImxcIiwgXCJyXCIsIFwiRFwiLCBcIkhcIl07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGFkanVzdC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBiYm94W2FkanVzdFtpXV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChiYm94KTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBVdGlsLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubWVycm9yU3R5bGVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydCh0aGlzLnN0eWxlcywgdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1FcnJvck1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUZlbmNlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZlbmNlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GZW5jZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GZW5jZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLm9wZW4pIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEub3Blbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMSwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW1wic2VwXCIgKyBpXSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW1wic2VwXCIgKyBpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGEuY2xvc2UpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGEuY2xvc2UpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNRmVuY2VkTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNRnJhY01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZyYWNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRnJhY01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIGZyYWMgPSBuZXcgQkJPWCgpO1xuICAgICAgICBmcmFjLnNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKGZyYWMpO1xuICAgICAgICB2YXIgbnVtID0gdGhpcy5TVkdjaGlsZFNWRygwKSwgZGVuID0gdGhpcy5TVkdjaGlsZFNWRygxKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwibGluZXRoaWNrbmVzc1wiLCBcIm51bWFsaWduXCIsIFwiZGVub21hbGlnblwiLCBcImJldmVsbGVkXCIpO1xuICAgICAgICB2YXIgaXNEaXNwbGF5ID0gdmFsdWVzLmRpc3BsYXlzdHlsZTtcbiAgICAgICAgdmFyIGEgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlO1xuICAgICAgICBpZiAodmFsdWVzLmJldmVsbGVkKSB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSAoaXNEaXNwbGF5ID8gNDAwIDogMTUwKTtcbiAgICAgICAgICAgIHZhciBIID0gTWF0aC5tYXgobnVtLmggKyBudW0uZCwgZGVuLmggKyBkZW4uZCkgKyAyICogZGVsdGE7XG4gICAgICAgICAgICB2YXIgYmV2ZWwgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDJGLCBIKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKG51bSwgMCwgKG51bS5kIC0gbnVtLmgpIC8gMiArIGEgKyBkZWx0YSk7XG4gICAgICAgICAgICBmcmFjLkFkZChiZXZlbCwgbnVtLncgLSBkZWx0YSAvIDIsIChiZXZlbC5kIC0gYmV2ZWwuaCkgLyAyICsgYSk7XG4gICAgICAgICAgICBmcmFjLkFkZChkZW4sIG51bS53ICsgYmV2ZWwudyAtIGRlbHRhLCAoZGVuLmQgLSBkZW4uaCkgLyAyICsgYSAtIGRlbHRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBXID0gTWF0aC5tYXgobnVtLncsIGRlbi53KTtcbiAgICAgICAgICAgIHZhciB0ID0gVXRpbC50aGlja25lc3MyZW0odmFsdWVzLmxpbmV0aGlja25lc3MsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGUsIHAsIHEsIHUsIHY7XG4gICAgICAgICAgICB2YXIgbXQgPSBVdGlsLlRlWC5taW5fcnVsZV90aGlja25lc3MgLyBVdGlsLmVtICogMTAwMDtcbiAgICAgICAgICAgIGlmIChpc0Rpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICB1ID0gVXRpbC5UZVgubnVtMTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdSA9ICh0ID09PSAwID8gVXRpbC5UZVgubnVtMyA6IFV0aWwuVGVYLm51bTIpO1xuICAgICAgICAgICAgICAgIHYgPSBVdGlsLlRlWC5kZW5vbTI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1ICo9IHNjYWxlO1xuICAgICAgICAgICAgdiAqPSBzY2FsZTtcbiAgICAgICAgICAgIGlmICh0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcCA9IE1hdGgubWF4KChpc0Rpc3BsYXkgPyA3IDogMykgKiBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcywgMiAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoZGVuLmggLSB2KTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgdiArPSAocCAtIHEpIC8gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJhYy53ID0gVztcbiAgICAgICAgICAgICAgICB0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gMiA6IDApICogbXQgKyB0LCB0IC8gMiArIDEuNSAqIG10KTtcbiAgICAgICAgICAgICAgICBxID0gKHUgLSBudW0uZCkgLSAoYSArIHQgLyAyKTtcbiAgICAgICAgICAgICAgICBpZiAocSA8IHApIHtcbiAgICAgICAgICAgICAgICAgICAgdSArPSBwIC0gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcSA9IChhIC0gdCAvIDIpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMuQWRkKG5ldyBCQk9YX1JFQ1QodCAvIDIsIHQgLyAyLCBXICsgMiAqIHQpLCAwLCBhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZyYWMuQWxpZ24obnVtLCB2YWx1ZXMubnVtYWxpZ24sIHQsIHUpO1xuICAgICAgICAgICAgZnJhYy5BbGlnbihkZW4sIHZhbHVlcy5kZW5vbWFsaWduLCB0LCAtdik7XG4gICAgICAgIH1cbiAgICAgICAgZnJhYy5DbGVhbigpO1xuICAgICAgICBzdmcuQWRkKGZyYWMsIDAsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5TVkdoYW5kbGVTcGFjZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnRleFdpdGhEZWxpbXMgJiYgIXRoaXMudXNlTU1Mc3BhY2luZykge1xuICAgICAgICAgICAgc3ZnLnggPSBzdmcuWCA9IFV0aWwuVGVYLm51bGxkZWxpbWl0ZXJzcGFjZSAqIHRoaXMubXNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UuY2FsbCh0aGlzLCBzdmcpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBtaWRsaW5lWSA9IGJiLnkgKyAoYmIuaGVpZ2h0IC8gMi4wKTtcbiAgICAgICAgdmFyIG1pZGxpbmVYID0gYmIueCArIChiYi53aWR0aCAvIDIuMCk7XG4gICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAoeCA8IG1pZGxpbmVYKSA/IDAgOiAxLFxuICAgICAgICAgICAgaGFsZjogKHkgPCBtaWRsaW5lWSkgPyAwIDogMSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uaGFsZl0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGN1cnNvcicpO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPSAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQsIGtlZXApIHtcbiAgICAgICAgdmFyIGlzTnVtZXJhdG9yID0gdGhpcy5kYXRhWzBdID09PSBjaGlsZDtcbiAgICAgICAgdmFyIGlzRGVub21pbmF0b3IgPSB0aGlzLmRhdGFbMV0gPT09IGNoaWxkO1xuICAgICAgICBpZiAoIWlzTnVtZXJhdG9yICYmICFpc0Rlbm9taW5hdG9yKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTcGVjaWZpZWQgY2hpbGQgbm90IGZvdW5kIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIGlmIChpc051bWVyYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0Rlbm9taW5hdG9yICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2VlcCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKGlzTnVtZXJhdG9yID8gMCA6IDEsIGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9IYWxmID0gZnVuY3Rpb24gKGhhbGYsIGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbaGFsZl0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaGFsZl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICAgIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW2hhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmIChiYiAmJiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMikge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIGhhbGY6IGhhbGYsXG4gICAgICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9IYWxmKDAsIGMsIGQpO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckludG9EZW5vbWluYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigxLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5MRUZUOlxuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uUklHSFQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVswXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICAgICAgICAgIGhhbGY6IDAsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDAgOiAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uVVA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICBjYXNlIERpcmVjdGlvbi5ET1dOOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvTnVtZXJhdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeCA9IGJib3gueCArIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPyBiYm94LndpZHRoICsgMTAwIDogLTEwMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICByZXR1cm4gTUZyYWNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1HbHlwaE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUdseXBoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUdseXBoTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNR2x5cGhNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICA7XG4gICAgcmV0dXJuIE1HbHlwaE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTU11bHRpU2NyaXB0c01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTU11bHRpU2NyaXB0c01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1NdWx0aVNjcmlwdHNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1NdWx0aVNjcmlwdHNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTU11bHRpU2NyaXB0c01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTW5NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTW5NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1uTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZ2V0Q3Vyc29yTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLmRhdGFbMF0ubGVuZ3RoO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgYXMgY3Vyc29yIGNvbnRhaW5lcicpO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmdldEN1cnNvckxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmdldEN1cnNvckxlbmd0aCgpOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTW5NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1vTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNb01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1vTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNb01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICBpZiAoSFcgPT09IHZvaWQgMCkgeyBIVyA9IG51bGw7IH1cbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImxhcmdlb3BcIiwgXCJkaXNwbGF5c3R5bGVcIik7XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwiLWxhcmdlT3BcIiA6IFwiLXNtYWxsT3BcIl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICB2YXIgaXNTY3JpcHQgPSAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwKSAmJiB0aGlzICE9PSBwYXJlbnQuZGF0YVswXSk7XG4gICAgICAgIHZhciBtYXBjaGFycyA9IChpc1NjcmlwdCA/IHRoaXMucmVtYXBDaGFycyA6IG51bGwpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXVuZGVyb3ZlcikgJiZcbiAgICAgICAgICAgIHRoaXMuQ29yZVRleHQocGFyZW50LmRhdGFbcGFyZW50LmJhc2VdKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBvdmVyID0gcGFyZW50LmRhdGFbcGFyZW50Lm92ZXJdLCB1bmRlciA9IHBhcmVudC5kYXRhW3BhcmVudC51bmRlcl07XG4gICAgICAgICAgICBpZiAob3ZlciAmJiB0aGlzID09PSBvdmVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnRcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgbWFwY2hhcnMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFVOREVSO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1NjcmlwdCAmJiB0aGlzLmRhdGEuam9pbihcIlwiKS5tYXRjaCgvWydgXCJcXHUwMEI0XFx1MjAzMi1cXHUyMDM3XFx1MjA1N10vKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbXCItVGVYLXZhcmlhbnRcIl07XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGFbaV0udG9TVkcodmFyaWFudCwgc2NhbGUsIHRoaXMucmVtYXAsIG1hcGNoYXJzKSwgeCA9IHN2Zy53O1xuICAgICAgICAgICAgICAgIGlmICh4ID09PSAwICYmIC10ZXh0LmwgPiAxMCAqIHRleHQudykge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IC10ZXh0Lmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQodGV4dCwgeCwgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRleHQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IHRleHQuc2tldztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEuam9pbihcIlwiKS5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmxhcmdlb3ApIHtcbiAgICAgICAgICAgIHN2Zy55ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoc3ZnLmggLSBzdmcuZCkgLyAyIC8gc2NhbGU7XG4gICAgICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IHN2Zy5yIC0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBGT05UREFUQSA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBO1xuICAgICAgICBpZiAoIXRoaXMuR2V0KFwic3RyZXRjaHlcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYyA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoYy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudC5pc2EoTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFtjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVJbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjID0gRk9OVERBVEEuREVMSU1JVEVSU1tjLmNoYXJDb2RlQXQoMCldO1xuICAgICAgICB2YXIgY2FuID0gKGMgJiYgYy5kaXIgPT0gZGlyZWN0aW9uLnN1YnN0cigwLCAxKSk7XG4gICAgICAgIGlmICghY2FuKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSBjYW4gJiYgKHRoaXMuR2V0KFwibWluc2l6ZVwiLCB0cnVlKSB8fCB0aGlzLkdldChcIm1heHNpemVcIiwgdHJ1ZSkpO1xuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzeW1tZXRyaWNcIiwgXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiKTtcbiAgICAgICAgdmFyIGF4aXMgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHN2Zy5zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2ZyksIEg7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gMiAqIE1hdGgubWF4KGggLSBheGlzLCBkICsgYXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gaCArIGQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIEggPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIEgpKTtcbiAgICAgICAgaWYgKEggIT0gdmFsdWVzLm1pbnNpemUpIHtcbiAgICAgICAgICAgIEggPSBbTWF0aC5tYXgoSCAqIFV0aWwuVGVYLmRlbGltaXRlcmZhY3RvciAvIDEwMDAsIEggLSBVdGlsLlRlWC5kZWxpbWl0ZXJzaG9ydGZhbGwpLCBIXTtcbiAgICAgICAgfVxuICAgICAgICBzdmcgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCBILCBzdmcuc2NhbGUpO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAvIDIgKyBheGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAqIGggLyAoaCArIGQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy55ID0gSCAtIHN2Zy5oO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiLCBcIm1hdGh2YXJpYW50XCIsIFwiZm9udHdlaWdodFwiKTtcbiAgICAgICAgaWYgKCh2YWx1ZXMuZm9udHdlaWdodCA9PT0gXCJib2xkXCIgfHwgcGFyc2VJbnQodmFsdWVzLmZvbnR3ZWlnaHQpID49IDYwMCkgJiZcbiAgICAgICAgICAgICF0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHZhcmlhbnQgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLncpO1xuICAgICAgICB3ID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCB3KSk7XG4gICAgICAgIHN2ZyA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIHcsIHN2Zy5zY2FsZSwgdmFsdWVzLm1hdGh2YXJpYW50KTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1vTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNUGFkZGVkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGFkZGVkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBhZGRlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgcGFkID0gdGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIiwgXCJsc3BhY2VcIiwgXCJ2b2Zmc2V0XCIpLCBYID0gMCwgWSA9IDA7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmxzcGFjZSkge1xuICAgICAgICAgICAgICAgIFggPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy5sc3BhY2UsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMudm9mZnNldCkge1xuICAgICAgICAgICAgICAgIFkgPSB0aGlzLlNWR2xlbmd0aDJlbShwYWQsIHZhbHVlcy52b2Zmc2V0LCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaCA9IHBhZC5oLCBkID0gcGFkLmQsIHcgPSBwYWQudywgeSA9IHBhZC55O1xuICAgICAgICAgICAgc3ZnLkFkZChwYWQsIFgsIFkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBzdmcuaCA9IGggKyB5O1xuICAgICAgICAgICAgc3ZnLmQgPSBkIC0geTtcbiAgICAgICAgICAgIHN2Zy53ID0gdztcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmhlaWdodCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5oID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuaGVpZ2h0LCBtdSwgXCJoXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5kZXB0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy5kID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMuZGVwdGgsIG11LCBcImRcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLndpZHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLncgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy53aWR0aCwgbXUsIFwid1wiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaCA+IHN2Zy5IKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkggPSBzdmcuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChzdmcuZCA+IHN2Zy5EKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkQgPSBzdmcuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUuU1ZHbGVuZ3RoMmVtID0gZnVuY3Rpb24gKHN2ZywgbGVuZ3RoLCBtdSwgZCwgbSkge1xuICAgICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdGNoID0gU3RyaW5nKGxlbmd0aCkubWF0Y2goL3dpZHRofGhlaWdodHxkZXB0aC8pO1xuICAgICAgICB2YXIgc2l6ZSA9IChtYXRjaCA/IHN2Z1ttYXRjaFswXS5jaGFyQXQoMCldIDogKGQgPyBzdmdbZF0gOiAwKSk7XG4gICAgICAgIHZhciB2ID0gVXRpbC5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgc2l6ZSAvIHRoaXMubXNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICBpZiAoZCAmJiBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvXlxccypbLStdLykpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLm1heChtLCBzdmdbZF0gKyB2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTVBhZGRlZE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVBoYW50b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QaGFudG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBoYW50b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QaGFudG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUNoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1QaGFudG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3FydE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNxcnRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3FydE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApO1xuICAgICAgICB2YXIgcnVsZTtcbiAgICAgICAgdmFyIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIHZhciBxO1xuICAgICAgICB2YXIgSDtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIHJldHVybiBNU3FydE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVJvb3RNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb290TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvb3RNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLlNWR2NoaWxkU1ZHKDApO1xuICAgICAgICB2YXIgcnVsZTtcbiAgICAgICAgdmFyIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIHZhciBxO1xuICAgICAgICB2YXIgSDtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBpZiAodGhpcy5HZXQoXCJkaXNwbGF5c3R5bGVcIikpIHtcbiAgICAgICAgICAgIHAgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgcSA9IE1hdGgubWF4KHQgKyBwIC8gNCwgMTAwMCAqIFV0aWwuVGVYLm1pbl9yb290X3NwYWNlIC8gVXRpbC5lbSk7XG4gICAgICAgIEggPSBiYXNlLmggKyBiYXNlLmQgKyBxICsgdDtcbiAgICAgICAgc3VyZCA9IENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICB2YXIgZHggPSAoc3VyZC5pc011bHRpQ2hhciA/IC41NSA6IC42NSkgKiBzdXJkLnc7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMV0pIHtcbiAgICAgICAgICAgIHZhciByb290ID0gdGhpcy5kYXRhWzFdLnRvU1ZHKCk7XG4gICAgICAgICAgICByb290LnggPSAwO1xuICAgICAgICAgICAgdmFyIGggPSB0aGlzLlNWR3Jvb3RIZWlnaHQoc3VyZC5oICsgc3VyZC5kLCBzY2FsZSwgcm9vdCkgLSBkO1xuICAgICAgICAgICAgdmFyIHcgPSBNYXRoLm1pbihyb290LncsIHJvb3Qucik7XG4gICAgICAgICAgICB4ID0gTWF0aC5tYXgodywgZHgpO1xuICAgICAgICAgICAgc3ZnLkFkZChyb290LCB4IC0gdywgaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkeCA9IHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggLSBkeDtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR3Jvb3RIZWlnaHQgPSBmdW5jdGlvbiAoZCwgc2NhbGUsIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIC40NSAqIChkIC0gOTAwICogc2NhbGUpICsgNjAwICogc2NhbGUgKyBNYXRoLm1heCgwLCByb290LmQgLSA3NSk7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjLCBkLCB0aGlzKTtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGMsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjLCBkKTtcbiAgICB9O1xuICAgIHJldHVybiBNUm9vdE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVJvd01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvd01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb3dNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpXG4gICAgICAgICAgICBzdmcgPSB0aGlzLlNWR211bHRpbGluZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnBhcmVudC5saW5lYnJlYWtDb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYyAmJlxuICAgICAgICAgICAgc3ZnLncgPiB0aGlzLmVkaXRhYmxlU1ZHLmxpbmVicmVha1dpZHRoKSB8fCB0aGlzLmhhc05ld2xpbmUoKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHbXVsdGlsaW5lID0gZnVuY3Rpb24gKHNwYW4pIHtcbiAgICAgICAgcmV0dXJuIE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWRGaWxlKFwibXVsdGlsaW5lXCIpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgdyksIHN2Zy53LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yUGFzc3Rocm91Z2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uICYmXG4gICAgICAgICAgICB0aGlzLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54LCBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBpZiAodGhpcy5pc0N1cnNvclBhc3N0aHJvdWdoKCkgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gdGhpcy5kYXRhW2NoaWxkSWR4XSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGRJZHggPT09IHRoaXMuZGF0YS5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNwZWNpZmllZCBjaGlsZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjaGlsZElkeCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHggKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHRoaXMuZGF0YVtjaGlsZElkeF07XG4gICAgICAgICAgICB2YXIgYmIgPSBjaGlsZC5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmIueCArIChiYi53aWR0aCAvIDIpO1xuICAgICAgICAgICAgaWYgKHggPCBtaWRwb2ludCkge1xuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5kYXRhLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgaWYgKHZlcnRpY2FsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB2YXIgbmV3UG9zaXRpb24gPSBjdXJzb3IucG9zaXRpb24gKyAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IC0xIDogMSk7XG4gICAgICAgIGlmIChuZXdQb3NpdGlvbiA8IDAgfHwgbmV3UG9zaXRpb24gPiB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGRQb3NpdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyBjdXJzb3IucG9zaXRpb24gLSAxIDogY3Vyc29yLnBvc2l0aW9uO1xuICAgICAgICBpZiAoY3Vyc29yLm1vZGUgPT09IGN1cnNvci5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbY2hpbGRQb3NpdGlvbl0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHByZWVkZ2U7XG4gICAgICAgIHZhciBwb3N0ZWRnZTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcHJlZWRnZSA9IGJib3gueDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmVib3ggPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcHJlZWRnZSA9IHByZWJveC54ICsgcHJlYm94LndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gYmJveC54ICsgYmJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3N0Ym94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgcG9zdGVkZ2UgPSBwb3N0Ym94Lng7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHggPSAocG9zdGVkZ2UgKyBwcmVlZGdlKSAvIDI7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3JIaWdobGlnaHQgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgaWYgKGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB2YXIgY3VyID0gY3Vyc29yLnNlbGVjdGlvblN0YXJ0Lm5vZGU7XG4gICAgICAgICAgICB2YXIgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgd2hpbGUgKGN1cikge1xuICAgICAgICAgICAgICAgIGlmIChjdXIucGFyZW50ID09PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5kYXRhLmluZGV4T2YoY3VyKSArIDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXIgPSBjdXIucGFyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHNlbGVjdGlvblN0YXJ0IG5vdCBpbiBtcm93XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uRW5kLm5vZGUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zMSA9IE1hdGgubWluKGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIHZhciBwb3MyID0gTWF0aC5tYXgoY3Vyc29yLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCBjdXJzb3Iuc2VsZWN0aW9uRW5kLnBvc2l0aW9uKTtcbiAgICAgICAgaWYgKHBvczEgPT09IHBvczIpIHtcbiAgICAgICAgICAgIGN1cnNvci5jbGVhckhpZ2hsaWdodCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB4MSA9IHRoaXMuZGF0YVtwb3MxXS5nZXRTVkdCQm94KCkueDtcbiAgICAgICAgdmFyIHBvczJiYiA9IHRoaXMuZGF0YVtwb3MyIC0gMV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgeDIgPSBwb3MyYmIueCArIHBvczJiYi53aWR0aDtcbiAgICAgICAgdmFyIHdpZHRoID0geDIgLSB4MTtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIHgxLCBiYi55LCB3aWR0aCwgYmIuaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNUm93TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTXNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTXNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1TcGFjZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNwYWNlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNwYWNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3BhY2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIik7XG4gICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMubWF0aGJhY2tncm91bmQ7XG4gICAgICAgIGlmICh0aGlzLmJhY2tncm91bmQgJiYgIXRoaXMubWF0aGJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMuYmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLm1zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHN2Zy5oID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmhlaWdodCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy5kID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmRlcHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIGlmIChzdmcudyA8IDApIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmggPCAtc3ZnLmQpIHtcbiAgICAgICAgICAgIHN2Zy5kID0gLXN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5sID0gMDtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1TcGFjZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVN0eWxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3R5bGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3R5bGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIG1hdGggPSBzdmcuQWRkKHRoaXMuZGF0YVswXS50b1NWRygpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgaWYgKG1hdGguaWMpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBtYXRoLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN0eWxlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3ViU3VwTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3ViU3VwTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN1YlN1cE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAxO1xuICAgIH1cbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKSwgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQodGhpcy5iYXNlLCBIVywgRCkpO1xuICAgICAgICB2YXIgc3NjYWxlID0gKHRoaXMuZGF0YVt0aGlzLnN1cF0gfHwgdGhpcy5kYXRhW3RoaXMuc3ViXSB8fCB0aGlzKS5TVkdnZXRTY2FsZSgpO1xuICAgICAgICB2YXIgeF9oZWlnaHQgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlLCBzID0gVXRpbC5UZVguc2NyaXB0c3BhY2UgKiBzY2FsZTtcbiAgICAgICAgdmFyIHN1cCwgc3ViO1xuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdXBdKSkge1xuICAgICAgICAgICAgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXS50b1NWRygpO1xuICAgICAgICAgICAgc3VwLncgKz0gcztcbiAgICAgICAgICAgIHN1cC5yID0gTWF0aC5tYXgoc3VwLncsIHN1cC5yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdWJdKSkge1xuICAgICAgICAgICAgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXS50b1NWRygpO1xuICAgICAgICAgICAgc3ViLncgKz0gcztcbiAgICAgICAgICAgIHN1Yi5yID0gTWF0aC5tYXgoc3ViLncsIHN1Yi5yKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IFV0aWwuVGVYLnN1cF9kcm9wICogc3NjYWxlLCByID0gVXRpbC5UZVguc3ViX2Ryb3AgKiBzc2NhbGU7XG4gICAgICAgIHZhciB1ID0gYmFzZS5oICsgKGJhc2UueSB8fCAwKSAtIHEsIHYgPSBiYXNlLmQgLSAoYmFzZS55IHx8IDApICsgciwgZGVsdGEgPSAwLCBwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgYmFzZS53IC09IGJhc2UuaWM7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdICYmXG4gICAgICAgICAgICAodGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtaVwiIHx8IHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibW9cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIGJhc2Uuc2NhbGUgPT09IDEgJiZcbiAgICAgICAgICAgICAgICAhYmFzZS5zdHJldGNoZWQgJiYgIXRoaXMuZGF0YVt0aGlzLmJhc2VdLkdldChcImxhcmdlb3BcIikpIHtcbiAgICAgICAgICAgICAgICB1ID0gdiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuZ2V0VmFsdWVzKFwic3Vic2NyaXB0c2hpZnRcIiwgXCJzdXBlcnNjcmlwdHNoaWZ0XCIpO1xuICAgICAgICBtaW4uc3Vic2NyaXB0c2hpZnQgPSAobWluLnN1YnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdWJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgbWluLnN1cGVyc2NyaXB0c2hpZnQgPSAobWluLnN1cGVyc2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1cGVyc2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIHZhciB4ID0gYmFzZS53ICsgYmFzZS54O1xuICAgICAgICBpZiAoIXN1cCkge1xuICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIxICogc2NhbGUsIHN1Yi5oIC0gKDQgLyA1KSAqIHhfaGVpZ2h0LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtdik7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwidGV4cHJpbWVzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBwID0gVXRpbC5UZVhbKHZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcInN1cDFcIiA6ICh2YWx1ZXMudGV4cHJpbWVzdHlsZSA/IFwic3VwM1wiIDogXCJzdXAyXCIpKV07XG4gICAgICAgICAgICAgICAgdSA9IE1hdGgubWF4KHUsIHAgKiBzY2FsZSwgc3VwLmQgKyAoMSAvIDQpICogeF9oZWlnaHQsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCB1KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gdTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIyICogc2NhbGUpO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICBpZiAoKHUgLSBzdXAuZCkgLSAoc3ViLmggLSB2KSA8IDMgKiB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSAzICogdCAtIHUgKyBzdXAuZCArIHN1Yi5oO1xuICAgICAgICAgICAgICAgICAgICBxID0gKDQgLyA1KSAqIHhfaGVpZ2h0IC0gKHUgLSBzdXAuZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdSArPSBxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiAtPSBxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keCA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR5ID0gTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgZGVzdDtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGRlc3QgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXTtcbiAgICAgICAgICAgIGlmIChkZXN0LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlc3QubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAxIDogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgdmFyIHNtYWxsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgPyB0aGlzLnN1YiA6IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIGJhc2VCQiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIGlmICghYmFzZUJCIHx8ICFjdXJzb3IucmVuZGVyZWRQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5kYXRhW3NtYWxsXSA/IHNtYWxsIDogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAmJiB0aGlzLmRhdGFbc21hbGxdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtzbWFsbF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtzbWFsbF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmRhdGFbc21hbGxdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHNtYWxsLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYi54ICsgYmIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggLyAyID8gMSA6IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzZWN0aW9uLCBwb3M7XG4gICAgICAgIHZhciBjaGlsZElkeDtcbiAgICAgICAgZm9yIChjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5kYXRhLmxlbmd0aDsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgaWYgKGNoaWxkID09PSB0aGlzLmRhdGFbY2hpbGRJZHhdKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZElkeCA9PT0gdGhpcy5kYXRhLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgc3BlY2lmaWVkIGNoaWxkIGluIGNoaWxkcmVuJyk7XG4gICAgICAgIHZhciBjdXJyZW50U2VjdGlvbiA9IGNoaWxkSWR4O1xuICAgICAgICB2YXIgb2xkID0gW2N1cnNvci5ub2RlLCBjdXJzb3IucG9zaXRpb25dO1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IGN1cnJlbnRTZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCA/IDEgOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF0aGlzLm1vdmVDdXJzb3IoY3Vyc29yLCBkaXJlY3Rpb24pKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvLmFwcGx5KGN1cnNvciwgb2xkKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DbGljayA9IGZ1bmN0aW9uIChjdXJzb3IsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzLmRhdGFbMF07XG4gICAgICAgIHZhciBiYXNlQkIgPSBiYXNlLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIHZhciBzdWJCQiA9IHN1YiAmJiBzdWIuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1cEJCID0gc3VwICYmIHN1cC5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzZWN0aW9uO1xuICAgICAgICB2YXIgcG9zO1xuICAgICAgICBpZiAoc3ViQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdWJCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1YjtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1YkJCLnggKyAoc3ViQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdXBCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1cEJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3VwO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3VwQkIueCArIChzdXBCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGJhc2UuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5iYXNlO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gYmFzZUJCLnggKyAoYmFzZUJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBzZWN0aW9uLFxuICAgICAgICAgICAgcG9zOiBwb3MsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3ViLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLnN1YixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2FsID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTjtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJblZlcnRpY2FsbHkgPSB2ZXJ0aWNhbCAmJiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApID09PSAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViKTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbkhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgICAgICAgIHZhciBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0F3YXkgPSB2ZXJ0aWNhbCA/ICFtb3ZpbmdJblZlcnRpY2FsbHkgOiAhdGhpcy5yaWdodE1vdmVTdGF5ICYmIG1vdmVSaWdodEhvcml6b250YWxseTtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdJbiA9IG1vdmluZ0luVmVydGljYWxseSB8fCBtb3ZpbmdJbkhvcml6b250YWxseSB8fCBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgJiYgdGhpcy5yaWdodE1vdmVTdGF5O1xuICAgICAgICAgICAgaWYgKG1vdmluZ0F3YXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtb3ZpbmdJbikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3RoaXMuYmFzZV0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIgPyBEaXJlY3Rpb24uVVAgOiBEaXJlY3Rpb24uRE9XTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IG1vdmVSaWdodEhvcml6b250YWxseSA/IDEgOiB0aGlzLmVuZGluZ1BvcyB8fCAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24ucG9zID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA/IDAgOiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYjtcbiAgICAgICAgdmFyIHgsIHksIGhlaWdodDtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgdmFyIG1haW5CQiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IG1haW5CQi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gbWFpbkJCLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJiID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5zZWN0aW9uXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gYmIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IGJiLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICB4ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCA/IGJiLnggOiBiYi54ICsgYmIud2lkdGg7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICByZXR1cm4gY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdWJTdXBNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1UYWJsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGFibGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2F1dG9sb2FkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVRhYmxlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVGV4dE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRleHRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGV4dE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRleHRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgICAgICB2YXIgZGVmID0geyBkaXJlY3Rpb246IHRoaXMuR2V0KFwiZGlyXCIpIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVEVYVChzY2FsZSAqIDEwMCAvIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5zY2FsZSwgdGhpcy5kYXRhLmpvaW4oXCJcIiksIGRlZikpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UZXh0TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVW5kZXJPdmVyTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVW5kZXJPdmVyTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVVuZGVyT3Zlck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAwO1xuICAgICAgICB0aGlzLnJpZ2h0TW92ZVN0YXkgPSB0cnVlO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2VtYW50aWNzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBUZVhBdG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhUZVhBdG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVGVYQXRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVEVYQ0xBU1MuVkNFTlRFUikge1xuICAgICAgICAgICAgICAgIHkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChib3guaCArIGJveC5kKSAvIDIgKyBib3guZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94LCAwLCB5KTtcbiAgICAgICAgICAgIHN2Zy5pYyA9IGJveC5pYztcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gYm94LnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVYQXRvbSBkcmF3Q3Vyc29yIE5PVCBJTVBMRU1FTlRFRCcpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBUZVhBdG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
