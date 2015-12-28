/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

<<<<<<< 2403467ccaeb45b3902b3b7296f26c14b006a6a1
MathJax.Extension["TeX/newcommand"]={version:"2.6.0"};MathJax.Hub.Register.StartupHook("TeX Jax Ready",function(){var b=MathJax.InputJax.TeX;var a=b.Definitions;a.Add({macros:{newcommand:"NewCommand",renewcommand:"NewCommand",newenvironment:"NewEnvironment",renewenvironment:"NewEnvironment",def:"MacroDef",let:"Let"}},null,true);b.Parse.Augment({NewCommand:function(c){var e=this.trimSpaces(this.GetArgument(c)),g=this.GetBrackets(c),d=this.GetBrackets(c),f=this.GetArgument(c);if(e.charAt(0)==="\\"){e=e.substr(1)}if(!e.match(/^(.|[a-z]+)$/i)){b.Error(["IllegalControlSequenceName","Illegal control sequence name for %1",c])}if(g){g=this.trimSpaces(g);if(!g.match(/^[0-9]+$/)){b.Error(["IllegalParamNumber","Illegal number of parameters specified in %1",c])}}this.setDef(e,["Macro",f,g,d])},NewEnvironment:function(d){var f=this.trimSpaces(this.GetArgument(d)),h=this.GetBrackets(d),e=this.GetBrackets(d),g=this.GetArgument(d),c=this.GetArgument(d);if(h){h=this.trimSpaces(h);if(!h.match(/^[0-9]+$/)){b.Error(["IllegalParamNumber","Illegal number of parameters specified in %1",d])}}this.setEnv(f,["BeginEnv",[null,"EndEnv"],g,c,h,e])},MacroDef:function(c){var d=this.GetCSname(c),f=this.GetTemplate(c,"\\"+d),e=this.GetArgument(c);if(!(f instanceof Array)){this.setDef(d,["Macro",e,f])}else{this.setDef(d,["MacroWithTemplate",e].concat(f))}},Let:function(d){var e=this.GetCSname(d),f;var g=this.GetNext();if(g==="="){this.i++;g=this.GetNext()}if(g==="\\"){d=this.GetCSname(d);f=this.csFindMacro(d);if(!f){if(a.mathchar0mi[d]){f=["csMathchar0mi",a.mathchar0mi[d]]}else{if(a.mathchar0mo[d]){f=["csMathchar0mo",a.mathchar0mo[d]]}else{if(a.mathchar7[d]){f=["csMathchar7",a.mathchar7[d]]}else{if(a.delimiter["\\"+d]!=null){f=["csDelimiter",a.delimiter["\\"+d]]}}}}}}else{f=["Macro",g];this.i++}this.setDef(e,f)},setDef:function(c,d){d.isUser=true;a.macros[c]=d},setEnv:function(c,d){d.isUser=true;a.environment[c]=d},GetCSname:function(e){var f=this.GetNext();if(f!=="\\"){b.Error(["MissingCS","%1 must be followed by a control sequence",e])}var d=this.trimSpaces(this.GetArgument(e));return d.substr(1)},GetTemplate:function(f,e){var j,g=[],h=0;j=this.GetNext();var d=this.i;while(this.i<this.string.length){j=this.GetNext();if(j==="#"){if(d!==this.i){g[h]=this.string.substr(d,this.i-d)}j=this.string.charAt(++this.i);if(!j.match(/^[1-9]$/)){b.Error(["CantUseHash2","Illegal use of # in template for %1",e])}if(parseInt(j)!=++h){b.Error(["SequentialParam","Parameters for %1 must be numbered sequentially",e])}d=this.i+1}else{if(j==="{"){if(d!==this.i){g[h]=this.string.substr(d,this.i-d)}if(g.length>0){return[h,g]}else{return h}}}this.i++}b.Error(["MissingReplacementString","Missing replacement string for definition of %1",f])},MacroWithTemplate:function(d,g,h,f){if(h){var c=[];this.GetNext();if(f[0]&&!this.MatchParam(f[0])){b.Error(["MismatchUseDef","Use of %1 doesn't match its definition",d])}for(var e=0;e<h;e++){c.push(this.GetParameter(d,f[e+1]))}g=this.SubstituteArgs(c,g)}this.string=this.AddArgs(g,this.string.slice(this.i));this.i=0;if(++this.macroCount>b.config.MAXMACROS){b.Error(["MaxMacroSub1","MathJax maximum macro substitution count exceeded; is there a recursive macro call?"])}},BeginEnv:function(g,k,c,j,h){if(j){var e=[];if(h!=null){var d=this.GetBrackets("\\begin{"+name+"}");e.push(d==null?h:d)}for(var f=e.length;f<j;f++){e.push(this.GetArgument("\\begin{"+name+"}"))}k=this.SubstituteArgs(e,k);c=this.SubstituteArgs([],c)}this.string=this.AddArgs(k,this.string.slice(this.i));this.i=0;return g},EndEnv:function(e,g,d,f){var c="\\end{\\end\\"+e.name+"}";this.string=this.AddArgs(d,c+this.string.slice(this.i));this.i=0;return null},GetParameter:function(d,g){if(g==null){return this.GetArgument(d)}var f=this.i,c=0,e=0;while(this.i<this.string.length){if(this.string.charAt(this.i)==="{"){if(this.i===f){e=1}this.GetArgument(d);c=this.i-f}else{if(this.MatchParam(g)){if(e){f++;c-=2}return this.string.substr(f,c)}else{this.i++;c++;e=0}}}b.Error(["RunawayArgument","Runaway argument for %1?",d])},MatchParam:function(c){if(this.string.substr(this.i,c.length)!==c){return 0}this.i+=c.length;return 1}});b.Environment=function(c){a.environment[c]=["BeginEnv","EndEnv"].concat([].slice.call(arguments,1));a.environment[c].isUser=true};MathJax.Hub.Startup.signal.Post("TeX newcommand Ready")});MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/newcommand.js");
=======
/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

