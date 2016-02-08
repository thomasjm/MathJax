
class Parser {

    // @return texatom
    static parseControlSequence(cs) {
        var result = Parser.checkSpecialCS(cs)
        if (result) return result;

        var mathjaxParser = MathJax.InputJax.TeX.Parse(cs);
        mathjaxParser.Parse();
        return mathjaxParser.stack.data[0].data[0];
    }

    static checkSpecialCS(cs) {
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
                    value = macros[cs][1].replace(/&thinsp;/,"\u2006");
                } else {
                    value = cs;
                }

                return new MML.mo(new MML.chars(value));
            }
        }
    }
}
