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

interface OutputJax {
    Config(): any;
}

declare var MathJax: any;

class EditableSVG implements OutputJax {
    TOUCH = undefined;

    // Bunch of properties being added to make the build happy
    autoloadDir: any;
    ContextMenu: any;
    EVENT: any;
    FONTDATA: any;
    Mousedown: any;
    Mousemove: any;
    ExSpan: any;
    Mouseout: any;
    Mouseover: any;
    static FONTDATA: any;
    cwidth: any;
    defaultEx: any;
    defaultWidth: any;
    em: any;
    ex: any;
    fontDir: any;
    fontInUse: any;
    hiddenDiv: any;
    id: any;
    idPostfix: any;
    length2em: any;
    linebreakSpan: any;
    linebreakWidth: any;
    lookupChar: any;
    mathDIV: any;
    mathDiv: any;
    operaZoomRefresh: any;
    pxPerInch: any;
    require: any;
    textSVG: any;

    config: any;

    // config = EditableSVGConfig.config;

    hideProcessedMath = true; // use display:none until all math is processed

    fontNames = ["TeX", "STIX", "STIX-Web", "Asana-Math",
                 "Gyre-Termes", "Gyre-Pagella", "Latin-Modern", "Neo-Euler"];

    TextNode = MathJax.HTML.TextNode;
    addText = MathJax.HTML.addText;
    ucMatch = MathJax.HTML.ucMatch;

    Config() {
        console.log('AUTOLOAD DIR ', this.autoloadDir);

        // TODO: removed call to SUPER here
        var settings = MathJax.Hub.config.menuSettings,
        config = this.config,
        font = settings.font;
        if (settings.scale) {
            config.scale = settings.scale;
        }
        if (font && font !== "Auto") {
            font = font.replace(/(Local|Web|Image)$/i, "");
            font = font.replace(/([a-z])([A-Z])/, "$1-$2");
            this.fontInUse = font;
        } else {
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
    }

    Startup() {
        //  Set up event handling
        var EVENT = MathJax.Extension.MathEvents.Event;
        this.TOUCH = MathJax.Extension.MathEvents.Touch;
        var HOVER = MathJax.Extension.MathEvents.Hover;
        this.ContextMenu = EVENT.ContextMenu;
        this.Mouseover = HOVER.Mouseover;
        this.Mouseout = HOVER.Mouseout;
        this.Mousemove = HOVER.Mousemove;

        // Make hidden div for doing tests and storing global SVG <defs>
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
        } else {
            document.body.insertBefore(this.hiddenDiv, document.body.firstChild);
        }
        this.hiddenDiv = MathJax.HTML.addElement(this.hiddenDiv, "div", {
            id: "MathJax_SVG_Hidden"
        });

        // Determine pixels-per-inch and em-size
        var div = MathJax.HTML.addElement(this.hiddenDiv, "div", {
            style: {
                width: "5in"
            }
        });
        Util.pxPerInch = div.offsetWidth / 5;
        this.hiddenDiv.removeChild(div);

        // Used for measuring text sizes
        this.textSVG = Util.Element("svg", null);

        // Global defs for font glyphs
        BBOX_GLYPH.defs = Util.addElement(Util.addElement(this.hiddenDiv.parentNode, "svg"),
                                          "defs", {
                                              id: "MathJax_SVG_glyphs"
                                          });

        // Used in preTranslate to get scaling factors
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

        // Used in preTranslate to get linebreak width
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


        // Merge the styles provided by MathJax with the ones in EditableSVGConfig
        var styles = this.config.styles;
        for (var s in EditableSVGConfig.styles) {
            styles[s] = EditableSVGConfig.styles[s];
        }

        // Set up styles
        return MathJax.Ajax.Styles(styles, ["InitializeSVG", this]);
    }

    //  Handle initialization that requires styles to be set up
    InitializeSVG() {
        //  Get the default sizes (need styles in place to do this)
        document.body.appendChild(this.ExSpan);
        document.body.appendChild(this.linebreakSpan);
        this.defaultEx = this.ExSpan.firstChild.offsetHeight / 60;
        this.defaultWidth = this.linebreakSpan.firstChild.offsetWidth;
        document.body.removeChild(this.linebreakSpan);
        document.body.removeChild(this.ExSpan);
    }