/*
 *  /MathJax/extensions/TeX/newcommand.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
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

MathJax.Extension["TeX/newcommand"]={version:"2.5.0"};MathJax.Hub.Register.StartupHook("TeX Jax Ready",function(){var b=MathJax.InputJax.TeX;var a=b.Definitions;a.Add({macros:{newcommand:"NewCommand",renewcommand:"NewCommand",newenvironment:"NewEnvironment",renewenvironment:"NewEnvironment",def:"MacroDef",let:"Let"}},null,true);b.Parse.Augment({NewCommand:function(c){var e=this.trimSpaces(this.GetArgument(c)),g=this.GetBrackets(c),d=this.GetBrackets(c),f=this.GetArgument(c);if(e.charAt(0)==="\\"){e=e.substr(1)}if(!e.match(/^(.|[a-z]+)$/i)){b.Error(["IllegalControlSequenceName","Illegal control sequence name for %1",c])}if(g){g=this.trimSpaces(g);if(!g.match(/^[0-9]+$/)){b.Error(["IllegalParamNumber","Illegal number of parameters specified in %1",c])}}this.setDef(e,["Macro",f,g,d])},NewEnvironment:function(d){var f=this.trimSpaces(this.GetArgument(d)),h=this.GetBrackets(d),e=this.GetBrackets(d),g=this.GetArgument(d),c=this.GetArgument(d);if(h){h=this.trimSpaces(h);if(!h.match(/^[0-9]+$/)){b.Error(["IllegalParamNumber","Illegal number of parameters specified in %1",d])}}this.setEnv(f,["BeginEnv",[null,"EndEnv"],g,c,h,e])},MacroDef:function(c){var d=this.GetCSname(c),f=this.GetTemplate(c,"\\"+d),e=this.GetArgument(c);if(!(f instanceof Array)){this.setDef(d,["Macro",e,f])}else{this.setDef(d,["MacroWithTemplate",e].concat(f))}},Let:function(d){var e=this.GetCSname(d),f;var g=this.GetNext();if(g==="="){this.i++;g=this.GetNext()}if(g==="\\"){d=this.GetCSname(d);f=this.csFindMacro(d);if(!f){if(a.mathchar0mi[d]){f=["csMathchar0mi",a.mathchar0mi[d]]}else{if(a.mathchar0mo[d]){f=["csMathchar0mo",a.mathchar0mo[d]]}else{if(a.mathchar7[d]){f=["csMathchar7",a.mathchar7[d]]}else{if(a.delimiter["\\"+d]!=null){f=["csDelimiter",a.delimiter["\\"+d]]}}}}}}else{f=["Macro",g];this.i++}this.setDef(e,f)},setDef:function(c,d){d.isUser=true;a.macros[c]=d},setEnv:function(c,d){d.isUser=true;a.environment[c]=d},GetCSname:function(e){var f=this.GetNext();if(f!=="\\"){b.Error(["MissingCS","%1 must be followed by a control sequence",e])}var d=this.trimSpaces(this.GetArgument(e));return d.substr(1)},GetTemplate:function(f,e){var j,g=[],h=0;j=this.GetNext();var d=this.i;while(this.i<this.string.length){j=this.GetNext();if(j==="#"){if(d!==this.i){g[h]=this.string.substr(d,this.i-d)}j=this.string.charAt(++this.i);if(!j.match(/^[1-9]$/)){b.Error(["CantUseHash2","Illegal use of # in template for %1",e])}if(parseInt(j)!=++h){b.Error(["SequentialParam","Parameters for %1 must be numbered sequentially",e])}d=this.i+1}else{if(j==="{"){if(d!==this.i){g[h]=this.string.substr(d,this.i-d)}if(g.length>0){return[h,g]}else{return h}}}this.i++}b.Error(["MissingReplacementString","Missing replacement string for definition of %1",f])},MacroWithTemplate:function(d,g,h,f){if(h){var c=[];this.GetNext();if(f[0]&&!this.MatchParam(f[0])){b.Error(["MismatchUseDef","Use of %1 doesn't match its definition",d])}for(var e=0;e<h;e++){c.push(this.GetParameter(d,f[e+1]))}g=this.SubstituteArgs(c,g)}this.string=this.AddArgs(g,this.string.slice(this.i));this.i=0;if(++this.macroCount>b.config.MAXMACROS){b.Error(["MaxMacroSub1","MathJax maximum macro substitution count exceeded; is there a recursive macro call?"])}},BeginEnv:function(g,k,c,j,h){if(j){var e=[];if(h!=null){var d=this.GetBrackets("\\begin{"+name+"}");e.push(d==null?h:d)}for(var f=e.length;f<j;f++){e.push(this.GetArgument("\\begin{"+name+"}"))}k=this.SubstituteArgs(e,k);c=this.SubstituteArgs([],c)}this.string=this.AddArgs(k,this.string.slice(this.i));this.i=0;return g},EndEnv:function(e,g,d,f){var c="\\end{\\end\\"+e.name+"}";this.string=this.AddArgs(d,c+this.string.slice(this.i));this.i=0;return null},GetParameter:function(d,g){if(g==null){return this.GetArgument(d)}var f=this.i,c=0,e=0;while(this.i<this.string.length){if(this.string.charAt(this.i)==="{"){if(this.i===f){e=1}this.GetArgument(d);c=this.i-f}else{if(this.MatchParam(g)){if(e){f++;c-=2}return this.string.substr(f,c)}else{this.i++;c++;e=0}}}b.Error(["RunawayArgument","Runaway argument for %1?",d])},MatchParam:function(c){if(this.string.substr(this.i,c.length)!==c){return 0}this.i+=c.length;return 1}});b.Environment=function(c){a.environment[c]=["BeginEnv","EndEnv"].concat([].slice.call(arguments,1));a.environment[c].isUser=true};MathJax.Hub.Startup.signal.Post("TeX newcommand Ready")});MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/newcommand.js");

>>>>>>> Packed




