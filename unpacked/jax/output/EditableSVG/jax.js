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
            var result = Parser.parseControlSequence(latex);
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
        mathjaxParser.csUndefined = mathjaxParser.csFindMacro = function () { };
        mathjaxParser.GetCS = function () { return cs; };
        mathjaxParser.mmlToken = function (x) { return x; };
        mathjaxParser.Push = (function (x) { result = x; });
        mathjaxParser.ControlSequence();
        return result;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpheC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiamF4LmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIERpcmVjdGlvbjtcbihmdW5jdGlvbiAoRGlyZWN0aW9uKSB7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlVQXCJdID0gMF0gPSBcIlVQXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIlJJR0hUXCJdID0gMV0gPSBcIlJJR0hUXCI7XG4gICAgRGlyZWN0aW9uW0RpcmVjdGlvbltcIkRPV05cIl0gPSAyXSA9IFwiRE9XTlwiO1xuICAgIERpcmVjdGlvbltEaXJlY3Rpb25bXCJMRUZUXCJdID0gM10gPSBcIkxFRlRcIjtcbn0pKERpcmVjdGlvbiB8fCAoRGlyZWN0aW9uID0ge30pKTtcbnZhciBDdXJzb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEN1cnNvcigpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICB0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIpO1xuICAgICAgICB0aGlzLndpZHRoID0gNTA7XG4gICAgfVxuICAgIEN1cnNvci5wcm90b3R5cGUucmVmb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm5vZGUgfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtIHx8XG4gICAgICAgICAgICAhdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQgfHxcbiAgICAgICAgICAgICF0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgcGFyZW50LmZvY3VzKCk7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tb3ZlVG9DbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICB2YXIgc3ZnID0gdGFyZ2V0Lm5vZGVOYW1lID09PSAnc3ZnJyA/IHRhcmdldCA6IHRhcmdldC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY3AgPSBVdGlsLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3JkcyhzdmcsIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xuICAgICAgICB2YXIgamF4ID0gVXRpbC5nZXRKYXhGcm9tTWF0aChzdmcucGFyZW50Tm9kZSk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gamF4LnJvb3Q7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZEl0ZW1zID0gY3VycmVudC5kYXRhLmZpbHRlcihmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQobm9kZSwgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2h1aD8gbWF0Y2hlZCBtb3JlIHRoYW4gb25lIGNoaWxkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtYXRjaGVkSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IG1hdGNoZWRJdGVtc1swXTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IG1hdGNoZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50Lm1vdmVDdXJzb3JGcm9tQ2xpY2sodGhpcywgY3AueCwgY3AueSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uIChub2RlLCBwb3NpdGlvbikge1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0ggJiYgIW5vZGUuYmFja3NsYXNoUm93KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnVwZGF0ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uIChzaGlmdEtleSkge1xuICAgICAgICBpZiAoc2hpZnRLZXkgJiYgdGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUwpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTjtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBpZiAoc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHRoaXMuc2VsZWN0aW9uRW5kID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFySGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24sIHNoaWZ0S2V5KSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uKHNoaWZ0S2V5KTtcbiAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgZGlyZWN0aW9uKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ub2RlLmRyYXdDdXJzb3IodGhpcyk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHJlY2FsbCkge1xuICAgICAgICB2YXIgZGlyZWN0aW9uO1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgICAgdGhpcy5iYWNrc3BhY2UoZXZlbnQsIHJlY2FsbCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdEJhY2tzbGFzaE1vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgdGhpcy5tb3ZlKGRpcmVjdGlvbiwgZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1vdXNlZG93biA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uKGV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgICAgdGhpcy5tb3ZlVG9DbGljayhldmVudCk7XG4gICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlSG9sZUlmTmVlZGVkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBob2xlID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ob2xlKCk7XG4gICAgICAgICAgICB2YXIgcm93aW5kZXggPSBub2RlLnBhcmVudC5kYXRhLmluZGV4T2Yobm9kZSk7XG4gICAgICAgICAgICBub2RlLnBhcmVudC5TZXREYXRhKHJvd2luZGV4LCBob2xlKTtcbiAgICAgICAgICAgIGhvbGUubW92ZUN1cnNvckZyb21QYXJlbnQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZXhpdEJhY2tzbGFzaE1vZGUgPSBmdW5jdGlvbiAocmVwbGFjZSkge1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHZhciBwcG9zID0gdGhpcy5ub2RlLnBhcmVudC5kYXRhLmluZGV4T2YodGhpcy5ub2RlKTtcbiAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50LmRhdGEuc3BsaWNlKHBwb3MsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudC5TZXREYXRhKHBwb3MrKywgcmVwbGFjZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlcGxhY2UgJiYgcmVwbGFjZS5tb3ZlQ3Vyc29yQWZ0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMubW92ZVRvLmFwcGx5KHRoaXMsIHJlcGxhY2UubW92ZUN1cnNvckFmdGVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubW92ZVRvKHRoaXMubm9kZS5wYXJlbnQsIHBwb3MpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmJhY2tzcGFjZSA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT04pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGlvblN0YXJ0Lm5vZGUudHlwZSA9PT0gJ21yb3cnICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlID09PSB0aGlzLnNlbGVjdGlvbkVuZC5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbih0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdmFyIHBvczIgPSBNYXRoLm1heCh0aGlzLnNlbGVjdGlvblN0YXJ0LnBvc2l0aW9uLCB0aGlzLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydC5ub2RlLmRhdGEuc3BsaWNlKHBvczEsIHBvczIgLSBwb3MxKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm5vZGUsIHBvczEpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VIb2xlSWZOZWVkZWQodGhpcy5ub2RlKTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9uJ3Qga25vdyBob3cgdG8gZG8gdGhpcyBiYWNrc3BhY2VcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS50eXBlID09PSAnbXJvdycpIHtcbiAgICAgICAgICAgIHZhciBwcmV2ID0gdGhpcy5ub2RlLmRhdGFbdGhpcy5wb3NpdGlvbiAtIDFdO1xuICAgICAgICAgICAgaWYgKCFwcmV2LmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIICYmIHRoaXMubm9kZS5kYXRhLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5kYXRhLnNwbGljZSh0aGlzLnBvc2l0aW9uIC0gMSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWtlSG9sZUlmTmVlZGVkKHRoaXMubm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5TRUxFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogdGhpcy5ub2RlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IHRoaXMubm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucG9zaXRpb24gLSAxXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZWNhbGwoWydyZWZvY3VzJywgdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMubm9kZS50eXBlID09PSAnaG9sZScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiYWNrc3BhY2Ugb24gaG9sZSEnKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5tYWtlRW50aXR5TW8gPSBmdW5jdGlvbiAodW5pY29kZSkge1xuICAgICAgICB2YXIgbW8gPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbygpO1xuICAgICAgICB2YXIgZW50aXR5ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuZW50aXR5KCk7XG4gICAgICAgIGVudGl0eS5BcHBlbmQodW5pY29kZSk7XG4gICAgICAgIG1vLkFwcGVuZChlbnRpdHkpO1xuICAgICAgICByZXR1cm4gbW87XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLm1ha2VFbnRpdHlNaSA9IGZ1bmN0aW9uICh1bmljb2RlKSB7XG4gICAgICAgIHZhciBtaSA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1pKCk7XG4gICAgICAgIHZhciBlbnRpdHkgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5lbnRpdHkoKTtcbiAgICAgICAgZW50aXR5LkFwcGVuZCh1bmljb2RlKTtcbiAgICAgICAgbWkuQXBwZW5kKGVudGl0eSk7XG4gICAgICAgIHJldHVybiBtaTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuY3JlYXRlQW5kTW92ZUludG9Ib2xlID0gZnVuY3Rpb24gKG1zdWJzdXAsIGluZGV4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdDUkVBVElORyBIT0xFJyk7XG4gICAgICAgIHZhciBob2xlID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuaG9sZSgpO1xuICAgICAgICBtc3Vic3VwLlNldERhdGEoaW5kZXgsIGhvbGUpO1xuICAgICAgICB0aGlzLm1vdmVUbyhob2xlLCAwKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGFuZGxlU3VwZXJPclN1YnNjcmlwdCA9IGZ1bmN0aW9uIChyZWNhbGwsIGMpIHtcbiAgICAgICAgaWYgKHRoaXMucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJldiA9IHRoaXMubm9kZS5kYXRhW3RoaXMucG9zaXRpb24gLSAxXTtcbiAgICAgICAgdmFyIGluZGV4ID0gKGMgPT09IFwiX1wiKSA/IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1YiA6IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCgpLnN1cDtcbiAgICAgICAgaWYgKHByZXYudHlwZSA9PT0gXCJtc3Vic3VwXCIgfHwgcHJldi50eXBlID09PSBcIm11bmRlcm92ZXJcIikge1xuICAgICAgICAgICAgaWYgKHByZXYuZGF0YVtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpbmcgPSBwcmV2LmRhdGFbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICh0aGluZy5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGluZy5tb3ZlQ3Vyc29yRnJvbVBhcmVudCh0aGlzLCBEaXJlY3Rpb24uTEVGVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVUbyhwcmV2LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvczogMSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVBbmRNb3ZlSW50b0hvbGUocHJldiwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1zdWJzdXAgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1zdWJzdXAoKTtcbiAgICAgICAgICAgIG1zdWJzdXAuU2V0RGF0YShtc3Vic3VwLmJhc2UsIHByZXYpO1xuICAgICAgICAgICAgdGhpcy5ub2RlLlNldERhdGEodGhpcy5wb3NpdGlvbiAtIDEsIG1zdWJzdXApO1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVBbmRNb3ZlSW50b0hvbGUobXN1YnN1cCwgaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJlY2FsbChbJ3JlZm9jdXMnLCB0aGlzXSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmhhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHJlY2FsbCwgYykge1xuICAgICAgICBpZiAodGhpcy5tb2RlID09PSBDdXJzb3IuQ3Vyc29yTW9kZS5CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgIHZhciBsYXRleCA9IFwiXCI7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHRoaXMubm9kZS5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1pID0gdGhpcy5ub2RlLmRhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKG1pLnR5cGUgIT09ICdtaScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBub24taWRlbnRpZmllciBpbiBiYWNrc2xhc2ggZXhwcmVzc2lvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2hhcnMgPSBtaS5kYXRhWzBdO1xuICAgICAgICAgICAgICAgIGxhdGV4ICs9IGNoYXJzLmRhdGFbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gUGFyc2VyLnBhcnNlQ29udHJvbFNlcXVlbmNlKGxhdGV4KTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlLkVkaXRhYmxlU1ZHZWxlbS5jbGFzc0xpc3QuYWRkKCdpbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1yb3cgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBtcm93LnBhcmVudC5kYXRhLmluZGV4T2YobXJvdyk7XG4gICAgICAgICAgICB0aGlzLmV4aXRCYWNrc2xhc2hNb2RlKHJlc3VsdCk7XG4gICAgICAgICAgICByZWNhbGwoW3RoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLm1vdmVDdXJzb3IodGhpcywgJ3InKTtcbiAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlID0gQ3Vyc29yLkN1cnNvck1vZGUuTk9STUFMO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uIChldmVudCwgcmVjYWxsKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBjb2RlID0gZXZlbnQuY2hhckNvZGUgfHwgZXZlbnQua2V5Q29kZSB8fCBldmVudC53aGljaDtcbiAgICAgICAgdmFyIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgICB2YXIgdG9JbnNlcnQ7XG4gICAgICAgIGlmICghdGhpcy5ub2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdob2xlJykge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMubm9kZS5wYXJlbnQ7XG4gICAgICAgICAgICB2YXIgaG9sZUluZGV4ID0gcGFyZW50LmRhdGEuaW5kZXhPZih0aGlzLm5vZGUpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IE1hdGhKYXguRWxlbWVudEpheC5tbWwubXJvdygpO1xuICAgICAgICAgICAgcGFyZW50LlNldERhdGEoaG9sZUluZGV4LCByb3cpO1xuICAgICAgICAgICAgcm93Lm1vdmVDdXJzb3JGcm9tUGFyZW50KHRoaXMsIERpcmVjdGlvbi5SSUdIVCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubW9kZSA9PT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUuRWRpdGFibGVTVkdlbGVtLmNsYXNzTGlzdC5yZW1vdmUoJ2ludmFsaWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgaWYgKGMgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubW9kZSAhPT0gQ3Vyc29yLkN1cnNvck1vZGUuQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZSA9IEN1cnNvci5DdXJzb3JNb2RlLkJBQ0tTTEFTSDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyYXlSb3cgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gwMDVDJykpKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JheVJvdy5iYWNrc2xhc2hSb3cgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUuZGF0YS5zcGxpY2UodGhpcy5wb3NpdGlvbiwgMCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS5TZXREYXRhKHRoaXMucG9zaXRpb24sIGdyYXlSb3cpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ2xhc3MgPSBncmF5Um93LmNscyA/IGdyYXlSb3cuY2xzICsgJyAnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGdyYXlSb3cuY2xzID0gb2xkQ2xhc3MgKyBcImJhY2tzbGFzaC1tb2RlXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvKGdyYXlSb3csIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVE9ETzogaW5zZXJ0IGEgXFxcXCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiXlwiIHx8IGMgPT09IFwiX1wiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VwZXJPclN1YnNjcmlwdChyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIgXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTcGFjZShyZWNhbGwsIGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLmxldHRlci50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5taShuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChNYXRoSmF4LklucHV0SmF4LlRlWC5EZWZpbml0aW9ucy5udW1iZXIudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHRvSW5zZXJ0ID0gbmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwubW4obmV3IE1hdGhKYXguRWxlbWVudEpheC5tbWwuY2hhcnMoYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pIHtcbiAgICAgICAgICAgICAgICB0b0luc2VydCA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1vKG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLmVudGl0eSgnI3gnICsgTWF0aEpheC5JbnB1dEpheC5UZVguRGVmaW5pdGlvbnMucmVtYXBbY10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGMgPT09ICcrJyB8fCBjID09PSAnLycgfHwgYyA9PT0gJz0nIHx8IGMgPT09ICcuJyB8fCBjID09PSAnKCcgfHwgYyA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgdG9JbnNlcnQgPSBuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tbyhuZXcgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5jaGFycyhjKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0b0luc2VydClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5ub2RlLmRhdGEuc3BsaWNlKHRoaXMucG9zaXRpb24sIDAsIG51bGwpO1xuICAgICAgICB0aGlzLm5vZGUuU2V0RGF0YSh0aGlzLnBvc2l0aW9uLCB0b0luc2VydCk7XG4gICAgICAgIHJlY2FsbChbdGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUklHSFQpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmb2N1cygpO1xuICAgICAgICAgICAgfV0pO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5jbGVhckJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ib3hlcykge1xuICAgICAgICAgICAgdGhpcy5ib3hlcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm94ZXMgPSBbXTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuaGlnaGxpZ2h0Qm94ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBjdXIgPSB0aGlzLm5vZGU7XG4gICAgICAgIHRoaXMuY2xlYXJCb3hlcygpO1xuICAgICAgICB3aGlsZSAoY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gY3VyLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlcyA9IHRoaXMuYm94ZXMuY29uY2F0KFV0aWwuaGlnaGxpZ2h0Qm94KHN2ZywgYmIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vyc29yLScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZmluZEhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZHJhd0F0ID0gZnVuY3Rpb24gKHN2Z2VsZW0sIHgsIHksIGhlaWdodCwgc2tpcFNjcm9sbCkge1xuICAgICAgICB0aGlzLnJlbmRlcmVkUG9zaXRpb24gPSB7IHg6IHgsIHk6IHksIGhlaWdodDogaGVpZ2h0IH07XG4gICAgICAgIHZhciBjZWxlbSA9IHRoaXMuZmluZEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICcjNzc3Nzc3Jyk7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21hdGgtY3Vyc29yJyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItJyArIHRoaXMuaWQ7XG4gICAgICAgICAgICBzdmdlbGVtLmFwcGVuZENoaWxkKGNlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRjbGFzcyA9IGNlbGVtLmdldEF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBvbGRjbGFzcy5zcGxpdCgnYmxpbmsnKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdGhpcy53aWR0aC50b1N0cmluZygpKTtcbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5zdGFydEJsaW5rKTtcbiAgICAgICAgdGhpcy5zdGFydEJsaW5rID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgY2VsZW0uZ2V0QXR0cmlidXRlKCdjbGFzcycpICsgJyBibGluaycpO1xuICAgICAgICB9LmJpbmQodGhpcyksIDUwMCk7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0Qm94ZXMoc3ZnZWxlbSk7XG4gICAgICAgIGlmICh0aGlzLm1vZGUgPT09IEN1cnNvci5DdXJzb3JNb2RlLlNFTEVDVElPTikge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uRW5kLm5vZGUudHlwZSA9PT0gJ21yb3cnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmQubm9kZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0KHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBNYXRoSmF4Lkh1Yi5nZXRBbGxKYXgoJyMnICsgc3ZnZWxlbS5wYXJlbnROb2RlLmlkKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZpc3VhbGl6ZUpheChqYXgsICcjbW1sdml6JywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHZpc3VhbGl6ZSBqYXgnLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2tpcFNjcm9sbClcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsSW50b1ZpZXcoc3ZnZWxlbSk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmNsZWFySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLm1vZGUgPSBDdXJzb3IuQ3Vyc29yTW9kZS5OT1JNQUw7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZCA9IG51bGw7XG4gICAgICAgIHRoaXMuaGlkZUhpZ2hsaWdodCgpO1xuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5oaWRlSGlnaGxpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKGNlbGVtKSB7XG4gICAgICAgICAgICBjZWxlbS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5kcmF3SGlnaGxpZ2h0QXQgPSBmdW5jdGlvbiAoc3ZnZWxlbSwgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgY2VsZW0gPSB0aGlzLmZpbmRIaWdobGlnaHQoKTtcbiAgICAgICAgaWYgKCFjZWxlbSkge1xuICAgICAgICAgICAgY2VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3JlY3QnKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnZmlsbCcsICdyZ2JhKDE3MywgMjE2LCAyNTAsIDAuNSknKTtcbiAgICAgICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnbWF0aC1jdXJzb3ItaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICBjZWxlbS5pZCA9ICdjdXJzb3ItaGlnaGxpZ2h0LScgKyB0aGlzLmlkO1xuICAgICAgICAgICAgc3ZnZWxlbS5hcHBlbmRDaGlsZChjZWxlbSk7XG4gICAgICAgIH1cbiAgICAgICAgY2VsZW0uc2V0QXR0cmlidXRlKCd4JywgeCk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgneScsIHkpO1xuICAgICAgICBjZWxlbS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdyk7XG4gICAgICAgIGNlbGVtLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24gKHN2Z2VsZW0pIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlbmRlcmVkUG9zaXRpb24pXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciB4ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLng7XG4gICAgICAgIHZhciB5ID0gdGhpcy5yZW5kZXJlZFBvc2l0aW9uLnk7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLnJlbmRlcmVkUG9zaXRpb24uaGVpZ2h0O1xuICAgICAgICB2YXIgY2xpZW50UG9pbnQgPSBVdGlsLmVsZW1Db29yZHNUb1NjcmVlbkNvb3JkcyhzdmdlbGVtLCB4LCB5ICsgaGVpZ2h0IC8gMik7XG4gICAgICAgIHZhciBjbGllbnRXaWR0aCA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG4gICAgICAgIHZhciBjbGllbnRIZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcbiAgICAgICAgdmFyIHN4ID0gMCwgc3kgPSAwO1xuICAgICAgICBpZiAoY2xpZW50UG9pbnQueCA8IDAgfHwgY2xpZW50UG9pbnQueCA+IGNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzeCA9IGNsaWVudFBvaW50LnggLSBjbGllbnRXaWR0aCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNsaWVudFBvaW50LnkgPCAwIHx8IGNsaWVudFBvaW50LnkgPiBjbGllbnRIZWlnaHQpIHtcbiAgICAgICAgICAgIHN5ID0gY2xpZW50UG9pbnQueSAtIGNsaWVudEhlaWdodCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN4IHx8IHN5KSB7XG4gICAgICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoc3gsIHN5KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLmZpbmRFbGVtZW50KCk7XG4gICAgICAgIGlmIChjdXJzb3IpXG4gICAgICAgICAgICBjdXJzb3IucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmJsdXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jbGVhckJveGVzKCk7XG4gICAgfTtcbiAgICBDdXJzb3IucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9O1xuICAgIEN1cnNvci5wcm90b3R5cGUuZm9jdXNGaXJzdEhvbGUgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICBpZiAoIXJvb3QpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChyb290LnR5cGUgPT09IFwiaG9sZVwiKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUgPSByb290O1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mb2N1c0ZpcnN0SG9sZShyb290LmRhdGFbaV0pKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIEN1cnNvci5DdXJzb3JNb2RlID0ge1xuICAgICAgICBCQUNLU0xBU0g6IFwiYmFja3NsYXNoXCIsXG4gICAgICAgIE5PUk1BTDogXCJub3JtYWxcIixcbiAgICAgICAgU0VMRUNUSU9OOiBcInNlbGVjdGlvblwiXG4gICAgfTtcbiAgICByZXR1cm4gQ3Vyc29yO1xufSkoKTtcbnZhciBFZGl0YWJsZVNWR0NvbmZpZyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRWRpdGFibGVTVkdDb25maWcoKSB7XG4gICAgfVxuICAgIEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlcyA9IHtcbiAgICAgICAgXCIuTWF0aEpheF9TVkdcIjoge1xuICAgICAgICAgICAgXCJkaXNwbGF5XCI6IFwiaW5saW5lXCIsXG4gICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwibGluZS1oZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiMTAwJVwiLFxuICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJ0ZXh0LWluZGVudFwiOiAwLFxuICAgICAgICAgICAgXCJ0ZXh0LWFsaWduXCI6IFwibGVmdFwiLFxuICAgICAgICAgICAgXCJ0ZXh0LXRyYW5zZm9ybVwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibGV0dGVyLXNwYWNpbmdcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgIFwid29yZC1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcIndvcmQtd3JhcFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJ3aGl0ZS1zcGFjZVwiOiBcIm5vd3JhcFwiLFxuICAgICAgICAgICAgXCJmbG9hdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IFwibHRyXCIsXG4gICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfRGlzcGxheVwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJyZWxhdGl2ZVwiLFxuICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LXdpZHRoXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgd2lkdGg6IFwiMTAwJVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHICpcIjoge1xuICAgICAgICAgICAgdHJhbnNpdGlvbjogXCJub25lXCIsXG4gICAgICAgICAgICBcIi13ZWJraXQtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW1vei10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCItbXMtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiLW8tdHJhbnNpdGlvblwiOiBcIm5vbmVcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5tangtc3ZnLWhyZWZcIjoge1xuICAgICAgICAgICAgZmlsbDogXCJibHVlXCIsXG4gICAgICAgICAgICBzdHJva2U6IFwiYmx1ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjoge1xuICAgICAgICAgICAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIuTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI6IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZSFpbXBvcnRhbnRcIlxuICAgICAgICB9LFxuICAgICAgICBcIi5NYXRoSmF4X1NWR19FeEJveFwiOiB7XG4gICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICB3aWR0aDogXCIxcHhcIixcbiAgICAgICAgICAgIGhlaWdodDogXCI2MGV4XCIsXG4gICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCIjTWF0aEpheF9TVkdfVG9vbHRpcFwiOiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgIGhlaWdodDogXCJhdXRvXCIsXG4gICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmVcIlxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkdDb25maWc7XG59KSgpO1xudmFyIEVkaXRhYmxlU1ZHID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFZGl0YWJsZVNWRygpIHtcbiAgICAgICAgdGhpcy5UT1VDSCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCA9IHRydWU7XG4gICAgICAgIHRoaXMuZm9udE5hbWVzID0gW1wiVGVYXCIsIFwiU1RJWFwiLCBcIlNUSVgtV2ViXCIsIFwiQXNhbmEtTWF0aFwiLFxuICAgICAgICAgICAgXCJHeXJlLVRlcm1lc1wiLCBcIkd5cmUtUGFnZWxsYVwiLCBcIkxhdGluLU1vZGVyblwiLCBcIk5lby1FdWxlclwiXTtcbiAgICAgICAgdGhpcy5UZXh0Tm9kZSA9IE1hdGhKYXguSFRNTC5UZXh0Tm9kZTtcbiAgICAgICAgdGhpcy5hZGRUZXh0ID0gTWF0aEpheC5IVE1MLmFkZFRleHQ7XG4gICAgICAgIHRoaXMudWNNYXRjaCA9IE1hdGhKYXguSFRNTC51Y01hdGNoO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIm1tbCBKYXggUmVhZHlcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgICAgICBNTUwuaG9sZSA9IE1NTC5tYmFzZS5TdWJjbGFzcyh7fSk7XG4gICAgICAgICAgICBNTUwuaG9sZS5BdWdtZW50KEhvbGUuZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWJhc2UuQXVnbWVudChNQmFzZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5lbnRpdHkuQXVnbWVudChFbnRpdHlNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tby5BdWdtZW50KE1vTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1lcnJvci5BdWdtZW50KE1FcnJvck1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zLkF1Z21lbnQoTXNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3BhY2UuQXVnbWVudChNU3BhY2VNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcGhhbnRvbS5BdWdtZW50KE1QaGFudG9tTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tcm93LkF1Z21lbnQoTVJvd01peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1zdHlsZS5BdWdtZW50KE1TdHlsZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3FydC5BdWdtZW50KE1TcXJ0TWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXJvb3QuQXVnbWVudChNUm9vdE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWVuY2xvc2UuQXVnbWVudChNRW5jbG9zZU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1hY3Rpb24uQXVnbWVudChNQWN0aW9uTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXVuZGVyb3Zlci5BdWdtZW50KE1VbmRlck92ZXJNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5tc3Vic3VwLkF1Z21lbnQoTVN1YlN1cE1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubXRhYmxlLkF1Z21lbnQoTVRhYmxlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzKSk7XG4gICAgICAgICAgICBNTUwubWF0aC5BdWdtZW50KE1hdGhNaXhpbi5nZXRNZXRob2RzKHRoaXMpKTtcbiAgICAgICAgICAgIE1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHModGhpcykpO1xuICAgICAgICAgICAgTU1MW1wiYW5ub3RhdGlvbi14bWxcIl0uQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgdG9TVkc6IE1NTC5tYmFzZS5TVkdhdXRvbG9hZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBNYXRoSmF4Lkh1Yi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIm9uTG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJ5aW5nIGVkaXRhYmxlc3ZnOiAnLCBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KE1hdGhKYXguQ2FsbGJhY2soW1wibG9hZENvbXBsZXRlXCIsIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLCBcImpheC5qc1wiXSksIDApO1xuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuQnJvd3Nlci5TZWxlY3Qoe1xuICAgICAgICAgICAgT3BlcmE6IGZ1bmN0aW9uIChicm93c2VyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWRy5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgb3BlcmFab29tUmVmcmVzaDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgTWF0aEpheC5IdWIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJFbmQgQ29va2llXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLnpvb20gIT09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgTWF0aEpheC5BamF4LlJlcXVpcmUoXCJbTWF0aEpheF0vZXh0ZW5zaW9ucy9NYXRoWm9vbS5qc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jdW1lbnQ7XG4gICAgICAgICAgICBpZiAoIWRvYy5uYW1lc3BhY2VzLnN2Zykge1xuICAgICAgICAgICAgICAgIGRvYy5uYW1lc3BhY2VzLmFkZChcInN2Z1wiLCBVdGlsLlNWR05TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSBNYXRoSmF4Lkh1Yi5jb25maWcubWVudVNldHRpbmdzLCBjb25maWcgPSB0aGlzLmNvbmZpZywgZm9udCA9IHNldHRpbmdzLmZvbnQ7XG4gICAgICAgIGlmIChzZXR0aW5ncy5zY2FsZSkge1xuICAgICAgICAgICAgY29uZmlnLnNjYWxlID0gc2V0dGluZ3Muc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCAhPT0gXCJBdXRvXCIpIHtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhMb2NhbHxXZWJ8SW1hZ2UpJC9pLCBcIlwiKTtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pLywgXCIkMS0kMlwiKTtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gZm9udDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gY29uZmlnLmZvbnQgfHwgXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb250TmFtZXMuaW5kZXhPZih0aGlzLmZvbnRJblVzZSkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250RGlyICs9IFwiL1wiICsgdGhpcy5mb250SW5Vc2U7XG4gICAgICAgIGlmICghdGhpcy5yZXF1aXJlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaCh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS5qc1wiKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2goTWF0aEpheC5PdXRwdXRKYXguZXh0ZW5zaW9uRGlyICsgXCIvTWF0aEV2ZW50cy5qc1wiKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgRVZFTlQgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50O1xuICAgICAgICB0aGlzLlRPVUNIID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ub3VjaDtcbiAgICAgICAgdmFyIEhPVkVSID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ib3ZlcjtcbiAgICAgICAgdGhpcy5Db250ZXh0TWVudSA9IEVWRU5ULkNvbnRleHRNZW51O1xuICAgICAgICB0aGlzLk1vdXNlb3ZlciA9IEhPVkVSLk1vdXNlb3ZlcjtcbiAgICAgICAgdGhpcy5Nb3VzZW91dCA9IEhPVkVSLk1vdXNlb3V0O1xuICAgICAgICB0aGlzLk1vdXNlbW92ZSA9IEhPVkVSLk1vdXNlbW92ZTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgICAgICAgICB0ZXh0SW5kZW50OiAwLFxuICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm06IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgbGV0dGVyU3BhY2luZzogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICB3b3JkU3BhY2luZzogXCJub3JtYWxcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5EaXYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUodGhpcy5oaWRkZW5EaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfSGlkZGVuXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaXYgPSBNYXRoSmF4LkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogXCI1aW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgVXRpbC5weFBlckluY2ggPSBkaXYub2Zmc2V0V2lkdGggLyA1O1xuICAgICAgICB0aGlzLmhpZGRlbkRpdi5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB0aGlzLnRleHRTVkcgPSBVdGlsLkVsZW1lbnQoXCJzdmdcIiwgbnVsbCk7XG4gICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IFV0aWwuYWRkRWxlbWVudChVdGlsLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYucGFyZW50Tm9kZSwgXCJzdmdcIiksIFwiZGVmc1wiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19nbHlwaHNcIlxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5FeFNwYW4gPSBNYXRoSmF4LkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXG4gICAgICAgICAgICBbXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0V4Qm94XCJcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtTcGFuID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFtcbiAgICAgICAgICAgIFtcImhyXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHRoaXMuY29uZmlnLnN0eWxlcztcbiAgICAgICAgZm9yICh2YXIgcyBpbiBFZGl0YWJsZVNWR0NvbmZpZy5zdHlsZXMpIHtcbiAgICAgICAgICAgIHN0eWxlc1tzXSA9IEVkaXRhYmxlU1ZHQ29uZmlnLnN0eWxlc1tzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aEpheC5BamF4LlN0eWxlcyhzdHlsZXMsIFtcIkluaXRpYWxpemVTVkdcIiwgdGhpc10pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkluaXRpYWxpemVTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIHRoaXMuZGVmYXVsdEV4ID0gdGhpcy5FeFNwYW4uZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5kZWZhdWx0V2lkdGggPSB0aGlzLmxpbmVicmVha1NwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF07XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgbSA9IHNjcmlwdHMubGVuZ3RoO1xuICAgICAgICB2YXIgc2NyaXB0O1xuICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgdmFyIHNwYW47XG4gICAgICAgIHZhciBkaXY7XG4gICAgICAgIHZhciB0ZXN0O1xuICAgICAgICB2YXIgamF4O1xuICAgICAgICB2YXIgZXg7XG4gICAgICAgIHZhciBlbTtcbiAgICAgICAgdmFyIG1heHdpZHRoO1xuICAgICAgICB2YXIgcmVsd2lkdGggPSBmYWxzZTtcbiAgICAgICAgdmFyIGN3aWR0aDtcbiAgICAgICAgdmFyIGxpbmVicmVhayA9IHRoaXMuY29uZmlnLmxpbmVicmVha3MuYXV0b21hdGljO1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLndpZHRoO1xuICAgICAgICBpZiAobGluZWJyZWFrKSB7XG4gICAgICAgICAgICByZWx3aWR0aCA9ICh3aWR0aC5tYXRjaCgvXlxccyooXFxkKyhcXC5cXGQqKT8lXFxzKik/Y29udGFpbmVyXFxzKiQvKSAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgvXFxzKmNvbnRhaW5lclxccyovLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2lkdGggPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWF4d2lkdGggPSAxMDAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwcmV2ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIFN0cmluZyhwcmV2LmNsYXNzTmFtZSkubWF0Y2goL15NYXRoSmF4KF9TVkcpPyhfRGlzcGxheSk/KCBNYXRoSmF4KF9TVkcpP19Qcm9jZXNzaW5nKT8kLykpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBqYXguRWRpdGFibGVTVkcgPSB7XG4gICAgICAgICAgICAgICAgZGlzcGxheTogKGpheC5yb290LkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzcGFuID0gZGl2ID0gTWF0aEpheC5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiB0aGlzLmNvbmZpZy5zY2FsZSArIFwiJVwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImlubGluZS1ibG9ja1wiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdcIixcbiAgICAgICAgICAgICAgICBpZDogamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiLFxuICAgICAgICAgICAgICAgIGlzTWF0aEpheDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBqYXhJRDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBvbmNvbnRleHRtZW51OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1lbnUsXG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd246IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuTW91c2Vkb3duLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdmVyOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3ZlcixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3V0OiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlb3V0LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vtb3ZlOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50Lk1vdXNlbW92ZSxcbiAgICAgICAgICAgICAgICBvbmNsaWNrOiBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LkNsaWNrLFxuICAgICAgICAgICAgICAgIG9uZGJsY2xpY2s6IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuRGJsQ2xpY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE1hdGhKYXguSHViLkJyb3dzZXIubm9Db250ZXh0TWVudSkge1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaHN0YXJ0ID0gdGhpcy5UT1VDSC5zdGFydDtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hlbmQgPSB0aGlzLlRPVUNILmVuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIGRpdiA9IE1hdGhKYXguSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSksIHNjcmlwdCk7XG4gICAgICAgICAgICBkaXYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5saW5lYnJlYWtTcGFuLmNsb25lTm9kZSh0cnVlKSwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgZGl2ID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBleCA9IHRlc3QuZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgICAgIGN3aWR0aCA9IGRpdi5wcmV2aW91c1NpYmxpbmcuZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4ID09PSAwIHx8IGV4ID09PSBcIk5hTlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5EaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgICAgICAgICAgICBqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGV4ID0gdGhpcy5kZWZhdWx0RXg7XG4gICAgICAgICAgICAgICAgY3dpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFV0aWwuZXggPSBleDtcbiAgICAgICAgICAgIFV0aWwuZW0gPSBlbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICAgICAgVXRpbC5jd2lkdGggPSBjd2lkdGggLyBlbSAqIDEwMDA7XG4gICAgICAgICAgICBVdGlsLmxpbmVXaWR0aCA9IChsaW5lYnJlYWsgPyBVdGlsLmxlbmd0aDJlbSh3aWR0aCwgMSwgbWF4d2lkdGggLyBlbSAqIDEwMDApIDogVXRpbC5CSUdESU1FTik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0c1tpXS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBzcGFuID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHRzW2ldLk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKCFqYXguRWRpdGFibGVTVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICB0ZXN0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuU1ZHZXFuID0gc3RhdGUuU1ZHbGFzdCA9IDA7XG4gICAgICAgIHN0YXRlLlNWR2kgPSAtMTtcbiAgICAgICAgc3RhdGUuU1ZHY2h1bmsgPSB0aGlzLmNvbmZpZy5FcW5DaHVuaztcbiAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5UcmFuc2xhdGUgPSBmdW5jdGlvbiAoc2NyaXB0LCBzdGF0ZSkge1xuICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoc3RhdGUuU1ZHZGVsYXkpIHtcbiAgICAgICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5SZXN0YXJ0QWZ0ZXIoTWF0aEpheC5DYWxsYmFjay5EZWxheSh0aGlzLmNvbmZpZy5FcW5DaHVua0RlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgIHZhciBtYXRoID0gamF4LnJvb3Q7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgdmFyIGRpdiA9IChqYXguRWRpdGFibGVTVkcuZGlzcGxheSA/IChzcGFuIHx8IHsgcGFyZW50Tm9kZTogdW5kZWZpbmVkIH0pLnBhcmVudE5vZGUgOiBzcGFuKTtcbiAgICAgICAgdmFyIGxvY2FsQ2FjaGUgPSAodGhpcy5jb25maWcudXNlRm9udENhY2hlICYmICF0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSk7XG4gICAgICAgIGlmICghZGl2KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLmVtID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZW0gPSBqYXguRWRpdGFibGVTVkcuZW07XG4gICAgICAgIHRoaXMuZXggPSBqYXguRWRpdGFibGVTVkcuZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIHRoaXMubWF0aERpdiA9IGRpdjtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldEdseXBocygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5pdFNWRyhtYXRoLCBzcGFuKTtcbiAgICAgICAgbWF0aC5zZXRUZVhjbGFzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0aC50b1NWRyhzcGFuLCBkaXYpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzcGFuLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZChzcGFuLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5uLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLkFkZElucHV0SGFuZGxlcnMobWF0aCwgc3BhbiwgZGl2KTtcbiAgICAgICAgaWYgKGpheC5FZGl0YWJsZVNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgfVxuICAgICAgICBkaXYuY2xhc3NOYW1lID0gZGl2LmNsYXNzTmFtZS5zcGxpdCgvIC8pWzBdO1xuICAgICAgICBpZiAodGhpcy5oaWRlUHJvY2Vzc2VkTWF0aCkge1xuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzZWRcIjtcbiAgICAgICAgICAgIGlmIChzY3JpcHQuTWF0aEpheC5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgamF4LkVkaXRhYmxlU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JFU0VUVElORyBHTFlQSFMnKTtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgQkJPWF9HTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMgPSBVdGlsLkVsZW1lbnQoXCJkZWZzXCIsIG51bGwpO1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQkJPWF9HTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEJCT1hfR0xZUEgubiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4ID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgaWYgKHJvb3QudHlwZSA9PT0gJ3RleGF0b20nKSB7XG4gICAgICAgICAgICBpZiAocm9vdC5kYXRhLmxlbmd0aCAhPT0gMSlcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignVW5leHBlY3RlZCBsZW5ndGggaW4gdGV4YXRvbScpO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcucHJlcHJvY2Vzc0VsZW1lbnRKYXgocm9vdC5kYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyb290LnR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290LmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChyb290LmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJvb3QuaXNDdXJzb3JhYmxlKCkgfHwgcm9vdC50eXBlID09PSAnbWF0aCcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHJvb3QuZGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cilcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBjdXIudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZVswXSAhPT0gJ20nIHx8IHR5cGUgPT09ICdtcm93Jykge1xuICAgICAgICAgICAgICAgICAgICBFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJvdyA9IG5ldyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1yb3coKTtcbiAgICAgICAgICAgICAgICAgICAgcm93LkFwcGVuZChFZGl0YWJsZVNWRy5wcmVwcm9jZXNzRWxlbWVudEpheChjdXIpKTtcbiAgICAgICAgICAgICAgICAgICAgcm9vdC5TZXREYXRhKGksIHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb290O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkFkZElucHV0SGFuZGxlcnMgPSBmdW5jdGlvbiAobWF0aCwgc3BhbiwgZGl2KSB7XG4gICAgICAgIG1hdGguY3Vyc29yID0gbmV3IEN1cnNvcigpO1xuICAgICAgICBtYXRoLnJlcmVuZGVyID0gcmVyZW5kZXI7XG4gICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG4gICAgICAgIGZ1bmN0aW9uIHJlcmVuZGVyKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIEVkaXRhYmxlU1ZHLnByZXByb2Nlc3NFbGVtZW50SmF4KG1hdGgpLnRvU1ZHKHNwYW4sIGRpdiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgbWF0aC5jdXJzb3IucmVmb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIucmVzdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRoSmF4LkNhbGxiYWNrLkFmdGVyKFtyZXJlbmRlciwgY2FsbGJhY2tdLCBlcnIucmVzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgTWF0aEpheC5DYWxsYmFjayhjYWxsYmFjaykoKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKGUpIHtcbiAgICAgICAgICAgIGlmIChtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXSlcbiAgICAgICAgICAgICAgICBtYXRoLmN1cnNvci5jb25zdHJ1Y3Rvci5wcm90b3R5cGVbZS50eXBlXS5jYWxsKG1hdGguY3Vyc29yLCBlLCByZXJlbmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgc3Bhbi5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICAgICAgICBzcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgaGFuZGxlcik7XG4gICAgICAgIHNwYW4uYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXRIb3ZlclNwYW4gPSBmdW5jdGlvbiAoamF4LCBtYXRoKSB7XG4gICAgICAgIG1hdGguc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIHJldHVybiBtYXRoLmZpcnN0Q2hpbGQ7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJCQm94ID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCkge1xuICAgICAgICB2YXIgYmJveCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQuZ2V0QkJveChzcGFuLnBhcmVudE5vZGUpO1xuICAgICAgICBiYm94LmggKz0gMjtcbiAgICAgICAgYmJveC5kIC09IDI7XG4gICAgICAgIHJldHVybiBiYm94O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlpvb20gPSBmdW5jdGlvbiAoamF4LCBzcGFuLCBtYXRoLCBNdywgTWgpIHtcbiAgICAgICAgc3Bhbi5jbGFzc05hbWUgPSBcIk1hdGhKYXhfU1ZHXCI7XG4gICAgICAgIHZhciBlbWV4ID0gc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICB2YXIgZXggPSBlbWV4LmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZW0gPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1iYXNlLnByb3RvdHlwZS5lbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICB0aGlzLmV4ID0gZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguRWRpdGFibGVTVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5FZGl0YWJsZVNWRy5jd2lkdGg7XG4gICAgICAgIGVtZXgucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbWV4KTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB0aGlzLm1hdGhESVYgPSBzcGFuO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgc3Bhbi5yZW1vdmVDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICB2YXIgc3ZnID0gc3Bhbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN2Z1wiKVswXS5zdHlsZTtcbiAgICAgICAgc3ZnLm1hcmdpblRvcCA9IHN2Zy5tYXJnaW5SaWdodCA9IHN2Zy5tYXJnaW5MZWZ0ID0gMDtcbiAgICAgICAgaWYgKHN2Zy5tYXJnaW5Cb3R0b20uY2hhckF0KDApID09PSBcIi1cIilcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWFyZ2luQm90dG9tID0gc3ZnLm1hcmdpbkJvdHRvbS5zdWJzdHIoMSk7XG4gICAgICAgIGlmICh0aGlzLm9wZXJhWm9vbVJlZnJlc2gpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNwYW4uZmlyc3RDaGlsZC5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB0cmFuc3BhcmVudFwiO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwYW4ub2Zmc2V0V2lkdGggPCBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUubWluV2lkdGggPSBzcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICBtYXRoLnN0eWxlLm1pbldpZHRoID0gbWF0aC5maXJzdENoaWxkLm9mZnNldFdpZHRoICsgXCJweFwiO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB2YXIgelcgPSBzcGFuLm9mZnNldFdpZHRoLCB6SCA9IHNwYW4ub2Zmc2V0SGVpZ2h0LCBtSCA9IG1hdGgub2Zmc2V0SGVpZ2h0LCBtVyA9IG1hdGgub2Zmc2V0V2lkdGg7XG4gICAgICAgIHNwYW4uc3R5bGUucG9zaXRpb24gPSBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJcIjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFk6IC1NYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkV2ZW50LmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguRWRpdGFibGVTVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGpheC5FZGl0YWJsZVNWRztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmV4dGVuZERlbGltaXRlclYgPSBmdW5jdGlvbiAoc3ZnLCBILCBkZWxpbSwgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRvcCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnRvcCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGJvdCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmJvdCB8fCBkZWxpbS5leHQpLCBmb250KTtcbiAgICAgICAgdmFyIGggPSB0b3AuaCArIHRvcC5kICsgYm90LmggKyBib3QuZDtcbiAgICAgICAgdmFyIHkgPSAtdG9wLmg7XG4gICAgICAgIHN2Zy5BZGQodG9wLCAwLCB5KTtcbiAgICAgICAgeSAtPSB0b3AuZDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IENoYXJzTWl4aW4uY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIGggKz0gbWlkLmggKyBtaWQuZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIEggPCBoICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBIID0gaCAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSCA+IGgpIHtcbiAgICAgICAgICAgIHZhciBleHQgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLmV4dCwgZm9udCk7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIGVIID0gKEggLSBoKSAvIGssIHMgPSAoZUggKyAxMDApIC8gKGV4dC5oICsgZXh0LmQpO1xuICAgICAgICAgICAgd2hpbGUgKGstLSA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IFV0aWwuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gQ2hhcnNNaXhpbi5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSBDaGFyc01peGluLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBVdGlsLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArICh4IC0gZnV6eiAvIDIgLSBzICogcmVwLmwgKyByZXAueCkgKyBcIixcIiArIHJlcC55ICsgXCIpIHNjYWxlKFwiICsgcyArIFwiLDEpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHJlcC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHggKz0gclc7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBtaWQudztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVykgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgeCArPSBtaWQudyAtICh3IC0gVykgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQocmlnaHQsIHggLSByaWdodC5sLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHO1xufSkoKTtcbnZhciBsb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgY29uc29sZS5sb2coJ0xPQURJTkcnKTtcbiAgICBFZGl0YWJsZVNWRy5hcHBseShNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgZm9yICh2YXIgaWQgaW4gRWRpdGFibGVTVkcucHJvdG90eXBlKSB7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHW2lkXSA9IEVkaXRhYmxlU1ZHLnByb3RvdHlwZVtpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWRy5wcm90b3R5cGVbaWRdLmJpbmQoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpZCBpbiBFZGl0YWJsZVNWRykge1xuICAgICAgICBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWR1tpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbnN0cnVjdG9yLnByb3RvdHlwZVtpZF0gPSBFZGl0YWJsZVNWR1tpZF0uYmluZChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRyk7XG4gICAgfVxufTtcblNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCA9IFNWR0VsZW1lbnQucHJvdG90eXBlLmdldFRyYW5zZm9ybVRvRWxlbWVudCB8fCBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHJldHVybiBlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKS5tdWx0aXBseSh0aGlzLmdldFNjcmVlbkNUTSgpKTtcbn07XG5zZXRUaW1lb3V0KGxvYWQsIDEwMDApO1xudmFyIFBhcnNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUGFyc2VyKCkge1xuICAgIH1cbiAgICBQYXJzZXIucGFyc2VDb250cm9sU2VxdWVuY2UgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFBhcnNlci5jaGVja1NwZWNpYWxDUyhjcyk7XG4gICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB2YXIgbWF0aGpheFBhcnNlciA9IE1hdGhKYXguSW5wdXRKYXguVGVYLlBhcnNlKGNzKTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5jc1VuZGVmaW5lZCA9IG1hdGhqYXhQYXJzZXIuY3NGaW5kTWFjcm8gPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuR2V0Q1MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjczsgfTtcbiAgICAgICAgbWF0aGpheFBhcnNlci5tbWxUb2tlbiA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgICAgICBtYXRoamF4UGFyc2VyLlB1c2ggPSAoZnVuY3Rpb24gKHgpIHsgcmVzdWx0ID0geDsgfSk7XG4gICAgICAgIG1hdGhqYXhQYXJzZXIuQ29udHJvbFNlcXVlbmNlKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBQYXJzZXIuY2hlY2tTcGVjaWFsQ1MgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgICAgdmFyIG1hY3JvcyA9IE1hdGhKYXguSW5wdXRKYXguVGVYLkRlZmluaXRpb25zLm1hY3JvcztcbiAgICAgICAgdmFyIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgIGlmIChjcyA9PT0gJ2ZyYWMnKSB7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBNTUwubWZyYWMoaG9sZSwgbmV3IE1NTC5ob2xlKCkpO1xuICAgICAgICAgICAgcmVzdWx0Lm1vdmVDdXJzb3JBZnRlciA9IFtob2xlLCAwXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNzID09PSAnc3FydCcpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgTU1MLm1zcXJ0KCk7XG4gICAgICAgICAgICB2YXIgaG9sZSA9IG5ldyBNTUwuaG9sZSgpO1xuICAgICAgICAgICAgcmVzdWx0LlNldERhdGEoMCwgaG9sZSk7XG4gICAgICAgICAgICByZXN1bHQubW92ZUN1cnNvckFmdGVyID0gW2hvbGUsIDBdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWFjcm9zW2NzXSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cobWFjcm9zW2NzXSk7XG4gICAgICAgICAgICB2YXIgbmFtZWREaXJlY3RseSA9IG1hY3Jvc1tjc10gPT09ICdOYW1lZE9wJyB8fCBtYWNyb3NbY3NdID09PSAnTmFtZWRGbic7XG4gICAgICAgICAgICB2YXIgbmFtZWRBcnJheSA9IG1hY3Jvc1tjc11bMF0gJiYgKG1hY3Jvc1tjc11bMF0gPT09ICdOYW1lZEZuJyB8fCBtYWNyb3NbY3NdWzBdID09PSAnTmFtZWRPcCcpO1xuICAgICAgICAgICAgaWYgKG5hbWVkRGlyZWN0bHkgfHwgbmFtZWRBcnJheSkge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZWRBcnJheSAmJiBtYWNyb3NbY3NdWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbWFjcm9zW2NzXVsxXS5yZXBsYWNlKC8mdGhpbnNwOy8sIFwiXFx1MjAwNlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gY3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTU1MLm1vKG5ldyBNTUwuY2hhcnModmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIFBhcnNlcjtcbn0pKCk7XG52YXIgQkJPWCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQkJPWChkZWYsIHR5cGUpIHtcbiAgICAgICAgaWYgKGRlZiA9PT0gdm9pZCAwKSB7IGRlZiA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGUgPT09IHZvaWQgMCkgeyB0eXBlID0gXCJnXCI7IH1cbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMuSCA9IHRoaXMuRCA9IDA7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IDA7XG4gICAgICAgIHRoaXMubCA9IFV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSAxO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQodHlwZSwgZGVmKTtcbiAgICB9XG4gICAgQkJPWC5wcm90b3R5cGUuV2l0aCA9IGZ1bmN0aW9uIChkZWYsIEhVQikge1xuICAgICAgICByZXR1cm4gSFVCLkluc2VydCh0aGlzLCBkZWYpO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWRkID0gZnVuY3Rpb24gKHN2ZywgZHgsIGR5LCBmb3JjZXcsIGluZnJvbnQpIHtcbiAgICAgICAgaWYgKGR4KSB7XG4gICAgICAgICAgICBzdmcueCArPSBkeDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZHkpIHtcbiAgICAgICAgICAgIHN2Zy55ICs9IGR5O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmIHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIHN2Zy5uID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgbm9kZU5hbWUgPSBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJ1c2VcIiB8fCBub2RlTmFtZSA9PT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNjYWxlID0gc3ZnLmNoaWxkU2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gc3ZnLmNoaWxkWCwgeSA9IHN2Zy5jaGlsZFk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy55ICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5oIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5kICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5IIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5EICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy53IC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yIC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5sICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3ZnLngpIDwgMSAmJiBNYXRoLmFicyhzdmcueSkgPCAxKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlID0gc3ZnLnJlbW92ZWFibGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUgPT09IFwibGluZVwiIHx8IG5vZGVOYW1lID09PSBcInBvbHlnb25cIiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9PT0gXCJwYXRoXCIgfHwgbm9kZU5hbWUgPT09IFwiYVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3Ioc3ZnLngpICsgXCIsXCIgKyBNYXRoLmZsb29yKHN2Zy55KSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubiArPSBzdmcubjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCAmJiB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudC5maXJzdENoaWxkLCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKHN2Zy5lbGVtZW50LCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdGhpcy5oYXNJbmRlbnQgPSBzdmcuaGFzSW5kZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy50dyA9IHN2Zy50dztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgLSBzdmcueSA+IHRoaXMuZCkge1xuICAgICAgICAgICAgdGhpcy5kID0gc3ZnLmQgLSBzdmcueTtcbiAgICAgICAgICAgIGlmICh0aGlzLmQgPiB0aGlzLkQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkQgPSB0aGlzLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLmggPiB0aGlzLmgpIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHN2Zy55ICsgc3ZnLmg7XG4gICAgICAgICAgICBpZiAodGhpcy5oID4gdGhpcy5IKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5IID0gdGhpcy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuRCAtIHN2Zy55ID4gdGhpcy5EKVxuICAgICAgICAgICAgdGhpcy5EID0gc3ZnLkQgLSBzdmcueTtcbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLkggPiB0aGlzLkgpXG4gICAgICAgICAgICB0aGlzLkggPSBzdmcueSArIHN2Zy5IO1xuICAgICAgICBpZiAoc3ZnLnggKyBzdmcubCA8IHRoaXMubClcbiAgICAgICAgICAgIHRoaXMubCA9IHN2Zy54ICsgc3ZnLmw7XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5yID4gdGhpcy5yKVxuICAgICAgICAgICAgdGhpcy5yID0gc3ZnLnggKyBzdmcucjtcbiAgICAgICAgaWYgKGZvcmNldyB8fCBzdmcueCArIHN2Zy53ICsgKHN2Zy5YIHx8IDApID4gdGhpcy53KVxuICAgICAgICAgICAgdGhpcy53ID0gc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKTtcbiAgICAgICAgdGhpcy5jaGlsZFNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLmNoaWxkWCA9IHN2Zy54O1xuICAgICAgICB0aGlzLmNoaWxkWSA9IHN2Zy55O1xuICAgICAgICB0aGlzLm4rKztcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFsaWduID0gZnVuY3Rpb24gKHN2ZywgYWxpZ24sIGR4LCBkeSwgc2hpZnQpIHtcbiAgICAgICAgaWYgKHNoaWZ0ID09PSB2b2lkIDApIHsgc2hpZnQgPSBudWxsOyB9XG4gICAgICAgIGR4ID0gKHtcbiAgICAgICAgICAgIGxlZnQ6IGR4LFxuICAgICAgICAgICAgY2VudGVyOiAodGhpcy53IC0gc3ZnLncpIC8gMixcbiAgICAgICAgICAgIHJpZ2h0OiB0aGlzLncgLSBzdmcudyAtIGR4XG4gICAgICAgIH0pW2FsaWduXSB8fCAwO1xuICAgICAgICB2YXIgdyA9IHRoaXMudztcbiAgICAgICAgdGhpcy5BZGQoc3ZnLCBkeCArIChzaGlmdCB8fCAwKSwgZHkpO1xuICAgICAgICB0aGlzLncgPSB3O1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQ2xlYW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmggPT09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICB0aGlzLmggPSB0aGlzLmQgPSB0aGlzLmwgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgQkJPWC5kZWZzID0gbnVsbDtcbiAgICBCQk9YLm4gPSAwO1xuICAgIHJldHVybiBCQk9YO1xufSkoKTtcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59O1xudmFyIEJCT1hfRyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0coKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HO1xufSkoQkJPWCk7XG52YXIgQkJPWF9URVhUID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9URVhULCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVEVYVChIVE1MLCBzY2FsZSwgdGV4dCwgZGVmKSB7XG4gICAgICAgIGlmICghZGVmKVxuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIGRlZi5zdHJva2UgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtc3R5bGVcIl0gPT09IFwiXCIpXG4gICAgICAgICAgICBkZWxldGUgZGVmW1wiZm9udC1zdHlsZVwiXTtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtd2VpZ2h0XCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtd2VpZ2h0XCJdO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYsIFwidGV4dFwiKTtcbiAgICAgICAgSFRNTC5hZGRUZXh0KHRoaXMuZWxlbWVudCwgdGV4dCk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkcudGV4dFNWRy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB2YXIgYmJveCA9IHRoaXMuZWxlbWVudC5nZXRCQm94KCk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkcudGV4dFNWRy5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICBzY2FsZSAqPSAxMDAwIC8gVXRpbC5lbTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIikgbWF0cml4KDEgMCAwIC0xIDAgMClcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSBiYm94LndpZHRoICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IC1iYm94LnkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gKGJib3guaGVpZ2h0ICsgYmJveC55KSAqIHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9URVhUO1xufSkoQkJPWCk7XG52YXIgVXRpbCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXRpbCgpIHtcbiAgICB9XG4gICAgVXRpbC5FbSA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGVtXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImVtXCI7XG4gICAgfTtcbiAgICBVdGlsLkV4ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgbSA9IE1hdGgucm91bmQobSAvIHRoaXMuVGVYLnhfaGVpZ2h0ICogdGhpcy5leCkgLyB0aGlzLmV4O1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBleFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJleFwiO1xuICAgIH07XG4gICAgVXRpbC5QZXJjZW50ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0dXJuICgxMDAgKiBtKS50b0ZpeGVkKDEpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiJVwiO1xuICAgIH07XG4gICAgVXRpbC5GaXhlZCA9IGZ1bmN0aW9uIChtLCBuKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQobiB8fCAzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIik7XG4gICAgfTtcbiAgICBVdGlsLmhhc2hDaGVjayA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH0gd2hpbGUgKHRhcmdldCAmJiB0YXJnZXQuZmlyc3RDaGlsZC5ub2RlTmFtZSAhPT0gXCJzdmdcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICAgIFV0aWwuRWxlbWVudCA9IGZ1bmN0aW9uICh0eXBlLCBkZWYpIHtcbiAgICAgICAgdmFyIG9iajtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUykge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKSA6IHR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3ZnOlwiICsgdHlwZSkgOiB0eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBvYmouaXNNYXRoSmF4ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGRlZikge1xuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gZGVmKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZi5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZShpZCwgZGVmW2lkXS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIFV0aWwuYWRkRWxlbWVudCA9IGZ1bmN0aW9uIChwYXJlbnQsIHR5cGUsIGRlZikge1xuICAgICAgICByZXR1cm4gcGFyZW50LmFwcGVuZENoaWxkKFV0aWwuRWxlbWVudCh0eXBlLCBkZWYpKTtcbiAgICB9O1xuICAgIFV0aWwubGVuZ3RoMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUsIHNpemUpIHtcbiAgICAgICAgaWYgKG11ID09PSB2b2lkIDApIHsgbXUgPSBudWxsOyB9XG4gICAgICAgIGlmIChzaXplID09PSB2b2lkIDApIHsgc2l6ZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGVvZiAobGVuZ3RoKSAhPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGxlbmd0aCA9IGxlbmd0aC50b1N0cmluZygpO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcIlwiKVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuU0laRS5OT1JNQUwpXG4gICAgICAgICAgICByZXR1cm4gMTAwMDtcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5TSVpFLkJJRylcbiAgICAgICAgICAgIHJldHVybiAyMDAwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlNJWkUuU01BTEwpXG4gICAgICAgICAgICByZXR1cm4gNzEwO1xuICAgICAgICBpZiAobGVuZ3RoID09PSBcImluZmluaXR5XCIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5CSUdESU1FTjtcbiAgICAgICAgaWYgKGxlbmd0aC5tYXRjaCgvbWF0aHNwYWNlJC8pKVxuICAgICAgICAgICAgcmV0dXJuIDEwMDAgKiB0aGlzLk1BVEhTUEFDRVtsZW5ndGhdO1xuICAgICAgICB2YXIgem9vbVNjYWxlID0gcGFyc2VJbnQoTWF0aEpheC5IdWIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgZW1GYWN0b3IgPSAoem9vbVNjYWxlIHx8IDEpIC8gVXRpbC5lbTtcbiAgICAgICAgdmFyIG1hdGNoID0gbGVuZ3RoLm1hdGNoKC9eXFxzKihbLStdPyg/OlxcLlxcZCt8XFxkKyg/OlxcLlxcZCopPykpPyhwdHxlbXxleHxtdXxweHxwY3xpbnxtbXxjbXwlKT8vKTtcbiAgICAgICAgdmFyIG0gPSBwYXJzZUZsb2F0KG1hdGNoWzFdIHx8IFwiMVwiKSAqIDEwMDAsIHVuaXQgPSBtYXRjaFsyXTtcbiAgICAgICAgaWYgKHNpemUgPT0gbnVsbClcbiAgICAgICAgICAgIHNpemUgPSAxMDAwO1xuICAgICAgICBpZiAobXUgPT0gbnVsbClcbiAgICAgICAgICAgIG11ID0gMTtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZW1cIilcbiAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJleFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLlRlWC54X2hlaWdodCAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcIiVcIilcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTAwICogc2l6ZSAvIDEwMDA7XG4gICAgICAgIGlmICh1bml0ID09PSBcInB4XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJwdFwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwicGNcIilcbiAgICAgICAgICAgIHJldHVybiBtICogMS4yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJpblwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yO1xuICAgICAgICBpZiAodW5pdCA9PT0gXCJjbVwiKVxuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMi41NDtcbiAgICAgICAgaWYgKHVuaXQgPT09IFwibW1cIilcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvciAvIDI1LjQ7XG4gICAgICAgIGlmICh1bml0ID09PSBcIm11XCIpXG4gICAgICAgICAgICByZXR1cm4gbSAvIDE4ICogbXU7XG4gICAgICAgIHJldHVybiBtICogc2l6ZSAvIDEwMDA7XG4gICAgfTtcbiAgICBVdGlsLmdldFBhZGRpbmcgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gcGFkZGluZykge1xuICAgICAgICAgICAgaWYgKHBhZGRpbmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZCA9IHN0eWxlc1tcInBhZGRpbmdcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdbaWRdID0gVXRpbC5sZW5ndGgyZW0ocGFkKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBwYWRkaW5nIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC5nZXRCb3JkZXJzID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICAgICAgICB2YXIgYm9yZGVyID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH0sIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBib3JkZXIpIHtcbiAgICAgICAgICAgIGlmIChib3JkZXIuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gXCJib3JkZXJcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWRdID0gVXRpbC5sZW5ndGgyZW0oc3R5bGVzW0lEICsgXCJXaWR0aFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiU3R5bGVcIl0gPSBzdHlsZXNbSUQgKyBcIlN0eWxlXCJdO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gc3R5bGVzW0lEICsgXCJDb2xvclwiXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPT09IFwiaW5pdGlhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJvcmRlcltpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaGFzID8gYm9yZGVyIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC50aGlja25lc3MyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSkge1xuICAgICAgICB2YXIgdGhpY2sgPSB0aGlzLlRlWC5ydWxlX3RoaWNrbmVzcztcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5MSU5FVEhJQ0tORVNTLk1FRElVTSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElOKSB7XG4gICAgICAgICAgICByZXR1cm4gMC42NyAqIHRoaWNrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuTElORVRISUNLTkVTUy5USElDSykge1xuICAgICAgICAgICAgcmV0dXJuIDEuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgdGhpY2spO1xuICAgIH07XG4gICAgVXRpbC5lbGVtQ29vcmRzVG9TY3JlZW5Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpKTtcbiAgICB9O1xuICAgIFV0aWwuZWxlbUNvb3Jkc1RvVmlld3BvcnRDb29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFRyYW5zZm9ybVRvRWxlbWVudChzdmcpKTtcbiAgICB9O1xuICAgIFV0aWwuZ2V0U1ZHRWxlbSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGlmICghZWxlbSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHN2ZyA9IGVsZW0ubm9kZU5hbWUgPT09ICdzdmcnID8gZWxlbSA6IGVsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBpZiAoIXN2Zykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gb3duZXIgU1ZHIGVsZW1lbnQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgVXRpbC5zY3JlZW5Db29yZHNUb0VsZW1Db29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5nZXRTVkdFbGVtKGVsZW0pO1xuICAgICAgICBpZiAoIXN2ZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgfTtcbiAgICBVdGlsLmJveENvbnRhaW5zID0gZnVuY3Rpb24gKGJiLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiBiYiAmJiBiYi54IDw9IHggJiYgeCA8PSBiYi54ICsgYmIud2lkdGggJiYgYmIueSA8PSB5ICYmIHkgPD0gYmIueSArIGJiLmhlaWdodDtcbiAgICB9O1xuICAgIFV0aWwubm9kZUNvbnRhaW5zU2NyZWVuUG9pbnQgPSBmdW5jdGlvbiAobm9kZSwgeCwgeSkge1xuICAgICAgICB2YXIgYmIgPSBub2RlLmdldEJCICYmIG5vZGUuZ2V0QkIoKTtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnNjcmVlbkNvb3Jkc1RvRWxlbUNvb3Jkcyhub2RlLkVkaXRhYmxlU1ZHZWxlbSwgeCwgeSk7XG4gICAgICAgIGlmICghYmIgfHwgIXApXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBVdGlsLmJveENvbnRhaW5zKGJiLCBwLngsIHAueSk7XG4gICAgfTtcbiAgICBVdGlsLmhpZ2hsaWdodEJveCA9IGZ1bmN0aW9uIChzdmcsIGJiKSB7XG4gICAgICAgIHZhciBkID0gMTAwO1xuICAgICAgICB2YXIgZHJhd0xpbmUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHRoaXMuU1ZHTlMsICdsaW5lJyk7XG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICBsaW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnc3Ryb2tlOnJnYigwLDAsMjU1KTtzdHJva2Utd2lkdGg6MjAnKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MScsIHgxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MScsIHkxKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd4MicsIHgyKTtcbiAgICAgICAgICAgIGxpbmUuc2V0QXR0cmlidXRlKCd5MicsIHkyKTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCArIGQsIGJiLnkpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCwgYmIueSwgYmIueCwgYmIueSArIGQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55LCBiYi54ICsgYmIud2lkdGggLSBkLCBiYi55KSxcbiAgICAgICAgICAgIGRyYXdMaW5lKGJiLnggKyBiYi53aWR0aCwgYmIueSwgYmIueCArIGJiLndpZHRoLCBiYi55ICsgZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54LCBiYi55ICsgYmIuaGVpZ2h0IC0gZCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54LCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgZCwgYmIueSArIGJiLmhlaWdodCksXG4gICAgICAgICAgICBkcmF3TGluZShiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQsIGJiLnggKyBiYi53aWR0aCAtIGQsIGJiLnkgKyBiYi5oZWlnaHQpLFxuICAgICAgICAgICAgZHJhd0xpbmUoYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0LCBiYi54ICsgYmIud2lkdGgsIGJiLnkgKyBiYi5oZWlnaHQgLSBkKVxuICAgICAgICBdO1xuICAgIH07XG4gICAgVXRpbC5nZXRKYXhGcm9tTWF0aCA9IGZ1bmN0aW9uIChtYXRoKSB7XG4gICAgICAgIGlmIChtYXRoLnBhcmVudE5vZGUuY2xhc3NOYW1lID09PSBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIikge1xuICAgICAgICAgICAgbWF0aCA9IG1hdGgucGFyZW50Tm9kZTtcbiAgICAgICAgfVxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBtYXRoID0gbWF0aC5uZXh0U2libGluZztcbiAgICAgICAgfSB3aGlsZSAobWF0aCAmJiBtYXRoLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT09IFwic2NyaXB0XCIpO1xuICAgICAgICByZXR1cm4gTWF0aEpheC5IdWIuZ2V0SmF4Rm9yKG1hdGgpO1xuICAgIH07XG4gICAgVXRpbC5nZXRDdXJzb3JWYWx1ZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKGlzTmFOKGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZGlyZWN0aW9uWzBdLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd1JzogcmV0dXJuIERpcmVjdGlvbi5VUDtcbiAgICAgICAgICAgICAgICBjYXNlICdkJzogcmV0dXJuIERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2wnOiByZXR1cm4gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICAgICAgY2FzZSAncic6IHJldHVybiBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yIHZhbHVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBVdGlsLlNWR05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xuICAgIFV0aWwuWExJTktOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiO1xuICAgIFV0aWwuTkJTUCA9IFwiXFx1MDBBMFwiO1xuICAgIFV0aWwuQklHRElNRU4gPSAxMDAwMDAwMDtcbiAgICBVdGlsLlRlWCA9IHtcbiAgICAgICAgeF9oZWlnaHQ6IDQzMC41NTQsXG4gICAgICAgIHF1YWQ6IDEwMDAsXG4gICAgICAgIG51bTE6IDY3Ni41MDgsXG4gICAgICAgIG51bTI6IDM5My43MzIsXG4gICAgICAgIG51bTM6IDQ0My43MyxcbiAgICAgICAgZGVub20xOiA2ODUuOTUxLFxuICAgICAgICBkZW5vbTI6IDM0NC44NDEsXG4gICAgICAgIHN1cDE6IDQxMi44OTIsXG4gICAgICAgIHN1cDI6IDM2Mi44OTIsXG4gICAgICAgIHN1cDM6IDI4OC44ODgsXG4gICAgICAgIHN1YjE6IDE1MCxcbiAgICAgICAgc3ViMjogMjQ3LjIxNyxcbiAgICAgICAgc3VwX2Ryb3A6IDM4Ni4xMDgsXG4gICAgICAgIHN1Yl9kcm9wOiA1MCxcbiAgICAgICAgZGVsaW0xOiAyMzkwLFxuICAgICAgICBkZWxpbTI6IDEwMDAsXG4gICAgICAgIGF4aXNfaGVpZ2h0OiAyNTAsXG4gICAgICAgIHJ1bGVfdGhpY2tuZXNzOiA2MCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmcxOiAxMTEuMTExLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzI6IDE2Ni42NjYsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMzogMjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzQ6IDYwMCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmc1OiAxMDAsXG4gICAgICAgIHNjcmlwdHNwYWNlOiAxMDAsXG4gICAgICAgIG51bGxkZWxpbWl0ZXJzcGFjZTogMTIwLFxuICAgICAgICBkZWxpbWl0ZXJmYWN0b3I6IDkwMSxcbiAgICAgICAgZGVsaW1pdGVyc2hvcnRmYWxsOiAzMDAsXG4gICAgICAgIG1pbl9ydWxlX3RoaWNrbmVzczogMS4yNSxcbiAgICAgICAgbWluX3Jvb3Rfc3BhY2U6IDEuNVxuICAgIH07XG4gICAgVXRpbC5NQVRIU1BBQ0UgPSB7XG4gICAgICAgIHZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogMSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpbm1hdGhzcGFjZTogMiAvIDE4LFxuICAgICAgICB0aGlubWF0aHNwYWNlOiAzIC8gMTgsXG4gICAgICAgIG1lZGl1bW1hdGhzcGFjZTogNCAvIDE4LFxuICAgICAgICB0aGlja21hdGhzcGFjZTogNSAvIDE4LFxuICAgICAgICB2ZXJ5dGhpY2ttYXRoc3BhY2U6IDYgLyAxOCxcbiAgICAgICAgdmVyeXZlcnl0aGlja21hdGhzcGFjZTogNyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl2ZXJ5dGhpbm1hdGhzcGFjZTogLTEgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpbm1hdGhzcGFjZTogLTIgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlubWF0aHNwYWNlOiAtMyAvIDE4LFxuICAgICAgICBuZWdhdGl2ZW1lZGl1bW1hdGhzcGFjZTogLTQgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV0aGlja21hdGhzcGFjZTogLTUgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dGhpY2ttYXRoc3BhY2U6IC02IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlja21hdGhzcGFjZTogLTcgLyAxOFxuICAgIH07XG4gICAgcmV0dXJuIFV0aWw7XG59KSgpO1xudmFyIEJCT1hfRlJBTUUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0ZSQU1FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfRlJBTUUoaCwgZCwgdywgdCwgZGFzaCwgY29sb3IsIHN2ZywgaHViLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGRlZi5maWxsID0gXCJub25lXCI7XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFV0aWwuRml4ZWQodCwgMik7XG4gICAgICAgIGRlZi53aWR0aCA9IE1hdGguZmxvb3IodyAtIHQpO1xuICAgICAgICBkZWYuaGVpZ2h0ID0gTWF0aC5mbG9vcihoICsgZCAtIHQpO1xuICAgICAgICBkZWYudHJhbnNmb3JtID0gXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHQgLyAyKSArIFwiLFwiICsgTWF0aC5mbG9vcigtZCArIHQgLyAyKSArIFwiKVwiO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFtNYXRoLmZsb29yKDYgKiBVdGlsLmVtKSwgTWF0aC5mbG9vcig2ICogVXRpbC5lbSldLmpvaW4oXCIgXCIpO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZiwgXCJyZWN0XCIpO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gZDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRlJBTUU7XG59KShCQk9YKTtcbnZhciBCQk9YX0dMWVBIID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HTFlQSCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0dMWVBIKHNjYWxlLCBpZCwgaCwgZCwgdywgbCwgciwgcCkge1xuICAgICAgICB0aGlzLmdseXBocyA9IHt9O1xuICAgICAgICB0aGlzLm4gPSAwO1xuICAgICAgICB2YXIgZGVmO1xuICAgICAgICB2YXIgdCA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5ibGFja2VyO1xuICAgICAgICB2YXIgY2FjaGUgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlRm9udENhY2hlO1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gKHNjYWxlID09PSAxID8gbnVsbCA6IFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKVwiKTtcbiAgICAgICAgaWYgKGNhY2hlICYmICFNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIGlkID0gXCJFXCIgKyB0aGlzLm4gKyBcIi1cIiArIGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2FjaGUgfHwgIXRoaXMuZ2x5cGhzW2lkXSkge1xuICAgICAgICAgICAgZGVmID0geyBcInN0cm9rZS13aWR0aFwiOiB0IH07XG4gICAgICAgICAgICBpZiAoY2FjaGUpXG4gICAgICAgICAgICAgICAgZGVmLmlkID0gaWQ7XG4gICAgICAgICAgICBlbHNlIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIGRlZi5kID0gKHAgPyBcIk1cIiArIHAgKyBcIlpcIiA6IFwiXCIpO1xuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInBhdGhcIik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBCQk9YX0dMWVBILmRlZnMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdseXBoc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtKVxuICAgICAgICAgICAgICAgIGRlZi50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQgPSBVdGlsLkVsZW1lbnQoXCJ1c2VcIiwgZGVmKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCBcIiNcIiArIGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oID0gKGggKyB0KSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmQgPSAoZCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMudyA9ICh3ICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IChsICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuciA9IChyICsgdCAvIDIpICogc2NhbGU7XG4gICAgICAgIHRoaXMuSCA9IE1hdGgubWF4KDAsIHRoaXMuaCk7XG4gICAgICAgIHRoaXMuRCA9IE1hdGgubWF4KDAsIHRoaXMuZCk7XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfR0xZUEg7XG59KShCQk9YKTtcbnZhciBCQk9YX0hMSU5FID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9ITElORSwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0hMSU5FKHcsIHQsIGRhc2gsIGNvbG9yLCBkZWYpIHtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIilcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLnkxID0gZGVmLnkyID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi54MiA9IE1hdGguZmxvb3IodyAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgdyAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSB0O1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9ITElORTtcbn0pKEJCT1gpO1xudmFyIEJCT1hfTk9OUkVNT1ZBQkxFID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9OT05SRU1PVkFCTEUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9OT05SRU1PVkFCTEUoKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9OT05SRU1PVkFCTEU7XG59KShCQk9YX0cpO1xudmFyIEJCT1hfTlVMTCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTlVMTCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05VTEwoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBhcmdzW19pIC0gMF0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLkNsZWFuKCk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05VTEw7XG59KShCQk9YKTtcbnZhciBCQk9YX1JFQ1QgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1JFQ1QsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9SRUNUKGgsIGQsIHcsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGRlZi53aWR0aCA9IE1hdGguZmxvb3Iodyk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkKTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcInJlY3RcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoICsgZDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy55ID0gLWQ7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1JFQ1Q7XG59KShCQk9YKTtcbnZhciBCQk9YX1JPVyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUk9XLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUk9XKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgdGhpcy5lbGVtcyA9IFtdO1xuICAgICAgICB0aGlzLnNoID0gdGhpcy5zZCA9IDA7XG4gICAgfVxuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5DaGVjayA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciBzdmcgPSBkYXRhLnRvU1ZHKCk7XG4gICAgICAgIHRoaXMuZWxlbXMucHVzaChzdmcpO1xuICAgICAgICBpZiAoZGF0YS5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgIHN2Zy5tbWwgPSBkYXRhO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA+IHRoaXMuc2gpIHtcbiAgICAgICAgICAgIHRoaXMuc2ggPSBzdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgPiB0aGlzLnNkKSB7XG4gICAgICAgICAgICB0aGlzLnNkID0gc3ZnLmQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5TdHJldGNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZWxlbXMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gdGhpcy5lbGVtc1tpXSwgbW1sID0gc3ZnLm1tbDtcbiAgICAgICAgICAgIGlmIChtbWwpIHtcbiAgICAgICAgICAgICAgICBpZiAobW1sLmZvcmNlU3RyZXRjaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmggIT09IHRoaXMuc2ggfHwgbW1sLkVkaXRhYmxlU1ZHZGF0YS5kICE9PSB0aGlzLnNkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2ZyA9IG1tbC5TVkdzdHJldGNoVih0aGlzLnNoLCB0aGlzLnNkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5IVyA9IHRoaXMuc2g7XG4gICAgICAgICAgICAgICAgbW1sLkVkaXRhYmxlU1ZHZGF0YS5EID0gdGhpcy5zZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuaWMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmljID0gc3ZnLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLkFkZChzdmcsIHRoaXMudywgMCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMuZWxlbXM7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWF9ST1c7XG59KShCQk9YKTtcbnZhciBCQk9YX1NWRyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfU1ZHLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfU1ZHKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBudWxsLCBcInN2Z1wiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1NWRztcbn0pKEJCT1gpO1xudmFyIEJCT1hfVkxJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1ZMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVkxJTkUoaCwgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwic3F1YXJlXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG9yICYmIGNvbG9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICBkZWYuc3Ryb2tlID0gY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgZGVmW1wic3Ryb2tlLXdpZHRoXCJdID0gVXRpbC5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLngyID0gZGVmLnkxID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi55MiA9IE1hdGguZmxvb3IoaCAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmLCBcImxpbmVcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB0O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9WTElORTtcbn0pKEJCT1gpO1xudmFyIEVsZW1lbnRKYXggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVsZW1lbnRKYXgoKSB7XG4gICAgfVxuICAgIHJldHVybiBFbGVtZW50SmF4O1xufSkoKTtcbnZhciBNQmFzZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUJhc2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQmFzZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0QkIgPSBmdW5jdGlvbiAocmVsYXRpdmVUbykge1xuICAgICAgICB2YXIgZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtO1xuICAgICAgICBpZiAoIWVsZW0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdPaCBubyEgQ291bGRuXFwndCBmaW5kIGVsZW0gZm9yIHRoaXMnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbS5nZXRCQm94KCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLmdldE1ldGhvZHMgPSBmdW5jdGlvbiAoZWRpdGFibGVTVkcpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmoucHJvdG90eXBlID0ge307XG4gICAgICAgIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5wcm90b3R5cGUpIHtcbiAgICAgICAgICAgIG9ialtpZF0gPSB0aGlzLnByb3RvdHlwZVtpZF07XG4gICAgICAgIH1cbiAgICAgICAgb2JqLmVkaXRhYmxlU1ZHID0gZWRpdGFibGVTVkc7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVuZGVyZWQgPSB0aGlzLmRhdGFbaV0udG9TVkcodmFyaWFudCwgc3ZnLnNjYWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBzdmcuQWRkKHJlbmRlcmVkLCBzdmcudywgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBjaGlsZC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKHN2Zy5za2V3ICYmIHRleHQubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5yID4gc3ZnLncgJiYgdGV4dC5sZW5ndGggPT09IDEgJiYgIXZhcmlhbnQubm9JQykge1xuICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjaGlsZFNWRyA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhW2ldID8gdGhpcy5kYXRhW2ldLnRvU1ZHKCkgOiBuZXcgQkJPWCgpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCA9IGZ1bmN0aW9uIChpLCBIVywgRCkge1xuICAgICAgICBpZiAoRCA9PT0gdm9pZCAwKSB7IEQgPSBudWxsOyB9XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge1xuICAgICAgICAgICAgSFc6IEhXLFxuICAgICAgICAgICAgRDogRFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBCQk9YKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3NhdmVEYXRhID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICBpZiAoIXRoaXMuRWRpdGFibGVTVkdkYXRhKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLncgPSBzdmcudywgdGhpcy5FZGl0YWJsZVNWR2RhdGEueCA9IHN2Zy54O1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oID0gc3ZnLmgsIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgPSBzdmcuZDtcbiAgICAgICAgaWYgKHN2Zy55KSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oICs9IHN2Zy55O1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCAtPSBzdmcueTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLlggIT0gbnVsbClcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLlggPSBzdmcuWDtcbiAgICAgICAgaWYgKHN2Zy50dyAhPSBudWxsKVxuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudHcgPSBzdmcudHc7XG4gICAgICAgIGlmIChzdmcuc2tldylcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnNrZXcgPSBzdmcuc2tldztcbiAgICAgICAgaWYgKHN2Zy5pYylcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmljID0gc3ZnLmljO1xuICAgICAgICBpZiAodGhpc1tcImNsYXNzXCJdKSB7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogdGhpc1tcImNsYXNzXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pZCkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHRoaXMuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhyZWYpIHtcbiAgICAgICAgICAgIHZhciBhID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChcImFcIiwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogXCJtangtc3ZnLWhyZWZcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZU5TKFV0aWwuWExJTktOUywgXCJocmVmXCIsIHRoaXMuaHJlZik7XG4gICAgICAgICAgICBhLm9uY2xpY2sgPSB0aGlzLlNWR2xpbms7XG4gICAgICAgICAgICBVdGlsLmFkZEVsZW1lbnQoYSwgXCJyZWN0XCIsIHtcbiAgICAgICAgICAgICAgICB3aWR0aDogc3ZnLncsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBzdmcuaCArIHN2Zy5kLFxuICAgICAgICAgICAgICAgIHk6IC1zdmcuZCxcbiAgICAgICAgICAgICAgICBmaWxsOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwicG9pbnRlci1ldmVudHNcIjogXCJhbGxcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3ZnLnR5cGUgPT09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGcuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBhLmFwcGVuZENoaWxkKGcuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcuYWRkTU1MY2xhc3Nlcykge1xuICAgICAgICAgICAgdGhpcy5TVkdhZGRDbGFzcyhzdmcuZWxlbWVudCwgXCJtangtc3ZnLVwiICsgdGhpcy50eXBlKTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0eWxlID0gdGhpcy5zdHlsZTtcbiAgICAgICAgaWYgKHN0eWxlICYmIHN2Zy5lbGVtZW50KSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG4gICAgICAgICAgICBpZiAoc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUpIHtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zdHlsZS5ib3JkZXIgPSBzdmcuZWxlbWVudC5zdHlsZS5wYWRkaW5nID0gXCJcIjtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gKHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPT09IFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHYWRkQXR0cmlidXRlcyhzdmcpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYWRkQ2xhc3MgPSBmdW5jdGlvbiAobm9kZSwgbmFtZSkge1xuICAgICAgICB2YXIgY2xhc3NlcyA9IG5vZGUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIik7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgKGNsYXNzZXMgPyBjbGFzc2VzICsgXCIgXCIgOiBcIlwiKSArIG5hbWUpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYWRkQXR0cmlidXRlcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgaWYgKHRoaXMuYXR0ck5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgY29weSA9IHRoaXMuYXR0ck5hbWVzLCBza2lwID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5ub2NvcHlBdHRyaWJ1dGVzLCBpZ25vcmUgPSBNYXRoSmF4Lkh1Yi5jb25maWcuaWdub3JlTU1MYXR0cmlidXRlcztcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9ICh0aGlzLnR5cGUgPT09IFwibXN0eWxlXCIgPyBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm1hdGgucHJvdG90eXBlLmRlZmF1bHRzIDogdGhpcy5kZWZhdWx0cyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGNvcHkubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gY29weVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaWdub3JlW2lkXSA9PSBmYWxzZSB8fCAoIXNraXBbaWRdICYmICFpZ25vcmVbaWRdICYmXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzW2lkXSA9PSBudWxsICYmIHR5cGVvZiAoc3ZnLmVsZW1lbnRbaWRdKSA9PT0gXCJ1bmRlZmluZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKGlkLCB0aGlzLmF0dHJbaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBocmVmID0gdGhpcy5ocmVmLmFuaW1WYWw7XG4gICAgICAgIGlmIChocmVmLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBVdGlsLmhhc2hDaGVjayhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChocmVmLnN1YnN0cigxKSkpO1xuICAgICAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQuc2Nyb2xsSW50b1ZpZXcpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhcmVudE5vZGUuc2Nyb2xsSW50b1ZpZXcodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBocmVmO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgdmFyIHNwYW4gPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3Byb2Nlc3NTdHlsZXMgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHtcbiAgICAgICAgICAgIGJvcmRlcjogVXRpbC5nZXRCb3JkZXJzKHN0eWxlKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IFV0aWwuZ2V0UGFkZGluZyhzdHlsZSlcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFzdHlsZXMuYm9yZGVyKVxuICAgICAgICAgICAgZGVsZXRlIHN0eWxlcy5ib3JkZXI7XG4gICAgICAgIGlmICghc3R5bGVzLnBhZGRpbmcpXG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLnBhZGRpbmc7XG4gICAgICAgIGlmIChzdHlsZS5mb250U2l6ZSlcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFNpemUnXSA9IHN0eWxlLmZvbnRTaXplO1xuICAgICAgICBpZiAoc3R5bGUuY29sb3IpXG4gICAgICAgICAgICBzdHlsZXNbJ2NvbG9yJ10gPSBzdHlsZS5jb2xvcjtcbiAgICAgICAgaWYgKHN0eWxlLmJhY2tncm91bmRDb2xvcilcbiAgICAgICAgICAgIHN0eWxlc1snYmFja2dyb3VuZCddID0gc3R5bGUuYmFja2dyb3VuZENvbG9yO1xuICAgICAgICBpZiAoc3R5bGUuZm9udFN0eWxlKVxuICAgICAgICAgICAgc3R5bGVzWydmb250U3R5bGUnXSA9IHN0eWxlLmZvbnRTdHlsZTtcbiAgICAgICAgaWYgKHN0eWxlLmZvbnRXZWlnaHQpXG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRXZWlnaHQnXSA9IHN0eWxlLmZvbnRXZWlnaHQ7XG4gICAgICAgIGlmIChzdHlsZS5mb250RmFtaWx5KVxuICAgICAgICAgICAgc3R5bGVzWydmb250RmFtaWx5J10gPSBzdHlsZS5mb250RmFtaWx5O1xuICAgICAgICBpZiAoc3R5bGVzWydmb250V2VpZ2h0J10gJiYgc3R5bGVzWydmb250V2VpZ2h0J10ubWF0Y2goL15cXGQrJC8pKVxuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSAocGFyc2VJbnQoc3R5bGVzWydmb250V2VpZ2h0J10pID4gNjAwID8gXCJib2xkXCIgOiBcIm5vcm1hbFwiKTtcbiAgICAgICAgcmV0dXJuIHN0eWxlcztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50eXBlICE9PSBcIm1vXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJsc3BhY2VcIiwgXCJyc3BhY2VcIik7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsIDw9IDAgfHwgdGhpcy5oYXNWYWx1ZShcImxzcGFjZVwiKSB8fCB0aGlzLmhhc1ZhbHVlKFwicnNwYWNlXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5sc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubHNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5yc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMucnNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhciBjb3JlID0gdGhpcywgcGFyZW50ID0gdGhpcy5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyZW50ICYmIHBhcmVudC5pc0VtYmVsbGlzaGVkKCkgJiYgcGFyZW50LkNvcmUoKSA9PT0gY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBjb3JlID0gcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKVxuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB2YWx1ZXMubHNwYWNlO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMucnNwYWNlKVxuICAgICAgICAgICAgICAgICAgICBzdmcuWCA9IHZhbHVlcy5yc3BhY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BhY2UgPSB0aGlzLnRleFNwYWNpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoKTtcbiAgICAgICAgICAgIGlmIChzcGFjZSAhPT0gXCJcIilcbiAgICAgICAgICAgICAgICBzdmcueCArPSBVdGlsLmxlbmd0aDJlbShzcGFjZSwgdGhpcy5zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlQ29sb3IgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcIm1hdGhjb2xvclwiLCBcImNvbG9yXCIpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZXMgJiYgdGhpcy5zdHlsZXMuY29sb3IgJiYgIXZhbHVlcy5jb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLmNvbG9yID0gdGhpcy5zdHlsZXMuY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5jb2xvciAmJiAhdGhpcy5tYXRoY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoY29sb3IgPSB2YWx1ZXMuY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5tYXRoY29sb3IpIHtcbiAgICAgICAgICAgIFV0aWwuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5tYXRoY29sb3IsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiB2YWx1ZXMubWF0aGNvbG9yXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvcmRlcnMgPSAodGhpcy5zdHlsZXMgfHwge30pLmJvcmRlciwgcGFkZGluZyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkucGFkZGluZywgYmxlZnQgPSAoKGJvcmRlcnMgfHwge30pLmxlZnQgfHwgMCksIHBsZWZ0ID0gKChwYWRkaW5nIHx8IHt9KS5sZWZ0IHx8IDApLCBpZDtcbiAgICAgICAgdmFsdWVzLmJhY2tncm91bmQgPSAodGhpcy5tYXRoYmFja2dyb3VuZCB8fCB0aGlzLmJhY2tncm91bmQgfHxcbiAgICAgICAgICAgICh0aGlzLnN0eWxlcyB8fCB7fSkuYmFja2dyb3VuZCB8fCBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLkNPTE9SLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgaWYgKGJsZWZ0ICsgcGxlZnQpIHtcbiAgICAgICAgICAgIHZhciBkdXAgPSBuZXcgQkJPWChNYXRoSmF4Lkh1Yik7XG4gICAgICAgICAgICBmb3IgKGlkIGluIHN2Zykge1xuICAgICAgICAgICAgICAgIGlmIChzdmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGR1cFtpZF0gPSBzdmdbaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR1cC54ID0gMDtcbiAgICAgICAgICAgIGR1cC55ID0gMDtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWRkKGR1cCwgYmxlZnQgKyBwbGVmdCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IHBhZGRpbmcudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBwYWRkaW5nLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICBzdmcudyArPSBib3JkZXJzLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBib3JkZXJzLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gYm9yZGVycy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmJhY2tncm91bmQgIT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuQ09MT1IuVFJBTlNQQVJFTlQpIHtcbiAgICAgICAgICAgIHZhciBub2RlTmFtZSA9IHN2Zy5lbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAobm9kZU5hbWUgIT09IFwiZ1wiICYmIG5vZGVOYW1lICE9PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5FbGVtZW50KFwiZ1wiKTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudCA9IGc7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZChuZXcgQkJPWF9SRUNUKHN2Zy5oLCBzdmcuZCwgc3ZnLncsIHtcbiAgICAgICAgICAgICAgICBmaWxsOiB2YWx1ZXMuYmFja2dyb3VuZCxcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9KSwgMCwgMCwgZmFsc2UsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICB2YXIgZGQgPSA1O1xuICAgICAgICAgICAgdmFyIHNpZGVzID0ge1xuICAgICAgICAgICAgICAgIGxlZnQ6IFtcIlZcIiwgc3ZnLmggKyBzdmcuZCwgLWRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIHN2Zy53IC0gYm9yZGVycy5yaWdodCArIGRkLCAtc3ZnLmRdLFxuICAgICAgICAgICAgICAgIHRvcDogW1wiSFwiLCBzdmcudywgMCwgc3ZnLmggLSBib3JkZXJzLnRvcCArIGRkXSxcbiAgICAgICAgICAgICAgICBib3R0b206IFtcIkhcIiwgc3ZnLncsIDAsIC1zdmcuZCAtIGRkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZvciAoaWQgaW4gc2lkZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2lkZXMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3JkZXJzW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNpZGUgPSBzaWRlc1tpZF0sIGJveCA9IEJCT1hbc2lkZVswXSArIFwiTElORVwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94KHNpZGVbMV0sIGJvcmRlcnNbaWRdLCBib3JkZXJzW2lkICsgXCJTdHlsZVwiXSwgYm9yZGVyc1tpZCArIFwiQ29sb3JcIl0pLCBzaWRlWzJdLCBzaWRlWzNdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0VmFyaWFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aHZhcmlhbnRcIiwgXCJmb250ZmFtaWx5XCIsIFwiZm9udHdlaWdodFwiLCBcImZvbnRzdHlsZVwiKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB2YWx1ZXMubWF0aHZhcmlhbnQ7XG4gICAgICAgIGlmICh0aGlzLnZhcmlhbnRGb3JtKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCItVGVYLXZhcmlhbnRcIjtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMuaGFzVmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSk7XG4gICAgICAgIGlmICghdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB2YWx1ZXMuZm9udGZhbWlseTtcbiAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB2YWx1ZXMuZm9udHdlaWdodDtcbiAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHZhbHVlcy5mb250c3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB0aGlzLnN0eWxlcy5mb250U3R5bGUpXG4gICAgICAgICAgICAgICAgdmFsdWVzLnN0eWxlID0gdGhpcy5zdHlsZXMuZm9udFN0eWxlO1xuICAgICAgICAgICAgaWYgKCF2YWx1ZXMud2VpZ2h0ICYmIHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQpXG4gICAgICAgICAgICAgICAgdmFsdWVzLndlaWdodCA9IHRoaXMuc3R5bGVzLmZvbnRXZWlnaHQ7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5mYW1pbHkgJiYgdGhpcy5zdHlsZXMuZm9udEZhbWlseSlcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdGhpcy5zdHlsZXMuZm9udEZhbWlseTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmZhbWlseSAmJiAhdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2JvbGQvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvaXRhbGljLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBmb3JjZUZhbWlseTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb250OiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFsdWVzLmZhbWlseVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFsdWVzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC1zdHlsZVwiXSA9IHZhbHVlcy5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC13ZWlnaHRcIl0gPSB2YWx1ZXMud2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwiYm9sZFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQsXG4gICAgICAgICAgICAgICAgaXRhbGljOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBmcmFrdHVyOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MREZSQUtUVVIsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRFNDUklQVCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTERTQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgYm9sZDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULm5vcm1hbCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgXCJib2xkLWZyYWt0dXJcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkZSQUtUVVIsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNjcmlwdFwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0NSSVBULFxuICAgICAgICAgICAgICAgIFwiYm9sZC1zYW5zLXNlcmlmXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnN0eWxlID09PSBcIml0YWxpY1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBib2xkOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRElUQUxJQyxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWZcIjogTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy5zdHlsZSA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBpdGFsaWM6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5TQU5TU0VSSUYsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmLWJvbGQtaXRhbGljXCI6IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5CT0xEU0FOU1NFUklGXG4gICAgICAgICAgICB9W3ZhcmlhbnRdIHx8IHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEodmFyaWFudCBpbiBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQS5WQVJJQU5UKSkge1xuICAgICAgICAgICAgdmFyaWFudCA9IFwibm9ybWFsXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlRbdmFyaWFudF07XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTY2FsZSA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHNjYWxlID0gMTtcbiAgICAgICAgaWYgKHRoaXMubXNjYWxlKSB7XG4gICAgICAgICAgICBzY2FsZSA9IHRoaXMuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImZvbnRzaXplXCIpO1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhzaXplID0gKHRoaXMuaXNUb2tlbiA/IHRoaXMgOiB0aGlzLlBhcmVudCgpKS5HZXQoXCJtYXRoc2l6ZVwiKTtcbiAgICAgICAgICAgIGlmICgodGhpcy5zdHlsZXMgfHwge30pLmZvbnRTaXplICYmICF2YWx1ZXMuZm9udHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZm9udHNpemUgPSB0aGlzLnN0eWxlcy5mb250U2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZm9udHNpemUgJiYgIXRoaXMubWF0aHNpemUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSB2YWx1ZXMuZm9udHNpemU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdGxldmVsID0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2NhbGUgPSBNYXRoLnBvdyh0aGlzLkdldChcInNjcmlwdHNpemVtdWx0aXBsaWVyXCIpLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRtaW5zaXplID0gVXRpbC5sZW5ndGgyZW0odGhpcy5HZXQoXCJzY3JpcHRtaW5zaXplXCIpKSAvIDEwMDA7XG4gICAgICAgICAgICAgICAgaWYgKHNjYWxlIDwgdmFsdWVzLnNjcmlwdG1pbnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgPSB2YWx1ZXMuc2NyaXB0bWluc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICB0aGlzLm1zY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXRoc2l6ZSkgLyAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcpIHtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb2tlbikge1xuICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSAqPSB0aGlzLm1zY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NhbGUgKiB0aGlzLm1zY2FsZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldE11ID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgbXUgPSAxLCB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIik7XG4gICAgICAgIGlmIChzdmcuc2NhbGUgJiYgc3ZnLnNjYWxlICE9PSAxKSB7XG4gICAgICAgICAgICBtdSA9IDEgLyBzdmcuc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCAhPT0gMCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5zY3JpcHRsZXZlbCA+IDIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXUgPSBNYXRoLnNxcnQoTWF0aC5wb3codmFsdWVzLnNjcmlwdHNpemVtdWx0aXBsaWVyLCB2YWx1ZXMuc2NyaXB0bGV2ZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbXU7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdub3RFbXB0eSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHdoaWxlIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoKGRhdGEudHlwZSAhPT0gXCJtcm93XCIgJiYgZGF0YS50eXBlICE9PSBcInRleGF0b21cIikgfHxcbiAgICAgICAgICAgICAgICBkYXRhLmRhdGEubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YSA9IGRhdGEuZGF0YVswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgY2FuID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlzRW1iZWxsaXNoZWQoKSkge1xuICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLkNvcmUoKTtcbiAgICAgICAgICAgIGlmIChjb3JlICYmIGNvcmUgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjYW4gPSBjb3JlLlNWR2NhblN0cmV0Y2goZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FuICYmIGNvcmUuZm9yY2VTdHJldGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9yY2VTdHJldGNoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbjtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcoaCwgZCk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvU1ZHKHcpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHbGluZUJyZWFrcyA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHYXV0b2xvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIHRoaXMudHlwZSArIFwiLmpzXCI7XG4gICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBmaWxlID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIG5hbWUgKyBcIi5qc1wiO1xuICAgICAgICByZXR1cm4gTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuaXNDdXJzb3JhYmxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBhcyBjdXJzb3IgY29udGFpbmVyJyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBkcmF3IGN1cnNvcicpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvckhpZ2hsaWdodCA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdmdlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50O1xuICAgICAgICBjdXJzb3IuZHJhd0hpZ2hsaWdodEF0KHN2Z2VsZW0sIGJiLngsIGJiLnksIGJiLndpZHRoLCBiYi5oZWlnaHQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuZ2V0U1ZHQkJveCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBlbGVtID0gZWxlbSB8fCB0aGlzLkVkaXRhYmxlU1ZHZWxlbTtcbiAgICAgICAgaWYgKCFlbGVtIHx8ICFlbGVtLm93bmVyU1ZHRWxlbWVudClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGJiID0gZWxlbS5nZXRCQm94KCk7XG4gICAgICAgIGlmIChlbGVtLm5vZGVOYW1lID09PSAndXNlJykge1xuICAgICAgICAgICAgYmIueCArPSBOdW1iZXIoZWxlbS5nZXRBdHRyaWJ1dGUoJ3gnKSk7XG4gICAgICAgICAgICBiYi55ICs9IE51bWJlcihlbGVtLmdldEF0dHJpYnV0ZSgneScpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gZWxlbS5nZXRUcmFuc2Zvcm1Ub0VsZW1lbnQoZWxlbS5vd25lclNWR0VsZW1lbnQpO1xuICAgICAgICB2YXIgcHRtcCA9IGVsZW0ub3duZXJTVkdFbGVtZW50LmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHZhciBseCA9IDEgLyAwLCBseSA9IDEgLyAwLCBoeCA9IC0xIC8gMCwgaHkgPSAtMSAvIDA7XG4gICAgICAgIGNoZWNrKGJiLngsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54ICsgYmIud2lkdGgsIGJiLnkpO1xuICAgICAgICBjaGVjayhiYi54LCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgY2hlY2soYmIueCArIGJiLndpZHRoLCBiYi55ICsgYmIuaGVpZ2h0KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IGx4LFxuICAgICAgICAgICAgeTogbHksXG4gICAgICAgICAgICB3aWR0aDogaHggLSBseCxcbiAgICAgICAgICAgIGhlaWdodDogaHkgLSBseSxcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gY2hlY2soeCwgeSkge1xuICAgICAgICAgICAgcHRtcC54ID0geDtcbiAgICAgICAgICAgIHB0bXAueSA9IHk7XG4gICAgICAgICAgICB2YXIgcCA9IHB0bXAubWF0cml4VHJhbnNmb3JtKHRyYW5zZm9ybSk7XG4gICAgICAgICAgICBseCA9IE1hdGgubWluKGx4LCBwLngpO1xuICAgICAgICAgICAgbHkgPSBNYXRoLm1pbihseSwgcC55KTtcbiAgICAgICAgICAgIGh4ID0gTWF0aC5tYXgoaHgsIHAueCk7XG4gICAgICAgICAgICBoeSA9IE1hdGgubWF4KGh5LCBwLnkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gTUJhc2VNaXhpbjtcbn0pKEVsZW1lbnRKYXgpO1xudmFyIENoYXJzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDaGFyc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENoYXJzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBDaGFyc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIikucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5IYW5kbGVWYXJpYW50ID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCB0ZXh0KSB7XG4gICAgICAgIHZhciBFRElUQUJMRVNWRyA9IE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHO1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIG4sIE4sIGMsIGZvbnQsIFZBUklBTlQsIGksIG0sIGlkLCBNLCBSQU5HRVM7XG4gICAgICAgIGlmICghdmFyaWFudCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULk5PUk1BTF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhcmlhbnQuZm9yY2VGYW1pbHkpIHtcbiAgICAgICAgICAgIHRleHQgPSBuZXcgQkJPWF9URVhUKE1hdGhKYXguSFRNTCwgc2NhbGUsIHRleHQsIHZhcmlhbnQuZm9udCk7XG4gICAgICAgICAgICBpZiAodmFyaWFudC5oICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRleHQuZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQodGV4dCk7XG4gICAgICAgICAgICB0ZXh0ID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBWQVJJQU5UID0gdmFyaWFudDtcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRleHQubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gVkFSSUFOVDtcbiAgICAgICAgICAgIG4gPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICBjID0gdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICBpZiAobiA+PSAweEQ4MDAgJiYgbiA8IDB4REJGRikge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICBuID0gKCgobiAtIDB4RDgwMCkgPDwgMTApICsgKHRleHQuY2hhckNvZGVBdChpKSAtIDB4REMwMCkpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICBpZiAoRk9OVERBVEEuUmVtYXBQbGFuZTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG52ID0gRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSBGT05UREFUQS5SQU5HRVM7XG4gICAgICAgICAgICAgICAgZm9yIChpZCA9IDAsIE0gPSBSQU5HRVMubGVuZ3RoOyBpZCA8IE07IGlkKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ubmFtZSA9PT0gXCJhbHBoYVwiICYmIHZhcmlhbnQubm9Mb3dlckNhc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgTiA9IHZhcmlhbnRbXCJvZmZzZXRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE4gJiYgbiA+PSBSQU5HRVNbaWRdLmxvdyAmJiBuIDw9IFJBTkdFU1tpZF0uaGlnaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0ucmVtYXAgJiYgUkFOR0VTW2lkXS5yZW1hcFtuXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBOICsgUkFOR0VTW2lkXS5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBuIC0gUkFOR0VTW2lkXS5sb3cgKyBOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChSQU5HRVNbaWRdLmFkZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuICs9IFJBTkdFU1tpZF0uYWRkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50W1widmFyaWFudFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudCA9IEZPTlREQVRBLlZBUklBTlRbdmFyaWFudFtcInZhcmlhbnRcIiArIFJBTkdFU1tpZF0ub2Zmc2V0XV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LnJlbWFwICYmIHZhcmlhbnQucmVtYXBbbl0pIHtcbiAgICAgICAgICAgICAgICBuID0gdmFyaWFudC5yZW1hcFtuXTtcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcC52YXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuUkVNQVBbbl0gJiYgIXZhcmlhbnQubm9SZW1hcCkge1xuICAgICAgICAgICAgICAgIG4gPSBGT05UREFUQS5SRU1BUFtuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50ID0gRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSBDaGFyc01peGluLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBGKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCQk9YX0dMWVBILmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gQkJPWF9HTFlQSC5wcm90b3R5cGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBnbHlwaCA9IG5ldyBGKGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGdseXBoLCBzdmcudywgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoRk9OVERBVEEuREVMSU1JVEVSU1tuXSkge1xuICAgICAgICAgICAgICAgIGMgPSB0aGlzLmNyZWF0ZURlbGltaXRlcihuLCAwLCAxLCBmb250KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAoRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKE1hdGhKYXguSFRNTCwgc2NhbGUgKiAxMDAgLyBFRElUQUJMRVNWRy5jb25maWcuc2NhbGUsIGMsIHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiB2YXJpYW50LmRlZmF1bHRGYW1pbHkgfHwgRURJVEFCTEVTVkcuY29uZmlnLnVuZGVmaW5lZEZhbWlseSxcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6ICh2YXJpYW50Lml0YWxpYyA/IFwiaXRhbGljXCIgOiBcIlwiKSxcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXdlaWdodFwiOiAodmFyaWFudC5ib2xkID8gXCJib2xkXCIgOiBcIlwiKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh2YXJpYW50LmggIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGJveC5oID0gdmFyaWFudC5oO1xuICAgICAgICAgICAgICAgIGlmICh2YXJpYW50LmQgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGJveC5kID0gdmFyaWFudC5kO1xuICAgICAgICAgICAgICAgIGMgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgICAgICAgICAgYy5BZGQoYm94KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAwKTtcbiAgICAgICAgICAgICAgICBNYXRoSmF4Lkh1Yi5zaWduYWwuUG9zdChbXCJTVkcgSmF4IC0gdW5rbm93biBjaGFyXCIsIG4sIHZhcmlhbnRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQubGVuZ3RoID09IDEgJiYgZm9udC5za2V3ICYmIGZvbnQuc2tld1tuXSkge1xuICAgICAgICAgICAgc3ZnLnNrZXcgPSBmb250LnNrZXdbbl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBDaGFyc01peGluLmxvb2t1cENoYXIgPSBmdW5jdGlvbiAodmFyaWFudCwgbikge1xuICAgICAgICB2YXIgaSwgbTtcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghdmFyaWFudC5GT05UUykge1xuICAgICAgICAgICAgdmFyIEZPTlRTID0gRk9OVERBVEEuRk9OVFM7XG4gICAgICAgICAgICB2YXIgZm9udHMgPSAodmFyaWFudC5mb250cyB8fCBGT05UREFUQS5WQVJJQU5ULm5vcm1hbC5mb250cyk7XG4gICAgICAgICAgICBpZiAoIShmb250cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIGZvbnRzID0gW2ZvbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmZvbnRzICE9IGZvbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250cyA9IGZvbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudC5GT05UUyA9IFtdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IGZvbnRzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChGT05UU1tmb250c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudC5GT05UUy5wdXNoKEZPTlRTW2ZvbnRzW2ldXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB2YXJpYW50LkZPTlRTLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIGZvbnQgPSB2YXJpYW50LkZPTlRTW2ldO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAoZm9udCkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdmFyaWFudC5GT05UUztcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZvbnRbbl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9udDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZEJsb2NrKGZvbnQsIG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogXCJ1bmtub3duXCJcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uY3JlYXRlRGVsaW1pdGVyID0gZnVuY3Rpb24gKGNvZGUsIEhXLCBzY2FsZSwgZm9udCkge1xuICAgICAgICBpZiAoc2NhbGUgPT09IHZvaWQgMCkgeyBzY2FsZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKGZvbnQgPT09IHZvaWQgMCkgeyBmb250ID0gbnVsbDsgfVxuICAgICAgICB2YXIgRURJVEFCTEVTVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIGlmICghc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gMTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIGlmICghY29kZSkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogc2NhbGU7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKEhXIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBIVyA9IFtIVywgSFddO1xuICAgICAgICB9XG4gICAgICAgIHZhciBodyA9IEhXWzFdO1xuICAgICAgICBIVyA9IEhXWzBdO1xuICAgICAgICB2YXIgZGVsaW0gPSB7XG4gICAgICAgICAgICBhbGlhczogY29kZSxcbiAgICAgICAgICAgIEhXOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsb2FkOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkaXI6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgICAgICB3aGlsZSAoZGVsaW0uYWxpYXMpIHtcbiAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5hbGlhcztcbiAgICAgICAgICAgIGRlbGltID0gRk9OVERBVEEuREVMSU1JVEVSU1tjb2RlXTtcbiAgICAgICAgICAgIGlmICghZGVsaW0pIHtcbiAgICAgICAgICAgICAgICBkZWxpbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgSFc6IFswLCBGT05UREFUQS5WQVJJQU5UW01hdGhKYXguRWxlbWVudEpheC5tbWwuVkFSSUFOVC5OT1JNQUxdXSxcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgbG9hZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBzdHJldGNoOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGRpcjogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubG9hZCkge1xuICAgICAgICAgICAgTWF0aEpheC5IdWIuUmVzdGFydEFmdGVyKE1hdGhKYXguQWpheC5SZXF1aXJlKEVESVRBQkxFU1ZHLmZvbnREaXIgKyBcIi9mb250ZGF0YS1cIiArIGRlbGltLmxvYWQgKyBcIi5qc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkZWxpbS5IVy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVswXSAqIHNjYWxlID49IEhXIC0gMTAgLSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5ibGFja2VyIHx8IChpID09IG0gLSAxICYmICFkZWxpbS5zdHJldGNoKSkge1xuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVsyXSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSAqPSBkZWxpbS5IV1tpXVsyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzNdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5IV1tpXVszXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2hhcihzY2FsZSwgW2NvZGUsIGRlbGltLkhXW2ldWzFdXSwgZm9udCkuV2l0aCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0uc3RyZXRjaCkge1xuICAgICAgICAgICAgdGhpc1tcImV4dGVuZERlbGltaXRlclwiICsgZGVsaW0uZGlyXShzdmcsIGh3LCBkZWxpbS5zdHJldGNoLCBzY2FsZSwgZm9udCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIENoYXJzTWl4aW4uY3JlYXRlQ2hhciA9IGZ1bmN0aW9uIChzY2FsZSwgZGF0YSwgZm9udCkge1xuICAgICAgICB2YXIgdGV4dCA9IFwiXCIsIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICBmb250czogW2RhdGFbMV1dLFxuICAgICAgICAgICAgbm9SZW1hcDogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBpZiAoZm9udCAmJiBmb250ID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLlZBUklBTlQuQk9MRCkge1xuICAgICAgICAgICAgdmFyaWFudC5mb250cyA9IFtkYXRhWzFdICsgXCItYm9sZFwiLCBkYXRhWzFdXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIChkYXRhWzFdKSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFyaWFudCA9IGRhdGFbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbMF0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkYXRhWzBdLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHRleHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRleHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzRdKSB7XG4gICAgICAgICAgICBzY2FsZSA9IHNjYWxlICogZGF0YVs0XTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gdGhpcy5IYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICAgICAgaWYgKGRhdGFbMl0pIHtcbiAgICAgICAgICAgIHN2Zy54ID0gZGF0YVsyXSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbM10pIHtcbiAgICAgICAgICAgIHN2Zy55ID0gZGF0YVszXSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNV0pIHtcbiAgICAgICAgICAgIHN2Zy5oICs9IGRhdGFbNV0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzZdKSB7XG4gICAgICAgICAgICBzdmcuZCArPSBkYXRhWzZdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5maW5kQmxvY2sgPSBmdW5jdGlvbiAoZm9udCwgYykge1xuICAgICAgICBpZiAoZm9udC5SYW5nZXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZm9udC5SYW5nZXMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPCBmb250LlJhbmdlc1tpXVswXSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmIChjIDw9IGZvbnQuUmFuZ2VzW2ldWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWxlID0gZm9udC5SYW5nZXNbaV1bMl07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSBmb250LlJhbmdlcy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvbnQuUmFuZ2VzW2pdWzJdID09IGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250LlJhbmdlcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkRm9udChmb250LmRpcmVjdG9yeSArIFwiL1wiICsgZmlsZSArIFwiLmpzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgQ2hhcnNNaXhpbi5sb2FkRm9udCA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgIE1hdGhKYXguSHViLlJlc3RhcnRBZnRlcihNYXRoSmF4LkFqYXguUmVxdWlyZShNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5mb250RGlyICsgXCIvXCIgKyBmaWxlKSk7XG4gICAgfTtcbiAgICByZXR1cm4gQ2hhcnNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIEVudGl0eU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRW50aXR5TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gRW50aXR5TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBFbnRpdHlNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHJlbWFwLCBjaGFycykge1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMudG9TdHJpbmcoKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBDaGFyc01peGluLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgIH07XG4gICAgcmV0dXJuIEVudGl0eU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgSG9sZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEhvbGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gSG9sZSgpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEhvbGUucHJvdG90eXBlLkluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IFwiaG9sZVwiO1xuICAgICAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgSG9sZS5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKGQgIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLnNoID0gaDtcbiAgICAgICAgICAgIHN2Zy5zZCA9IGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTk9OVFJJVklBTCBIT0xFISEhJyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHZhciBob2xlID0gbmV3IEJCT1hfUkVDVCg0MDAsIDAsIDMwMCwge1xuICAgICAgICAgICAgZmlsbDogJ3doaXRlJyxcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsdWUnLFxuICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogJzIwJ1xuICAgICAgICB9KTtcbiAgICAgICAgc3ZnLkFkZChob2xlLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvbGUgZG9lcyBub3QgaGF2ZSBhIGNoaWxkJyk7XG4gICAgfTtcbiAgICBIb2xlLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEhvbGUucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgIH07XG4gICAgSG9sZS5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHggPSBiYm94LnggKyAoYmJveC53aWR0aCAvIDIuMCk7XG4gICAgICAgIHZhciB5ID0gYmJveC55O1xuICAgICAgICB2YXIgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgIGN1cnNvci5kcmF3QXQodGhpcy5FZGl0YWJsZVNWR2VsZW0ub3duZXJTVkdFbGVtZW50LCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIEhvbGU7XG59KShNQmFzZU1peGluKTtcbnZhciBNQWN0aW9uTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQWN0aW9uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUFjdGlvbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUFjdGlvbk1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNQWN0aW9uTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNYXRoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXRoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWF0aE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICBNYXRoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHNwYW4sIGRpdiwgcmVwbGFjZSkge1xuICAgICAgICB2YXIgQ09ORklHID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnO1xuICAgICAgICB0aGlzLmxvYWRUZXhpZnkoKTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbMF0pXG4gICAgICAgICAgICByZXR1cm4gc3BhbjtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gTWF0aEpheC5IdWIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50O1xuICAgICAgICBpZiAoU3RyaW5nKE1hdGhKYXguSHViLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUluZGVudCA9IFwiMFwiO1xuICAgICAgICB2YXIgYm94ID0gbmV3IEJCT1hfRygpO1xuICAgICAgICB2YXIgZGF0YVN2ZyA9IHRoaXMuZGF0YVswXS50b1NWRygpO1xuICAgICAgICBib3guQWRkKGRhdGFTdmcsIDAsIDAsIHRydWUpO1xuICAgICAgICBib3guQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICBVdGlsLkVsZW1lbnQoYm94LmVsZW1lbnQsIHtcbiAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiAwLFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9TVkcoKTtcbiAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgVXRpbC5YTElOS05TKTtcbiAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbCA9IE1hdGgubWF4KC1zdmcubCwgMCksIHIgPSBNYXRoLm1heChzdmcuciAtIHN2Zy53LCAwKTtcbiAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIFV0aWwuRXgobCArIHN2Zy53ICsgcikpO1xuICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgVXRpbC5FeChzdmcuSCArIHN2Zy5EICsgMiAqIFV0aWwuZW0pKTtcbiAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IFV0aWwuRXgoLXN2Zy5EIC0gMiAqIFV0aWwuZW0pO1xuICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gVXRpbC5FeCgtbCk7XG4gICAgICAgIHN0eWxlLm1hcmdpblJpZ2h0ID0gVXRpbC5FeCgtcik7XG4gICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgVXRpbC5GaXhlZCgtbCwgMSkgKyBcIiBcIiArIFV0aWwuRml4ZWQoLXN2Zy5IIC0gVXRpbC5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICBVdGlsLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyBVdGlsLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogVXRpbC5lbSwgMSkpO1xuICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luVG9wID0gVXRpbC5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgPiBzdmcuZCkge1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gVXRpbC5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgIHN0eWxlLnZlcnRpY2FsQWxpZ24gPSBVdGlsLkV4KC1zdmcuZCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsdHRleHQgPSB0aGlzLkdldChcImFsdHRleHRcIik7XG4gICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICBpZiAoIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcInJvbGVcIikpXG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICBzdmcuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdyZW5kZXJlZC1zdmctb3V0cHV0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91cyA9IHNwYW4ucXVlcnlTZWxlY3RvcignLnJlbmRlcmVkLXN2Zy1vdXRwdXQnKTtcbiAgICAgICAgaWYgKHJlcGxhY2UgJiYgcHJldmlvdXMpIHtcbiAgICAgICAgICAgIHNwYW4ucmVwbGFjZUNoaWxkKHN2Zy5lbGVtZW50LCBwcmV2aW91cyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuZWxlbWVudCA9IG51bGw7XG4gICAgICAgIGlmICghdGhpcy5pc011bHRpbGluZSAmJiB0aGlzLkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIiAmJiAhc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaW5kZW50YWxpZ25maXJzdFwiLCBcImluZGVudHNoaWZ0Zmlyc3RcIiwgXCJpbmRlbnRhbGlnblwiLCBcImluZGVudHNoaWZ0XCIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0ICE9PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudGFsaWduID0gdmFsdWVzLmluZGVudGFsaWduZmlyc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduID09PSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sLklOREVOVEFMSUdOLkFVVE8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdCAhPT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSBcIjBcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5pbmRlbnRzaGlmdCwgMSwgdGhpcy5lZGl0YWJsZVNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUluZGVudCAhPT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCAxLCB0aGlzLmVkaXRhYmxlU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICAgICAgc2hpZnQgKz0gKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5JTkRFTlRBTElHTi5SSUdIVCA/IC1pbmRlbnQgOiBpbmRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LnN0eWxlLnRleHRBbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbjtcbiAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgIE1hdGhKYXguSHViLkluc2VydChzdHlsZSwgKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogVXRpbC5FeChzaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiBVdGlsLkV4KHNoaWZ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiBVdGlsLkV4KC1zaGlmdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pW3ZhbHVlcy5pbmRlbnRhbGlnbl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzcGFuO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5sb2FkVGV4aWZ5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZEZpbGUoJ3RleGlmeScpO1xuICAgIH07XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNRXJyb3JNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FcnJvck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FcnJvck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgVXRpbC5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKGRlZik7XG4gICAgICAgIGJib3guQWRkKHRoaXMuU1ZHY2hpbGRTVkcoMCkpO1xuICAgICAgICBiYm94LkNsZWFuKCk7XG4gICAgICAgIGlmIChzY2FsZSAhPT0gMSkge1xuICAgICAgICAgICAgYmJveC5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ID0gW1wid1wiLCBcImhcIiwgXCJkXCIsIFwibFwiLCBcInJcIiwgXCJEXCIsIFwiSFwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gYWRqdXN0Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGJib3hbYWRqdXN0W2ldXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQWRkKGJib3gpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZTogTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm1lcnJvclN0eWxlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICBNYXRoSmF4Lkh1Yi5JbnNlcnQodGhpcy5zdHlsZXMsIHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNRXJyb3JNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1GZW5jZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GZW5jZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRmVuY2VkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRmVuY2VkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5vcGVuKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLm9wZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDEsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmNsb3NlKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLmNsb3NlKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTUZlbmNlZE1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTUZyYWNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GcmFjTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZyYWNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHZhciBmcmFjID0gbmV3IEJCT1goKTtcbiAgICAgICAgZnJhYy5zY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShmcmFjKTtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCksIGRlbiA9IHRoaXMuU1ZHY2hpbGRTVkcoMSk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImxpbmV0aGlja25lc3NcIiwgXCJudW1hbGlnblwiLCBcImRlbm9tYWxpZ25cIiwgXCJiZXZlbGxlZFwiKTtcbiAgICAgICAgdmFyIGlzRGlzcGxheSA9IHZhbHVlcy5kaXNwbGF5c3R5bGU7XG4gICAgICAgIHZhciBhID0gVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgaWYgKHZhbHVlcy5iZXZlbGxlZCkge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gKGlzRGlzcGxheSA/IDQwMCA6IDE1MCk7XG4gICAgICAgICAgICB2YXIgSCA9IE1hdGgubWF4KG51bS5oICsgbnVtLmQsIGRlbi5oICsgZGVuLmQpICsgMiAqIGRlbHRhO1xuICAgICAgICAgICAgdmFyIGJldmVsID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIoMHgyRiwgSCk7XG4gICAgICAgICAgICBmcmFjLkFkZChudW0sIDAsIChudW0uZCAtIG51bS5oKSAvIDIgKyBhICsgZGVsdGEpO1xuICAgICAgICAgICAgZnJhYy5BZGQoYmV2ZWwsIG51bS53IC0gZGVsdGEgLyAyLCAoYmV2ZWwuZCAtIGJldmVsLmgpIC8gMiArIGEpO1xuICAgICAgICAgICAgZnJhYy5BZGQoZGVuLCBudW0udyArIGJldmVsLncgLSBkZWx0YSwgKGRlbi5kIC0gZGVuLmgpIC8gMiArIGEgLSBkZWx0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgVyA9IE1hdGgubWF4KG51bS53LCBkZW4udyk7XG4gICAgICAgICAgICB2YXIgdCA9IFV0aWwudGhpY2tuZXNzMmVtKHZhbHVlcy5saW5ldGhpY2tuZXNzLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlLCBwLCBxLCB1LCB2O1xuICAgICAgICAgICAgdmFyIG10ID0gVXRpbC5UZVgubWluX3J1bGVfdGhpY2tuZXNzIC8gVXRpbC5lbSAqIDEwMDA7XG4gICAgICAgICAgICBpZiAoaXNEaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgdSA9IFV0aWwuVGVYLm51bTE7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHUgPSAodCA9PT0gMCA/IFV0aWwuVGVYLm51bTMgOiBVdGlsLlRlWC5udW0yKTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdSAqPSBzY2FsZTtcbiAgICAgICAgICAgIHYgKj0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gNyA6IDMpICogVXRpbC5UZVgucnVsZV90aGlja25lc3MsIDIgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMudyA9IFc7XG4gICAgICAgICAgICAgICAgdCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDIgOiAwKSAqIG10ICsgdCwgdCAvIDIgKyAxLjUgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGEgKyB0IC8gMik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEgPSAoYSAtIHQgLyAyKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB2ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLkFkZChuZXcgQkJPWF9SRUNUKHQgLyAyLCB0IC8gMiwgVyArIDIgKiB0KSwgMCwgYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFjLkFsaWduKG51bSwgdmFsdWVzLm51bWFsaWduLCB0LCB1KTtcbiAgICAgICAgICAgIGZyYWMuQWxpZ24oZGVuLCB2YWx1ZXMuZGVub21hbGlnbiwgdCwgLXYpO1xuICAgICAgICB9XG4gICAgICAgIGZyYWMuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLkFkZChmcmFjLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy50ZXhXaXRoRGVsaW1zICYmICF0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLlggPSBVdGlsLlRlWC5udWxsZGVsaW1pdGVyc3BhY2UgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlLmNhbGwodGhpcywgc3ZnKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgbWlkbGluZVkgPSBiYi55ICsgKGJiLmhlaWdodCAvIDIuMCk7XG4gICAgICAgIHZhciBtaWRsaW5lWCA9IGJiLnggKyAoYmIud2lkdGggLyAyLjApO1xuICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogKHggPCBtaWRsaW5lWCkgPyAwIDogMSxcbiAgICAgICAgICAgIGhhbGY6ICh5IDwgbWlkbGluZVkpID8gMCA6IDEsXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLmhhbGZdLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLmhhbGYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjdXJzb3InKTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5wb3NpdGlvbiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24ucG9zaXRpb24gPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0Rlbm9taW5hdG9yKGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucG9zaXRpb24uaGFsZiA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkLCBrZWVwKSB7XG4gICAgICAgIHZhciBpc051bWVyYXRvciA9IHRoaXMuZGF0YVswXSA9PT0gY2hpbGQ7XG4gICAgICAgIHZhciBpc0Rlbm9taW5hdG9yID0gdGhpcy5kYXRhWzFdID09PSBjaGlsZDtcbiAgICAgICAgaWYgKCFpc051bWVyYXRvciAmJiAhaXNEZW5vbWluYXRvcilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3BlY2lmaWVkIGNoaWxkIG5vdCBmb3VuZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICBpZiAoaXNOdW1lcmF0b3IgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9EZW5vbWluYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNEZW5vbWluYXRvciAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW92ZUN1cnNvckludG9OdW1lcmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGtlZXApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZihpc051bWVyYXRvciA/IDAgOiAxLCBjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvSGFsZiA9IGZ1bmN0aW9uIChoYWxmLCBjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBpZiAodGhpcy5kYXRhW2hhbGZdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2hhbGZdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgICBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24pIHtcbiAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtoYWxmXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoYmIgJiYgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBoYWxmOiBoYWxmLFxuICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29ySW50b051bWVyYXRvciA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvSGFsZigwLCBjLCBkKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IgPSBmdW5jdGlvbiAoYywgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b0hhbGYoMSwgYywgZCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uTEVGVDpcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLlJJR0hUOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbMF0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgICAgICAgICBoYWxmOiAwLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgPyAwIDogMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNhc2UgRGlyZWN0aW9uLlVQOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdmVDdXJzb3JJbnRvRGVub21pbmF0b3IoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgY2FzZSBEaXJlY3Rpb24uRE9XTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tb3ZlQ3Vyc29ySW50b051bWVyYXRvcihjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5oYWxmID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY3Vyc29yJyk7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbi5oYWxmXS5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHggPSBiYm94LnggKyAoY3Vyc29yLnBvc2l0aW9uLnBvc2l0aW9uID8gYmJveC53aWR0aCArIDEwMCA6IC0xMDApO1xuICAgICAgICB2YXIgeSA9IGJib3gueTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICBNRnJhY01peGluLm5hbWUgPSBcIm1mcmFjXCI7XG4gICAgcmV0dXJuIE1GcmFjTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNR2x5cGhNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1HbHlwaE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1HbHlwaE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUdseXBoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBNR2x5cGhNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1NdWx0aVNjcmlwdHNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1NdWx0aVNjcmlwdHNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNTXVsdGlTY3JpcHRzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNTXVsdGlTY3JpcHRzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1NdWx0aVNjcmlwdHNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1uTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNbk1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1uTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNbk1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLmdldEN1cnNvckxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVswXS5kYXRhWzBdLmxlbmd0aDtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICBpZiAodmVydGljYWwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgIHZhciBuZXdQb3NpdGlvbiA9IGN1cnNvci5wb3NpdGlvbiArIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gLTEgOiAxKTtcbiAgICAgICAgaWYgKG5ld1Bvc2l0aW9uIDwgMCB8fCBuZXdQb3NpdGlvbiA+IHRoaXMuZ2V0Q3Vyc29yTGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgbmV3UG9zaXRpb24pO1xuICAgIH07XG4gICAgTW5NaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIGFzIGN1cnNvciBjb250YWluZXInKTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgdGhpcy5nZXRDdXJzb3JMZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24gJiZcbiAgICAgICAgICAgIHRoaXMubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLngsIGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNbk1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICBmb3IgKHZhciBjaGlsZElkeCA9IDA7IGNoaWxkSWR4IDwgdGhpcy5nZXRDdXJzb3JMZW5ndGgoKTsgKytjaGlsZElkeCkge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gdGhpcy5kYXRhW2NoaWxkSWR4XTtcbiAgICAgICAgICAgIHZhciBiYiA9IGNoaWxkLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJiLnggKyAoYmIud2lkdGggLyAyKTtcbiAgICAgICAgICAgIGlmICh4IDwgbWlkcG9pbnQpIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1uTWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBwcmVlZGdlO1xuICAgICAgICB2YXIgcG9zdGVkZ2U7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBiYm94Lng7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJlYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBwcmVib3gueCArIHByZWJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSB0aGlzLmdldEN1cnNvckxlbmd0aCgpKSB7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IGJib3gueCArIGJib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9zdGJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gcG9zdGJveC54O1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gKHBvc3RlZGdlICsgcHJlZWRnZSkgLyAyO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgcmV0dXJuIE1uTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNb01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW9NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNb01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW9NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgaWYgKEhXID09PSB2b2lkIDApIHsgSFcgPSBudWxsOyB9XG4gICAgICAgIGlmIChEID09PSB2b2lkIDApIHsgRCA9IG51bGw7IH1cbiAgICAgICAgdmFyIEZPTlREQVRBID0gTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuRk9OVERBVEE7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLlNWR3N0cmV0Y2hIKEhXKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJsYXJnZW9wXCIsIFwiZGlzcGxheXN0eWxlXCIpO1xuICAgICAgICBpZiAodmFsdWVzLmxhcmdlb3ApIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW3ZhbHVlcy5kaXNwbGF5c3R5bGUgPyBcIi1sYXJnZU9wXCIgOiBcIi1zbWFsbE9wXCJdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgdmFyIGlzU2NyaXB0ID0gKHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXN1YnN1cCkgJiYgdGhpcyAhPT0gcGFyZW50LmRhdGFbMF0pO1xuICAgICAgICB2YXIgbWFwY2hhcnMgPSAoaXNTY3JpcHQgPyB0aGlzLnJlbWFwQ2hhcnMgOiBudWxsKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCA9PT0gMSAmJiBwYXJlbnQgJiYgcGFyZW50LmlzYShNYXRoSmF4LkVsZW1lbnRKYXgubW1sLm11bmRlcm92ZXIpICYmXG4gICAgICAgICAgICB0aGlzLkNvcmVUZXh0KHBhcmVudC5kYXRhW3BhcmVudC5iYXNlXSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgb3ZlciA9IHBhcmVudC5kYXRhW3BhcmVudC5vdmVyXSwgdW5kZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQudW5kZXJdO1xuICAgICAgICAgICAgaWYgKG92ZXIgJiYgdGhpcyA9PT0gb3Zlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50XCIpKSB7XG4gICAgICAgICAgICAgICAgbWFwY2hhcnMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHVuZGVyICYmIHRoaXMgPT09IHVuZGVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnR1bmRlclwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRk9OVERBVEEuUkVNQVBBQ0NFTlRVTkRFUjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTY3JpcHQgJiYgdGhpcy5kYXRhLmpvaW4oXCJcIikubWF0Y2goL1snYFwiXFx1MDBCNFxcdTIwMzItXFx1MjAzN1xcdTIwNTddLykpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBGT05UREFUQS5WQVJJQU5UW1wiLVRlWC12YXJpYW50XCJdO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHNjYWxlLCB0aGlzLnJlbWFwLCBtYXBjaGFycyksIHggPSBzdmcudztcbiAgICAgICAgICAgICAgICBpZiAoeCA9PT0gMCAmJiAtdGV4dC5sID4gMTAgKiB0ZXh0LncpIHtcbiAgICAgICAgICAgICAgICAgICAgeCArPSAtdGV4dC5sO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKHRleHQsIHgsIDAsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0LnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSB0ZXh0LnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5sYXJnZW9wKSB7XG4gICAgICAgICAgICBzdmcueSA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0IC0gKHN2Zy5oIC0gc3ZnLmQpIC8gMiAvIHNjYWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5yID4gc3ZnLncpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdjYW5TdHJldGNoID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICB2YXIgRk9OVERBVEEgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5GT05UREFUQTtcbiAgICAgICAgaWYgKCF0aGlzLkdldChcInN0cmV0Y2h5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGMgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKGMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiBwYXJlbnQuaXNhKE1hdGhKYXguRWxlbWVudEpheC5tbWwubXVuZGVyb3ZlcikgJiZcbiAgICAgICAgICAgIHRoaXMuQ29yZVRleHQocGFyZW50LmRhdGFbcGFyZW50LmJhc2VdKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBvdmVyID0gcGFyZW50LmRhdGFbcGFyZW50Lm92ZXJdLCB1bmRlciA9IHBhcmVudC5kYXRhW3BhcmVudC51bmRlcl07XG4gICAgICAgICAgICBpZiAob3ZlciAmJiB0aGlzID09PSBvdmVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnRcIikpIHtcbiAgICAgICAgICAgICAgICBjID0gRk9OVERBVEEuUkVNQVBBQ0NFTlRbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHVuZGVyICYmIHRoaXMgPT09IHVuZGVyLkNvcmVNTygpICYmIHBhcmVudC5HZXQoXCJhY2NlbnR1bmRlclwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBGT05UREFUQS5SRU1BUEFDQ0VOVFVOREVSW2NdIHx8IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYyA9IEZPTlREQVRBLkRFTElNSVRFUlNbYy5jaGFyQ29kZUF0KDApXTtcbiAgICAgICAgdmFyIGNhbiA9IChjICYmIGMuZGlyID09IGRpcmVjdGlvbi5zdWJzdHIoMCwgMSkpO1xuICAgICAgICBpZiAoIWNhbikge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3ZnO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9yY2VTdHJldGNoID0gY2FuICYmICh0aGlzLkdldChcIm1pbnNpemVcIiwgdHJ1ZSkgfHwgdGhpcy5HZXQoXCJtYXhzaXplXCIsIHRydWUpKTtcbiAgICAgICAgcmV0dXJuIGNhbjtcbiAgICB9O1xuICAgIE1vTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnIHx8IHRoaXMudG9TVkcoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic3ltbWV0cmljXCIsIFwibWF4c2l6ZVwiLCBcIm1pbnNpemVcIik7XG4gICAgICAgIHZhciBheGlzID0gVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzdmcuc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpLCBIO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IDIgKiBNYXRoLm1heChoIC0gYXhpcywgZCArIGF4aXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IGggKyBkO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5tYXhzaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1heHNpemUsIG11LCBzdmcuaCArIHN2Zy5kKTtcbiAgICAgICAgdmFsdWVzLm1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWluc2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICBIID0gTWF0aC5tYXgodmFsdWVzLm1pbnNpemUsIE1hdGgubWluKHZhbHVlcy5tYXhzaXplLCBIKSk7XG4gICAgICAgIGlmIChIICE9IHZhbHVlcy5taW5zaXplKSB7XG4gICAgICAgICAgICBIID0gW01hdGgubWF4KEggKiBVdGlsLlRlWC5kZWxpbWl0ZXJmYWN0b3IgLyAxMDAwLCBIIC0gVXRpbC5UZVguZGVsaW1pdGVyc2hvcnRmYWxsKSwgSF07XG4gICAgICAgIH1cbiAgICAgICAgc3ZnID0gQ2hhcnNNaXhpbi5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgSCwgc3ZnLnNjYWxlKTtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgLyAyICsgYXhpcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgKiBoIC8gKGggKyBkKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcueSA9IEggLSBzdmcuaDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF4c2l6ZVwiLCBcIm1pbnNpemVcIiwgXCJtYXRodmFyaWFudFwiLCBcImZvbnR3ZWlnaHRcIik7XG4gICAgICAgIGlmICgodmFsdWVzLmZvbnR3ZWlnaHQgPT09IFwiYm9sZFwiIHx8IHBhcnNlSW50KHZhbHVlcy5mb250d2VpZ2h0KSA+PSA2MDApICYmXG4gICAgICAgICAgICAhdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKSkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGh2YXJpYW50ID0gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5WQVJJQU5ULkJPTEQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdmFsdWVzLm1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWluc2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdyA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgdykpO1xuICAgICAgICBzdmcgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCB3LCBzdmcuc2NhbGUsIHZhbHVlcy5tYXRodmFyaWFudCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICBkZWxldGUgdGhpcy5zdmcuZWxlbWVudDtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBzdmcuc3RyZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNb01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVBhZGRlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBhZGRlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1QYWRkZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIHBhZCA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIsIFwibHNwYWNlXCIsIFwidm9mZnNldFwiKSwgWCA9IDAsIFkgPSAwO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBYID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMubHNwYWNlLCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnZvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICBZID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMudm9mZnNldCwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGggPSBwYWQuaCwgZCA9IHBhZC5kLCB3ID0gcGFkLncsIHkgPSBwYWQueTtcbiAgICAgICAgICAgIHN2Zy5BZGQocGFkLCBYLCBZKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgc3ZnLmggPSBoICsgeTtcbiAgICAgICAgICAgIHN2Zy5kID0gZCAtIHk7XG4gICAgICAgICAgICBzdmcudyA9IHc7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5oZWlnaHQgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuaCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmhlaWdodCwgbXUsIFwiaFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZGVwdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuZCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmRlcHRoLCBtdSwgXCJkXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53aWR0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy53ID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMud2lkdGgsIG11LCBcIndcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLmggPiBzdmcuSCkge1xuICAgICAgICAgICAgICAgIHN2Zy5IID0gc3ZnLmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoc3ZnLmQgPiBzdmcuRCkge1xuICAgICAgICAgICAgICAgIHN2Zy5EID0gc3ZnLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1QYWRkZWRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1QaGFudG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGhhbnRvbU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1QaGFudG9tTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUGhhbnRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5yZW1vdmVDaGlsZChzdmcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmICFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNUGhhbnRvbU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVNxcnRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TcXJ0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNxcnRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5TVkdjaGlsZFNWRygwKTtcbiAgICAgICAgdmFyIHJ1bGU7XG4gICAgICAgIHZhciBzdXJkO1xuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgIHZhciBwO1xuICAgICAgICB2YXIgcTtcbiAgICAgICAgdmFyIEg7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgaWYgKHRoaXMuR2V0KFwiZGlzcGxheXN0eWxlXCIpKSB7XG4gICAgICAgICAgICBwID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSB0O1xuICAgICAgICB9XG4gICAgICAgIHEgPSBNYXRoLm1heCh0ICsgcCAvIDQsIDEwMDAgKiBVdGlsLlRlWC5taW5fcm9vdF9zcGFjZSAvIFV0aWwuZW0pO1xuICAgICAgICBIID0gYmFzZS5oICsgYmFzZS5kICsgcSArIHQ7XG4gICAgICAgIHN1cmQgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDIyMUEsIEgsIHNjYWxlKTtcbiAgICAgICAgaWYgKHN1cmQuaCArIHN1cmQuZCA+IEgpIHtcbiAgICAgICAgICAgIHEgPSAoKHN1cmQuaCArIHN1cmQuZCkgLSAoSCAtIHQpKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IG5ldyBCQk9YX1JFQ1QodCwgMCwgYmFzZS53KTtcbiAgICAgICAgSCA9IGJhc2UuaCArIHEgKyB0O1xuICAgICAgICB4ID0gdGhpcy5TVkdhZGRSb290KHN2Zywgc3VyZCwgeCwgc3VyZC5oICsgc3VyZC5kIC0gSCwgc2NhbGUpO1xuICAgICAgICBzdmcuQWRkKHN1cmQsIHgsIEggLSBzdXJkLmgpO1xuICAgICAgICBzdmcuQWRkKHJ1bGUsIHggKyBzdXJkLncsIEggLSBydWxlLmgpO1xuICAgICAgICBzdmcuQWRkKGJhc2UsIHggKyBzdXJkLncsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLmggKz0gdDtcbiAgICAgICAgc3ZnLkggKz0gdDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3FydE1peGluLnByb3RvdHlwZS5TVkdhZGRSb290ID0gZnVuY3Rpb24gKHN2Zywgc3VyZCwgeCwgZCwgc2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgICByZXR1cm4gTVNxcnRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1Sb290TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm9vdE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb290TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5TVkdjaGlsZFNWRygwKTtcbiAgICAgICAgdmFyIHJ1bGU7XG4gICAgICAgIHZhciBzdXJkO1xuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgIHZhciBwO1xuICAgICAgICB2YXIgcTtcbiAgICAgICAgdmFyIEg7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgaWYgKHRoaXMuR2V0KFwiZGlzcGxheXN0eWxlXCIpKSB7XG4gICAgICAgICAgICBwID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSB0O1xuICAgICAgICB9XG4gICAgICAgIHEgPSBNYXRoLm1heCh0ICsgcCAvIDQsIDEwMDAgKiBVdGlsLlRlWC5taW5fcm9vdF9zcGFjZSAvIFV0aWwuZW0pO1xuICAgICAgICBIID0gYmFzZS5oICsgYmFzZS5kICsgcSArIHQ7XG4gICAgICAgIHN1cmQgPSBDaGFyc01peGluLmNyZWF0ZURlbGltaXRlcigweDIyMUEsIEgsIHNjYWxlKTtcbiAgICAgICAgaWYgKHN1cmQuaCArIHN1cmQuZCA+IEgpIHtcbiAgICAgICAgICAgIHEgPSAoKHN1cmQuaCArIHN1cmQuZCkgLSAoSCAtIHQpKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZSA9IG5ldyBCQk9YX1JFQ1QodCwgMCwgYmFzZS53KTtcbiAgICAgICAgSCA9IGJhc2UuaCArIHEgKyB0O1xuICAgICAgICB4ID0gdGhpcy5TVkdhZGRSb290KHN2Zywgc3VyZCwgeCwgc3VyZC5oICsgc3VyZC5kIC0gSCwgc2NhbGUpO1xuICAgICAgICBzdmcuQWRkKHN1cmQsIHgsIEggLSBzdXJkLmgpO1xuICAgICAgICBzdmcuQWRkKHJ1bGUsIHggKyBzdXJkLncsIEggLSBydWxlLmgpO1xuICAgICAgICBzdmcuQWRkKGJhc2UsIHggKyBzdXJkLncsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLmggKz0gdDtcbiAgICAgICAgc3ZnLkggKz0gdDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5TVkdhZGRSb290ID0gZnVuY3Rpb24gKHN2Zywgc3VyZCwgeCwgZCwgc2NhbGUpIHtcbiAgICAgICAgdmFyIGR4ID0gKHN1cmQuaXNNdWx0aUNoYXIgPyAuNTUgOiAuNjUpICogc3VyZC53O1xuICAgICAgICBpZiAodGhpcy5kYXRhWzFdKSB7XG4gICAgICAgICAgICB2YXIgcm9vdCA9IHRoaXMuZGF0YVsxXS50b1NWRygpO1xuICAgICAgICAgICAgcm9vdC54ID0gMDtcbiAgICAgICAgICAgIHZhciBoID0gdGhpcy5TVkdyb290SGVpZ2h0KHN1cmQuaCArIHN1cmQuZCwgc2NhbGUsIHJvb3QpIC0gZDtcbiAgICAgICAgICAgIHZhciB3ID0gTWF0aC5taW4ocm9vdC53LCByb290LnIpO1xuICAgICAgICAgICAgeCA9IE1hdGgubWF4KHcsIGR4KTtcbiAgICAgICAgICAgIHN2Zy5BZGQocm9vdCwgeCAtIHcsIGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZHggPSB4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IC0gZHg7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5TVkdyb290SGVpZ2h0ID0gZnVuY3Rpb24gKGQsIHNjYWxlLCByb290KSB7XG4gICAgICAgIHJldHVybiAuNDUgKiAoZCAtIDkwMCAqIHNjYWxlKSArIDYwMCAqIHNjYWxlICsgTWF0aC5tYXgoMCwgcm9vdC5kIC0gNzUpO1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoYywgZCwgdGhpcyk7XG4gICAgfTtcbiAgICBNUm9vdE1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbVBhcmVudCA9IGZ1bmN0aW9uIChjLCBkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoYywgZCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvb3RNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1Sb3dNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmlzQ3Vyc29yYWJsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZvY3VzIScpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9ST1coKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAoZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuc2ggPSBoO1xuICAgICAgICAgICAgc3ZnLnNkID0gZDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT09IDEgJiYgdGhpcy5kYXRhWzBdKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YVswXS5FZGl0YWJsZVNWR2RhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5za2V3KSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBkYXRhLnNrZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuU1ZHbGluZUJyZWFrcyhzdmcpKVxuICAgICAgICAgICAgc3ZnID0gdGhpcy5TVkdtdWx0aWxpbmUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR2xpbmVCcmVha3MgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy5wYXJlbnQubGluZWJyZWFrQ29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWMgJiZcbiAgICAgICAgICAgIHN2Zy53ID4gdGhpcy5lZGl0YWJsZVNWRy5saW5lYnJlYWtXaWR0aCkgfHwgdGhpcy5oYXNOZXdsaW5lKCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR211bHRpbGluZSA9IGZ1bmN0aW9uIChzcGFuKSB7XG4gICAgICAgIHJldHVybiBNQmFzZU1peGluLlNWR2F1dG9sb2FkRmlsZShcIm11bHRpbGluZVwiKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIHcpLCBzdmcudywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5pc0N1cnNvclBhc3N0aHJvdWdoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhWzBdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB0aGlzLmRhdGEubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgdGhpcy5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCwgY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDdXJzb3JQYXNzdGhyb3VnaCgpIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY2hpbGRJZHgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4ICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLmRhdGFbY2hpbGRJZHhdO1xuICAgICAgICAgICAgdmFyIGJiID0gY2hpbGQuZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJiLnggKyAoYmIud2lkdGggLyAyKTtcbiAgICAgICAgICAgIGlmICh4IDwgbWlkcG9pbnQpIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGNoaWxkSWR4KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHRoaXMuZGF0YS5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgIGlmICh2ZXJ0aWNhbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgdmFyIG5ld1Bvc2l0aW9uID0gY3Vyc29yLnBvc2l0aW9uICsgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgPyAtMSA6IDEpO1xuICAgICAgICBpZiAobmV3UG9zaXRpb24gPCAwIHx8IG5ld1Bvc2l0aW9uID4gdGhpcy5kYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoaWxkUG9zaXRpb24gPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gY3Vyc29yLnBvc2l0aW9uIC0gMSA6IGN1cnNvci5wb3NpdGlvbjtcbiAgICAgICAgaWYgKGN1cnNvci5tb2RlID09PSBjdXJzb3IuU0VMRUNUSU9OKSB7XG4gICAgICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIG5ld1Bvc2l0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW2NoaWxkUG9zaXRpb25dLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBuZXdQb3NpdGlvbik7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmRyYXdDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgdmFyIHkgPSBiYm94Lnk7XG4gICAgICAgIHZhciBwcmVlZGdlO1xuICAgICAgICB2YXIgcG9zdGVkZ2U7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBiYm94Lng7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJlYm94ID0gdGhpcy5kYXRhW2N1cnNvci5wb3NpdGlvbiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHByZWVkZ2UgPSBwcmVib3gueCArIHByZWJveC53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uID09PSB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICBwb3N0ZWRnZSA9IGJib3gueCArIGJib3gud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcG9zdGJveCA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHBvc3RlZGdlID0gcG9zdGJveC54O1xuICAgICAgICB9XG4gICAgICAgIHZhciB4ID0gKHBvc3RlZGdlICsgcHJlZWRnZSkgLyAyO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdBdChzdmdlbGVtLCB4LCB5LCBoZWlnaHQpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29ySGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIGlmIChjdXJzb3Iuc2VsZWN0aW9uU3RhcnQubm9kZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgdmFyIGN1ciA9IGN1cnNvci5zZWxlY3Rpb25TdGFydC5ub2RlO1xuICAgICAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHdoaWxlIChjdXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLnBhcmVudCA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2VsZWN0aW9uU3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlOiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuZGF0YS5pbmRleE9mKGN1cikgKyAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyID0gY3VyLnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCBzZWxlY3Rpb25TdGFydCBub3QgaW4gbXJvd1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3Vyc29yLnNlbGVjdGlvbkVuZC5ub2RlICE9PSB0aGlzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggc2VsZWN0aW9uU3RhcnQgbm90IGluIG1yb3dcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvczEgPSBNYXRoLm1pbihjdXJzb3Iuc2VsZWN0aW9uU3RhcnQucG9zaXRpb24sIGN1cnNvci5zZWxlY3Rpb25FbmQucG9zaXRpb24pO1xuICAgICAgICB2YXIgcG9zMiA9IE1hdGgubWF4KGN1cnNvci5zZWxlY3Rpb25TdGFydC5wb3NpdGlvbiwgY3Vyc29yLnNlbGVjdGlvbkVuZC5wb3NpdGlvbik7XG4gICAgICAgIGlmIChwb3MxID09PSBwb3MyKSB7XG4gICAgICAgICAgICBjdXJzb3IuY2xlYXJIaWdobGlnaHQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeDEgPSB0aGlzLmRhdGFbcG9zMV0uZ2V0U1ZHQkJveCgpLng7XG4gICAgICAgIHZhciBwb3MyYmIgPSB0aGlzLmRhdGFbcG9zMiAtIDFdLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHgyID0gcG9zMmJiLnggKyBwb3MyYmIud2lkdGg7XG4gICAgICAgIHZhciB3aWR0aCA9IHgyIC0geDE7XG4gICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgY3Vyc29yLmRyYXdIaWdobGlnaHRBdChzdmdlbGVtLCB4MSwgYmIueSwgd2lkdGgsIGJiLmhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvd01peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTXNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1zTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTXNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1zTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1zTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNU3BhY2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TcGFjZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcGFjZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVNwYWNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIpO1xuICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLm1hdGhiYWNrZ3JvdW5kO1xuICAgICAgICBpZiAodGhpcy5iYWNrZ3JvdW5kICYmICF0aGlzLm1hdGhiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGJhY2tncm91bmQgPSB0aGlzLmJhY2tncm91bmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5tc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICBzdmcuaCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5oZWlnaHQsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcuZCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5kZXB0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMud2lkdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBpZiAoc3ZnLncgPCAwKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oIDwgLXN2Zy5kKSB7XG4gICAgICAgICAgICBzdmcuZCA9IC1zdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBzdmcubCA9IDA7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3BhY2VNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xudmFyIE1TdHlsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN0eWxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN0eWxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBtYXRoID0gc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIGlmIChtYXRoLmljKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gbWF0aC5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdHlsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVN1YlN1cE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN1YlN1cE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdWJTdXBNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuZW5kaW5nUG9zID0gMTtcbiAgICB9XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5pc0N1cnNvcmFibGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCksIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIGJhc2UgPSBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKHRoaXMuYmFzZSwgSFcsIEQpKTtcbiAgICAgICAgdmFyIHNzY2FsZSA9ICh0aGlzLmRhdGFbdGhpcy5zdXBdIHx8IHRoaXMuZGF0YVt0aGlzLnN1Yl0gfHwgdGhpcykuU1ZHZ2V0U2NhbGUoKTtcbiAgICAgICAgdmFyIHhfaGVpZ2h0ID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZSwgcyA9IFV0aWwuVGVYLnNjcmlwdHNwYWNlICogc2NhbGU7XG4gICAgICAgIHZhciBzdXAsIHN1YjtcbiAgICAgICAgaWYgKHRoaXMuU1ZHbm90RW1wdHkodGhpcy5kYXRhW3RoaXMuc3VwXSkpIHtcbiAgICAgICAgICAgIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF0udG9TVkcoKTtcbiAgICAgICAgICAgIHN1cC53ICs9IHM7XG4gICAgICAgICAgICBzdXAuciA9IE1hdGgubWF4KHN1cC53LCBzdXAucik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuU1ZHbm90RW1wdHkodGhpcy5kYXRhW3RoaXMuc3ViXSkpIHtcbiAgICAgICAgICAgIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl0udG9TVkcoKTtcbiAgICAgICAgICAgIHN1Yi53ICs9IHM7XG4gICAgICAgICAgICBzdWIuciA9IE1hdGgubWF4KHN1Yi53LCBzdWIucik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHEgPSBVdGlsLlRlWC5zdXBfZHJvcCAqIHNzY2FsZSwgciA9IFV0aWwuVGVYLnN1Yl9kcm9wICogc3NjYWxlO1xuICAgICAgICB2YXIgdSA9IGJhc2UuaCArIChiYXNlLnkgfHwgMCkgLSBxLCB2ID0gYmFzZS5kIC0gKGJhc2UueSB8fCAwKSArIHIsIGRlbHRhID0gMCwgcDtcbiAgICAgICAgaWYgKGJhc2UuaWMpIHtcbiAgICAgICAgICAgIGJhc2UudyAtPSBiYXNlLmljO1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXSAmJlxuICAgICAgICAgICAgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibWlcIiB8fCB0aGlzLmRhdGFbdGhpcy5iYXNlXS50eXBlID09PSBcIm1vXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uZGF0YS5qb2luKFwiXCIpLmxlbmd0aCA9PT0gMSAmJiBiYXNlLnNjYWxlID09PSAxICYmXG4gICAgICAgICAgICAgICAgIWJhc2Uuc3RyZXRjaGVkICYmICF0aGlzLmRhdGFbdGhpcy5iYXNlXS5HZXQoXCJsYXJnZW9wXCIpKSB7XG4gICAgICAgICAgICAgICAgdSA9IHYgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBtaW4gPSB0aGlzLmdldFZhbHVlcyhcInN1YnNjcmlwdHNoaWZ0XCIsIFwic3VwZXJzY3JpcHRzaGlmdFwiKTtcbiAgICAgICAgbWluLnN1YnNjcmlwdHNoaWZ0ID0gKG1pbi5zdWJzY3JpcHRzaGlmdCA9PT0gXCJcIiA/IDAgOiBVdGlsLmxlbmd0aDJlbShtaW4uc3Vic2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIG1pbi5zdXBlcnNjcmlwdHNoaWZ0ID0gKG1pbi5zdXBlcnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdXBlcnNjcmlwdHNoaWZ0LCBtdSkpO1xuICAgICAgICB2YXIgeCA9IGJhc2UudyArIGJhc2UueDtcbiAgICAgICAgaWYgKCFzdXApIHtcbiAgICAgICAgICAgIGlmIChzdWIpIHtcbiAgICAgICAgICAgICAgICB2ID0gTWF0aC5tYXgodiwgVXRpbC5UZVguc3ViMSAqIHNjYWxlLCBzdWIuaCAtICg0IC8gNSkgKiB4X2hlaWdodCwgbWluLnN1YnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1YiwgeCwgLXYpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1Yl0uRWRpdGFibGVTVkdkYXRhLmR5ID0gLXY7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXN1Yikge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcInRleHByaW1lc3R5bGVcIik7XG4gICAgICAgICAgICAgICAgcCA9IFV0aWwuVGVYWyh2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCJzdXAxXCIgOiAodmFsdWVzLnRleHByaW1lc3R5bGUgPyBcInN1cDNcIiA6IFwic3VwMlwiKSldO1xuICAgICAgICAgICAgICAgIHUgPSBNYXRoLm1heCh1LCBwICogc2NhbGUsIHN1cC5kICsgKDEgLyA0KSAqIHhfaGVpZ2h0LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgdSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IHU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2ID0gTWF0aC5tYXgodiwgVXRpbC5UZVguc3ViMiAqIHNjYWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgICAgICAgICAgaWYgKCh1IC0gc3VwLmQpIC0gKHN1Yi5oIC0gdikgPCAzICogdCkge1xuICAgICAgICAgICAgICAgICAgICB2ID0gMyAqIHQgLSB1ICsgc3VwLmQgKyBzdWIuaDtcbiAgICAgICAgICAgICAgICAgICAgcSA9ICg0IC8gNSkgKiB4X2hlaWdodCAtICh1IC0gc3VwLmQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHUgKz0gcTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgLT0gcTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21QYXJlbnQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIGRlc3Q7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUKSB7XG4gICAgICAgICAgICBkZXN0ID0gdGhpcy5kYXRhW3RoaXMuYmFzZV07XG4gICAgICAgICAgICBpZiAoZGVzdC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkZXN0Lm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgcG9zOiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUID8gMSA6IDAsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgIHZhciBzbWFsbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQID8gdGhpcy5zdWIgOiB0aGlzLnN1cDtcbiAgICAgICAgICAgIHZhciBiYXNlQkIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICBpZiAoIWJhc2VCQiB8fCAhY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuZGF0YVtzbWFsbF0gPyBzbWFsbCA6IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmFzZUJCLnggKyBiYXNlQkIud2lkdGggJiYgdGhpcy5kYXRhW3NtYWxsXSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbc21hbGxdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbc21hbGxdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGJiID0gdGhpcy5kYXRhW3NtYWxsXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiBzbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBjdXJzb3IucmVuZGVyZWRQb3NpdGlvbi54ID4gYmIueCArIGJiLndpZHRoIC8gMiA/IDEgOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVt0aGlzLmJhc2VdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoIC8gMiA/IDEgOiAwLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvckZyb21DaGlsZCA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbiwgY2hpbGQpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc2VjdGlvbiwgcG9zO1xuICAgICAgICB2YXIgY2hpbGRJZHg7XG4gICAgICAgIGZvciAoY2hpbGRJZHggPSAwOyBjaGlsZElkeCA8IHRoaXMuZGF0YS5sZW5ndGg7ICsrY2hpbGRJZHgpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gdGhpcy5kYXRhW2NoaWxkSWR4XSlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGRJZHggPT09IHRoaXMuZGF0YS5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNwZWNpZmllZCBjaGlsZCBpbiBjaGlsZHJlbicpO1xuICAgICAgICB2YXIgY3VycmVudFNlY3Rpb24gPSBjaGlsZElkeDtcbiAgICAgICAgdmFyIG9sZCA9IFtjdXJzb3Iubm9kZSwgY3Vyc29yLnBvc2l0aW9uXTtcbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCB7XG4gICAgICAgICAgICBzZWN0aW9uOiBjdXJyZW50U2VjdGlvbixcbiAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgPyAxIDogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghdGhpcy5tb3ZlQ3Vyc29yKGN1cnNvciwgZGlyZWN0aW9uKSkge1xuICAgICAgICAgICAgY3Vyc29yLm1vdmVUby5hcHBseShjdXJzb3IsIG9sZCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5kYXRhWzBdO1xuICAgICAgICB2YXIgYmFzZUJCID0gYmFzZS5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdO1xuICAgICAgICB2YXIgc3ViQkIgPSBzdWIgJiYgc3ViLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHN1cCA9IHRoaXMuZGF0YVt0aGlzLnN1cF07XG4gICAgICAgIHZhciBzdXBCQiA9IHN1cCAmJiBzdXAuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc2VjdGlvbjtcbiAgICAgICAgdmFyIHBvcztcbiAgICAgICAgaWYgKHN1YkJCICYmIFV0aWwuYm94Q29udGFpbnMoc3ViQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3ViLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1Yi5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdWI7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdWJCQi54ICsgKHN1YkJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3VwQkIgJiYgVXRpbC5ib3hDb250YWlucyhzdXBCQiwgeCwgeSkpIHtcbiAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VwLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLnN1cDtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IHN1cEJCLnggKyAoc3VwQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChiYXNlLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2UubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuYmFzZTtcbiAgICAgICAgICAgIHZhciBtaWRwb2ludCA9IGJhc2VCQi54ICsgKGJhc2VCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogc2VjdGlvbixcbiAgICAgICAgICAgIHBvczogcG9zLFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUubW92ZUN1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IsIGRpcmVjdGlvbikge1xuICAgICAgICBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgaWYgKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkge1xuICAgICAgICAgICAgICAgIGlmIChzdXApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cC5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5zdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uRE9XTikge1xuICAgICAgICAgICAgICAgIGlmIChzdWIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Yi5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5zdWIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3M6IDAsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVCAmJiBjdXJzb3IucG9zaXRpb24ucG9zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvcyA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPyAwIDogMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNhbCA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQIHx8IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV047XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5WZXJ0aWNhbGx5ID0gdmVydGljYWwgJiYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlVQKSA9PT0gKGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1Yik7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW5Ib3Jpem9udGFsbHkgPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwICYmIGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICAgICAgICB2YXIgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgICAgICAgIHZhciBtb3ZpbmdBd2F5ID0gdmVydGljYWwgPyAhbW92aW5nSW5WZXJ0aWNhbGx5IDogIXRoaXMucmlnaHRNb3ZlU3RheSAmJiBtb3ZlUmlnaHRIb3Jpem9udGFsbHk7XG4gICAgICAgICAgICB2YXIgbW92aW5nSW4gPSBtb3ZpbmdJblZlcnRpY2FsbHkgfHwgbW92aW5nSW5Ib3Jpem9udGFsbHkgfHwgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ICYmIHRoaXMucmlnaHRNb3ZlU3RheTtcbiAgICAgICAgICAgIGlmIChtb3ZpbmdBd2F5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobW92aW5nSW4pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0uaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVt0aGlzLmJhc2VdLm1vdmVDdXJzb3JGcm9tUGFyZW50KGN1cnNvciwgY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuc3ViID8gRGlyZWN0aW9uLlVQIDogRGlyZWN0aW9uLkRPV04pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuYmFzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBtb3ZlUmlnaHRIb3Jpem9udGFsbHkgPyAxIDogdGhpcy5lbmRpbmdQb3MgfHwgMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uLnBvcyA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPyAwIDogMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIGN1cnNvci5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVN1YlN1cE1peGluLnByb3RvdHlwZS5kcmF3Q3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICB2YXIgYmI7XG4gICAgICAgIHZhciB4LCB5LCBoZWlnaHQ7XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBiYiA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHZhciBtYWluQkIgPSB0aGlzLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBtYWluQkIueTtcbiAgICAgICAgICAgIGhlaWdodCA9IG1haW5CQi5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBiYiA9IHRoaXMuZGF0YVtjdXJzb3IucG9zaXRpb24uc2VjdGlvbl0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgeSA9IGJiLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBiYi5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgeCA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgPyBiYi54IDogYmIueCArIGJiLndpZHRoO1xuICAgICAgICB2YXIgc3ZnZWxlbSA9IHRoaXMuRWRpdGFibGVTVkdlbGVtLm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgcmV0dXJuIGN1cnNvci5kcmF3QXQoc3ZnZWxlbSwgeCwgeSwgaGVpZ2h0KTtcbiAgICB9O1xuICAgIHJldHVybiBNU3ViU3VwTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVGFibGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UYWJsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1UYWJsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRhYmxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1UYWJsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgTVRleHRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1UZXh0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRleHRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1UZXh0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoTWF0aEpheC5PdXRwdXRKYXguRWRpdGFibGVTVkcuY29uZmlnLm10ZXh0Rm9udEluaGVyaXQgfHwgdGhpcy5QYXJlbnQoKS50eXBlID09PSBcIm1lcnJvclwiKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICAgICAgdmFyIGRlZiA9IHsgZGlyZWN0aW9uOiB0aGlzLkdldChcImRpclwiKSB9O1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQuYm9sZCkge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtd2VpZ2h0XCJdID0gXCJib2xkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5pdGFsaWMpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJmb250LXN0eWxlXCJdID0gXCJpdGFsaWNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhcmlhbnQgPSB0aGlzLkdldChcIm1hdGh2YXJpYW50XCIpO1xuICAgICAgICAgICAgaWYgKHZhcmlhbnQgPT09IFwibW9ub3NwYWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLW1vbm9zcGFjZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodmFyaWFudC5tYXRjaCgvc2Fucy1zZXJpZi8pKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiY2xhc3NcIl0gPSBcIk1KWC1zYW5zLXNlcmlmXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKG5ldyBCQk9YX1RFWFQodGhpcy5IVE1MLCBzY2FsZSAqIDEwMCAvIE1hdGhKYXguT3V0cHV0SmF4LkVkaXRhYmxlU1ZHLmNvbmZpZy5zY2FsZSwgdGhpcy5kYXRhLmpvaW4oXCJcIiksIGRlZikpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1UZXh0TWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBNVW5kZXJPdmVyTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVW5kZXJPdmVyTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVVuZGVyT3Zlck1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5lbmRpbmdQb3MgPSAwO1xuICAgICAgICB0aGlzLnJpZ2h0TW92ZVN0YXkgPSB0cnVlO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aEpheC5FbGVtZW50SmF4Lm1tbC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIE1hdGhKYXguSHViKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBVdGlsLmdldEN1cnNvclZhbHVlKGRpcmVjdGlvbik7XG4gICAgICAgIHZhciBkZXN0O1xuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCkge1xuICAgICAgICAgICAgZGVzdCA9IHRoaXMuZGF0YVt0aGlzLmJhc2VdO1xuICAgICAgICAgICAgaWYgKGRlc3QuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdC5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJzb3IucG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgIHBvczogZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTEVGVCA/IDEgOiAwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOKSB7XG4gICAgICAgICAgICB2YXIgc21hbGwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCA/IHRoaXMuc3ViIDogdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgYmFzZUJCID0gdGhpcy5kYXRhW3RoaXMuYmFzZV0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgaWYgKCFiYXNlQkIgfHwgIWN1cnNvci5yZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmRhdGFbc21hbGxdID8gc21hbGwgOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJhc2VCQi54ICsgYmFzZUJCLndpZHRoICYmIHRoaXMuZGF0YVtzbWFsbF0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXRhW3NtYWxsXS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3NtYWxsXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZGF0YVtzbWFsbF0uZ2V0U1ZHQkJveCgpO1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIHBvczogY3Vyc29yLnJlbmRlcmVkUG9zaXRpb24ueCA+IGJiLnggKyBiYi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogdGhpcy5iYXNlLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IGN1cnNvci5yZW5kZXJlZFBvc2l0aW9uLnggPiBiYXNlQkIueCArIGJhc2VCQi53aWR0aCAvIDIgPyAxIDogMCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywgY3Vyc29yLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2hpbGQgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24sIGNoaWxkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IFV0aWwuZ2V0Q3Vyc29yVmFsdWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdmFyIHNlY3Rpb24sIHBvcztcbiAgICAgICAgdmFyIGNoaWxkSWR4O1xuICAgICAgICBmb3IgKGNoaWxkSWR4ID0gMDsgY2hpbGRJZHggPCB0aGlzLmRhdGEubGVuZ3RoOyArK2NoaWxkSWR4KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09IHRoaXMuZGF0YVtjaGlsZElkeF0pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkSWR4ID09PSB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBzcGVjaWZpZWQgY2hpbGQgaW4gY2hpbGRyZW4nKTtcbiAgICAgICAgdmFyIGN1cnJlbnRTZWN0aW9uID0gY2hpbGRJZHg7XG4gICAgICAgIHZhciBvbGQgPSBbY3Vyc29yLm5vZGUsIGN1cnNvci5wb3NpdGlvbl07XG4gICAgICAgIGN1cnNvci5tb3ZlVG8odGhpcywge1xuICAgICAgICAgICAgc2VjdGlvbjogY3VycmVudFNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLlJJR0hUID8gMSA6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXRoaXMubW92ZUN1cnNvcihjdXJzb3IsIGRpcmVjdGlvbikpIHtcbiAgICAgICAgICAgIGN1cnNvci5tb3ZlVG8uYXBwbHkoY3Vyc29yLCBvbGQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgTVVuZGVyT3Zlck1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNsaWNrID0gZnVuY3Rpb24gKGN1cnNvciwgeCwgeSkge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuZGF0YVswXTtcbiAgICAgICAgdmFyIGJhc2VCQiA9IGJhc2UuZ2V0U1ZHQkJveCgpO1xuICAgICAgICB2YXIgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXTtcbiAgICAgICAgdmFyIHN1YkJCID0gc3ViICYmIHN1Yi5nZXRTVkdCQm94KCk7XG4gICAgICAgIHZhciBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdO1xuICAgICAgICB2YXIgc3VwQkIgPSBzdXAgJiYgc3VwLmdldFNWR0JCb3goKTtcbiAgICAgICAgdmFyIHNlY3Rpb247XG4gICAgICAgIHZhciBwb3M7XG4gICAgICAgIGlmIChzdWJCQiAmJiBVdGlsLmJveENvbnRhaW5zKHN1YkJCLCB4LCB5KSkge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VjdGlvbiA9IHRoaXMuc3ViO1xuICAgICAgICAgICAgdmFyIG1pZHBvaW50ID0gc3ViQkIueCArIChzdWJCQi53aWR0aCAvIDIuMCk7XG4gICAgICAgICAgICBwb3MgPSAoeCA8IG1pZHBvaW50KSA/IDAgOiAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN1cEJCICYmIFV0aWwuYm94Q29udGFpbnMoc3VwQkIsIHgsIHkpKSB7XG4gICAgICAgICAgICBpZiAoc3VwLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cC5tb3ZlQ3Vyc29yRnJvbUNsaWNrKGN1cnNvciwgeCwgeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWN0aW9uID0gdGhpcy5zdXA7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBzdXBCQi54ICsgKHN1cEJCLndpZHRoIC8gMi4wKTtcbiAgICAgICAgICAgIHBvcyA9ICh4IDwgbWlkcG9pbnQpID8gMCA6IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5pc0N1cnNvcmFibGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlLm1vdmVDdXJzb3JGcm9tQ2xpY2soY3Vyc29yLCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlY3Rpb24gPSB0aGlzLmJhc2U7XG4gICAgICAgICAgICB2YXIgbWlkcG9pbnQgPSBiYXNlQkIueCArIChiYXNlQkIud2lkdGggLyAyLjApO1xuICAgICAgICAgICAgcG9zID0gKHggPCBtaWRwb2ludCkgPyAwIDogMTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IubW92ZVRvKHRoaXMsIHtcbiAgICAgICAgICAgIHNlY3Rpb246IHNlY3Rpb24sXG4gICAgICAgICAgICBwb3M6IHBvcyxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3IgPSBmdW5jdGlvbiAoY3Vyc29yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgZGlyZWN0aW9uID0gVXRpbC5nZXRDdXJzb3JWYWx1ZShkaXJlY3Rpb24pO1xuICAgICAgICB2YXIgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXTtcbiAgICAgICAgdmFyIHN1YiA9IHRoaXMuZGF0YVt0aGlzLnN1Yl07XG4gICAgICAgIGlmIChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uVVApIHtcbiAgICAgICAgICAgICAgICBpZiAoc3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXAuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdXAubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLkRPV04pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWIuaXNDdXJzb3JhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWIubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHRoaXMuc3ViLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAwLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50Lm1vdmVDdXJzb3JGcm9tQ2hpbGQoY3Vyc29yLCBkaXJlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUICYmIGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDAgfHwgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQgJiYgY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmVydGljYWwgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCB8fCBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ET1dOO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luVmVydGljYWxseSA9IHZlcnRpY2FsICYmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5VUCkgPT09IChjdXJzb3IucG9zaXRpb24uc2VjdGlvbiA9PT0gdGhpcy5zdWIpO1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luSG9yaXpvbnRhbGx5ID0gY3Vyc29yLnBvc2l0aW9uLnBvcyA9PT0gMCAmJiBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICAgICAgdmFyIG1vdmVSaWdodEhvcml6b250YWxseSA9IGN1cnNvci5wb3NpdGlvbi5wb3MgPT09IDEgJiYgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICAgICAgICB2YXIgbW92aW5nQXdheSA9IHZlcnRpY2FsID8gIW1vdmluZ0luVmVydGljYWxseSA6ICF0aGlzLnJpZ2h0TW92ZVN0YXkgJiYgbW92ZVJpZ2h0SG9yaXpvbnRhbGx5O1xuICAgICAgICAgICAgdmFyIG1vdmluZ0luID0gbW92aW5nSW5WZXJ0aWNhbGx5IHx8IG1vdmluZ0luSG9yaXpvbnRhbGx5IHx8IG1vdmVSaWdodEhvcml6b250YWxseSAmJiB0aGlzLnJpZ2h0TW92ZVN0YXk7XG4gICAgICAgICAgICBpZiAobW92aW5nQXdheSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1vdmluZ0luKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmlzQ3Vyc29yYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbdGhpcy5iYXNlXS5tb3ZlQ3Vyc29yRnJvbVBhcmVudChjdXJzb3IsIGN1cnNvci5wb3NpdGlvbi5zZWN0aW9uID09PSB0aGlzLnN1YiA/IERpcmVjdGlvbi5VUCA6IERpcmVjdGlvbi5ET1dOKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3Vyc29yLnBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiB0aGlzLmJhc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvczogbW92ZVJpZ2h0SG9yaXpvbnRhbGx5ID8gMSA6IHRoaXMuZW5kaW5nUG9zIHx8IDAsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnNvci5wb3NpdGlvbi5wb3MgPSBjdXJzb3IucG9zaXRpb24ucG9zID8gMCA6IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yLm1vdmVUbyh0aGlzLCBjdXJzb3IucG9zaXRpb24pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgdmFyIGJiO1xuICAgICAgICB2YXIgeCwgeSwgaGVpZ2h0O1xuICAgICAgICBpZiAoY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb24gPT09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbdGhpcy5iYXNlXS5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB2YXIgbWFpbkJCID0gdGhpcy5nZXRTVkdCQm94KCk7XG4gICAgICAgICAgICB5ID0gbWFpbkJCLnk7XG4gICAgICAgICAgICBoZWlnaHQgPSBtYWluQkIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYmIgPSB0aGlzLmRhdGFbY3Vyc29yLnBvc2l0aW9uLnNlY3Rpb25dLmdldFNWR0JCb3goKTtcbiAgICAgICAgICAgIHkgPSBiYi55O1xuICAgICAgICAgICAgaGVpZ2h0ID0gYmIuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIHggPSBjdXJzb3IucG9zaXRpb24ucG9zID09PSAwID8gYmIueCA6IGJiLnggKyBiYi53aWR0aDtcbiAgICAgICAgdmFyIHN2Z2VsZW0gPSB0aGlzLkVkaXRhYmxlU1ZHZWxlbS5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjdXJzb3IuZHJhd0F0KHN2Z2VsZW0sIHgsIHksIGhlaWdodCk7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufSkoTUJhc2VNaXhpbik7XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLmRhdGFbMF0udG9TVkcoKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgU2VtYW50aWNzTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hWID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoVihoLCBkKSA6IG5ldyBCQk9YX05VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2VtYW50aWNzTWl4aW47XG59KShNQmFzZU1peGluKTtcbnZhciBUZVhBdG9tTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhUZVhBdG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVGVYQXRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IE1hdGhKYXguRWxlbWVudEpheC5tbWwuVEVYQ0xBU1MuVkNFTlRFUikge1xuICAgICAgICAgICAgICAgIHkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChib3guaCArIGJveC5kKSAvIDIgKyBib3guZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94LCAwLCB5KTtcbiAgICAgICAgICAgIHN2Zy5pYyA9IGJveC5pYztcbiAgICAgICAgICAgIHN2Zy5za2V3ID0gYm94LnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tUGFyZW50ID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21QYXJlbnQoY3Vyc29yLCBkaXJlY3Rpb24pO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yRnJvbUNoaWxkID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQubW92ZUN1cnNvckZyb21DaGlsZChjdXJzb3IsIGRpcmVjdGlvbiwgdGhpcyk7XG4gICAgfTtcbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLm1vdmVDdXJzb3JGcm9tQ2xpY2sgPSBmdW5jdGlvbiAoY3Vyc29yLCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbMF0ubW92ZUN1cnNvckZyb21DbGljayhjdXJzb3IsIHgsIHkpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLnByb3RvdHlwZS5tb3ZlQ3Vyc29yID0gZnVuY3Rpb24gKGN1cnNvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5tb3ZlQ3Vyc29yRnJvbUNoaWxkKGN1cnNvciwgZGlyZWN0aW9uLCB0aGlzKTtcbiAgICB9O1xuICAgIFRlWEF0b21NaXhpbi5wcm90b3R5cGUuZHJhd0N1cnNvciA9IGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVYQXRvbSBkcmF3Q3Vyc29yIE5PVCBJTVBMRU1FTlRFRCcpO1xuICAgIH07XG4gICAgVGVYQXRvbU1peGluLmN1cnNvcmFibGUgPSB0cnVlO1xuICAgIHJldHVybiBUZVhBdG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