    preTranslate(state) {
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
                width = width.replace(/\s*container\s*/, "")
            } else {
                maxwidth = this.defaultWidth
            }
            if (width === "") {
                width = "100%"
            }
        } else {
            maxwidth = 100000
        } // a big width, so no implicit line breaks

        //  Loop through the scripts
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode) continue;

            //  Remove any existing output
            prev = script.previousSibling;
            if (prev && String(prev.className).match(/^MathJax(_SVG)?(_Display)?( MathJax(_SVG)?_Processing)?$/)) {
                prev.parentNode.removeChild(prev)
            }

            //  Add the span, and a div if in display mode,
            //  then set the role and mark it as being processed
            jax = script.MathJax.elementJax;
            if (!jax) continue;
            jax.EditableSVG = {
                display: (jax.root.Get("display") === "block")
            }
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

            //  Add the test span for determining scales and linebreak widths
            script.parentNode.insertBefore(this.ExSpan.cloneNode(true), script);
            div.parentNode.insertBefore(this.linebreakSpan.cloneNode(true), div);
        }

        //  Determine the scaling factors for each script
        //  (this only requires one reflow rather than a reflow for each equation)
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode) continue;
            test = script.previousSibling;
            div = test.previousSibling;
            jax = script.MathJax.elementJax;
            if (!jax) continue;
            ex = test.firstChild.offsetHeight / 60;
            cwidth = div.previousSibling.firstChild.offsetWidth;
            if (relwidth) {
                maxwidth = cwidth
            }
            if (ex === 0 || ex === "NaN") {
                // can't read width, so move to hidden div for processing
                // (this will cause a reflow for each math element that is hidden)
                this.hiddenDiv.appendChild(div);
                jax.EditableSVG.isHidden = true;
                ex = this.defaultEx;
                cwidth = this.defaultWidth;
                if (relwidth) {
                    maxwidth = cwidth
                }
            }
            Util.ex = ex;
            Util.em = em = ex / Util.TeX.x_height * 1000; // scale ex to x_height
            Util.cwidth = cwidth / em * 1000;
            Util.lineWidth = (linebreak ? Util.length2em(width, 1, maxwidth / em * 1000) : Util.BIGDIMEN);
        }

        //  Remove the test spans used for determining scales and linebreak widths
        for (i = 0; i < m; i++) {
            script = scripts[i];
            if (!script.parentNode) continue;
            test = scripts[i].previousSibling;
            span = test.previousSibling;
            jax = scripts[i].MathJax.elementJax;
            if (!jax) continue;
            if (!jax.EditableSVG.isHidden) {
                span = span.previousSibling
            }
            span.parentNode.removeChild(span);
            test.parentNode.removeChild(test);
        }

        //  Set state variables used for displaying equations in chunks
        state.SVGeqn = state.SVGlast = 0;
        state.SVGi = -1;
        state.SVGchunk = this.config.EqnChunk;
        state.SVGdelay = false;
    }

    Translate(script, state) {
        if (!script.parentNode) return;

        //  If we are supposed to do a chunk delay, do it
        if (state.SVGdelay) {
            state.SVGdelay = false;
            MathJax.Hub.RestartAfter(MathJax.Callback.Delay(this.config.EqnChunkDelay));
        }

        //  Get the data about the math
        var jax = script.MathJax.elementJax
        var math = jax.root;
        var span = document.getElementById(jax.inputID + "-Frame");
        var div = (jax.EditableSVG.display ? (span || {parentNode: undefined}).parentNode : span);
        var localCache = (this.config.useFontCache && !this.config.useGlobalCache);
        if (!div) return;

        //  Set the font metrics
        this.em = MathJax.ElementJax.mml.mbase.prototype.em = jax.EditableSVG.em;

        this.ex = jax.EditableSVG.ex;
        this.linebreakWidth = jax.EditableSVG.lineWidth;
        this.cwidth = jax.EditableSVG.cwidth;

        //  Typeset the math
        this.mathDiv = div;
        span.appendChild(this.textSVG);
        if (localCache) {
            this.resetGlyphs();
        }
        this.initSVG(math, span);
        math.setTeXclass();
        try {
            math.toSVG(span, div);
        } catch (err) {
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
        this.AddInputHandlers(math, span, div)

        //  Put it in place, and remove the processing marker
        if (jax.EditableSVG.isHidden) {
            script.parentNode.insertBefore(div, script);
        }
        div.className = div.className.split(/ /)[0];

        //  Check if we are hiding the math until more is processed
        if (this.hideProcessedMath) {

            //  Hide the math and don't let its preview be removed
            div.className += " MathJax_SVG_Processed";
            if (script.MathJax.preview) {
                jax.EditableSVG.preview = script.MathJax.preview;
                delete script.MathJax.preview;
            }

            //  Check if we should show this chunk of equations
            state.SVGeqn += (state.i - state.SVGi);
            state.SVGi = state.i;
            if (state.SVGeqn >= state.SVGlast + state.SVGchunk) {
                this.postTranslate(state, true);
                state.SVGchunk = Math.floor(state.SVGchunk * this.config.EqnChunkFactor);
                state.SVGdelay = true; // delay if there are more scripts
            }
        }
    }

    postTranslate(state, partial) {
        var scripts = state.jax[this.id];
        if (!this.hideProcessedMath) return;

        //  Reveal this chunk of math
        for (var i = state.SVGlast, m = state.SVGeqn; i < m; i++) {
            var script = scripts[i];
            if (script && script.MathJax.elementJax) {

                //  Remove the processed marker
                script.previousSibling.className = script.previousSibling.className.split(/ /)[0];
                var data = script.MathJax.elementJax.EditableSVG;

                //  Remove the preview, if any
                if (data.preview) {
                    data.preview.innerHTML = "";
                    script.MathJax.preview = data.preview;
                    delete data.preview;
                }
            }
        }

        //  Save our place so we know what is revealed
        state.SVGlast = state.SVGeqn;
    }

    resetGlyphs(reset?) {
        console.log('RESETTING GLYPHS');
        if (this.config.useFontCache) {
            if (this.config.useGlobalCache) {
                BBOX_GLYPH.defs = document.getElementById("MathJax_SVG_glyphs");
                BBOX_GLYPH.defs.innerHTML = "";
            } else {
                BBOX_GLYPH.defs = Util.Element("defs", null);
                BBOX_GLYPH.n++;
            }
            BBOX_GLYPH.glyphs = {};
            if (reset) {
                BBOX_GLYPH.n = 0;
            }
        }
    }

    /*
     * Traverse the jax and ensure everything lives inside an mrow
     */
    static preprocessElementJax(root) {
        if (root.type === 'texatom') {
            if (root.data.length !== 1) throw Error('Unexpected length in texatom')
            EditableSVG.preprocessElementJax(root.data[0])
        } else if (root.type === 'mrow') {
            for (var i = 0; i < root.data.length; i++) {
                EditableSVG.preprocessElementJax(root.data[i]);
            }
        } else if (root.isCursorable() || root.type === 'math') {
            for (var i = 0; i < root.data.length; i++) {
                var cur = root.data[i];
                if (!cur) continue;
                var type = cur.type;
                if (type[0] !== 'm' || type === 'mrow') {
                    EditableSVG.preprocessElementJax(cur)
                } else {
                    console.log("Wrapping a thing in an mrow");
                    // var row = new MathJax.ElementJax.mml.mrow()
                    // row.Append(EditableSVG.preprocessElementJax(cur))
                    // root.SetData(i, row)
                }
            }
        }
        return root;
    }

    AddInputHandlers(math, span, div) {
        math.cursor = new Cursor()
        math.rerender = rerender
        span.setAttribute('tabindex', '0')

        var addTexToDOM = function() {
            var tex = math.toTex();
            console.log("Tex: ", tex);
            console.log("math: ", math);
            math.EditableSVGelem.setAttribute("tex", tex);
        }

        MathJax.Hub.Register.StartupHook("End",function () {
            addTexToDOM();
        });

        function rerender(callback) {
            try {
                EditableSVG.preprocessElementJax(math).toSVG(span, div, true);
                math.cursor.refocus();
                addTexToDOM();
            } catch (err) {
                if (err.restart) {
                    MathJax.Callback.After([rerender, callback], err.restart)
                    return
                }
                throw err;
            }
            MathJax.Callback(callback)()
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
    }

    getHoverSpan(jax, math) {
        math.style.position = "relative"; // make sure inline containers have position set
        return math.firstChild;
    }

    getHoverBBox(jax, span, math) {
        var bbox = MathJax.Extension.MathEvents.Event.getBBox(span.parentNode);
        bbox.h += 2;
        bbox.d -= 2; // bbox seems to be a bit off, so compensate (FIXME)
        return bbox;
    }

    Zoom(jax, span, math, Mw, Mh) {
        //  Re-render at larger size
        span.className = "MathJax_SVG";

        //  get em size (taken from this.preTranslate)
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
        if (tw && tw < this.cwidth) this.cwidth = tw;
        this.idPostfix = "-zoom";
        jax.root.toSVG(span, span);
        this.idPostfix = "";
        span.removeChild(this.textSVG);

        //  Don't allow overlaps on any edge
        var svg = span.getElementsByTagName("svg")[0].style;
        svg.marginTop = svg.marginRight = svg.marginLeft = 0;
        if (svg.marginBottom.charAt(0) === "-")
            span.style.marginBottom = svg.marginBottom.substr(1);

        if (this.operaZoomRefresh) {
            setTimeout(function() {
                span.firstChild.style.border = "1px solid transparent";
            }, 1);
        }

        // WebKit bug (issue #749)
        if (span.offsetWidth < span.firstChild.offsetWidth) {
            span.style.minWidth = span.firstChild.offsetWidth + "px";
            math.style.minWidth = math.firstChild.offsetWidth + "px";
        }

        //  Get height and width of zoomed math and original math
        span.style.position = math.style.position = "absolute";
        var zW = span.offsetWidth,
        zH = span.offsetHeight,
        mH = math.offsetHeight,
        mW = math.offsetWidth;
        span.style.position = math.style.position = "";

        return {
            Y: -MathJax.Extension.MathEvents.Event.getBBox(span).h,
            mW: mW,
            mH: mH,
            zW: zW,
            zH: zH
        };
    }

    initSVG(math, span) {}

    Remove(jax) {
        var span = document.getElementById(jax.inputID + "-Frame");
        if (span) {
            if (jax.EditableSVG.display) {
                span = <HTMLElement>span.parentNode;
            }
            span.parentNode.removeChild(span);
        }
        delete jax.EditableSVG;
    }

    static extendDelimiterV(svg, H, delim, scale, font) {
        var top = CharsMixin.createChar(scale, (delim.top || delim.ext), font);
        var bot = CharsMixin.createChar(scale, (delim.bot || delim.ext), font);
        var h = top.h + top.d + bot.h + bot.d;
        var y = -top.h;
        svg.Add(top, 0, y);
        y -= top.d;
        if (delim.mid) {
            var mid = CharsMixin.createChar(scale, delim.mid, font);
            h += mid.h + mid.d
        }
        if (delim.min && H < h * delim.min) {
            H = h * delim.min
        }
        if (H > h) {
            var ext = CharsMixin.createChar(scale, delim.ext, font);
            var k = (delim.mid ? 2 : 1),
            eH = (H - h) / k,
            s = (eH + 100) / (ext.h + ext.d);
            while (k-- > 0) {
                var g = Util.Element("g", {
                    transform: "translate(" + ext.y + "," + (y - s * ext.h + 50 + ext.y) + ") scale(1," + s + ")"
                });
                g.appendChild(ext.element.cloneNode(false));
                svg.element.appendChild(g);
                y -= eH;
                if (delim.mid && k) {
                    svg.Add(mid, 0, y - mid.h);
                    y -= (mid.h + mid.d)
                }
            }
        } else if (delim.mid) {
            y += (h - H) / 2;
            svg.Add(mid, 0, y - mid.h);
            y += -(mid.h + mid.d) + (h - H) / 2;
        } else {
            y += (h - H);
        }
        svg.Add(bot, 0, y - bot.h);
        svg.Clean();
        svg.scale = scale;
        svg.isMultiChar = true;
    }

    static extendDelimiterH(svg, W, delim, scale, font) {
        var left = CharsMixin.createChar(scale, (delim.left || delim.rep), font);
        var right = CharsMixin.createChar(scale, (delim.right || delim.rep), font);
        svg.Add(left, -left.l, 0);
        var w = (left.r - left.l) + (right.r - right.l),
        x = left.r - left.l;
        if (delim.mid) {
            var mid = CharsMixin.createChar(scale, delim.mid, font);
            w += mid.w
        }
        if (delim.min && W < w * delim.min) {
            W = w * delim.min
        }
        if (W > w) {
            var rep = CharsMixin.createChar(scale, delim.rep, font),
            fuzz = delim.fuzz || 0;
            var k = (delim.mid ? 2 : 1),
            rW = (W - w) / k,
            s = (rW + fuzz) / (rep.r - rep.l);
            while (k-- > 0) {
                var g = Util.Element("g", {
                    transform: "translate(" + (x - fuzz / 2 - s * rep.l + rep.x) + "," + rep.y + ") scale(" + s + ",1)"
                });
                g.appendChild(rep.element.cloneNode(false));
                svg.element.appendChild(g);
                x += rW;
                if (delim.mid && k) {
                    svg.Add(mid, x, 0);
                    x += mid.w
                }
            }
        } else if (delim.mid) {
            x -= (w - W) / 2;
            svg.Add(mid, x, 0);
            x += mid.w - (w - W) / 2;
        } else {
            x -= (w - W);
        }
        svg.Add(right, x - right.l, 0);
        svg.Clean();
        svg.scale = scale;
        svg.isMultiChar = true;
    }

    static getJaxFromMath(math) {
        if (math.parentNode.className === "MathJax_SVG_Display") {
            math = math.parentNode;
        }
        do {
            math = math.nextSibling;
        } while (math && math.nodeName.toLowerCase() !== "script");
        return MathJax.Hub.getJaxFor(math);
    }

    constructor() {
        MathJax.Hub.Register.StartupHook("mml Jax Ready", function() {
            var MML = MathJax.ElementJax.mml;

            // TODO: add properties to some of these classes
            // MML.munderover.Augment(subsupcursor)
            // MML.msubsup.Augment(subsupcursor)

            MML.hole = MML.mbase.Subclass({})
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
            MML.math.Augment(MathMixin.getMethods(this));
            MML.TeXAtom.Augment(TeXAtomMixin.getMethods(this));

            MML.mtable.Augment(MTableMixin.getMethods(this));
            MML.mtr.Augment(MTableRowMixin.getMethods(this));
            MML.mtd.Augment(MTableCellMixin.getMethods(this));


            MML["annotation-xml"].Augment({
                toSVG: MML.mbase.SVGautoload
            });
        });

        //  Loading isn't complete until the element jax is modified,
        //  but can't call loadComplete within the callback for "mml Jax Ready"
        //  (it would call SVG's Require routine, asking for the mml jax again)
        //  so wait until after the mml jax has finished processing.
        //
        //  We also need to wait for the onload handler to run, since the loadComplete
        //  will call Config and Startup, which need to modify the body.
        MathJax.Hub.Register.StartupHook("onLoad", function() {
            console.log('trying editablesvg: ', MathJax.OutputJax.EditableSVG);
            setTimeout(MathJax.Callback(["loadComplete", MathJax.OutputJax.EditableSVG, "jax.js"]), 0);
        });

        MathJax.Hub.Browser.Select({
            Opera: function(browser) {
                this.EditableSVG.Augment({
                    operaZoomRefresh: true // Opera needs a kick to redraw zoomed equations
                });
            }
        });

        MathJax.Hub.Register.StartupHook("End Cookie", function() {
            if (MathJax.Hub.config.menuSettings.zoom !== "None") {
                MathJax.Ajax.Require("[MathJax]/extensions/MathZoom.js")
            }
        });

        if (!document.createElementNS) {
            // Try to handle SVG in IE8 and below, but fail
            // (but don't crash on loading the file, so no delay for loadComplete)
            // Use a cast to make Typescript happy
            var doc = <any>document;
            if (!doc.namespaces.svg) {
                doc.namespaces.add("svg", Util.SVGNS)
            }
        }
    }
}


// TODO: this is not compatible with IE8, use something like $(document).ready
var load = function(event) {
    console.log('LOADING');
    EditableSVG.apply(MathJax.OutputJax.EditableSVG);

    // TODO: we're blowing away config right now

    for (var id in EditableSVG.prototype) {
        MathJax.OutputJax.EditableSVG[id] = EditableSVG.prototype[id].bind(MathJax.OutputJax.EditableSVG);
        MathJax.OutputJax.EditableSVG.constructor.prototype[id] = EditableSVG.prototype[id].bind(MathJax.OutputJax.EditableSVG);
    }

    // This will pick up static methods
    for (var id in EditableSVG) {
        MathJax.OutputJax.EditableSVG[id] = EditableSVG[id].bind(MathJax.OutputJax.EditableSVG);
        MathJax.OutputJax.EditableSVG.constructor.prototype[id] = EditableSVG[id].bind(MathJax.OutputJax.EditableSVG);
    }
};

// Monkeypatch getTransformToElement since Chrome 48 removes it
SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(elem) {
    return elem.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

setTimeout(load, 1000);
// console.log('GOING TO APPLY NOW');
// EditableSVG.apply(MathJax.OutputJax.EditableSVG);
