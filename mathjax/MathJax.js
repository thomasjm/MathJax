/*************************************************************
 *
 *  MathJax.js
 *  
 *  The main code for the MathJax math-typesetting library.  See 
 *  http://www.mathjax.org/ for details.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2010 Design Science, Inc.
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

if (!window.MathJax) {window.MathJax = {}}

MathJax.Unpack = function (data) {
  var k, d, n, m, i;
  for (k = 0, m = data.length; k < m; k++) {
    d = data[k];
    for (i = 0, n = d.length; i < n; i++)
      {if (typeof(d[i]) == 'number') {d[i] = d[d[i]]}}
    data[k] = d.join('');
  }
  eval(data.join(''));
};
MathJax.isPacked = true;

MathJax.Unpack([
  ['if(','document.','getElementById','&&',1,'childNodes&&',1,'createElement','){','if(!','window.MathJax','){',10,'={}}',9,'MathJax.Hub','){MathJax.version="0.9.9";(','function(','d){','var b=','window[d];if(!','b){b','=window[d]={}}var ','f','=[];','var c=',17,'g','){var h=','g.','constructor',';if(!','h){h=','new Function','("")}','for(var ','i in g){if(i!=="',30,'"&&g','.hasOwnProperty','(i)){h[i]=g[i]}}','return ','h};var a=','function(){',41,33,'("',41,'arguments','.callee','.Init','.call(this,',48,')")};var e=a();e','.prototype','={bug_test:1};',9,'e',54,'.bug_test){a=',43,41,43,41,48,49,50,51,48,')}}}b.','Object','=c({',30,':a(),Subclass:',17,'g,i',28,'a();h.SUPER=this;h',50,'=this',50,';h','.Subclass','=this',82,';h.Augment=this.Augment;h.','protoFunction','=this.',86,';h.can=this.can;h.has=this.has;h.isa=this.isa;h',54,'=new this(f);h',54,'.',30,'=h;h.Augment(g,i);',41,'h},Init:',17,'g',28,'this;if(g','.length===','1&&g[0]===f','){return ','h}if(!(h ','instanceof ','g',49,')){h=new g',49,'(f)}',41,'h',50,'.apply(','h,g)||h},Augment:',17,'g,h){var i;if(g','!=null){for(i in ','g){if(g',39,'(i)){this','.',86,'(i,g[i','])}}if(g.toString!==this.prototype.toString&&g.toString!=={}.toString){this.protoFunction("toString",g.toString)}}','if(h',119,'h){if(','h',39,122,'[i]=h[i]}}}',41,'this},',86,':',17,'h,g){this',54,'[h]=g;','if(typeof',' g','==="function"){','g.SUPER=this.SUPER',54,'}},prototype:{Init',':function(){},','SUPER:',17,'g',104,'g',49,'.SUPER},can:',17,'g',104,'typeof(this[g','])==="function"},has:',17,'g',104,159,'])!=="undefined','"},isa:',17,'g){return(g ',106,70,')&&(this ',106,'g)}},can:',17,'g',104,'this',54,'.can',51,'g)},has:',17,'g',104,'this',54,'.has',51,'g)},isa:',17,'h){var g=this;while(',120,'===h',104,'true}else{g=g.SUPER}}',41,'false},SimpleSUPER:c({',30,':',17,'g',104,'this.SimpleSUPER.define(g)},define:',17,'g){var i={};if(g!=null){',35,'h in ',120,39,'(h)){this.',86,'(h,g[h',126,41,'i},wrap:',17,'i,h){',142,'(h',')==="function"&&','h','.toString','().match(/\\.\\s*SUPER\\s*\\(/)){var g=',33,'(this.wrapper);g.label=i;g','.original','=h;h=g;g',222,'=this.stringify}',41,'h},wrapper:',43,'var h=',48,49,';this.SUPER=h.SUPER[h.label];try{var g=h',226,'.apply(this',',',48,')}catch(i){','delete this.','SUPER;','throw i}',242,243,41,'g}.','toString().replace','(/^\\s*function \\(\\)\\s*\\{\\s*/i,"").replace(/\\s*\\}\\s*$/i,""),toString:',43,41,'this',226,222,238,226,',',48,')}})})})("MathJax");(',17,'BASENAME){var ','BASE=window[BASENAME','];',9,'BASE){',263,']={}}var ','CALLBACK','=',17,'data){var cb=',33,'("',41,48,49,'.execute',115,48,49,',',48,')");',35,'id in ','CALLBACK.prototype','){if(',287,39,'(id)){',142,'(data[id',165,'"){cb[id]=data[id]}else{cb[id]=',287,'[id]}}}cb',222,'=',287,222,';',41,'cb};',287,'={isCallback:true,hook',148,'data:[],object:window,execute:',43,9,'this.called||this.autoReset){this.called=!this.autoReset;',41,'this.hook',238,'.object,this','.data.concat([].slice.call(',48,',0)))}},reset:',43,242,'called},toString:',43,41,313,222,238,'.hook,',48,')}};var ISCALLBACK=',17,'f){return(typeof(f',220,'f.isCallback)};var EVAL=',17,'code',104,'eval.call(window,code)};EVAL("var __TeSt_VaR__ = 1','");if(','window.__TeSt_VaR__','){delete ',339,'}else{if(','window.execScript','){EVAL=',17,'code){BASE.__code=code;code="try {"+BASENAME+".__result = eval("+BASENAME+".__code)} catch(err) {"+BASENAME+".__result = err}";',343,'(code',');var result=BASE.__result;delete BASE.__result;delete BASE.__code;if(result instanceof Error){throw result}return result','}}else{EVAL=',17,346,'var head=(',1,'getElementsByTagName("head"))[0];if(!','head){head=',1,'body}var script=',1,7,'("script");','script','.appendChild(',1,'createTextNode','(code));head',363,'script);','head.removeChild(','script',349,'}}}var USING=',17,'args,i','){if(',48,'.length','>1){if(',48,102,'2&&!(typeof ',48,'[0]==="function")&&',48,'[0] ',106,'Object&&typeof ',48,'[1]==="number"){','args=[].slice.call(',374,')}else{',390,48,',0)}}if(args ',106,'Array&&args',102,'1){args=args[0]}',142,' args',144,'if(args',278,'===',287,278,104,'args}',41,269,'({hook:args})}else{if(args ',106,'Array){',142,'(args[0])==="string"&&args[1] ',106,387,'args[1][args[0]]==="','function"){return CALLBACK({hook:args[','1][args[0]],object:args[1','],data:args.slice(','2)})}else{',142,' args[0]==="',420,'0',422,'1)})}else{',142,' args[1]==="',420,'1],object:args[0',422,'2)})}}}}else{',142,'(args)==="','string"){',41,269,'({hook:EVAL,data:[args]})}else{if(args ',106,70,104,269,'(args',392,142,437,'undefined"){',41,269,'({})}}}}}','throw Error("Can\'t ','make ','callback',' from given data")};var DELAY=',17,'time,',456,'){callback=USING(callback);',456,'.timeout=','setTimeout(',456,',time);','return callback','};var WAITFOR=',17,456,',signal',461,9,456,'.called){','WAITSIGNAL(',456,471,');signal.pending++}};var WAITEXECUTE=',43,'var ','signals','=this','.signal',';',242,'signal;this',278,'=this.','oldExecute;',242,490,'var result=','this',278,238,',',48,');','if(ISCALLBACK(result)&&!result.called){',476,'result,',482,392,'for(var i=0,m=',482,'.length;i<m;i++){','signals[i].pending','--;if(',508,'<=0){',482,'[i].call()}}}};var WAITSIGNAL=',17,456,',',482,'){if(!(',482,' ',106,'Array)){',482,'=[',482,']}',9,456,484,'){',456,'.oldExecute=',456,278,';',456,278,'=WAITEXECUTE;',456,484,'=',482,342,482,102,'1){',456,484,'.push(',482,'[0','])}else{',456,484,'=',456,484,'.concat(',482,')}}};var AFTER=',17,456,461,456,'.pending=0;',35,'i=1,m=',48,507,'if(',48,'[i]){WAITFOR(',48,'[i],',456,')}}if(',456,'.pending===0){',493,456,'();','if(ISCALLBACK(result',')){',456,'=result}}',467,'};var HOOKS=',17,'hooks,data,reset){',9,'hooks',104,'null}if(!(hooks ',106,522,'hooks=[hooks]}if(!(data ',106,522,'data=(data==null?[]:[data])}var ','callbacks','=[{}];',505,'hooks',507,'if(reset){hooks[i].reset()}',493,'hooks[i].apply(window,data);',500,600,549,'result)}}if(',600,102,'1',104,'null}if(',600,102,'2',104,600,'[1]}',41,'AFTER.apply({},',600,')};var QUEUE=BASE.',70,82,'({Init:',43,'this.pending','=0;','this.running','=0;','this.queue',24,'this.Push',238,',',48,')},Push:',43,'var ',456,';',505,48,507,456,'=USING(',48,'[i]);if(',456,'===',48,'[i]&&!',456,475,456,'=USING(["wait",this,',456,'])}',635,549,456,')}',9,633,'&&!',631,'){','this.Process','()}',467,'},Process:',17,'queue){while(!',633,'&&!',631,'&&',635,377,'){var ',456,'=',635,'[0];queue=',635,'.slice(1);',635,24,'this.Suspend();',493,456,'();','this.Resume();','if(queue',377,'){',635,'=queue',558,635,')}',500,'WAITFOR(result,this',')}}},','Suspend:',43,633,'++},Resume:',43,'if(',633,'){',633,'--}},call:',43,672,238,',',48,')},wait:',17,456,'){',467,'}});var SIGNAL=QUEUE',82,'({Init:',17,'name){','QUEUE',54,50,'.call(this',');this.name=name;','this.posted',24,'this.listeners','=[]},Post:',17,'message,',456,',forget',461,'if(this.posting||this.pending){',637,'(["Post",this,message,',456,746,552,'this.',456,'=',456,';',456,'.reset();',9,'forget){',739,549,'message)}',693,'this.posting=1;',505,741,507,741,'[i].reset();var result=(',741,'[i])(','message);',500,707,')}}',697,242,'posting',31,631,'){this.call()}}',467,'},Clear:',17,456,461,748,456,'=',637,'(["Clear",this,',456,552,739,24,456,'()}',467,'},call:',43,'this.',456,'(this);',672,'()},Interest:',17,456,',ignorePast',461,741,'[',741,377,']=',456,31,'ignorePast){',505,739,507,456,760,493,456,'(',739,'[i]);',582,')&&i===',739,377,'-1){',707,')}}}',467,'},NoInterest:',17,456,'){',505,741,507,'if(',741,'[i]===',456,'){',741,'.splice(i,1);return}}},MessageHook:',17,'msg,',456,461,9,'this.hooks','){',858,'={};this.Interest(["ExecuteHooks",this])}',9,'this.hooks[msg',']){',863,']=[]}',863,'].push(',456,');',505,739,507,'if(',739,'[i]==msg){',456,760,456,'(',739,'[i])}}',467,'},ExecuteHooks:',17,'msg,more){var type=((msg ',106,'Array)?msg[0]:msg);',41,'HOOKS(',858,'[type],[msg],true)}},{',482,':{},find:',17,733,9,'SIGNAL.signals[name',']){',898,']=new SIGNAL(name)}',41,898,']}});BASE.Callback=BASE.CallBack=USING',';BASE.Callback.','Delay=DELAY',905,'After=AFTER',905,'Queue=QUEUE',905,'Signal=SIGNAL.find;BASE','.Callback.ExecuteHooks','=HOOKS})("MathJax");(',17,'d','){var a=',20,'a){a',22,'c=(','navigator.vendor==="Apple Computer, Inc."&&typeof navigator.vendorSub==="undefined','");var f=0;var g=',17,129,1,'styleSheets','&&',1,927,377,'>f){f=',1,927,377,'}',9,'h){h=(',1,355,32,1,'body}}',41,'h};var e',24,19,43,35,'j=0,h=e',377,';j<h;j++){','a.Ajax.',369,'e[j])}e=[]};a.Ajax={loaded:{},loading:{},loadHooks:{},timeout:15*1000,styleDelay:1,config:{root:""},STATUS:{OK:1,ERROR:-1},rootPattern:new RegExp("^\\\\["+d+"\\\\]"),fileURL:',17,'h',104,'h.replace(this.rootPattern,this.config.root)},Require:',17,'j,m){m','=a.Callback(','m',');var k;if(j instanceof Object){for(var h in j){}k=h.toUpperCase();j=j[h]}else{k=j.split(/\\./).pop().toUpperCase()}j=this.fileURL(j);if(this.','loaded[j]){m','(this.loaded[j])}else{','var l={};l[k]=j;this.Load(l,m)}',41,'m},Load:',17,'j,l){l',962,'l',964,'loading[j]){','this.loading','[j].',600,549,'l',392,'this.head=g(this.head);','if(this.loader[k]){this.loader[k].call(this,j,l',392,454,'load files of type "+k)}}',41,'l},LoadHook:',17,'j,k){k',962,'k);if(j ',106,70,'){',35,207,'j){j=j[h]}}j=','this.fileURL(','j);if(this.loaded[j]){k',966,9,'this.loadHooks[','j]){',1003,'j]=[]}',1003,'j].push(k)}',41,'k},loader:{JS:',17,'i,k',28,1,7,361,'var j=','a.Callback','(["','loadTimeout','",this,i]);',976,'[i]={',600,':[k','],message:a.Message.File(','i),timeout:',464,'j,','this.timeout','),status:this.STATUS.OK',',script:h};h.onerror=j;h.type="text/javascript";h.src=i;','this.head',363,'h)},CSS:',17,'h,j){var i=',1,7,'("link");i.rel="stylesheet";','i.type="text/css";','i.href=h;',976,'[h]={',600,':[j',1026,'h',1031,'};',1033,363,'i);this.timer.create',737,',[this.timer.file,h],i)}},timer:{create:',17,217,'i',962,'i);if(','h.nodeName==="STYLE','"&&h','.styleSheet&&typeof(','h','.styleSheet.cssText)!=="undefined"){i','(this','.STATUS.OK)}else{','if(window.chrome&&typeof(window.sessionStorage)!=="undefined"&&',1061,'"){i(this',1067,'if(c){','this.timer.start(this,[this.timer.','checkSafari2',',f++,','i],this.styleDelay',392,1073,'checkLength,h,',1076,')}}}',41,'i},start:',17,'i,h,j){h',962,'h);h',278,'=this',278,';h.time=this.time;h.STATUS=i.STATUS;h',463,'i.timeout',';h.delay=h.total=0;',464,'h,j)},time:',17,'h){this.total+=this.delay;this.delay=Math.floor(this.delay*1.05+5);if(this.total>=',1030,'){h(','this.STATUS.ERROR',');',41,'1}',41,'0},file:',17,'i,',129,'h<0){',953,1020,'(i',392,953,'loadComplete','(i)}},execute:',43,313,737,315,',this.data[0],this.data[1])},',1074,':',17,'h,i,j){if(h.time(j)){return}if(',1,927,377,'>i&&',1,927,'[i].cssRules','&&',1,927,1133,377,'){j(h',1067,464,'h,h.delay',')}},checkLength:',17,'h,k,m){if(h.time(m)){return}var l=0;var i=(k.sheet||k.styleSheet);try{if((i.cssRules||i.rules||[]).length>0){l=1}}catch(j){','if(j.message.match(/','protected variable|restricted URI/)){l=1}else{',1146,'Security error/)){l=1}}}if(l){',464,1018,'([m,h.STATUS.OK]),0',392,464,1142,708,1116,':',17,32,999,'h);var i=',976,'[h];if(','i){a.Message.Clear(i.',775,'clearTimeout(',1093,');if(i.script){if(e',102,'0){',464,'b,0)}e',549,'i.script)}this.loaded[h]=i.status;delete ',976,1164,1003,'h]){',1018,'.Queue([a',913,',',1003,'h],i.status],[a',913,',i.',600,',i.status',552,'a',913,'(i.',600,1189,708,1020,':',17,129,976,'[h].timeout','){',1167,976,1202,')}',976,'[h].status=',1101,';this.loadError(h);this.',1116,'(h)},loadError:',17,'h){a.Message.Set("File failed to load: "+h,null,2000)},Styles:',17,'j,k',28,'this.StyleString(','j);if(h===""){k',962,'k);k()}else{var i=',1,7,'("style");',1041,982,1033,363,1060,'i',1063,'i',1065,'.styleSheet.cssText=h}else{i',363,1,365,'(h))}k=this.timer.create',51,'k,i)}',41,'k},StyleString:',17,'m){',142,'(m)==="',438,41,'m}var j="",n,l;for(n in m){if(m',39,'(n)){',142,' m[n]==="',438,'j+=n+" {"+','m[n]+"}\\n"}else{if(m[n] ',106,414,35,'k=0;k<m[n].length;k++){l={};l[n]=m[n][k];j+=',1219,'l)}}else{if(n.substr(0,6)==="@media"){',1256,1219,'m[n])+"}\\n"}else{if(m[n]!=null){l',24,35,207,'m[n]){if(m[n][h]!=null){l[l',377,']=h+": "+m[n][h]}}',1256,'l.join("; ")+"}\\n"}}}}}}',41,'j}}})("MathJax");MathJax.HTML={Element:',17,'c,e,d){var f=',1,7,'(c);if(e){if(e.style){',19,'e.style;e.style={};',35,'g in b){if(b',39,'(g)){e.style[g.replace(/-([a-z])/g,this.ucMatch)]=b[g]}}}',15,'.Insert(f,e)}if(d){',35,'a=0;a<d',377,';a++){if(d[a] ',106,414,'f',363,'this.Element(','d[a][0],d[a][1],d[a][2]))}else{f',363,1,365,'(d[a]))}}}',41,'f},ucMatch:',17,'a,b',104,'b.toUpperCase()},addElement:',17,'b,a,d,c',104,'b',363,1298,'a,d,c))},TextNode:',17,'a',104,1,365,'(a)},addText:',17,'a,b',104,'a',363,'this.TextNode(b))},Cookie:{prefix:"mjx",expires:365,Set:',17,'a,d){var c',24,'if(d){',35,'f in d){if(d',39,'(f)){c',549,'f+":"+d[f].',249,'(/&/g,"&&"))}}}',19,'this.prefix+":"+','a+"="+escape(c.join("&;"));if(this.expires){var e=new Date();e.setDate(e.getDate()+this.expires);b+="; expires="+e.toGMTString()}',1,'cookie=b+"; path=/"},Get:',17,'c,h){',9,'h){h={}}var g=new RegExp("(?:^|;\\\\s*)"+',1342,'c+"=([^;]*)(?:;|$)");',19,'g.exec(',1,'cookie);if(b&&b[1]!==""){var e=unescape(b[1]).split("&;");',35,'d=0,a=e',377,';d<a;d++){b=e[d].match(/([^:]+):(.*)/);var f=b[2].replace(/&&/g,"&");if(f==="true"){f=true',342,'f==="false"){f=false',342,'f.match(/^-?(\\d+(\\.\\d+)?|\\.\\d+)$/)){f=parseFloat(f)}}}h[b[1]]=f}}',41,'h}}};','MathJax.Message','={log:[{}],current:null,textNodeBug:(',922,'")||(window',39,'&&window',39,'("konqueror")),styles:{"#','MathJax_Message','":{position:"','fixed",left:"1px",bottom:"2px","background-color":"#E6E6E6",border:"1px solid #959595','",margin:"0px",padding:"','2px 8px","z-index":"102",color:"black","font-size":"80%",width:"auto","white-space":"nowrap"},"#','MathJax_MSIE_Frame',1375,'absolute",top:0,left:0,width:"0px","z-index":101,border:"0px',1377,'0px"}},browsers:{MSIE:',17,'a){','MathJax.Hub.config.styles["#MathJax_Message"].','position="absolute";',1366,'.quirks=(',1,'compatMode==="BackCompat")},Chrome:',17,'a){',1386,'bottom="1.5em";',1386,'left="1em"}},Init:',43,9,1,'body',104,'false}if(','this.div','&&',1404,'.parentNode==null){',1404,'=',1,2,'("',1374,338,1404,'){this.text=',1404,'.firstChild','}}',9,1404,917,1,'body;if(',15,'.Browser.isMSIE){a=this.frame','=this.addDiv(',1,'body);a.style.',1387,'a.style.border=a.style.margin=a.style.padding="0px";a.style.zIndex="101";a.style.height="0px";a',1427,'a);a.id="',1379,'";','window.attachEvent("','onscroll",','this.MoveFrame',');',1436,'onresize",',1438,');',1438,'()}',1404,1427,'a);',1404,'.style.display="none";this.text=',1404,363,1,365,'(""))}',41,'true},addDiv:',17,'a){',19,1,7,'("div");b.id="',1374,'";if(a',1418,'){a.insertBefore(b,a',1418,392,'a',363,'b)}',41,'b},MoveFrame:',43,'var a=(',1366,'.quirks?',1,'body:',1,'documentElement);',19,1366,'.frame;b.style.left=a.scrollLeft+"px";b.style.top=a.scrollTop+"px";b.style.width=a.clientWidth+"px";b=b',1418,';b.style.height=a.clientHeight+"px"},filterText:',17,'a,b){if(',15,'.config.messageStyle==="simple"){if(a.match(/^Loading /)){',9,976,'){',976,'="Loading "}a=',976,';',976,'+="."}else{if(a.match(/^Processing /)){',9,'this.processing','){',1502,'="Processing "}a=',1502,';this.processi'],
  ['ng+="."}}}','return ','a},Set',':function','(b,c',',a','){if(this.timer){clearTimeout(this.timer',');','delete ','this.timeout}if(c','==null','){c','=this','.log','.length',';','this.log[','c]={}}',16,'c','].text','=b;b',12,'.filterText(','b,c);','if(typeof','(',16,'c].next',')==="undefined"){',16,28,'=','this.current',';if(',33,'!=null){',16,33,'].prev=','c}',33,'=c}if(',33,'===c&&','MathJax.Hub.config.','messageStyle','!=="none"){','if(this.','Init()){','if(this.textNodeBug){this.div.innerHTML=','b','}else{','this.text','.nodeValue','=b}','this.div.style.display','="";','if(this.status){window.status="";delete this.status}}else{','window.status','=b;this.status=true}}if(a){setTimeout(','MathJax.Callback','(["Clear','",this,','c]),a)}',1,'c},Clear',3,'(b,a){if','(',16,'b].prev',36,16,16,71,'].next=',16,'b].next','}if(',16,78,36,16,16,78,39,16,71,'}if(',33,'===b){',33,'=',16,78,34,53,'){',48,'div','.parentNode',10,'){this.','Init()}if(',33,10,6,')}this.timer=setTimeout(',61,'(["Remove",this]),(a||600))}else{',50,16,33,20,52,53,54,'=',16,33,20,'}}',58,48,'status){',59,'=(',33,10,'?"":',16,33,20,')}}}',8,16,78,';',8,16,71,'},Remove',3,'(){',53,54,57,56,'="none"},File',3,'(b){var a=','MathJax.','Ajax','.config.','root',34,'b','.substr(0,','a',14,')===a){b="[MathJax]"+b.substr(a',14,')}',1,'this.Set("Loading "+b)},Log',3,'(){var b=[];','for(var ','c=1,a',12,13,14,';c<a;c++){b[c]=',16,'c',20,'}',1,'b.join("\\n")}};',152,'Hub={config:{root:"",config',':[],','styleSheets',182,'styles',':{},jax',182,'extensions',182,'preJax',':null,','postJax',191,'displayAlign:"center",displayIndent:"0",','preRemoveClass',':"MathJax_Preview",showProcessingMessages:true,',46,':"normal",','delayStartupUntil',':"none",','skipStartupTypeset',':false,','preProcessors',182,'inputJax',':{},','outputJax',':{},','menuSettings',':{zoom:"None",CTRL:false,ALT:false,CMD:false,Shift:false,zscale:"200%",renderer:"",font:"Auto",context:"MathJax"},','errorSettings',':{message:["[Math Processing Error]"],style:{color:"#CC0000","font-style":"italic"}}},','processUpdateTime',':500,signal:',61,'.Signal("','Hub"),','Config',3,'(a){this','.Insert(','this.config',',a);if(','this.config.','Augment',103,225,'(',224,225,')}},','Register',':{PreProcessor',3,'(a){',45,203,'.push(',61,'(a))},','MessageHook',3,'(){',1,152,'Hub','.signal.',241,'.apply(',152,'Hub','.signal,arguments)},','StartupHook',3,'(){',1,'MathJax.Hub.Startup',247,241,249,257,252,'LoadHook',3,'(){',1,152,'Ajax.',263,249,152,'Ajax,','arguments',231,'getAllJax',3,'(','e){var c=[],b=this.elementScripts(e);for(var d=0,a=b.length;d<a;d++){if(b[d].MathJax&&b[d].MathJax.elementJax','){c.push(b[d].','MathJax.elementJax',')}}',1,'c},getJaxByType',3,'(f,',278,'&&b[d].',280,'.mimeType===f){c.push(b[d].',280,')}}',1,'c},getJaxByInputType',3,'(f,',278,287,'type',287,'type.replace(/ *;(.|\\','s)*/,"")===f){c.push(b[d].',280,')}}',1,'c},getJaxFor',3,'(a){','if(typeof(a)==="string"){a=document.getElementById(a',')}','if(a.MathJax){',1,'a.',280,'}',1,'null},isJax',3,'(a){',308,')}','if(a.tagName!=null&&a.tagName.toLowerCase()==="script"){',310,'return(a','.MathJax.state','===',152,'ElementJax.STATE','.PROCESSED','?1:-1)}if(a.type&&',224,205,'[a.',300,'s)*/,"")]){return -1}}',1,'0},Queue',3,'(){',1,'this.queue','.Push',249,340,',',273,')},','Typeset',3,4,'){if(!',152,'isReady){',1,'null}var ','a','=this.elementCallback(',24,1,61,'.Queue(["','PreProcess',63,'a.element','],["','Process',63,363,']).','Push(a.callback)},',361,3,4,'){var a',356,24,1,61,360,'Post",this.signal',',"Begin ',361,'"],["','ExecuteHooks",',61,',(','arguments.callee.disabled','?[]:',224,203,'),',363,',true','],["Post",this.signal,"End ',361,'"]).',369,365,3,'(a,b){',1,'this.takeAction("',365,'",a,b)},','Update',3,399,1,401,404,403,'Reprocess',3,399,1,401,411,403,'takeAction',3,'(d,c,e){var b',356,'c,e);var a=[];',1,61,360,'Clear",this.signal],["',379,',["Begin "+','d,b.element',']],["','prepareScripts',63,429,',a],["','processScripts',63,'a],["',379,',["End "+',429,']]).Push(b.callback)},','scriptAction',':{',365,3,'(a){},',404,3,151,'b.',280,34,'a&&a.','originalText','===(b.text==""?b.innerHTML:b.text)){b',324,'=a.STATE',328,52,'a','.outputJax.Remove(','a);b',324,'=a','.STATE.UPDATE','}},',411,3,151,'b.',280,34,'a){a',461,'a);b',324,'=a',465,'}}},',431,3,'(h,e,f){if(',386,'){return}var b=this.','elementScripts','(e);var g=',152,327,';',168,'d=0,a=b',14,';d<a;d++){var c=b[d];if(c.type&&',224,205,'[c.',300,'n)*/,"")]){if(c.MathJax&&c',324,'!==g.PENDING',103,442,'[h](c)}if(!c.MathJax){c.MathJax={state:g.PENDING}}if(c',324,'!==g',328,'){f.push(c)}}}},','checkScriptSiblings',3,'(a){if(a.MathJax&&a.',152,'checked',484,'config;var g=a','.previousSibling',34,'g&&g.nodeName=="#text"){var d,f;var c=a.nextSibling',34,'c&&c.nodeName!="#text"){c=null}if','(b.preJax','){',25,520,')==="string"){b.',190,'=new RegExp',520,'+"$")}d=g',54,'.match',520,')}if','(b.postJax','&&c){',25,533,524,192,526,'("^"+b.',192,')}f=c',54,'.match',533,')}if(d&&(!b.',192,'||f)){g',54,'=g',54,'.replace',520,',(d',14,'>1?d[1]:""));g=null}if(f&&(!b.',190,'||d)){c',54,'=c',54,552,533,',(f',14,'>1?f[1]:""))}if(g&&!g',54,'.match(/\\S/)){','g=g',515,'}}if(b.',195,'&&g&&g.className==b.',195,'){try{g.innerHTML=""}catch(e){}g.style.display="none"}',310,'a.',152,512,'=1}},',435,3,'(h,b,d){if(',386,'){',1,354,'q,o=',152,327,';var p=',224,205,',c=',224,207,';try{if(!b){b=','new Date().getTime','()}var j=0,l,f;while(j<h',14,'){l=h[j];if(!l){continue}f=l',515,34,'f&&f.className==="','MathJax_Error','"){f',101,'.removeChild(f)}var k=l.',300,'s)*/,"");if(!l.MathJax||l',324,'===o',328,'){continue}if(!l.',280,'||l',324,'===o.UPDATE',103,508,'(l);q=p[k].','Translate(l);if(typeof q==="function"){','if(q.called){continue}this.RestartAfter(q)}','q.Attach(l,p[k])}var a=l.',280,';if(!c[a.mimeType]){l',324,'=o.UPDATE;','throw Error("No ','output jax registered for "+a.mimeType)}a.',207,'=c[a.mimeType][0];q=a.',207,'.',622,'l',324,628,623,'l',324,'=o',328,';this',247,'Post(["New Math",a.inputID]);j++;if(',598,'()-b>this.',213,'&&j<h',14,'){b=0;this.','RestartAfter','(',61,'.Delay(1))}}}catch(g){if(!g.restart){if(!',224,211,'.message){throw g}this.formatError(l,g);j++}if(!d){d=0}var e=Math.floor((d+j)/(d+h',14,')*100);d+=j',34,224,'showProcessingMessages){MathJax.Message.Set("Processing ','math: "+e+"%",0)}',1,61,'.After(["',435,63,'h.slice(j),b,d],g.restart)}if((d||h',14,')&&',224,664,'Math: 100%",0);',152,'Message.','Clear(0)}',1,'null},formatError',3,'(a,c){var b=',152,'HTML.Element("span",{className:"',605,'"},',224,211,'.message);a',101,'.insertBefore(b,a);this.lastError=c},',653,3,'(a){throw this',221,'Error("restart"),{restart:',61,'(a)})},elementCallback',3,399,'if(b',10,'&&(a ','instanceof Array','||typeof a==="','function','")){b=a;a=','document.','body',52,'if(a==null){a=document.body}','else{',308,')}}}if(!a){',629,'such element")}if(!b){b={}}return{element:a,callback:b}},',485,3,'(a){',308,')}',712,321,'return[a]}',1,'a.','getElementsByTagName("','script")},Insert',3,'(c,a){',168,'b in a){if(a','.hasOwnProperty','(b)){',25,' a[b]==="object"&&!(a[b] ',705,')&&(','typeof c[b]==="','object"||',740,707,'")){this',221,'c[b],a[b])}else{c[b]=a[b]}}}',1,'c}};',152,'Hub',221,45,185,',',152,678,185,');',152,'Hub',221,45,185,',{".',605,'":',45,211,'.style});',152,'Extension={};',257,'={script:"",queue:',61,'.Queue(),','signal:',61,216,'Startup','"),',218,3,'(){','this.queue.Push(["Post",this.signal,"Begin ',218,'"]);var a=',152,'HTML.Cookie','.Get("user");if(a.URL||a.',218,'){if(confirm("MathJax has found a user-configuration cookie that includes code to be run.  Do you want to run it?\\n\\n(You should press Cancel unless you set up the cookie yourself.)")){if(a.URL){',340,'.Push(["Require",MathJax.Ajax,','a.URL])}if(a.',218,'){',152,'userConfig=new Function(a.',218,')}}else{',152,788,'.Set("user",{})}}',48,'script',568,340,'.Push(this.script+";\\n1;")}else{',340,793,'this.URL("config","',152,'js")])}',1,340,'.Push([',707,4,'){if(b.',199,'.isCallback){',1,'b.',199,'}if(b.',199,'==="onload"){',1,'c}',1,707,'(){}},',152,'Hub.config,this.onload','],[function(','b){',1,'b.','loadArray','(',45,'config,"config",null,true)},this',393,218,'"])},','Cookie',3,'(){',1,784,846,382,'Get",',152,788,',"menu",',45,209,835,'f,c){if(f','.renderer','){var d="output/"+f',861,';',168,'e=0,b=c',14,',a=0;e<b;e++){if(c[e]===d){c.splice(e,1);a=0;break}if(c[e].substr(0,7)==="output/"){a=(a?0:e+1)}}c.unshift(d);if(a){c.splice(a,1)}}},',45,209,',',45,'jax',393,846,845,'Styles',3,'(){',1,784,877,382,839,63,45,183,',"config',382,877,'",',152,272,45,185,393,877,845,'Jax',3,'(){',1,784,'Jax',382,839,63,45,'jax,"jax","config.js",true',393,'Jax',845,'Extensions',3,'(){',1,784,913,382,839,63,45,188,',"',188,382,379,',"End ',913,845,'onLoad',3,'(a){var b',12,'.onload=',61,'(','function(){',257,247,'Post("onLoad")});if(','window.addEventListener','){',942,'("load",b,false)}else{if(','window.attachEvent','){',946,'("onload",b)}else{window.onload=b}}',1,'b},',347,3,399,'if(',45,201,'){',1,707,'(){}}',1,784,347,382,347,'",',152,'Hub,a,b',393,347,845,'URL',3,68,'(!a.match(/^([a-z]+:\\/\\/|\\[|\\/)/)){a="[MathJax]/"+b+"/"+a}',1,'a},',839,3,'(b,f,c,a){if(b){if(!(b ',705,')){b=[b]}if(b',14,'){var h=',61,775,'j={},e;',168,'g=0,d=b',14,';g<d;g++){e',12,'.URL(f,b[g]);if(c){e+="/"+c}if(a){h',793,'e,j])}else{h.Push(',152,'Ajax.Require(e,j))}}',1,'h.Push({})}}',1,'null}};(',707,'(d','){var b=window[','d],e="["+d+"]";var c=b.Hub,a=b.',272,'f=b.Callback;var g=',152,'Object','.Subclass','({require',191,'config:{},Init',3,'(i,h){','if(',273,14,'===0){',1,'this}return(','this.constructor',1011,'(i,h))()},',225,3,'(k,j','){var i=',1023,',h={};if(k',36,168,'l in k){if(k',734,'(l)){',25,' k[l]==="',707,'"){','i.protoFunction','(l,k[l])}else{h[l]=k[l]}}}if(k.toString!==i','.prototype.','toString&&k.toString!=={}.toString){',1041,'("toString",k.toString)}}c',221,'i.prototype,h);i.',225,'(null,j);',1,'this},','Translate',3,'(h){',1023,1043,1053,12,'.noTranslate;',1,'a.Require(','this.directory','+"/jax.js','")},noTranslate',3,'(h){throw Error(',1063,1064,' failed to redefine the ',1053,'() method")},',232,3,'(h){},',218,3,'(){c',221,222,',(c.config[this.name]||{}));if(',224,225,103,225,'(',224,225,231,779,3,'(){},','loadComplete',3,'(n){if(n==="jax.js"){var j=f.Queue();','j.Push(["Post",c.Startup.signal,this.name+" Jax ',218,'"]);','j.Push(["',218,'",this]);',1096,'Require"]);',48,'require){var k',12,'.require;if(!(k ',705,')){k=[k]}',168,'l=0,h=k',14,';l<h;l++){j.Push(',1062,'k[l]))}',1099,839,'",',257,',',224,'require,"config"])}',1096,779,'"]);',1099,779,'",this]);',1096,'Ready"]);',1,1099,1093,'",a,',1063,'+"/"+n])}else{',1,'a.',1093,'(',1063,'+"/"+n)}}},{name:"unknown",version:"1.0",directory:e+"/jax",extensionDir:e+"/',188,'"});b.InputJax=g',1011,'({',232,3,'(h){if(!','b.Hub',154,205,'){c',154,205,'={}}c',154,205,'[h]=this}},{','version:"1.0",directory:g.directory+"/','input','",extensionDir:g.extensionDir','});b.OutputJax=g',1011,'({',232,3,1149,'c.config.outputJax','){',1169,'={}}if(!',1169,'[h]){',1169,'[h]=[];if(!c',154,209,861,'){c',154,209,861,12,'.name}}',1169,'[h].push(this)},Remove',3,'(h){}},{',1160,'output',1162,',fontDir:e+(b.isPacked?"":"/..")+"/fonts"});','b.ElementJax','=g',1011,'({Init',3,1016,1,1023,1011,'(i,h)},',205,191,207,191,'inputID',191,454,':"",mimeType:"",Text',3,'(j,k){','var h=this.SourceElement();','if(','h.firstChild','){if(',1216,'.nodeName!=="#text"){h.text=j',52,1216,54,'=j}}else{try{h.innerHTML=j}catch(i){h.text=j}}h',324,12,465,';',1,'c.',404,'(h,k)},',411,3,'(i){',1214,'h',324,12,465,';',1,'c.',411,'(h,i)},Remove',3,'(){this',461,'this);c',247,'Post(["Remove Math",this.inputID]);this.Detach()},SourceElement',3,'(){',1,709,'getElementById(this.inputID)},Attach',3,'(i,j){var h=i.',280,34,'i',324,'===this',465,'){h.Clone(this)}else{h=i.',280,12,34,'i.id',103,'inputID=',1268,52,1268,12,'.',1270,1194,'.GetID();this.newID=1}}h.',454,'=(i.text==""?i.innerHTML:i.text);h.',205,'=j},Detach',3,'(){',1214,'if(!h){return}try{',8,'h.MathJax}catch(i){h.MathJax=null}',48,'newID){h.id=""}},Clone',3,'(h){var i;for(i in this){if(!this',734,'(i)){continue}if(typeof(','h','[i])==="undefined','"&&i!=="newID"){',8,'this[i]}}for(i in h){if(!this',734,1294,'this',1296,'"||(this[i]!==h[i]&&i!=="inputID")){this[i]=h[i]}}}},{',1160,'element',1162,',ID:0,STATE:{PENDING:1,PROCESSED:2,UPDATE:3},GetID',3,'(){this.ID++;return"MathJax-Element-"+this.ID},Subclass',3,'(){var h=g',1011,249,'this,',273,');h.',1093,12,1043,1093,';',1,'h}});',1194,1043,'STATE=b.',327,'})("MathJax");(',707,'(l',1005,'l];if(!b){b=window[l]={}}var d=b.Hub;var n=d.',779,';var m=d.config;var k=',709,728,'head")[0];if(!k){k=',709,'childNodes[0]}var f=(',709,'documentElement||document).',728,'script");var e',526,'("(^|/)"+l+"\\\\.js$");',168,'g=f',14,'-1;g>=0;g--){if(f[g].src.match(e)){n.script=f[g].innerHTML;m.root=f[g].src',552,'(/(^|\\/)[^\\/]*$/,"");break}}b.Ajax.config=m;var j={isMac',':(navigator.platform.substr(0,3)==="','Mac"),isPC',1353,'Win"),isMSIE:(',709,'all!=null&&!','window.opera','),isFirefox:(',709,'ATTRIBUTE_NODE!=null&&window.directories!=null),isSafari',':(navigator.vendor!=null&&navigator.vendor.match(/','Apple/)!=null&&!navigator.omniWebString),isOpera:(',1359,'!=null&&',1359,'.version!=null),isChrome',1363,'Google/)!=null),isKonqueror:(window',734,'&&window',734,'("konqueror")),versionAtLeast',3,'(r){var q=(this','.version).split','(".");r=(','new String','(r)).split(".");',168,'s=0,p=r',14,';s<p;s++){if(q[s]!=r[s]){',1,'parseInt(q[s]||"0")>=parseInt(r[s])}}',1,'true},Select',3,'(p',1029,'p[d.Browser];if(i){',1,'i(d.Browser)}',1,'null}};var a=navigator.userAgent',552,'(/^Mozilla\\/(\\d+\\.)+\\d+ /,"").replace(/[a-z][-a-z0-9._: ]+\\/\\d+[^ ]*-[^ ]*\\.([a-z][a-z])?\\d+ /i,"").replace(/Gentoo |Ubuntu\\/(\\d+\\.)*\\d+ (\\([^)]*\\) )?/,"");d.Browser=d',221,'d',221,1379,'("Unknown"),{version:"0.0"}),j);',168,'h in j){if(j',734,'(h)){if(j[h]&&h',158,'2)==="is"){h=h.slice(2);if(h==="Mac"||h==="PC"){continue}d.Browser=d',221,1379,'(h),j);var o',526,'(".*(Version',')/((?:\\\\d+\\\\.)+\\\\d','+)|.*("+h+")"+(h=="MSIE"?" ":"/")+"((?:\\\\d+\\\\.)*\\\\d+)|(?:^|\\\\(| )([a-z][-a-z0-9._: ]+|WebKit',1415,'+)");var c=o.exec(a)||["","","","unknown","0.0"];d.Browser.name=(c[1]=="Version"?h:(c[3]||c[5]));d.Browser.version=c[2]||c[4]||c[6];break}}}','d.Browser.Select','({Safari',3,'(p',1029,'parseInt((String(p',1377,'("."))[0]);if(i>=526){','p.version="','4.0','"}else{if(i','>=525){',1427,'3.1',1429,'>500){',1427,'3.0',1429,'>400){',1427,'2.0',1429,'>85){',1427,'1.0"}}}}}},Firefox',3,'(p){if(p.version==="0.0"&&navigator.product==="Gecko"&&','navigator.productSub',1029,1447,158,'8);if(i>="20090630"){',1427,'3.5',1429,'>="20080617"){',1427,'3.0',1429,'>="20061024"){',1427,'2.0"}}}}},Opera',3,'(i){i.version=opera.version()}});',1419,'(',152,678,'browsers);d.queue=b.Callback.Queue();d.queue.Push(["','Post",n.signal,"','Begin',382,218,'",n],["',846,1473,877,1473,'Jax',1473,913,'",n],n.onLoad(),',938,152,'isReady=true},["',347,1473,1469,'End"])})("MathJax")}};']
]);

