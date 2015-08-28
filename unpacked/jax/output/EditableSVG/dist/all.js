var EditableSVGConfig = (function () {
    function EditableSVGConfig() {
    }
    EditableSVGConfig.config = {
        styles: {
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
        }
    };
    return EditableSVGConfig;
})();
/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/*************************************************************
 *
 *  MathJax/jax/output/EditableSVG/jax.js
 *
 *  Implements an editable SVG OutputJax that displays mathematics using
 *  SVG (or VML in IE) to position the characters from math fonts
 *  in their proper locations.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2011-2015 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
var EditableSVG = (function () {
    function EditableSVG() {
        this.AJAX = MathJax.AJAX;
        this.HUB = MathJax.Hub;
        this.HTML = MathJax.HTML;
        this.SVG = MathJax.OutputJax.EditableSVG;
        this.config = EditableSVGConfig.config;
        this.hideProcessedMath = true;
        this.fontNames = ["TeX", "STIX", "STIX-Web", "Asana-Math",
            "Gyre-Termes", "Gyre-Pagella", "Latin-Modern", "Neo-Euler"];
        this.TextNode = this.HTML.TextNode;
        this.addText = this.HTML.addText;
        this.ucMatch = this.HTML.ucMatch;
        this.HUB.Register.StartupHook("mml Jax Ready", function () {
            MML = MathJax.ElementJax.mml;
            this.MML.mbase.Augment(MBaseMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.chars.Augment(CharsMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.entity.Augment(EntityMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mo.Augment(MoMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mtext.Augment(MTextMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.merror.Augment(MErrorMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.ms.Augment(MsMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mglyph.Augment(MGlyphMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mspace.Augment(MSpaceMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mphantom.Augment(MPhantomMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mpadded.Augment(MPaddedMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mrow.Augment(MRowMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mstyle.Augment(MStyleMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mfrac.Augment(MFracMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.msqrt.Augment(MSqrtMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mroot.Augment(MRootMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mfenced.Augment(MFencedMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.menclose.Augment(MEncloseMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.maction.Augment(MActionMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.semantics.Augment(SemanticsMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.munderover.Augment(MUnderOverMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.msubsup.Augment(MSubSupMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mmultiscripts.Augment(MMultiScriptsMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.mtable.Augment(MTableMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.math.Augment(MathMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            this.MML.TeXAtom.Augment(TeXAtomMixin.getMethods(this.AJAX, this.HUB, this.HTML, this));
            MML["annotation-xml"].Augment({
                toSVG: this.MML.mbase.SVGautoload
            });
            this.HUB.Register.StartupHook("onLoad", function () {
                setTimeout(MathJax.Callback(["loadComplete", SVG, "jax.js"]), 0);
            });
        });
        this.HUB.Browser.Select({
            Opera: function (browser) {
                SVG.Augment({
                    operaZoomRefresh: true
                });
            }
        });
        this.HUB.Register.StartupHook("End Cookie", function () {
            if (HUB.config.menuSettings.zoom !== "None") {
                this.AJAX.Require("[MathJax]/extensions/MathZoom.js");
            }
        });
        if (!document.createElementNS) {
            if (!document.namespaces.svg) {
                document.namespaces.add("svg", SVGNS);
            }
        }
    }
    EditableSVG.prototype.Config = function () {
        this.SUPER(arguments).Config.apply(this, arguments);
        var settings = this.HUB.config.menuSettings, config = this.config, font = settings.font;
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
    EditableSVG.prototype.getNodesAsFlatList = function (jax) {
        var rest = jax.data ? _.flatten(_.map(jax.data, this.getNodesAsFlatList)) : [];
        return [jax].concat(rest);
    };
    EditableSVG.prototype.elemCoordsToViewportCoords = function (elem, x, y) {
        var svg = $(elem).closest('svg').get()[0];
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(elem.getCTM());
    };
    EditableSVG.prototype.nodeContainsPoint = function (svg, node, point) {
        if (!node.getBB) {
            console.error("Node doesn't have getBB");
            return false;
        }
        var bb = node.getBB();
        if (!bb) {
            console.error("Didn't get a bb", node.EditableSVGelem);
            return false;
        }
        var converted = this.elemCoordsToViewportCoords(node.EditableSVGelem, bb.x, bb.y);
        console.log('considering bb: ', node.EditableSVGelem, converted.x, converted.y, bb.width, bb.height);
        if (point.x < bb.x || point.x > bb.x + bb.width)
            return false;
        if (point.y > bb.y || point.y < bb.y - bb.height)
            return false;
        console.log('MATCHED');
        return true;
    };
    EditableSVG.prototype.Startup = function () {
        EVENT = MathJax.Extension.MathEvents.Event;
        TOUCH = MathJax.Extension.MathEvents.Touch;
        HOVER = MathJax.Extension.MathEvents.Hover;
        this.ContextMenu = this.EVENT.ContextMenu;
        this.Mouseover = HOVER.Mouseover;
        this.Mouseout = HOVER.Mouseout;
        this.Mousemove = HOVER.Mousemove;
        this.hiddenDiv = this.HTML.Element("div", {
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
        this.hiddenDiv = this.HTML.addElement(this.hiddenDiv, "div", {
            id: "MathJax_SVG_Hidden"
        });
        var div = this.HTML.addElement(this.hiddenDiv, "div", {
            style: {
                width: "5in"
            }
        });
        Util.pxPerInch = div.offsetWidth / 5;
        this.hiddenDiv.removeChild(div);
        this.textSVG = this.Element("svg");
        BBOX_GLYPH.defs = this.addElement(this.addElement(this.hiddenDiv.parentNode, "svg"), "defs", {
            id: "MathJax_SVG_glyphs"
        });
        this.ExSpan = this.HTML.Element("span", {
            style: {
                position: "absolute",
                "font-size-adjust": "none"
            }
        }, [
            ["span", {
                    className: "MathJax_SVG_ExBox"
                }]
        ]);
        this.linebreakSpan = this.HTML.Element("span", null, [
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
        return this.AJAX.Styles(this.config.styles, ["InitializeSVG", this]);
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
        var scripts = state.jax[this.id], i, m = scripts.length, script, prev, span, div, test, jax, ex, em, maxwidth, relwidth = false, cwidth, linebreak = this.config.linebreaks.automatic, width = this.config.linebreaks.width;
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
            jax.SVG = {
                display: (jax.root.Get("display") === "block")
            };
            span = div = this.HTML.Element("span", {
                style: {
                    "font-size": this.config.scale + "%",
                    display: "inline-block"
                },
                className: "MathJax_SVG",
                id: jax.inputID + "-Frame",
                isMathJax: true,
                jaxID: this.id,
                oncontextmenu: this.EVENT.Menu,
                onmousedown: this.EVENT.Mousedown,
                onmouseover: this.EVENT.Mouseover,
                onmouseout: this.EVENT.Mouseout,
                onmousemove: this.EVENT.Mousemove,
                onclick: this.EVENT.Click,
                ondblclick: this.EVENT.DblClick
            });
            if (HUB.Browser.noContextMenu) {
                span.ontouchstart = TOUCH.start;
                span.ontouchend = TOUCH.end;
            }
            if (jax.SVG.display) {
                div = this.HTML.Element("div", {
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
                jax.SVG.isHidden = true;
                ex = this.defaultEx;
                cwidth = this.defaultWidth;
                if (relwidth) {
                    maxwidth = cwidth;
                }
            }
            jax.SVG.ex = ex;
            jax.SVG.em = em = ex / Util.TeX.x_height * 1000;
            jax.SVG.cwidth = cwidth / em * 1000;
            jax.SVG.lineWidth = (linebreak ? this.length2em(width, 1, maxwidth / em * 1000) : Util.BIGDIMEN);
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
            if (!jax.SVG.isHidden) {
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
            this.HUB.RestartAfter(MathJax.Callback.Delay(this.config.EqnChunkDelay));
        }
        var jax = script.MathJax.elementJax, math = jax.root, span = document.getElementById(jax.inputID + "-Frame"), div = (jax.SVG.display ? (span || {}).parentNode : span), localCache = (SVG.config.useFontCache && !SVG.config.useGlobalCache);
        if (!div)
            return;
        this.em = this.MML.mbase.prototype.em = jax.SVG.em;
        this.ex = jax.SVG.ex;
        this.linebreakWidth = jax.SVG.lineWidth;
        this.cwidth = jax.SVG.cwidth;
        this.mathDiv = div;
        span.appendChild(this.textSVG);
        if (localCache) {
            SVG.resetGlyphs();
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
                BBOX.GLYPH.n--;
            }
            throw err;
        }
        span.removeChild(this.textSVG);
        if (jax.SVG.isHidden) {
            script.parentNode.insertBefore(div, script);
        }
        div.className = div.className.split(/ /)[0];
        if (this.hideProcessedMath) {
            div.className += " MathJax_SVG_Processed";
            if (script.MathJax.preview) {
                jax.SVG.preview = script.MathJax.preview;
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
                var data = script.MathJax.elementJax.SVG;
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
        if (this.config.useFontCache) {
            var GLYPH = BBOX_GLYPH;
            if (this.config.useGlobalCache) {
                GLYPH.defs = document.getElementById("MathJax_SVG_glyphs");
                GLYPH.defs.innerHTML = "";
            }
            else {
                GLYPH.defs = this.Element("defs");
                GLYPH.n++;
            }
            GLYPH.glyphs = {};
            if (reset) {
                GLYPH.n = 0;
            }
        }
    };
    EditableSVG.prototype.getJaxFromMath = function (math) {
        if (math.parentNode.className === "MathJax_SVG_Display") {
            math = math.parentNode;
        }
        do {
            math = math.nextSibling;
        } while (math && math.nodeName.toLowerCase() !== "script");
        return this.HUB.getJaxFor(math);
    };
    EditableSVG.prototype.getHoverSpan = function (jax, math) {
        math.style.position = "relative";
        return math.firstChild;
    };
    EditableSVG.prototype.getHoverBBox = function (jax, span, math) {
        var bbox = this.EVENT.getBBox(span.parentNode);
        bbox.h += 2;
        bbox.d -= 2;
        return bbox;
    };
    EditableSVG.prototype.Zoom = function (jax, span, math, Mw, Mh) {
        span.className = "MathJax_SVG";
        var emex = span.appendChild(this.ExSpan.cloneNode(true));
        var ex = emex.firstChild.offsetHeight / 60;
        this.em = this.MML.mbase.prototype.em = ex / Util.TeX.x_height * 1000;
        this.ex = ex;
        this.linebreakWidth = jax.SVG.lineWidth;
        this.cwidth = jax.SVG.cwidth;
        emex.parentNode.removeChild(emex);
        span.appendChild(this.textSVG);
        this.mathDIV = span;
        this.zoomScale = parseInt(HUB.config.menuSettings.zscale) / 100;
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
            Y: -EVENT.getBBox(span).h,
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
            if (jax.SVG.display) {
                span = span.parentNode;
            }
            span.parentNode.removeChild(span);
        }
        delete jax.SVG;
    };
    EditableSVG.prototype.addElement = function (parent, type, def) {
        return parent.appendChild(this.Element(type, def));
    };
    EditableSVG.HandleVariant = function (variant, scale, text) {
        var svg = new BBOX_G();
        var n, N, c, font, VARIANT, i, m, id, M, RANGES;
        if (!variant) {
            variant = this.FONTDATA.VARIANT[MML.VARIANT.NORMAL];
        }
        if (variant.forceFamily) {
            text = new BBOX_TEXT(this.HTML, scale, text, variant.font);
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
                if (this.FONTDATA.RemapPlane1) {
                    var nv = this.FONTDATA.RemapPlane1(n, variant);
                    n = nv.n;
                    variant = nv.variant;
                }
            }
            else {
                RANGES = this.FONTDATA.RANGES;
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
                            variant = this.FONTDATA.VARIANT[variant["variant" + RANGES[id].offset]];
                        }
                        break;
                    }
                }
            }
            if (variant.remap && variant.remap[n]) {
                n = variant.remap[n];
                if (variant.remap.variant) {
                    variant = this.FONTDATA.VARIANT[variant.remap.variant];
                }
            }
            else if (this.FONTDATA.REMAP[n] && !variant.noRemap) {
                n = this.FONTDATA.REMAP[n];
            }
            if (n instanceof Array) {
                variant = this.FONTDATA.VARIANT[n[1]];
                n = n[0];
            }
            if (typeof (n) === "string") {
                text = n + text.substr(i + 1);
                m = text.length;
                i = -1;
                continue;
            }
            font = this.lookupChar(variant, n);
            c = font[n];
            if (c) {
                if ((c[5] && c[5].space) || (c[5] === "" && c[0] + c[1] === 0)) {
                    svg.w += c[2];
                }
                else {
                    c = [scale, font.id + "-" + n.toString(16).toUpperCase()].concat(c);
                    svg.Add(BBOX_GLYPH.apply(BBOX, c), svg.w, 0);
                }
            }
            else if (this.FONTDATA.DELIMITERS[n]) {
                c = this.createDelimiter(n, 0, 1, font);
                svg.Add(c, svg.w, (this.FONTDATA.DELIMITERS[n].dir === "V" ? c.d : 0));
            }
            else {
                if (n <= 0xFFFF) {
                    c = String.fromCharCode(n);
                }
                else {
                    N = n - 0x10000;
                    c = String.fromCharCode((N >> 10) + 0xD800) + String.fromCharCode((N & 0x3FF) + 0xDC00);
                }
                var box = new BBOX_TEXT(this.HTML, scale * 100 / SVG.config.scale, c, {
                    "font-family": variant.defaultFamily || SVG.config.undefinedFamily,
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
                this.HUB.signal.Post(["SVG Jax - unknown char", n, variant]);
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
    EditableSVG.lookupChar = function (variant, n) {
        var i, m;
        if (!variant.FONTS) {
            var FONTS = this.FONTDATA.FONTS;
            var fonts = (variant.fonts || this.FONTDATA.VARIANT.normal.fonts);
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
    EditableSVG.findBlock = function (font, c) {
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
    EditableSVG.loadFont = function (file) {
        this.HUB.RestartAfter(AJAX.Require(this.fontDir + "/" + file));
    };
    EditableSVG.createDelimiter = function (code, HW, scale, font) {
        if (scale === void 0) { scale = null; }
        if (font === void 0) { font = null; }
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
            alias: code
        };
        while (delim.alias) {
            code = delim.alias;
            delim = this.FONTDATA.DELIMITERS[code];
            if (!delim) {
                delim = {
                    HW: [0, this.FONTDATA.VARIANT[MML.VARIANT.NORMAL]]
                };
            }
        }
        if (delim.load) {
            this.HUB.RestartAfter(AJAX.Require(this.fontDir + "/fontdata-" + delim.load + ".js"));
        }
        for (var i = 0, m = delim.HW.length; i < m; i++) {
            if (delim.HW[i][0] * scale >= HW - 10 - SVG.config.blacker || (i == m - 1 && !delim.stretch)) {
                if (delim.HW[i][2]) {
                    scale *= delim.HW[i][2];
                }
                if (delim.HW[i][3]) {
                    code = delim.HW[i][3];
                }
                return this.createChar(scale, [code, delim.HW[i][1]], font).With({
                    stretched: true
                }, this.HUB);
            }
        }
        if (delim.stretch) {
            this["extendDelimiter" + delim.dir](svg, hw, delim.stretch, scale, font);
        }
        return svg;
    };
    EditableSVG.createChar = function (scale, data, font) {
        var text = "", variant = {
            fonts: [data[1]],
            noRemap: true
        };
        if (font && font === this.MML.VARIANT.BOLD) {
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
    EditableSVG.extendDelimiterV = function (svg, H, delim, scale, font) {
        var top = this.createChar(scale, (delim.top || delim.ext), font);
        var bot = this.createChar(scale, (delim.bot || delim.ext), font);
        var h = top.h + top.d + bot.h + bot.d;
        var y = -top.h;
        svg.Add(top, 0, y);
        y -= top.d;
        if (delim.mid) {
            var mid = this.createChar(scale, delim.mid, font);
            h += mid.h + mid.d;
        }
        if (delim.min && H < h * delim.min) {
            H = h * delim.min;
        }
        if (H > h) {
            var ext = this.createChar(scale, delim.ext, font);
            var k = (delim.mid ? 2 : 1), eH = (H - h) / k, s = (eH + 100) / (ext.h + ext.d);
            while (k-- > 0) {
                var g = SVG.Element("g", {
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
        var left = this.createChar(scale, (delim.left || delim.rep), font);
        var right = this.createChar(scale, (delim.right || delim.rep), font);
        svg.Add(left, -left.l, 0);
        var w = (left.r - left.l) + (right.r - right.l), x = left.r - left.l;
        if (delim.mid) {
            var mid = this.createChar(scale, delim.mid, font);
            w += mid.w;
        }
        if (delim.min && W < w * delim.min) {
            W = w * delim.min;
        }
        if (W > w) {
            var rep = this.createChar(scale, delim.rep, font), fuzz = delim.fuzz || 0;
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
    EditableSVG.Element = function (type, def) {
        var obj = (typeof (type) === "string" ? document.createElement("svg:" + type) : type);
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
    return EditableSVG;
})();
/// <reference path="jax.ts" />
/// <reference path="util.ts" />
var Util = (function () {
    function Util() {
    }
    Util.prototype.Em = function (m) {
        if (Math.abs(m) < 0.0006) {
            return "0em";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "em";
    };
    Util.prototype.Ex = function (m) {
        m = Math.round(m / this.TeX.x_height * this.ex) / this.ex;
        if (Math.abs(m) < 0.0006) {
            return "0ex";
        }
        return m.toFixed(3).replace(/\.?0+$/, "") + "ex";
    };
    Util.prototype.Percent = function (m) {
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
    Util.prototype.Element = function (type, def) {
        var obj = (typeof (type) === "string" ? document.createElementNS(Util.SVGNS, type) : type);
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
    Util.length2em = function (length, mu, size) {
        if (mu === void 0) { mu = null; }
        if (size === void 0) { size = null; }
        if (typeof (length) !== "string") {
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
        var m = parseFloat(match[1] || "1") * 1000, unit = match[2];
        if (size == null) {
            size = 1000;
        }
        ;
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
        }
        if (unit === "pc") {
            return m * 1.2;
        }
        if (unit === "in") {
            return m * this.pxPerInch * emFactor;
        }
        if (unit === "cm") {
            return m * this.pxPerInch * emFactor / 2.54;
        }
        if (unit === "mm") {
            return m * this.pxPerInch * emFactor / 25.4;
        }
        if (unit === "mu") {
            return m / 18 * mu;
        }
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
/// <reference path="../util.ts" />
var BBOX = (function () {
    function BBOX(def) {
        if (def === void 0) { def = null; }
        this.type = "g";
        this.removeable = true;
        this.glyphs = {};
        this.defs = null;
        this.n = 0;
        this.h = this.d = -Util.BIGDIMEN;
        this.H = this.D = 0;
        this.w = this.r = 0;
        this.l = Util.BIGDIMEN;
        this.x = this.y = 0;
        this.scale = 1;
        this.n = 0;
        this.EditableSVG = svg;
        if (this.type) {
            this.element = EditableSVG.Element(this.type, def);
        }
    }
    BBOX.prototype.With = function (def, HUB) {
        return HUB.Insert(this, def);
    };
    BBOX.prototype.Add = function (svg, dx, dy, forcew, infront) {
        if (dx) {
            svg.x += dx;
        }
        ;
        if (dy) {
            svg.y += dy;
        }
        ;
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
        if (svg.D - svg.y > this.D) {
            this.D = svg.D - svg.y;
        }
        if (svg.y + svg.H > this.H) {
            this.H = svg.y + svg.H;
        }
        if (svg.x + svg.l < this.l) {
            this.l = svg.x + svg.l;
        }
        if (svg.x + svg.r > this.r) {
            this.r = svg.x + svg.r;
        }
        if (forcew || svg.x + svg.w + (svg.X || 0) > this.w) {
            this.w = svg.x + svg.w + (svg.X || 0);
        }
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
    return BBOX;
})();
/// <reference path="bbox.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BBOX_FRAME = (function (_super) {
    __extends(BBOX_FRAME, _super);
    function BBOX_FRAME(h, d, w, t, dash, color, svg, hub, def) {
        this.type = "rect";
        this.removeable = false;
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
        _super.call(this, svg, hub, def);
        this.w = this.r = w;
        this.h = this.H = h;
        this.d = this.D = d;
        this.l = 0;
    }
    return BBOX_FRAME;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_G = (function (_super) {
    __extends(BBOX_G, _super);
    function BBOX_G() {
        _super.apply(this, arguments);
    }
    return BBOX_G;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_GLYPH = (function (_super) {
    __extends(BBOX_GLYPH, _super);
    function BBOX_GLYPH(scale, id, h, d, w, l, r, p, SVG, HUB) {
        this.type = "path";
        this.removeable = false;
        var def;
        var t = SVG.config.blacker;
        var cache = SVG.config.useFontCache;
        var transform = (scale === 1 ? null : "scale(" + SVG.Fixed(scale) + ")");
        if (cache && !SVG.config.useGlobalCache) {
            id = "E" + this.n + "-" + id;
        }
        if (!cache || !this.glyphs[id]) {
            def = {
                "stroke-width": t
            };
            if (cache) {
                def.id = id;
            }
            else if (transform) {
                def.transform = transform;
            }
            def.d = (p ? "M" + p + "Z" : "");
            _super.call(this, SVG, HUB, def);
            if (cache) {
                this.defs.appendChild(this.element);
                this.glyphs[id] = true;
            }
        }
        if (cache) {
            def = {};
            if (transform) {
                def.transform = transform;
            }
            this.element = SVG.Element("use", def);
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
    return BBOX_GLYPH;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_HLINE = (function (_super) {
    __extends(BBOX_HLINE, _super);
    function BBOX_HLINE(w, t, dash, color, def) {
        this.type = "line";
        this.removeable = false;
        if (def == null) {
            def = {
                "stroke-linecap": "square"
            };
        }
        if (color && color !== "") {
            def.stroke = color;
        }
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
        _super.call(this, def);
        this.w = this.r = w;
        this.l = 0;
        this.h = this.H = t;
        this.d = this.D = 0;
    }
    return BBOX_HLINE;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_NULL = (function (_super) {
    __extends(BBOX_NULL, _super);
    function BBOX_NULL() {
        _super.prototype.apply.call(this, arguments);
        this.Clean();
    }
    return BBOX_NULL;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_RECT = (function (_super) {
    __extends(BBOX_RECT, _super);
    function BBOX_RECT(h, d, w, def) {
        if (def === void 0) { def = null; }
        this.type = "rect";
        this.removeable = false;
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
    return BBOX_RECT;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_ROW = (function (_super) {
    __extends(BBOX_ROW, _super);
    function BBOX_ROW() {
        _super.prototype.apply.call(this, arguments);
        this.svg = [];
        this.sh = this.sd = 0;
    }
    BBOX_ROW.prototype.Check = function (data) {
        var svg = data.toSVG();
        this.svg.push(svg);
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
        for (var i = 0, m = this.svg.length; i < m; i++) {
            var svg = this.svg[i], mml = svg.mml;
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
        delete this.svg;
    };
    return BBOX_ROW;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_TEXT = (function (_super) {
    __extends(BBOX_TEXT, _super);
    function BBOX_TEXT(HTML, scale, text, def) {
        this.type = "text";
        this.removeable = false;
        if (!def)
            def = {};
        def.stroke = "none";
        if (def["font-style"] === "")
            delete def["font-style"];
        if (def["font-weight"] === "")
            delete def["font-weight"];
        _super.call(this, def);
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
    return BBOX_TEXT;
})(BBOX);
/// <reference path="bbox.ts" />
var BBOX_VLINE = (function (_super) {
    __extends(BBOX_VLINE, _super);
    function BBOX_VLINE(h, t, dash, color, def) {
        this.type = "line";
        this.removeable = false;
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
        _super.call(this, def);
        this.w = this.r = t;
        this.l = 0;
        this.h = this.H = h;
        this.d = this.D = 0;
    }
    return BBOX_VLINE;
})(BBOX);
/// <reference path="../bbox/bbox.ts" />
/// <reference path="../bbox/rect.ts" />
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
    MBaseMixin.getMethods = function (AJAX, HUB, HTML, EditableSVG) {
        // TODO: put the args into the dict so they get stuck onto the objects
    };
    MBaseMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var variant = this.SVGgetVariant();
        var svg = new BBOX();
        this.SVGgetScale(svg);
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            if (this.data[i]) {
                var child = svg.Add(this.data[i].toSVG(variant, svg.scale), svg.w, 0, true);
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
        return (this.data[i] ? this.data[i].toSVG() : new BBOX(this.EditableSVG, this.HUB));
    };
    MBaseMixin.prototype.EditableSVGdataStretched = function (i, HW, D) {
        if (D === void 0) { D = null; }
        this.EditableSVGdata = {
            HW: HW,
            D: D
        };
        if (!this.data[i]) {
            return new BBOX(this.EditableSVG, this.HUB);
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
        if (svg.X != null) {
            this.EditableSVGdata.X = svg.X;
        }
        if (svg.tw != null) {
            this.EditableSVGdata.tw = svg.tw;
        }
        if (svg.skew) {
            this.EditableSVGdata.skew = svg.skew;
        }
        if (svg.ic) {
            this.EditableSVGdata.ic = svg.ic;
        }
        if (this["class"]) {
            svg.removeable = false;
            EditableSVG.Element(svg.element, {
                "class": this["class"]
            });
        }
        if (this.id) {
            svg.removeable = false;
            EditableSVG.Element(svg.element, {
                "id": this.id
            });
        }
        if (this.href) {
            var a = EditableSVG.Element("a", {
                "class": "mjx-svg-href"
            });
            a.setAttributeNS(Util.XLINKNS, "href", this.href);
            a.onclick = this.SVGlink;
            this.EditableSVG.addElement(a, "rect", {
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
        if (EditableSVGConfig.config.addMMLclasses) {
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
            var copy = this.attrNames, skip = this.MML.nocopyAttributes, ignore = this.HUB.config.ignoreMMLattributes;
            var defaults = (this.type === "mstyle" ? this.MML.math.prototype.defaults : this.defaults);
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
        if (!styles.border) {
            delete styles.border;
        }
        if (!styles.padding) {
            delete styles.padding;
        }
        if (style.fontSize) {
            styles['fontSize'] = style.fontSize;
        }
        if (style.color) {
            styles['color'] = style.color;
        }
        if (style.backgroundColor) {
            styles['background'] = style.backgroundColor;
        }
        if (style.fontStyle) {
            styles['fontStyle'] = style.fontStyle;
        }
        if (style.fontWeight) {
            styles['fontWeight'] = style.fontWeight;
        }
        if (style.fontFamily) {
            styles['fontFamily'] = style.fontFamily;
        }
        if (styles['fontWeight'] && styles['fontWeight'].match(/^\d+$/)) {
            styles['fontWeight'] = (parseInt(styles['fontWeight']) > 600 ? "bold" : "normal");
        }
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
                if (values.lspace) {
                    svg.x += values.lspace;
                }
                if (values.rspace) {
                    svg.X = values.rspace;
                }
            }
        }
        else {
            var space = this.texSpacing();
            this.SVGgetScale();
            if (space !== "") {
                svg.x += Util.length2em(space, this.scale) * this.mscale;
            }
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
            EditableSVG.Element(svg.element, {
                fill: values.mathcolor,
                stroke: values.mathcolor
            });
            svg.removeable = false;
        }
        var borders = (this.styles || {}).border, padding = (this.styles || {}).padding, bleft = ((borders || {}).left || 0), pleft = ((padding || {}).left || 0), id;
        values.background = (this.mathbackground || this.background ||
            (this.styles || {}).background || this.MML.COLOR.TRANSPARENT);
        if (bleft + pleft) {
            var dup = new BBOX(this.HUB);
            for (id in svg) {
                if (svg.hasOwnProperty(id)) {
                    dup[id] = svg[id];
                }
            }
            dup.x = 0;
            dup.y = 0;
            svg.element = EditableSVG.Element("g");
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
        if (values.background !== this.MML.COLOR.TRANSPARENT) {
            var nodeName = svg.element.nodeName.toLowerCase();
            if (nodeName !== "g" && nodeName !== "svg") {
                var g = this.EditableSVG.Element("g");
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
    MBaseMixin.prototype.SVGhandleVariant = function (variant, scale, text) {
        return EditableSVG.HandleVariant(variant, scale, text);
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
            if (!values.style && this.styles.fontStyle) {
                values.style = this.styles.fontStyle;
            }
            if (!values.weight && this.styles.fontWeight) {
                values.weight = this.styles.fontWeight;
            }
            if (!values.family && this.styles.fontFamily) {
                values.family = this.styles.fontFamily;
            }
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
                normal: this.MML.VARIANT.BOLD,
                italic: this.MML.VARIANT.BOLDITALIC,
                fraktur: this.MML.VARIANT.BOLDFRAKTUR,
                script: this.MML.VARIANT.BOLDSCRIPT,
                "sans-serif": this.MML.VARIANT.BOLDSANSSERIF,
                "sans-serif-italic": this.MML.VARIANT.SANSSERIFBOLDITALIC
            }[variant] || variant;
        }
        else if (values.weight === "normal") {
            variant = {
                bold: this.MML.VARIANT.normal,
                "bold-italic": this.MML.VARIANT.ITALIC,
                "bold-fraktur": this.MML.VARIANT.FRAKTUR,
                "bold-script": this.MML.VARIANT.SCRIPT,
                "bold-sans-serif": this.MML.VARIANT.SANSSERIF,
                "sans-serif-bold-italic": this.MML.VARIANT.SANSSERIFITALIC
            }[variant] || variant;
        }
        if (values.style === "italic") {
            variant = {
                normal: this.MML.VARIANT.ITALIC,
                bold: this.MML.VARIANT.BOLDITALIC,
                "sans-serif": this.MML.VARIANT.SANSSERIFITALIC,
                "bold-sans-serif": this.MML.VARIANT.SANSSERIFBOLDITALIC
            }[variant] || variant;
        }
        else if (values.style === "normal") {
            variant = {
                italic: this.MML.VARIANT.NORMAL,
                "bold-italic": this.MML.VARIANT.BOLD,
                "sans-serif-italic": this.MML.VARIANT.SANSSERIF,
                "sans-serif-bold-italic": this.MML.VARIANT.BOLDSANSSERIF
            }[variant] || variant;
        }
        if (!(variant in EditableSVG.FONTDATA.VARIANT)) {
            variant = "normal";
        }
        return EditableSVG.FONTDATA.VARIANT[variant];
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
        var file = EditableSVG.autoloadDir + "/" + this.type + ".js";
        this.HUB.RestartAfter(this.AJAX.Require(file));
    };
    MBaseMixin.prototype.SVGautoloadFile = function (name) {
        var file = EditableSVG.autoloadDir + "/" + name + ".js";
        this.HUB.RestartAfter(this.AJAX.Require(file));
    };
    return MBaseMixin;
})(ElementJax);
/// <reference path="mbase_mixin.ts" />
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
        var charsThing = this.SVGhandleVariant(variant, scale, text);
        this.EditableSVGelem = charsThing.element;
        return charsThing;
    };
    return CharsMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
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
        return this.SVGhandleVariant(variant, scale, text);
    };
    return EntityMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
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
/// <reference path="mbase_mixin.ts" />
var MathMixin = (function (_super) {
    __extends(MathMixin, _super);
    function MathMixin() {
        _super.apply(this, arguments);
        this.SVG = BBOX.Subclass({
            type: "svg",
            removeable: false
        });
    }
    MathMixin.prototype.toSVG = function (span, div) {
        var CONFIG = EditableSVGConfig.config;
        if (this.data[0]) {
            this.SVGgetStyles();
            this.MML.mbase.prototype.displayAlign = this.HUB.config.displayAlign;
            this.MML.mbase.prototype.displayIndent = this.HUB.config.displayIndent;
            if (String(this.HUB.config.displayIndent).match(/^0($|[a-z%])/i))
                this.MML.mbase.prototype.displayIndent = "0";
            var box = BBOX_G();
            box.Add(this.data[0].toSVG(), 0, 0, true);
            box.Clean();
            this.SVGhandleColor(box);
            this.SVG.Element(box.element, {
                stroke: "currentColor",
                fill: "currentColor",
                "stroke-width": 0,
                transform: "matrix(1 0 0 -1 0 0)"
            });
            box.removeable = false;
            var svg = new this.SVG();
            svg.element.setAttribute("xmlns:xlink", XLINKNS);
            if (CONFIG.useFontCache && !CONFIG.useGlobalCache) {
                svg.element.appendChild(BBOX.defs);
            }
            svg.Add(box);
            svg.Clean();
            this.SVGsaveData(svg);
            if (!span) {
                svg.element = svg.element.firstChild;
                svg.element.removeAttribute("transform");
                svg.removable = true;
                return svg;
            }
            var l = Math.max(-svg.l, 0), r = Math.max(svg.r - svg.w, 0);
            var style = svg.element.style;
            svg.element.setAttribute("width", this.SVG.Ex(l + svg.w + r));
            svg.element.setAttribute("height", this.SVG.Ex(svg.H + svg.D + 2 * this.SVG.em));
            style.verticalAlign = this.SVG.Ex(-svg.D - 2 * this.SVG.em);
            style.marginLeft = this.SVG.Ex(-l);
            style.marginRight = this.SVG.Ex(-r);
            svg.element.setAttribute("viewBox", this.SVG.Fixed(-l, 1) + " " + this.SVG.Fixed(-svg.H - this.SVG.em, 1) + " " +
                this.SVG.Fixed(l + svg.w + r, 1) + " " + this.SVG.Fixed(svg.H + svg.D + 2 * this.SVG.em, 1));
            style.marginTop = style.marginBottom = "1px";
            if (svg.H > svg.h) {
                style.marginTop = this.SVG.Ex(svg.h - svg.H);
            }
            if (svg.D > svg.d) {
                style.marginBottom = this.SVG.Ex(svg.d - svg.D);
                style.verticalAlign = this.SVG.Ex(-svg.d);
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
                if (values.indentalignfirst !== this.MML.INDENTALIGN.INDENTALIGN) {
                    values.indentalign = values.indentalignfirst;
                }
                if (values.indentalign === this.MML.INDENTALIGN.AUTO) {
                    values.indentalign = this.displayAlign;
                }
                if (values.indentshiftfirst !== this.MML.INDENTSHIFT.INDENTSHIFT) {
                    values.indentshift = values.indentshiftfirst;
                }
                if (values.indentshift === "auto") {
                    values.indentshift = "0";
                }
                var shift = Util.length2em(values.indentshift, 1, this.SVG.cwidth);
                if (this.displayIndent !== "0") {
                    var indent = Util.length2em(this.displayIndent, 1, this.SVG.cwidth);
                    shift += (values.indentalign === this.MML.INDENTALIGN.RIGHT ? -indent : indent);
                }
                div.style.textAlign = values.indentalign;
                if (shift) {
                    this.HUB.Insert(style, ({
                        left: {
                            marginLeft: this.SVG.Ex(shift)
                        },
                        right: {
                            marginRight: this.SVG.Ex(-shift)
                        },
                        center: {
                            marginLeft: this.SVG.Ex(shift),
                            marginRight: this.SVG.Ex(-shift)
                        }
                    })[values.indentalign]);
                }
            }
        }
        return span;
    };
    return MathMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
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
/// <reference path="mbase_mixin.ts" />
var MErrorMixin = (function (_super) {
    __extends(MErrorMixin, _super);
    function MErrorMixin() {
        _super.apply(this, arguments);
    }
    MErrorMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new this.SVG(), scale = Util.length2em(this.styles.fontSize || 1) / 1000;
        this.SVGhandleSpace(svg);
        var def = (scale !== 1 ? {
            transform: "scale(" + this.SVG.Fixed(scale) + ")"
        } : {});
        var bbox = new BBOX(this.HUB, def);
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
        var span = HTML.Element("span", {
            style: EditableSVGConfig.config.merrorStyle
        });
        this.styles = this.SVGprocessStyles(span.style);
        if (this.style) {
            span.style.cssText = this.style;
            this.HUB.Insert(this.styles, this.SVGprocessStyles(span.style));
        }
    };
    return MErrorMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
var MFencedMixin = (function (_super) {
    __extends(MFencedMixin, _super);
    function MFencedMixin() {
        _super.apply(this, arguments);
    }
    MFencedMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new BBOX_ROW(this.SVG, this.HUB);
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
/// <reference path="mbase_mixin.ts" />
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
    MFracMixin.name = "mfrac";
    return MFracMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
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
/// <reference path="mbase_mixin.ts" />
var MMultiScriptsMixin = (function () {
    function MMultiScriptsMixin() {
        this.toSVG = MBaseMixin.SVGautoload;
    }
    return MMultiScriptsMixin;
})();
/// <reference path="mbase_mixin.ts" />
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
        var isScript = (parent && parent.isa(this.MML.msubsup) && this !== parent.data[0]);
        var mapchars = (isScript ? this.remapChars : null);
        if (this.data.join("").length === 1 && parent && parent.isa(this.MML.munderover) &&
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
        if (parent && parent.isa(this.MML.munderover) &&
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
        svg = EditableSVG.createDelimiter(this.data.join("").charCodeAt(0), H, svg.scale);
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
            values.mathvariant = this.MML.VARIANT.BOLD;
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
/// <reference path="mbase_mixin.ts" />
var MPaddedMixin = (function (_super) {
    __extends(MPaddedMixin, _super);
    function MPaddedMixin() {
        _super.apply(this, arguments);
    }
    MPaddedMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
/// <reference path="mbase_mixin.ts" />
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
/// <reference path="mbase_mixin.ts" />
var MSqrtMixin = (function (_super) {
    __extends(MSqrtMixin, _super);
    function MSqrtMixin() {
        _super.apply(this, arguments);
    }
    MSqrtMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new this.SVG(), scale = this.SVGgetScale(svg);
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
/// <reference path="mbase_mixin.ts" />
/// <reference path="msqrt_mixin.ts" />
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
    return MRootMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
/// <reference path="../editable_svg_config.ts" />
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
        var svg = new BBOX_ROW(this.svg, this.hub);
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
        return (EditableSVGConfig.config.linebreaks.automatic &&
            svg.w > this.EditableSVG.linebreakWidth) || this.hasNewline();
    };
    MRowMixin.prototype.SVGmultiline = function (span) {
        this.MML.mbase.SVGautoloadFile("multiline");
    };
    MRowMixin.prototype.SVGstretchH = function (w) {
        var svg = new BBOX_ROW(this.EditableSVG, this.hub);
        this.SVGhandleSpace(svg);
        for (var i = 0, m = this.data.length; i < m; i++) {
            svg.Add(this.EditableSVGdataStretched(i, w), svg.w, 0);
        }
        svg.Clean();
        this.SVGhandleColor(svg);
        this.SVGsaveData(svg);
        return svg;
    };
    return MRowMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
var MsMixin = (function (_super) {
    __extends(MsMixin, _super);
    function MsMixin() {
        _super.apply(this, arguments);
        this.toSVG = MBaseMixin.SVGautoload;
    }
    return MsMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
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
        var svg = new this.SVG();
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
/// <reference path="mbase_mixin.ts" />
var MStyleMixin = (function (_super) {
    __extends(MStyleMixin, _super);
    function MStyleMixin() {
        _super.apply(this, arguments);
    }
    MStyleMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
        return (this.data[0] != null ? this.data[0].SVGstretchH(w) : BBOX.NULL());
    };
    MStyleMixin.prototype.SVGstretchV = function (h, d) {
        return (this.data[0] != null ? this.data[0].SVGstretchV(h, d) : BBOX.NULL());
    };
    return MStyleMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
var MSubSupMixin = (function (_super) {
    __extends(MSubSupMixin, _super);
    function MSubSupMixin() {
        _super.apply(this, arguments);
    }
    MSubSupMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new this.SVG(), scale = this.SVGgetScale(svg);
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
                values = this.getValues("displaystyle", "texprimestyle");
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
/// <reference path="mbase_mixin.ts" />
var MTableMixin = (function (_super) {
    __extends(MTableMixin, _super);
    function MTableMixin() {
        _super.apply(this, arguments);
        this.toSVG = MBaseMixin.SVGautoload;
    }
    return MTableMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/text.ts" />
var MTextMixin = (function (_super) {
    __extends(MTextMixin, _super);
    function MTextMixin() {
        _super.apply(this, arguments);
    }
    MTextMixin.prototype.toSVG = function () {
        if (EditableSVGConfig.config.mtextFontInherit || this.Parent().type === "merror") {
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
            svg.Add(new BBOX_TEXT(this.HTML, scale * 100 / EditableSVGConfig.config.scale, this.data.join(""), def));
            svg.Clean();
            this.SVGhandleColor(svg);
            this.SVGsaveData(svg);
            return svg;
        }
        else {
            return this.SUPER(arguments).toSVG.call(this);
        }
    };
    return MTextMixin;
})(MBaseMixin);
/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/g.ts" />
var MUnderOverMixin = (function (_super) {
    __extends(MUnderOverMixin, _super);
    function MUnderOverMixin() {
        _super.apply(this, arguments);
    }
    MUnderOverMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var values = this.getValues("displaystyle", "accent", "accentunder", "align");
        if (!values.displaystyle && this.data[this.base] != null &&
            this.data[this.base].CoreMO().Get("movablelimits")) {
            return this.MML.msubsup.prototype.toSVG.call(this);
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
                    }, this.HUB);
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
/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/null" />
var SemanticsMixin = (function (_super) {
    __extends(SemanticsMixin, _super);
    function SemanticsMixin() {
        _super.apply(this, arguments);
    }
    SemanticsMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
/// <reference path="mbase_mixin.ts" />
var TeXAtomMixin = (function (_super) {
    __extends(TeXAtomMixin, _super);
    function TeXAtomMixin() {
        _super.apply(this, arguments);
    }
    TeXAtomMixin.prototype.toSVG = function (HW, D) {
        this.SVGgetStyles();
        var svg = new this.SVG();
        this.SVGhandleSpace(svg);
        if (this.data[0] != null) {
            var box = this.EditableSVGdataStretched(0, HW, D), y = 0;
            if (this.texClass === this.MML.TEXCLASS.VCENTER) {
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
    return TeXAtomMixin;
})(MBaseMixin);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRzX2J1aWxkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhbGwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgRWRpdGFibGVTVkdDb25maWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHQ29uZmlnKCkge1xuICAgIH1cbiAgICBFZGl0YWJsZVNWR0NvbmZpZy5jb25maWcgPSB7XG4gICAgICAgIHN0eWxlczoge1xuICAgICAgICAgICAgXCIuTWF0aEpheF9TVkdcIjoge1xuICAgICAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC13ZWlnaHRcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgXCJmb250LXNpemVcIjogXCIxMDAlXCIsXG4gICAgICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgICAgICBcInRleHQtYWxpZ25cIjogXCJsZWZ0XCIsXG4gICAgICAgICAgICAgICAgXCJ0ZXh0LXRyYW5zZm9ybVwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgXCJ3b3JkLXNwYWNpbmdcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICBcIndvcmQtd3JhcFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgICAgICBcImZsb2F0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IFwibHRyXCIsXG4gICAgICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwibWluLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIuTWF0aEpheF9TVkdfRGlzcGxheVwiOiB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgICAgICB3aWR0aDogXCIxMDAlXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcIi13ZWJraXQtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcIi1tcy10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwiLW8tdHJhbnNpdGlvblwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiLm1qeC1zdmctaHJlZlwiOiB7XG4gICAgICAgICAgICAgICAgZmlsbDogXCJibHVlXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NpbmdcIjoge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDAsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICAgICAgZGlzcGxheTogXCJub25lIWltcG9ydGFudFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjYwZXhcIixcbiAgICAgICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIjTWF0aEpheF9TVkdfVG9vbHRpcFwiOiB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkdDb25maWc7XG59KSgpO1xuLyogLSotIE1vZGU6IEphdmFzY3JpcHQ7IGluZGVudC10YWJzLW1vZGU6bmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG4vKiB2aW06IHNldCB0cz0yIGV0IHN3PTIgdHc9ODA6ICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICpcbiAqICBNYXRoSmF4L2pheC9vdXRwdXQvRWRpdGFibGVTVkcvamF4LmpzXG4gKlxuICogIEltcGxlbWVudHMgYW4gZWRpdGFibGUgU1ZHIE91dHB1dEpheCB0aGF0IGRpc3BsYXlzIG1hdGhlbWF0aWNzIHVzaW5nXG4gKiAgU1ZHIChvciBWTUwgaW4gSUUpIHRvIHBvc2l0aW9uIHRoZSBjaGFyYWN0ZXJzIGZyb20gbWF0aCBmb250c1xuICogIGluIHRoZWlyIHByb3BlciBsb2NhdGlvbnMuXG4gKlxuICogIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxNSBUaGUgTWF0aEpheCBDb25zb3J0aXVtXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgRWRpdGFibGVTVkcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHKCkge1xuICAgICAgICB0aGlzLkFKQVggPSBNYXRoSmF4LkFKQVg7XG4gICAgICAgIHRoaXMuSFVCID0gTWF0aEpheC5IdWI7XG4gICAgICAgIHRoaXMuSFRNTCA9IE1hdGhKYXguSFRNTDtcbiAgICAgICAgdGhpcy5TVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdGhpcy5jb25maWcgPSBFZGl0YWJsZVNWR0NvbmZpZy5jb25maWc7XG4gICAgICAgIHRoaXMuaGlkZVByb2Nlc3NlZE1hdGggPSB0cnVlO1xuICAgICAgICB0aGlzLmZvbnROYW1lcyA9IFtcIlRlWFwiLCBcIlNUSVhcIiwgXCJTVElYLVdlYlwiLCBcIkFzYW5hLU1hdGhcIixcbiAgICAgICAgICAgIFwiR3lyZS1UZXJtZXNcIiwgXCJHeXJlLVBhZ2VsbGFcIiwgXCJMYXRpbi1Nb2Rlcm5cIiwgXCJOZW8tRXVsZXJcIl07XG4gICAgICAgIHRoaXMuVGV4dE5vZGUgPSB0aGlzLkhUTUwuVGV4dE5vZGU7XG4gICAgICAgIHRoaXMuYWRkVGV4dCA9IHRoaXMuSFRNTC5hZGRUZXh0O1xuICAgICAgICB0aGlzLnVjTWF0Y2ggPSB0aGlzLkhUTUwudWNNYXRjaDtcbiAgICAgICAgdGhpcy5IVUIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJtbWwgSmF4IFJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1NTCA9IE1hdGhKYXguRWxlbWVudEpheC5tbWw7XG4gICAgICAgICAgICB0aGlzLk1NTC5tYmFzZS5BdWdtZW50KE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLmNoYXJzLkF1Z21lbnQoQ2hhcnNNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwuZW50aXR5LkF1Z21lbnQoRW50aXR5TWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1vLkF1Z21lbnQoTW9NaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXRleHQuQXVnbWVudChNVGV4dE1peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tZXJyb3IuQXVnbWVudChNRXJyb3JNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXMuQXVnbWVudChNc01peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tZ2x5cGguQXVnbWVudChNR2x5cGhNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXNwYWNlLkF1Z21lbnQoTVNwYWNlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1waGFudG9tLkF1Z21lbnQoTVBoYW50b21NaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXBhZGRlZC5BdWdtZW50KE1QYWRkZWRNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXJvdy5BdWdtZW50KE1Sb3dNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXN0eWxlLkF1Z21lbnQoTVN0eWxlTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1mcmFjLkF1Z21lbnQoTUZyYWNNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXNxcnQuQXVnbWVudChNU3FydE1peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tcm9vdC5BdWdtZW50KE1Sb290TWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1mZW5jZWQuQXVnbWVudChNRmVuY2VkTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1lbmNsb3NlLkF1Z21lbnQoTUVuY2xvc2VNaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwubWFjdGlvbi5BdWdtZW50KE1BY3Rpb25NaXhpbi5nZXRNZXRob2RzKHRoaXMuQUpBWCwgdGhpcy5IVUIsIHRoaXMuSFRNTCwgdGhpcykpO1xuICAgICAgICAgICAgdGhpcy5NTUwuc2VtYW50aWNzLkF1Z21lbnQoU2VtYW50aWNzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm11bmRlcm92ZXIuQXVnbWVudChNVW5kZXJPdmVyTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1zdWJzdXAuQXVnbWVudChNU3ViU3VwTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1tdWx0aXNjcmlwdHMuQXVnbWVudChNTXVsdGlTY3JpcHRzTWl4aW4uZ2V0TWV0aG9kcyh0aGlzLkFKQVgsIHRoaXMuSFVCLCB0aGlzLkhUTUwsIHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm10YWJsZS5BdWdtZW50KE1UYWJsZU1peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tYXRoLkF1Z21lbnQoTWF0aE1peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5UZVhBdG9tLkF1Z21lbnQoVGVYQXRvbU1peGluLmdldE1ldGhvZHModGhpcy5BSkFYLCB0aGlzLkhVQiwgdGhpcy5IVE1MLCB0aGlzKSk7XG4gICAgICAgICAgICBNTUxbXCJhbm5vdGF0aW9uLXhtbFwiXS5BdWdtZW50KHtcbiAgICAgICAgICAgICAgICB0b1NWRzogdGhpcy5NTUwubWJhc2UuU1ZHYXV0b2xvYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5IVUIuUmVnaXN0ZXIuU3RhcnR1cEhvb2soXCJvbkxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoTWF0aEpheC5DYWxsYmFjayhbXCJsb2FkQ29tcGxldGVcIiwgU1ZHLCBcImpheC5qc1wiXSksIDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLkhVQi5Ccm93c2VyLlNlbGVjdCh7XG4gICAgICAgICAgICBPcGVyYTogZnVuY3Rpb24gKGJyb3dzZXIpIHtcbiAgICAgICAgICAgICAgICBTVkcuQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIG9wZXJhWm9vbVJlZnJlc2g6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuSFVCLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwiRW5kIENvb2tpZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoSFVCLmNvbmZpZy5tZW51U2V0dGluZ3Muem9vbSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkFKQVguUmVxdWlyZShcIltNYXRoSmF4XS9leHRlbnNpb25zL01hdGhab29tLmpzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICAgICAgICAgIGlmICghZG9jdW1lbnQubmFtZXNwYWNlcy5zdmcpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5uYW1lc3BhY2VzLmFkZChcInN2Z1wiLCBTVkdOUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVVBFUihhcmd1bWVudHMpLkNvbmZpZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB0aGlzLkhVQi5jb25maWcubWVudVNldHRpbmdzLCBjb25maWcgPSB0aGlzLmNvbmZpZywgZm9udCA9IHNldHRpbmdzLmZvbnQ7XG4gICAgICAgIGlmIChzZXR0aW5ncy5zY2FsZSkge1xuICAgICAgICAgICAgY29uZmlnLnNjYWxlID0gc2V0dGluZ3Muc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCAhPT0gXCJBdXRvXCIpIHtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhMb2NhbHxXZWJ8SW1hZ2UpJC9pLCBcIlwiKTtcbiAgICAgICAgICAgIGZvbnQgPSBmb250LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pLywgXCIkMS0kMlwiKTtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gZm9udDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udEluVXNlID0gY29uZmlnLmZvbnQgfHwgXCJUZVhcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mb250TmFtZXMuaW5kZXhPZih0aGlzLmZvbnRJblVzZSkgPCAwKSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250RGlyICs9IFwiL1wiICsgdGhpcy5mb250SW5Vc2U7XG4gICAgICAgIGlmICghdGhpcy5yZXF1aXJlKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVpcmUucHVzaCh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS5qc1wiKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2goTWF0aEpheC5PdXRwdXRKYXguZXh0ZW5zaW9uRGlyICsgXCIvTWF0aEV2ZW50cy5qc1wiKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5nZXROb2Rlc0FzRmxhdExpc3QgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciByZXN0ID0gamF4LmRhdGEgPyBfLmZsYXR0ZW4oXy5tYXAoamF4LmRhdGEsIHRoaXMuZ2V0Tm9kZXNBc0ZsYXRMaXN0KSkgOiBbXTtcbiAgICAgICAgcmV0dXJuIFtqYXhdLmNvbmNhdChyZXN0KTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3JkcyA9IGZ1bmN0aW9uIChlbGVtLCB4LCB5KSB7XG4gICAgICAgIHZhciBzdmcgPSAkKGVsZW0pLmNsb3Nlc3QoJ3N2ZycpLmdldCgpWzBdO1xuICAgICAgICB2YXIgcHQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICAgICAgcHQueCA9IHg7XG4gICAgICAgIHB0LnkgPSB5O1xuICAgICAgICByZXR1cm4gcHQubWF0cml4VHJhbnNmb3JtKGVsZW0uZ2V0Q1RNKCkpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLm5vZGVDb250YWluc1BvaW50ID0gZnVuY3Rpb24gKHN2Zywgbm9kZSwgcG9pbnQpIHtcbiAgICAgICAgaWYgKCFub2RlLmdldEJCKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm9kZSBkb2Vzbid0IGhhdmUgZ2V0QkJcIik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJiID0gbm9kZS5nZXRCQigpO1xuICAgICAgICBpZiAoIWJiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRGlkbid0IGdldCBhIGJiXCIsIG5vZGUuRWRpdGFibGVTVkdlbGVtKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29udmVydGVkID0gdGhpcy5lbGVtQ29vcmRzVG9WaWV3cG9ydENvb3Jkcyhub2RlLkVkaXRhYmxlU1ZHZWxlbSwgYmIueCwgYmIueSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjb25zaWRlcmluZyBiYjogJywgbm9kZS5FZGl0YWJsZVNWR2VsZW0sIGNvbnZlcnRlZC54LCBjb252ZXJ0ZWQueSwgYmIud2lkdGgsIGJiLmhlaWdodCk7XG4gICAgICAgIGlmIChwb2ludC54IDwgYmIueCB8fCBwb2ludC54ID4gYmIueCArIGJiLndpZHRoKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAocG9pbnQueSA+IGJiLnkgfHwgcG9pbnQueSA8IGJiLnkgLSBiYi5oZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNQVRDSEVEJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlN0YXJ0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEVWRU5UID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5FdmVudDtcbiAgICAgICAgVE9VQ0ggPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLlRvdWNoO1xuICAgICAgICBIT1ZFUiA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuSG92ZXI7XG4gICAgICAgIHRoaXMuQ29udGV4dE1lbnUgPSB0aGlzLkVWRU5ULkNvbnRleHRNZW51O1xuICAgICAgICB0aGlzLk1vdXNlb3ZlciA9IEhPVkVSLk1vdXNlb3ZlcjtcbiAgICAgICAgdGhpcy5Nb3VzZW91dCA9IEhPVkVSLk1vdXNlb3V0O1xuICAgICAgICB0aGlzLk1vdXNlbW92ZSA9IEhPVkVSLk1vdXNlbW92ZTtcbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSB0aGlzLkhUTUwuRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBcIjFweFwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgICAgICAgICB0ZXh0SW5kZW50OiAwLFxuICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm06IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgbGV0dGVyU3BhY2luZzogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICB3b3JkU3BhY2luZzogXCJub3JtYWxcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5EaXYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUodGhpcy5oaWRkZW5EaXYsIGRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oaWRkZW5EaXYgPSB0aGlzLkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgaWQ6IFwiTWF0aEpheF9TVkdfSGlkZGVuXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaXYgPSB0aGlzLkhUTUwuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdiwgXCJkaXZcIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogXCI1aW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgVXRpbC5weFBlckluY2ggPSBkaXYub2Zmc2V0V2lkdGggLyA1O1xuICAgICAgICB0aGlzLmhpZGRlbkRpdi5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICB0aGlzLnRleHRTVkcgPSB0aGlzLkVsZW1lbnQoXCJzdmdcIik7XG4gICAgICAgIEJCT1hfR0xZUEguZGVmcyA9IHRoaXMuYWRkRWxlbWVudCh0aGlzLmFkZEVsZW1lbnQodGhpcy5oaWRkZW5EaXYucGFyZW50Tm9kZSwgXCJzdmdcIiksIFwiZGVmc1wiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19nbHlwaHNcIlxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5FeFNwYW4gPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIFwiZm9udC1zaXplLWFkanVzdFwiOiBcIm5vbmVcIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBbXG4gICAgICAgICAgICBbXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0V4Qm94XCJcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtTcGFuID0gdGhpcy5IVE1MLkVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFtcbiAgICAgICAgICAgIFtcImhyXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICBdKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuQUpBWC5TdHlsZXModGhpcy5jb25maWcuc3R5bGVzLCBbXCJJbml0aWFsaXplU1ZHXCIsIHRoaXNdKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Jbml0aWFsaXplU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICB0aGlzLmRlZmF1bHRFeCA9IHRoaXMuRXhTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0IC8gNjA7XG4gICAgICAgIHRoaXMuZGVmYXVsdFdpZHRoID0gdGhpcy5saW5lYnJlYWtTcGFuLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGg7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5saW5lYnJlYWtTcGFuKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLkV4U3Bhbik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucHJlVHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdLCBpLCBtID0gc2NyaXB0cy5sZW5ndGgsIHNjcmlwdCwgcHJldiwgc3BhbiwgZGl2LCB0ZXN0LCBqYXgsIGV4LCBlbSwgbWF4d2lkdGgsIHJlbHdpZHRoID0gZmFsc2UsIGN3aWR0aCwgbGluZWJyZWFrID0gdGhpcy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWMsIHdpZHRoID0gdGhpcy5jb25maWcubGluZWJyZWFrcy53aWR0aDtcbiAgICAgICAgaWYgKGxpbmVicmVhaykge1xuICAgICAgICAgICAgcmVsd2lkdGggPSAod2lkdGgubWF0Y2goL15cXHMqKFxcZCsoXFwuXFxkKik/JVxccyopP2NvbnRhaW5lclxccyokLykgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAocmVsd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoL1xccypjb250YWluZXJcXHMqLywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdpZHRoID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgd2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1heHdpZHRoID0gMTAwMDAwO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcHJldiA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBpZiAocHJldiAmJiBTdHJpbmcocHJldi5jbGFzc05hbWUpLm1hdGNoKC9eTWF0aEpheChfU1ZHKT8oX0Rpc3BsYXkpPyggTWF0aEpheChfU1ZHKT9fUHJvY2Vzc2luZyk/JC8pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgamF4LlNWRyA9IHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiAoamF4LnJvb3QuR2V0KFwiZGlzcGxheVwiKSA9PT0gXCJibG9ja1wiKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNwYW4gPSBkaXYgPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IHRoaXMuY29uZmlnLnNjYWxlICsgXCIlXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwiaW5saW5lLWJsb2NrXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogXCJNYXRoSmF4X1NWR1wiLFxuICAgICAgICAgICAgICAgIGlkOiBqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIsXG4gICAgICAgICAgICAgICAgaXNNYXRoSmF4OiB0cnVlLFxuICAgICAgICAgICAgICAgIGpheElEOiB0aGlzLmlkLFxuICAgICAgICAgICAgICAgIG9uY29udGV4dG1lbnU6IHRoaXMuRVZFTlQuTWVudSxcbiAgICAgICAgICAgICAgICBvbm1vdXNlZG93bjogdGhpcy5FVkVOVC5Nb3VzZWRvd24sXG4gICAgICAgICAgICAgICAgb25tb3VzZW92ZXI6IHRoaXMuRVZFTlQuTW91c2VvdmVyLFxuICAgICAgICAgICAgICAgIG9ubW91c2VvdXQ6IHRoaXMuRVZFTlQuTW91c2VvdXQsXG4gICAgICAgICAgICAgICAgb25tb3VzZW1vdmU6IHRoaXMuRVZFTlQuTW91c2Vtb3ZlLFxuICAgICAgICAgICAgICAgIG9uY2xpY2s6IHRoaXMuRVZFTlQuQ2xpY2ssXG4gICAgICAgICAgICAgICAgb25kYmxjbGljazogdGhpcy5FVkVOVC5EYmxDbGlja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoSFVCLkJyb3dzZXIubm9Db250ZXh0TWVudSkge1xuICAgICAgICAgICAgICAgIHNwYW4ub250b3VjaHN0YXJ0ID0gVE9VQ0guc3RhcnQ7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoZW5kID0gVE9VQ0guZW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGpheC5TVkcuZGlzcGxheSkge1xuICAgICAgICAgICAgICAgIGRpdiA9IHRoaXMuSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHX0Rpc3BsYXlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLkV4U3Bhbi5jbG9uZU5vZGUodHJ1ZSksIHNjcmlwdCk7XG4gICAgICAgICAgICBkaXYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5saW5lYnJlYWtTcGFuLmNsb25lTm9kZSh0cnVlKSwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHRlc3QgPSBzY3JpcHQucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgZGl2ID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBleCA9IHRlc3QuZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgICAgIGN3aWR0aCA9IGRpdi5wcmV2aW91c1NpYmxpbmcuZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4ID09PSAwIHx8IGV4ID09PSBcIk5hTlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRkZW5EaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgICAgICAgICAgICBqYXguU1ZHLmlzSGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBleCA9IHRoaXMuZGVmYXVsdEV4O1xuICAgICAgICAgICAgICAgIGN3aWR0aCA9IHRoaXMuZGVmYXVsdFdpZHRoO1xuICAgICAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgICAgICBtYXh3aWR0aCA9IGN3aWR0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXguU1ZHLmV4ID0gZXg7XG4gICAgICAgICAgICBqYXguU1ZHLmVtID0gZW0gPSBleCAvIFV0aWwuVGVYLnhfaGVpZ2h0ICogMTAwMDtcbiAgICAgICAgICAgIGpheC5TVkcuY3dpZHRoID0gY3dpZHRoIC8gZW0gKiAxMDAwO1xuICAgICAgICAgICAgamF4LlNWRy5saW5lV2lkdGggPSAobGluZWJyZWFrID8gdGhpcy5sZW5ndGgyZW0od2lkdGgsIDEsIG1heHdpZHRoIC8gZW0gKiAxMDAwKSA6IFV0aWwuQklHRElNRU4pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdHNbaV0ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgc3BhbiA9IHRlc3QucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgamF4ID0gc2NyaXB0c1tpXS5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICghamF4LlNWRy5pc0hpZGRlbikge1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwYW4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzcGFuKTtcbiAgICAgICAgICAgIHRlc3QucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5TVkdlcW4gPSBzdGF0ZS5TVkdsYXN0ID0gMDtcbiAgICAgICAgc3RhdGUuU1ZHaSA9IC0xO1xuICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IHRoaXMuY29uZmlnLkVxbkNodW5rO1xuICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLlRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzY3JpcHQsIHN0YXRlKSB7XG4gICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChzdGF0ZS5TVkdkZWxheSkge1xuICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuSFVCLlJlc3RhcnRBZnRlcihNYXRoSmF4LkNhbGxiYWNrLkRlbGF5KHRoaXMuY29uZmlnLkVxbkNodW5rRGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgamF4ID0gc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheCwgbWF0aCA9IGpheC5yb290LCBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKSwgZGl2ID0gKGpheC5TVkcuZGlzcGxheSA/IChzcGFuIHx8IHt9KS5wYXJlbnROb2RlIDogc3BhbiksIGxvY2FsQ2FjaGUgPSAoU1ZHLmNvbmZpZy51c2VGb250Q2FjaGUgJiYgIVNWRy5jb25maWcudXNlR2xvYmFsQ2FjaGUpO1xuICAgICAgICBpZiAoIWRpdilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5lbSA9IHRoaXMuTU1MLm1iYXNlLnByb3RvdHlwZS5lbSA9IGpheC5TVkcuZW07XG4gICAgICAgIHRoaXMuZXggPSBqYXguU1ZHLmV4O1xuICAgICAgICB0aGlzLmxpbmVicmVha1dpZHRoID0gamF4LlNWRy5saW5lV2lkdGg7XG4gICAgICAgIHRoaXMuY3dpZHRoID0gamF4LlNWRy5jd2lkdGg7XG4gICAgICAgIHRoaXMubWF0aERpdiA9IGRpdjtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aGlzLnRleHRTVkcpO1xuICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgU1ZHLnJlc2V0R2x5cGhzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbml0U1ZHKG1hdGgsIHNwYW4pO1xuICAgICAgICBtYXRoLnNldFRlWGNsYXNzKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXRoLnRvU1ZHKHNwYW4sIGRpdik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5yZXN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHNwYW4uZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHNwYW4uZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvY2FsQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICBCQk9YLkdMWVBILm4tLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIGlmIChqYXguU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZGl2LCBzY3JpcHQpO1xuICAgICAgICB9XG4gICAgICAgIGRpdi5jbGFzc05hbWUgPSBkaXYuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgIGlmICh0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKSB7XG4gICAgICAgICAgICBkaXYuY2xhc3NOYW1lICs9IFwiIE1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiO1xuICAgICAgICAgICAgaWYgKHNjcmlwdC5NYXRoSmF4LnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICBqYXguU1ZHLnByZXZpZXcgPSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY3JpcHQuTWF0aEpheC5wcmV2aWV3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuU1ZHZXFuICs9IChzdGF0ZS5pIC0gc3RhdGUuU1ZHaSk7XG4gICAgICAgICAgICBzdGF0ZS5TVkdpID0gc3RhdGUuaTtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5TVkdlcW4gPj0gc3RhdGUuU1ZHbGFzdCArIHN0YXRlLlNWR2NodW5rKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0VHJhbnNsYXRlKHN0YXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdjaHVuayA9IE1hdGguZmxvb3Ioc3RhdGUuU1ZHY2h1bmsgKiB0aGlzLmNvbmZpZy5FcW5DaHVua0ZhY3Rvcik7XG4gICAgICAgICAgICAgICAgc3RhdGUuU1ZHZGVsYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucG9zdFRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzdGF0ZSwgcGFydGlhbCkge1xuICAgICAgICB2YXIgc2NyaXB0cyA9IHN0YXRlLmpheFt0aGlzLmlkXTtcbiAgICAgICAgaWYgKCF0aGlzLmhpZGVQcm9jZXNzZWRNYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKHZhciBpID0gc3RhdGUuU1ZHbGFzdCwgbSA9IHN0YXRlLlNWR2VxbjsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXgpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHJldmlvdXNTaWJsaW5nLmNsYXNzTmFtZSA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lLnNwbGl0KC8gLylbMF07XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LlNWRztcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJldmlldy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQuTWF0aEpheC5wcmV2aWV3ID0gZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5TVkdsYXN0ID0gc3RhdGUuU1ZHZXFuO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLnJlc2V0R2x5cGhzID0gZnVuY3Rpb24gKHJlc2V0KSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VGb250Q2FjaGUpIHtcbiAgICAgICAgICAgIHZhciBHTFlQSCA9IEJCT1hfR0xZUEg7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICBHTFlQSC5kZWZzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNYXRoSmF4X1NWR19nbHlwaHNcIik7XG4gICAgICAgICAgICAgICAgR0xZUEguZGVmcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgR0xZUEguZGVmcyA9IHRoaXMuRWxlbWVudChcImRlZnNcIik7XG4gICAgICAgICAgICAgICAgR0xZUEgubisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgR0xZUEguZ2x5cGhzID0ge307XG4gICAgICAgICAgICBpZiAocmVzZXQpIHtcbiAgICAgICAgICAgICAgICBHTFlQSC5uID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEpheEZyb21NYXRoID0gZnVuY3Rpb24gKG1hdGgpIHtcbiAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICBtYXRoID0gbWF0aC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIG1hdGggPSBtYXRoLm5leHRTaWJsaW5nO1xuICAgICAgICB9IHdoaWxlIChtYXRoICYmIG1hdGgubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJzY3JpcHRcIik7XG4gICAgICAgIHJldHVybiB0aGlzLkhVQi5nZXRKYXhGb3IobWF0aCk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJTcGFuID0gZnVuY3Rpb24gKGpheCwgbWF0aCkge1xuICAgICAgICBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICByZXR1cm4gbWF0aC5maXJzdENoaWxkO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyQkJveCA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLkVWRU5ULmdldEJCb3goc3Bhbi5wYXJlbnROb2RlKTtcbiAgICAgICAgYmJveC5oICs9IDI7XG4gICAgICAgIGJib3guZCAtPSAyO1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5ab29tID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCwgTXcsIE1oKSB7XG4gICAgICAgIHNwYW4uY2xhc3NOYW1lID0gXCJNYXRoSmF4X1NWR1wiO1xuICAgICAgICB2YXIgZW1leCA9IHNwYW4uYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgdmFyIGV4ID0gZW1leC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICB0aGlzLmVtID0gdGhpcy5NTUwubWJhc2UucHJvdG90eXBlLmVtID0gZXggLyBVdGlsLlRlWC54X2hlaWdodCAqIDEwMDA7XG4gICAgICAgIHRoaXMuZXggPSBleDtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtXaWR0aCA9IGpheC5TVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5TVkcuY3dpZHRoO1xuICAgICAgICBlbWV4LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZW1leCk7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5tYXRoRElWID0gc3BhbjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSBwYXJzZUludChIVUIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSAxO1xuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHZhciBzdmcgPSBzcGFuLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3ZnXCIpWzBdLnN0eWxlO1xuICAgICAgICBzdmcubWFyZ2luVG9wID0gc3ZnLm1hcmdpblJpZ2h0ID0gc3ZnLm1hcmdpbkxlZnQgPSAwO1xuICAgICAgICBpZiAoc3ZnLm1hcmdpbkJvdHRvbS5jaGFyQXQoMCkgPT09IFwiLVwiKVxuICAgICAgICAgICAgc3Bhbi5zdHlsZS5tYXJnaW5Cb3R0b20gPSBzdmcubWFyZ2luQm90dG9tLnN1YnN0cigxKTtcbiAgICAgICAgaWYgKHRoaXMub3BlcmFab29tUmVmcmVzaCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5maXJzdENoaWxkLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Bhbi5vZmZzZXRXaWR0aCA8IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5taW5XaWR0aCA9IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIG1hdGguc3R5bGUubWluV2lkdGggPSBtYXRoLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIHZhciB6VyA9IHNwYW4ub2Zmc2V0V2lkdGgsIHpIID0gc3Bhbi5vZmZzZXRIZWlnaHQsIG1IID0gbWF0aC5vZmZzZXRIZWlnaHQsIG1XID0gbWF0aC5vZmZzZXRXaWR0aDtcbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcIlwiO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgWTogLUVWRU5ULmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBqYXguU1ZHO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmFkZEVsZW1lbnQgPSBmdW5jdGlvbiAocGFyZW50LCB0eXBlLCBkZWYpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudC5hcHBlbmRDaGlsZCh0aGlzLkVsZW1lbnQodHlwZSwgZGVmKSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5IYW5kbGVWYXJpYW50ID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCB0ZXh0KSB7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIHZhciBuLCBOLCBjLCBmb250LCBWQVJJQU5ULCBpLCBtLCBpZCwgTSwgUkFOR0VTO1xuICAgICAgICBpZiAoIXZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB0aGlzLkZPTlREQVRBLlZBUklBTlRbTU1MLlZBUklBTlQuTk9STUFMXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFyaWFudC5mb3JjZUZhbWlseSkge1xuICAgICAgICAgICAgdGV4dCA9IG5ldyBCQk9YX1RFWFQodGhpcy5IVE1MLCBzY2FsZSwgdGV4dCwgdmFyaWFudC5mb250KTtcbiAgICAgICAgICAgIGlmICh2YXJpYW50LmggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5kID0gdmFyaWFudC5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0KTtcbiAgICAgICAgICAgIHRleHQgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIFZBUklBTlQgPSB2YXJpYW50O1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGV4dC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBWQVJJQU5UO1xuICAgICAgICAgICAgbiA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIGMgPSB0ZXh0LmNoYXJBdChpKTtcbiAgICAgICAgICAgIGlmIChuID49IDB4RDgwMCAmJiBuIDwgMHhEQkZGKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIG4gPSAoKChuIC0gMHhEODAwKSA8PCAxMCkgKyAodGV4dC5jaGFyQ29kZUF0KGkpIC0gMHhEQzAwKSkgKyAweDEwMDAwO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLkZPTlREQVRBLlJlbWFwUGxhbmUxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudiA9IHRoaXMuRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSB0aGlzLkZPTlREQVRBLlJBTkdFUztcbiAgICAgICAgICAgICAgICBmb3IgKGlkID0gMCwgTSA9IFJBTkdFUy5sZW5ndGg7IGlkIDwgTTsgaWQrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5uYW1lID09PSBcImFscGhhXCIgJiYgdmFyaWFudC5ub0xvd2VyQ2FzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBOID0gdmFyaWFudFtcIm9mZnNldFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoTiAmJiBuID49IFJBTkdFU1tpZF0ubG93ICYmIG4gPD0gUkFOR0VTW2lkXS5oaWdoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5yZW1hcCAmJiBSQU5HRVNbaWRdLnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IE4gKyBSQU5HRVNbaWRdLnJlbWFwW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IG4gLSBSQU5HRVNbaWRdLmxvdyArIE47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0uYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gKz0gUkFOR0VTW2lkXS5hZGQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gdGhpcy5GT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcCAmJiB2YXJpYW50LnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgbiA9IHZhcmlhbnQucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAudmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gdGhpcy5GT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5GT05UREFUQS5SRU1BUFtuXSAmJiAhdmFyaWFudC5ub1JlbWFwKSB7XG4gICAgICAgICAgICAgICAgbiA9IHRoaXMuRk9OVERBVEEuUkVNQVBbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSB0aGlzLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKEJCT1hfR0xZUEguYXBwbHkoQkJPWCwgYyksIHN2Zy53LCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLkZPTlREQVRBLkRFTElNSVRFUlNbbl0pIHtcbiAgICAgICAgICAgICAgICBjID0gdGhpcy5jcmVhdGVEZWxpbWl0ZXIobiwgMCwgMSwgZm9udCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgKHRoaXMuRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKHRoaXMuSFRNTCwgc2NhbGUgKiAxMDAgLyBTVkcuY29uZmlnLnNjYWxlLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFyaWFudC5kZWZhdWx0RmFtaWx5IHx8IFNWRy5jb25maWcudW5kZWZpbmVkRmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogKHZhcmlhbnQuaXRhbGljID8gXCJpdGFsaWNcIiA6IFwiXCIpLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6ICh2YXJpYW50LmJvbGQgPyBcImJvbGRcIiA6IFwiXCIpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuaCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBib3guaCA9IHZhcmlhbnQuaDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBib3guZCA9IHZhcmlhbnQuZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgICAgICAgICBjLkFkZChib3gpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYywgc3ZnLncsIDApO1xuICAgICAgICAgICAgICAgIHRoaXMuSFVCLnNpZ25hbC5Qb3N0KFtcIlNWRyBKYXggLSB1bmtub3duIGNoYXJcIiwgbiwgdmFyaWFudF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGV4dC5sZW5ndGggPT0gMSAmJiBmb250LnNrZXcgJiYgZm9udC5za2V3W25dKSB7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGZvbnQuc2tld1tuXSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmxvb2t1cENoYXIgPSBmdW5jdGlvbiAodmFyaWFudCwgbikge1xuICAgICAgICB2YXIgaSwgbTtcbiAgICAgICAgaWYgKCF2YXJpYW50LkZPTlRTKSB7XG4gICAgICAgICAgICB2YXIgRk9OVFMgPSB0aGlzLkZPTlREQVRBLkZPTlRTO1xuICAgICAgICAgICAgdmFyIGZvbnRzID0gKHZhcmlhbnQuZm9udHMgfHwgdGhpcy5GT05UREFUQS5WQVJJQU5ULm5vcm1hbC5mb250cyk7XG4gICAgICAgICAgICBpZiAoIShmb250cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgICAgIGZvbnRzID0gW2ZvbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50LmZvbnRzICE9IGZvbnRzKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250cyA9IGZvbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudC5GT05UUyA9IFtdO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbSA9IGZvbnRzLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChGT05UU1tmb250c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudC5GT05UUy5wdXNoKEZPTlRTW2ZvbnRzW2ldXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB2YXJpYW50LkZPTlRTLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIGZvbnQgPSB2YXJpYW50LkZPTlRTW2ldO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAoZm9udCkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdmFyaWFudC5GT05UUztcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZvbnRbbl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9udDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZEJsb2NrKGZvbnQsIG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogXCJ1bmtub3duXCJcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmZpbmRCbG9jayA9IGZ1bmN0aW9uIChmb250LCBjKSB7XG4gICAgICAgIGlmIChmb250LlJhbmdlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBmb250LlJhbmdlcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IGZvbnQuUmFuZ2VzW2ldWzBdKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gZm9udC5SYW5nZXNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBmb250LlJhbmdlc1tpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGZvbnQuUmFuZ2VzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9udC5SYW5nZXNbal1bMl0gPT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQuUmFuZ2VzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQuZGlyZWN0b3J5ICsgXCIvXCIgKyBmaWxlICsgXCIuanNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5sb2FkRm9udCA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgIHRoaXMuSFVCLlJlc3RhcnRBZnRlcihBSkFYLlJlcXVpcmUodGhpcy5mb250RGlyICsgXCIvXCIgKyBmaWxlKSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIgPSBmdW5jdGlvbiAoY29kZSwgSFcsIHNjYWxlLCBmb250KSB7XG4gICAgICAgIGlmIChzY2FsZSA9PT0gdm9pZCAwKSB7IHNjYWxlID0gbnVsbDsgfVxuICAgICAgICBpZiAoZm9udCA9PT0gdm9pZCAwKSB7IGZvbnQgPSBudWxsOyB9XG4gICAgICAgIGlmICghc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gMTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgIGlmICghY29kZSkge1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gVXRpbC5UZVgubnVsbGRlbGltaXRlcnNwYWNlICogc2NhbGU7XG4gICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKEhXIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICBIVyA9IFtIVywgSFddO1xuICAgICAgICB9XG4gICAgICAgIHZhciBodyA9IEhXWzFdO1xuICAgICAgICBIVyA9IEhXWzBdO1xuICAgICAgICB2YXIgZGVsaW0gPSB7XG4gICAgICAgICAgICBhbGlhczogY29kZVxuICAgICAgICB9O1xuICAgICAgICB3aGlsZSAoZGVsaW0uYWxpYXMpIHtcbiAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5hbGlhcztcbiAgICAgICAgICAgIGRlbGltID0gdGhpcy5GT05UREFUQS5ERUxJTUlURVJTW2NvZGVdO1xuICAgICAgICAgICAgaWYgKCFkZWxpbSkge1xuICAgICAgICAgICAgICAgIGRlbGltID0ge1xuICAgICAgICAgICAgICAgICAgICBIVzogWzAsIHRoaXMuRk9OVERBVEEuVkFSSUFOVFtNTUwuVkFSSUFOVC5OT1JNQUxdXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLmxvYWQpIHtcbiAgICAgICAgICAgIHRoaXMuSFVCLlJlc3RhcnRBZnRlcihBSkFYLlJlcXVpcmUodGhpcy5mb250RGlyICsgXCIvZm9udGRhdGEtXCIgKyBkZWxpbS5sb2FkICsgXCIuanNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGVsaW0uSFcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bMF0gKiBzY2FsZSA+PSBIVyAtIDEwIC0gU1ZHLmNvbmZpZy5ibGFja2VyIHx8IChpID09IG0gLSAxICYmICFkZWxpbS5zdHJldGNoKSkge1xuICAgICAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVsyXSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSAqPSBkZWxpbS5IV1tpXVsyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzNdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGUgPSBkZWxpbS5IV1tpXVszXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2hhcihzY2FsZSwgW2NvZGUsIGRlbGltLkhXW2ldWzFdXSwgZm9udCkuV2l0aCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sIHRoaXMuSFVCKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0uc3RyZXRjaCkge1xuICAgICAgICAgICAgdGhpc1tcImV4dGVuZERlbGltaXRlclwiICsgZGVsaW0uZGlyXShzdmcsIGh3LCBkZWxpbS5zdHJldGNoLCBzY2FsZSwgZm9udCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLmNyZWF0ZUNoYXIgPSBmdW5jdGlvbiAoc2NhbGUsIGRhdGEsIGZvbnQpIHtcbiAgICAgICAgdmFyIHRleHQgPSBcIlwiLCB2YXJpYW50ID0ge1xuICAgICAgICAgICAgZm9udHM6IFtkYXRhWzFdXSxcbiAgICAgICAgICAgIG5vUmVtYXA6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZvbnQgJiYgZm9udCA9PT0gdGhpcy5NTUwuVkFSSUFOVC5CT0xEKSB7XG4gICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gW2RhdGFbMV0gKyBcIi1ib2xkXCIsIGRhdGFbMV1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgKGRhdGFbMV0pICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gZGF0YVsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVswXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGRhdGFbMF0ubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFbMF1baV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNF0pIHtcbiAgICAgICAgICAgIHNjYWxlID0gc2NhbGUgKiBkYXRhWzRdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgICAgICBpZiAoZGF0YVsyXSkge1xuICAgICAgICAgICAgc3ZnLnggPSBkYXRhWzJdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVszXSkge1xuICAgICAgICAgICAgc3ZnLnkgPSBkYXRhWzNdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs1XSkge1xuICAgICAgICAgICAgc3ZnLmggKz0gZGF0YVs1XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGFbNl0pIHtcbiAgICAgICAgICAgIHN2Zy5kICs9IGRhdGFbNl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJWID0gZnVuY3Rpb24gKHN2ZywgSCwgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciB0b3AgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS50b3AgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBib3QgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS5ib3QgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBoID0gdG9wLmggKyB0b3AuZCArIGJvdC5oICsgYm90LmQ7XG4gICAgICAgIHZhciB5ID0gLXRvcC5oO1xuICAgICAgICBzdmcuQWRkKHRvcCwgMCwgeSk7XG4gICAgICAgIHkgLT0gdG9wLmQ7XG4gICAgICAgIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHZhciBtaWQgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLm1pZCwgZm9udCk7XG4gICAgICAgICAgICBoICs9IG1pZC5oICsgbWlkLmQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBIIDwgaCAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgSCA9IGggKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEggPiBoKSB7XG4gICAgICAgICAgICB2YXIgZXh0ID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5leHQsIGZvbnQpO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCBlSCA9IChIIC0gaCkgLyBrLCBzID0gKGVIICsgMTAwKSAvIChleHQuaCArIGV4dC5kKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5leHRlbmREZWxpbWl0ZXJIID0gZnVuY3Rpb24gKHN2ZywgVywgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ubGVmdCB8fCBkZWxpbS5yZXApLCBmb250KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCAoZGVsaW0ucmlnaHQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHN2Zy5BZGQobGVmdCwgLWxlZnQubCwgMCk7XG4gICAgICAgIHZhciB3ID0gKGxlZnQuciAtIGxlZnQubCkgKyAocmlnaHQuciAtIHJpZ2h0LmwpLCB4ID0gbGVmdC5yIC0gbGVmdC5sO1xuICAgICAgICBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5taWQsIGZvbnQpO1xuICAgICAgICAgICAgdyArPSBtaWQudztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubWluICYmIFcgPCB3ICogZGVsaW0ubWluKSB7XG4gICAgICAgICAgICBXID0gdyAqIGRlbGltLm1pbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVyA+IHcpIHtcbiAgICAgICAgICAgIHZhciByZXAgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLnJlcCwgZm9udCksIGZ1enogPSBkZWxpbS5mdXp6IHx8IDA7XG4gICAgICAgICAgICB2YXIgayA9IChkZWxpbS5taWQgPyAyIDogMSksIHJXID0gKFcgLSB3KSAvIGssIHMgPSAoclcgKyBmdXp6KSAvIChyZXAuciAtIHJlcC5sKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgKHggLSBmdXp6IC8gMiAtIHMgKiByZXAubCArIHJlcC54KSArIFwiLFwiICsgcmVwLnkgKyBcIikgc2NhbGUoXCIgKyBzICsgXCIsMSlcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQocmVwLmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeCArPSByVztcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgICAgICAgICB4ICs9IG1pZC53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHggLT0gKHcgLSBXKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgeCwgMCk7XG4gICAgICAgICAgICB4ICs9IG1pZC53IC0gKHcgLSBXKSAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChyaWdodCwgeCAtIHJpZ2h0LmwsIDApO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5FbGVtZW50ID0gZnVuY3Rpb24gKHR5cGUsIGRlZikge1xuICAgICAgICB2YXIgb2JqID0gKHR5cGVvZiAodHlwZSkgPT09IFwic3RyaW5nXCIgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3ZnOlwiICsgdHlwZSkgOiB0eXBlKTtcbiAgICAgICAgb2JqLmlzTWF0aEpheCA9IHRydWU7XG4gICAgICAgIGlmIChkZWYpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGRlZikge1xuICAgICAgICAgICAgICAgIGlmIChkZWYuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoaWQsIGRlZltpZF0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICByZXR1cm4gRWRpdGFibGVTVkc7XG59KSgpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImpheC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidXRpbC50c1wiIC8+XG52YXIgVXRpbCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXRpbCgpIHtcbiAgICB9XG4gICAgVXRpbC5wcm90b3R5cGUuRW0gPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBlbVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJlbVwiO1xuICAgIH07XG4gICAgVXRpbC5wcm90b3R5cGUuRXggPSBmdW5jdGlvbiAobSkge1xuICAgICAgICBtID0gTWF0aC5yb3VuZChtIC8gdGhpcy5UZVgueF9oZWlnaHQgKiB0aGlzLmV4KSAvIHRoaXMuZXg7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMGV4XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZCgzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcImV4XCI7XG4gICAgfTtcbiAgICBVdGlsLnByb3RvdHlwZS5QZXJjZW50ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0dXJuICgxMDAgKiBtKS50b0ZpeGVkKDEpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiJVwiO1xuICAgIH07XG4gICAgVXRpbC5GaXhlZCA9IGZ1bmN0aW9uIChtLCBuKSB7XG4gICAgICAgIGlmIChNYXRoLmFicyhtKSA8IDAuMDAwNikge1xuICAgICAgICAgICAgcmV0dXJuIFwiMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQobiB8fCAzKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIik7XG4gICAgfTtcbiAgICBVdGlsLmhhc2hDaGVjayA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH0gd2hpbGUgKHRhcmdldCAmJiB0YXJnZXQuZmlyc3RDaGlsZC5ub2RlTmFtZSAhPT0gXCJzdmdcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICAgIFV0aWwucHJvdG90eXBlLkVsZW1lbnQgPSBmdW5jdGlvbiAodHlwZSwgZGVmKSB7XG4gICAgICAgIHZhciBvYmogPSAodHlwZW9mICh0eXBlKSA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhVdGlsLlNWR05TLCB0eXBlKSA6IHR5cGUpO1xuICAgICAgICBvYmouaXNNYXRoSmF4ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGRlZikge1xuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gZGVmKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZi5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZShpZCwgZGVmW2lkXS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIFV0aWwubGVuZ3RoMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUsIHNpemUpIHtcbiAgICAgICAgaWYgKG11ID09PSB2b2lkIDApIHsgbXUgPSBudWxsOyB9XG4gICAgICAgIGlmIChzaXplID09PSB2b2lkIDApIHsgc2l6ZSA9IG51bGw7IH1cbiAgICAgICAgaWYgKHR5cGVvZiAobGVuZ3RoKSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gXCJcIikge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuU0laRS5OT1JNQUwpIHtcbiAgICAgICAgICAgIHJldHVybiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IHRoaXMuTU1MLlNJWkUuQklHKSB7XG4gICAgICAgICAgICByZXR1cm4gMjAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSB0aGlzLk1NTC5TSVpFLlNNQUxMKSB7XG4gICAgICAgICAgICByZXR1cm4gNzEwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IFwiaW5maW5pdHlcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuQklHRElNRU47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aC5tYXRjaCgvbWF0aHNwYWNlJC8pKSB7XG4gICAgICAgICAgICByZXR1cm4gMTAwMCAqIHRoaXMuTUFUSFNQQUNFW2xlbmd0aF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVtRmFjdG9yID0gKEVkaXRhYmxlU1ZHLnpvb21TY2FsZSB8fCAxKSAvIFV0aWwuZW07XG4gICAgICAgIHZhciBtYXRjaCA9IGxlbmd0aC5tYXRjaCgvXlxccyooWy0rXT8oPzpcXC5cXGQrfFxcZCsoPzpcXC5cXGQqKT8pKT8ocHR8ZW18ZXh8bXV8cHh8cGN8aW58bW18Y218JSk/Lyk7XG4gICAgICAgIHZhciBtID0gcGFyc2VGbG9hdChtYXRjaFsxXSB8fCBcIjFcIikgKiAxMDAwLCB1bml0ID0gbWF0Y2hbMl07XG4gICAgICAgIGlmIChzaXplID09IG51bGwpIHtcbiAgICAgICAgICAgIHNpemUgPSAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgaWYgKG11ID09IG51bGwpIHtcbiAgICAgICAgICAgIG11ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJlbVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJleFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMuVGVYLnhfaGVpZ2h0IC8gMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCIlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTAwICogc2l6ZSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHhcIikge1xuICAgICAgICAgICAgcmV0dXJuIG0gKiBlbUZhY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJwdFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0ID09PSBcInBjXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtICogMS4yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0ID09PSBcImluXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJjbVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyLjU0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0ID09PSBcIm1tXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtICogdGhpcy5weFBlckluY2ggKiBlbUZhY3RvciAvIDI1LjQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwibXVcIikge1xuICAgICAgICAgICAgcmV0dXJuIG0gLyAxOCAqIG11O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtICogc2l6ZSAvIDEwMDA7XG4gICAgfTtcbiAgICBVdGlsLmdldFBhZGRpbmcgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gcGFkZGluZykge1xuICAgICAgICAgICAgaWYgKHBhZGRpbmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZCA9IHN0eWxlc1tcInBhZGRpbmdcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdbaWRdID0gVXRpbC5sZW5ndGgyZW0ocGFkKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBwYWRkaW5nIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC5nZXRCb3JkZXJzID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICAgICAgICB2YXIgYm9yZGVyID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH0sIGhhcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBib3JkZXIpIHtcbiAgICAgICAgICAgIGlmIChib3JkZXIuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gXCJib3JkZXJcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlICE9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgICAgICAgICBoYXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWRdID0gVXRpbC5sZW5ndGgyZW0oc3R5bGVzW0lEICsgXCJXaWR0aFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiU3R5bGVcIl0gPSBzdHlsZXNbSUQgKyBcIlN0eWxlXCJdO1xuICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gc3R5bGVzW0lEICsgXCJDb2xvclwiXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPT09IFwiaW5pdGlhbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJbaWQgKyBcIkNvbG9yXCJdID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJvcmRlcltpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoaGFzID8gYm9yZGVyIDogZmFsc2UpO1xuICAgIH07XG4gICAgVXRpbC50aGlja25lc3MyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSkge1xuICAgICAgICB2YXIgdGhpY2sgPSB0aGlzLlRlWC5ydWxlX3RoaWNrbmVzcztcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuTElORVRISUNLTkVTUy5NRURJVU0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSB0aGlzLk1NTC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuTElORVRISUNLTkVTUy5USElDSykge1xuICAgICAgICAgICAgcmV0dXJuIDEuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgdGhpY2spO1xuICAgIH07XG4gICAgVXRpbC5TVkdOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcbiAgICBVdGlsLlhMSU5LTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIjtcbiAgICBVdGlsLk5CU1AgPSBcIlxcdTAwQTBcIjtcbiAgICBVdGlsLkJJR0RJTUVOID0gMTAwMDAwMDA7XG4gICAgVXRpbC5UZVggPSB7XG4gICAgICAgIHhfaGVpZ2h0OiA0MzAuNTU0LFxuICAgICAgICBxdWFkOiAxMDAwLFxuICAgICAgICBudW0xOiA2NzYuNTA4LFxuICAgICAgICBudW0yOiAzOTMuNzMyLFxuICAgICAgICBudW0zOiA0NDMuNzMsXG4gICAgICAgIGRlbm9tMTogNjg1Ljk1MSxcbiAgICAgICAgZGVub20yOiAzNDQuODQxLFxuICAgICAgICBzdXAxOiA0MTIuODkyLFxuICAgICAgICBzdXAyOiAzNjIuODkyLFxuICAgICAgICBzdXAzOiAyODguODg4LFxuICAgICAgICBzdWIxOiAxNTAsXG4gICAgICAgIHN1YjI6IDI0Ny4yMTcsXG4gICAgICAgIHN1cF9kcm9wOiAzODYuMTA4LFxuICAgICAgICBzdWJfZHJvcDogNTAsXG4gICAgICAgIGRlbGltMTogMjM5MCxcbiAgICAgICAgZGVsaW0yOiAxMDAwLFxuICAgICAgICBheGlzX2hlaWdodDogMjUwLFxuICAgICAgICBydWxlX3RoaWNrbmVzczogNjAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMTogMTExLjExMSxcbiAgICAgICAgYmlnX29wX3NwYWNpbmcyOiAxNjYuNjY2LFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzM6IDIwMCxcbiAgICAgICAgYmlnX29wX3NwYWNpbmc0OiA2MDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNTogMTAwLFxuICAgICAgICBzY3JpcHRzcGFjZTogMTAwLFxuICAgICAgICBudWxsZGVsaW1pdGVyc3BhY2U6IDEyMCxcbiAgICAgICAgZGVsaW1pdGVyZmFjdG9yOiA5MDEsXG4gICAgICAgIGRlbGltaXRlcnNob3J0ZmFsbDogMzAwLFxuICAgICAgICBtaW5fcnVsZV90aGlja25lc3M6IDEuMjUsXG4gICAgICAgIG1pbl9yb290X3NwYWNlOiAxLjVcbiAgICB9O1xuICAgIFV0aWwuTUFUSFNQQUNFID0ge1xuICAgICAgICB2ZXJ5dmVyeXRoaW5tYXRoc3BhY2U6IDEgLyAxOCxcbiAgICAgICAgdmVyeXRoaW5tYXRoc3BhY2U6IDIgLyAxOCxcbiAgICAgICAgdGhpbm1hdGhzcGFjZTogMyAvIDE4LFxuICAgICAgICBtZWRpdW1tYXRoc3BhY2U6IDQgLyAxOCxcbiAgICAgICAgdGhpY2ttYXRoc3BhY2U6IDUgLyAxOCxcbiAgICAgICAgdmVyeXRoaWNrbWF0aHNwYWNlOiA2IC8gMTgsXG4gICAgICAgIHZlcnl2ZXJ5dGhpY2ttYXRoc3BhY2U6IDcgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaW5tYXRoc3BhY2U6IC0xIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXRoaW5tYXRoc3BhY2U6IC0yIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldGhpbm1hdGhzcGFjZTogLTMgLyAxOCxcbiAgICAgICAgbmVnYXRpdmVtZWRpdW1tYXRoc3BhY2U6IC00IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldGhpY2ttYXRoc3BhY2U6IC01IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXRoaWNrbWF0aHNwYWNlOiAtNiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl2ZXJ5dGhpY2ttYXRoc3BhY2U6IC03IC8gMThcbiAgICB9O1xuICAgIHJldHVybiBVdGlsO1xufSkoKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi91dGlsLnRzXCIgLz5cbnZhciBCQk9YID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBCQk9YKGRlZikge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnR5cGUgPSBcImdcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5kZWZzID0gbnVsbDtcbiAgICAgICAgdGhpcy5uID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMuSCA9IHRoaXMuRCA9IDA7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IDA7XG4gICAgICAgIHRoaXMubCA9IFV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSAxO1xuICAgICAgICB0aGlzLm4gPSAwO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHID0gc3ZnO1xuICAgICAgICBpZiAodGhpcy50eXBlKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQgPSBFZGl0YWJsZVNWRy5FbGVtZW50KHRoaXMudHlwZSwgZGVmKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBCQk9YLnByb3RvdHlwZS5XaXRoID0gZnVuY3Rpb24gKGRlZiwgSFVCKSB7XG4gICAgICAgIHJldHVybiBIVUIuSW5zZXJ0KHRoaXMsIGRlZik7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5BZGQgPSBmdW5jdGlvbiAoc3ZnLCBkeCwgZHksIGZvcmNldywgaW5mcm9udCkge1xuICAgICAgICBpZiAoZHgpIHtcbiAgICAgICAgICAgIHN2Zy54ICs9IGR4O1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgaWYgKGR5KSB7XG4gICAgICAgICAgICBzdmcueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGlmIChzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmIHN2Zy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIHN2Zy5uID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgbm9kZU5hbWUgPSBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJ1c2VcIiB8fCBub2RlTmFtZSA9PT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBjaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNjYWxlID0gc3ZnLmNoaWxkU2NhbGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gc3ZnLmNoaWxkWCwgeSA9IHN2Zy5jaGlsZFk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy55ICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5oIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5kICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5IIC09IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5EICs9IHk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy53IC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yIC09IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5sICs9IHg7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3ZnLngpIDwgMSAmJiBNYXRoLmFicyhzdmcueSkgPCAxKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJnXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlID0gc3ZnLnJlbW92ZWFibGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUgPT09IFwibGluZVwiIHx8IG5vZGVOYW1lID09PSBcInBvbHlnb25cIiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9PT0gXCJwYXRoXCIgfHwgbm9kZU5hbWUgPT09IFwiYVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3Ioc3ZnLngpICsgXCIsXCIgKyBNYXRoLmZsb29yKHN2Zy55KSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhcIiwgTWF0aC5mbG9vcihzdmcueCAvIHN2Zy5zY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ5XCIsIE1hdGguZmxvb3Ioc3ZnLnkgLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubiArPSBzdmcubjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCAmJiB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudC5maXJzdENoaWxkLCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5mcm9udCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKHN2Zy5lbGVtZW50LCB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgdGhpcy5oYXNJbmRlbnQgPSBzdmcuaGFzSW5kZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy50dyA9IHN2Zy50dztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgLSBzdmcueSA+IHRoaXMuZCkge1xuICAgICAgICAgICAgdGhpcy5kID0gc3ZnLmQgLSBzdmcueTtcbiAgICAgICAgICAgIGlmICh0aGlzLmQgPiB0aGlzLkQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkQgPSB0aGlzLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy55ICsgc3ZnLmggPiB0aGlzLmgpIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHN2Zy55ICsgc3ZnLmg7XG4gICAgICAgICAgICBpZiAodGhpcy5oID4gdGhpcy5IKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5IID0gdGhpcy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuRCAtIHN2Zy55ID4gdGhpcy5EKSB7XG4gICAgICAgICAgICB0aGlzLkQgPSBzdmcuRCAtIHN2Zy55O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5IID4gdGhpcy5IKSB7XG4gICAgICAgICAgICB0aGlzLkggPSBzdmcueSArIHN2Zy5IO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5sIDwgdGhpcy5sKSB7XG4gICAgICAgICAgICB0aGlzLmwgPSBzdmcueCArIHN2Zy5sO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueCArIHN2Zy5yID4gdGhpcy5yKSB7XG4gICAgICAgICAgICB0aGlzLnIgPSBzdmcueCArIHN2Zy5yO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb3JjZXcgfHwgc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKSA+IHRoaXMudykge1xuICAgICAgICAgICAgdGhpcy53ID0gc3ZnLnggKyBzdmcudyArIChzdmcuWCB8fCAwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNoaWxkU2NhbGUgPSBzdmcuc2NhbGU7XG4gICAgICAgIHRoaXMuY2hpbGRYID0gc3ZnLng7XG4gICAgICAgIHRoaXMuY2hpbGRZID0gc3ZnLnk7XG4gICAgICAgIHRoaXMubisrO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWxpZ24gPSBmdW5jdGlvbiAoc3ZnLCBhbGlnbiwgZHgsIGR5LCBzaGlmdCkge1xuICAgICAgICBpZiAoc2hpZnQgPT09IHZvaWQgMCkgeyBzaGlmdCA9IG51bGw7IH1cbiAgICAgICAgZHggPSAoe1xuICAgICAgICAgICAgbGVmdDogZHgsXG4gICAgICAgICAgICBjZW50ZXI6ICh0aGlzLncgLSBzdmcudykgLyAyLFxuICAgICAgICAgICAgcmlnaHQ6IHRoaXMudyAtIHN2Zy53IC0gZHhcbiAgICAgICAgfSlbYWxpZ25dIHx8IDA7XG4gICAgICAgIHZhciB3ID0gdGhpcy53O1xuICAgICAgICB0aGlzLkFkZChzdmcsIGR4ICsgKHNoaWZ0IHx8IDApLCBkeSk7XG4gICAgICAgIHRoaXMudyA9IHc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5DbGVhbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaCA9PT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IHRoaXMubCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWDtcbn0pKCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGU7XG4gICAgZC5wcm90b3R5cGUgPSBuZXcgX18oKTtcbn07XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgc3ZnLCBodWIsIGRlZikge1xuICAgICAgICB0aGlzLnR5cGUgPSBcInJlY3RcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICBkZWYuZmlsbCA9IFwibm9uZVwiO1xuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYud2lkdGggPSBNYXRoLmZsb29yKHcgLSB0KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQgLSB0KTtcbiAgICAgICAgZGVmLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcih0IC8gMikgKyBcIixcIiArIE1hdGguZmxvb3IoLWQgKyB0IC8gMikgKyBcIilcIjtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbTWF0aC5mbG9vcig2ICogVXRpbC5lbSksIE1hdGguZmxvb3IoNiAqIFV0aWwuZW0pXS5qb2luKFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBzdmcsIGh1YiwgZGVmKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gZDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRlJBTUU7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX0cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0csIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9HKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfRztcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImJib3gudHNcIiAvPlxudmFyIEJCT1hfR0xZUEggPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0dMWVBILCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfR0xZUEgoc2NhbGUsIGlkLCBoLCBkLCB3LCBsLCByLCBwLCBTVkcsIEhVQikge1xuICAgICAgICB0aGlzLnR5cGUgPSBcInBhdGhcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBkZWY7XG4gICAgICAgIHZhciB0ID0gU1ZHLmNvbmZpZy5ibGFja2VyO1xuICAgICAgICB2YXIgY2FjaGUgPSBTVkcuY29uZmlnLnVzZUZvbnRDYWNoZTtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IChzY2FsZSA9PT0gMSA/IG51bGwgOiBcInNjYWxlKFwiICsgU1ZHLkZpeGVkKHNjYWxlKSArIFwiKVwiKTtcbiAgICAgICAgaWYgKGNhY2hlICYmICFTVkcuY29uZmlnLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICBpZCA9IFwiRVwiICsgdGhpcy5uICsgXCItXCIgKyBpZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNhY2hlIHx8ICF0aGlzLmdseXBoc1tpZF0pIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiB0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgZGVmLmlkID0gaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0cmFuc2Zvcm0pIHtcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmLmQgPSAocCA/IFwiTVwiICsgcCArIFwiWlwiIDogXCJcIik7XG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBTVkcsIEhVQiwgZGVmKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVmcy5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x5cGhzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm0pIHtcbiAgICAgICAgICAgICAgICBkZWYudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbGVtZW50ID0gU1ZHLkVsZW1lbnQoXCJ1c2VcIiwgZGVmKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCBcIiNcIiArIGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmggPSAoaCArIHQpICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IChkICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy53ID0gKHcgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5sID0gKGwgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5yID0gKHIgKyB0IC8gMikgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5IID0gTWF0aC5tYXgoMCwgdGhpcy5oKTtcbiAgICAgICAgdGhpcy5EID0gTWF0aC5tYXgoMCwgdGhpcy5kKTtcbiAgICAgICAgdGhpcy54ID0gdGhpcy55ID0gMDtcbiAgICAgICAgdGhpcy5zY2FsZSA9IHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9HTFlQSDtcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImJib3gudHNcIiAvPlxudmFyIEJCT1hfSExJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX0hMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfSExJTkUodywgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICB0aGlzLnR5cGUgPSBcImxpbmVcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueTEgPSBkZWYueTIgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLngyID0gTWF0aC5mbG9vcih3IC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIHcgLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSB0O1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9ITElORTtcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImJib3gudHNcIiAvPlxudmFyIEJCT1hfTlVMTCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfTlVMTCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX05VTEwoKSB7XG4gICAgICAgIF9zdXBlci5wcm90b3R5cGUuYXBwbHkuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLkNsZWFuKCk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX05VTEw7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX1JFQ1QgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1JFQ1QsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9SRUNUKGgsIGQsIHcsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnR5cGUgPSBcInJlY3RcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3KTtcbiAgICAgICAgZGVmLmhlaWdodCA9IE1hdGguZmxvb3IoaCArIGQpO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB3O1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoICsgZDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy55ID0gLWQ7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX1JFQ1Q7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX1JPVyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfUk9XLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUk9XKCkge1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLmFwcGx5LmNhbGwodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5zdmcgPSBbXTtcbiAgICAgICAgdGhpcy5zaCA9IHRoaXMuc2QgPSAwO1xuICAgIH1cbiAgICBCQk9YX1JPVy5wcm90b3R5cGUuQ2hlY2sgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgc3ZnID0gZGF0YS50b1NWRygpO1xuICAgICAgICB0aGlzLnN2Zy5wdXNoKHN2Zyk7XG4gICAgICAgIGlmIChkYXRhLlNWR2NhblN0cmV0Y2goXCJWZXJ0aWNhbFwiKSkge1xuICAgICAgICAgICAgc3ZnLm1tbCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oID4gdGhpcy5zaCkge1xuICAgICAgICAgICAgdGhpcy5zaCA9IHN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZCA+IHRoaXMuc2QpIHtcbiAgICAgICAgICAgIHRoaXMuc2QgPSBzdmcuZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLlN0cmV0Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5zdmcubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmdbaV0sIG1tbCA9IHN2Zy5tbWw7XG4gICAgICAgICAgICBpZiAobW1sKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1tbC5mb3JjZVN0cmV0Y2ggfHwgbW1sLkVkaXRhYmxlU1ZHZGF0YS5oICE9PSB0aGlzLnNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuZCAhPT0gdGhpcy5zZCkge1xuICAgICAgICAgICAgICAgICAgICBzdmcgPSBtbWwuU1ZHc3RyZXRjaFYodGhpcy5zaCwgdGhpcy5zZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1tbC5FZGl0YWJsZVNWR2RhdGEuSFcgPSB0aGlzLnNoO1xuICAgICAgICAgICAgICAgIG1tbC5FZGl0YWJsZVNWR2RhdGEuRCA9IHRoaXMuc2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLmljKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pYyA9IHN2Zy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5BZGQoc3ZnLCB0aGlzLncsIDAsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2ZztcbiAgICB9O1xuICAgIHJldHVybiBCQk9YX1JPVztcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImJib3gudHNcIiAvPlxudmFyIEJCT1hfVEVYVCA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVEVYVCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1RFWFQoSFRNTCwgc2NhbGUsIHRleHQsIGRlZikge1xuICAgICAgICB0aGlzLnR5cGUgPSBcInRleHRcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIGlmICghZGVmKVxuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIGRlZi5zdHJva2UgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtc3R5bGVcIl0gPT09IFwiXCIpXG4gICAgICAgICAgICBkZWxldGUgZGVmW1wiZm9udC1zdHlsZVwiXTtcbiAgICAgICAgaWYgKGRlZltcImZvbnQtd2VpZ2h0XCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtd2VpZ2h0XCJdO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYpO1xuICAgICAgICBIVE1MLmFkZFRleHQodGhpcy5lbGVtZW50LCB0ZXh0KTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWRy50ZXh0U1ZHLmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHZhciBiYm94ID0gdGhpcy5lbGVtZW50LmdldEJCb3goKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWRy50ZXh0U1ZHLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIHNjYWxlICo9IDEwMDAgLyBVdGlsLmVtO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIgKyBVdGlsLkZpeGVkKHNjYWxlKSArIFwiKSBtYXRyaXgoMSAwIDAgLTEgMCAwKVwiKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gYmJveC53aWR0aCAqIHNjYWxlO1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSAtYmJveC55ICogc2NhbGU7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IChiYm94LmhlaWdodCArIGJib3gueSkgKiBzY2FsZTtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfVEVYVDtcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImJib3gudHNcIiAvPlxudmFyIEJCT1hfVkxJTkUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1ZMSU5FLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfVkxJTkUoaCwgdCwgZGFzaCwgY29sb3IsIGRlZikge1xuICAgICAgICB0aGlzLnR5cGUgPSBcImxpbmVcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIGlmIChkZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJzcXVhcmVcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3IgJiYgY29sb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIGRlZi5zdHJva2UgPSBjb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBkZWZbXCJzdHJva2Utd2lkdGhcIl0gPSBVdGlsLkZpeGVkKHQsIDIpO1xuICAgICAgICBkZWYueDEgPSBkZWYueDIgPSBkZWYueTEgPSBNYXRoLmZsb29yKHQgLyAyKTtcbiAgICAgICAgZGVmLnkyID0gTWF0aC5mbG9vcihoIC0gdCAvIDIpO1xuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkYXNoZWRcIikge1xuICAgICAgICAgICAgdmFyIG4gPSBNYXRoLmZsb29yKE1hdGgubWF4KDAsIGggLSB0KSAvICg2ICogdCkpLCBtID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoMiAqIG4gKyAxKSk7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gbSArIFwiIFwiICsgbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGFzaCA9PT0gXCJkb3R0ZWRcIikge1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IFsxLCBNYXRoLm1heCgxNTAsIE1hdGguZmxvb3IoMiAqIHQpKV0uam9pbihcIiBcIik7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtbGluZWNhcFwiXSA9IFwicm91bmRcIjtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBkZWYpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSB0O1xuICAgICAgICB0aGlzLmwgPSAwO1xuICAgICAgICB0aGlzLmggPSB0aGlzLkggPSBoO1xuICAgICAgICB0aGlzLmQgPSB0aGlzLkQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9WTElORTtcbn0pKEJCT1gpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2Jib3gvYmJveC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vYmJveC9yZWN0LnRzXCIgLz5cbnZhciBFbGVtZW50SmF4ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFbGVtZW50SmF4KCkge1xuICAgIH1cbiAgICByZXR1cm4gRWxlbWVudEpheDtcbn0pKCk7XG52YXIgTUJhc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1CYXNlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUJhc2VNaXhpbihBSkFYKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLkFKQVggPSBBSkFYO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ09oIG5vISBDb3VsZG5cXCd0IGZpbmQgZWxlbSBmb3IgdGhpcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uIChBSkFYLCBIVUIsIEhUTUwsIEVkaXRhYmxlU1ZHKSB7XG4gICAgICAgIC8vIFRPRE86IHB1dCB0aGUgYXJncyBpbnRvIHRoZSBkaWN0IHNvIHRoZXkgZ2V0IHN0dWNrIG9udG8gdGhlIG9iamVjdHNcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5BZGQodGhpcy5kYXRhW2ldLnRvU1ZHKHZhcmlhbnQsIHN2Zy5zY2FsZSksIHN2Zy53LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQuc2tldykge1xuICAgICAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGNoaWxkLnNrZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YS5qb2luKFwiXCIpO1xuICAgICAgICBpZiAoc3ZnLnNrZXcgJiYgdGV4dC5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnIgPiBzdmcudyAmJiB0ZXh0Lmxlbmd0aCA9PT0gMSAmJiAhdmFyaWFudC5ub0lDKSB7XG4gICAgICAgICAgICBzdmcuaWMgPSBzdmcuciAtIHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcucjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBzdmcuZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NoaWxkU1ZHID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbaV0gPyB0aGlzLmRhdGFbaV0udG9TVkcoKSA6IG5ldyBCQk9YKHRoaXMuRWRpdGFibGVTVkcsIHRoaXMuSFVCKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQgPSBmdW5jdGlvbiAoaSwgSFcsIEQpIHtcbiAgICAgICAgaWYgKEQgPT09IHZvaWQgMCkgeyBEID0gbnVsbDsgfVxuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHtcbiAgICAgICAgICAgIEhXOiBIVyxcbiAgICAgICAgICAgIEQ6IERcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQkJPWCh0aGlzLkVkaXRhYmxlU1ZHLCB0aGlzLkhVQik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3NhdmVEYXRhID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMuRWRpdGFibGVTVkdkYXRhKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLncgPSBzdmcudywgdGhpcy5FZGl0YWJsZVNWR2RhdGEueCA9IHN2Zy54O1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oID0gc3ZnLmgsIHRoaXMuRWRpdGFibGVTVkdkYXRhLmQgPSBzdmcuZDtcbiAgICAgICAgaWYgKHN2Zy55KSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5oICs9IHN2Zy55O1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCAtPSBzdmcueTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLlggIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuWCA9IHN2Zy5YO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcudHcgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5za2V3KSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5za2V3ID0gc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEuaWMgPSBzdmcuaWM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXNbXCJjbGFzc1wiXSkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIEVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IHRoaXNbXCJjbGFzc1wiXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaWQpIHtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBFZGl0YWJsZVNWRy5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgXCJpZFwiOiB0aGlzLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ocmVmKSB7XG4gICAgICAgICAgICB2YXIgYSA9IEVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICAgICAgICBcImNsYXNzXCI6IFwibWp4LXN2Zy1ocmVmXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGVOUyhVdGlsLlhMSU5LTlMsIFwiaHJlZlwiLCB0aGlzLmhyZWYpO1xuICAgICAgICAgICAgYS5vbmNsaWNrID0gdGhpcy5TVkdsaW5rO1xuICAgICAgICAgICAgdGhpcy5FZGl0YWJsZVNWRy5hZGRFbGVtZW50KGEsIFwicmVjdFwiLCB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHN2Zy53LFxuICAgICAgICAgICAgICAgIGhlaWdodDogc3ZnLmggKyBzdmcuZCxcbiAgICAgICAgICAgICAgICB5OiAtc3ZnLmQsXG4gICAgICAgICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcInBvaW50ZXItZXZlbnRzXCI6IFwiYWxsXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHN2Zy50eXBlID09PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChnLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYS5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRWRpdGFibGVTVkdDb25maWcuY29uZmlnLmFkZE1NTGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHYWRkQ2xhc3Moc3ZnLmVsZW1lbnQsIFwibWp4LXN2Zy1cIiArIHRoaXMudHlwZSk7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdHlsZSA9IHRoaXMuc3R5bGU7XG4gICAgICAgIGlmIChzdHlsZSAmJiBzdmcuZWxlbWVudCkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAgICAgICAgICAgaWYgKHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuZm9udFNpemUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc3R5bGUuYm9yZGVyID0gc3ZnLmVsZW1lbnQuc3R5bGUucGFkZGluZyA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUpIHtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IChzdmcuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID09PSBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2FkZEF0dHJpYnV0ZXMoc3ZnKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZENsYXNzID0gZnVuY3Rpb24gKG5vZGUsIG5hbWUpIHtcbiAgICAgICAgdmFyIGNsYXNzZXMgPSBub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIChjbGFzc2VzID8gY2xhc3NlcyArIFwiIFwiIDogXCJcIikgKyBuYW1lKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2FkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLmF0dHJOYW1lcykge1xuICAgICAgICAgICAgdmFyIGNvcHkgPSB0aGlzLmF0dHJOYW1lcywgc2tpcCA9IHRoaXMuTU1MLm5vY29weUF0dHJpYnV0ZXMsIGlnbm9yZSA9IHRoaXMuSFVCLmNvbmZpZy5pZ25vcmVNTUxhdHRyaWJ1dGVzO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0gKHRoaXMudHlwZSA9PT0gXCJtc3R5bGVcIiA/IHRoaXMuTU1MLm1hdGgucHJvdG90eXBlLmRlZmF1bHRzIDogdGhpcy5kZWZhdWx0cyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGNvcHkubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gY29weVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaWdub3JlW2lkXSA9PSBmYWxzZSB8fCAoIXNraXBbaWRdICYmICFpZ25vcmVbaWRdICYmXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzW2lkXSA9PSBudWxsICYmIHR5cGVvZiAoc3ZnLmVsZW1lbnRbaWRdKSA9PT0gXCJ1bmRlZmluZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKGlkLCB0aGlzLmF0dHJbaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2xpbmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBocmVmID0gdGhpcy5ocmVmLmFuaW1WYWw7XG4gICAgICAgIGlmIChocmVmLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBVdGlsLmhhc2hDaGVjayhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChocmVmLnN1YnN0cigxKSkpO1xuICAgICAgICAgICAgaWYgKHRhcmdldCAmJiB0YXJnZXQuc2Nyb2xsSW50b1ZpZXcpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhcmVudE5vZGUuc2Nyb2xsSW50b1ZpZXcodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBocmVmO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0U3R5bGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgdmFyIHNwYW4gPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3Byb2Nlc3NTdHlsZXMgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHtcbiAgICAgICAgICAgIGJvcmRlcjogVXRpbC5nZXRCb3JkZXJzKHN0eWxlKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IFV0aWwuZ2V0UGFkZGluZyhzdHlsZSlcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFzdHlsZXMuYm9yZGVyKSB7XG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLmJvcmRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXN0eWxlcy5wYWRkaW5nKSB7XG4gICAgICAgICAgICBkZWxldGUgc3R5bGVzLnBhZGRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTaXplKSB7XG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRTaXplJ10gPSBzdHlsZS5mb250U2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3R5bGUuY29sb3IpIHtcbiAgICAgICAgICAgIHN0eWxlc1snY29sb3InXSA9IHN0eWxlLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHlsZS5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgICAgIHN0eWxlc1snYmFja2dyb3VuZCddID0gc3R5bGUuYmFja2dyb3VuZENvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHlsZS5mb250U3R5bGUpIHtcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFN0eWxlJ10gPSBzdHlsZS5mb250U3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0eWxlLmZvbnRXZWlnaHQpIHtcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gc3R5bGUuZm9udFdlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3R5bGUuZm9udEZhbWlseSkge1xuICAgICAgICAgICAgc3R5bGVzWydmb250RmFtaWx5J10gPSBzdHlsZS5mb250RmFtaWx5O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHlsZXNbJ2ZvbnRXZWlnaHQnXSAmJiBzdHlsZXNbJ2ZvbnRXZWlnaHQnXS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFdlaWdodCddID0gKHBhcnNlSW50KHN0eWxlc1snZm9udFdlaWdodCddKSA+IDYwMCA/IFwiYm9sZFwiIDogXCJub3JtYWxcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0eWxlcztcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy51c2VNTUxzcGFjaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50eXBlICE9PSBcIm1vXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJsc3BhY2VcIiwgXCJyc3BhY2VcIik7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsIDw9IDAgfHwgdGhpcy5oYXNWYWx1ZShcImxzcGFjZVwiKSB8fCB0aGlzLmhhc1ZhbHVlKFwicnNwYWNlXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5sc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubHNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlcy5yc3BhY2UgPSBNYXRoLm1heCgwLCBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMucnNwYWNlLCBtdSkpO1xuICAgICAgICAgICAgICAgIHZhciBjb3JlID0gdGhpcywgcGFyZW50ID0gdGhpcy5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyZW50ICYmIHBhcmVudC5pc0VtYmVsbGlzaGVkKCkgJiYgcGFyZW50LkNvcmUoKSA9PT0gY29yZSkge1xuICAgICAgICAgICAgICAgICAgICBjb3JlID0gcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQuUGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy54ICs9IHZhbHVlcy5sc3BhY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMucnNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5YID0gdmFsdWVzLnJzcGFjZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BhY2UgPSB0aGlzLnRleFNwYWNpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoKTtcbiAgICAgICAgICAgIGlmIChzcGFjZSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy54ICs9IFV0aWwubGVuZ3RoMmVtKHNwYWNlLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdoYW5kbGVDb2xvciA9IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aGNvbG9yXCIsIFwiY29sb3JcIik7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlcyAmJiB0aGlzLnN0eWxlcy5jb2xvciAmJiAhdmFsdWVzLmNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMuY29sb3IgPSB0aGlzLnN0eWxlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmNvbG9yICYmICF0aGlzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhjb2xvciA9IHZhbHVlcy5jb2xvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLm1hdGhjb2xvcikge1xuICAgICAgICAgICAgRWRpdGFibGVTVkcuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIGZpbGw6IHZhbHVlcy5tYXRoY29sb3IsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiB2YWx1ZXMubWF0aGNvbG9yXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvcmRlcnMgPSAodGhpcy5zdHlsZXMgfHwge30pLmJvcmRlciwgcGFkZGluZyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkucGFkZGluZywgYmxlZnQgPSAoKGJvcmRlcnMgfHwge30pLmxlZnQgfHwgMCksIHBsZWZ0ID0gKChwYWRkaW5nIHx8IHt9KS5sZWZ0IHx8IDApLCBpZDtcbiAgICAgICAgdmFsdWVzLmJhY2tncm91bmQgPSAodGhpcy5tYXRoYmFja2dyb3VuZCB8fCB0aGlzLmJhY2tncm91bmQgfHxcbiAgICAgICAgICAgICh0aGlzLnN0eWxlcyB8fCB7fSkuYmFja2dyb3VuZCB8fCB0aGlzLk1NTC5DT0xPUi5UUkFOU1BBUkVOVCk7XG4gICAgICAgIGlmIChibGVmdCArIHBsZWZ0KSB7XG4gICAgICAgICAgICB2YXIgZHVwID0gbmV3IEJCT1godGhpcy5IVUIpO1xuICAgICAgICAgICAgZm9yIChpZCBpbiBzdmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3ZnLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkdXBbaWRdID0gc3ZnW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdXAueCA9IDA7XG4gICAgICAgICAgICBkdXAueSA9IDA7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IEVkaXRhYmxlU1ZHLkVsZW1lbnQoXCJnXCIpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSB0cnVlO1xuICAgICAgICAgICAgc3ZnLkFkZChkdXAsIGJsZWZ0ICsgcGxlZnQsIDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYWRkaW5nKSB7XG4gICAgICAgICAgICBzdmcudyArPSBwYWRkaW5nLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBwYWRkaW5nLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gcGFkZGluZy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgc3ZnLncgKz0gYm9yZGVycy5yaWdodCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmggKz0gYm9yZGVycy50b3AgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5kICs9IGJvcmRlcnMuYm90dG9tIHx8IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy5iYWNrZ3JvdW5kICE9PSB0aGlzLk1NTC5DT0xPUi5UUkFOU1BBUkVOVCkge1xuICAgICAgICAgICAgdmFyIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChub2RlTmFtZSAhPT0gXCJnXCIgJiYgbm9kZU5hbWUgIT09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZyA9IHRoaXMuRWRpdGFibGVTVkcuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBnO1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfUkVDVChzdmcuaCwgc3ZnLmQsIHN2Zy53LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLmJhY2tncm91bmQsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIlxuICAgICAgICAgICAgfSksIDAsIDAsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgdmFyIGRkID0gNTtcbiAgICAgICAgICAgIHZhciBzaWRlcyA9IHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIC1kZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICByaWdodDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCBzdmcudyAtIGJvcmRlcnMucmlnaHQgKyBkZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICB0b3A6IFtcIkhcIiwgc3ZnLncsIDAsIHN2Zy5oIC0gYm9yZGVycy50b3AgKyBkZF0sXG4gICAgICAgICAgICAgICAgYm90dG9tOiBbXCJIXCIsIHN2Zy53LCAwLCAtc3ZnLmQgLSBkZF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmb3IgKGlkIGluIHNpZGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNpZGVzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyc1tpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaWRlID0gc2lkZXNbaWRdLCBib3ggPSBCQk9YW3NpZGVbMF0gKyBcIkxJTkVcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGJveChzaWRlWzFdLCBib3JkZXJzW2lkXSwgYm9yZGVyc1tpZCArIFwiU3R5bGVcIl0sIGJvcmRlcnNbaWQgKyBcIkNvbG9yXCJdKSwgc2lkZVsyXSwgc2lkZVszXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgcmV0dXJuIEVkaXRhYmxlU1ZHLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0VmFyaWFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aHZhcmlhbnRcIiwgXCJmb250ZmFtaWx5XCIsIFwiZm9udHdlaWdodFwiLCBcImZvbnRzdHlsZVwiKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB2YWx1ZXMubWF0aHZhcmlhbnQ7XG4gICAgICAgIGlmICh0aGlzLnZhcmlhbnRGb3JtKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCItVGVYLXZhcmlhbnRcIjtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMuaGFzVmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSk7XG4gICAgICAgIGlmICghdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB2YWx1ZXMuZm9udGZhbWlseTtcbiAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB2YWx1ZXMuZm9udHdlaWdodDtcbiAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHZhbHVlcy5mb250c3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB0aGlzLnN0eWxlcy5mb250U3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB0aGlzLnN0eWxlcy5mb250V2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuZmFtaWx5ICYmIHRoaXMuc3R5bGVzLmZvbnRGYW1pbHkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdGhpcy5zdHlsZXMuZm9udEZhbWlseTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmZhbWlseSAmJiAhdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2JvbGQvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvaXRhbGljLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBmb3JjZUZhbWlseTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb250OiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFsdWVzLmZhbWlseVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFsdWVzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC1zdHlsZVwiXSA9IHZhbHVlcy5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC13ZWlnaHRcIl0gPSB2YWx1ZXMud2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwiYm9sZFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogdGhpcy5NTUwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIGl0YWxpYzogdGhpcy5NTUwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IHRoaXMuTU1MLlZBUklBTlQuQk9MREZSQUtUVVIsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiB0aGlzLk1NTC5WQVJJQU5ULkJPTERTQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmXCI6IHRoaXMuTU1MLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgYm9sZDogdGhpcy5NTUwuVkFSSUFOVC5ub3JtYWwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiB0aGlzLk1NTC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiB0aGlzLk1NTC5WQVJJQU5ULkZSQUtUVVIsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNjcmlwdFwiOiB0aGlzLk1NTC5WQVJJQU5ULlNDUklQVCxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogdGhpcy5NTUwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnN0eWxlID09PSBcIml0YWxpY1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogdGhpcy5NTUwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgYm9sZDogdGhpcy5NTUwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRkJPTERJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgaXRhbGljOiB0aGlzLk1NTC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuU0FOU1NFUklGLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1ib2xkLWl0YWxpY1wiOiB0aGlzLk1NTC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIEVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBFZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgdGhpcy5IVUIuUmVzdGFydEFmdGVyKHRoaXMuQUpBWC5SZXF1aXJlKGZpbGUpKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2F1dG9sb2FkRmlsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBmaWxlID0gRWRpdGFibGVTVkcuYXV0b2xvYWREaXIgKyBcIi9cIiArIG5hbWUgKyBcIi5qc1wiO1xuICAgICAgICB0aGlzLkhVQi5SZXN0YXJ0QWZ0ZXIodGhpcy5BSkFYLlJlcXVpcmUoZmlsZSkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1CYXNlTWl4aW47XG59KShFbGVtZW50SmF4KTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgQ2hhcnNNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKENoYXJzTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQ2hhcnNNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIENoYXJzTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKHZhcmlhbnQsIHNjYWxlLCByZW1hcCwgY2hhcnMpIHtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFyc1RoaW5nID0gdGhpcy5TVkdoYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2VsZW0gPSBjaGFyc1RoaW5nLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBjaGFyc1RoaW5nO1xuICAgIH07XG4gICAgcmV0dXJuIENoYXJzTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgRW50aXR5TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhFbnRpdHlNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBFbnRpdHlNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIEVudGl0eU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy50b1N0cmluZygpLnJlcGxhY2UoL1tcXHUyMDYxLVxcdTIwNjRdL2csIFwiXCIpO1xuICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgIHRleHQgPSByZW1hcCh0ZXh0LCBjaGFycyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2hhbmRsaW5nIGVudGl0eTogJywgdGV4dCk7XG4gICAgICAgIHJldHVybiB0aGlzLlNWR2hhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgIH07XG4gICAgcmV0dXJuIEVudGl0eU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1BY3Rpb25NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1BY3Rpb25NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNQWN0aW9uTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNQWN0aW9uTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1BY3Rpb25NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNYXRoTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNYXRoTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTWF0aE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5TVkcgPSBCQk9YLlN1YmNsYXNzKHtcbiAgICAgICAgICAgIHR5cGU6IFwic3ZnXCIsXG4gICAgICAgICAgICByZW1vdmVhYmxlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgTWF0aE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChzcGFuLCBkaXYpIHtcbiAgICAgICAgdmFyIENPTkZJRyA9IEVkaXRhYmxlU1ZHQ29uZmlnLmNvbmZpZztcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSkge1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5QWxpZ24gPSB0aGlzLkhVQi5jb25maWcuZGlzcGxheUFsaWduO1xuICAgICAgICAgICAgdGhpcy5NTUwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSB0aGlzLkhVQi5jb25maWcuZGlzcGxheUluZGVudDtcbiAgICAgICAgICAgIGlmIChTdHJpbmcodGhpcy5IVUIuY29uZmlnLmRpc3BsYXlJbmRlbnQpLm1hdGNoKC9eMCgkfFthLXolXSkvaSkpXG4gICAgICAgICAgICAgICAgdGhpcy5NTUwubWJhc2UucHJvdG90eXBlLmRpc3BsYXlJbmRlbnQgPSBcIjBcIjtcbiAgICAgICAgICAgIHZhciBib3ggPSBCQk9YX0coKTtcbiAgICAgICAgICAgIGJveC5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCksIDAsIDAsIHRydWUpO1xuICAgICAgICAgICAgYm94LkNsZWFuKCk7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKGJveCk7XG4gICAgICAgICAgICB0aGlzLlNWRy5FbGVtZW50KGJveC5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcImN1cnJlbnRDb2xvclwiLFxuICAgICAgICAgICAgICAgIGZpbGw6IFwiY3VycmVudENvbG9yXCIsXG4gICAgICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogMCxcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwibWF0cml4KDEgMCAwIC0xIDAgMClcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieG1sbnM6eGxpbmtcIiwgWExJTktOUyk7XG4gICAgICAgICAgICBpZiAoQ09ORklHLnVzZUZvbnRDYWNoZSAmJiAhQ09ORklHLnVzZUdsb2JhbENhY2hlKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoQkJPWC5kZWZzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoYm94KTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgaWYgKCFzcGFuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKTtcbiAgICAgICAgICAgICAgICBzdmcucmVtb3ZhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3ZnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGwgPSBNYXRoLm1heCgtc3ZnLmwsIDApLCByID0gTWF0aC5tYXgoc3ZnLnIgLSBzdmcudywgMCk7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBzdmcuZWxlbWVudC5zdHlsZTtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIHRoaXMuU1ZHLkV4KGwgKyBzdmcudyArIHIpKTtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcImhlaWdodFwiLCB0aGlzLlNWRy5FeChzdmcuSCArIHN2Zy5EICsgMiAqIHRoaXMuU1ZHLmVtKSk7XG4gICAgICAgICAgICBzdHlsZS52ZXJ0aWNhbEFsaWduID0gdGhpcy5TVkcuRXgoLXN2Zy5EIC0gMiAqIHRoaXMuU1ZHLmVtKTtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpbkxlZnQgPSB0aGlzLlNWRy5FeCgtbCk7XG4gICAgICAgICAgICBzdHlsZS5tYXJnaW5SaWdodCA9IHRoaXMuU1ZHLkV4KC1yKTtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInZpZXdCb3hcIiwgdGhpcy5TVkcuRml4ZWQoLWwsIDEpICsgXCIgXCIgKyB0aGlzLlNWRy5GaXhlZCgtc3ZnLkggLSB0aGlzLlNWRy5lbSwgMSkgKyBcIiBcIiArXG4gICAgICAgICAgICAgICAgdGhpcy5TVkcuRml4ZWQobCArIHN2Zy53ICsgciwgMSkgKyBcIiBcIiArIHRoaXMuU1ZHLkZpeGVkKHN2Zy5IICsgc3ZnLkQgKyAyICogdGhpcy5TVkcuZW0sIDEpKTtcbiAgICAgICAgICAgIHN0eWxlLm1hcmdpblRvcCA9IHN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiMXB4XCI7XG4gICAgICAgICAgICBpZiAoc3ZnLkggPiBzdmcuaCkge1xuICAgICAgICAgICAgICAgIHN0eWxlLm1hcmdpblRvcCA9IHRoaXMuU1ZHLkV4KHN2Zy5oIC0gc3ZnLkgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5EID4gc3ZnLmQpIHtcbiAgICAgICAgICAgICAgICBzdHlsZS5tYXJnaW5Cb3R0b20gPSB0aGlzLlNWRy5FeChzdmcuZCAtIHN2Zy5EKTtcbiAgICAgICAgICAgICAgICBzdHlsZS52ZXJ0aWNhbEFsaWduID0gdGhpcy5TVkcuRXgoLXN2Zy5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhbHR0ZXh0ID0gdGhpcy5HZXQoXCJhbHR0ZXh0XCIpO1xuICAgICAgICAgICAgaWYgKGFsdHRleHQgJiYgIXN2Zy5lbGVtZW50LmdldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIikpXG4gICAgICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGFsdHRleHQpO1xuICAgICAgICAgICAgaWYgKCFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpKVxuICAgICAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcIm1hdGhcIik7XG4gICAgICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc011bHRpbGluZSAmJiB0aGlzLkdldChcImRpc3BsYXlcIikgPT09IFwiYmxvY2tcIiAmJiAhc3ZnLmhhc0luZGVudCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImluZGVudGFsaWduZmlyc3RcIiwgXCJpbmRlbnRzaGlmdGZpcnN0XCIsIFwiaW5kZW50YWxpZ25cIiwgXCJpbmRlbnRzaGlmdFwiKTtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduZmlyc3QgIT09IHRoaXMuTU1MLklOREVOVEFMSUdOLklOREVOVEFMSUdOKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudGFsaWduID09PSB0aGlzLk1NTC5JTkRFTlRBTElHTi5BVVRPKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRhbGlnbiA9IHRoaXMuZGlzcGxheUFsaWduO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0Zmlyc3QgIT09IHRoaXMuTU1MLklOREVOVFNISUZULklOREVOVFNISUZUKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5pbmRlbnRzaGlmdCA9IHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLmluZGVudHNoaWZ0ID09PSBcImF1dG9cIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSBcIjBcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHNoaWZ0ID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmluZGVudHNoaWZ0LCAxLCB0aGlzLlNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXlJbmRlbnQgIT09IFwiMFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRlbnQgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLmRpc3BsYXlJbmRlbnQsIDEsIHRoaXMuU1ZHLmN3aWR0aCk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0ICs9ICh2YWx1ZXMuaW5kZW50YWxpZ24gPT09IHRoaXMuTU1MLklOREVOVEFMSUdOLlJJR0hUID8gLWluZGVudCA6IGluZGVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRpdi5zdHlsZS50ZXh0QWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ247XG4gICAgICAgICAgICAgICAgaWYgKHNoaWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuSFVCLkluc2VydChzdHlsZSwgKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5MZWZ0OiB0aGlzLlNWRy5FeChzaGlmdClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiB0aGlzLlNWRy5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogdGhpcy5TVkcuRXgoc2hpZnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpblJpZ2h0OiB0aGlzLlNWRy5FeCgtc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pW3ZhbHVlcy5pbmRlbnRhbGlnbl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhbjtcbiAgICB9O1xuICAgIHJldHVybiBNYXRoTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTUVuY2xvc2VNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1FbmNsb3NlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVuY2xvc2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FbmNsb3NlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgcmV0dXJuIE1FbmNsb3NlTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTUVycm9yTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRXJyb3JNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRXJyb3JNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1FcnJvck1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCksIHNjYWxlID0gVXRpbC5sZW5ndGgyZW0odGhpcy5zdHlsZXMuZm9udFNpemUgfHwgMSkgLyAxMDAwO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBkZWYgPSAoc2NhbGUgIT09IDEgPyB7XG4gICAgICAgICAgICB0cmFuc2Zvcm06IFwic2NhbGUoXCIgKyB0aGlzLlNWRy5GaXhlZChzY2FsZSkgKyBcIilcIlxuICAgICAgICB9IDoge30pO1xuICAgICAgICB2YXIgYmJveCA9IG5ldyBCQk9YKHRoaXMuSFVCLCBkZWYpO1xuICAgICAgICBiYm94LkFkZCh0aGlzLlNWR2NoaWxkU1ZHKDApKTtcbiAgICAgICAgYmJveC5DbGVhbigpO1xuICAgICAgICBpZiAoc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIGJib3gucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGFkanVzdCA9IFtcIndcIiwgXCJoXCIsIFwiZFwiLCBcImxcIiwgXCJyXCIsIFwiRFwiLCBcIkhcIl07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IGFkanVzdC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBiYm94W2FkanVzdFtpXV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkFkZChiYm94KTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUVycm9yTWl4aW4ucHJvdG90eXBlLlNWR2dldFN0eWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNwYW4gPSBIVE1MLkVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiBFZGl0YWJsZVNWR0NvbmZpZy5jb25maWcubWVycm9yU3R5bGVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3R5bGVzID0gdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpO1xuICAgICAgICBpZiAodGhpcy5zdHlsZSkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5zdHlsZTtcbiAgICAgICAgICAgIHRoaXMuSFVCLkluc2VydCh0aGlzLnN0eWxlcywgdGhpcy5TVkdwcm9jZXNzU3R5bGVzKHNwYW4uc3R5bGUpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1FcnJvck1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1GZW5jZWRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1GZW5jZWRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRmVuY2VkTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRmVuY2VkTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKHRoaXMuU1ZHLCB0aGlzLkhVQik7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5vcGVuKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLm9wZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDEsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtcInNlcFwiICsgaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhLmNsb3NlKSB7XG4gICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhLmNsb3NlKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTUZlbmNlZE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1GcmFjTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRnJhY01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1GcmFjTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRnJhY01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIGZyYWMgPSBuZXcgQkJPWCgpO1xuICAgICAgICBmcmFjLnNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKGZyYWMpO1xuICAgICAgICB2YXIgbnVtID0gdGhpcy5TVkdjaGlsZFNWRygwKSwgZGVuID0gdGhpcy5TVkdjaGlsZFNWRygxKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwibGluZXRoaWNrbmVzc1wiLCBcIm51bWFsaWduXCIsIFwiZGVub21hbGlnblwiLCBcImJldmVsbGVkXCIpO1xuICAgICAgICB2YXIgaXNEaXNwbGF5ID0gdmFsdWVzLmRpc3BsYXlzdHlsZTtcbiAgICAgICAgdmFyIGEgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHNjYWxlO1xuICAgICAgICBpZiAodmFsdWVzLmJldmVsbGVkKSB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSAoaXNEaXNwbGF5ID8gNDAwIDogMTUwKTtcbiAgICAgICAgICAgIHZhciBIID0gTWF0aC5tYXgobnVtLmggKyBudW0uZCwgZGVuLmggKyBkZW4uZCkgKyAyICogZGVsdGE7XG4gICAgICAgICAgICB2YXIgYmV2ZWwgPSBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIoMHgyRiwgSCk7XG4gICAgICAgICAgICBmcmFjLkFkZChudW0sIDAsIChudW0uZCAtIG51bS5oKSAvIDIgKyBhICsgZGVsdGEpO1xuICAgICAgICAgICAgZnJhYy5BZGQoYmV2ZWwsIG51bS53IC0gZGVsdGEgLyAyLCAoYmV2ZWwuZCAtIGJldmVsLmgpIC8gMiArIGEpO1xuICAgICAgICAgICAgZnJhYy5BZGQoZGVuLCBudW0udyArIGJldmVsLncgLSBkZWx0YSwgKGRlbi5kIC0gZGVuLmgpIC8gMiArIGEgLSBkZWx0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgVyA9IE1hdGgubWF4KG51bS53LCBkZW4udyk7XG4gICAgICAgICAgICB2YXIgdCA9IFV0aWwudGhpY2tuZXNzMmVtKHZhbHVlcy5saW5ldGhpY2tuZXNzLCB0aGlzLnNjYWxlKSAqIHRoaXMubXNjYWxlLCBwLCBxLCB1LCB2O1xuICAgICAgICAgICAgdmFyIG10ID0gVXRpbC5UZVgubWluX3J1bGVfdGhpY2tuZXNzIC8gVXRpbC5lbSAqIDEwMDA7XG4gICAgICAgICAgICBpZiAoaXNEaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgdSA9IFV0aWwuVGVYLm51bTE7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHUgPSAodCA9PT0gMCA/IFV0aWwuVGVYLm51bTMgOiBVdGlsLlRlWC5udW0yKTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdSAqPSBzY2FsZTtcbiAgICAgICAgICAgIHYgKj0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gNyA6IDMpICogVXRpbC5UZVgucnVsZV90aGlja25lc3MsIDIgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMudyA9IFc7XG4gICAgICAgICAgICAgICAgdCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDIgOiAwKSAqIG10ICsgdCwgdCAvIDIgKyAxLjUgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGEgKyB0IC8gMik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEgPSAoYSAtIHQgLyAyKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB2ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLkFkZChuZXcgQkJPWF9SRUNUKHQgLyAyLCB0IC8gMiwgVyArIDIgKiB0KSwgMCwgYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFjLkFsaWduKG51bSwgdmFsdWVzLm51bWFsaWduLCB0LCB1KTtcbiAgICAgICAgICAgIGZyYWMuQWxpZ24oZGVuLCB2YWx1ZXMuZGVub21hbGlnbiwgdCwgLXYpO1xuICAgICAgICB9XG4gICAgICAgIGZyYWMuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLkFkZChmcmFjLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy50ZXhXaXRoRGVsaW1zICYmICF0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLlggPSBVdGlsLlRlWC5udWxsZGVsaW1pdGVyc3BhY2UgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlLmNhbGwodGhpcywgc3ZnKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICByZXR1cm4gTUZyYWNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNR2x5cGhNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1HbHlwaE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1HbHlwaE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUdseXBoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBNR2x5cGhNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNTXVsdGlTY3JpcHRzTWl4aW4gPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1NdWx0aVNjcmlwdHNNaXhpbigpIHtcbiAgICAgICAgdGhpcy50b1NWRyA9IE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWQ7XG4gICAgfVxuICAgIHJldHVybiBNTXVsdGlTY3JpcHRzTWl4aW47XG59KSgpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNb01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW9NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNb01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW9NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgaWYgKEhXID09PSB2b2lkIDApIHsgSFcgPSBudWxsOyB9XG4gICAgICAgIGlmIChEID09PSB2b2lkIDApIHsgRCA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVkdzdHJldGNoVihIVywgRCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImxhcmdlb3BcIiwgXCJkaXNwbGF5c3R5bGVcIik7XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlRbdmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwiLWxhcmdlT3BcIiA6IFwiLXNtYWxsT3BcIl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpO1xuICAgICAgICB2YXIgaXNTY3JpcHQgPSAocGFyZW50ICYmIHBhcmVudC5pc2EodGhpcy5NTUwubXN1YnN1cCkgJiYgdGhpcyAhPT0gcGFyZW50LmRhdGFbMF0pO1xuICAgICAgICB2YXIgbWFwY2hhcnMgPSAoaXNTY3JpcHQgPyB0aGlzLnJlbWFwQ2hhcnMgOiBudWxsKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCA9PT0gMSAmJiBwYXJlbnQgJiYgcGFyZW50LmlzYSh0aGlzLk1NTC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2NyaXB0ICYmIHRoaXMuZGF0YS5qb2luKFwiXCIpLm1hdGNoKC9bJ2BcIlxcdTAwQjRcXHUyMDMyLVxcdTIwMzdcXHUyMDU3XS8pKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFtcIi1UZVgtdmFyaWFudFwiXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzY2FsZSwgdGhpcy5yZW1hcCwgbWFwY2hhcnMpLCB4ID0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IDAgJiYgLXRleHQubCA+IDEwICogdGV4dC53KSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gLXRleHQubDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0LCB4LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gdGV4dC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgc3ZnLnkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChzdmcuaCAtIHN2Zy5kKSAvIDIgLyBzY2FsZTtcbiAgICAgICAgICAgIGlmIChzdmcuciA+IHN2Zy53KSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLkdldChcInN0cmV0Y2h5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGMgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKGMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiBwYXJlbnQuaXNhKHRoaXMuTU1MLm11bmRlcm92ZXIpICYmXG4gICAgICAgICAgICB0aGlzLkNvcmVUZXh0KHBhcmVudC5kYXRhW3BhcmVudC5iYXNlXSkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgb3ZlciA9IHBhcmVudC5kYXRhW3BhcmVudC5vdmVyXSwgdW5kZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQudW5kZXJdO1xuICAgICAgICAgICAgaWYgKG92ZXIgJiYgdGhpcyA9PT0gb3Zlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50XCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UW2NdIHx8IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBjID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlRVTkRFUltjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGMgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5ERUxJTUlURVJTW2MuY2hhckNvZGVBdCgwKV07XG4gICAgICAgIHZhciBjYW4gPSAoYyAmJiBjLmRpciA9PSBkaXJlY3Rpb24uc3Vic3RyKDAsIDEpKTtcbiAgICAgICAgaWYgKCFjYW4pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN2ZztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZvcmNlU3RyZXRjaCA9IGNhbiAmJiAodGhpcy5HZXQoXCJtaW5zaXplXCIsIHRydWUpIHx8IHRoaXMuR2V0KFwibWF4c2l6ZVwiLCB0cnVlKSk7XG4gICAgICAgIHJldHVybiBjYW47XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInN5bW1ldHJpY1wiLCBcIm1heHNpemVcIiwgXCJtaW5zaXplXCIpO1xuICAgICAgICB2YXIgYXhpcyA9IFV0aWwuVGVYLmF4aXNfaGVpZ2h0ICogc3ZnLnNjYWxlLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKSwgSDtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAyICogTWF0aC5tYXgoaCAtIGF4aXMsIGQgKyBheGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSBoICsgZDtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMubWF4c2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5tYXhzaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcuaCArIHN2Zy5kKTtcbiAgICAgICAgSCA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgSCkpO1xuICAgICAgICBpZiAoSCAhPSB2YWx1ZXMubWluc2l6ZSkge1xuICAgICAgICAgICAgSCA9IFtNYXRoLm1heChIICogVXRpbC5UZVguZGVsaW1pdGVyZmFjdG9yIC8gMTAwMCwgSCAtIFV0aWwuVGVYLmRlbGltaXRlcnNob3J0ZmFsbCksIEhdO1xuICAgICAgICB9XG4gICAgICAgIHN2ZyA9IEVkaXRhYmxlU1ZHLmNyZWF0ZURlbGltaXRlcih0aGlzLmRhdGEuam9pbihcIlwiKS5jaGFyQ29kZUF0KDApLCBILCBzdmcuc2NhbGUpO1xuICAgICAgICBpZiAodmFsdWVzLnN5bW1ldHJpYykge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAvIDIgKyBheGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSCA9IChzdmcuaCArIHN2Zy5kKSAqIGggLyAoaCArIGQpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy55ID0gSCAtIHN2Zy5oO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNb01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnN2ZyB8fCB0aGlzLnRvU1ZHKCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiLCBcIm1hdGh2YXJpYW50XCIsIFwiZm9udHdlaWdodFwiKTtcbiAgICAgICAgaWYgKCh2YWx1ZXMuZm9udHdlaWdodCA9PT0gXCJib2xkXCIgfHwgcGFyc2VJbnQodmFsdWVzLmZvbnR3ZWlnaHQpID49IDYwMCkgJiZcbiAgICAgICAgICAgICF0aGlzLkdldChcIm1hdGh2YXJpYW50XCIsIHRydWUpKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHZhcmlhbnQgPSB0aGlzLk1NTC5WQVJJQU5ULkJPTEQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdmFsdWVzLm1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWluc2l6ZSwgbXUsIHN2Zy53KTtcbiAgICAgICAgdyA9IE1hdGgubWF4KHZhbHVlcy5taW5zaXplLCBNYXRoLm1pbih2YWx1ZXMubWF4c2l6ZSwgdykpO1xuICAgICAgICBzdmcgPSBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgdywgc3ZnLnNjYWxlLCB2YWx1ZXMubWF0aHZhcmlhbnQpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgc3ZnLnN0cmV0Y2hlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTW9NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNUGFkZGVkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUGFkZGVkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBhZGRlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChIVywgRCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIHBhZCA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKDAsIEhXLCBEKSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJoZWlnaHRcIiwgXCJkZXB0aFwiLCBcIndpZHRoXCIsIFwibHNwYWNlXCIsIFwidm9mZnNldFwiKSwgWCA9IDAsIFkgPSAwO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBYID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMubHNwYWNlLCBtdSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLnZvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICBZID0gdGhpcy5TVkdsZW5ndGgyZW0ocGFkLCB2YWx1ZXMudm9mZnNldCwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGggPSBwYWQuaCwgZCA9IHBhZC5kLCB3ID0gcGFkLncsIHkgPSBwYWQueTtcbiAgICAgICAgICAgIHN2Zy5BZGQocGFkLCBYLCBZKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgc3ZnLmggPSBoICsgeTtcbiAgICAgICAgICAgIHN2Zy5kID0gZCAtIHk7XG4gICAgICAgICAgICBzdmcudyA9IHc7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHZhbHVlcy5oZWlnaHQgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuaCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmhlaWdodCwgbXUsIFwiaFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuZGVwdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcuZCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLmRlcHRoLCBtdSwgXCJkXCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy53aWR0aCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHN2Zy53ID0gdGhpcy5TVkdsZW5ndGgyZW0oc3ZnLCB2YWx1ZXMud2lkdGgsIG11LCBcIndcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ZnLmggPiBzdmcuSCkge1xuICAgICAgICAgICAgICAgIHN2Zy5IID0gc3ZnLmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoc3ZnLmQgPiBzdmcuRCkge1xuICAgICAgICAgICAgICAgIHN2Zy5EID0gc3ZnLmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUGFkZGVkTWl4aW4ucHJvdG90eXBlLlNWR2xlbmd0aDJlbSA9IGZ1bmN0aW9uIChzdmcsIGxlbmd0aCwgbXUsIGQsIG0pIHtcbiAgICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbSA9IC1VdGlsLkJJR0RJTUVOO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtYXRjaCA9IFN0cmluZyhsZW5ndGgpLm1hdGNoKC93aWR0aHxoZWlnaHR8ZGVwdGgvKTtcbiAgICAgICAgdmFyIHNpemUgPSAobWF0Y2ggPyBzdmdbbWF0Y2hbMF0uY2hhckF0KDApXSA6IChkID8gc3ZnW2RdIDogMCkpO1xuICAgICAgICB2YXIgdiA9IFV0aWwubGVuZ3RoMmVtKGxlbmd0aCwgbXUsIHNpemUgLyB0aGlzLm1zY2FsZSkgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgaWYgKGQgJiYgU3RyaW5nKGxlbmd0aCkubWF0Y2goL15cXHMqWy0rXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5tYXgobSwgc3ZnW2RdICsgdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE1QYWRkZWRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNUGhhbnRvbU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBoYW50b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUGhhbnRvbU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVBoYW50b21NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICB3aGlsZSAoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnJlbW92ZUNoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICBpZiAoc3ZnLnJlbW92ZWFibGUgJiYgIXN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1QaGFudG9tTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVNxcnRNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TcXJ0TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNxcnRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCksIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5TVkdjaGlsZFNWRygwKSwgcnVsZSwgc3VyZDtcbiAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlLCBwLCBxLCBILCB4ID0gMDtcbiAgICAgICAgaWYgKHRoaXMuR2V0KFwiZGlzcGxheXN0eWxlXCIpKSB7XG4gICAgICAgICAgICBwID0gVXRpbC5UZVgueF9oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSB0O1xuICAgICAgICB9XG4gICAgICAgIHEgPSBNYXRoLm1heCh0ICsgcCAvIDQsIDEwMDAgKiBVdGlsLlRlWC5taW5fcm9vdF9zcGFjZSAvIFV0aWwuZW0pO1xuICAgICAgICBIID0gYmFzZS5oICsgYmFzZS5kICsgcSArIHQ7XG4gICAgICAgIHN1cmQgPSBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIoMHgyMjFBLCBILCBzY2FsZSk7XG4gICAgICAgIGlmIChzdXJkLmggKyBzdXJkLmQgPiBIKSB7XG4gICAgICAgICAgICBxID0gKChzdXJkLmggKyBzdXJkLmQpIC0gKEggLSB0KSkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGUgPSBuZXcgQkJPWF9SRUNUKHQsIDAsIGJhc2Uudyk7XG4gICAgICAgIEggPSBiYXNlLmggKyBxICsgdDtcbiAgICAgICAgeCA9IHRoaXMuU1ZHYWRkUm9vdChzdmcsIHN1cmQsIHgsIHN1cmQuaCArIHN1cmQuZCAtIEgsIHNjYWxlKTtcbiAgICAgICAgc3ZnLkFkZChzdXJkLCB4LCBIIC0gc3VyZC5oKTtcbiAgICAgICAgc3ZnLkFkZChydWxlLCB4ICsgc3VyZC53LCBIIC0gcnVsZS5oKTtcbiAgICAgICAgc3ZnLkFkZChiYXNlLCB4ICsgc3VyZC53LCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5oICs9IHQ7XG4gICAgICAgIHN2Zy5IICs9IHQ7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVNxcnRNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH07XG4gICAgcmV0dXJuIE1TcXJ0TWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibXNxcnRfbWl4aW4udHNcIiAvPlxudmFyIE1Sb290TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm9vdE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1Sb290TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnRvU1ZHID0gTVNxcnRNaXhpbi50b1NWRztcbiAgICB9XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHYWRkUm9vdCA9IGZ1bmN0aW9uIChzdmcsIHN1cmQsIHgsIGQsIHNjYWxlKSB7XG4gICAgICAgIHZhciBkeCA9IChzdXJkLmlzTXVsdGlDaGFyID8gLjU1IDogLjY1KSAqIHN1cmQudztcbiAgICAgICAgaWYgKHRoaXMuZGF0YVsxXSkge1xuICAgICAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmRhdGFbMV0udG9TVkcoKTtcbiAgICAgICAgICAgIHJvb3QueCA9IDA7XG4gICAgICAgICAgICB2YXIgaCA9IHRoaXMuU1ZHcm9vdEhlaWdodChzdXJkLmggKyBzdXJkLmQsIHNjYWxlLCByb290KSAtIGQ7XG4gICAgICAgICAgICB2YXIgdyA9IE1hdGgubWluKHJvb3Qudywgcm9vdC5yKTtcbiAgICAgICAgICAgIHggPSBNYXRoLm1heCh3LCBkeCk7XG4gICAgICAgICAgICBzdmcuQWRkKHJvb3QsIHggLSB3LCBoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGR4ID0geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCAtIGR4O1xuICAgIH07XG4gICAgTVJvb3RNaXhpbi5wcm90b3R5cGUuU1ZHcm9vdEhlaWdodCA9IGZ1bmN0aW9uIChkLCBzY2FsZSwgcm9vdCkge1xuICAgICAgICByZXR1cm4gLjQ1ICogKGQgLSA5MDAgKiBzY2FsZSkgKyA2MDAgKiBzY2FsZSArIE1hdGgubWF4KDAsIHJvb3QuZCAtIDc1KTtcbiAgICB9O1xuICAgIHJldHVybiBNUm9vdE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2VkaXRhYmxlX3N2Z19jb25maWcudHNcIiAvPlxudmFyIE1Sb3dNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1Sb3dNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm93TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZm9jdXMhJyk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKGgsIGQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX1JPVyh0aGlzLnN2ZywgdGhpcy5odWIpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmIChkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5zaCA9IGg7XG4gICAgICAgICAgICBzdmcuc2QgPSBkO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5TdHJldGNoKCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLnNrZXcpIHtcbiAgICAgICAgICAgICAgICBzdmcuc2tldyA9IGRhdGEuc2tldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdsaW5lQnJlYWtzKHN2ZykpIHtcbiAgICAgICAgICAgIHN2ZyA9IHRoaXMuU1ZHbXVsdGlsaW5lKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR2xpbmVCcmVha3MgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy5wYXJlbnQubGluZWJyZWFrQ29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChFZGl0YWJsZVNWR0NvbmZpZy5jb25maWcubGluZWJyZWFrcy5hdXRvbWF0aWMgJiZcbiAgICAgICAgICAgIHN2Zy53ID4gdGhpcy5FZGl0YWJsZVNWRy5saW5lYnJlYWtXaWR0aCkgfHwgdGhpcy5oYXNOZXdsaW5lKCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR211bHRpbGluZSA9IGZ1bmN0aW9uIChzcGFuKSB7XG4gICAgICAgIHRoaXMuTU1MLm1iYXNlLlNWR2F1dG9sb2FkRmlsZShcIm11bHRpbGluZVwiKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1hfUk9XKHRoaXMuRWRpdGFibGVTVkcsIHRoaXMuaHViKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoaSwgdyksIHN2Zy53LCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvd01peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1zTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1zTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnRvU1ZHID0gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZDtcbiAgICB9XG4gICAgcmV0dXJuIE1zTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVNwYWNlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3BhY2VNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3BhY2VNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TcGFjZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiKTtcbiAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5tYXRoYmFja2dyb3VuZDtcbiAgICAgICAgaWYgKHRoaXMuYmFja2dyb3VuZCAmJiAhdGhpcy5tYXRoYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGhiYWNrZ3JvdW5kID0gdGhpcy5iYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLm1zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHN2Zy5oID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmhlaWdodCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy5kID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLmRlcHRoLCBtdSkgKiBzY2FsZTtcbiAgICAgICAgc3ZnLncgPSBzdmcuciA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy53aWR0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIGlmIChzdmcudyA8IDApIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLnc7XG4gICAgICAgICAgICBzdmcudyA9IHN2Zy5yID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmggPCAtc3ZnLmQpIHtcbiAgICAgICAgICAgIHN2Zy5kID0gLXN2Zy5oO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5sID0gMDtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1TcGFjZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1TdHlsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN0eWxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVN0eWxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVswXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgICAgICB2YXIgbWF0aCA9IHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgICAgICBpZiAobWF0aC5pYykge1xuICAgICAgICAgICAgICAgIHN2Zy5pYyA9IG1hdGguaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmRhdGFbMF0gIT0gbnVsbCA/IHRoaXMuZGF0YVswXS5TVkdzdHJldGNoSCh3KSA6IEJCT1guTlVMTCgpKTtcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBCQk9YLk5VTEwoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTVN0eWxlTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVN1YlN1cE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVN1YlN1cE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdWJTdXBNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1TdWJTdXBNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpLCBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgIHZhciBiYXNlID0gc3ZnLkFkZCh0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCh0aGlzLmJhc2UsIEhXLCBEKSk7XG4gICAgICAgIHZhciBzc2NhbGUgPSAodGhpcy5kYXRhW3RoaXMuc3VwXSB8fCB0aGlzLmRhdGFbdGhpcy5zdWJdIHx8IHRoaXMpLlNWR2dldFNjYWxlKCk7XG4gICAgICAgIHZhciB4X2hlaWdodCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGUsIHMgPSBVdGlsLlRlWC5zY3JpcHRzcGFjZSAqIHNjYWxlO1xuICAgICAgICB2YXIgc3VwLCBzdWI7XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1cF0pKSB7XG4gICAgICAgICAgICBzdXAgPSB0aGlzLmRhdGFbdGhpcy5zdXBdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdXAudyArPSBzO1xuICAgICAgICAgICAgc3VwLnIgPSBNYXRoLm1heChzdXAudywgc3VwLnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLlNWR25vdEVtcHR5KHRoaXMuZGF0YVt0aGlzLnN1Yl0pKSB7XG4gICAgICAgICAgICBzdWIgPSB0aGlzLmRhdGFbdGhpcy5zdWJdLnRvU1ZHKCk7XG4gICAgICAgICAgICBzdWIudyArPSBzO1xuICAgICAgICAgICAgc3ViLnIgPSBNYXRoLm1heChzdWIudywgc3ViLnIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBxID0gVXRpbC5UZVguc3VwX2Ryb3AgKiBzc2NhbGUsIHIgPSBVdGlsLlRlWC5zdWJfZHJvcCAqIHNzY2FsZTtcbiAgICAgICAgdmFyIHUgPSBiYXNlLmggKyAoYmFzZS55IHx8IDApIC0gcSwgdiA9IGJhc2UuZCAtIChiYXNlLnkgfHwgMCkgKyByLCBkZWx0YSA9IDAsIHA7XG4gICAgICAgIGlmIChiYXNlLmljKSB7XG4gICAgICAgICAgICBiYXNlLncgLT0gYmFzZS5pYztcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhW3RoaXMuYmFzZV0gJiZcbiAgICAgICAgICAgICh0aGlzLmRhdGFbdGhpcy5iYXNlXS50eXBlID09PSBcIm1pXCIgfHwgdGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtb1wiKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdLmRhdGEuam9pbihcIlwiKS5sZW5ndGggPT09IDEgJiYgYmFzZS5zY2FsZSA9PT0gMSAmJlxuICAgICAgICAgICAgICAgICFiYXNlLnN0cmV0Y2hlZCAmJiAhdGhpcy5kYXRhW3RoaXMuYmFzZV0uR2V0KFwibGFyZ2VvcFwiKSkge1xuICAgICAgICAgICAgICAgIHUgPSB2ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgbWluID0gdGhpcy5nZXRWYWx1ZXMoXCJzdWJzY3JpcHRzaGlmdFwiLCBcInN1cGVyc2NyaXB0c2hpZnRcIik7XG4gICAgICAgIG1pbi5zdWJzY3JpcHRzaGlmdCA9IChtaW4uc3Vic2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1YnNjcmlwdHNoaWZ0LCBtdSkpO1xuICAgICAgICBtaW4uc3VwZXJzY3JpcHRzaGlmdCA9IChtaW4uc3VwZXJzY3JpcHRzaGlmdCA9PT0gXCJcIiA/IDAgOiBVdGlsLmxlbmd0aDJlbShtaW4uc3VwZXJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgdmFyIHggPSBiYXNlLncgKyBiYXNlLng7XG4gICAgICAgIGlmICghc3VwKSB7XG4gICAgICAgICAgICBpZiAoc3ViKSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjEgKiBzY2FsZSwgc3ViLmggLSAoNCAvIDUpICogeF9oZWlnaHQsIG1pbi5zdWJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdWIsIHgsIC12KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC12O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFzdWIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcInRleHByaW1lc3R5bGVcIik7XG4gICAgICAgICAgICAgICAgcCA9IFV0aWwuVGVYWyh2YWx1ZXMuZGlzcGxheXN0eWxlID8gXCJzdXAxXCIgOiAodmFsdWVzLnRleHByaW1lc3R5bGUgPyBcInN1cDNcIiA6IFwic3VwMlwiKSldO1xuICAgICAgICAgICAgICAgIHUgPSBNYXRoLm1heCh1LCBwICogc2NhbGUsIHN1cC5kICsgKDEgLyA0KSAqIHhfaGVpZ2h0LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgdSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IHU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2ID0gTWF0aC5tYXgodiwgVXRpbC5UZVguc3ViMiAqIHNjYWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogc2NhbGU7XG4gICAgICAgICAgICAgICAgaWYgKCh1IC0gc3VwLmQpIC0gKHN1Yi5oIC0gdikgPCAzICogdCkge1xuICAgICAgICAgICAgICAgICAgICB2ID0gMyAqIHQgLSB1ICsgc3VwLmQgKyBzdWIuaDtcbiAgICAgICAgICAgICAgICAgICAgcSA9ICg0IC8gNSkgKiB4X2hlaWdodCAtICh1IC0gc3VwLmQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHUgKz0gcTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgLT0gcTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1cCwgeCArIGRlbHRhLCBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHggPSBkZWx0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdXBdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IE1hdGgubWF4KHUsIG1pbi5zdXBlcnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5zdWJdLkVkaXRhYmxlU1ZHZGF0YS5keSA9IC1NYXRoLm1heCh2LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3ViU3VwTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVRhYmxlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGFibGVNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGFibGVNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMudG9TVkcgPSBNQmFzZU1peGluLlNWR2F1dG9sb2FkO1xuICAgIH1cbiAgICByZXR1cm4gTVRhYmxlTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vYmJveC90ZXh0LnRzXCIgLz5cbnZhciBNVGV4dE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRleHRNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVGV4dE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVRleHRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChFZGl0YWJsZVNWR0NvbmZpZy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IEJCT1goKTtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgICAgICB2YXIgZGVmID0geyBkaXJlY3Rpb246IHRoaXMuR2V0KFwiZGlyXCIpIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfVEVYVCh0aGlzLkhUTUwsIHNjYWxlICogMTAwIC8gRWRpdGFibGVTVkdDb25maWcuY29uZmlnLnNjYWxlLCB0aGlzLmRhdGEuam9pbihcIlwiKSwgZGVmKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVVBFUihhcmd1bWVudHMpLnRvU1ZHLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGV4dE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2Jib3gvZy50c1wiIC8+XG52YXIgTVVuZGVyT3Zlck1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVVuZGVyT3Zlck1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1VbmRlck92ZXJNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1VbmRlck92ZXJNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiZGlzcGxheXN0eWxlXCIsIFwiYWNjZW50XCIsIFwiYWNjZW50dW5kZXJcIiwgXCJhbGlnblwiKTtcbiAgICAgICAgaWYgKCF2YWx1ZXMuZGlzcGxheXN0eWxlICYmIHRoaXMuZGF0YVt0aGlzLmJhc2VdICE9IG51bGwgJiZcbiAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLmJhc2VdLkNvcmVNTygpLkdldChcIm1vdmFibGVsaW1pdHNcIikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLk1NTC5tc3Vic3VwLnByb3RvdHlwZS50b1NWRy5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdmcgPSBuZXcgQkJPWCgpO1xuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIGJveGVzID0gW10sIHN0cmV0Y2ggPSBbXSwgYm94LCBpLCBtLCBXID0gLVV0aWwuQklHRElNRU4sIFdXID0gVztcbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMuYmFzZSkge1xuICAgICAgICAgICAgICAgICAgICBib3hlc1tpXSA9IHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIEhXLCBEKTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IChEICE9IG51bGwgfHwgSFcgPT0gbnVsbCkgJiYgdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0udG9TVkcoKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICBzdHJldGNoW2ldID0gdGhpcy5kYXRhW2ldLlNWR2NhblN0cmV0Y2goXCJIb3Jpem9udGFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYm94ZXNbaV0udyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgIFdXID0gYm94ZXNbaV0udztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJldGNoW2ldICYmIFdXID4gVykge1xuICAgICAgICAgICAgICAgICAgICBXID0gV1c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChEID09IG51bGwgJiYgSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgVyA9IEhXO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFcgPT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIFcgPSBXVztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBXVyA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmV0Y2hbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLmRhdGFbaV0uU1ZHc3RyZXRjaEgoVyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGJveGVzW2ldLlg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgdmFyIGJhc2UgPSBib3hlc1t0aGlzLmJhc2VdIHx8IHtcbiAgICAgICAgICAgIHc6IDAsXG4gICAgICAgICAgICBoOiAwLFxuICAgICAgICAgICAgZDogMCxcbiAgICAgICAgICAgIEg6IDAsXG4gICAgICAgICAgICBEOiAwLFxuICAgICAgICAgICAgbDogMCxcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHNjYWxlXG4gICAgICAgIH07XG4gICAgICAgIHZhciB4LCB5LCB6MSwgejIsIHozLCBkdywgaywgZGVsdGEgPSAwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgZGVsdGEgPSAxLjMgKiBiYXNlLmljICsgLjA1O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBib3ggPSBib3hlc1tpXTtcbiAgICAgICAgICAgICAgICB6MyA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nNSAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIHZhciBhY2NlbnQgPSAoaSAhPSB0aGlzLmJhc2UgJiYgdmFsdWVzW3RoaXMuQUNDRU5UU1tpXV0pO1xuICAgICAgICAgICAgICAgIGlmIChhY2NlbnQgJiYgYm94LncgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBib3gueCA9IC1ib3gubDtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSAobmV3IEJCT1hfRygpKS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWFibGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMuSFVCKTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2Jib3gvbnVsbFwiIC8+XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNlbWFudGljc01peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIFRlWEF0b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFRlWEF0b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBUZVhBdG9tTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IHRoaXMuTU1MLlRFWENMQVNTLlZDRU5URVIpIHtcbiAgICAgICAgICAgICAgICB5ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoYm94LmggKyBib3guZCkgLyAyICsgYm94LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKGJveCwgMCwgeSk7XG4gICAgICAgICAgICBzdmcuaWMgPSBib3guaWM7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGJveC5za2V3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIFRlWEF0b21NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9