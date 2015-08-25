var EditableSVGConfig = (function () {
    function EditableSVGConfig() {
        this.config = {
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
    }
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
        this.SVGNS = "http://www.w3.org/2000/svg";
        this.XLINKNS = "http://www.w3.org/1999/xlink";
        this.config = EditableSVGConfig.config;
        this.hideProcessedMath = true;
        this.fontNames = ["TeX", "STIX", "STIX-Web", "Asana-Math",
            "Gyre-Termes", "Gyre-Pagella", "Latin-Modern", "Neo-Euler"];
        this.TextNode = this.HTML.TextNode;
        this.addText = this.HTML.addText;
        this.ucMatch = this.HTML.ucMatch;
        this.HUB.Register.StartupHook("mml Jax Ready", function () {
            MML = MathJax.ElementJax.mml;
            this.MML.mbase.Augment(MBaseMixin.getMethods());
            this.MML.chars.Augment(CharsMixin.getMethods());
            this.MML.entity.Augment(EntityMixin.getMethods());
            this.MML.mo.Augment(MoMixin.getMethods());
            this.MML.mtext.Augment(MTextMixin.getMethods());
            this.MML.merror.Augment(MErrorMixin.getMethods());
            this.MML.ms.Augment(MsMixin.getMethods());
            this.MML.mglyph.Augment(MGlyphMixin.getMethods());
            this.MML.mspace.Augment(MSpaceMixin.getMethods());
            this.MML.mphantom.Augment(MPhantomMixin.getMethods());
            this.MML.mpadded.Augment(MPaddedMixin.getMethods());
            this.MML.mrow.Augment(MRowMixin.getMethods());
            this.MML.mstyle.Augment(MStyleMixin.getMethods());
            this.MML.mfrac.Augment(MFracMixin.getMethods());
            this.MML.msqrt.Augment(MSqrtMixin.getMethods());
            this.MML.mroot.Augment(MRootMixin.getMethods());
            this.MML.mfenced.Augment(MFencedMixin.getMethods());
            this.MML.menclose.Augment(MEncloseMixin.getMethods());
            this.MML.maction.Augment(MActionMixin.getMethods());
            this.MML.semantics.Augment(SemanticsMixin.getMethods());
            this.MML.munderover.Augment(MUnderOverMixin.getMethods());
            this.MML.msubsup.Augment(MSubSupMixin.getMethods());
            this.MML.mmultiscripts.Augment(MMultiScriptsMixin.getMethods());
            this.MML.mtable.Augment(MTableMixin.getMethods());
            this.MML.math.Augment(MathMixin.getMethods());
            this.MML.TeXAtom.Augment(TeXAtomMixin.getMethods());
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
        this.Mousedown = function (event) {
            console.log('got mousedown!');
            var svg = $(event.target).closest('svg').get()[0];
            if (!svg)
                return;
            var pt = svg.createSVGPoint();
            var offset = svg.getBoundingClientRect();
            pt.x = event.clientX;
            pt.y = event.clientY;
            console.log('click in client coords: ', event.clientX, event.clientY);
            var cp = pt.matrixTransform(svg.getScreenCTM().inverse());
            console.log('cp: ', cp.x, cp.y);
            jax = MathJax.Hub.getAllJax('#' + event.target.parentElement.id)[0];
            var nodes = this.getNodesAsFlatList(jax.root);
            var ncp = this.nodeContainsPoint.bind(this);
            var matchingNodes = _.filter(nodes, function (node) {
                return ncp(svg, node, cp);
            });
            console.log('matching nodes: ', matchingNodes);
            _.each(matchingNodes, function (node) {
                console.log(node.type, node);
            });
        };
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
        this.pxPerInch = div.offsetWidth / 5;
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
    EditableSVG.prototype.hashCheck = function (target) {
        if (target && target.nodeName.toLowerCase() === "g") {
            do {
                target = target.parentNode;
            } while (target && target.firstChild.nodeName !== "svg");
        }
        return target;
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
    EditableSVG.prototype.getPadding = function (styles) {
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
                    padding[id] = this.length2em(pad);
                    has = true;
                }
            }
        }
        return (has ? padding : false);
    };
    EditableSVG.prototype.getBorders = function (styles) {
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
                    border[id] = this.length2em(styles[ID + "Width"]);
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
    EditableSVG.prototype.Element = function (type, def) {
        var obj = (typeof (type) === "string" ? document.createElementNS(SVGNS, type) : type);
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
    EditableSVG.prototype.addElement = function (parent, type, def) {
        return parent.appendChild(this.Element(type, def));
    };
    EditableSVG.prototype.HandleVariant = function (variant, scale, text) {
        var svg = new BBOX_G();
        var n, N, c, font, VARIANT, i, m, id, M, RANGES;
        if (!variant) {
            variant = this.FONTDATA.VARIANT[MML.VARIANT.NORMAL];
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
                var box = new BBOX_TEXT(scale * 100 / SVG.config.scale, c, {
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
    EditableSVG.prototype.lookupChar = function (variant, n) {
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
    EditableSVG.prototype.findBlock = function (font, c) {
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
    EditableSVG.prototype.loadFont = function (file) {
        this.HUB.RestartAfter(AJAX.Require(this.fontDir + "/" + file));
    };
    EditableSVG.prototype.createDelimiter = function (code, HW, scale, font) {
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
                });
            }
        }
        if (delim.stretch) {
            this["extendDelimiter" + delim.dir](svg, hw, delim.stretch, scale, font);
        }
        return svg;
    };
    EditableSVG.prototype.createChar = function (scale, data, font) {
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
    EditableSVG.prototype.extendDelimiterV = function (svg, H, delim, scale, font) {
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
    EditableSVG.prototype.extendDelimiterH = function (svg, W, delim, scale, font) {
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
    Util.prototype.Fixed = function (m, n) {
        if (Math.abs(m) < 0.0006) {
            return "0";
        }
        return m.toFixed(n || 3).replace(/\.?0+$/, "");
    };
    Util.length2em = function (length, mu, size) {
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
        var emFactor = (this.zoomScale || 1) / Util.em;
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
            return m * Util.TeX.x_height / 1000;
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
    Util.thickness2em = function (length, mu) {
        var thick = Util.TeX.rule_thickness;
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
    function BBOX(HUB, def) {
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
        this.HUB = hub;
        if (this.type) {
            this.element = EditableSVG.Element(this.type, def);
        }
    }
    BBOX.prototype.With = function (def) {
        return this.HUB.Insert(this, def);
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
    function BBOX_FRAME(h, d, w, t, dash, color, def) {
        this.type = "rect";
        this.removeable = false;
        if (def == null) {
            def = {};
        }
        ;
        def.fill = "none";
        def["stroke-width"] = SVG.Fixed(t, 2);
        def.width = Math.floor(w - t);
        def.height = Math.floor(h + d - t);
        def.transform = "translate(" + Math.floor(t / 2) + "," + Math.floor(-d + t / 2) + ")";
        if (dash === "dashed") {
            def["stroke-dasharray"] = [Math.floor(6 * SVG.em), Math.floor(6 * SVG.em)].join(" ");
        }
        _super.call(this, def);
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
    function BBOX_GLYPH(scale, id, h, d, w, l, r, p) {
        this.type = "path";
        this.removeable = false;
        var def, t = SVG.config.blacker;
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
            _super.call(this, def);
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
            this.element.setAttributeNS(XLINKNS, "href", "#" + id);
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
        def["stroke-width"] = SVG.Fixed(t, 2);
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
    function BBOX_TEXT(scale, text, def) {
        this.type = "text";
        this.removeable = false;
        if (!def) {
            def = {};
        }
        ;
        def.stroke = "none";
        if (def["font-style"] === "")
            delete def["font-style"];
        if (def["font-weight"] === "")
            delete def["font-weight"];
        _super.call(this, def);
        SVG.addText(this.element, text);
        SVG.textSVG.appendChild(this.element);
        var bbox = this.element.getBBox();
        SVG.textSVG.removeChild(this.element);
        scale *= 1000 / SVG.em;
        this.element.setAttribute("transform", "scale(" + SVG.Fixed(scale) + ") matrix(1 0 0 -1 0 0)");
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
        def["stroke-width"] = SVG.Fixed(t, 2);
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
var MBaseMixin = (function () {
    function MBaseMixin() {
        this.SVG = BBOX;
    }
    MBaseMixin.prototype.getBB = function (relativeTo) {
        var elem = this.EditableSVGelem;
        if (!elem) {
            console.log('Oh no! Couldn\'t find elem for this');
            return;
        }
        return elem.getBBox();
    };
    MBaseMixin.getMethods = function () {
    };
    MBaseMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var variant = this.SVGgetVariant();
        var svg = new this.SVG();
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
        return (this.data[i] ? this.data[i].toSVG() : new BBOX(this.HUB));
    };
    MBaseMixin.prototype.EditableSVGdataStretched = function (i, HW, D) {
        this.EditableSVGdata = {
            HW: HW,
            D: D
        };
        if (!this.data[i]) {
            return new BBOX(this.HUB);
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
            a.setAttributeNS(XLINKNS, "href", this.href);
            a.onclick = this.SVGlink;
            EditableSVG.addElement(a, "rect", {
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
        if (EditableSVG.config.addMMLclasses) {
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
            var target = EditableSVG.hashCheck(document.getElementById(href.substr(1)));
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
            var span = HTML.Element("span");
            span.style.cssText = this.style;
            this.styles = this.SVGprocessStyles(span.style);
        }
    };
    MBaseMixin.prototype.SVGprocessStyles = function (style) {
        var styles = {
            border: EditableSVG.getBorders(style),
            padding: EditableSVG.getPadding(style)
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
                var g = EditableSVG.Element("g");
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
        this.HUB.RestartAfter(AJAX.Require(file));
    };
    MBaseMixin.prototype.SVGautoloadFile = function (name) {
        var file = EditableSVG.autoloadDir + "/" + name + ".js";
        this.HUB.RestartAfter(AJAX.Require(file));
    };
    return MBaseMixin;
})();
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
        var CONFIG = this.SVG.config;
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
            style: this.SVG.config.merrorStyle
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
        this.SVG = BBOX_ROW;
    }
    MFencedMixin.prototype.toSVG = function () {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
        console.log('mfrac toSVG called!');
        this.SVGgetStyles();
        var svg = new this.SVG();
        var scale = this.SVGgetScale(svg);
        var frac = new BBOX(this.HUB);
        frac.scale = svg.scale;
        this.SVGhandleSpace(frac);
        var num = this.SVGchildSVG(0), den = this.SVGchildSVG(1);
        var values = this.getValues("displaystyle", "linethickness", "numalign", "denomalign", "bevelled");
        var isDisplay = values.displaystyle;
        var a = Util.TeX.axis_height * scale;
        if (values.bevelled) {
            var delta = (isDisplay ? 400 : 150);
            var H = Math.max(num.h + num.d, den.h + den.d) + 2 * delta;
            var bevel = this.SVG.createDelimiter(0x2F, H);
            frac.Add(num, 0, (num.d - num.h) / 2 + a + delta);
            frac.Add(bevel, num.w - delta / 2, (bevel.d - bevel.h) / 2 + a);
            frac.Add(den, num.w + bevel.w - delta, (den.d - den.h) / 2 + a - delta);
        }
        else {
            var W = Math.max(num.w, den.w);
            var t = this.SVG.thickness2em(values.linethickness, this.scale) * this.mscale, p, q, u, v;
            var mt = Util.TeX.min_rule_thickness / this.SVG.em * 1000;
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
        this.SVGgetStyles();
        var svg = this.svg = new this.SVG();
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
            return this.EditableSVG.strechH(HW);
        }
        var variant = this.SVGgetVariant();
        var values = this.getValues("largeop", "displaystyle");
        if (values.largeop) {
            variant = EditableSVG.FONTDATA.VARIANT[values.displaystyle ? "-largeOp" : "-smallOp"];
        }
        var parent = this.CoreParent(), isScript = (parent && parent.isa(MML.msubsup) && this !== parent.data[0]), mapchars = (isScript ? this.remapChars : null);
        if (this.data.join("").length === 1 && parent && parent.isa(MML.munderover) &&
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
        if (parent && parent.isa(MML.munderover) &&
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
var MRowMixin = (function (_super) {
    __extends(MRowMixin, _super);
    function MRowMixin() {
        _super.apply(this, arguments);
        this.SVG = BBOX_ROW;
    }
    MRowMixin.prototype.focus = function () {
        console.log('focus!');
    };
    MRowMixin.prototype.toSVG = function (h, d) {
        this.SVGgetStyles();
        var svg = new this.SVG();
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
        return (SVG.config.linebreaks.automatic &&
            svg.w > this.SVG.linebreakWidth) || this.hasNewline();
    };
    MRowMixin.prototype.SVGmultiline = function (span) {
        this.MML.mbase.SVGautoloadFile("multiline");
    };
    MRowMixin.prototype.SVGstretchH = function (w) {
        var svg = new this.SVG();
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
var MTextMixin = (function (_super) {
    __extends(MTextMixin, _super);
    function MTextMixin() {
        _super.apply(this, arguments);
    }
    MTextMixin.prototype.toSVG = function () {
        if (SVG.config.mtextFontInherit || this.Parent().type === "merror") {
            this.SVGgetStyles();
            var svg = new this.SVG(), scale = this.SVGgetScale(svg);
            this.SVGhandleSpace(svg);
            var variant = this.SVGgetVariant(), def = {
                direction: this.Get("dir")
            };
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
            svg.Add(BBOX.TEXT(scale * 100 / this.SVG.config.scale, this.data.join(""), def));
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
        var svg = new this.SVG(), scale = this.SVGgetScale(svg);
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
                    boxes[i] = BBOX.G().With({
                        removeable: false
                    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRzX2J1aWxkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWxsLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEVkaXRhYmxlU1ZHQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFZGl0YWJsZVNWR0NvbmZpZygpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSB7XG4gICAgICAgICAgICBzdHlsZXM6IHtcbiAgICAgICAgICAgICAgICBcIi5NYXRoSmF4X1NWR1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGlzcGxheVwiOiBcImlubGluZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc3R5bGVcIjogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXdlaWdodFwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmUtaGVpZ2h0XCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiMTAwJVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZvbnQtc2l6ZS1hZGp1c3RcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidGV4dC1pbmRlbnRcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0LWFsaWduXCI6IFwibGVmdFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRleHQtdHJhbnNmb3JtXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwid29yZC1zcGFjaW5nXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwid29yZC13cmFwXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICAgICAgICAgIFwid2hpdGUtc3BhY2VcIjogXCJub3dyYXBcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmbG9hdFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJkaXJlY3Rpb25cIjogXCJsdHJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJtYXgtd2lkdGhcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwibWF4LWhlaWdodFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJtaW4td2lkdGhcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIi5NYXRoSmF4X1NWR19EaXNwbGF5XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJibG9jayFpbXBvcnRhbnRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0LWluZGVudFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIm1heC13aWR0aFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJtYXgtaGVpZ2h0XCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgICAgICBcIm1pbi13aWR0aFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIm1pbi1oZWlnaHRcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IFwiMTAwJVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIi5NYXRoSmF4X1NWRyAqXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLXdlYmtpdC10cmFuc2l0aW9uXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgICAgICBcIi1tb3otdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCItbXMtdHJhbnNpdGlvblwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCItby10cmFuc2l0aW9uXCI6IFwibm9uZVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIi5tangtc3ZnLWhyZWZcIjoge1xuICAgICAgICAgICAgICAgICAgICBmaWxsOiBcImJsdWVcIixcbiAgICAgICAgICAgICAgICAgICAgc3Ryb2tlOiBcImJsdWVcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCIuTWF0aEpheF9TVkdfUHJvY2Vzc2luZ1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDAsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwiYmxvY2shaW1wb3J0YW50XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiLk1hdGhKYXhfU1ZHX1Byb2Nlc3NlZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZSFpbXBvcnRhbnRcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCIuTWF0aEpheF9TVkdfRXhCb3hcIjoge1xuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImJsb2NrIWltcG9ydGFudFwiLFxuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IFwiMXB4XCIsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogXCI2MGV4XCIsXG4gICAgICAgICAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIm1heC1oZWlnaHRcIjogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcIiNNYXRoSmF4X1NWR19Ub29sdGlwXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwibm9uZVwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gRWRpdGFibGVTVkdDb25maWc7XG59KSgpO1xuLyogLSotIE1vZGU6IEphdmFzY3JpcHQ7IGluZGVudC10YWJzLW1vZGU6bmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG4vKiB2aW06IHNldCB0cz0yIGV0IHN3PTIgdHc9ODA6ICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICpcbiAqICBNYXRoSmF4L2pheC9vdXRwdXQvRWRpdGFibGVTVkcvamF4LmpzXG4gKlxuICogIEltcGxlbWVudHMgYW4gZWRpdGFibGUgU1ZHIE91dHB1dEpheCB0aGF0IGRpc3BsYXlzIG1hdGhlbWF0aWNzIHVzaW5nXG4gKiAgU1ZHIChvciBWTUwgaW4gSUUpIHRvIHBvc2l0aW9uIHRoZSBjaGFyYWN0ZXJzIGZyb20gbWF0aCBmb250c1xuICogIGluIHRoZWlyIHByb3BlciBsb2NhdGlvbnMuXG4gKlxuICogIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxNSBUaGUgTWF0aEpheCBDb25zb3J0aXVtXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgRWRpdGFibGVTVkcgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVkaXRhYmxlU1ZHKCkge1xuICAgICAgICB0aGlzLkFKQVggPSBNYXRoSmF4LkFKQVg7XG4gICAgICAgIHRoaXMuSFVCID0gTWF0aEpheC5IdWI7XG4gICAgICAgIHRoaXMuSFRNTCA9IE1hdGhKYXguSFRNTDtcbiAgICAgICAgdGhpcy5TVkcgPSBNYXRoSmF4Lk91dHB1dEpheC5FZGl0YWJsZVNWRztcbiAgICAgICAgdGhpcy5TVkdOUyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcbiAgICAgICAgdGhpcy5YTElOS05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgICAgIHRoaXMuY29uZmlnID0gRWRpdGFibGVTVkdDb25maWcuY29uZmlnO1xuICAgICAgICB0aGlzLmhpZGVQcm9jZXNzZWRNYXRoID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mb250TmFtZXMgPSBbXCJUZVhcIiwgXCJTVElYXCIsIFwiU1RJWC1XZWJcIiwgXCJBc2FuYS1NYXRoXCIsXG4gICAgICAgICAgICBcIkd5cmUtVGVybWVzXCIsIFwiR3lyZS1QYWdlbGxhXCIsIFwiTGF0aW4tTW9kZXJuXCIsIFwiTmVvLUV1bGVyXCJdO1xuICAgICAgICB0aGlzLlRleHROb2RlID0gdGhpcy5IVE1MLlRleHROb2RlO1xuICAgICAgICB0aGlzLmFkZFRleHQgPSB0aGlzLkhUTUwuYWRkVGV4dDtcbiAgICAgICAgdGhpcy51Y01hdGNoID0gdGhpcy5IVE1MLnVjTWF0Y2g7XG4gICAgICAgIHRoaXMuSFVCLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwibW1sIEpheCBSZWFkeVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNTUwgPSBNYXRoSmF4LkVsZW1lbnRKYXgubW1sO1xuICAgICAgICAgICAgdGhpcy5NTUwubWJhc2UuQXVnbWVudChNQmFzZU1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5jaGFycy5BdWdtZW50KENoYXJzTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLmVudGl0eS5BdWdtZW50KEVudGl0eU1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tby5BdWdtZW50KE1vTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm10ZXh0LkF1Z21lbnQoTVRleHRNaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgdGhpcy5NTUwubWVycm9yLkF1Z21lbnQoTUVycm9yTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1zLkF1Z21lbnQoTXNNaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgdGhpcy5NTUwubWdseXBoLkF1Z21lbnQoTUdseXBoTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1zcGFjZS5BdWdtZW50KE1TcGFjZU1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tcGhhbnRvbS5BdWdtZW50KE1QaGFudG9tTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1wYWRkZWQuQXVnbWVudChNUGFkZGVkTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1yb3cuQXVnbWVudChNUm93TWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1zdHlsZS5BdWdtZW50KE1TdHlsZU1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tZnJhYy5BdWdtZW50KE1GcmFjTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1zcXJ0LkF1Z21lbnQoTVNxcnRNaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgdGhpcy5NTUwubXJvb3QuQXVnbWVudChNUm9vdE1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tZmVuY2VkLkF1Z21lbnQoTUZlbmNlZE1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tZW5jbG9zZS5BdWdtZW50KE1FbmNsb3NlTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1hY3Rpb24uQXVnbWVudChNQWN0aW9uTWl4aW4uZ2V0TWV0aG9kcygpKTtcbiAgICAgICAgICAgIHRoaXMuTU1MLnNlbWFudGljcy5BdWdtZW50KFNlbWFudGljc01peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tdW5kZXJvdmVyLkF1Z21lbnQoTVVuZGVyT3Zlck1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tc3Vic3VwLkF1Z21lbnQoTVN1YlN1cE1peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tbXVsdGlzY3JpcHRzLkF1Z21lbnQoTU11bHRpU2NyaXB0c01peGluLmdldE1ldGhvZHMoKSk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tdGFibGUuQXVnbWVudChNVGFibGVNaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgdGhpcy5NTUwubWF0aC5BdWdtZW50KE1hdGhNaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgdGhpcy5NTUwuVGVYQXRvbS5BdWdtZW50KFRlWEF0b21NaXhpbi5nZXRNZXRob2RzKCkpO1xuICAgICAgICAgICAgTU1MW1wiYW5ub3RhdGlvbi14bWxcIl0uQXVnbWVudCh7XG4gICAgICAgICAgICAgICAgdG9TVkc6IHRoaXMuTU1MLm1iYXNlLlNWR2F1dG9sb2FkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuSFVCLlJlZ2lzdGVyLlN0YXJ0dXBIb29rKFwib25Mb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KE1hdGhKYXguQ2FsbGJhY2soW1wibG9hZENvbXBsZXRlXCIsIFNWRywgXCJqYXguanNcIl0pLCAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5IVUIuQnJvd3Nlci5TZWxlY3Qoe1xuICAgICAgICAgICAgT3BlcmE6IGZ1bmN0aW9uIChicm93c2VyKSB7XG4gICAgICAgICAgICAgICAgU1ZHLkF1Z21lbnQoe1xuICAgICAgICAgICAgICAgICAgICBvcGVyYVpvb21SZWZyZXNoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLkhVQi5SZWdpc3Rlci5TdGFydHVwSG9vayhcIkVuZCBDb29raWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKEhVQi5jb25maWcubWVudVNldHRpbmdzLnpvb20gIT09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5BSkFYLlJlcXVpcmUoXCJbTWF0aEpheF0vZXh0ZW5zaW9ucy9NYXRoWm9vbS5qc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKSB7XG4gICAgICAgICAgICBpZiAoIWRvY3VtZW50Lm5hbWVzcGFjZXMuc3ZnKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQubmFtZXNwYWNlcy5hZGQoXCJzdmdcIiwgU1ZHTlMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5Db25maWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1VQRVIoYXJndW1lbnRzKS5Db25maWcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gdGhpcy5IVUIuY29uZmlnLm1lbnVTZXR0aW5ncywgY29uZmlnID0gdGhpcy5jb25maWcsIGZvbnQgPSBzZXR0aW5ncy5mb250O1xuICAgICAgICBpZiAoc2V0dGluZ3Muc2NhbGUpIHtcbiAgICAgICAgICAgIGNvbmZpZy5zY2FsZSA9IHNldHRpbmdzLnNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb250ICYmIGZvbnQgIT09IFwiQXV0b1wiKSB7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oTG9jYWx8V2VifEltYWdlKSQvaSwgXCJcIik7XG4gICAgICAgICAgICBmb250ID0gZm9udC5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS8sIFwiJDEtJDJcIik7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGZvbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmZvbnRJblVzZSA9IGNvbmZpZy5mb250IHx8IFwiVGVYXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9udE5hbWVzLmluZGV4T2YodGhpcy5mb250SW5Vc2UpIDwgMCkge1xuICAgICAgICAgICAgdGhpcy5mb250SW5Vc2UgPSBcIlRlWFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZm9udERpciArPSBcIi9cIiArIHRoaXMuZm9udEluVXNlO1xuICAgICAgICBpZiAoIXRoaXMucmVxdWlyZSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1aXJlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1aXJlLnB1c2godGhpcy5mb250RGlyICsgXCIvZm9udGRhdGEuanNcIik7XG4gICAgICAgIHRoaXMucmVxdWlyZS5wdXNoKE1hdGhKYXguT3V0cHV0SmF4LmV4dGVuc2lvbkRpciArIFwiL01hdGhFdmVudHMuanNcIik7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0Tm9kZXNBc0ZsYXRMaXN0ID0gZnVuY3Rpb24gKGpheCkge1xuICAgICAgICB2YXIgcmVzdCA9IGpheC5kYXRhID8gXy5mbGF0dGVuKF8ubWFwKGpheC5kYXRhLCB0aGlzLmdldE5vZGVzQXNGbGF0TGlzdCkpIDogW107XG4gICAgICAgIHJldHVybiBbamF4XS5jb25jYXQocmVzdCk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZWxlbUNvb3Jkc1RvVmlld3BvcnRDb29yZHMgPSBmdW5jdGlvbiAoZWxlbSwgeCwgeSkge1xuICAgICAgICB2YXIgc3ZnID0gJChlbGVtKS5jbG9zZXN0KCdzdmcnKS5nZXQoKVswXTtcbiAgICAgICAgdmFyIHB0ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICAgIHB0LnggPSB4O1xuICAgICAgICBwdC55ID0geTtcbiAgICAgICAgcmV0dXJuIHB0Lm1hdHJpeFRyYW5zZm9ybShlbGVtLmdldENUTSgpKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5ub2RlQ29udGFpbnNQb2ludCA9IGZ1bmN0aW9uIChzdmcsIG5vZGUsIHBvaW50KSB7XG4gICAgICAgIGlmICghbm9kZS5nZXRCQikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vZGUgZG9lc24ndCBoYXZlIGdldEJCXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiYiA9IG5vZGUuZ2V0QkIoKTtcbiAgICAgICAgaWYgKCFiYikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkRpZG4ndCBnZXQgYSBiYlwiLCBub2RlLkVkaXRhYmxlU1ZHZWxlbSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbnZlcnRlZCA9IHRoaXMuZWxlbUNvb3Jkc1RvVmlld3BvcnRDb29yZHMobm9kZS5FZGl0YWJsZVNWR2VsZW0sIGJiLngsIGJiLnkpO1xuICAgICAgICBjb25zb2xlLmxvZygnY29uc2lkZXJpbmcgYmI6ICcsIG5vZGUuRWRpdGFibGVTVkdlbGVtLCBjb252ZXJ0ZWQueCwgY29udmVydGVkLnksIGJiLndpZHRoLCBiYi5oZWlnaHQpO1xuICAgICAgICBpZiAocG9pbnQueCA8IGJiLnggfHwgcG9pbnQueCA+IGJiLnggKyBiYi53aWR0aClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKHBvaW50LnkgPiBiYi55IHx8IHBvaW50LnkgPCBiYi55IC0gYmIuaGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBjb25zb2xlLmxvZygnTUFUQ0hFRCcpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5TdGFydHVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBFVkVOVCA9IE1hdGhKYXguRXh0ZW5zaW9uLk1hdGhFdmVudHMuRXZlbnQ7XG4gICAgICAgIFRPVUNIID0gTWF0aEpheC5FeHRlbnNpb24uTWF0aEV2ZW50cy5Ub3VjaDtcbiAgICAgICAgSE9WRVIgPSBNYXRoSmF4LkV4dGVuc2lvbi5NYXRoRXZlbnRzLkhvdmVyO1xuICAgICAgICB0aGlzLkNvbnRleHRNZW51ID0gdGhpcy5FVkVOVC5Db250ZXh0TWVudTtcbiAgICAgICAgdGhpcy5Nb3VzZWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgbW91c2Vkb3duIScpO1xuICAgICAgICAgICAgdmFyIHN2ZyA9ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KCdzdmcnKS5nZXQoKVswXTtcbiAgICAgICAgICAgIGlmICghc3ZnKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciBwdCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IHN2Zy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHB0LnggPSBldmVudC5jbGllbnRYO1xuICAgICAgICAgICAgcHQueSA9IGV2ZW50LmNsaWVudFk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2xpY2sgaW4gY2xpZW50IGNvb3JkczogJywgZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgICAgICB2YXIgY3AgPSBwdC5tYXRyaXhUcmFuc2Zvcm0oc3ZnLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY3A6ICcsIGNwLngsIGNwLnkpO1xuICAgICAgICAgICAgamF4ID0gTWF0aEpheC5IdWIuZ2V0QWxsSmF4KCcjJyArIGV2ZW50LnRhcmdldC5wYXJlbnRFbGVtZW50LmlkKVswXTtcbiAgICAgICAgICAgIHZhciBub2RlcyA9IHRoaXMuZ2V0Tm9kZXNBc0ZsYXRMaXN0KGpheC5yb290KTtcbiAgICAgICAgICAgIHZhciBuY3AgPSB0aGlzLm5vZGVDb250YWluc1BvaW50LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2hpbmdOb2RlcyA9IF8uZmlsdGVyKG5vZGVzLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuY3Aoc3ZnLCBub2RlLCBjcCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtYXRjaGluZyBub2RlczogJywgbWF0Y2hpbmdOb2Rlcyk7XG4gICAgICAgICAgICBfLmVhY2gobWF0Y2hpbmdOb2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhub2RlLnR5cGUsIG5vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuTW91c2VvdmVyID0gSE9WRVIuTW91c2VvdmVyO1xuICAgICAgICB0aGlzLk1vdXNlb3V0ID0gSE9WRVIuTW91c2VvdXQ7XG4gICAgICAgIHRoaXMuTW91c2Vtb3ZlID0gSE9WRVIuTW91c2Vtb3ZlO1xuICAgICAgICB0aGlzLmhpZGRlbkRpdiA9IHRoaXMuSFRNTC5FbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IFwiMXB4XCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IFwiYXV0b1wiLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiAwLFxuICAgICAgICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgICAgICAgICB0ZXh0QWxpZ246IFwibGVmdFwiLFxuICAgICAgICAgICAgICAgIHRleHRJbmRlbnQ6IDAsXG4gICAgICAgICAgICAgICAgdGV4dFRyYW5zZm9ybTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgbGluZUhlaWdodDogXCJub3JtYWxcIixcbiAgICAgICAgICAgICAgICBsZXR0ZXJTcGFjaW5nOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgICAgIHdvcmRTcGFjaW5nOiBcIm5vcm1hbFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbkRpdik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZSh0aGlzLmhpZGRlbkRpdiwgZG9jdW1lbnQuYm9keS5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhpZGRlbkRpdiA9IHRoaXMuSFRNTC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LCBcImRpdlwiLCB7XG4gICAgICAgICAgICBpZDogXCJNYXRoSmF4X1NWR19IaWRkZW5cIlxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRpdiA9IHRoaXMuSFRNTC5hZGRFbGVtZW50KHRoaXMuaGlkZGVuRGl2LCBcImRpdlwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBcIjVpblwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnB4UGVySW5jaCA9IGRpdi5vZmZzZXRXaWR0aCAvIDU7XG4gICAgICAgIHRoaXMuaGlkZGVuRGl2LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIHRoaXMudGV4dFNWRyA9IHRoaXMuRWxlbWVudChcInN2Z1wiKTtcbiAgICAgICAgQkJPWF9HTFlQSC5kZWZzID0gdGhpcy5hZGRFbGVtZW50KHRoaXMuYWRkRWxlbWVudCh0aGlzLmhpZGRlbkRpdi5wYXJlbnROb2RlLCBcInN2Z1wiKSwgXCJkZWZzXCIsIHtcbiAgICAgICAgICAgIGlkOiBcIk1hdGhKYXhfU1ZHX2dseXBoc1wiXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLkV4U3BhbiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgXCJmb250LXNpemUtYWRqdXN0XCI6IFwibm9uZVwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIFtcbiAgICAgICAgICAgIFtcInNwYW5cIiwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdfRXhCb3hcIlxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIF0pO1xuICAgICAgICB0aGlzLmxpbmVicmVha1NwYW4gPSB0aGlzLkhUTUwuRWxlbWVudChcInNwYW5cIiwgbnVsbCwgW1xuICAgICAgICAgICAgW1wiaHJcIiwge1xuICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IFwiYXV0b1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIF0pO1xuICAgICAgICByZXR1cm4gdGhpcy5BSkFYLlN0eWxlcyh0aGlzLmNvbmZpZy5zdHlsZXMsIFtcIkluaXRpYWxpemVTVkdcIiwgdGhpc10pO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkluaXRpYWxpemVTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMubGluZWJyZWFrU3Bhbik7XG4gICAgICAgIHRoaXMuZGVmYXVsdEV4ID0gdGhpcy5FeFNwYW4uZmlyc3RDaGlsZC5vZmZzZXRIZWlnaHQgLyA2MDtcbiAgICAgICAgdGhpcy5kZWZhdWx0V2lkdGggPSB0aGlzLmxpbmVicmVha1NwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0aGlzLmxpbmVicmVha1NwYW4pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuRXhTcGFuKTtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wcmVUcmFuc2xhdGUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdHMgPSBzdGF0ZS5qYXhbdGhpcy5pZF0sIGksIG0gPSBzY3JpcHRzLmxlbmd0aCwgc2NyaXB0LCBwcmV2LCBzcGFuLCBkaXYsIHRlc3QsIGpheCwgZXgsIGVtLCBtYXh3aWR0aCwgcmVsd2lkdGggPSBmYWxzZSwgY3dpZHRoLCBsaW5lYnJlYWsgPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYywgd2lkdGggPSB0aGlzLmNvbmZpZy5saW5lYnJlYWtzLndpZHRoO1xuICAgICAgICBpZiAobGluZWJyZWFrKSB7XG4gICAgICAgICAgICByZWx3aWR0aCA9ICh3aWR0aC5tYXRjaCgvXlxccyooXFxkKyhcXC5cXGQqKT8lXFxzKik/Y29udGFpbmVyXFxzKiQvKSAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChyZWx3aWR0aCkge1xuICAgICAgICAgICAgICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgvXFxzKmNvbnRhaW5lclxccyovLCBcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1heHdpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2lkdGggPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB3aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbWF4d2lkdGggPSAxMDAwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwcmV2ID0gc2NyaXB0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGlmIChwcmV2ICYmIFN0cmluZyhwcmV2LmNsYXNzTmFtZSkubWF0Y2goL15NYXRoSmF4KF9TVkcpPyhfRGlzcGxheSk/KCBNYXRoSmF4KF9TVkcpP19Qcm9jZXNzaW5nKT8kLykpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4O1xuICAgICAgICAgICAgaWYgKCFqYXgpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBqYXguU1ZHID0ge1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IChqYXgucm9vdC5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc3BhbiA9IGRpdiA9IHRoaXMuSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXNpemVcIjogdGhpcy5jb25maWcuc2NhbGUgKyBcIiVcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJpbmxpbmUtYmxvY2tcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1hdGhKYXhfU1ZHXCIsXG4gICAgICAgICAgICAgICAgaWQ6IGpheC5pbnB1dElEICsgXCItRnJhbWVcIixcbiAgICAgICAgICAgICAgICBpc01hdGhKYXg6IHRydWUsXG4gICAgICAgICAgICAgICAgamF4SUQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgb25jb250ZXh0bWVudTogdGhpcy5FVkVOVC5NZW51LFxuICAgICAgICAgICAgICAgIG9ubW91c2Vkb3duOiB0aGlzLkVWRU5ULk1vdXNlZG93bixcbiAgICAgICAgICAgICAgICBvbm1vdXNlb3ZlcjogdGhpcy5FVkVOVC5Nb3VzZW92ZXIsXG4gICAgICAgICAgICAgICAgb25tb3VzZW91dDogdGhpcy5FVkVOVC5Nb3VzZW91dCxcbiAgICAgICAgICAgICAgICBvbm1vdXNlbW92ZTogdGhpcy5FVkVOVC5Nb3VzZW1vdmUsXG4gICAgICAgICAgICAgICAgb25jbGljazogdGhpcy5FVkVOVC5DbGljayxcbiAgICAgICAgICAgICAgICBvbmRibGNsaWNrOiB0aGlzLkVWRU5ULkRibENsaWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChIVUIuQnJvd3Nlci5ub0NvbnRleHRNZW51KSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5vbnRvdWNoc3RhcnQgPSBUT1VDSC5zdGFydDtcbiAgICAgICAgICAgICAgICBzcGFuLm9udG91Y2hlbmQgPSBUT1VDSC5lbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoamF4LlNWRy5kaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgZGl2ID0gdGhpcy5IVE1MLkVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZGl2LmFwcGVuZENoaWxkKHNwYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGl2LmNsYXNzTmFtZSArPSBcIiBNYXRoSmF4X1NWR19Qcm9jZXNzaW5nXCI7XG4gICAgICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZGl2LCBzY3JpcHQpO1xuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuRXhTcGFuLmNsb25lTm9kZSh0cnVlKSwgc2NyaXB0KTtcbiAgICAgICAgICAgIGRpdi5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxpbmVicmVha1NwYW4uY2xvbmVOb2RlKHRydWUpLCBkaXYpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHNjcmlwdCA9IHNjcmlwdHNbaV07XG4gICAgICAgICAgICBpZiAoIXNjcmlwdC5wYXJlbnROb2RlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgdGVzdCA9IHNjcmlwdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBkaXYgPSB0ZXN0LnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIGpheCA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXg7XG4gICAgICAgICAgICBpZiAoIWpheClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGV4ID0gdGVzdC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICAgICAgY3dpZHRoID0gZGl2LnByZXZpb3VzU2libGluZy5maXJzdENoaWxkLm9mZnNldFdpZHRoO1xuICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgbWF4d2lkdGggPSBjd2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXggPT09IDAgfHwgZXggPT09IFwiTmFOXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGRlbkRpdi5hcHBlbmRDaGlsZChkaXYpO1xuICAgICAgICAgICAgICAgIGpheC5TVkcuaXNIaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGV4ID0gdGhpcy5kZWZhdWx0RXg7XG4gICAgICAgICAgICAgICAgY3dpZHRoID0gdGhpcy5kZWZhdWx0V2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heHdpZHRoID0gY3dpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGpheC5TVkcuZXggPSBleDtcbiAgICAgICAgICAgIGpheC5TVkcuZW0gPSBlbSA9IGV4IC8gVXRpbC5UZVgueF9oZWlnaHQgKiAxMDAwO1xuICAgICAgICAgICAgamF4LlNWRy5jd2lkdGggPSBjd2lkdGggLyBlbSAqIDEwMDA7XG4gICAgICAgICAgICBqYXguU1ZHLmxpbmVXaWR0aCA9IChsaW5lYnJlYWsgPyB0aGlzLmxlbmd0aDJlbSh3aWR0aCwgMSwgbWF4d2lkdGggLyBlbSAqIDEwMDApIDogVXRpbC5CSUdESU1FTik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmICghc2NyaXB0LnBhcmVudE5vZGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB0ZXN0ID0gc2NyaXB0c1tpXS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBzcGFuID0gdGVzdC5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICBqYXggPSBzY3JpcHRzW2ldLk1hdGhKYXguZWxlbWVudEpheDtcbiAgICAgICAgICAgIGlmICghamF4KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKCFqYXguU1ZHLmlzSGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW4ucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICAgICAgdGVzdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2VxbiA9IHN0YXRlLlNWR2xhc3QgPSAwO1xuICAgICAgICBzdGF0ZS5TVkdpID0gLTE7XG4gICAgICAgIHN0YXRlLlNWR2NodW5rID0gdGhpcy5jb25maWcuRXFuQ2h1bms7XG4gICAgICAgIHN0YXRlLlNWR2RlbGF5ID0gZmFsc2U7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuVHJhbnNsYXRlID0gZnVuY3Rpb24gKHNjcmlwdCwgc3RhdGUpIHtcbiAgICAgICAgaWYgKCFzY3JpcHQucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHN0YXRlLlNWR2RlbGF5KSB7XG4gICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5IVUIuUmVzdGFydEFmdGVyKE1hdGhKYXguQ2FsbGJhY2suRGVsYXkodGhpcy5jb25maWcuRXFuQ2h1bmtEZWxheSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBqYXggPSBzY3JpcHQuTWF0aEpheC5lbGVtZW50SmF4LCBtYXRoID0gamF4LnJvb3QsIHNwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChqYXguaW5wdXRJRCArIFwiLUZyYW1lXCIpLCBkaXYgPSAoamF4LlNWRy5kaXNwbGF5ID8gKHNwYW4gfHwge30pLnBhcmVudE5vZGUgOiBzcGFuKSwgbG9jYWxDYWNoZSA9IChTVkcuY29uZmlnLnVzZUZvbnRDYWNoZSAmJiAhU1ZHLmNvbmZpZy51c2VHbG9iYWxDYWNoZSk7XG4gICAgICAgIGlmICghZGl2KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLmVtID0gdGhpcy5NTUwubWJhc2UucHJvdG90eXBlLmVtID0gamF4LlNWRy5lbTtcbiAgICAgICAgdGhpcy5leCA9IGpheC5TVkcuZXg7XG4gICAgICAgIHRoaXMubGluZWJyZWFrV2lkdGggPSBqYXguU1ZHLmxpbmVXaWR0aDtcbiAgICAgICAgdGhpcy5jd2lkdGggPSBqYXguU1ZHLmN3aWR0aDtcbiAgICAgICAgdGhpcy5tYXRoRGl2ID0gZGl2O1xuICAgICAgICBzcGFuLmFwcGVuZENoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIGlmIChsb2NhbENhY2hlKSB7XG4gICAgICAgICAgICBTVkcucmVzZXRHbHlwaHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRTVkcobWF0aCwgc3Bhbik7XG4gICAgICAgIG1hdGguc2V0VGVYY2xhc3MoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGgudG9TVkcoc3BhbiwgZGl2KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnJlc3RhcnQpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3Bhbi5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQoc3Bhbi5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9jYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEJCT1guR0xZUEgubi0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIHNwYW4ucmVtb3ZlQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgaWYgKGpheC5TVkcuaXNIaWRkZW4pIHtcbiAgICAgICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIHNjcmlwdCk7XG4gICAgICAgIH1cbiAgICAgICAgZGl2LmNsYXNzTmFtZSA9IGRpdi5jbGFzc05hbWUuc3BsaXQoLyAvKVswXTtcbiAgICAgICAgaWYgKHRoaXMuaGlkZVByb2Nlc3NlZE1hdGgpIHtcbiAgICAgICAgICAgIGRpdi5jbGFzc05hbWUgKz0gXCIgTWF0aEpheF9TVkdfUHJvY2Vzc2VkXCI7XG4gICAgICAgICAgICBpZiAoc2NyaXB0Lk1hdGhKYXgucHJldmlldykge1xuICAgICAgICAgICAgICAgIGpheC5TVkcucHJldmlldyA9IHNjcmlwdC5NYXRoSmF4LnByZXZpZXc7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNjcmlwdC5NYXRoSmF4LnByZXZpZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5TVkdlcW4gKz0gKHN0YXRlLmkgLSBzdGF0ZS5TVkdpKTtcbiAgICAgICAgICAgIHN0YXRlLlNWR2kgPSBzdGF0ZS5pO1xuICAgICAgICAgICAgaWYgKHN0YXRlLlNWR2VxbiA+PSBzdGF0ZS5TVkdsYXN0ICsgc3RhdGUuU1ZHY2h1bmspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvc3RUcmFuc2xhdGUoc3RhdGUsIHRydWUpO1xuICAgICAgICAgICAgICAgIHN0YXRlLlNWR2NodW5rID0gTWF0aC5mbG9vcihzdGF0ZS5TVkdjaHVuayAqIHRoaXMuY29uZmlnLkVxbkNodW5rRmFjdG9yKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5TVkdkZWxheSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5wb3N0VHJhbnNsYXRlID0gZnVuY3Rpb24gKHN0YXRlLCBwYXJ0aWFsKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gc3RhdGUuamF4W3RoaXMuaWRdO1xuICAgICAgICBpZiAoIXRoaXMuaGlkZVByb2Nlc3NlZE1hdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGF0ZS5TVkdsYXN0LCBtID0gc3RhdGUuU1ZHZXFuOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gc2NyaXB0c1tpXTtcbiAgICAgICAgICAgIGlmIChzY3JpcHQgJiYgc2NyaXB0Lk1hdGhKYXguZWxlbWVudEpheCkge1xuICAgICAgICAgICAgICAgIHNjcmlwdC5wcmV2aW91c1NpYmxpbmcuY2xhc3NOYW1lID0gc2NyaXB0LnByZXZpb3VzU2libGluZy5jbGFzc05hbWUuc3BsaXQoLyAvKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHNjcmlwdC5NYXRoSmF4LmVsZW1lbnRKYXguU1ZHO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcmV2aWV3LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5NYXRoSmF4LnByZXZpZXcgPSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLnByZXZpZXc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLlNWR2xhc3QgPSBzdGF0ZS5TVkdlcW47XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUucmVzZXRHbHlwaHMgPSBmdW5jdGlvbiAocmVzZXQpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnVzZUZvbnRDYWNoZSkge1xuICAgICAgICAgICAgdmFyIEdMWVBIID0gQkJPWF9HTFlQSDtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIEdMWVBILmRlZnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk1hdGhKYXhfU1ZHX2dseXBoc1wiKTtcbiAgICAgICAgICAgICAgICBHTFlQSC5kZWZzLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBHTFlQSC5kZWZzID0gdGhpcy5FbGVtZW50KFwiZGVmc1wiKTtcbiAgICAgICAgICAgICAgICBHTFlQSC5uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBHTFlQSC5nbHlwaHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChyZXNldCkge1xuICAgICAgICAgICAgICAgIEdMWVBILm4gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuaGFzaENoZWNrID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImdcIikge1xuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldC5maXJzdENoaWxkLm5vZGVOYW1lICE9PSBcInN2Z1wiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEpheEZyb21NYXRoID0gZnVuY3Rpb24gKG1hdGgpIHtcbiAgICAgICAgaWYgKG1hdGgucGFyZW50Tm9kZS5jbGFzc05hbWUgPT09IFwiTWF0aEpheF9TVkdfRGlzcGxheVwiKSB7XG4gICAgICAgICAgICBtYXRoID0gbWF0aC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIG1hdGggPSBtYXRoLm5leHRTaWJsaW5nO1xuICAgICAgICB9IHdoaWxlIChtYXRoICYmIG1hdGgubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJzY3JpcHRcIik7XG4gICAgICAgIHJldHVybiB0aGlzLkhVQi5nZXRKYXhGb3IobWF0aCk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZ2V0SG92ZXJTcGFuID0gZnVuY3Rpb24gKGpheCwgbWF0aCkge1xuICAgICAgICBtYXRoLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICByZXR1cm4gbWF0aC5maXJzdENoaWxkO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEhvdmVyQkJveCA9IGZ1bmN0aW9uIChqYXgsIHNwYW4sIG1hdGgpIHtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLkVWRU5ULmdldEJCb3goc3Bhbi5wYXJlbnROb2RlKTtcbiAgICAgICAgYmJveC5oICs9IDI7XG4gICAgICAgIGJib3guZCAtPSAyO1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5ab29tID0gZnVuY3Rpb24gKGpheCwgc3BhbiwgbWF0aCwgTXcsIE1oKSB7XG4gICAgICAgIHNwYW4uY2xhc3NOYW1lID0gXCJNYXRoSmF4X1NWR1wiO1xuICAgICAgICB2YXIgZW1leCA9IHNwYW4uYXBwZW5kQ2hpbGQodGhpcy5FeFNwYW4uY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgdmFyIGV4ID0gZW1leC5maXJzdENoaWxkLm9mZnNldEhlaWdodCAvIDYwO1xuICAgICAgICB0aGlzLmVtID0gdGhpcy5NTUwubWJhc2UucHJvdG90eXBlLmVtID0gZXggLyBVdGlsLlRlWC54X2hlaWdodCAqIDEwMDA7XG4gICAgICAgIHRoaXMuZXggPSBleDtcbiAgICAgICAgdGhpcy5saW5lYnJlYWtXaWR0aCA9IGpheC5TVkcubGluZVdpZHRoO1xuICAgICAgICB0aGlzLmN3aWR0aCA9IGpheC5TVkcuY3dpZHRoO1xuICAgICAgICBlbWV4LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZW1leCk7XG4gICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQodGhpcy50ZXh0U1ZHKTtcbiAgICAgICAgdGhpcy5tYXRoRElWID0gc3BhbjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSBwYXJzZUludChIVUIuY29uZmlnLm1lbnVTZXR0aW5ncy56c2NhbGUpIC8gMTAwO1xuICAgICAgICB2YXIgdHcgPSBqYXgucm9vdC5kYXRhWzBdLkVkaXRhYmxlU1ZHZGF0YS50dztcbiAgICAgICAgaWYgKHR3ICYmIHR3IDwgdGhpcy5jd2lkdGgpXG4gICAgICAgICAgICB0aGlzLmN3aWR0aCA9IHR3O1xuICAgICAgICB0aGlzLmlkUG9zdGZpeCA9IFwiLXpvb21cIjtcbiAgICAgICAgamF4LnJvb3QudG9TVkcoc3Bhbiwgc3Bhbik7XG4gICAgICAgIHRoaXMuaWRQb3N0Zml4ID0gXCJcIjtcbiAgICAgICAgdGhpcy56b29tU2NhbGUgPSAxO1xuICAgICAgICBzcGFuLnJlbW92ZUNoaWxkKHRoaXMudGV4dFNWRyk7XG4gICAgICAgIHZhciBzdmcgPSBzcGFuLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3ZnXCIpWzBdLnN0eWxlO1xuICAgICAgICBzdmcubWFyZ2luVG9wID0gc3ZnLm1hcmdpblJpZ2h0ID0gc3ZnLm1hcmdpbkxlZnQgPSAwO1xuICAgICAgICBpZiAoc3ZnLm1hcmdpbkJvdHRvbS5jaGFyQXQoMCkgPT09IFwiLVwiKVxuICAgICAgICAgICAgc3Bhbi5zdHlsZS5tYXJnaW5Cb3R0b20gPSBzdmcubWFyZ2luQm90dG9tLnN1YnN0cigxKTtcbiAgICAgICAgaWYgKHRoaXMub3BlcmFab29tUmVmcmVzaCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5maXJzdENoaWxkLnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Bhbi5vZmZzZXRXaWR0aCA8IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5taW5XaWR0aCA9IHNwYW4uZmlyc3RDaGlsZC5vZmZzZXRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIG1hdGguc3R5bGUubWluV2lkdGggPSBtYXRoLmZpcnN0Q2hpbGQub2Zmc2V0V2lkdGggKyBcInB4XCI7XG4gICAgICAgIH1cbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIHZhciB6VyA9IHNwYW4ub2Zmc2V0V2lkdGgsIHpIID0gc3Bhbi5vZmZzZXRIZWlnaHQsIG1IID0gbWF0aC5vZmZzZXRIZWlnaHQsIG1XID0gbWF0aC5vZmZzZXRXaWR0aDtcbiAgICAgICAgc3Bhbi5zdHlsZS5wb3NpdGlvbiA9IG1hdGguc3R5bGUucG9zaXRpb24gPSBcIlwiO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgWTogLUVWRU5ULmdldEJCb3goc3BhbikuaCxcbiAgICAgICAgICAgIG1XOiBtVyxcbiAgICAgICAgICAgIG1IOiBtSCxcbiAgICAgICAgICAgIHpXOiB6VyxcbiAgICAgICAgICAgIHpIOiB6SFxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmluaXRTVkcgPSBmdW5jdGlvbiAobWF0aCwgc3BhbikgeyB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5SZW1vdmUgPSBmdW5jdGlvbiAoamF4KSB7XG4gICAgICAgIHZhciBzcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoamF4LmlucHV0SUQgKyBcIi1GcmFtZVwiKTtcbiAgICAgICAgaWYgKHNwYW4pIHtcbiAgICAgICAgICAgIGlmIChqYXguU1ZHLmRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbi5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBqYXguU1ZHO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldFBhZGRpbmcgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0ge1xuICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgcmlnaHQ6IDAsXG4gICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBoYXMgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gcGFkZGluZykge1xuICAgICAgICAgICAgaWYgKHBhZGRpbmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhZCA9IHN0eWxlc1tcInBhZGRpbmdcIiArIGlkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgaWQuc3Vic3RyKDEpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdbaWRdID0gdGhpcy5sZW5ndGgyZW0ocGFkKTtcbiAgICAgICAgICAgICAgICAgICAgaGFzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBwYWRkaW5nIDogZmFsc2UpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmdldEJvcmRlcnMgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gICAgICAgIHZhciBib3JkZXIgPSB7XG4gICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICByaWdodDogMCxcbiAgICAgICAgICAgIGJvdHRvbTogMCxcbiAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgfSwgaGFzID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGlkIGluIGJvcmRlcikge1xuICAgICAgICAgICAgaWYgKGJvcmRlci5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSBcImJvcmRlclwiICsgaWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBpZC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlID0gc3R5bGVzW0lEICsgXCJTdHlsZVwiXTtcbiAgICAgICAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUgIT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZF0gPSB0aGlzLmxlbmd0aDJlbShzdHlsZXNbSUQgKyBcIldpZHRoXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyW2lkICsgXCJTdHlsZVwiXSA9IHN0eWxlc1tJRCArIFwiU3R5bGVcIl07XG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBzdHlsZXNbSUQgKyBcIkNvbG9yXCJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyW2lkICsgXCJDb2xvclwiXSA9PT0gXCJpbml0aWFsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcltpZCArIFwiQ29sb3JcIl0gPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm9yZGVyW2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChoYXMgPyBib3JkZXIgOiBmYWxzZSk7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuRWxlbWVudCA9IGZ1bmN0aW9uICh0eXBlLCBkZWYpIHtcbiAgICAgICAgdmFyIG9iaiA9ICh0eXBlb2YgKHR5cGUpID09PSBcInN0cmluZ1wiID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR05TLCB0eXBlKSA6IHR5cGUpO1xuICAgICAgICBvYmouaXNNYXRoSmF4ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGRlZikge1xuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gZGVmKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZi5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZShpZCwgZGVmW2lkXS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5hZGRFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmVudCwgdHlwZSwgZGVmKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5FbGVtZW50KHR5cGUsIGRlZikpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLkhhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgdmFyIG4sIE4sIGMsIGZvbnQsIFZBUklBTlQsIGksIG0sIGlkLCBNLCBSQU5HRVM7XG4gICAgICAgIGlmICghdmFyaWFudCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuRk9OVERBVEEuVkFSSUFOVFtNTUwuVkFSSUFOVC5OT1JNQUxdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YXJpYW50LmZvcmNlRmFtaWx5KSB7XG4gICAgICAgICAgICB0ZXh0ID0gbmV3IEJCT1hfVEVYVChzY2FsZSwgdGV4dCwgdmFyaWFudC5mb250KTtcbiAgICAgICAgICAgIGlmICh2YXJpYW50LmggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0ZXh0LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5kID0gdmFyaWFudC5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0KTtcbiAgICAgICAgICAgIHRleHQgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIFZBUklBTlQgPSB2YXJpYW50O1xuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGV4dC5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBWQVJJQU5UO1xuICAgICAgICAgICAgbiA9IHRleHQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIGMgPSB0ZXh0LmNoYXJBdChpKTtcbiAgICAgICAgICAgIGlmIChuID49IDB4RDgwMCAmJiBuIDwgMHhEQkZGKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIG4gPSAoKChuIC0gMHhEODAwKSA8PCAxMCkgKyAodGV4dC5jaGFyQ29kZUF0KGkpIC0gMHhEQzAwKSkgKyAweDEwMDAwO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLkZPTlREQVRBLlJlbWFwUGxhbmUxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudiA9IHRoaXMuRk9OVERBVEEuUmVtYXBQbGFuZTEobiwgdmFyaWFudCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBudi5uO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gbnYudmFyaWFudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBSQU5HRVMgPSB0aGlzLkZPTlREQVRBLlJBTkdFUztcbiAgICAgICAgICAgICAgICBmb3IgKGlkID0gMCwgTSA9IFJBTkdFUy5sZW5ndGg7IGlkIDwgTTsgaWQrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5uYW1lID09PSBcImFscGhhXCIgJiYgdmFyaWFudC5ub0xvd2VyQ2FzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBOID0gdmFyaWFudFtcIm9mZnNldFwiICsgUkFOR0VTW2lkXS5vZmZzZXRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoTiAmJiBuID49IFJBTkdFU1tpZF0ubG93ICYmIG4gPD0gUkFOR0VTW2lkXS5oaWdoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoUkFOR0VTW2lkXS5yZW1hcCAmJiBSQU5HRVNbaWRdLnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IE4gKyBSQU5HRVNbaWRdLnJlbWFwW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbiA9IG4gLSBSQU5HRVNbaWRdLmxvdyArIE47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFJBTkdFU1tpZF0uYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4gKz0gUkFOR0VTW2lkXS5hZGQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gdGhpcy5GT05UREFUQS5WQVJJQU5UW3ZhcmlhbnRbXCJ2YXJpYW50XCIgKyBSQU5HRVNbaWRdLm9mZnNldF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFyaWFudC5yZW1hcCAmJiB2YXJpYW50LnJlbWFwW25dKSB7XG4gICAgICAgICAgICAgICAgbiA9IHZhcmlhbnQucmVtYXBbbl07XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQucmVtYXAudmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50ID0gdGhpcy5GT05UREFUQS5WQVJJQU5UW3ZhcmlhbnQucmVtYXAudmFyaWFudF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5GT05UREFUQS5SRU1BUFtuXSAmJiAhdmFyaWFudC5ub1JlbWFwKSB7XG4gICAgICAgICAgICAgICAgbiA9IHRoaXMuRk9OVERBVEEuUkVNQVBbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuRk9OVERBVEEuVkFSSUFOVFtuWzFdXTtcbiAgICAgICAgICAgICAgICBuID0gblswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG4pID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IG4gKyB0ZXh0LnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgbSA9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGkgPSAtMTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvbnQgPSB0aGlzLmxvb2t1cENoYXIodmFyaWFudCwgbik7XG4gICAgICAgICAgICBjID0gZm9udFtuXTtcbiAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjWzVdICYmIGNbNV0uc3BhY2UpIHx8IChjWzVdID09PSBcIlwiICYmIGNbMF0gKyBjWzFdID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBzdmcudyArPSBjWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IFtzY2FsZSwgZm9udC5pZCArIFwiLVwiICsgbi50b1N0cmluZygxNikudG9VcHBlckNhc2UoKV0uY29uY2F0KGMpO1xuICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKEJCT1hfR0xZUEguYXBwbHkoQkJPWCwgYyksIHN2Zy53LCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLkZPTlREQVRBLkRFTElNSVRFUlNbbl0pIHtcbiAgICAgICAgICAgICAgICBjID0gdGhpcy5jcmVhdGVEZWxpbWl0ZXIobiwgMCwgMSwgZm9udCk7XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChjLCBzdmcudywgKHRoaXMuRk9OVERBVEEuREVMSU1JVEVSU1tuXS5kaXIgPT09IFwiVlwiID8gYy5kIDogMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG4gPD0gMHhGRkZGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgTiA9IG4gLSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoTiA+PiAxMCkgKyAweEQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgoTiAmIDB4M0ZGKSArIDB4REMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBib3ggPSBuZXcgQkJPWF9URVhUKHNjYWxlICogMTAwIC8gU1ZHLmNvbmZpZy5zY2FsZSwgYywge1xuICAgICAgICAgICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6IHZhcmlhbnQuZGVmYXVsdEZhbWlseSB8fCBTVkcuY29uZmlnLnVuZGVmaW5lZEZhbWlseSxcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6ICh2YXJpYW50Lml0YWxpYyA/IFwiaXRhbGljXCIgOiBcIlwiKSxcbiAgICAgICAgICAgICAgICAgICAgXCJmb250LXdlaWdodFwiOiAodmFyaWFudC5ib2xkID8gXCJib2xkXCIgOiBcIlwiKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh2YXJpYW50LmggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94LmggPSB2YXJpYW50Lmg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YXJpYW50LmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgPSB2YXJpYW50LmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGMgPSBuZXcgQkJPWF9HKCk7XG4gICAgICAgICAgICAgICAgYy5BZGQoYm94KTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKGMsIHN2Zy53LCAwKTtcbiAgICAgICAgICAgICAgICB0aGlzLkhVQi5zaWduYWwuUG9zdChbXCJTVkcgSmF4IC0gdW5rbm93biBjaGFyXCIsIG4sIHZhcmlhbnRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQubGVuZ3RoID09IDEgJiYgZm9udC5za2V3ICYmIGZvbnQuc2tld1tuXSkge1xuICAgICAgICAgICAgc3ZnLnNrZXcgPSBmb250LnNrZXdbbl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBzdmcuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUubG9va3VwQ2hhciA9IGZ1bmN0aW9uICh2YXJpYW50LCBuKSB7XG4gICAgICAgIHZhciBpLCBtO1xuICAgICAgICBpZiAoIXZhcmlhbnQuRk9OVFMpIHtcbiAgICAgICAgICAgIHZhciBGT05UUyA9IHRoaXMuRk9OVERBVEEuRk9OVFM7XG4gICAgICAgICAgICB2YXIgZm9udHMgPSAodmFyaWFudC5mb250cyB8fCB0aGlzLkZPTlREQVRBLlZBUklBTlQubm9ybWFsLmZvbnRzKTtcbiAgICAgICAgICAgIGlmICghKGZvbnRzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgZm9udHMgPSBbZm9udHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhcmlhbnQuZm9udHMgIT0gZm9udHMpIHtcbiAgICAgICAgICAgICAgICB2YXJpYW50LmZvbnRzID0gZm9udHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXJpYW50LkZPTlRTID0gW107XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBtID0gZm9udHMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKEZPTlRTW2ZvbnRzW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXJpYW50LkZPTlRTLnB1c2goRk9OVFNbZm9udHNbaV1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbSA9IHZhcmlhbnQuRk9OVFMubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZm9udCA9IHZhcmlhbnQuRk9OVFNbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIChmb250KSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB2YXJpYW50LkZPTlRTO1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZEZvbnQoZm9udCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZm9udFtuXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb250O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5kQmxvY2soZm9udCwgbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiBcInVua25vd25cIlxuICAgICAgICB9O1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmZpbmRCbG9jayA9IGZ1bmN0aW9uIChmb250LCBjKSB7XG4gICAgICAgIGlmIChmb250LlJhbmdlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBmb250LlJhbmdlcy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IGZvbnQuUmFuZ2VzW2ldWzBdKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gZm9udC5SYW5nZXNbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBmb250LlJhbmdlc1tpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGZvbnQuUmFuZ2VzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9udC5SYW5nZXNbal1bMl0gPT0gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQuUmFuZ2VzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRGb250KGZvbnQuZGlyZWN0b3J5ICsgXCIvXCIgKyBmaWxlICsgXCIuanNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUubG9hZEZvbnQgPSBmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICB0aGlzLkhVQi5SZXN0YXJ0QWZ0ZXIoQUpBWC5SZXF1aXJlKHRoaXMuZm9udERpciArIFwiL1wiICsgZmlsZSkpO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcucHJvdG90eXBlLmNyZWF0ZURlbGltaXRlciA9IGZ1bmN0aW9uIChjb2RlLCBIVywgc2NhbGUsIGZvbnQpIHtcbiAgICAgICAgaWYgKCFzY2FsZSkge1xuICAgICAgICAgICAgc2NhbGUgPSAxO1xuICAgICAgICB9XG4gICAgICAgIDtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyBCQk9YX0coKTtcbiAgICAgICAgaWYgKCFjb2RlKSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdmcuZWxlbWVudDtcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLlRlWC5udWxsZGVsaW1pdGVyc3BhY2UgKiBzY2FsZTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEoSFcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIEhXID0gW0hXLCBIV107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGh3ID0gSFdbMV07XG4gICAgICAgIEhXID0gSFdbMF07XG4gICAgICAgIHZhciBkZWxpbSA9IHtcbiAgICAgICAgICAgIGFsaWFzOiBjb2RlXG4gICAgICAgIH07XG4gICAgICAgIHdoaWxlIChkZWxpbS5hbGlhcykge1xuICAgICAgICAgICAgY29kZSA9IGRlbGltLmFsaWFzO1xuICAgICAgICAgICAgZGVsaW0gPSB0aGlzLkZPTlREQVRBLkRFTElNSVRFUlNbY29kZV07XG4gICAgICAgICAgICBpZiAoIWRlbGltKSB7XG4gICAgICAgICAgICAgICAgZGVsaW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIEhXOiBbMCwgdGhpcy5GT05UREFUQS5WQVJJQU5UW01NTC5WQVJJQU5ULk5PUk1BTF1dXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVsaW0ubG9hZCkge1xuICAgICAgICAgICAgdGhpcy5IVUIuUmVzdGFydEFmdGVyKEFKQVguUmVxdWlyZSh0aGlzLmZvbnREaXIgKyBcIi9mb250ZGF0YS1cIiArIGRlbGltLmxvYWQgKyBcIi5qc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBkZWxpbS5IVy5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChkZWxpbS5IV1tpXVswXSAqIHNjYWxlID49IEhXIC0gMTAgLSBTVkcuY29uZmlnLmJsYWNrZXIgfHwgKGkgPT0gbSAtIDEgJiYgIWRlbGltLnN0cmV0Y2gpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLkhXW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjYWxlICo9IGRlbGltLkhXW2ldWzJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0uSFdbaV1bM10pIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSA9IGRlbGltLkhXW2ldWzNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBbY29kZSwgZGVsaW0uSFdbaV1bMV1dLCBmb250KS5XaXRoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLnN0cmV0Y2gpIHtcbiAgICAgICAgICAgIHRoaXNbXCJleHRlbmREZWxpbWl0ZXJcIiArIGRlbGltLmRpcl0oc3ZnLCBodywgZGVsaW0uc3RyZXRjaCwgc2NhbGUsIGZvbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuY3JlYXRlQ2hhciA9IGZ1bmN0aW9uIChzY2FsZSwgZGF0YSwgZm9udCkge1xuICAgICAgICB2YXIgdGV4dCA9IFwiXCIsIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICBmb250czogW2RhdGFbMV1dLFxuICAgICAgICAgICAgbm9SZW1hcDogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBpZiAoZm9udCAmJiBmb250ID09PSB0aGlzLk1NTC5WQVJJQU5ULkJPTEQpIHtcbiAgICAgICAgICAgIHZhcmlhbnQuZm9udHMgPSBbZGF0YVsxXSArIFwiLWJvbGRcIiwgZGF0YVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiAoZGF0YVsxXSkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSBkYXRhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBtID0gZGF0YVswXS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVswXVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0ZXh0ID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs0XSkge1xuICAgICAgICAgICAgc2NhbGUgPSBzY2FsZSAqIGRhdGFbNF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuSGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIGlmIChkYXRhWzJdKSB7XG4gICAgICAgICAgICBzdmcueCA9IGRhdGFbMl0gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzNdKSB7XG4gICAgICAgICAgICBzdmcueSA9IGRhdGFbM10gKiAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhWzVdKSB7XG4gICAgICAgICAgICBzdmcuaCArPSBkYXRhWzVdICogMTAwMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YVs2XSkge1xuICAgICAgICAgICAgc3ZnLmQgKz0gZGF0YVs2XSAqIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEVkaXRhYmxlU1ZHLnByb3RvdHlwZS5leHRlbmREZWxpbWl0ZXJWID0gZnVuY3Rpb24gKHN2ZywgSCwgZGVsaW0sIHNjYWxlLCBmb250KSB7XG4gICAgICAgIHZhciB0b3AgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS50b3AgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBib3QgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIChkZWxpbS5ib3QgfHwgZGVsaW0uZXh0KSwgZm9udCk7XG4gICAgICAgIHZhciBoID0gdG9wLmggKyB0b3AuZCArIGJvdC5oICsgYm90LmQ7XG4gICAgICAgIHZhciB5ID0gLXRvcC5oO1xuICAgICAgICBzdmcuQWRkKHRvcCwgMCwgeSk7XG4gICAgICAgIHkgLT0gdG9wLmQ7XG4gICAgICAgIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHZhciBtaWQgPSB0aGlzLmNyZWF0ZUNoYXIoc2NhbGUsIGRlbGltLm1pZCwgZm9udCk7XG4gICAgICAgICAgICBoICs9IG1pZC5oICsgbWlkLmQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBIIDwgaCAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgSCA9IGggKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEggPiBoKSB7XG4gICAgICAgICAgICB2YXIgZXh0ID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5leHQsIGZvbnQpO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCBlSCA9IChIIC0gaCkgLyBrLCBzID0gKGVIICsgMTAwKSAvIChleHQuaCArIGV4dC5kKTtcbiAgICAgICAgICAgIHdoaWxlIChrLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGcgPSBTVkcuRWxlbWVudChcImdcIiwge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IFwidHJhbnNsYXRlKFwiICsgZXh0LnkgKyBcIixcIiArICh5IC0gcyAqIGV4dC5oICsgNTAgKyBleHQueSkgKyBcIikgc2NhbGUoMSxcIiArIHMgKyBcIilcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGcuYXBwZW5kQ2hpbGQoZXh0LmVsZW1lbnQuY2xvbmVOb2RlKGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZyk7XG4gICAgICAgICAgICAgICAgeSAtPSBlSDtcbiAgICAgICAgICAgICAgICBpZiAoZGVsaW0ubWlkICYmIGspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLkFkZChtaWQsIDAsIHkgLSBtaWQuaCk7XG4gICAgICAgICAgICAgICAgICAgIHkgLT0gKG1pZC5oICsgbWlkLmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkZWxpbS5taWQpIHtcbiAgICAgICAgICAgIHkgKz0gKGggLSBIKSAvIDI7XG4gICAgICAgICAgICBzdmcuQWRkKG1pZCwgMCwgeSAtIG1pZC5oKTtcbiAgICAgICAgICAgIHkgKz0gLShtaWQuaCArIG1pZC5kKSArIChoIC0gSCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeSArPSAoaCAtIEgpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYm90LCAwLCB5IC0gYm90LmgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgIHN2Zy5pc011bHRpQ2hhciA9IHRydWU7XG4gICAgfTtcbiAgICBFZGl0YWJsZVNWRy5wcm90b3R5cGUuZXh0ZW5kRGVsaW1pdGVySCA9IGZ1bmN0aW9uIChzdmcsIFcsIGRlbGltLCBzY2FsZSwgZm9udCkge1xuICAgICAgICB2YXIgbGVmdCA9IHRoaXMuY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLmxlZnQgfHwgZGVsaW0ucmVwKSwgZm9udCk7XG4gICAgICAgIHZhciByaWdodCA9IHRoaXMuY3JlYXRlQ2hhcihzY2FsZSwgKGRlbGltLnJpZ2h0IHx8IGRlbGltLnJlcCksIGZvbnQpO1xuICAgICAgICBzdmcuQWRkKGxlZnQsIC1sZWZ0LmwsIDApO1xuICAgICAgICB2YXIgdyA9IChsZWZ0LnIgLSBsZWZ0LmwpICsgKHJpZ2h0LnIgLSByaWdodC5sKSwgeCA9IGxlZnQuciAtIGxlZnQubDtcbiAgICAgICAgaWYgKGRlbGltLm1pZCkge1xuICAgICAgICAgICAgdmFyIG1pZCA9IHRoaXMuY3JlYXRlQ2hhcihzY2FsZSwgZGVsaW0ubWlkLCBmb250KTtcbiAgICAgICAgICAgIHcgKz0gbWlkLnc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlbGltLm1pbiAmJiBXIDwgdyAqIGRlbGltLm1pbikge1xuICAgICAgICAgICAgVyA9IHcgKiBkZWxpbS5taW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFcgPiB3KSB7XG4gICAgICAgICAgICB2YXIgcmVwID0gdGhpcy5jcmVhdGVDaGFyKHNjYWxlLCBkZWxpbS5yZXAsIGZvbnQpLCBmdXp6ID0gZGVsaW0uZnV6eiB8fCAwO1xuICAgICAgICAgICAgdmFyIGsgPSAoZGVsaW0ubWlkID8gMiA6IDEpLCByVyA9IChXIC0gdykgLyBrLCBzID0gKHJXICsgZnV6eikgLyAocmVwLnIgLSByZXAubCk7XG4gICAgICAgICAgICB3aGlsZSAoay0tID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBnID0gU1ZHLkVsZW1lbnQoXCJnXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZShcIiArICh4IC0gZnV6eiAvIDIgLSBzICogcmVwLmwgKyByZXAueCkgKyBcIixcIiArIHJlcC55ICsgXCIpIHNjYWxlKFwiICsgcyArIFwiLDEpXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBnLmFwcGVuZENoaWxkKHJlcC5lbGVtZW50LmNsb25lTm9kZShmYWxzZSkpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKGcpO1xuICAgICAgICAgICAgICAgIHggKz0gclc7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGltLm1pZCAmJiBrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5BZGQobWlkLCB4LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBtaWQudztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsaW0ubWlkKSB7XG4gICAgICAgICAgICB4IC09ICh3IC0gVykgLyAyO1xuICAgICAgICAgICAgc3ZnLkFkZChtaWQsIHgsIDApO1xuICAgICAgICAgICAgeCArPSBtaWQudyAtICh3IC0gVykgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgeCAtPSAodyAtIFcpO1xuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQocmlnaHQsIHggLSByaWdodC5sLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHN2Zy5zY2FsZSA9IHNjYWxlO1xuICAgICAgICBzdmcuaXNNdWx0aUNoYXIgPSB0cnVlO1xuICAgIH07XG4gICAgRWRpdGFibGVTVkcuRWxlbWVudCA9IGZ1bmN0aW9uICh0eXBlLCBkZWYpIHtcbiAgICAgICAgdmFyIG9iaiA9ICh0eXBlb2YgKHR5cGUpID09PSBcInN0cmluZ1wiID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN2ZzpcIiArIHR5cGUpIDogdHlwZSk7XG4gICAgICAgIG9iai5pc01hdGhKYXggPSB0cnVlO1xuICAgICAgICBpZiAoZGVmKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBkZWYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKGlkLCBkZWZbaWRdLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgcmV0dXJuIEVkaXRhYmxlU1ZHO1xufSkoKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJqYXgudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cInV0aWwudHNcIiAvPlxudmFyIFV0aWwgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFV0aWwoKSB7XG4gICAgfVxuICAgIFV0aWwucHJvdG90eXBlLkVtID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwZW1cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKSArIFwiZW1cIjtcbiAgICB9O1xuICAgIFV0aWwucHJvdG90eXBlLkV4ID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgbSA9IE1hdGgucm91bmQobSAvIHRoaXMuVGVYLnhfaGVpZ2h0ICogdGhpcy5leCkgLyB0aGlzLmV4O1xuICAgICAgICBpZiAoTWF0aC5hYnMobSkgPCAwLjAwMDYpIHtcbiAgICAgICAgICAgIHJldHVybiBcIjBleFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sIFwiXCIpICsgXCJleFwiO1xuICAgIH07XG4gICAgVXRpbC5wcm90b3R5cGUuUGVyY2VudCA9IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIHJldHVybiAoMTAwICogbSkudG9GaXhlZCgxKS5yZXBsYWNlKC9cXC4/MCskLywgXCJcIikgKyBcIiVcIjtcbiAgICB9O1xuICAgIFV0aWwucHJvdG90eXBlLkZpeGVkID0gZnVuY3Rpb24gKG0sIG4pIHtcbiAgICAgICAgaWYgKE1hdGguYWJzKG0pIDwgMC4wMDA2KSB7XG4gICAgICAgICAgICByZXR1cm4gXCIwXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0udG9GaXhlZChuIHx8IDMpLnJlcGxhY2UoL1xcLj8wKyQvLCBcIlwiKTtcbiAgICB9O1xuICAgIFV0aWwubGVuZ3RoMmVtID0gZnVuY3Rpb24gKGxlbmd0aCwgbXUsIHNpemUpIHtcbiAgICAgICAgaWYgKHNpemUgPT09IHZvaWQgMCkgeyBzaXplID0gbnVsbDsgfVxuICAgICAgICBpZiAodHlwZW9mIChsZW5ndGgpICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBsZW5ndGggPSBsZW5ndGgudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSBcIlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSB0aGlzLk1NTC5TSVpFLk5PUk1BTCkge1xuICAgICAgICAgICAgcmV0dXJuIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuU0laRS5CSUcpIHtcbiAgICAgICAgICAgIHJldHVybiAyMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZW5ndGggPT09IHRoaXMuTU1MLlNJWkUuU01BTEwpIHtcbiAgICAgICAgICAgIHJldHVybiA3MTA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gXCJpbmZpbml0eVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoLm1hdGNoKC9tYXRoc3BhY2UkLykpIHtcbiAgICAgICAgICAgIHJldHVybiAxMDAwICogdGhpcy5NQVRIU1BBQ0VbbGVuZ3RoXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZW1GYWN0b3IgPSAodGhpcy56b29tU2NhbGUgfHwgMSkgLyBVdGlsLmVtO1xuICAgICAgICB2YXIgbWF0Y2ggPSBsZW5ndGgubWF0Y2goL15cXHMqKFstK10/KD86XFwuXFxkK3xcXGQrKD86XFwuXFxkKik/KSk/KHB0fGVtfGV4fG11fHB4fHBjfGlufG1tfGNtfCUpPy8pO1xuICAgICAgICB2YXIgbSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0gfHwgXCIxXCIpICogMTAwMCwgdW5pdCA9IG1hdGNoWzJdO1xuICAgICAgICBpZiAoc2l6ZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBzaXplID0gMTAwMDtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGlmIChtdSA9PSBudWxsKSB7XG4gICAgICAgICAgICBtdSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZW1cIikge1xuICAgICAgICAgICAgcmV0dXJuIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwiZXhcIikge1xuICAgICAgICAgICAgcmV0dXJuIG0gKiBVdGlsLlRlWC54X2hlaWdodCAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwiJVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAvIDEwMCAqIHNpemUgLyAxMDAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0ID09PSBcInB4XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtICogZW1GYWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwicHRcIikge1xuICAgICAgICAgICAgcmV0dXJuIG0gLyAxMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJwY1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAqIDEuMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJpblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVuaXQgPT09IFwiY21cIikge1xuICAgICAgICAgICAgcmV0dXJuIG0gKiB0aGlzLnB4UGVySW5jaCAqIGVtRmFjdG9yIC8gMi41NDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdCA9PT0gXCJtbVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbSAqIHRoaXMucHhQZXJJbmNoICogZW1GYWN0b3IgLyAyNS40O1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0ID09PSBcIm11XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtIC8gMTggKiBtdTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbSAqIHNpemUgLyAxMDAwO1xuICAgIH07XG4gICAgVXRpbC50aGlja25lc3MyZW0gPSBmdW5jdGlvbiAobGVuZ3RoLCBtdSkge1xuICAgICAgICB2YXIgdGhpY2sgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcztcbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuTElORVRISUNLTkVTUy5NRURJVU0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobGVuZ3RoID09PSB0aGlzLk1NTC5MSU5FVEhJQ0tORVNTLlRISU4pIHtcbiAgICAgICAgICAgIHJldHVybiAwLjY3ICogdGhpY2s7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlbmd0aCA9PT0gdGhpcy5NTUwuTElORVRISUNLTkVTUy5USElDSykge1xuICAgICAgICAgICAgcmV0dXJuIDEuNjcgKiB0aGljaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgyZW0obGVuZ3RoLCBtdSwgdGhpY2spO1xuICAgIH07XG4gICAgVXRpbC5OQlNQID0gXCJcXHUwMEEwXCI7XG4gICAgVXRpbC5CSUdESU1FTiA9IDEwMDAwMDAwO1xuICAgIFV0aWwuVGVYID0ge1xuICAgICAgICB4X2hlaWdodDogNDMwLjU1NCxcbiAgICAgICAgcXVhZDogMTAwMCxcbiAgICAgICAgbnVtMTogNjc2LjUwOCxcbiAgICAgICAgbnVtMjogMzkzLjczMixcbiAgICAgICAgbnVtMzogNDQzLjczLFxuICAgICAgICBkZW5vbTE6IDY4NS45NTEsXG4gICAgICAgIGRlbm9tMjogMzQ0Ljg0MSxcbiAgICAgICAgc3VwMTogNDEyLjg5MixcbiAgICAgICAgc3VwMjogMzYyLjg5MixcbiAgICAgICAgc3VwMzogMjg4Ljg4OCxcbiAgICAgICAgc3ViMTogMTUwLFxuICAgICAgICBzdWIyOiAyNDcuMjE3LFxuICAgICAgICBzdXBfZHJvcDogMzg2LjEwOCxcbiAgICAgICAgc3ViX2Ryb3A6IDUwLFxuICAgICAgICBkZWxpbTE6IDIzOTAsXG4gICAgICAgIGRlbGltMjogMTAwMCxcbiAgICAgICAgYXhpc19oZWlnaHQ6IDI1MCxcbiAgICAgICAgcnVsZV90aGlja25lc3M6IDYwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzE6IDExMS4xMTEsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nMjogMTY2LjY2NixcbiAgICAgICAgYmlnX29wX3NwYWNpbmczOiAyMDAsXG4gICAgICAgIGJpZ19vcF9zcGFjaW5nNDogNjAwLFxuICAgICAgICBiaWdfb3Bfc3BhY2luZzU6IDEwMCxcbiAgICAgICAgc2NyaXB0c3BhY2U6IDEwMCxcbiAgICAgICAgbnVsbGRlbGltaXRlcnNwYWNlOiAxMjAsXG4gICAgICAgIGRlbGltaXRlcmZhY3RvcjogOTAxLFxuICAgICAgICBkZWxpbWl0ZXJzaG9ydGZhbGw6IDMwMCxcbiAgICAgICAgbWluX3J1bGVfdGhpY2tuZXNzOiAxLjI1LFxuICAgICAgICBtaW5fcm9vdF9zcGFjZTogMS41XG4gICAgfTtcbiAgICBVdGlsLk1BVEhTUEFDRSA9IHtcbiAgICAgICAgdmVyeXZlcnl0aGlubWF0aHNwYWNlOiAxIC8gMTgsXG4gICAgICAgIHZlcnl0aGlubWF0aHNwYWNlOiAyIC8gMTgsXG4gICAgICAgIHRoaW5tYXRoc3BhY2U6IDMgLyAxOCxcbiAgICAgICAgbWVkaXVtbWF0aHNwYWNlOiA0IC8gMTgsXG4gICAgICAgIHRoaWNrbWF0aHNwYWNlOiA1IC8gMTgsXG4gICAgICAgIHZlcnl0aGlja21hdGhzcGFjZTogNiAvIDE4LFxuICAgICAgICB2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiA3IC8gMTgsXG4gICAgICAgIG5lZ2F0aXZldmVyeXZlcnl0aGlubWF0aHNwYWNlOiAtMSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlubWF0aHNwYWNlOiAtMiAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaW5tYXRoc3BhY2U6IC0zIC8gMTgsXG4gICAgICAgIG5lZ2F0aXZlbWVkaXVtbWF0aHNwYWNlOiAtNCAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXRoaWNrbWF0aHNwYWNlOiAtNSAvIDE4LFxuICAgICAgICBuZWdhdGl2ZXZlcnl0aGlja21hdGhzcGFjZTogLTYgLyAxOCxcbiAgICAgICAgbmVnYXRpdmV2ZXJ5dmVyeXRoaWNrbWF0aHNwYWNlOiAtNyAvIDE4XG4gICAgfTtcbiAgICByZXR1cm4gVXRpbDtcbn0pKCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdXRpbC50c1wiIC8+XG52YXIgQkJPWCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQkJPWChIVUIsIGRlZikge1xuICAgICAgICBpZiAoZGVmID09PSB2b2lkIDApIHsgZGVmID0gbnVsbDsgfVxuICAgICAgICB0aGlzLnR5cGUgPSBcImdcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5nbHlwaHMgPSB7fTtcbiAgICAgICAgdGhpcy5kZWZzID0gbnVsbDtcbiAgICAgICAgdGhpcy5uID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5kID0gLVV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMuSCA9IHRoaXMuRCA9IDA7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IDA7XG4gICAgICAgIHRoaXMubCA9IFV0aWwuQklHRElNRU47XG4gICAgICAgIHRoaXMueCA9IHRoaXMueSA9IDA7XG4gICAgICAgIHRoaXMuc2NhbGUgPSAxO1xuICAgICAgICB0aGlzLm4gPSAwO1xuICAgICAgICB0aGlzLkhVQiA9IGh1YjtcbiAgICAgICAgaWYgKHRoaXMudHlwZSkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50ID0gRWRpdGFibGVTVkcuRWxlbWVudCh0aGlzLnR5cGUsIGRlZik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgQkJPWC5wcm90b3R5cGUuV2l0aCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuSFVCLkluc2VydCh0aGlzLCBkZWYpO1xuICAgIH07XG4gICAgQkJPWC5wcm90b3R5cGUuQWRkID0gZnVuY3Rpb24gKHN2ZywgZHgsIGR5LCBmb3JjZXcsIGluZnJvbnQpIHtcbiAgICAgICAgaWYgKGR4KSB7XG4gICAgICAgICAgICBzdmcueCArPSBkeDtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGlmIChkeSkge1xuICAgICAgICAgICAgc3ZnLnkgKz0gZHk7XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICBpZiAoc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChzdmcucmVtb3ZlYWJsZSAmJiBzdmcuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBzdmcubiA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQsIG5vZGVOYW1lID0gY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwidXNlXCIgfHwgbm9kZU5hbWUgPT09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gY2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5zY2FsZSA9IHN2Zy5jaGlsZFNjYWxlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHN2Zy5jaGlsZFgsIHkgPSBzdmcuY2hpbGRZO1xuICAgICAgICAgICAgICAgICAgICBzdmcueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcueSArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuaCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuZCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuSCAtPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcuRCArPSB5O1xuICAgICAgICAgICAgICAgICAgICBzdmcudyAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcuciAtPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcubCArPSB4O1xuICAgICAgICAgICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN2Zy54KSA8IDEgJiYgTWF0aC5hYnMoc3ZnLnkpIDwgMSkge1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmUgPSBzdmcucmVtb3ZlYWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gc3ZnLmVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwiZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnJlbW92ZSA9IHN2Zy5yZW1vdmVhYmxlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgTWF0aC5mbG9vcihzdmcueCkgKyBcIixcIiArIE1hdGguZmxvb3Ioc3ZnLnkpICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09PSBcImxpbmVcIiB8fCBub2RlTmFtZSA9PT0gXCJwb2x5Z29uXCIgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPT09IFwicGF0aFwiIHx8IG5vZGVOYW1lID09PSBcImFcIikge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBNYXRoLmZsb29yKHN2Zy54KSArIFwiLFwiICsgTWF0aC5mbG9vcihzdmcueSkgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ4XCIsIE1hdGguZmxvb3Ioc3ZnLnggLyBzdmcuc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwieVwiLCBNYXRoLmZsb29yKHN2Zy55IC8gc3ZnLnNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm4gKz0gc3ZnLm47XG4gICAgICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZnJvbnQgJiYgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbnNlcnRCZWZvcmUoc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZnJvbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50Lmluc2VydEJlZm9yZShzdmcuZWxlbWVudCwgdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHN2Zy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaGFzSW5kZW50ID0gc3ZnLmhhc0luZGVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnR3ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudHcgPSBzdmcudHc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5kIC0gc3ZnLnkgPiB0aGlzLmQpIHtcbiAgICAgICAgICAgIHRoaXMuZCA9IHN2Zy5kIC0gc3ZnLnk7XG4gICAgICAgICAgICBpZiAodGhpcy5kID4gdGhpcy5EKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5EID0gdGhpcy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcueSArIHN2Zy5oID4gdGhpcy5oKSB7XG4gICAgICAgICAgICB0aGlzLmggPSBzdmcueSArIHN2Zy5oO1xuICAgICAgICAgICAgaWYgKHRoaXMuaCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuSCA9IHRoaXMuaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLkQgLSBzdmcueSA+IHRoaXMuRCkge1xuICAgICAgICAgICAgdGhpcy5EID0gc3ZnLkQgLSBzdmcueTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnkgKyBzdmcuSCA+IHRoaXMuSCkge1xuICAgICAgICAgICAgdGhpcy5IID0gc3ZnLnkgKyBzdmcuSDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnggKyBzdmcubCA8IHRoaXMubCkge1xuICAgICAgICAgICAgdGhpcy5sID0gc3ZnLnggKyBzdmcubDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnggKyBzdmcuciA+IHRoaXMucikge1xuICAgICAgICAgICAgdGhpcy5yID0gc3ZnLnggKyBzdmcucjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZm9yY2V3IHx8IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCkgPiB0aGlzLncpIHtcbiAgICAgICAgICAgIHRoaXMudyA9IHN2Zy54ICsgc3ZnLncgKyAoc3ZnLlggfHwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jaGlsZFNjYWxlID0gc3ZnLnNjYWxlO1xuICAgICAgICB0aGlzLmNoaWxkWCA9IHN2Zy54O1xuICAgICAgICB0aGlzLmNoaWxkWSA9IHN2Zy55O1xuICAgICAgICB0aGlzLm4rKztcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1gucHJvdG90eXBlLkFsaWduID0gZnVuY3Rpb24gKHN2ZywgYWxpZ24sIGR4LCBkeSwgc2hpZnQpIHtcbiAgICAgICAgZHggPSAoe1xuICAgICAgICAgICAgbGVmdDogZHgsXG4gICAgICAgICAgICBjZW50ZXI6ICh0aGlzLncgLSBzdmcudykgLyAyLFxuICAgICAgICAgICAgcmlnaHQ6IHRoaXMudyAtIHN2Zy53IC0gZHhcbiAgICAgICAgfSlbYWxpZ25dIHx8IDA7XG4gICAgICAgIHZhciB3ID0gdGhpcy53O1xuICAgICAgICB0aGlzLkFkZChzdmcsIGR4ICsgKHNoaWZ0IHx8IDApLCBkeSk7XG4gICAgICAgIHRoaXMudyA9IHc7XG4gICAgfTtcbiAgICBCQk9YLnByb3RvdHlwZS5DbGVhbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaCA9PT0gLVV0aWwuQklHRElNRU4pIHtcbiAgICAgICAgICAgIHRoaXMuaCA9IHRoaXMuZCA9IHRoaXMubCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWDtcbn0pKCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGU7XG4gICAgZC5wcm90b3R5cGUgPSBuZXcgX18oKTtcbn07XG52YXIgQkJPWF9GUkFNRSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfRlJBTUUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9GUkFNRShoLCBkLCB3LCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IFwicmVjdFwiO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIGRlZi5maWxsID0gXCJub25lXCI7XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFNWRy5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLndpZHRoID0gTWF0aC5mbG9vcih3IC0gdCk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkIC0gdCk7XG4gICAgICAgIGRlZi50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZShcIiArIE1hdGguZmxvb3IodCAvIDIpICsgXCIsXCIgKyBNYXRoLmZsb29yKC1kICsgdCAvIDIpICsgXCIpXCI7XG4gICAgICAgIGlmIChkYXNoID09PSBcImRhc2hlZFwiKSB7XG4gICAgICAgICAgICBkZWZbXCJzdHJva2UtZGFzaGFycmF5XCJdID0gW01hdGguZmxvb3IoNiAqIFNWRy5lbSksIE1hdGguZmxvb3IoNiAqIFNWRy5lbSldLmpvaW4oXCIgXCIpO1xuICAgICAgICB9XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZik7XG4gICAgICAgIHRoaXMudyA9IHRoaXMuciA9IHc7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IGg7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IGQ7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0ZSQU1FO1xufSkoQkJPWCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgQkJPWF9HID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfRygpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0c7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX0dMWVBIID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9HTFlQSCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX0dMWVBIKHNjYWxlLCBpZCwgaCwgZCwgdywgbCwgciwgcCkge1xuICAgICAgICB0aGlzLnR5cGUgPSBcInBhdGhcIjtcbiAgICAgICAgdGhpcy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBkZWYsIHQgPSBTVkcuY29uZmlnLmJsYWNrZXI7XG4gICAgICAgIHZhciBjYWNoZSA9IFNWRy5jb25maWcudXNlRm9udENhY2hlO1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gKHNjYWxlID09PSAxID8gbnVsbCA6IFwic2NhbGUoXCIgKyBTVkcuRml4ZWQoc2NhbGUpICsgXCIpXCIpO1xuICAgICAgICBpZiAoY2FjaGUgJiYgIVNWRy5jb25maWcudXNlR2xvYmFsQ2FjaGUpIHtcbiAgICAgICAgICAgIGlkID0gXCJFXCIgKyB0aGlzLm4gKyBcIi1cIiArIGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2FjaGUgfHwgIXRoaXMuZ2x5cGhzW2lkXSkge1xuICAgICAgICAgICAgZGVmID0ge1xuICAgICAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6IHRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBkZWYuaWQgPSBpZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRyYW5zZm9ybSkge1xuICAgICAgICAgICAgICAgIGRlZi50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWYuZCA9IChwID8gXCJNXCIgKyBwICsgXCJaXCIgOiBcIlwiKTtcbiAgICAgICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGRlZik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlZnMuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdseXBoc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtKSB7XG4gICAgICAgICAgICAgICAgZGVmLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IFNWRy5FbGVtZW50KFwidXNlXCIsIGRlZik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoWExJTktOUywgXCJocmVmXCIsIFwiI1wiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaCA9IChoICsgdCkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gKGQgKyB0KSAqIHNjYWxlO1xuICAgICAgICB0aGlzLncgPSAodyArIHQgLyAyKSAqIHNjYWxlO1xuICAgICAgICB0aGlzLmwgPSAobCArIHQgLyAyKSAqIHNjYWxlO1xuICAgICAgICB0aGlzLnIgPSAociArIHQgLyAyKSAqIHNjYWxlO1xuICAgICAgICB0aGlzLkggPSBNYXRoLm1heCgwLCB0aGlzLmgpO1xuICAgICAgICB0aGlzLkQgPSBNYXRoLm1heCgwLCB0aGlzLmQpO1xuICAgICAgICB0aGlzLnggPSB0aGlzLnkgPSAwO1xuICAgICAgICB0aGlzLnNjYWxlID0gc2NhbGU7XG4gICAgfVxuICAgIHJldHVybiBCQk9YX0dMWVBIO1xufSkoQkJPWCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgQkJPWF9ITElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfSExJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9ITElORSh3LCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IFwibGluZVwiO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFNWRy5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLnkxID0gZGVmLnkyID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi54MiA9IE1hdGguZmxvb3IodyAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCB3IC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgdyAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gdDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfSExJTkU7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX05VTEwgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX05VTEwsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9OVUxMKCkge1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLmFwcGx5LmNhbGwodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5DbGVhbigpO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9OVUxMO1xufSkoQkJPWCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgQkJPWF9SRUNUID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQkJPWF9SRUNULCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEJCT1hfUkVDVChoLCBkLCB3LCBkZWYpIHtcbiAgICAgICAgdGhpcy50eXBlID0gXCJyZWN0XCI7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICBpZiAoZGVmID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlZiA9IHtcbiAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGRlZi53aWR0aCA9IE1hdGguZmxvb3Iodyk7XG4gICAgICAgIGRlZi5oZWlnaHQgPSBNYXRoLmZsb29yKGggKyBkKTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdztcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaCArIGQ7XG4gICAgICAgIHRoaXMuZCA9IHRoaXMuRCA9IHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMueSA9IC1kO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9SRUNUO1xufSkoQkJPWCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgQkJPWF9ST1cgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1JPVywgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBCQk9YX1JPVygpIHtcbiAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5hcHBseS5jYWxsKHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuc3ZnID0gW107XG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLnNkID0gMDtcbiAgICB9XG4gICAgQkJPWF9ST1cucHJvdG90eXBlLkNoZWNrID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRhdGEudG9TVkcoKTtcbiAgICAgICAgdGhpcy5zdmcucHVzaChzdmcpO1xuICAgICAgICBpZiAoZGF0YS5TVkdjYW5TdHJldGNoKFwiVmVydGljYWxcIikpIHtcbiAgICAgICAgICAgIHN2Zy5tbWwgPSBkYXRhO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuaCA+IHRoaXMuc2gpIHtcbiAgICAgICAgICAgIHRoaXMuc2ggPSBzdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmQgPiB0aGlzLnNkKSB7XG4gICAgICAgICAgICB0aGlzLnNkID0gc3ZnLmQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIEJCT1hfUk9XLnByb3RvdHlwZS5TdHJldGNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuc3ZnLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnW2ldLCBtbWwgPSBzdmcubW1sO1xuICAgICAgICAgICAgaWYgKG1tbCkge1xuICAgICAgICAgICAgICAgIGlmIChtbWwuZm9yY2VTdHJldGNoIHx8IG1tbC5FZGl0YWJsZVNWR2RhdGEuaCAhPT0gdGhpcy5zaCB8fCBtbWwuRWRpdGFibGVTVkdkYXRhLmQgIT09IHRoaXMuc2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnID0gbW1sLlNWR3N0cmV0Y2hWKHRoaXMuc2gsIHRoaXMuc2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkhXID0gdGhpcy5zaDtcbiAgICAgICAgICAgICAgICBtbWwuRWRpdGFibGVTVkdkYXRhLkQgPSB0aGlzLnNkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5pYykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWMgPSBzdmcuaWM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuQWRkKHN2ZywgdGhpcy53LCAwLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgfTtcbiAgICByZXR1cm4gQkJPWF9ST1c7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJiYm94LnRzXCIgLz5cbnZhciBCQk9YX1RFWFQgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhCQk9YX1RFWFQsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9URVhUKHNjYWxlLCB0ZXh0LCBkZWYpIHtcbiAgICAgICAgdGhpcy50eXBlID0gXCJ0ZXh0XCI7XG4gICAgICAgIHRoaXMucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICBpZiAoIWRlZikge1xuICAgICAgICAgICAgZGVmID0ge307XG4gICAgICAgIH1cbiAgICAgICAgO1xuICAgICAgICBkZWYuc3Ryb2tlID0gXCJub25lXCI7XG4gICAgICAgIGlmIChkZWZbXCJmb250LXN0eWxlXCJdID09PSBcIlwiKVxuICAgICAgICAgICAgZGVsZXRlIGRlZltcImZvbnQtc3R5bGVcIl07XG4gICAgICAgIGlmIChkZWZbXCJmb250LXdlaWdodFwiXSA9PT0gXCJcIilcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZbXCJmb250LXdlaWdodFwiXTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmKTtcbiAgICAgICAgU1ZHLmFkZFRleHQodGhpcy5lbGVtZW50LCB0ZXh0KTtcbiAgICAgICAgU1ZHLnRleHRTVkcuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgdmFyIGJib3ggPSB0aGlzLmVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICBTVkcudGV4dFNWRy5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICBzY2FsZSAqPSAxMDAwIC8gU1ZHLmVtO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIgKyBTVkcuRml4ZWQoc2NhbGUpICsgXCIpIG1hdHJpeCgxIDAgMCAtMSAwIDApXCIpO1xuICAgICAgICB0aGlzLncgPSB0aGlzLnIgPSBiYm94LndpZHRoICogc2NhbGU7XG4gICAgICAgIHRoaXMubCA9IDA7XG4gICAgICAgIHRoaXMuaCA9IHRoaXMuSCA9IC1iYm94LnkgKiBzY2FsZTtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gKGJib3guaGVpZ2h0ICsgYmJveC55KSAqIHNjYWxlO1xuICAgIH1cbiAgICByZXR1cm4gQkJPWF9URVhUO1xufSkoQkJPWCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYmJveC50c1wiIC8+XG52YXIgQkJPWF9WTElORSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEJCT1hfVkxJTkUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQkJPWF9WTElORShoLCB0LCBkYXNoLCBjb2xvciwgZGVmKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IFwibGluZVwiO1xuICAgICAgICB0aGlzLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgaWYgKGRlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICBkZWYgPSB7XG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInNxdWFyZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xvciAmJiBjb2xvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgZGVmLnN0cm9rZSA9IGNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGRlZltcInN0cm9rZS13aWR0aFwiXSA9IFNWRy5GaXhlZCh0LCAyKTtcbiAgICAgICAgZGVmLngxID0gZGVmLngyID0gZGVmLnkxID0gTWF0aC5mbG9vcih0IC8gMik7XG4gICAgICAgIGRlZi55MiA9IE1hdGguZmxvb3IoaCAtIHQgLyAyKTtcbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZGFzaGVkXCIpIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihNYXRoLm1heCgwLCBoIC0gdCkgLyAoNiAqIHQpKSwgbSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoMCwgaCAtIHQpIC8gKDIgKiBuICsgMSkpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWRhc2hhcnJheVwiXSA9IG0gKyBcIiBcIiArIG07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhc2ggPT09IFwiZG90dGVkXCIpIHtcbiAgICAgICAgICAgIGRlZltcInN0cm9rZS1kYXNoYXJyYXlcIl0gPSBbMSwgTWF0aC5tYXgoMTUwLCBNYXRoLmZsb29yKDIgKiB0KSldLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgZGVmW1wic3Ryb2tlLWxpbmVjYXBcIl0gPSBcInJvdW5kXCI7XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgZGVmKTtcbiAgICAgICAgdGhpcy53ID0gdGhpcy5yID0gdDtcbiAgICAgICAgdGhpcy5sID0gMDtcbiAgICAgICAgdGhpcy5oID0gdGhpcy5IID0gaDtcbiAgICAgICAgdGhpcy5kID0gdGhpcy5EID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIEJCT1hfVkxJTkU7XG59KShCQk9YKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9iYm94L2Jib3gudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2Jib3gvcmVjdC50c1wiIC8+XG52YXIgTUJhc2VNaXhpbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTUJhc2VNaXhpbigpIHtcbiAgICAgICAgdGhpcy5TVkcgPSBCQk9YO1xuICAgIH1cbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5nZXRCQiA9IGZ1bmN0aW9uIChyZWxhdGl2ZVRvKSB7XG4gICAgICAgIHZhciBlbGVtID0gdGhpcy5FZGl0YWJsZVNWR2VsZW07XG4gICAgICAgIGlmICghZWxlbSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ09oIG5vISBDb3VsZG5cXCd0IGZpbmQgZWxlbSBmb3IgdGhpcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtLmdldEJCb3goKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4uZ2V0TWV0aG9kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgdmFyaWFudCA9IHRoaXMuU1ZHZ2V0VmFyaWFudCgpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBzdmcuQWRkKHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzdmcuc2NhbGUpLCBzdmcudywgMCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLnNrZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBjaGlsZC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdmFyIHRleHQgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKHN2Zy5za2V3ICYmIHRleHQubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLnNrZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5yID4gc3ZnLncgJiYgdGV4dC5sZW5ndGggPT09IDEgJiYgIXZhcmlhbnQubm9JQykge1xuICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgIHN2Zy53ID0gc3ZnLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gc3ZnLmVsZW1lbnQ7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdjaGlsZFNWRyA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhW2ldID8gdGhpcy5kYXRhW2ldLnRvU1ZHKCkgOiBuZXcgQkJPWCh0aGlzLkhVQikpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkID0gZnVuY3Rpb24gKGksIEhXLCBEKSB7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge1xuICAgICAgICAgICAgSFc6IEhXLFxuICAgICAgICAgICAgRDogRFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBCQk9YKHRoaXMuSFVCKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRCAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hWKEhXLCBEKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoSFcgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS5TVkdzdHJldGNoSChIVyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVtpXS50b1NWRygpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc2F2ZURhdGEgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy5FZGl0YWJsZVNWR2RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5FZGl0YWJsZVNWR2RhdGEudyA9IHN2Zy53LCB0aGlzLkVkaXRhYmxlU1ZHZGF0YS54ID0gc3ZnLng7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggPSBzdmcuaCwgdGhpcy5FZGl0YWJsZVNWR2RhdGEuZCA9IHN2Zy5kO1xuICAgICAgICBpZiAoc3ZnLnkpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLmggKz0gc3ZnLnk7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5kIC09IHN2Zy55O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdmcuWCAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5YID0gc3ZnLlg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy50dyAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS50dyA9IHN2Zy50dztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLnNrZXcpIHtcbiAgICAgICAgICAgIHRoaXMuRWRpdGFibGVTVkdkYXRhLnNrZXcgPSBzdmcuc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ZnLmljKSB7XG4gICAgICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZGF0YS5pYyA9IHN2Zy5pYztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpc1tcImNsYXNzXCJdKSB7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcuRWxlbWVudChzdmcuZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogdGhpc1tcImNsYXNzXCJdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pZCkge1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIEVkaXRhYmxlU1ZHLkVsZW1lbnQoc3ZnLmVsZW1lbnQsIHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHRoaXMuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhyZWYpIHtcbiAgICAgICAgICAgIHZhciBhID0gRWRpdGFibGVTVkcuRWxlbWVudChcImFcIiwge1xuICAgICAgICAgICAgICAgIFwiY2xhc3NcIjogXCJtangtc3ZnLWhyZWZcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZU5TKFhMSU5LTlMsIFwiaHJlZlwiLCB0aGlzLmhyZWYpO1xuICAgICAgICAgICAgYS5vbmNsaWNrID0gdGhpcy5TVkdsaW5rO1xuICAgICAgICAgICAgRWRpdGFibGVTVkcuYWRkRWxlbWVudChhLCBcInJlY3RcIiwge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBzdmcudyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHN2Zy5oICsgc3ZnLmQsXG4gICAgICAgICAgICAgICAgeTogLXN2Zy5kLFxuICAgICAgICAgICAgICAgIGZpbGw6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgXCJwb2ludGVyLWV2ZW50c1wiOiBcImFsbFwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdmcudHlwZSA9PT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZy5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoZy5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGEuYXBwZW5kQ2hpbGQoc3ZnLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEVkaXRhYmxlU1ZHLmNvbmZpZy5hZGRNTUxjbGFzc2VzKSB7XG4gICAgICAgICAgICB0aGlzLlNWR2FkZENsYXNzKHN2Zy5lbGVtZW50LCBcIm1qeC1zdmctXCIgKyB0aGlzLnR5cGUpO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3R5bGUgPSB0aGlzLnN0eWxlO1xuICAgICAgICBpZiAoc3R5bGUgJiYgc3ZnLmVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmNzc1RleHQgPSBzdHlsZTtcbiAgICAgICAgICAgIGlmIChzdmcuZWxlbWVudC5zdHlsZS5mb250U2l6ZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmZvbnRTaXplID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnN0eWxlLmJvcmRlciA9IHN2Zy5lbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSAoc3ZnLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9PT0gXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5TVkdhZGRBdHRyaWJ1dGVzKHN2Zyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRDbGFzcyA9IGZ1bmN0aW9uIChub2RlLCBuYW1lKSB7XG4gICAgICAgIHZhciBjbGFzc2VzID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTtcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCAoY2xhc3NlcyA/IGNsYXNzZXMgKyBcIiBcIiA6IFwiXCIpICsgbmFtZSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAodGhpcy5hdHRyTmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gdGhpcy5hdHRyTmFtZXMsIHNraXAgPSB0aGlzLk1NTC5ub2NvcHlBdHRyaWJ1dGVzLCBpZ25vcmUgPSB0aGlzLkhVQi5jb25maWcuaWdub3JlTU1MYXR0cmlidXRlcztcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9ICh0aGlzLnR5cGUgPT09IFwibXN0eWxlXCIgPyB0aGlzLk1NTC5tYXRoLnByb3RvdHlwZS5kZWZhdWx0cyA6IHRoaXMuZGVmYXVsdHMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBjb3B5Lmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvcHlbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlnbm9yZVtpZF0gPT0gZmFsc2UgfHwgKCFza2lwW2lkXSAmJiAhaWdub3JlW2lkXSAmJlxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c1tpZF0gPT0gbnVsbCAmJiB0eXBlb2YgKHN2Zy5lbGVtZW50W2lkXSkgPT09IFwidW5kZWZpbmVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShpZCwgdGhpcy5hdHRyW2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5rID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHJlZiA9IHRoaXMuaHJlZi5hbmltVmFsO1xuICAgICAgICBpZiAoaHJlZi5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gRWRpdGFibGVTVkcuaGFzaENoZWNrKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGhyZWYuc3Vic3RyKDEpKSk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5zY3JvbGxJbnRvVmlldykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGFyZW50Tm9kZS5zY3JvbGxJbnRvVmlldyh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGhyZWY7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdnZXRTdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICB2YXIgc3BhbiA9IEhUTUwuRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgICAgICBzcGFuLnN0eWxlLmNzc1RleHQgPSB0aGlzLnN0eWxlO1xuICAgICAgICAgICAgdGhpcy5zdHlsZXMgPSB0aGlzLlNWR3Byb2Nlc3NTdHlsZXMoc3Bhbi5zdHlsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3Byb2Nlc3NTdHlsZXMgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgICAgdmFyIHN0eWxlcyA9IHtcbiAgICAgICAgICAgIGJvcmRlcjogRWRpdGFibGVTVkcuZ2V0Qm9yZGVycyhzdHlsZSksXG4gICAgICAgICAgICBwYWRkaW5nOiBFZGl0YWJsZVNWRy5nZXRQYWRkaW5nKHN0eWxlKVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXN0eWxlcy5ib3JkZXIpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMuYm9yZGVyO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc3R5bGVzLnBhZGRpbmcpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdHlsZXMucGFkZGluZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3R5bGUuZm9udFNpemUpIHtcbiAgICAgICAgICAgIHN0eWxlc1snZm9udFNpemUnXSA9IHN0eWxlLmZvbnRTaXplO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHlsZS5jb2xvcikge1xuICAgICAgICAgICAgc3R5bGVzWydjb2xvciddID0gc3R5bGUuY29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0eWxlLmJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAgICAgc3R5bGVzWydiYWNrZ3JvdW5kJ10gPSBzdHlsZS5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0eWxlLmZvbnRTdHlsZSkge1xuICAgICAgICAgICAgc3R5bGVzWydmb250U3R5bGUnXSA9IHN0eWxlLmZvbnRTdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3R5bGUuZm9udFdlaWdodCkge1xuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSBzdHlsZS5mb250V2VpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHlsZS5mb250RmFtaWx5KSB7XG4gICAgICAgICAgICBzdHlsZXNbJ2ZvbnRGYW1pbHknXSA9IHN0eWxlLmZvbnRGYW1pbHk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0eWxlc1snZm9udFdlaWdodCddICYmIHN0eWxlc1snZm9udFdlaWdodCddLm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgICAgICAgc3R5bGVzWydmb250V2VpZ2h0J10gPSAocGFyc2VJbnQoc3R5bGVzWydmb250V2VpZ2h0J10pID4gNjAwID8gXCJib2xkXCIgOiBcIm5vcm1hbFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICh0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFwibW9cIilcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzY3JpcHRsZXZlbFwiLCBcImxzcGFjZVwiLCBcInJzcGFjZVwiKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgPD0gMCB8fCB0aGlzLmhhc1ZhbHVlKFwibHNwYWNlXCIpIHx8IHRoaXMuaGFzVmFsdWUoXCJyc3BhY2VcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXUgPSB0aGlzLlNWR2dldE11KHN2Zyk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLmxzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5sc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnJzcGFjZSA9IE1hdGgubWF4KDAsIFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5yc3BhY2UsIG11KSk7XG4gICAgICAgICAgICAgICAgdmFyIGNvcmUgPSB0aGlzLCBwYXJlbnQgPSB0aGlzLlBhcmVudCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQgJiYgcGFyZW50LmlzRW1iZWxsaXNoZWQoKSAmJiBwYXJlbnQuQ29yZSgpID09PSBjb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvcmUgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5QYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5sc3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLnggKz0gdmFsdWVzLmxzcGFjZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5yc3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLlggPSB2YWx1ZXMucnNwYWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGFjZSA9IHRoaXMudGV4U3BhY2luZygpO1xuICAgICAgICAgICAgdGhpcy5TVkdnZXRTY2FsZSgpO1xuICAgICAgICAgICAgaWYgKHNwYWNlICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnggKz0gVXRpbC5sZW5ndGgyZW0oc3BhY2UsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZUNvbG9yID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJtYXRoY29sb3JcIiwgXCJjb2xvclwiKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzICYmIHRoaXMuc3R5bGVzLmNvbG9yICYmICF2YWx1ZXMuY29sb3IpIHtcbiAgICAgICAgICAgIHZhbHVlcy5jb2xvciA9IHRoaXMuc3R5bGVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMuY29sb3IgJiYgIXRoaXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aGNvbG9yID0gdmFsdWVzLmNvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubWF0aGNvbG9yKSB7XG4gICAgICAgICAgICBFZGl0YWJsZVNWRy5FbGVtZW50KHN2Zy5lbGVtZW50LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLm1hdGhjb2xvcixcbiAgICAgICAgICAgICAgICBzdHJva2U6IHZhbHVlcy5tYXRoY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9yZGVycyA9ICh0aGlzLnN0eWxlcyB8fCB7fSkuYm9yZGVyLCBwYWRkaW5nID0gKHRoaXMuc3R5bGVzIHx8IHt9KS5wYWRkaW5nLCBibGVmdCA9ICgoYm9yZGVycyB8fCB7fSkubGVmdCB8fCAwKSwgcGxlZnQgPSAoKHBhZGRpbmcgfHwge30pLmxlZnQgfHwgMCksIGlkO1xuICAgICAgICB2YWx1ZXMuYmFja2dyb3VuZCA9ICh0aGlzLm1hdGhiYWNrZ3JvdW5kIHx8IHRoaXMuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgKHRoaXMuc3R5bGVzIHx8IHt9KS5iYWNrZ3JvdW5kIHx8IHRoaXMuTU1MLkNPTE9SLlRSQU5TUEFSRU5UKTtcbiAgICAgICAgaWYgKGJsZWZ0ICsgcGxlZnQpIHtcbiAgICAgICAgICAgIHZhciBkdXAgPSBuZXcgQkJPWCh0aGlzLkhVQik7XG4gICAgICAgICAgICBmb3IgKGlkIGluIHN2Zykge1xuICAgICAgICAgICAgICAgIGlmIChzdmcuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGR1cFtpZF0gPSBzdmdbaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR1cC54ID0gMDtcbiAgICAgICAgICAgIGR1cC55ID0gMDtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gRWRpdGFibGVTVkcuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzdmcucmVtb3ZlYWJsZSA9IHRydWU7XG4gICAgICAgICAgICBzdmcuQWRkKGR1cCwgYmxlZnQgKyBwbGVmdCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgICAgIHN2Zy53ICs9IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgICAgICAgICAgIHN2Zy5oICs9IHBhZGRpbmcudG9wIHx8IDA7XG4gICAgICAgICAgICBzdmcuZCArPSBwYWRkaW5nLmJvdHRvbSB8fCAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3JkZXJzKSB7XG4gICAgICAgICAgICBzdmcudyArPSBib3JkZXJzLnJpZ2h0IHx8IDA7XG4gICAgICAgICAgICBzdmcuaCArPSBib3JkZXJzLnRvcCB8fCAwO1xuICAgICAgICAgICAgc3ZnLmQgKz0gYm9yZGVycy5ib3R0b20gfHwgMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmJhY2tncm91bmQgIT09IHRoaXMuTU1MLkNPTE9SLlRSQU5TUEFSRU5UKSB7XG4gICAgICAgICAgICB2YXIgbm9kZU5hbWUgPSBzdmcuZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKG5vZGVOYW1lICE9PSBcImdcIiAmJiBub2RlTmFtZSAhPT0gXCJzdmdcIikge1xuICAgICAgICAgICAgICAgIHZhciBnID0gRWRpdGFibGVTVkcuRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICAgICAgZy5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc3ZnLmVsZW1lbnQgPSBnO1xuICAgICAgICAgICAgICAgIHN2Zy5yZW1vdmVhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQobmV3IEJCT1hfUkVDVChzdmcuaCwgc3ZnLmQsIHN2Zy53LCB7XG4gICAgICAgICAgICAgICAgZmlsbDogdmFsdWVzLmJhY2tncm91bmQsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIlxuICAgICAgICAgICAgfSksIDAsIDAsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9yZGVycykge1xuICAgICAgICAgICAgdmFyIGRkID0gNTtcbiAgICAgICAgICAgIHZhciBzaWRlcyA9IHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBbXCJWXCIsIHN2Zy5oICsgc3ZnLmQsIC1kZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICByaWdodDogW1wiVlwiLCBzdmcuaCArIHN2Zy5kLCBzdmcudyAtIGJvcmRlcnMucmlnaHQgKyBkZCwgLXN2Zy5kXSxcbiAgICAgICAgICAgICAgICB0b3A6IFtcIkhcIiwgc3ZnLncsIDAsIHN2Zy5oIC0gYm9yZGVycy50b3AgKyBkZF0sXG4gICAgICAgICAgICAgICAgYm90dG9tOiBbXCJIXCIsIHN2Zy53LCAwLCAtc3ZnLmQgLSBkZF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmb3IgKGlkIGluIHNpZGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNpZGVzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9yZGVyc1tpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaWRlID0gc2lkZXNbaWRdLCBib3ggPSBCQk9YW3NpZGVbMF0gKyBcIkxJTkVcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuQWRkKGJveChzaWRlWzFdLCBib3JkZXJzW2lkXSwgYm9yZGVyc1tpZCArIFwiU3R5bGVcIl0sIGJvcmRlcnNbaWQgKyBcIkNvbG9yXCJdKSwgc2lkZVsyXSwgc2lkZVszXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2hhbmRsZVZhcmlhbnQgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHRleHQpIHtcbiAgICAgICAgcmV0dXJuIEVkaXRhYmxlU1ZHLkhhbmRsZVZhcmlhbnQodmFyaWFudCwgc2NhbGUsIHRleHQpO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0VmFyaWFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF0aHZhcmlhbnRcIiwgXCJmb250ZmFtaWx5XCIsIFwiZm9udHdlaWdodFwiLCBcImZvbnRzdHlsZVwiKTtcbiAgICAgICAgdmFyIHZhcmlhbnQgPSB2YWx1ZXMubWF0aHZhcmlhbnQ7XG4gICAgICAgIGlmICh0aGlzLnZhcmlhbnRGb3JtKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCItVGVYLXZhcmlhbnRcIjtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXMuaGFzVmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIiwgdHJ1ZSk7XG4gICAgICAgIGlmICghdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5mYW1pbHkgPSB2YWx1ZXMuZm9udGZhbWlseTtcbiAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB2YWx1ZXMuZm9udHdlaWdodDtcbiAgICAgICAgICAgIHZhbHVlcy5zdHlsZSA9IHZhbHVlcy5mb250c3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy5zdHlsZSAmJiB0aGlzLnN0eWxlcy5mb250U3R5bGUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSB0aGlzLnN0eWxlcy5mb250U3R5bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXZhbHVlcy53ZWlnaHQgJiYgdGhpcy5zdHlsZXMuZm9udFdlaWdodCkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSB0aGlzLnN0eWxlcy5mb250V2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2YWx1ZXMuZmFtaWx5ICYmIHRoaXMuc3R5bGVzLmZvbnRGYW1pbHkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZmFtaWx5ID0gdGhpcy5zdHlsZXMuZm9udEZhbWlseTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLmZhbWlseSAmJiAhdmFsdWVzLmhhc1ZhcmlhbnQpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWVzLndlaWdodCAmJiB2YWx1ZXMubWF0aHZhcmlhbnQubWF0Y2goL2JvbGQvKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy53ZWlnaHQgPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdmFsdWVzLnN0eWxlICYmIHZhbHVlcy5tYXRodmFyaWFudC5tYXRjaCgvaXRhbGljLykpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuc3R5bGUgPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHtcbiAgICAgICAgICAgICAgICBmb3JjZUZhbWlseTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb250OiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZm9udC1mYW1pbHlcIjogdmFsdWVzLmZhbWlseVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFsdWVzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC1zdHlsZVwiXSA9IHZhbHVlcy5zdHlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2VpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdmFyaWFudC5mb250W1wiZm9udC13ZWlnaHRcIl0gPSB2YWx1ZXMud2VpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhcmlhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwiYm9sZFwiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogdGhpcy5NTUwuVkFSSUFOVC5CT0xELFxuICAgICAgICAgICAgICAgIGl0YWxpYzogdGhpcy5NTUwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIGZyYWt0dXI6IHRoaXMuTU1MLlZBUklBTlQuQk9MREZSQUtUVVIsXG4gICAgICAgICAgICAgICAgc2NyaXB0OiB0aGlzLk1NTC5WQVJJQU5ULkJPTERTQ1JJUFQsXG4gICAgICAgICAgICAgICAgXCJzYW5zLXNlcmlmXCI6IHRoaXMuTU1MLlZBUklBTlQuQk9MRFNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuU0FOU1NFUklGQk9MRElUQUxJQ1xuICAgICAgICAgICAgfVt2YXJpYW50XSB8fCB2YXJpYW50O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlcy53ZWlnaHQgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgYm9sZDogdGhpcy5NTUwuVkFSSUFOVC5ub3JtYWwsXG4gICAgICAgICAgICAgICAgXCJib2xkLWl0YWxpY1wiOiB0aGlzLk1NTC5WQVJJQU5ULklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtZnJha3R1clwiOiB0aGlzLk1NTC5WQVJJQU5ULkZSQUtUVVIsXG4gICAgICAgICAgICAgICAgXCJib2xkLXNjcmlwdFwiOiB0aGlzLk1NTC5WQVJJQU5ULlNDUklQVCxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRixcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtYm9sZC1pdGFsaWNcIjogdGhpcy5NTUwuVkFSSUFOVC5TQU5TU0VSSUZJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnN0eWxlID09PSBcIml0YWxpY1wiKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0ge1xuICAgICAgICAgICAgICAgIG5vcm1hbDogdGhpcy5NTUwuVkFSSUFOVC5JVEFMSUMsXG4gICAgICAgICAgICAgICAgYm9sZDogdGhpcy5NTUwuVkFSSUFOVC5CT0xESVRBTElDLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRklUQUxJQyxcbiAgICAgICAgICAgICAgICBcImJvbGQtc2Fucy1zZXJpZlwiOiB0aGlzLk1NTC5WQVJJQU5ULlNBTlNTRVJJRkJPTERJVEFMSUNcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZXMuc3R5bGUgPT09IFwibm9ybWFsXCIpIHtcbiAgICAgICAgICAgIHZhcmlhbnQgPSB7XG4gICAgICAgICAgICAgICAgaXRhbGljOiB0aGlzLk1NTC5WQVJJQU5ULk5PUk1BTCxcbiAgICAgICAgICAgICAgICBcImJvbGQtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuQk9MRCxcbiAgICAgICAgICAgICAgICBcInNhbnMtc2VyaWYtaXRhbGljXCI6IHRoaXMuTU1MLlZBUklBTlQuU0FOU1NFUklGLFxuICAgICAgICAgICAgICAgIFwic2Fucy1zZXJpZi1ib2xkLWl0YWxpY1wiOiB0aGlzLk1NTC5WQVJJQU5ULkJPTERTQU5TU0VSSUZcbiAgICAgICAgICAgIH1bdmFyaWFudF0gfHwgdmFyaWFudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh2YXJpYW50IGluIEVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlQpKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gXCJub3JtYWxcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFt2YXJpYW50XTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2dldFNjYWxlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICB2YXIgc2NhbGUgPSAxO1xuICAgICAgICBpZiAodGhpcy5tc2NhbGUpIHtcbiAgICAgICAgICAgIHNjYWxlID0gdGhpcy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcInNjcmlwdGxldmVsXCIsIFwiZm9udHNpemVcIik7XG4gICAgICAgICAgICB2YWx1ZXMubWF0aHNpemUgPSAodGhpcy5pc1Rva2VuID8gdGhpcyA6IHRoaXMuUGFyZW50KCkpLkdldChcIm1hdGhzaXplXCIpO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnN0eWxlcyB8fCB7fSkuZm9udFNpemUgJiYgIXZhbHVlcy5mb250c2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5mb250c2l6ZSA9IHRoaXMuc3R5bGVzLmZvbnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy5mb250c2l6ZSAmJiAhdGhpcy5tYXRoc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5tYXRoc2l6ZSA9IHZhbHVlcy5mb250c2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMuc2NyaXB0bGV2ZWwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuc2NyaXB0bGV2ZWwgPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzY2FsZSA9IE1hdGgucG93KHRoaXMuR2V0KFwic2NyaXB0c2l6ZW11bHRpcGxpZXJcIiksIHZhbHVlcy5zY3JpcHRsZXZlbCk7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnNjcmlwdG1pbnNpemUgPSBVdGlsLmxlbmd0aDJlbSh0aGlzLkdldChcInNjcmlwdG1pbnNpemVcIikpIC8gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoc2NhbGUgPCB2YWx1ZXMuc2NyaXB0bWluc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBzY2FsZSA9IHZhbHVlcy5zY3JpcHRtaW5zaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICAgICAgICAgIHRoaXMubXNjYWxlID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1hdGhzaXplKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgc3ZnLnNjYWxlID0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNjYWxlICo9IHRoaXMubXNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2FsZSAqIHRoaXMubXNjYWxlO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHZ2V0TXUgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIHZhciBtdSA9IDEsIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwic2NyaXB0bGV2ZWxcIiwgXCJzY3JpcHRzaXplbXVsdGlwbGllclwiKTtcbiAgICAgICAgaWYgKHN2Zy5zY2FsZSAmJiBzdmcuc2NhbGUgIT09IDEpIHtcbiAgICAgICAgICAgIG11ID0gMSAvIHN2Zy5zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLnNjcmlwdGxldmVsID4gMikge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5zY3JpcHRsZXZlbCA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdSA9IE1hdGguc3FydChNYXRoLnBvdyh2YWx1ZXMuc2NyaXB0c2l6ZW11bHRpcGxpZXIsIHZhbHVlcy5zY3JpcHRsZXZlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR25vdEVtcHR5ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoZGF0YS50eXBlICE9PSBcIm1yb3dcIiAmJiBkYXRhLnR5cGUgIT09IFwidGV4YXRvbVwiKSB8fFxuICAgICAgICAgICAgICAgIGRhdGEuZGF0YS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5kYXRhWzBdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR2NhblN0cmV0Y2ggPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBjYW4gPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlbGxpc2hlZCgpKSB7XG4gICAgICAgICAgICB2YXIgY29yZSA9IHRoaXMuQ29yZSgpO1xuICAgICAgICAgICAgaWYgKGNvcmUgJiYgY29yZSAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIGNhbiA9IGNvcmUuU1ZHY2FuU3RyZXRjaChkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIGlmIChjYW4gJiYgY29yZS5mb3JjZVN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTUJhc2VNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1NWRyhoLCBkKTtcbiAgICB9O1xuICAgIE1CYXNlTWl4aW4ucHJvdG90eXBlLlNWR3N0cmV0Y2hIID0gZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9TVkcodyk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZpbGUgPSBFZGl0YWJsZVNWRy5hdXRvbG9hZERpciArIFwiL1wiICsgdGhpcy50eXBlICsgXCIuanNcIjtcbiAgICAgICAgdGhpcy5IVUIuUmVzdGFydEFmdGVyKEFKQVguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICBNQmFzZU1peGluLnByb3RvdHlwZS5TVkdhdXRvbG9hZEZpbGUgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgZmlsZSA9IEVkaXRhYmxlU1ZHLmF1dG9sb2FkRGlyICsgXCIvXCIgKyBuYW1lICsgXCIuanNcIjtcbiAgICAgICAgdGhpcy5IVUIuUmVzdGFydEFmdGVyKEFKQVguUmVxdWlyZShmaWxlKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTUJhc2VNaXhpbjtcbn0pKCk7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIENoYXJzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDaGFyc01peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIENoYXJzTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBDaGFyc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICh2YXJpYW50LCBzY2FsZSwgcmVtYXAsIGNoYXJzKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gdGhpcy5kYXRhLmpvaW4oXCJcIikucmVwbGFjZSgvW1xcdTIwNjEtXFx1MjA2NF0vZywgXCJcIik7XG4gICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgdGV4dCA9IHJlbWFwKHRleHQsIGNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhcnNUaGluZyA9IHRoaXMuU1ZHaGFuZGxlVmFyaWFudCh2YXJpYW50LCBzY2FsZSwgdGV4dCk7XG4gICAgICAgIHRoaXMuRWRpdGFibGVTVkdlbGVtID0gY2hhcnNUaGluZy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gY2hhcnNUaGluZztcbiAgICB9O1xuICAgIHJldHVybiBDaGFyc01peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIEVudGl0eU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRW50aXR5TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gRW50aXR5TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBFbnRpdHlNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAodmFyaWFudCwgc2NhbGUsIHJlbWFwLCBjaGFycykge1xuICAgICAgICB2YXIgdGV4dCA9IHRoaXMudG9TdHJpbmcoKS5yZXBsYWNlKC9bXFx1MjA2MS1cXHUyMDY0XS9nLCBcIlwiKTtcbiAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcmVtYXAodGV4dCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdoYW5kbGluZyBlbnRpdHk6ICcsIHRleHQpO1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdoYW5kbGVWYXJpYW50KHZhcmlhbnQsIHNjYWxlLCB0ZXh0KTtcbiAgICB9O1xuICAgIHJldHVybiBFbnRpdHlNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNQWN0aW9uTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNQWN0aW9uTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUFjdGlvbk1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUFjdGlvbk1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNQWN0aW9uTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTWF0aE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTWF0aE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1hdGhNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMuU1ZHID0gQkJPWC5TdWJjbGFzcyh7XG4gICAgICAgICAgICB0eXBlOiBcInN2Z1wiLFxuICAgICAgICAgICAgcmVtb3ZlYWJsZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIE1hdGhNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoc3BhbiwgZGl2KSB7XG4gICAgICAgIHZhciBDT05GSUcgPSB0aGlzLlNWRy5jb25maWc7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0pIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB0aGlzLk1NTC5tYmFzZS5wcm90b3R5cGUuZGlzcGxheUFsaWduID0gdGhpcy5IVUIuY29uZmlnLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgIHRoaXMuTU1MLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5SW5kZW50ID0gdGhpcy5IVUIuY29uZmlnLmRpc3BsYXlJbmRlbnQ7XG4gICAgICAgICAgICBpZiAoU3RyaW5nKHRoaXMuSFVCLmNvbmZpZy5kaXNwbGF5SW5kZW50KS5tYXRjaCgvXjAoJHxbYS16JV0pL2kpKVxuICAgICAgICAgICAgICAgIHRoaXMuTU1MLm1iYXNlLnByb3RvdHlwZS5kaXNwbGF5SW5kZW50ID0gXCIwXCI7XG4gICAgICAgICAgICB2YXIgYm94ID0gQkJPWF9HKCk7XG4gICAgICAgICAgICBib3guQWRkKHRoaXMuZGF0YVswXS50b1NWRygpLCAwLCAwLCB0cnVlKTtcbiAgICAgICAgICAgIGJveC5DbGVhbigpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihib3gpO1xuICAgICAgICAgICAgdGhpcy5TVkcuRWxlbWVudChib3guZWxlbWVudCwge1xuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJjdXJyZW50Q29sb3JcIixcbiAgICAgICAgICAgICAgICBmaWxsOiBcImN1cnJlbnRDb2xvclwiLFxuICAgICAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6IDAsXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcIm1hdHJpeCgxIDAgMCAtMSAwIDApXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYm94LnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgICAgIHN2Zy5lbGVtZW50LnNldEF0dHJpYnV0ZShcInhtbG5zOnhsaW5rXCIsIFhMSU5LTlMpO1xuICAgICAgICAgICAgaWYgKENPTkZJRy51c2VGb250Q2FjaGUgJiYgIUNPTkZJRy51c2VHbG9iYWxDYWNoZSkge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50LmFwcGVuZENoaWxkKEJCT1guZGVmcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKGJveCk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIGlmICghc3Bhbikge1xuICAgICAgICAgICAgICAgIHN2Zy5lbGVtZW50ID0gc3ZnLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIik7XG4gICAgICAgICAgICAgICAgc3ZnLnJlbW92YWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN2ZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsID0gTWF0aC5tYXgoLXN2Zy5sLCAwKSwgciA9IE1hdGgubWF4KHN2Zy5yIC0gc3ZnLncsIDApO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gc3ZnLmVsZW1lbnQuc3R5bGU7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB0aGlzLlNWRy5FeChsICsgc3ZnLncgKyByKSk7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgdGhpcy5TVkcuRXgoc3ZnLkggKyBzdmcuRCArIDIgKiB0aGlzLlNWRy5lbSkpO1xuICAgICAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IHRoaXMuU1ZHLkV4KC1zdmcuRCAtIDIgKiB0aGlzLlNWRy5lbSk7XG4gICAgICAgICAgICBzdHlsZS5tYXJnaW5MZWZ0ID0gdGhpcy5TVkcuRXgoLWwpO1xuICAgICAgICAgICAgc3R5bGUubWFyZ2luUmlnaHQgPSB0aGlzLlNWRy5FeCgtcik7XG4gICAgICAgICAgICBzdmcuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ2aWV3Qm94XCIsIHRoaXMuU1ZHLkZpeGVkKC1sLCAxKSArIFwiIFwiICsgdGhpcy5TVkcuRml4ZWQoLXN2Zy5IIC0gdGhpcy5TVkcuZW0sIDEpICsgXCIgXCIgK1xuICAgICAgICAgICAgICAgIHRoaXMuU1ZHLkZpeGVkKGwgKyBzdmcudyArIHIsIDEpICsgXCIgXCIgKyB0aGlzLlNWRy5GaXhlZChzdmcuSCArIHN2Zy5EICsgMiAqIHRoaXMuU1ZHLmVtLCAxKSk7XG4gICAgICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSBzdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjFweFwiO1xuICAgICAgICAgICAgaWYgKHN2Zy5IID4gc3ZnLmgpIHtcbiAgICAgICAgICAgICAgICBzdHlsZS5tYXJnaW5Ub3AgPSB0aGlzLlNWRy5FeChzdmcuaCAtIHN2Zy5IKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdmcuRCA+IHN2Zy5kKSB7XG4gICAgICAgICAgICAgICAgc3R5bGUubWFyZ2luQm90dG9tID0gdGhpcy5TVkcuRXgoc3ZnLmQgLSBzdmcuRCk7XG4gICAgICAgICAgICAgICAgc3R5bGUudmVydGljYWxBbGlnbiA9IHRoaXMuU1ZHLkV4KC1zdmcuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYWx0dGV4dCA9IHRoaXMuR2V0KFwiYWx0dGV4dFwiKTtcbiAgICAgICAgICAgIGlmIChhbHR0ZXh0ICYmICFzdmcuZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIpKVxuICAgICAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBhbHR0ZXh0KTtcbiAgICAgICAgICAgIGlmICghc3ZnLmVsZW1lbnQuZ2V0QXR0cmlidXRlKFwicm9sZVwiKSlcbiAgICAgICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJtYXRoXCIpO1xuICAgICAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZChzdmcuZWxlbWVudCk7XG4gICAgICAgICAgICBzdmcuZWxlbWVudCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNNdWx0aWxpbmUgJiYgdGhpcy5HZXQoXCJkaXNwbGF5XCIpID09PSBcImJsb2NrXCIgJiYgIXN2Zy5oYXNJbmRlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJpbmRlbnRhbGlnbmZpcnN0XCIsIFwiaW5kZW50c2hpZnRmaXJzdFwiLCBcImluZGVudGFsaWduXCIsIFwiaW5kZW50c2hpZnRcIik7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbmZpcnN0ICE9PSB0aGlzLk1NTC5JTkRFTlRBTElHTi5JTkRFTlRBTElHTikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB2YWx1ZXMuaW5kZW50YWxpZ25maXJzdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRhbGlnbiA9PT0gdGhpcy5NTUwuSU5ERU5UQUxJR04uQVVUTykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50YWxpZ24gPSB0aGlzLmRpc3BsYXlBbGlnbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdGZpcnN0ICE9PSB0aGlzLk1NTC5JTkRFTlRTSElGVC5JTkRFTlRTSElGVCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuaW5kZW50c2hpZnQgPSB2YWx1ZXMuaW5kZW50c2hpZnRmaXJzdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRlbnRzaGlmdCA9PT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLmluZGVudHNoaWZ0ID0gXCIwXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBzaGlmdCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5pbmRlbnRzaGlmdCwgMSwgdGhpcy5TVkcuY3dpZHRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNwbGF5SW5kZW50ICE9PSBcIjBcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gVXRpbC5sZW5ndGgyZW0odGhpcy5kaXNwbGF5SW5kZW50LCAxLCB0aGlzLlNWRy5jd2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdCArPSAodmFsdWVzLmluZGVudGFsaWduID09PSB0aGlzLk1NTC5JTkRFTlRBTElHTi5SSUdIVCA/IC1pbmRlbnQgOiBpbmRlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkaXYuc3R5bGUudGV4dEFsaWduID0gdmFsdWVzLmluZGVudGFsaWduO1xuICAgICAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLkhVQi5JbnNlcnQoc3R5bGUsICh7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luTGVmdDogdGhpcy5TVkcuRXgoc2hpZnQpXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogdGhpcy5TVkcuRXgoLXNoaWZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNlbnRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IHRoaXMuU1ZHLkV4KHNoaWZ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5SaWdodDogdGhpcy5TVkcuRXgoLXNoaWZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVt2YWx1ZXMuaW5kZW50YWxpZ25dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNwYW47XG4gICAgfTtcbiAgICByZXR1cm4gTWF0aE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1FbmNsb3NlTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRW5jbG9zZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1FbmNsb3NlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRW5jbG9zZU1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU1ZHYXV0b2xvYWQoKTtcbiAgICB9O1xuICAgIHJldHVybiBNRW5jbG9zZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1FcnJvck1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUVycm9yTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUVycm9yTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNRXJyb3JNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpLCBzY2FsZSA9IFV0aWwubGVuZ3RoMmVtKHRoaXMuc3R5bGVzLmZvbnRTaXplIHx8IDEpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgZGVmID0gKHNjYWxlICE9PSAxID8ge1xuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInNjYWxlKFwiICsgdGhpcy5TVkcuRml4ZWQoc2NhbGUpICsgXCIpXCJcbiAgICAgICAgfSA6IHt9KTtcbiAgICAgICAgdmFyIGJib3ggPSBuZXcgQkJPWCh0aGlzLkhVQiwgZGVmKTtcbiAgICAgICAgYmJveC5BZGQodGhpcy5TVkdjaGlsZFNWRygwKSk7XG4gICAgICAgIGJib3guQ2xlYW4oKTtcbiAgICAgICAgaWYgKHNjYWxlICE9PSAxKSB7XG4gICAgICAgICAgICBiYm94LnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBhZGp1c3QgPSBbXCJ3XCIsIFwiaFwiLCBcImRcIiwgXCJsXCIsIFwiclwiLCBcIkRcIiwgXCJIXCJdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSBhZGp1c3QubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYmJveFthZGp1c3RbaV1dICo9IHNjYWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN2Zy5BZGQoYmJveCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1FcnJvck1peGluLnByb3RvdHlwZS5TVkdnZXRTdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzcGFuID0gSFRNTC5FbGVtZW50KFwic3BhblwiLCB7XG4gICAgICAgICAgICBzdHlsZTogdGhpcy5TVkcuY29uZmlnLm1lcnJvclN0eWxlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0eWxlcyA9IHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKTtcbiAgICAgICAgaWYgKHRoaXMuc3R5bGUpIHtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuY3NzVGV4dCA9IHRoaXMuc3R5bGU7XG4gICAgICAgICAgICB0aGlzLkhVQi5JbnNlcnQodGhpcy5zdHlsZXMsIHRoaXMuU1ZHcHJvY2Vzc1N0eWxlcyhzcGFuLnN0eWxlKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNRXJyb3JNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNRmVuY2VkTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNRmVuY2VkTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTUZlbmNlZE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5TVkcgPSBCQk9YX1JPVztcbiAgICB9XG4gICAgTUZlbmNlZE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIGlmICh0aGlzLmRhdGEub3Blbikge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5vcGVuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAxLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbXCJzZXBcIiArIGldKSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5DaGVjayh0aGlzLmRhdGFbXCJzZXBcIiArIGldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YS5jbG9zZSkge1xuICAgICAgICAgICAgc3ZnLkNoZWNrKHRoaXMuZGF0YS5jbG9zZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLlN0cmV0Y2goKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1GZW5jZWRNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNRnJhY01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTUZyYWNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNRnJhY01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtZnJhYyB0b1NWRyBjYWxsZWQhJyk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB2YXIgZnJhYyA9IG5ldyBCQk9YKHRoaXMuSFVCKTtcbiAgICAgICAgZnJhYy5zY2FsZSA9IHN2Zy5zY2FsZTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShmcmFjKTtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCksIGRlbiA9IHRoaXMuU1ZHY2hpbGRTVkcoMSk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImxpbmV0aGlja25lc3NcIiwgXCJudW1hbGlnblwiLCBcImRlbm9tYWxpZ25cIiwgXCJiZXZlbGxlZFwiKTtcbiAgICAgICAgdmFyIGlzRGlzcGxheSA9IHZhbHVlcy5kaXNwbGF5c3R5bGU7XG4gICAgICAgIHZhciBhID0gVXRpbC5UZVguYXhpc19oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgaWYgKHZhbHVlcy5iZXZlbGxlZCkge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gKGlzRGlzcGxheSA/IDQwMCA6IDE1MCk7XG4gICAgICAgICAgICB2YXIgSCA9IE1hdGgubWF4KG51bS5oICsgbnVtLmQsIGRlbi5oICsgZGVuLmQpICsgMiAqIGRlbHRhO1xuICAgICAgICAgICAgdmFyIGJldmVsID0gdGhpcy5TVkcuY3JlYXRlRGVsaW1pdGVyKDB4MkYsIEgpO1xuICAgICAgICAgICAgZnJhYy5BZGQobnVtLCAwLCAobnVtLmQgLSBudW0uaCkgLyAyICsgYSArIGRlbHRhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGJldmVsLCBudW0udyAtIGRlbHRhIC8gMiwgKGJldmVsLmQgLSBiZXZlbC5oKSAvIDIgKyBhKTtcbiAgICAgICAgICAgIGZyYWMuQWRkKGRlbiwgbnVtLncgKyBiZXZlbC53IC0gZGVsdGEsIChkZW4uZCAtIGRlbi5oKSAvIDIgKyBhIC0gZGVsdGEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIFcgPSBNYXRoLm1heChudW0udywgZGVuLncpO1xuICAgICAgICAgICAgdmFyIHQgPSB0aGlzLlNWRy50aGlja25lc3MyZW0odmFsdWVzLmxpbmV0aGlja25lc3MsIHRoaXMuc2NhbGUpICogdGhpcy5tc2NhbGUsIHAsIHEsIHUsIHY7XG4gICAgICAgICAgICB2YXIgbXQgPSBVdGlsLlRlWC5taW5fcnVsZV90aGlja25lc3MgLyB0aGlzLlNWRy5lbSAqIDEwMDA7XG4gICAgICAgICAgICBpZiAoaXNEaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgdSA9IFV0aWwuVGVYLm51bTE7XG4gICAgICAgICAgICAgICAgdiA9IFV0aWwuVGVYLmRlbm9tMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHUgPSAodCA9PT0gMCA/IFV0aWwuVGVYLm51bTMgOiBVdGlsLlRlWC5udW0yKTtcbiAgICAgICAgICAgICAgICB2ID0gVXRpbC5UZVguZGVub20yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdSAqPSBzY2FsZTtcbiAgICAgICAgICAgIHYgKj0gc2NhbGU7XG4gICAgICAgICAgICBpZiAodCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHAgPSBNYXRoLm1heCgoaXNEaXNwbGF5ID8gNyA6IDMpICogVXRpbC5UZVgucnVsZV90aGlja25lc3MsIDIgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGRlbi5oIC0gdik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHYgKz0gKHAgLSBxKSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyYWMudyA9IFc7XG4gICAgICAgICAgICAgICAgdCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwID0gTWF0aC5tYXgoKGlzRGlzcGxheSA/IDIgOiAwKSAqIG10ICsgdCwgdCAvIDIgKyAxLjUgKiBtdCk7XG4gICAgICAgICAgICAgICAgcSA9ICh1IC0gbnVtLmQpIC0gKGEgKyB0IC8gMik7XG4gICAgICAgICAgICAgICAgaWYgKHEgPCBwKSB7XG4gICAgICAgICAgICAgICAgICAgIHUgKz0gcCAtIHE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEgPSAoYSAtIHQgLyAyKSAtIChkZW4uaCAtIHYpO1xuICAgICAgICAgICAgICAgIGlmIChxIDwgcCkge1xuICAgICAgICAgICAgICAgICAgICB2ICs9IHAgLSBxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmFjLkFkZChuZXcgQkJPWF9SRUNUKHQgLyAyLCB0IC8gMiwgVyArIDIgKiB0KSwgMCwgYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcmFjLkFsaWduKG51bSwgdmFsdWVzLm51bWFsaWduLCB0LCB1KTtcbiAgICAgICAgICAgIGZyYWMuQWxpZ24oZGVuLCB2YWx1ZXMuZGVub21hbGlnbiwgdCwgLXYpO1xuICAgICAgICB9XG4gICAgICAgIGZyYWMuQ2xlYW4oKTtcbiAgICAgICAgc3ZnLkFkZChmcmFjLCAwLCAwKTtcbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgTUZyYWNNaXhpbi5wcm90b3R5cGUuU1ZHaGFuZGxlU3BhY2UgPSBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGlmICghdGhpcy50ZXhXaXRoRGVsaW1zICYmICF0aGlzLnVzZU1NTHNwYWNpbmcpIHtcbiAgICAgICAgICAgIHN2Zy54ID0gc3ZnLlggPSBVdGlsLlRlWC5udWxsZGVsaW1pdGVyc3BhY2UgKiB0aGlzLm1zY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBfc3VwZXIucHJvdG90eXBlLlNWR2hhbmRsZVNwYWNlLmNhbGwodGhpcywgc3ZnKTtcbiAgICB9O1xuICAgIE1GcmFjTWl4aW4ubmFtZSA9IFwibWZyYWNcIjtcbiAgICByZXR1cm4gTUZyYWNNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNR2x5cGhNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1HbHlwaE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1HbHlwaE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTUdseXBoTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5TVkdhdXRvbG9hZCgpO1xuICAgIH07XG4gICAgO1xuICAgIHJldHVybiBNR2x5cGhNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNTXVsdGlTY3JpcHRzTWl4aW4gPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1NdWx0aVNjcmlwdHNNaXhpbigpIHtcbiAgICAgICAgdGhpcy50b1NWRyA9IE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWQ7XG4gICAgfVxuICAgIHJldHVybiBNTXVsdGlTY3JpcHRzTWl4aW47XG59KSgpO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNb01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTW9NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNb01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTW9NaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuU1ZHc3RyZXRjaFYoSFcsIEQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVkaXRhYmxlU1ZHLnN0cmVjaEgoSFcpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJpYW50ID0gdGhpcy5TVkdnZXRWYXJpYW50KCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImxhcmdlb3BcIiwgXCJkaXNwbGF5c3R5bGVcIik7XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgdmFyaWFudCA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlZBUklBTlRbdmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwiLWxhcmdlT3BcIiA6IFwiLXNtYWxsT3BcIl07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuQ29yZVBhcmVudCgpLCBpc1NjcmlwdCA9IChwYXJlbnQgJiYgcGFyZW50LmlzYShNTUwubXN1YnN1cCkgJiYgdGhpcyAhPT0gcGFyZW50LmRhdGFbMF0pLCBtYXBjaGFycyA9IChpc1NjcmlwdCA/IHRoaXMucmVtYXBDaGFycyA6IG51bGwpO1xuICAgICAgICBpZiAodGhpcy5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIHBhcmVudCAmJiBwYXJlbnQuaXNhKE1NTC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIG1hcGNoYXJzID0gRWRpdGFibGVTVkcuRk9OVERBVEEuUkVNQVBBQ0NFTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmRlciAmJiB0aGlzID09PSB1bmRlci5Db3JlTU8oKSAmJiBwYXJlbnQuR2V0KFwiYWNjZW50dW5kZXJcIikpIHtcbiAgICAgICAgICAgICAgICBtYXBjaGFycyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2NyaXB0ICYmIHRoaXMuZGF0YS5qb2luKFwiXCIpLm1hdGNoKC9bJ2BcIlxcdTAwQjRcXHUyMDMyLVxcdTIwMzdcXHUyMDU3XS8pKSB7XG4gICAgICAgICAgICB2YXJpYW50ID0gRWRpdGFibGVTVkcuRk9OVERBVEEuVkFSSUFOVFtcIi1UZVgtdmFyaWFudFwiXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHRoaXMuZGF0YVtpXS50b1NWRyh2YXJpYW50LCBzY2FsZSwgdGhpcy5yZW1hcCwgbWFwY2hhcnMpLCB4ID0gc3ZnLnc7XG4gICAgICAgICAgICAgICAgaWYgKHggPT09IDAgJiYgLXRleHQubCA+IDEwICogdGV4dC53KSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gLXRleHQubDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZCh0ZXh0LCB4LCAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dC5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ID0gdGV4dC5za2V3O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5qb2luKFwiXCIpLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHN2Zy5za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMubGFyZ2VvcCkge1xuICAgICAgICAgICAgc3ZnLnkgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAtIChzdmcuaCAtIHN2Zy5kKSAvIDIgLyBzY2FsZTtcbiAgICAgICAgICAgIGlmIChzdmcuciA+IHN2Zy53KSB7XG4gICAgICAgICAgICAgICAgc3ZnLmljID0gc3ZnLnIgLSBzdmcudztcbiAgICAgICAgICAgICAgICBzdmcudyA9IHN2Zy5yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHY2FuU3RyZXRjaCA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLkdldChcInN0cmV0Y2h5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGMgPSB0aGlzLmRhdGEuam9pbihcIlwiKTtcbiAgICAgICAgaWYgKGMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLkNvcmVQYXJlbnQoKTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiBwYXJlbnQuaXNhKE1NTC5tdW5kZXJvdmVyKSAmJlxuICAgICAgICAgICAgdGhpcy5Db3JlVGV4dChwYXJlbnQuZGF0YVtwYXJlbnQuYmFzZV0pLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFyIG92ZXIgPSBwYXJlbnQuZGF0YVtwYXJlbnQub3Zlcl0sIHVuZGVyID0gcGFyZW50LmRhdGFbcGFyZW50LnVuZGVyXTtcbiAgICAgICAgICAgIGlmIChvdmVyICYmIHRoaXMgPT09IG92ZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudFwiKSkge1xuICAgICAgICAgICAgICAgIGMgPSBFZGl0YWJsZVNWRy5GT05UREFUQS5SRU1BUEFDQ0VOVFtjXSB8fCBjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5kZXIgJiYgdGhpcyA9PT0gdW5kZXIuQ29yZU1PKCkgJiYgcGFyZW50LkdldChcImFjY2VudHVuZGVyXCIpKSB7XG4gICAgICAgICAgICAgICAgYyA9IEVkaXRhYmxlU1ZHLkZPTlREQVRBLlJFTUFQQUNDRU5UVU5ERVJbY10gfHwgYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjID0gRWRpdGFibGVTVkcuRk9OVERBVEEuREVMSU1JVEVSU1tjLmNoYXJDb2RlQXQoMCldO1xuICAgICAgICB2YXIgY2FuID0gKGMgJiYgYy5kaXIgPT0gZGlyZWN0aW9uLnN1YnN0cigwLCAxKSk7XG4gICAgICAgIGlmICghY2FuKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5zdmc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb3JjZVN0cmV0Y2ggPSBjYW4gJiYgKHRoaXMuR2V0KFwibWluc2l6ZVwiLCB0cnVlKSB8fCB0aGlzLkdldChcIm1heHNpemVcIiwgdHJ1ZSkpO1xuICAgICAgICByZXR1cm4gY2FuO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpO1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJzeW1tZXRyaWNcIiwgXCJtYXhzaXplXCIsIFwibWluc2l6ZVwiKTtcbiAgICAgICAgdmFyIGF4aXMgPSBVdGlsLlRlWC5heGlzX2hlaWdodCAqIHN2Zy5zY2FsZSwgbXUgPSB0aGlzLlNWR2dldE11KHN2ZyksIEg7XG4gICAgICAgIGlmICh2YWx1ZXMuc3ltbWV0cmljKSB7XG4gICAgICAgICAgICBIID0gMiAqIE1hdGgubWF4KGggLSBheGlzLCBkICsgYXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBIID0gaCArIGQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzLm1heHNpemUgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMubWF4c2l6ZSwgbXUsIHN2Zy5oICsgc3ZnLmQpO1xuICAgICAgICB2YWx1ZXMubWluc2l6ZSA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5taW5zaXplLCBtdSwgc3ZnLmggKyBzdmcuZCk7XG4gICAgICAgIEggPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIEgpKTtcbiAgICAgICAgaWYgKEggIT0gdmFsdWVzLm1pbnNpemUpIHtcbiAgICAgICAgICAgIEggPSBbTWF0aC5tYXgoSCAqIFV0aWwuVGVYLmRlbGltaXRlcmZhY3RvciAvIDEwMDAsIEggLSBVdGlsLlRlWC5kZWxpbWl0ZXJzaG9ydGZhbGwpLCBIXTtcbiAgICAgICAgfVxuICAgICAgICBzdmcgPSBFZGl0YWJsZVNWRy5jcmVhdGVEZWxpbWl0ZXIodGhpcy5kYXRhLmpvaW4oXCJcIikuY2hhckNvZGVBdCgwKSwgSCwgc3ZnLnNjYWxlKTtcbiAgICAgICAgaWYgKHZhbHVlcy5zeW1tZXRyaWMpIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgLyAyICsgYXhpcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIEggPSAoc3ZnLmggKyBzdmcuZCkgKiBoIC8gKGggKyBkKTtcbiAgICAgICAgfVxuICAgICAgICBzdmcueSA9IEggLSBzdmcuaDtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTW9NaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5zdmcgfHwgdGhpcy50b1NWRygpLCBtdSA9IHRoaXMuU1ZHZ2V0TXUoc3ZnKTtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwibWF4c2l6ZVwiLCBcIm1pbnNpemVcIiwgXCJtYXRodmFyaWFudFwiLCBcImZvbnR3ZWlnaHRcIik7XG4gICAgICAgIGlmICgodmFsdWVzLmZvbnR3ZWlnaHQgPT09IFwiYm9sZFwiIHx8IHBhcnNlSW50KHZhbHVlcy5mb250d2VpZ2h0KSA+PSA2MDApICYmXG4gICAgICAgICAgICAhdGhpcy5HZXQoXCJtYXRodmFyaWFudFwiLCB0cnVlKSkge1xuICAgICAgICAgICAgdmFsdWVzLm1hdGh2YXJpYW50ID0gdGhpcy5NTUwuVkFSSUFOVC5CT0xEO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5tYXhzaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1heHNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHZhbHVlcy5taW5zaXplID0gVXRpbC5sZW5ndGgyZW0odmFsdWVzLm1pbnNpemUsIG11LCBzdmcudyk7XG4gICAgICAgIHcgPSBNYXRoLm1heCh2YWx1ZXMubWluc2l6ZSwgTWF0aC5taW4odmFsdWVzLm1heHNpemUsIHcpKTtcbiAgICAgICAgc3ZnID0gRWRpdGFibGVTVkcuY3JlYXRlRGVsaW1pdGVyKHRoaXMuZGF0YS5qb2luKFwiXCIpLmNoYXJDb2RlQXQoMCksIHcsIHN2Zy5zY2FsZSwgdmFsdWVzLm1hdGh2YXJpYW50KTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN2Zy5lbGVtZW50O1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHN2Zy5zdHJldGNoZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1vTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVBhZGRlZE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVBhZGRlZE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1QYWRkZWRNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QYWRkZWRNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoSFcsIEQpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHZhciBwYWQgPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0VmFsdWVzKFwiaGVpZ2h0XCIsIFwiZGVwdGhcIiwgXCJ3aWR0aFwiLCBcImxzcGFjZVwiLCBcInZvZmZzZXRcIiksIFggPSAwLCBZID0gMDtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMubHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgWCA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLmxzcGFjZSwgbXUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlcy52b2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgWSA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHBhZCwgdmFsdWVzLnZvZmZzZXQsIG11KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBoID0gcGFkLmgsIGQgPSBwYWQuZCwgdyA9IHBhZC53LCB5ID0gcGFkLnk7XG4gICAgICAgICAgICBzdmcuQWRkKHBhZCwgWCwgWSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHN2Zy5oID0gaCArIHk7XG4gICAgICAgICAgICBzdmcuZCA9IGQgLSB5O1xuICAgICAgICAgICAgc3ZnLncgPSB3O1xuICAgICAgICAgICAgc3ZnLnJlbW92ZWFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaGVpZ2h0ICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmggPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5oZWlnaHQsIG11LCBcImhcIiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVzLmRlcHRoICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgc3ZnLmQgPSB0aGlzLlNWR2xlbmd0aDJlbShzdmcsIHZhbHVlcy5kZXB0aCwgbXUsIFwiZFwiLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZXMud2lkdGggIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBzdmcudyA9IHRoaXMuU1ZHbGVuZ3RoMmVtKHN2ZywgdmFsdWVzLndpZHRoLCBtdSwgXCJ3XCIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN2Zy5oID4gc3ZnLkgpIHtcbiAgICAgICAgICAgICAgICBzdmcuSCA9IHN2Zy5oO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgaWYgKHN2Zy5kID4gc3ZnLkQpIHtcbiAgICAgICAgICAgICAgICBzdmcuRCA9IHN2Zy5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVBhZGRlZE1peGluLnByb3RvdHlwZS5TVkdsZW5ndGgyZW0gPSBmdW5jdGlvbiAoc3ZnLCBsZW5ndGgsIG11LCBkLCBtKSB7XG4gICAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgICAgIG0gPSAtVXRpbC5CSUdESU1FTjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF0Y2ggPSBTdHJpbmcobGVuZ3RoKS5tYXRjaCgvd2lkdGh8aGVpZ2h0fGRlcHRoLyk7XG4gICAgICAgIHZhciBzaXplID0gKG1hdGNoID8gc3ZnW21hdGNoWzBdLmNoYXJBdCgwKV0gOiAoZCA/IHN2Z1tkXSA6IDApKTtcbiAgICAgICAgdmFyIHYgPSBVdGlsLmxlbmd0aDJlbShsZW5ndGgsIG11LCBzaXplIC8gdGhpcy5tc2NhbGUpICogdGhpcy5tc2NhbGU7XG4gICAgICAgIGlmIChkICYmIFN0cmluZyhsZW5ndGgpLm1hdGNoKC9eXFxzKlstK10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KG0sIHN2Z1tkXSArIHYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNUGFkZGVkTWl4aW47XG59KShNQmFzZU1peGluKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYmFzZV9taXhpbi50c1wiIC8+XG52YXIgTVBoYW50b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1QaGFudG9tTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVBoYW50b21NaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIE1QaGFudG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQoMCwgSFcsIEQpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgd2hpbGUgKHN2Zy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBzdmcuZWxlbWVudC5yZW1vdmVDaGlsZChzdmcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgaWYgKHN2Zy5yZW1vdmVhYmxlICYmICFzdmcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBkZWxldGUgc3ZnLmVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNUGhhbnRvbU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1TcXJ0TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNU3FydE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TcXJ0TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3FydE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpLCBzY2FsZSA9IHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXMuU1ZHY2hpbGRTVkcoMCksIHJ1bGUsIHN1cmQ7XG4gICAgICAgIHZhciB0ID0gVXRpbC5UZVgucnVsZV90aGlja25lc3MgKiBzY2FsZSwgcCwgcSwgSCwgeCA9IDA7XG4gICAgICAgIGlmICh0aGlzLkdldChcImRpc3BsYXlzdHlsZVwiKSkge1xuICAgICAgICAgICAgcCA9IFV0aWwuVGVYLnhfaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwID0gdDtcbiAgICAgICAgfVxuICAgICAgICBxID0gTWF0aC5tYXgodCArIHAgLyA0LCAxMDAwICogVXRpbC5UZVgubWluX3Jvb3Rfc3BhY2UgLyBVdGlsLmVtKTtcbiAgICAgICAgSCA9IGJhc2UuaCArIGJhc2UuZCArIHEgKyB0O1xuICAgICAgICBzdXJkID0gRWRpdGFibGVTVkcuY3JlYXRlRGVsaW1pdGVyKDB4MjIxQSwgSCwgc2NhbGUpO1xuICAgICAgICBpZiAoc3VyZC5oICsgc3VyZC5kID4gSCkge1xuICAgICAgICAgICAgcSA9ICgoc3VyZC5oICsgc3VyZC5kKSAtIChIIC0gdCkpIC8gMjtcbiAgICAgICAgfVxuICAgICAgICBydWxlID0gbmV3IEJCT1hfUkVDVCh0LCAwLCBiYXNlLncpO1xuICAgICAgICBIID0gYmFzZS5oICsgcSArIHQ7XG4gICAgICAgIHggPSB0aGlzLlNWR2FkZFJvb3Qoc3ZnLCBzdXJkLCB4LCBzdXJkLmggKyBzdXJkLmQgLSBILCBzY2FsZSk7XG4gICAgICAgIHN2Zy5BZGQoc3VyZCwgeCwgSCAtIHN1cmQuaCk7XG4gICAgICAgIHN2Zy5BZGQocnVsZSwgeCArIHN1cmQudywgSCAtIHJ1bGUuaCk7XG4gICAgICAgIHN2Zy5BZGQoYmFzZSwgeCArIHN1cmQudywgMCk7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICBzdmcuaCArPSB0O1xuICAgICAgICBzdmcuSCArPSB0O1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TcXJ0TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9O1xuICAgIHJldHVybiBNU3FydE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1zcXJ0X21peGluLnRzXCIgLz5cbnZhciBNUm9vdE1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVJvb3RNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNUm9vdE1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy50b1NWRyA9IE1TcXJ0TWl4aW4udG9TVkc7XG4gICAgfVxuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR2FkZFJvb3QgPSBmdW5jdGlvbiAoc3ZnLCBzdXJkLCB4LCBkLCBzY2FsZSkge1xuICAgICAgICB2YXIgZHggPSAoc3VyZC5pc011bHRpQ2hhciA/IC41NSA6IC42NSkgKiBzdXJkLnc7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMV0pIHtcbiAgICAgICAgICAgIHZhciByb290ID0gdGhpcy5kYXRhWzFdLnRvU1ZHKCk7XG4gICAgICAgICAgICByb290LnggPSAwO1xuICAgICAgICAgICAgdmFyIGggPSB0aGlzLlNWR3Jvb3RIZWlnaHQoc3VyZC5oICsgc3VyZC5kLCBzY2FsZSwgcm9vdCkgLSBkO1xuICAgICAgICAgICAgdmFyIHcgPSBNYXRoLm1pbihyb290LncsIHJvb3Qucik7XG4gICAgICAgICAgICB4ID0gTWF0aC5tYXgodywgZHgpO1xuICAgICAgICAgICAgc3ZnLkFkZChyb290LCB4IC0gdywgaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkeCA9IHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggLSBkeDtcbiAgICB9O1xuICAgIE1Sb290TWl4aW4ucHJvdG90eXBlLlNWR3Jvb3RIZWlnaHQgPSBmdW5jdGlvbiAoZCwgc2NhbGUsIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIC40NSAqIChkIC0gOTAwICogc2NhbGUpICsgNjAwICogc2NhbGUgKyBNYXRoLm1heCgwLCByb290LmQgLSA3NSk7XG4gICAgfTtcbiAgICByZXR1cm4gTVJvb3RNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNUm93TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNUm93TWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVJvd01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5TVkcgPSBCQk9YX1JPVztcbiAgICB9XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZvY3VzIScpO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAoZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdmcuc2ggPSBoO1xuICAgICAgICAgICAgc3ZnLnNkID0gZDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbSA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBtOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBzdmcuQ2hlY2sodGhpcy5kYXRhW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuU3RyZXRjaCgpO1xuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPT09IDEgJiYgdGhpcy5kYXRhWzBdKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YVswXS5FZGl0YWJsZVNWR2RhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YS5za2V3KSB7XG4gICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBkYXRhLnNrZXc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuU1ZHbGluZUJyZWFrcyhzdmcpKSB7XG4gICAgICAgICAgICBzdmcgPSB0aGlzLlNWR211bHRpbGluZShzdmcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICB0aGlzLkVkaXRhYmxlU1ZHZWxlbSA9IHN2Zy5lbGVtZW50O1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgTVJvd01peGluLnByb3RvdHlwZS5TVkdsaW5lQnJlYWtzID0gZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBpZiAoIXRoaXMucGFyZW50LmxpbmVicmVha0NvbnRhaW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoU1ZHLmNvbmZpZy5saW5lYnJlYWtzLmF1dG9tYXRpYyAmJlxuICAgICAgICAgICAgc3ZnLncgPiB0aGlzLlNWRy5saW5lYnJlYWtXaWR0aCkgfHwgdGhpcy5oYXNOZXdsaW5lKCk7XG4gICAgfTtcbiAgICBNUm93TWl4aW4ucHJvdG90eXBlLlNWR211bHRpbGluZSA9IGZ1bmN0aW9uIChzcGFuKSB7XG4gICAgICAgIHRoaXMuTU1MLm1iYXNlLlNWR2F1dG9sb2FkRmlsZShcIm11bHRpbGluZVwiKTtcbiAgICB9O1xuICAgIE1Sb3dNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBzdmcuQWRkKHRoaXMuRWRpdGFibGVTVkdkYXRhU3RyZXRjaGVkKGksIHcpLCBzdmcudywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIE1Sb3dNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNc01peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXNNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNc01peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy50b1NWRyA9IE1CYXNlTWl4aW4uU1ZHYXV0b2xvYWQ7XG4gICAgfVxuICAgIHJldHVybiBNc01peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1TcGFjZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVNwYWNlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVNwYWNlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3BhY2VNaXhpbi5wcm90b3R5cGUudG9TVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImhlaWdodFwiLCBcImRlcHRoXCIsIFwid2lkdGhcIik7XG4gICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMubWF0aGJhY2tncm91bmQ7XG4gICAgICAgIGlmICh0aGlzLmJhY2tncm91bmQgJiYgIXRoaXMubWF0aGJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXRoYmFja2dyb3VuZCA9IHRoaXMuYmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U2NhbGUoc3ZnKTtcbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5tc2NhbGUsIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICBzdmcuaCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5oZWlnaHQsIG11KSAqIHNjYWxlO1xuICAgICAgICBzdmcuZCA9IFV0aWwubGVuZ3RoMmVtKHZhbHVlcy5kZXB0aCwgbXUpICogc2NhbGU7XG4gICAgICAgIHN2Zy53ID0gc3ZnLnIgPSBVdGlsLmxlbmd0aDJlbSh2YWx1ZXMud2lkdGgsIG11KSAqIHNjYWxlO1xuICAgICAgICBpZiAoc3ZnLncgPCAwKSB7XG4gICAgICAgICAgICBzdmcueCA9IHN2Zy53O1xuICAgICAgICAgICAgc3ZnLncgPSBzdmcuciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN2Zy5oIDwgLXN2Zy5kKSB7XG4gICAgICAgICAgICBzdmcuZCA9IC1zdmcuaDtcbiAgICAgICAgfVxuICAgICAgICBzdmcubCA9IDA7XG4gICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZUNvbG9yKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIHJldHVybiBNU3BhY2VNaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1iYXNlX21peGluLnRzXCIgLz5cbnZhciBNU3R5bGVNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdHlsZU1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1TdHlsZU1peGluKCkge1xuICAgICAgICBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgTVN0eWxlTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLlNWR2dldFN0eWxlcygpO1xuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFbMF0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIG1hdGggPSBzdmcuQWRkKHRoaXMuZGF0YVswXS50b1NWRygpKTtcbiAgICAgICAgICAgIHN2Zy5DbGVhbigpO1xuICAgICAgICAgICAgaWYgKG1hdGguaWMpIHtcbiAgICAgICAgICAgICAgICBzdmcuaWMgPSBtYXRoLmljO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgcmV0dXJuIHN2ZztcbiAgICB9O1xuICAgIE1TdHlsZU1peGluLnByb3RvdHlwZS5TVkdzdHJldGNoSCA9IGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaEgodykgOiBCQk9YLk5VTEwoKSk7XG4gICAgfTtcbiAgICBNU3R5bGVNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaFYgPSBmdW5jdGlvbiAoaCwgZCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hWKGgsIGQpIDogQkJPWC5OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIE1TdHlsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1TdWJTdXBNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1TdWJTdXBNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNU3ViU3VwTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNU3ViU3VwTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKSwgc2NhbGUgPSB0aGlzLlNWR2dldFNjYWxlKHN2Zyk7XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgdmFyIG11ID0gdGhpcy5TVkdnZXRNdShzdmcpO1xuICAgICAgICB2YXIgYmFzZSA9IHN2Zy5BZGQodGhpcy5FZGl0YWJsZVNWR2RhdGFTdHJldGNoZWQodGhpcy5iYXNlLCBIVywgRCkpO1xuICAgICAgICB2YXIgc3NjYWxlID0gKHRoaXMuZGF0YVt0aGlzLnN1cF0gfHwgdGhpcy5kYXRhW3RoaXMuc3ViXSB8fCB0aGlzKS5TVkdnZXRTY2FsZSgpO1xuICAgICAgICB2YXIgeF9oZWlnaHQgPSBVdGlsLlRlWC54X2hlaWdodCAqIHNjYWxlLCBzID0gVXRpbC5UZVguc2NyaXB0c3BhY2UgKiBzY2FsZTtcbiAgICAgICAgdmFyIHN1cCwgc3ViO1xuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdXBdKSkge1xuICAgICAgICAgICAgc3VwID0gdGhpcy5kYXRhW3RoaXMuc3VwXS50b1NWRygpO1xuICAgICAgICAgICAgc3VwLncgKz0gcztcbiAgICAgICAgICAgIHN1cC5yID0gTWF0aC5tYXgoc3VwLncsIHN1cC5yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5TVkdub3RFbXB0eSh0aGlzLmRhdGFbdGhpcy5zdWJdKSkge1xuICAgICAgICAgICAgc3ViID0gdGhpcy5kYXRhW3RoaXMuc3ViXS50b1NWRygpO1xuICAgICAgICAgICAgc3ViLncgKz0gcztcbiAgICAgICAgICAgIHN1Yi5yID0gTWF0aC5tYXgoc3ViLncsIHN1Yi5yKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IFV0aWwuVGVYLnN1cF9kcm9wICogc3NjYWxlLCByID0gVXRpbC5UZVguc3ViX2Ryb3AgKiBzc2NhbGU7XG4gICAgICAgIHZhciB1ID0gYmFzZS5oICsgKGJhc2UueSB8fCAwKSAtIHEsIHYgPSBiYXNlLmQgLSAoYmFzZS55IHx8IDApICsgciwgZGVsdGEgPSAwLCBwO1xuICAgICAgICBpZiAoYmFzZS5pYykge1xuICAgICAgICAgICAgYmFzZS53IC09IGJhc2UuaWM7XG4gICAgICAgICAgICBkZWx0YSA9IDEuMyAqIGJhc2UuaWMgKyAuMDU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGF0YVt0aGlzLmJhc2VdICYmXG4gICAgICAgICAgICAodGhpcy5kYXRhW3RoaXMuYmFzZV0udHlwZSA9PT0gXCJtaVwiIHx8IHRoaXMuZGF0YVt0aGlzLmJhc2VdLnR5cGUgPT09IFwibW9cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGFbdGhpcy5iYXNlXS5kYXRhLmpvaW4oXCJcIikubGVuZ3RoID09PSAxICYmIGJhc2Uuc2NhbGUgPT09IDEgJiZcbiAgICAgICAgICAgICAgICAhYmFzZS5zdHJldGNoZWQgJiYgIXRoaXMuZGF0YVt0aGlzLmJhc2VdLkdldChcImxhcmdlb3BcIikpIHtcbiAgICAgICAgICAgICAgICB1ID0gdiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuZ2V0VmFsdWVzKFwic3Vic2NyaXB0c2hpZnRcIiwgXCJzdXBlcnNjcmlwdHNoaWZ0XCIpO1xuICAgICAgICBtaW4uc3Vic2NyaXB0c2hpZnQgPSAobWluLnN1YnNjcmlwdHNoaWZ0ID09PSBcIlwiID8gMCA6IFV0aWwubGVuZ3RoMmVtKG1pbi5zdWJzY3JpcHRzaGlmdCwgbXUpKTtcbiAgICAgICAgbWluLnN1cGVyc2NyaXB0c2hpZnQgPSAobWluLnN1cGVyc2NyaXB0c2hpZnQgPT09IFwiXCIgPyAwIDogVXRpbC5sZW5ndGgyZW0obWluLnN1cGVyc2NyaXB0c2hpZnQsIG11KSk7XG4gICAgICAgIHZhciB4ID0gYmFzZS53ICsgYmFzZS54O1xuICAgICAgICBpZiAoIXN1cCkge1xuICAgICAgICAgICAgaWYgKHN1Yikge1xuICAgICAgICAgICAgICAgIHYgPSBNYXRoLm1heCh2LCBVdGlsLlRlWC5zdWIxICogc2NhbGUsIHN1Yi5oIC0gKDQgLyA1KSAqIHhfaGVpZ2h0LCBtaW4uc3Vic2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3ViLCB4LCAtdik7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gdGhpcy5nZXRWYWx1ZXMoXCJkaXNwbGF5c3R5bGVcIiwgXCJ0ZXhwcmltZXN0eWxlXCIpO1xuICAgICAgICAgICAgICAgIHAgPSBVdGlsLlRlWFsodmFsdWVzLmRpc3BsYXlzdHlsZSA/IFwic3VwMVwiIDogKHZhbHVlcy50ZXhwcmltZXN0eWxlID8gXCJzdXAzXCIgOiBcInN1cDJcIikpXTtcbiAgICAgICAgICAgICAgICB1ID0gTWF0aC5tYXgodSwgcCAqIHNjYWxlLCBzdXAuZCArICgxIC8gNCkgKiB4X2hlaWdodCwgbWluLnN1cGVyc2NyaXB0c2hpZnQpO1xuICAgICAgICAgICAgICAgIHN2Zy5BZGQoc3VwLCB4ICsgZGVsdGEsIHUpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSB1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdiA9IE1hdGgubWF4KHYsIFV0aWwuVGVYLnN1YjIgKiBzY2FsZSk7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBVdGlsLlRlWC5ydWxlX3RoaWNrbmVzcyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgIGlmICgodSAtIHN1cC5kKSAtIChzdWIuaCAtIHYpIDwgMyAqIHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IDMgKiB0IC0gdSArIHN1cC5kICsgc3ViLmg7XG4gICAgICAgICAgICAgICAgICAgIHEgPSAoNCAvIDUpICogeF9oZWlnaHQgLSAodSAtIHN1cC5kKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHEgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1ICs9IHE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2IC09IHE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3ZnLkFkZChzdXAsIHggKyBkZWx0YSwgTWF0aC5tYXgodSwgbWluLnN1cGVyc2NyaXB0c2hpZnQpKTtcbiAgICAgICAgICAgICAgICBzdmcuQWRkKHN1YiwgeCwgLU1hdGgubWF4KHYsIG1pbi5zdWJzY3JpcHRzaGlmdCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGF0YVt0aGlzLnN1cF0uRWRpdGFibGVTVkdkYXRhLmR4ID0gZGVsdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3VwXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSBNYXRoLm1heCh1LCBtaW4uc3VwZXJzY3JpcHRzaGlmdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW3RoaXMuc3ViXS5FZGl0YWJsZVNWR2RhdGEuZHkgPSAtTWF0aC5tYXgodiwgbWluLnN1YnNjcmlwdHNoaWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVN1YlN1cE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1UYWJsZU1peGluID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTVRhYmxlTWl4aW4sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTVRhYmxlTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnRvU1ZHID0gTUJhc2VNaXhpbi5TVkdhdXRvbG9hZDtcbiAgICB9XG4gICAgcmV0dXJuIE1UYWJsZU1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1UZXh0TWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhNVGV4dE1peGluLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE1UZXh0TWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVGV4dE1peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFNWRy5jb25maWcubXRleHRGb250SW5oZXJpdCB8fCB0aGlzLlBhcmVudCgpLnR5cGUgPT09IFwibWVycm9yXCIpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCksIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICAgICAgdmFyIHZhcmlhbnQgPSB0aGlzLlNWR2dldFZhcmlhbnQoKSwgZGVmID0ge1xuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogdGhpcy5HZXQoXCJkaXJcIilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodmFyaWFudC5ib2xkKSB7XG4gICAgICAgICAgICAgICAgZGVmW1wiZm9udC13ZWlnaHRcIl0gPSBcImJvbGRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YXJpYW50Lml0YWxpYykge1xuICAgICAgICAgICAgICAgIGRlZltcImZvbnQtc3R5bGVcIl0gPSBcIml0YWxpY1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyaWFudCA9IHRoaXMuR2V0KFwibWF0aHZhcmlhbnRcIik7XG4gICAgICAgICAgICBpZiAodmFyaWFudCA9PT0gXCJtb25vc3BhY2VcIikge1xuICAgICAgICAgICAgICAgIGRlZltcImNsYXNzXCJdID0gXCJNSlgtbW9ub3NwYWNlXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh2YXJpYW50Lm1hdGNoKC9zYW5zLXNlcmlmLykpIHtcbiAgICAgICAgICAgICAgICBkZWZbXCJjbGFzc1wiXSA9IFwiTUpYLXNhbnMtc2VyaWZcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN2Zy5BZGQoQkJPWC5URVhUKHNjYWxlICogMTAwIC8gdGhpcy5TVkcuY29uZmlnLnNjYWxlLCB0aGlzLmRhdGEuam9pbihcIlwiKSwgZGVmKSk7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgICAgIHRoaXMuU1ZHc2F2ZURhdGEoc3ZnKTtcbiAgICAgICAgICAgIHJldHVybiBzdmc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5TVVBFUihhcmd1bWVudHMpLnRvU1ZHLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBNVGV4dE1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIE1VbmRlck92ZXJNaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKE1VbmRlck92ZXJNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNVW5kZXJPdmVyTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBNVW5kZXJPdmVyTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLmdldFZhbHVlcyhcImRpc3BsYXlzdHlsZVwiLCBcImFjY2VudFwiLCBcImFjY2VudHVuZGVyXCIsIFwiYWxpZ25cIik7XG4gICAgICAgIGlmICghdmFsdWVzLmRpc3BsYXlzdHlsZSAmJiB0aGlzLmRhdGFbdGhpcy5iYXNlXSAhPSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLmRhdGFbdGhpcy5iYXNlXS5Db3JlTU8oKS5HZXQoXCJtb3ZhYmxlbGltaXRzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5NTUwubXN1YnN1cC5wcm90b3R5cGUudG9TVkcuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gbmV3IHRoaXMuU1ZHKCksIHNjYWxlID0gdGhpcy5TVkdnZXRTY2FsZShzdmcpO1xuICAgICAgICB0aGlzLlNWR2hhbmRsZVNwYWNlKHN2Zyk7XG4gICAgICAgIHZhciBib3hlcyA9IFtdLCBzdHJldGNoID0gW10sIGJveCwgaSwgbSwgVyA9IC1VdGlsLkJJR0RJTUVOLCBXVyA9IFc7XG4gICAgICAgIGZvciAoaSA9IDAsIG0gPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLmJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0gPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZChpLCBIVywgRCk7XG4gICAgICAgICAgICAgICAgICAgIHN0cmV0Y2hbaV0gPSAoRCAhPSBudWxsIHx8IEhXID09IG51bGwpICYmIHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLnRvU1ZHKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLnggPSAwO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYm94ZXNbaV0uWDtcbiAgICAgICAgICAgICAgICAgICAgc3RyZXRjaFtpXSA9IHRoaXMuZGF0YVtpXS5TVkdjYW5TdHJldGNoKFwiSG9yaXpvbnRhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJveGVzW2ldLncgPiBXVykge1xuICAgICAgICAgICAgICAgICAgICBXVyA9IGJveGVzW2ldLnc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyZXRjaFtpXSAmJiBXVyA+IFcpIHtcbiAgICAgICAgICAgICAgICAgICAgVyA9IFdXO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoRCA9PSBudWxsICYmIEhXICE9IG51bGwpIHtcbiAgICAgICAgICAgIFcgPSBIVztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXID09IC1VdGlsLkJJR0RJTUVOKSB7XG4gICAgICAgICAgICBXID0gV1c7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gV1cgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJldGNoW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gdGhpcy5kYXRhW2ldLlNWR3N0cmV0Y2hIKFcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gdGhpcy5iYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3hlc1tpXS54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBib3hlc1tpXS5YO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChib3hlc1tpXS53ID4gV1cpIHtcbiAgICAgICAgICAgICAgICAgICAgV1cgPSBib3hlc1tpXS53O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdCA9IFV0aWwuVGVYLnJ1bGVfdGhpY2tuZXNzICogdGhpcy5tc2NhbGU7XG4gICAgICAgIHZhciBiYXNlID0gYm94ZXNbdGhpcy5iYXNlXSB8fCB7XG4gICAgICAgICAgICB3OiAwLFxuICAgICAgICAgICAgaDogMCxcbiAgICAgICAgICAgIGQ6IDAsXG4gICAgICAgICAgICBIOiAwLFxuICAgICAgICAgICAgRDogMCxcbiAgICAgICAgICAgIGw6IDAsXG4gICAgICAgICAgICByOiAwLFxuICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgIHNjYWxlOiBzY2FsZVxuICAgICAgICB9O1xuICAgICAgICB2YXIgeCwgeSwgejEsIHoyLCB6MywgZHcsIGssIGRlbHRhID0gMDtcbiAgICAgICAgaWYgKGJhc2UuaWMpIHtcbiAgICAgICAgICAgIGRlbHRhID0gMS4zICogYmFzZS5pYyArIC4wNTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBtID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IG07IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVtpXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYm94ID0gYm94ZXNbaV07XG4gICAgICAgICAgICAgICAgejMgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzUgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICB2YXIgYWNjZW50ID0gKGkgIT0gdGhpcy5iYXNlICYmIHZhbHVlc1t0aGlzLkFDQ0VOVFNbaV1dKTtcbiAgICAgICAgICAgICAgICBpZiAoYWNjZW50ICYmIGJveC53IDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYm94LnggPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldID0gQkJPWC5HKCkuV2l0aCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYm94ZXNbaV0uQWRkKGJveCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLkNsZWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJveGVzW2ldLncgPSAtYm94Lmw7XG4gICAgICAgICAgICAgICAgICAgIGJveCA9IGJveGVzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkdyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiAoV1cgLSBib3gudykgLyAyLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogV1cgLSBib3gud1xuICAgICAgICAgICAgICAgIH1bdmFsdWVzLmFsaWduXTtcbiAgICAgICAgICAgICAgICB4ID0gZHc7XG4gICAgICAgICAgICAgICAgeSA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5vdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZS5za2V3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNrZXcgPSBiYXNlLnNrZXc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggKyBib3gudyA+IFdXKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5za2V3ICs9IChXVyAtIGJveC53IC0geCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHoxID0gVXRpbC5UZVguYmlnX29wX3NwYWNpbmcxICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MiA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMyAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KHoxLCB6MiAtIE1hdGgubWF4KDAsIGJveC5kKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgKyBiYXNlLmggKyBib3guZCArIGs7XG4gICAgICAgICAgICAgICAgICAgIGJveC5oICs9IHozO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm94LmggPiBib3guSCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm94LkggPSBib3guaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpID09IHRoaXMudW5kZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgayA9IDMgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6MSA9IFV0aWwuVGVYLmJpZ19vcF9zcGFjaW5nMiAqIHNjYWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgejIgPSBVdGlsLlRlWC5iaWdfb3Bfc3BhY2luZzQgKiBzY2FsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGsgPSBNYXRoLm1heCh6MSwgejIgLSBib3guaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgayA9IE1hdGgubWF4KGssIDE1MDAgLyBVdGlsLmVtKTtcbiAgICAgICAgICAgICAgICAgICAgeCAtPSBkZWx0YSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBiYXNlLnkgLSAoYmFzZS5kICsgYm94LmggKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgYm94LmQgKz0gejM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guZCA+IGJveC5EKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3guRCA9IGJveC5kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2Zy5BZGQoYm94LCB4LCB5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVDb2xvcihzdmcpO1xuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICByZXR1cm4gTVVuZGVyT3Zlck1peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2Jib3gvbnVsbFwiIC8+XG52YXIgU2VtYW50aWNzTWl4aW4gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTZW1hbnRpY3NNaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTZW1hbnRpY3NNaXhpbigpIHtcbiAgICAgICAgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS50b1NWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5TVkdnZXRTdHlsZXMoKTtcbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0aGlzLlNWRygpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuU1ZHaGFuZGxlU3BhY2Uoc3ZnKTtcbiAgICAgICAgICAgIHN2Zy5BZGQodGhpcy5kYXRhWzBdLnRvU1ZHKCkpO1xuICAgICAgICAgICAgc3ZnLkNsZWFuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdmcuQ2xlYW4oKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLlNWR3NhdmVEYXRhKHN2Zyk7XG4gICAgICAgIHJldHVybiBzdmc7XG4gICAgfTtcbiAgICBTZW1hbnRpY3NNaXhpbi5wcm90b3R5cGUuU1ZHc3RyZXRjaEggPSBmdW5jdGlvbiAodykge1xuICAgICAgICByZXR1cm4gKHRoaXMuZGF0YVswXSAhPSBudWxsID8gdGhpcy5kYXRhWzBdLlNWR3N0cmV0Y2hIKHcpIDogbmV3IEJCT1hfTlVMTCgpKTtcbiAgICB9O1xuICAgIFNlbWFudGljc01peGluLnByb3RvdHlwZS5TVkdzdHJldGNoViA9IGZ1bmN0aW9uIChoLCBkKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5kYXRhWzBdICE9IG51bGwgPyB0aGlzLmRhdGFbMF0uU1ZHc3RyZXRjaFYoaCwgZCkgOiBuZXcgQkJPWF9OVUxMKCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNlbWFudGljc01peGluO1xufSkoTUJhc2VNaXhpbik7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWJhc2VfbWl4aW4udHNcIiAvPlxudmFyIFRlWEF0b21NaXhpbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFRlWEF0b21NaXhpbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBUZVhBdG9tTWl4aW4oKSB7XG4gICAgICAgIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBUZVhBdG9tTWl4aW4ucHJvdG90eXBlLnRvU1ZHID0gZnVuY3Rpb24gKEhXLCBEKSB7XG4gICAgICAgIHRoaXMuU1ZHZ2V0U3R5bGVzKCk7XG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGhpcy5TVkcoKTtcbiAgICAgICAgdGhpcy5TVkdoYW5kbGVTcGFjZShzdmcpO1xuICAgICAgICBpZiAodGhpcy5kYXRhWzBdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBib3ggPSB0aGlzLkVkaXRhYmxlU1ZHZGF0YVN0cmV0Y2hlZCgwLCBIVywgRCksIHkgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMudGV4Q2xhc3MgPT09IHRoaXMuTU1MLlRFWENMQVNTLlZDRU5URVIpIHtcbiAgICAgICAgICAgICAgICB5ID0gVXRpbC5UZVguYXhpc19oZWlnaHQgLSAoYm94LmggKyBib3guZCkgLyAyICsgYm94LmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdmcuQWRkKGJveCwgMCwgeSk7XG4gICAgICAgICAgICBzdmcuaWMgPSBib3guaWM7XG4gICAgICAgICAgICBzdmcuc2tldyA9IGJveC5za2V3O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuU1ZHaGFuZGxlQ29sb3Ioc3ZnKTtcbiAgICAgICAgdGhpcy5TVkdzYXZlRGF0YShzdmcpO1xuICAgICAgICByZXR1cm4gc3ZnO1xuICAgIH07XG4gICAgcmV0dXJuIFRlWEF0b21NaXhpbjtcbn0pKE1CYXNlTWl4aW4pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9