/// <reference path="jax.ts" />
/// <reference path="bbox/g.ts" />
/// <reference path="bbox/text.ts" />

class Util {
    static MML: any;

    static SVGNS = "http://www.w3.org/2000/svg";
    static XLINKNS = "http://www.w3.org/1999/xlink";

    // These are filled in in the Translate function in jax.ts
    // TODO: let's not do this
    static em: number;
    static ex: number;
    static cwidth: number;
    static lineWidth: number;
    static pxPerInch: number;

    static Em(m) {
        if (Math.abs(m) < 0.0006) {
            return "0em";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "em";
    }

    static Ex(m) {
        m = Math.round(m / this.TeX.x_height * this.ex) / this.ex; // try to use closest pixel size
        if (Math.abs(m) < 0.0006) {
            return "0ex";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "ex";
    }

    static Percent(m) {
        return (100 * m).toFixed(1).replace(/\.?0+$/, "") + "%";
    }

    static NBSP = "\u00A0";

    static Fixed(m, n?) {
        if (Math.abs(m) < 0.0006) {
            return "0";
        }
        return m.toFixed(n || 3).replace(/\.?0+$/, "");
    }

    //  Return the containing HTML element rather than the SVG element, since
    //  most browsers can't position to an SVG element properly.
    static hashCheck(target) {
        if (target && target.nodeName.toLowerCase() === "g") {
            do {
                target = target.parentNode;
            } while (target && target.firstChild.nodeName !== "svg");
        }
        return target;
    }

    static Element(type, def) {
        var obj;
        if (document.createElementNS) {
            obj = (typeof(type) === "string" ? document.createElementNS("http://www.w3.org/2000/svg", type) : type);
        } else {
            obj = (typeof(type) === "string" ? document.createElement("svg:" + type) : type);
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
    }

    static addElement(parent, type, def?) {
        return parent.appendChild(Util.Element(type, def))
    }

    static length2em(length, mu=null, size=null): number {
        if (typeof(length) !== "string")
            length = length.toString();

        if (length === "") return 0;
        if (length === MathJax.ElementJax.mml.SIZE.NORMAL) return 1000;
        if (length === MathJax.ElementJax.mml.SIZE.BIG) return 2000;
        if (length === MathJax.ElementJax.mml.SIZE.SMALL) return 710;
        if (length === "infinity") return this.BIGDIMEN;
        if (length.match(/mathspace$/)) return 1000 * this.MATHSPACE[length];
        var zoomScale = parseInt(MathJax.Hub.config.menuSettings.zscale) / 100;
        var emFactor = (zoomScale || 1) / Util.em;
        var match = length.match(/^\s*([-+]?(?:\.\d+|\d+(?:\.\d*)?))?(pt|em|ex|mu|px|pc|in|mm|cm|%)?/);
        var m = parseFloat(match[1] || "1") * 1000,
        unit = match[2];
        if (size == null) size = 1000
        if (mu == null) mu = 1;
        if (unit === "em") return m;
        if (unit === "ex") return m * this.TeX.x_height / 1000;
        if (unit === "%") return m / 100 * size / 1000;
        if (unit === "px") return m * emFactor;
        if (unit === "pt") return m / 10;
        if (unit === "pc") return m * 1.2;
        if (unit === "in") return m * this.pxPerInch * emFactor;
        if (unit === "cm") return m * this.pxPerInch * emFactor / 2.54;
        if (unit === "mm") return m * this.pxPerInch * emFactor / 25.4;
        if (unit === "mu") return m / 18 * mu;
        return m * size / 1000; // relative to given size (or 1em as default)
    }

    static getPadding(styles) {
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
    }

    static getBorders(styles) {
        var border = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        has = false;
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
                } else {
                    delete border[id];
                }
            }
        }
        return (has ? border : false);
    }

    static thickness2em(length, mu) {
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
    }

    static BIGDIMEN = 10000000;

    //  Units are em/1000 so quad is 1em
    static TeX = {
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

        min_rule_thickness: 1.25, // in pixels
        min_root_space: 1.5 // in pixels
    };

    static MATHSPACE = {
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
    }

    static elemCoordsToScreenCoords(elem, x, y) {
        var svg = this.getSVGElem(elem);
        if (!svg) return;

        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;

        return pt.matrixTransform(elem.getScreenCTM());
    }

    // Convert coordinates in some arbitrary element's coordinate system to the viewport coordinate system
    static elemCoordsToViewportCoords(elem, x, y) {
        var svg = this.getSVGElem(elem)
        if (!svg) return

        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;

        return pt.matrixTransform(elem.getTransformToElement(svg));
    }

    static getSVGElem(elem) {
        if (!elem) return;
        var svg = elem.nodeName === 'svg' ? elem : elem.ownerSVGElement;
        if (!svg) {
            console.error('No owner SVG element');
            return;
        }
        return svg;
    }

    static screenCoordsToElemCoords(elem, x, y) {
        var svg = this.getSVGElem(elem)
        if (!svg) return

        var pt = svg.createSVGPoint();
        pt.x = x
        pt.y = y

        return pt.matrixTransform(elem.getScreenCTM().inverse());
    }

    static boxContains(bb, x, y) {
        return bb && bb.x <= x && x <= bb.x+bb.width && bb.y <= y && y <= bb.y+bb.height;
    }

    static nodeContainsScreenPoint(node, x, y) {
        var bb = node.getBB && node.getBB()
        var p = this.screenCoordsToElemCoords(node.EditableSVGelem, x, y);
        if (!bb || !p) return false

        return Util.boxContains(bb, p.x, p.y);
    }

    static highlightBox(svg, bb) {
        var d = 100; // TODO: use proper units

        var drawLine = function(x1, y1, x2, y2) {
            var line = document.createElementNS(this.SVGNS, 'line')
            svg.appendChild(line)
            line.setAttribute('style', 'stroke:rgb(0,0,255);stroke-width:20')
            line.setAttribute('x1', x1)
            line.setAttribute('y1', y1)
            line.setAttribute('x2', x2)
            line.setAttribute('y2', y2)
            return line
        };

        return [
            // Top left
            drawLine(bb.x, bb.y, bb.x + d, bb.y),
            drawLine(bb.x, bb.y, bb.x, bb.y + d),
            // Top right
            drawLine(bb.x + bb.width, bb.y, bb.x + bb.width - d, bb.y),
            drawLine(bb.x + bb.width, bb.y, bb.x + bb.width, bb.y + d),
            // Bottom right
            drawLine(bb.x, bb.y + bb.height, bb.x, bb.y + bb.height - d),
            drawLine(bb.x, bb.y + bb.height, bb.x + d, bb.y + bb.height),

            // Bottom right
            drawLine(bb.x + bb.width, bb.y + bb.height, bb.x + bb.width - d, bb.y + bb.height),
            drawLine(bb.x + bb.width, bb.y + bb.height, bb.x + bb.width, bb.y + bb.height - d)
        ];
    }

    static getCursorValue(direction) {
        if (isNaN(direction)) {
            switch(direction[0].toLowerCase()) {
            case 'u': return Direction.UP
            case 'd': return Direction.DOWN
            case 'l': return Direction.LEFT
            case 'r': return Direction.RIGHT
            }
            throw new Error('Invalid cursor value')
        } else {
            return direction
        }
    }
}
