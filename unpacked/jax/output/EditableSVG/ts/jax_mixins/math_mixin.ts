/// <reference path="mbase_mixin.ts" />
/// <reference path="../bbox/g.ts" />
/// <reference path="../bbox/svg.ts" />

class MathMixin extends MBaseMixin {
  isCursorable() { return false; } // TODO actually implement cursor

  toSVG(span, div, replace?: boolean) {
    var CONFIG = MathJax.OutputJax.EditableSVG.config;

    // TODO: find a better place for this
    this.loadTexify();

    //  All the data should be in an inferred row
    if (!this.data[0]) return span;

    this.SVGgetStyles();
    MathJax.ElementJax.mml.mbase.prototype.displayAlign = MathJax.Hub.config.displayAlign;
    MathJax.ElementJax.mml.mbase.prototype.displayIndent = MathJax.Hub.config.displayIndent;
    if (String(MathJax.Hub.config.displayIndent).match(/^0($|[a-z%])/i))
      MathJax.ElementJax.mml.mbase.prototype.displayIndent = "0";

    //  Put content in a <g> with defaults and matrix that flips y axis.
    //  Put that in an <svg> with xlink defined.
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
    var svg  = new BBOX_SVG();
    svg.element.setAttribute("xmlns:xlink", Util.XLINKNS);
    if (CONFIG.useFontCache && !CONFIG.useGlobalCache) {
      svg.element.appendChild(BBOX.defs)
    }
    svg.Add(box);
    svg.Clean();
    this.SVGsaveData(svg);

    //  If this element is not the top-level math element
    //    remove the transform and return the svg object
    //    (issue #614).
    if (!span) {
      svg.element = svg.element.firstChild; // remove <svg> element
      svg.element.removeAttribute("transform");
      svg.removeable = true;
      return svg;
    }

    //  Style the <svg> to get the right size and placement
    var l = Math.max(-svg.l, 0),
    r = Math.max(svg.r - svg.w, 0);
    var style = svg.element.style;
    svg.element.setAttribute("width", Util.Ex(l + svg.w + r));
    svg.element.setAttribute("height", Util.Ex(svg.H + svg.D + 2 * Util.em));
    style.verticalAlign = Util.Ex(-svg.D - 2 * Util.em); // remove extra pixel added below plus padding from above
    style.marginLeft = Util.Ex(-l);
    style.marginRight = Util.Ex(-r);
    svg.element.setAttribute("viewBox", Util.Fixed(-l, 1) + " " + Util.Fixed(-svg.H - Util.em, 1) + " " +
                             Util.Fixed(l + svg.w + r, 1) + " " + Util.Fixed(svg.H + svg.D + 2 * Util.em, 1));
    style.marginTop = style.marginBottom = "1px"; // 1px above and below to prevent lines from touching

    //  If there is extra height or depth, hide that
    if (svg.H > svg.h) {
      style.marginTop = Util.Ex(svg.h - svg.H)
    }
    if (svg.D > svg.d) {
      style.marginBottom = Util.Ex(svg.d - svg.D);
      style.verticalAlign = Util.Ex(-svg.d);
    }

    //  Add it to the MathJax span
    var alttext = this.Get("alttext");
    if (alttext && !svg.element.getAttribute("aria-label")) span.setAttribute("aria-label", alttext);
    if (!svg.element.getAttribute("role")) span.setAttribute("role", "math");
    //        span.setAttribute("tabindex",0);  // causes focus outline, so disable for now

    svg.element.classList.add('rendered-svg-output')
    var previous = span.querySelector('.rendered-svg-output')
    if (replace && previous) {
      span.replaceChild(svg.element, previous)
    } else {
      span.appendChild(svg.element)
    }

    svg.element = null;

    //  Handle indentalign and indentshift for single-line displays
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
  }

  loadTexify() {
    return MBaseMixin.SVGautoloadFile('texify')
  }

  //////////////////
  // Cursor stuff //
  //////////////////

  installCursorListeners() {
    var that = this;

    // The ID is on the containing span
    var id = $(that.EditableSVGelem).parent().attr("id");

    console.log("Registering listeners on ID: ", id);

    MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_left", function(args) {
      // Ignore if this isn't for our widget
      if (args[1] != id) return;

      // Clear the signal on receipt of this message
      // TODO: use a saner pubsub system so we don't have to clear
      // TODO: is this still necessary now that we use widget IDs?
      MathJax.Hub.Startup.signal.Clear();

      var cursor = that.cursor;
      console.log("Got move into from left! ID: ");
      that.data[0].moveCursorFromParent(cursor, Direction.RIGHT);
      $(that.EditableSVGelem).parent().focus()
    });
    MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_right", function(args) {
      // Ignore if this isn't for our widget
      if (args[1] != id) return;

      // Clear the signal on receipt of this message
      // TODO: use a saner pubsub system so we don't have to clear
      // TODO: is this still necessary now that we use widget IDs?
      MathJax.Hub.Startup.signal.Clear();

      var cursor = that.cursor;
      console.log("Got move into from right! ID: ");
      that.data[0].moveCursorFromParent(cursor, Direction.LEFT);
      $(that.EditableSVGelem).parent().focus()
    });
    MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_top", function(args) {
      // Ignore if this isn't for our widget
      if (args[1] != id) return;

      // Clear the signal on receipt of this message
      // TODO: use a saner pubsub system so we don't have to clear
      // TODO: is this still necessary now that we use widget IDs?
      MathJax.Hub.Startup.signal.Clear();

      var cursor = that.cursor;
      console.log("Got move into from top! ID: ");
      that.data[0].moveCursorFromParent(cursor, Direction.UP);
      $(that.EditableSVGelem).parent().focus()
    });
    MathJax.hiteSignal.MessageHook("EditableSVG move_into_from_bottom", function(args) {
      // Ignore if this isn't for our widget
      if (args[1] != id) return;

      // Clear the signal on receipt of this message
      // TODO: use a saner pubsub system so we don't have to clear
      // TODO: is this still necessary now that we use widget IDs?
      MathJax.Hub.Startup.signal.Clear();

      var cursor = that.cursor;
      console.log("Got move into from bottom! ID: ");
      that.data[0].moveCursorFromParent(cursor, Direction.DOWN);
      $(that.EditableSVGelem).parent().focus()
    });
  }

  moveCursorFromChild(cursor, direction, child) {
    // The ID is on the containing span
    var id = $(this.EditableSVGelem).parent().attr("id");

    // Signal that someone tried to move out of this box
    if (direction == Direction.LEFT) {
      MathJax.hiteSignal.Post(["EditableSVG move_cursor_left", id]);
    } else if (direction == Direction.RIGHT) {
      MathJax.hiteSignal.Post(["EditableSVG move_cursor_right", id]);
    } else if (direction == Direction.UP) {
      MathJax.hiteSignal.Post(["EditableSVG move_cursor_up", id]);
    } if (direction == Direction.DOWN) {
      MathJax.hiteSignal.Post(["EditableSVG move_cursor_down", id]);
    }

    // As far as the EditableSVG goes, don't let the cursor actually move
    return false;
  }
}
