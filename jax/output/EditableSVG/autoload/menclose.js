/*
 *  /MathJax/jax/output/EditableSVG/autoload/menclose.js
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

MathJax.Hub.Register.StartupHook("EditableSVG Jax Ready",function(){var c="2.5.0";var a=MathJax.ElementJax.mml,d=MathJax.OutputJax.EditableSVG,b=d.BBOX;b.ELLIPSE=b.Subclass({type:"ellipse",removeable:false,Init:function(i,k,e,g,f,j){if(j==null){j={}}j.fill="none";if(f){j.stroke=f}j["stroke-width"]=g.toFixed(2).replace(/\.?0+$/,"");j.cx=Math.floor(e/2);j.cy=Math.floor((i+k)/2-k);j.rx=Math.floor((e-g)/2);j.ry=Math.floor((i+k-g)/2);this.SUPER(arguments).Init.call(this,j);this.w=this.r=e;this.h=this.H=i;this.d=this.D=k;this.l=0}});b.DLINE=b.Subclass({type:"line",removeable:false,Init:function(i,l,e,g,f,j,k){if(k==null){k={}}k.fill="none";if(f){k.stroke=f}k["stroke-width"]=g.toFixed(2).replace(/\.?0+$/,"");if(j=="up"){k.x1=Math.floor(g/2);k.y1=Math.floor(g/2-l);k.x2=Math.floor(e-g/2);k.y2=Math.floor(i-g/2)}else{k.x1=Math.floor(g/2);k.y1=Math.floor(i-g/2);k.x2=Math.floor(e-g/2);k.y2=Math.floor(g/2-l)}this.SUPER(arguments).Init.call(this,k);this.w=this.r=e;this.h=this.H=i;this.d=this.D=l;this.l=0}});b.FPOLY=b.Subclass({type:"polygon",removeable:false,Init:function(p,g,e){if(e==null){e={}}if(g){e.fill=g}var j=[],o=100000000,n=o,r=-o,q=r;for(var h=0,f=p.length;h<f;h++){var l=p[h][0],k=p[h][1];if(l>r){r=l}if(l<o){o=l}if(k>q){q=k}if(k<n){n=k}j.push(Math.floor(l)+","+Math.floor(k))}e.points=j.join(" ");this.SUPER(arguments).Init.call(this,e);this.w=this.r=r;this.h=this.H=q;this.d=this.D=-n;this.l=-o}});b.PPATH=b.Subclass({type:"path",removeable:false,Init:function(i,l,e,k,g,f,j){if(j==null){j={}}j.fill="none";if(f){j.stroke=f}j["stroke-width"]=g.toFixed(2).replace(/\.?0+$/,"");j.d=k;this.SUPER(arguments).Init.call(this,j);this.w=this.r=e;this.h=this.H=i+l;this.d=this.D=this.l=0;this.y=-l}});a.menclose.Augment({toSVG:function(G,K){this.SVGgetStyles();var B=this.SVG(),P=this.SVGgetScale(B);this.SVGhandleSpace(B);var r=this.SVGdataStretched(0,G,K);var g=this.getValues("notation","thickness","padding","mathcolor","color");if(g.color&&!this.mathcolor){g.mathcolor=g.color}if(g.thickness==null){g.thickness=".075em"}if(g.padding==null){g.padding=".2em"}var C=this.SVGgetMu(B);var E=d.length2em(g.padding,C,1/d.em)*P;var z=d.length2em(g.thickness,C,1/d.em);z=Math.max(1/d.em,z);var u=r.h+E+z,A=r.d+E+z,k=r.w+2*(E+z);var y=0,v,M,L,I,q=[false,false,false,false];if(!g.mathcolor){g.mathcolor="black"}var j=MathJax.Hub.SplitList(g.notation),o={};for(L=0,I=j.length;L<I;L++){o[j[L]]=true}if(o[a.NOTATION.UPDIAGONALARROW]){o[a.NOTATION.UPDIAGONALSTRIKE]=false}for(var F in o){if(!o.hasOwnProperty(F)||!o[F]){continue}switch(F){case a.NOTATION.BOX:q=[true,true,true,true];break;case a.NOTATION.ROUNDEDBOX:B.Add(b.FRAME(u,A,k,z,"solid",g.mathcolor,{rx:Math.floor(Math.min(u+A-z,k-z)/4)}));break;case a.NOTATION.CIRCLE:B.Add(b.ELLIPSE(u,A,k,z,g.mathcolor));break;case a.NOTATION.ACTUARIAL:q[0]=true;case a.NOTATION.RIGHT:q[1]=true;break;case a.NOTATION.LEFT:q[3]=true;break;case a.NOTATION.TOP:q[0]=true;break;case a.NOTATION.BOTTOM:q[2]=true;break;case a.NOTATION.VERTICALSTRIKE:B.Add(b.VLINE(u+A,z,"solid",g.mathcolor),(k-z)/2,-A);break;case a.NOTATION.HORIZONTALSTRIKE:B.Add(b.HLINE(k,z,"solid",g.mathcolor),0,(u+A-z)/2-A);break;case a.NOTATION.UPDIAGONALSTRIKE:B.Add(b.DLINE(u,A,k,z,g.mathcolor,"up"));break;case a.NOTATION.UPDIAGONALARROW:var J=Math.sqrt(k*k+(u+A)*(u+A)),N=1/J*10/d.em*z/0.075;v=k*N;M=(u+A)*N;var s=0.4*M;B.Add(b.DLINE(u-0.5*M,A,k-0.5*v,z,g.mathcolor,"up"));B.Add(b.FPOLY([[s+v,M],[s-0.4*M,0.4*v],[s+0.3*v,0.3*M],[s+0.4*M,-0.4*v],[s+v,M]],g.mathcolor),k-v-s,u-M);break;case a.NOTATION.DOWNDIAGONALSTRIKE:B.Add(b.DLINE(u,A,k,z,g.mathcolor,"down"));break;case a.NOTATION.PHASORANGLE:q[2]=true;k-=2*E;E=(u+A)/2;k+=E;B.Add(b.DLINE(u,A,E,z,g.mathcolor,"up"));break;case a.NOTATION.MADRUWB:q[1]=q[2]=true;break;case a.NOTATION.RADICAL:B.Add(b.PPATH(u,A,k,"M "+this.SVGxy(z/2,0.4*(u+A))+" L "+this.SVGxy(E,z/2)+" L "+this.SVGxy(2*E,u+A-z/2)+" L "+this.SVGxy(k,u+A-z/2),z,g.mathcolor),0,z);y=E;break;case a.NOTATION.LONGDIV:B.Add(b.PPATH(u,A,k,"M "+this.SVGxy(z/2,z/2)+" a "+this.SVGxy(E,(u+A)/2-2*z)+" 0 0,1 "+this.SVGxy(z/2,u+A-z)+" L "+this.SVGxy(k,u+A-z/2),z,g.mathcolor),0,z/2);y=E;break}}var O=[["H",k,0,u-z],["V",u+A,k-z,-A],["H",k,0,-A],["V",u+A,0,-A]];for(L=0;L<4;L++){if(q[L]){var e=O[L];B.Add(b[e[0]+"LINE"](e[1],z,"solid",g.mathcolor),e[2],e[3])}}B.Add(r,y+E+z,0,false,true);B.Clean();this.SVGhandleSpace(B);this.SVGhandleColor(B);this.SVGsaveData(B);return B},SVGxy:function(e,f){return Math.floor(e)+","+Math.floor(f)}});MathJax.Hub.Startup.signal.Post("EditableSVG menclose Ready");MathJax.Ajax.loadComplete(d.autoloadDir+"/menclose.js")});
