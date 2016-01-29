/// <reference path="../bbox/bbox.ts" />
/// <reference path="../bbox/rect.ts" />
/// <reference path="../editable_svg_config.ts" />

class ElementJax {
    Get(...values): any;
    getValues(...values): any;

    Core: any;
    CoreParent: any;
    CoreText: any;
    Parent: any;
    parent: any;
    attr: any;
    attrNames: any;
    background: any;
    defaults: any;
    fontWeight: any;
    forceStretch: any;
    hasNewline: any;
    hasValue: any;
    href: any;
    id: any;
    isEmbellished: any;
    isToken: any;
    mathbackground: any;
    mathcolor: any;
    mathsize: any;
    remap: any;
    remapChars: any;
    scale: any;
    style: any;
    styles: any;
    texSpacing: any;
    type: string;
    useMMLspacing: boolean;
    variantForm: any;

    displayIndent: any;
    isMultiline: boolean;
    displayAlign: any;
}

class MBaseMixin extends ElementJax {
    HUB: any;
    MML: any;
    HTML: any;

    editableSVG: any;

    data: any;
    base: any;
    EditableSVGdata: any;
    EditableSVGelem: SVGSVGElement;

    mscale: any;

    getBB(relativeTo) {
        var elem = this.EditableSVGelem;
        if (!elem) {
            console.log('Oh no! Couldn\'t find elem for this');
            return;
        }

        return elem.getBBox();
    }

    static getMethods(AJAX, HUB, HTML, editableSVG) {
        var obj = {};
        obj.prototype = {};
        obj.constructor.prototype = {};
        for (var id in this.prototype) {
            obj[id] = this.prototype[id];
            // obj.prototype[id] = this.prototype[id].bind(self);
            // obj.constructor.prototype[id] = this.prototype[id].bind(self);
        }

        obj.editableSVG = editableSVG;

        return obj;
    }

