/*
 *  /MathJax/jax/output/EditableSVG/autoload/texify.js
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

MathJax.Hub.Register.StartupHook("EditableSVG Jax Ready",function(){var e=MathJax.ElementJax.mml;var a=MathJax.OutputJax.EditableSVG;var b=MathJax.InputJax.TeX.Definitions;var d;e.mbase.Augment({toTex:function(){throw new Error("toTex not implemented for "+this.type)},getChildTex:function(j){return this.data[j]?this.data[j].toTex():""}});e.hole.Augment({toTex:function(){return"{ }"}});e.math.Augment({loadTexify:function(){}});e.chars.Augment({toTex:function(){var j=this.data[0].replace(/[^a-z]/i,"");if(b.macros[j]){return"\\"+j+" "}return this.data[0]}});var f={toTex:function(){return this.getChildTex(0)}};e.TeXAtom.Augment(f);e.math.Augment(f);e.mn.Augment(f);e.mo.Augment(f);e.mi.Augment(f);e.entity.Augment({toTex:function(){var j=this.data[0].substring(2);if(!d){h()}return d[j]||this.toString()}});var i={toTex:function(){var k=g(this.getChildTex(this.sub));var j=g(this.getChildTex(this.sup));if(k){k="_"+k}if(j){j="^"+j}return g(this.getChildTex(this.base))+j+k}};e.msubsup.Augment(i);e.munderover.Augment(i);e.mfrac.Augment({toTex:function(){return"\\frac{"+this.getChildTex(this.num)+"}{"+this.getChildTex(this.den)+"}"}});e.msqrt.Augment({toTex:function(){return"\\sqrt{"+this.getChildTex(0)+"}"}});e.mroot.Augment({toTex:function(){return"\\sqrt["+this.getChildTex(1)+"]{"+this.getChildTex(0)+"}"}});e.mrow.Augment({toTex:function(){var j="";var k;for(k=0;k<this.data.length;++k){j+=this.getChildTex(k)}if(!j){return j}if(j[0]==="("&&j[j.length-1]===")"){j="\\left"+j.slice(0,-1)+"\\right"+j.slice(-1)}return j}});function g(j){if(!/^\\[a-z]$/i.test(j)&&j.length>1){return"{"+j+"}"}else{return j}}function c(k,j){Object.keys(k).forEach(function(l){j(k[l],l)})}function h(){d={};c(b.mathchar0mi,j);c(b.mathchar0mo,j);c(b.mathchar7,j);c(b.remap,function(l,k){d[l]=k});function j(l,k){var m=(typeof l==="string")?l:l[0];d[m]="\\"+k}}MathJax.Hub.Startup.signal.Post("texify Ready");MathJax.Ajax.loadComplete(a.autoloadDir+"/texify.js")});
