const fs=require('fs'),{JSDOM}=require('jsdom');
const ROOT='/opt/gh-web/web';
const dom=new JSDOM('<div id="app"></div>',{url:'http://127.0.0.1/',runScripts:'outside-only'});
const w=dom.window;
w.eval(fs.readFileSync(ROOT+'/vendor/vue.global.prod.js','utf8'));
const origFunction=w.Function;
w.Function=function(...args){const src=args[args.length-1];if(typeof src==='string'&&src.length>500)global.__GEN=src;return origFunction.apply(this,args)};
const vm=require('vm');
const ctx={console,window:null,location:{hash:'',origin:'http://x'},navigator:{},document:{},addEventListener(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['app/util.js','app/api.js','app/components.js','app/views/search.js']) vm.runInContext(fs.readFileSync(ROOT+'/'+f,'utf8'),ctx,{filename:f});
try{ w.Vue.compile(ctx.VIEWS.search.template); }catch(e){ console.log('编译错误:',e.message); }
if(global.__GEN){
  fs.writeFileSync('/opt/gh-web/gensearch.js','module.exports=function(){\n'+global.__GEN+'\n}');
  const lines=global.__GEN.split('\n');
  console.log('总行数',lines.length);
  for(let i=6;i<12;i++){
    console.log('--- 行'+i+' (len '+lines[i].length+')');
    console.log(lines[i].slice(0,700));
  }
}
