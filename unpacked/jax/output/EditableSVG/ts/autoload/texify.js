MathJax.Hub.Register.StartupHook("EditableSVG Jax Ready", function() {
    var MML = MathJax.ElementJax.mml;
    var SVG = MathJax.OutputJax.EditableSVG;
    var DEFS = MathJax.InputJax.TeX.Definitions;
    var entities;

    MML.mbase.Augment({
        toTex: function() {
            throw new Error('toTex not implemented for ' + this.type);
        },

        getChildTex: function(i) {
            return this.data[i] ? this.data[i].toTex() : '';
        }
    });

    MML.annotation.Augment({
        toTex: function() {
            return '';
        }
    });

    MML.hole.Augment({
        toTex: function() {
            return '\\hole';
        }
    });

    MML.math.Augment({
        loadTexify: function() {
        }
    });

    MML.chars.Augment({
        toTex: function() {
            var alphad = this.data[0].replace(/[^a-z]/i, '');
            if (DEFS.macros[alphad]) {
                return '\\'+alphad+' ';
            }
            return this.data[0];
        }
    });

    MML.mtable.Augment({
        toTex: function() {
            var tex = '\\begin{bmatrix}\n';
            for (var i = 0; i < this.data.length; i++) {
                tex += this.data[i].toTex();
            };
            tex += "\\end{bmatrix}";
            return tex;
        }
    });

    MML.mtr.Augment({
        toTex: function() {
            var tex = "";
            for (var i = 0; i < this.data.length; i++) {
                tex += " " + this.data[i].toTex();
            }
            tex += " \\\\ \n";
            return tex;
        }
    });

    MML.mtd.Augment({
        toTex: function() {
            var tex = "";
            for (var i = 0; i < this.data.length; i++) {
                tex += this.data[i].toTex();
                if (i < this.data.length-1) tex += " & ";
            }
            return tex;
        }
    });

    var oneChildNoBrace = {
        toTex: function() {
            return this.getChildTex(0);
        }
    };

    MML.TeXAtom.Augment(oneChildNoBrace);
    MML.math.Augment(oneChildNoBrace);
    MML.mn.Augment(oneChildNoBrace);
    MML.mo.Augment({
        toTex: function() {
            return " " + this.getChildTex(0) + " ";
        }
    });
    MML.mi.Augment(oneChildNoBrace);

    MML.entity.Augment({
        toTex: function() {
            var value = this.data[0].substring(2);
            if (!entities) makeEntities();
            return entities[value] || this.toString();
        }
    });

    var subsup = {
        toTex: function() {
            var subpart = wrapInBraces(this.getChildTex(this.sub));
            var suppart = wrapInBraces(this.getChildTex(this.sup));
            if (subpart) subpart = '_'+subpart;
            if (suppart) suppart = '^'+suppart;
            return wrapInBraces(this.getChildTex(this.base)) + suppart + subpart;
        }
    };

    MML.msubsup.Augment(subsup);
    MML.munderover.Augment(subsup);

    MML.mfrac.Augment({
        toTex: function() {
            return '\\frac{'+this.getChildTex(this.num)+'}{'+this.getChildTex(this.den)+'}';
        }
    });

    MML.msqrt.Augment({
        toTex: function() {
            return '\\sqrt{'+this.getChildTex(0)+'}';
        }
    });

    MML.mroot.Augment({
        toTex: function() {
            return '\\sqrt['+this.getChildTex(1)+']{'+this.getChildTex(0)+'}';
        }
    });

    MML.mrow.Augment({
        toTex: function() {
            var result = '';
            var i;
            for (i=0; i<this.data.length; ++i) {
                result += this.getChildTex(i);
            }
            if (!result) return result;
            if ((result[0] === '(' && result[result.length-1] === ')') ||
                (result[0] === '[' && result[result.length-1] === ']') ||
                (result[0] === '{' && result[result.length-1] === '}')) {
                result = '\\left' + result.slice(0, -1) + '\\right' + result.slice(-1);
            }

            return result;
        }
    });

    function wrapInBraces(tex) {
        if (!/^\\[a-z]$/i.test(tex) && tex.length > 1) {
            return '{'+tex+'}';
        } else {
            return tex;
        }
    }

    function forEachInObj(obj, fn) {
        Object.keys(obj).forEach(function(key) {
            fn(obj[key], key);
        });
    }

    function makeEntities() {
        entities = {};
        forEachInObj(DEFS.mathchar0mi, addEscapeEntity);
        forEachInObj(DEFS.mathchar0mo, addEscapeEntity);
        forEachInObj(DEFS.mathchar7, addEscapeEntity);
        forEachInObj(DEFS.remap, function(value, key) {
            entities[value] = key;
        });

        function addEscapeEntity(value, key) {
            var lookup = (typeof value === 'string') ? value : value[0];
            entities[lookup] = '\\' + key;
        }

        // Override some things

        // Without this override, \smallint clobbers \int, so our things texify to \smallint
        entities["222B"] = "\\int";
    }

    MathJax.Hub.Startup.signal.Post('texify Ready');
    MathJax.Ajax.loadComplete(SVG.autoloadDir + "/texify.js");
});
