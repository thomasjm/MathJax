
// TODO: remove
declare function visualizeJax(jax: any, selector: string, ptr: any);

class Cursor {
    selectionStart: any;
    selectionEnd: any;

    static CursorMode = {
        BACKSLASH: "backslash",
        NORMAL: "normal",
        SELECTION: "selection"
    }

    node: MBaseMixin;
    mode: string;
    position: any;
    boxes: any;
    startBlink: any; // setTimeout task
    renderedPosition: any;
    id: string;
    width: number;

    constructor() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.mode = Cursor.CursorMode.NORMAL;

        this.id = Math.random().toString(36).substring(2)
        this.width = 50
    }

    refocus() {
        if (!this.node ||
            !this.node.EditableSVGelem ||
            !this.node.EditableSVGelem.ownerSVGElement ||
            !this.node.EditableSVGelem.ownerSVGElement.parentNode)
            return false

        var parent = <HTMLElement>this.node.EditableSVGelem.ownerSVGElement.parentNode;
        parent.focus();
        this.draw();
    }

    moveToClick(event) {
        var target = event.target;
        var svg = target.nodeName === 'svg' ? target : target.ownerSVGElement;

        if (!svg) return;

        var cp = Util.screenCoordsToElemCoords(svg, event.clientX, event.clientY);

        // Find the deepest cursorable node that was clicked
        var jax = Util.getJaxFromMath(svg.parentNode)
        var current = jax.root
        while (true) {
            var matchedItems = current.data.filter(function(node) {
                if (node === null) return false;
                return Util.nodeContainsScreenPoint(node, event.clientX, event.clientY);
            });
            if (matchedItems.length > 1) {
                console.error('huh? matched more than one child');
            } else if (matchedItems.length === 0) {
                break;
            }

            var matched = matchedItems[0];
            if (matched.isCursorable()) {
                current = matched
            } else {
                break;
            }
        }
        current.moveCursorFromClick(this, cp.x, cp.y);
    }

    moveTo(node, position) {
        // Does NOT redraw
        if (this.mode === Cursor.CursorMode.BACKSLASH && !node.backslashRow) return false
        this.node = node;
        this.position = position;
        if (this.mode === Cursor.CursorMode.SELECTION) {
            this.selectionEnd = {
                node: this.node,
                position: this.position
            }
        }
    }

    updateSelection(shiftKey) {
        if (shiftKey && this.mode === Cursor.CursorMode.NORMAL) {
            this.mode = Cursor.CursorMode.SELECTION;
            this.selectionStart = {
                node: this.node,
                position: this.position
            };
        } else if (this.mode === Cursor.CursorMode.SELECTION) {
            if (shiftKey) {
                this.selectionEnd = {
                    node: this.node,
                    position: this.position
                };
            } else {
                this.mode = Cursor.CursorMode.NORMAL;
                this.selectionStart = this.selectionEnd = null;
                this.clearHighlight();
            }
        }
    }

    move(direction: Direction, shiftKey) {
        this.updateSelection(shiftKey);

        this.node.moveCursor(this, direction)
    }

    draw() {
        this.node.drawCursor(this)
    }

    keydown(event, recall) {
        var direction
        switch (event.which) {
        case 8: this.backspace(event, recall); break;
        case 27: this.exitBackslashMode(false); recall(['refocus', this]); break
        case 38: direction = Direction.UP; break
        case 40: direction = Direction.DOWN; break
        case 37: direction = Direction.LEFT; break
        case 39: direction = Direction.RIGHT; break
        }
        if (direction) {
            this.move(direction, event.shiftKey);
            this.draw()
            event.preventDefault()
        }
    }

    mousedown(event, recall) {
        event.preventDefault();
        this.updateSelection(event.shiftKey);
        this.moveToClick(event);
        this.refocus();
    }

    makeHoleIfNeeded(node) {
        if (node.data.length === 0) {
            // The mrow has become empty; make a hole
            var hole = MathJax.ElementJax.mml.hole();
            var rowindex = node.parent.data.indexOf(node)
            node.parent.SetData(rowindex, hole)
            hole.moveCursorFromParent(this)
        }
    }

    // TODO: give replace a type here...
    exitBackslashMode(replace: any) {
        this.mode = Cursor.CursorMode.NORMAL
        var ppos = this.node.parent.data.indexOf(this.node)
        if (!replace) {
            this.node.parent.data.splice(ppos, 1)
        } else {
            this.node.parent.SetData(ppos++, replace)
        }

        if (replace && replace.moveCursorAfter) {
            this.moveTo.apply(this, replace.moveCursorAfter)
        } else {
            this.moveTo(this.node.parent, ppos)
        }
    }

    backspace(event, recall) {
        event.preventDefault();
        if (!this.node) return;

        if (this.mode === Cursor.CursorMode.SELECTION) {
            if (this.selectionStart.node.type === 'mrow' &&
                this.selectionStart.node === this.selectionEnd.node) {

                var pos1 = Math.min(this.selectionStart.position, this.selectionEnd.position);
                var pos2 = Math.max(this.selectionStart.position, this.selectionEnd.position);

                this.selectionStart.node.data.splice(pos1, pos2 - pos1);
                this.moveTo(this.node, pos1);
                this.clearHighlight();
                this.makeHoleIfNeeded(this.node);

                recall(['refocus', this])
            } else {
                throw new Error("Don't know how to do this backspace");
            }

            return;
        }

        if (this.node.type === 'mrow') {
            var prev = this.node.data[this.position - 1];
            if (!prev.isCursorable()) {
                // If it's not cursorable, just delete it
                if (this.mode === Cursor.CursorMode.BACKSLASH && this.node.data.length === 1) {
                    this.exitBackslashMode(false);
                } else {
                    this.node.data.splice(this.position-1, 1);
                    this.position = this.position - 1;

                    this.makeHoleIfNeeded(this.node);
                }

                recall(['refocus', this])
            } else {
                // Otherwise, highlight it
                this.mode = Cursor.CursorMode.SELECTION;
                this.selectionStart = {
                    node: this.node,
                    position: this.position
                };
                this.selectionEnd = {
                    node: this.node,
                    position: this.position-1
                };

                recall(['refocus', this])
            }
        } else if (this.node.type === 'hole') {
            console.log('backspace on hole!');
        }
    }

    makeEntityMo(unicode) {
        var mo = new MathJax.ElementJax.mml.mo();
        var entity = new MathJax.ElementJax.mml.entity();
        entity.Append(unicode);
        mo.Append(entity);
        return mo;
    }

    makeEntityMi(unicode) {
        var mi = new MathJax.ElementJax.mml.mi();
        var entity = new MathJax.ElementJax.mml.entity();
        entity.Append(unicode);
        mi.Append(entity);
        return mi;
    }

    // TODO: move parser into its own class
    makeParser() {
        var obj = {
            mmlToken(x) {
                return x
            },
            Push(x) {
                this.result = x
            },
            noop() {},
            parseControlSequence(cs) {
                if (this.checkSpecialCS(cs)) return this.result
                this.cs = cs
                this.csUndefined = this.csFindMacro = this.noop
                this.ControlSequence()
                delete this.csFindMacro
                delete this.csUndefined
                return this.result
            },
            GetCS() {
                return this.cs
            },

            checkSpecialCS(cs) {
                if (cs === 'frac') {
                    var hole = new MathJax.ElementJax.mml.hole()
                    var result = new MathJax.ElementJax.mml.mfrac(hole, new MathJax.ElementJax.mml.hole())
                    result.moveCursorAfter = [hole, 0]
                    return this.result = result
                }
                if (cs === 'sqrt') {
                    var result = new MathJax.ElementJax.mml.msqrt()
                    var hole = new MathJax.ElementJax.mml.hole()
                    result.SetData(0, hole)
                    result.moveCursorAfter = [hole, 0]
                    return this.result = result
                }
                if (MathJax.InputJax.TeX.Definitions.macros[cs]) {
                    console.log(MathJax.InputJax.TeX.Definitions.macros[cs])
                    var namedDirectly = MathJax.InputJax.TeX.Definitions.macros[cs] === 'NamedOp' || MathJax.InputJax.TeX.Definitions.macros[cs] === 'NamedFn'
                    var namedArray = MathJax.InputJax.TeX.Definitions.macros[cs][0] && (MathJax.InputJax.TeX.Definitions.macros[cs][0] === 'NamedFn' || MathJax.InputJax.TeX.Definitions.macros[cs][0] === 'NamedOp')
                    if (namedDirectly || namedArray) {
                        var value
                        if (namedArray && MathJax.InputJax.TeX.Definitions.macros[cs][1]) {
                            value = MathJax.InputJax.TeX.Definitions.macros[cs][1].replace(/&thinsp;/,"\u2006")
                        } else {
                            value = cs
                        }
                        return this.result = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.chars(value))
                    }
                }
            },

            stack: {env: {}},
        }

        obj.__proto__ = MathJax.InputJax.TeX.Parse.prototype;
        return obj
    }

    createAndMoveIntoHole(msubsup, index) {
        console.log('CREATING HOLE');
        var hole = new MathJax.ElementJax.mml.hole();
        msubsup.SetData(index, hole);
        // Move into it
        this.moveTo(hole, 0)
    }

    keypress(event, recall) {
        event.preventDefault();

        var code = event.charCode || event.keyCode || event.which;
        var c = String.fromCharCode(code);
        var toInsert;

        if (!this.node) return;

        if (this.node.type === 'hole') {
            // Convert this hole into an empty mrow so the rest of this function
            // can proceed to put something in it
            // NOTE: depends on the assumption that every code path through the rest of this
            // function inserts something into the mrow
            var parent = this.node.parent;
            var holeIndex = parent.data.indexOf(this.node);
            var row = MathJax.ElementJax.mml.mrow()
            parent.SetData(holeIndex, row)
            row.moveCursorFromParent(this, Direction.RIGHT)
        }

        if (this.mode === Cursor.CursorMode.BACKSLASH) {
            this.node.EditableSVGelem.classList.remove('invalid')
        }

        if (this.node.type === 'mrow') {

            if (c === "\\") {
                // Backslash mode
                if (this.mode !== Cursor.CursorMode.BACKSLASH) {
                    // Enter backslash mode
                    this.mode = Cursor.CursorMode.BACKSLASH;

                    // Insert mrow
                    var grayRow = MathJax.ElementJax.mml.mrow(MathJax.ElementJax.mml.mo(MathJax.ElementJax.mml.entity('#x005C')));
                    grayRow.backslashRow = true
                    this.node.data.splice(this.position, 0, null)
                    this.node.SetData(this.position, grayRow)
                    var oldClass = grayRow.cls ? grayRow.cls + ' ' : '';
                    grayRow.cls = oldClass + "backslash-mode";
                    recall([this, function() {
                        this.moveTo(grayRow, 1)
                        this.refocus()
                    }])

                    return;
                } else {
                    console.log('TODO: insert a \\')
                    // Just insert a \
                }

            } else if (c === "^" || c === "_") {
                // Superscript or subscript

                if (this.position === 0) {
                    return; // Do nothing if we're at the beginning of the mbox
                }

                var prev = this.node.data[this.position - 1];

                var index = (c === "_") ? MathJax.ElementJax.mml.msubsup().sub : MathJax.ElementJax.mml.msubsup().sup;

                if (prev.type === "msubsup" || prev.type === "munderover") {
                    if (prev.data[index]) {
                        // Move into thing
                        var thing = prev.data[index];

                        if (thing.isCursorable()) {
                            thing.moveCursorFromParent(this, Direction.LEFT)
                        } else {
                            this.moveTo(prev, {
                                section: index,
                                pos: 1,
                            })
                        }
                    } else {
                        // Create a new thing and move into it
                        this.createAndMoveIntoHole(prev, index);
                    }
                } else {
                    // Convert the predecessor to an msubsup
                    var msubsup = MathJax.ElementJax.mml.msubsup();
                    msubsup.SetData(msubsup.base, prev);
                    this.node.SetData(this.position - 1, msubsup);
                    this.createAndMoveIntoHole(msubsup, index);
                }

                recall(['refocus', this])

                return;

            } else if (c === " ") {
                if (this.mode === Cursor.CursorMode.BACKSLASH) {
                    // Exit backslash mode and enter the thing we had
                    var latex = "";
                    for (var i = 1; i < this.node.data.length; i++) {
                        var mi = this.node.data[i];
                        if (mi.type !== 'mi') {
                            throw new Error('Found non-identifier in backslash expression');
                        }
                        var chars = mi.data[0];
                        latex += chars.data[0];
                    }

                    var parser = this.makeParser()
                    var result = parser.parseControlSequence(latex)

                    if (!result) {
                        this.node.EditableSVGelem.classList.add('invalid')
                        return
                    }

                    var mrow = this.node;
                    var index = mrow.parent.data.indexOf(mrow)

                    this.exitBackslashMode(result)

                    recall([this, function() {
                        this.refocus()
                    }]);

                    return;
                } else {
                    // Spaces help us jump out of boxes
                    this.node.moveCursor(this, 'r');

                    recall([this, function() {
                        this.refocus()
                        this.mode = Cursor.CursorMode.NORMAL
                    }]);

                    return;
                }
            }

            // Insertion
            // TODO: actually insert numbers
            if (MathJax.InputJax.TeX.Definitions.letter.test(c) || MathJax.InputJax.TeX.Definitions.number.test(c)) {
                // Alpha, insert an mi
                toInsert = new MathJax.ElementJax.mml.mi(new MathJax.ElementJax.mml.chars(c))
            } else if (MathJax.InputJax.TeX.Definitions.remap[c]) {
                toInsert = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.entity('#x' + MathJax.InputJax.TeX.Definitions.remap[c]));
            } else if (c === '+' || c === '/' || c === '=' || c === '.' || c === '(' || c === ')') {
                toInsert = new MathJax.ElementJax.mml.mo(new MathJax.ElementJax.mml.chars(c))
            }
        }

        if (!toInsert) return

        this.node.data.splice(this.position, 0, null)
        this.node.SetData(this.position, toInsert)
        recall([this, function() {
            this.move(Direction.RIGHT)
            this.refocus()
        }])
    }

    clearBoxes() {
        if (this.boxes) {
            this.boxes.forEach(function(elem) {
                elem.remove();
            })
        }
        this.boxes = []
    }

    highlightBoxes(svg) {
        var cur = this.node;
        this.clearBoxes()

        while (cur) {
            if (cur.isCursorable()) {
                var bb = cur.getSVGBBox();
                if (!bb) return;
                this.boxes = this.boxes.concat(Util.highlightBox(svg, bb));
            }
            cur = cur.parent;
        }
    }

    findElement(): Element {
        return document.getElementById('cursor-' + this.id);
    }

    findHighlight(): Element {
        return document.getElementById('cursor-highlight-' + this.id);
    }

    drawAt(svgelem, x, y, height, skipScroll) {
        this.renderedPosition = {x: x, y: y, height: height}
        var celem = this.findElement();
        if (!celem) {
            celem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            celem.setAttribute('fill', '#777777');
            celem.setAttribute('class', 'math-cursor');
            celem.id = 'cursor-' + this.id;
            svgelem.appendChild(celem);
        } else {
            var oldclass = celem.getAttribute('class');
            celem.setAttribute('class', oldclass.split('blink').join(''));
        }
        celem.setAttribute('x', x);
        celem.setAttribute('y', y);
        celem.setAttribute('width', this.width.toString());
        celem.setAttribute('height', height);
        clearTimeout(this.startBlink);
        this.startBlink = setTimeout(function() {
            celem.setAttribute('class', celem.getAttribute('class') + ' blink');
        }.bind(this), 500);

        this.highlightBoxes(svgelem);

        if (this.mode === Cursor.CursorMode.SELECTION) {
            if (this.selectionEnd.node.type === 'mrow') {
                this.selectionEnd.node.drawCursorHighlight(this);
            }
        }

        var jax = MathJax.Hub.getAllJax('#' + svgelem.parentNode.id)[0];

        // TODO: remove this, it's just for debugging
        try {
            visualizeJax(jax, '#mmlviz', this);
        } catch (err) {
            // Ignore
            console.error('Failed to visualize jax');
        }

        if (!skipScroll) this.scrollIntoView(svgelem)
    }

    clearHighlight() {
        this.mode = Cursor.CursorMode.NORMAL;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.hideHighlight();
    }

    hideHighlight() {
        var celem = this.findHighlight();
        if (celem) {
            celem.remove();
        }
    }

    drawHighlightAt(svgelem, x, y, w, h) {
        var celem = this.findHighlight()
        if (!celem) {
            celem = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            celem.setAttribute('fill', 'rgba(173, 216, 250, 0.5)')
            celem.setAttribute('class', 'math-cursor-highlight')
            celem.id = 'cursor-highlight-' + this.id
            svgelem.appendChild(celem)
        }

        celem.setAttribute('x', x);
        celem.setAttribute('y', y);
        celem.setAttribute('width', w);
        celem.setAttribute('height', h);
    }

    scrollIntoView(svgelem) {
        if (!this.renderedPosition) return false
        var x = this.renderedPosition.x
        var y = this.renderedPosition.y
        var height = this.renderedPosition.height
        var clientPoint = Util.elemCoordsToScreenCoords(svgelem, x, y+height/2)
        var clientWidth = document.body.clientWidth
        var clientHeight = document.body.clientHeight
        var sx = 0, sy = 0
        if (clientPoint.x < 0 || clientPoint.x > clientWidth) {
            sx = clientPoint.x - clientWidth / 2
        }
        if (clientPoint.y < 0 || clientPoint.y > clientHeight) {
            sy = clientPoint.y - clientHeight / 2
        }
        if (sx || sy) {
            window.scrollBy(sx, sy)
        }
    }

    remove() {
        var cursor = this.findElement()
        if (cursor) cursor.remove()
    }

    blur(event) {
        this.remove();
        this.clearBoxes();
    }

    focus() {
        this.draw();
    }

    focusFirstHole(root) {
        if (!root) return;

        if (root.type === "hole") {
            this.node = root;
            this.position = 0;
            this.draw();
            return true;
        }

        for (var i = 0; i < root.data.length; i++) {
            if (this.focusFirstHole(root.data[i])) return true;
        }

        return false;
    }
}