    toSVG(...args): any;
    toSVG() {
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
                    svg.skew = child.skew
                }
            }
        }
        svg.Clean();
        var text = this.data.join("");
        if (svg.skew && text.length !== 1) {
            delete svg.skew
        }
        if (svg.r > svg.w && text.length === 1 && !variant.noIC) {
            svg.ic = svg.r - svg.w;
            svg.w = svg.r
        }
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        this.EditableSVGelem = svg.element;
        return svg;
    }

    SVGchildSVG(i) {
        return (this.data[i] ? this.data[i].toSVG() : new BBOX());
    }

    EditableSVGdataStretched(i, HW, D = null) {
        this.EditableSVGdata = {
            HW: HW,
            D: D
        };
        if (!this.data[i]) {
            return new BBOX();
        }
        if (D != null) {
            return this.data[i].SVGstretchV(HW, D)
        }
        if (HW != null) {
            return this.data[i].SVGstretchH(HW)
        }
        return this.data[i].toSVG();
    }

    SVGsaveData(svg) {
        /*
          SVGsaveData is called every time a new svg element wants to be rendered
          SVGsaveData pushes CSS attributes etc. onto the actual svg elements
          setting this.EditableSVGelem to this svg.element will keep the copy fresh even when the parent
          re-renders the child's svg elements (e.g. with a stretch)
         */
        this.EditableSVGelem = svg.element;

        if (!this.EditableSVGdata) {
            this.EditableSVGdata = {}
        }
        this.EditableSVGdata.w = svg.w, this.EditableSVGdata.x = svg.x;
        this.EditableSVGdata.h = svg.h, this.EditableSVGdata.d = svg.d;
        if (svg.y) {
            this.EditableSVGdata.h += svg.y;
            this.EditableSVGdata.d -= svg.y
        }

        if (svg.X != null) this.EditableSVGdata.X = svg.X
        if (svg.tw != null) this.EditableSVGdata.tw = svg.tw
        if (svg.skew) this.EditableSVGdata.skew = svg.skew
        if (svg.ic) this.EditableSVGdata.ic = svg.ic

        if (this["class"]) {
            svg.removeable = false;
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
                "class": this["class"]
            })
        }

        // FIXME:  if an element is split by linebreaking, the ID will be the same on both parts
        // FIXME:  if an element has an id, its zoomed copy will have the same ID
        if (this.id) {
            svg.removeable = false;
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
                "id": this.id
            })
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
                // for svg element, put <a> inside the main <g> element
                var g = svg.element.firstChild;
                while (g.firstChild) {
                    a.appendChild(g.firstChild)
                }
                g.appendChild(a);
            } else {
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
                svg.element.style.fontSize = ""
            } // handled by scale
            svg.element.style.border = svg.element.style.padding = "";
            if (svg.removeable) {
                svg.removeable = (svg.element.style.cssText === "")
            }
        }

        this.SVGaddAttributes(svg);
    }

    SVGaddClass(node, name) {
        var classes = node.getAttribute("class");
        node.setAttribute("class", (classes ? classes + " " : "") + name);
    }

    SVGaddAttributes(svg) {

        //  Copy RDFa, aria, and other tags from the MathML to the HTML-CSS
        //  output spans Don't copy those in the MML.nocopyAttributes list,
        //  the ignoreMMLattributes configuration list, or anything tha
        //  already exists as a property of the span (e.g., no "onlick", etc.)
        //  If a name in the ignoreMMLattributes object is set to false, then
        //  the attribute WILL be copied.
        if (this.attrNames) {
            var copy = this.attrNames,
            skip = MathJax.ElementJax.mml.nocopyAttributes,
            ignore = MathJax.Hub.config.ignoreMMLattributes;
            var defaults = (this.type === "mstyle" ? MathJax.ElementJax.mml.math.prototype.defaults : this.defaults);
            for (var i = 0, m = copy.length; i < m; i++) {
                var id = copy[i];
                if (ignore[id] == false || (!skip[id] && !ignore[id] &&
                                            defaults[id] == null && typeof(svg.element[id]) === "undefined")) {
                    svg.element.setAttribute(id, this.attr[id]);
                    svg.removeable = false;
                }
            }
        }
    }

    //  WebKit currently scrolls to the BOTTOM of an svg element if it contains the
    //  target of the link, so implement link by hand, to the containing span element.
    SVGlink() {
        var href = this.href.animVal;
        if (href.charAt(0) === "#") {
            var target = Util.hashCheck(document.getElementById(href.substr(1)));
            if (target && target.scrollIntoView) {
                setTimeout(function() {
                    target.parentNode.scrollIntoView(true)
                }, 1)
            }
        }
        document.location = href;
    }

    SVGgetStyles() {
        if (this.style) {
            var span = this.HTML.Element("span");
            span.style.cssText = this.style;
            this.styles = this.SVGprocessStyles(span.style);
        }
    }

    SVGprocessStyles(style) {
        var styles = {
            border: Util.getBorders(style),
            padding: Util.getPadding(style)
        };
        if (!styles.border) delete styles.border
        if (!styles.padding) delete styles.padding
        if (style.fontSize) styles['fontSize'] = style.fontSize
        if (style.color) styles['color'] = style.color
        if (style.backgroundColor) styles['background'] = style.backgroundColor
        if (style.fontStyle) styles['fontStyle'] = style.fontStyle
        if (style.fontWeight) styles['fontWeight'] = style.fontWeight
        if (style.fontFamily) styles['fontFamily'] = style.fontFamily
        if (styles['fontWeight'] && styles['fontWeight'].match(/^\d+$/))
            styles['fontWeight'] = (parseInt(styles['fontWeight']) > 600 ? "bold" : "normal")
        return styles;
    }

    SVGhandleSpace(svg) {
        if (this.useMMLspacing) {
            if (this.type !== "mo") return;
            var values = this.getValues("scriptlevel", "lspace", "rspace");
            if (values.scriptlevel <= 0 || this.hasValue("lspace") || this.hasValue("rspace")) {
                var mu = this.SVGgetMu(svg);
                values.lspace = Math.max(0, Util.length2em(values.lspace, mu));
                values.rspace = Math.max(0, Util.length2em(values.rspace, mu));
                var core = this,
                parent = this.Parent();
                while (parent && parent.isEmbellished() && parent.Core() === core) {
                    core = parent;
                    parent = parent.Parent()
                }
                if (values.lspace) svg.x += values.lspace
                if (values.rspace) svg.X = values.rspace
            }
        } else {
            var space = this.texSpacing();
            this.SVGgetScale();
            if (space !== "") svg.x += Util.length2em(space, this.scale) * this.mscale
        }
    }

    SVGhandleColor(svg) {
        var values = this.getValues("mathcolor", "color");
        if (this.styles && this.styles.color && !values.color) {
            values.color = this.styles.color
        }
        if (values.color && !this.mathcolor) {
            values.mathcolor = values.color
        }
        if (values.mathcolor) {
            MathJax.OutputJax.EditableSVG.Element(svg.element, {
                fill: values.mathcolor,
                stroke: values.mathcolor
            })
            svg.removeable = false;
        }
        var borders = (this.styles || {}).border,
        padding = (this.styles || {}).padding,
        bleft = ((borders || {}).left || 0),
        pleft = ((padding || {}).left || 0),
        id;
        values.background = (this.mathbackground || this.background ||
                             (this.styles || {}).background || MathJax.ElementJax.mml.COLOR.TRANSPARENT);
        if (bleft + pleft) {

            //  Make a box and move the contents of svg to it,
            //    then add it back into svg, but offset by the left amount
            var dup = new BBOX(MathJax.Hub);
            for (id in svg) {
                if (svg.hasOwnProperty(id)) {
                    dup[id] = svg[id]
                }
            }
            dup.x = 0;
            dup.y = 0;
            svg.element = MathJax.OutputJax.EditableSVG.Element("g");
            svg.removeable = true;
            svg.Add(dup, bleft + pleft, 0);
        }

        //  Adjust size by padding and dashed borders (left is taken care of above)
        if (padding) {
            svg.w += padding.right || 0;
            svg.h += padding.top || 0;
            svg.d += padding.bottom || 0
        }
        if (borders) {
            svg.w += borders.right || 0;
            svg.h += borders.top || 0;
            svg.d += borders.bottom || 0
        }

        //  Add background color
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
            }), 0, 0, false, true)
        }

        //  Add borders
        if (borders) {
            var dd = 5; // fuzz factor to avoid anti-alias problems at edges
            var sides = {
                left: ["V", svg.h + svg.d, -dd, -svg.d],
                right: ["V", svg.h + svg.d, svg.w - borders.right + dd, -svg.d],
                top: ["H", svg.w, 0, svg.h - borders.top + dd],
                bottom: ["H", svg.w, 0, -svg.d - dd]
            }
            for (id in sides) {
                if (sides.hasOwnProperty(id)) {
                    if (borders[id]) {
                        var side = sides[id],
                        box = BBOX[side[0] + "LINE"];
                        svg.Add(box(side[1], borders[id], borders[id + "Style"], borders[id + "Color"]), side[2], side[3]);
                    }
                }
            }
        }
    }

    SVGgetVariant() {
        var values = this.getValues("mathvariant", "fontfamily", "fontweight", "fontstyle");
        var variant = values.mathvariant;
        if (this.variantForm) {
            variant = "-TeX-variant"
        }
        values.hasVariant = this.Get("mathvariant", true); // null if not explicitly specified
        if (!values.hasVariant) {
            values.family = values.fontfamily;
            values.weight = values.fontweight;
            values.style = values.fontstyle;
        }
        if (this.styles) {
            if (!values.style && this.styles.fontStyle) values.style = this.styles.fontStyle;
            if (!values.weight && this.styles.fontWeight) values.weight = this.styles.fontWeight;
            if (!values.family && this.styles.fontFamily) values.family = this.styles.fontFamily;
        }
        if (values.family && !values.hasVariant) {
            if (!values.weight && values.mathvariant.match(/bold/)) {
                values.weight = "bold"
            }
            if (!values.style && values.mathvariant.match(/italic/)) {
                values.style = "italic"
            }
            variant = {
                forceFamily: true,
                font: {
                    "font-family": values.family
                }
            };
            if (values.style) {
                variant.font["font-style"] = values.style
            }
            if (values.weight) {
                variant.font["font-weight"] = values.weight
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
        } else if (values.weight === "normal") {
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
        } else if (values.style === "normal") {
            variant = {
                italic: MathJax.ElementJax.mml.VARIANT.NORMAL,
                "bold-italic": MathJax.ElementJax.mml.VARIANT.BOLD,
                "sans-serif-italic": MathJax.ElementJax.mml.VARIANT.SANSSERIF,
                "sans-serif-bold-italic": MathJax.ElementJax.mml.VARIANT.BOLDSANSSERIF
            }[variant] || variant;
        }
        if (!(variant in MathJax.OutputJax.EditableSVG.FONTDATA.VARIANT)) {
            // If the mathvariant value is invalid or not supported by this
            // font, fallback to normal. See issue 363.
            variant = "normal";
        }
        return MathJax.OutputJax.EditableSVG.FONTDATA.VARIANT[variant];
    }

    SVGgetScale(svg?) {
        var scale = 1;
        if (this.mscale) {
            scale = this.scale;
        } else {
            var values = this.getValues("scriptlevel", "fontsize");
            values.mathsize = (this.isToken ? this : this.Parent()).Get("mathsize");
            if ((this.styles || {}).fontSize && !values.fontsize) {
                values.fontsize = this.styles.fontSize
            }
            if (values.fontsize && !this.mathsize) {
                values.mathsize = values.fontsize
            }
            if (values.scriptlevel !== 0) {
                if (values.scriptlevel > 2) {
                    values.scriptlevel = 2
                }
                scale = Math.pow(this.Get("scriptsizemultiplier"), values.scriptlevel);
                values.scriptminsize = Util.length2em(this.Get("scriptminsize")) / 1000;
                if (scale < values.scriptminsize) {
                    scale = values.scriptminsize
                }
            }
            this.scale = scale;
            this.mscale = Util.length2em(values.mathsize) / 1000;
        }
        if (svg) {
            svg.scale = scale;
            if (this.isToken) {
                svg.scale *= this.mscale
            }
        }
        return scale * this.mscale;
    }

    SVGgetMu(svg) {
        var mu = 1,
        values = this.getValues("scriptlevel", "scriptsizemultiplier");
        if (svg.scale && svg.scale !== 1) {
            mu = 1 / svg.scale
        }
        if (values.scriptlevel !== 0) {
            if (values.scriptlevel > 2) {
                values.scriptlevel = 2
            }
            mu = Math.sqrt(Math.pow(values.scriptsizemultiplier, values.scriptlevel));
        }
        return mu;
    }

    SVGnotEmpty(data) {
        while (data) {
            if ((data.type !== "mrow" && data.type !== "texatom") ||
                data.data.length > 1) {
                return true
            }
            data = data.data[0];
        }
        return false;
    }

    SVGcanStretch(direction) {
        var can = false;
        if (this.isEmbellished()) {
            var core = this.Core();
            if (core && core !== this) {
                can = core.SVGcanStretch(direction);
                if (can && core.forceStretch) {
                    this.forceStretch = true
                }
            }
        }
        return can;
    }

    SVGstretchV(h, d) {
        return this.toSVG(h, d)
    }

    SVGstretchH(w) {
        return this.toSVG(w)
    }

    SVGlineBreaks() {
        return false
    }

    // TODO: these two go in the second argument to Augment
    SVGautoload() {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + this.type + ".js";
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
    }

    SVGautoloadFile(name) {
        var file = MathJax.OutputJax.EditableSVG.autoloadDir + "/" + name + ".js";
        MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
    }

    SVGlength2em(svg, length, mu, d, m) {
        if (m == null) {
            m = -Util.BIGDIMEN
        }
        var match = String(length).match(/width|height|depth/);
        var size = (match ? svg[match[0].charAt(0)] : (d ? svg[d] : 0));
        var v = Util.length2em(length, mu, size / this.mscale) * this.mscale;
        if (d && String(length).match(/^\s*[-+]/)) {
            return Math.max(m, svg[d] + v)
        } else {
            return v
        }
    }

    //////////////////
    // Cursor stuff //
    //////////////////


    isCursorable(): boolean { return false; }

    moveCursor(cursor, direction) {
        this.parent.moveCursorFromChild(cursor, direction, this)
    }

    moveCursorFromChild(cursor, direction, child) {
        throw new Error('Unimplemented as cursor container')
    }

    moveCursorFromParent(cursor, direction) {
        return false
    }

    moveCursorFromClick(cursor, x, y) {
        return false
    }

    drawCursor(cursor) {
        throw new Error('Unable to draw cursor')
    }

    // If this function is called on a node, it means the selectionEnd is inside that node
    drawCursorHighlight(cursor) {
        var bb = this.getSVGBBox();
        var svgelem = this.EditableSVGelem.ownerSVGElement;
        cursor.drawHighlightAt(svgelem, bb.x, bb.y, bb.width, bb.height);
    }

    getSVGBBox(elem?) {
        var elem = elem || this.EditableSVGelem;
        if (!elem || !elem.ownerSVGElement) return;

        var bb = elem.getBBox()
        if (elem.nodeName === 'use') {
            bb.x += Number(elem.getAttribute('x'))
            bb.y += Number(elem.getAttribute('y'))
        }
        var transform = elem.getTransformToElement(elem.ownerSVGElement)
        var ptmp = elem.ownerSVGElement.createSVGPoint()
        var lx = 1/0, ly = 1/0, hx = -1/0, hy = -1/0

        check(bb.x, bb.y)
        check(bb.x+bb.width, bb.y)
        check(bb.x, bb.y+bb.height)
        check(bb.x+bb.width, bb.y+bb.height)

        return {
            x: lx,
            y: ly,
            width: hx-lx,
            height: hy-ly,
        }

        function check(x, y) {
            ptmp.x = x
            ptmp.y = y
            var p = ptmp.matrixTransform(transform)
            lx = Math.min(lx, p.x)
            ly = Math.min(ly, p.y)
            hx = Math.max(hx, p.x)
            hy = Math.max(hy, p.y)
        }
    }
}
