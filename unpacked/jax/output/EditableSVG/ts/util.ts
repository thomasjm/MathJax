/// <reference path="jax.ts" />
/// <reference path="util.ts" />

class Util {
    static MML: any;

    static SVGNS = "http://www.w3.org/2000/svg";
    static XLINKNS = "http://www.w3.org/1999/xlink";

    // TODO: this needs to be set by the code in Translate
    static em: number;
    static ex: number;
    static pxPerInch: number;

    Em(m) {
        if (Math.abs(m) < 0.0006) {
            return "0em";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "em";
    }

    Ex(m) {
        m = Math.round(m / this.TeX.x_height * this.ex) / this.ex; // try to use closest pixel size
        if (Math.abs(m) < 0.0006) {
            return "0ex";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "ex";
    }

    Percent(m) {
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

    Element(type, def) {
        var obj = (typeof(type) === "string" ? document.createElementNS(Util.SVGNS, type) : type);
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

    static length2em(length, mu=null, size=null) {
        if (typeof(length) !== "string") {
            length = length.toString();
        }
        if (length === "") {
            return "";
        }
        if (length === this.MML.SIZE.NORMAL) {
            return 1000;
        }
        if (length === this.MML.SIZE.BIG) {
            return 2000;
        }
        if (length === this.MML.SIZE.SMALL) {
            return 710;
        }
        if (length === "infinity") {
            return this.BIGDIMEN;
        }
        if (length.match(/mathspace$/)) {
            return 1000 * this.MATHSPACE[length];
        }
        var emFactor = (EditableSVG.zoomScale || 1) / Util.em;
        var match = length.match(/^\s*([-+]?(?:\.\d+|\d+(?:\.\d*)?))?(pt|em|ex|mu|px|pc|in|mm|cm|%)?/);
        var m = parseFloat(match[1] || "1") * 1000,
        unit = match[2];
        if (size == null) {
            size = 1000
        };
        if (mu == null) {
            mu = 1;
        }
        if (unit === "em") {
            return m;
        }
        if (unit === "ex") {
            return m * this.TeX.x_height / 1000;
        }
        if (unit === "%") {
            return m / 100 * size / 1000;
        }
        if (unit === "px") {
            return m * emFactor;
        }
        if (unit === "pt") {
            return m / 10;
        } // 10 pt to an em
        if (unit === "pc") {
            return m * 1.2;
        } // 12 pt to a pc
        if (unit === "in") {
            return m * this.pxPerInch * emFactor;
        }
        if (unit === "cm") {
            return m * this.pxPerInch * emFactor / 2.54;
        } // 2.54 cm to an inch
        if (unit === "mm") {
            return m * this.pxPerInch * emFactor / 25.4;
        } // 10 mm to a cm
        if (unit === "mu") {
            return m / 18 * mu;
        }
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
        if (length === this.MML.LINETHICKNESS.MEDIUM) {
            return thick;
        }
        if (length === this.MML.LINETHICKNESS.THIN) {
            return 0.67 * thick;
        }
        if (length === this.MML.LINETHICKNESS.THICK) {
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
}
