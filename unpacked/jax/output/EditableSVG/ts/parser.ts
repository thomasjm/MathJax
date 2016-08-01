
class Parser {

    static parseControlSequence(cs) {
        var result = Parser.checkSpecialCS(cs)
        if (result) return result;

        var mathjaxParser = MathJax.InputJax.TeX.Parse(cs);

        // Override some properties of the MathJax parser
        mathjaxParser.csUndefined = mathjaxParser.csFindMacro = function() {};
        mathjaxParser.GetCS = function() { return cs; };
        mathjaxParser.mmlToken = function(x) { return x; };
        mathjaxParser.Push = (function(x) { result = x });

        mathjaxParser.ControlSequence();

        return [result];
    }

    static checkSpecialCS(cs) {
        var macros = MathJax.InputJax.TeX.Definitions.macros;
        var MML = MathJax.ElementJax.mml;

        if (cs === 'frac') {
            var hole = new MML.hole();
            var mfrac = new MML.mfrac(hole, new MML.hole());

            var result = [mfrac];
            result.moveCursorAfter = [hole, 0];
            return result;
        }

        if (cs === 'sqrt') {
            var msqrt = new MML.msqrt();
            var hole = new MML.hole();
            msqrt.SetData(0, hole);

            var result = [msqrt];
            result.moveCursorAfter = [hole, 0];
            return result;
        }

        if (cs === 'matrix' || cs === 'bmatrix') {
            var mtable = new MML.mtable();
            var mtr = new MML.mtr();
            var mtd = new MML.mtd();
            var hole = new MML.hole();

            mtable.SetData(0, mtr);
            mtr.SetData(0, mtd);
            mtd.SetData(0, hole);

            var lbracket = new MML.mo(new MML.chars("["));
            var rbracket = new MML.mo(new MML.chars("]"));

            var result = [lbracket, mtable, rbracket];
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
                    value = macros[cs][1].replace(/&thinsp;/,"\u2006");
                } else {
                    value = cs;
                }

                return [new MML.mo(new MML.chars(value))];
            }
        }
    }
}
