/*
 *  /MathJax/jax/output/EditableSVG/config.js
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

MathJax.OutputJax.EditableSVG=MathJax.OutputJax({id:"EditableSVG",version:"2.5.0",directory:MathJax.OutputJax.directory+"/EditableSVG",extensionDir:MathJax.OutputJax.extensionDir+"/EditableSVG",autoloadDir:MathJax.OutputJax.directory+"/EditableSVG/autoload",fontDir:MathJax.OutputJax.directory+"/EditableSVG/fonts",config:{scale:100,minScaleAdjust:50,font:"TeX",blacker:10,mtextFontInherit:false,undefinedFamily:"STIXGeneral,'Arial Unicode MS',serif",addMMLclasses:true,useFontCache:true,useGlobalCache:true,EqnChunk:(MathJax.Hub.Browser.isMobile?10:50),EqnChunkFactor:1.5,EqnChunkDelay:100,linebreaks:{automatic:false,width:"container"},merrorStyle:{fontSize:"90%",color:"#C00",background:"#FF8",border:"1px solid #C00",padding:"3px"},styles:{".MathJax_EditableSVG_Display":{"text-align":"center",margin:"1em 0em"},".MathJax_EditableSVG .MJX-monospace":{"font-family":"monospace"},".MathJax_EditableSVG .MJX-sans-serif":{"font-family":"sans-serif"},"#MathJax_EditableSVG_Tooltip":{"background-color":"InfoBackground",color:"InfoText",border:"1px solid black","box-shadow":"2px 2px 5px #AAAAAA","-webkit-box-shadow":"2px 2px 5px #AAAAAA","-moz-box-shadow":"2px 2px 5px #AAAAAA","-khtml-box-shadow":"2px 2px 5px #AAAAAA",padding:"3px 4px","z-index":401}}}});if(!MathJax.Hub.config.delayJaxRegistration){MathJax.OutputJax.EditableSVG.Register("jax/mml")}MathJax.OutputJax.EditableSVG.loadComplete("config.js");
