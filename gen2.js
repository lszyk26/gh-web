const fs=require('fs'),vm=require('vm'),{JSDOM}=require('jsdom');
const ROOT='/opt/gh-web/web';
const dom=new JSDOM('<div id="app"></div>',{url:'http://127.0.0.1/',runScripts:'outside-only'});
const w=dom.window;
w.eval(fs.readFileSync(ROOT+'/vendor/vue.global.prod.js','utf8'));
// patch Function 构造器，捕获生成的代码
const origFunction = w.Function;
w.Function = function(...args){
  const src = args[args.length-1];
  if (typeof src === 'string' && src.indexOf('_createElementVNode') >= 0) {
    global.__GEN = src;
  }
  return origFunction.apply(this, args);
};
const ctx={console,window:null,location:{hash:'',origin:'http://x'},navigator:{},document:{},addEventListener(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['app/util.js','app/api.js','app/components.js','app/views/search.js']){
  vm.runInContext(fs.readFileSync(ROOT+'/'+f,'utf8'),ctx,{filename:f});
}
try{ w.eval('Vue.compile' )(ctx.VIEWS.search.template); }catch(e){ }
// 直接用 Vue.compile
try{ w.eval('(function(){})()'); w.Vue.compile(ctx.VIEWS.search.template); }catch(e){ console.log('err',e.message); }
if (global.__GEN){
  const lines = global.__GEN.split('\n');
  console.log('生成代码行数', lines.length);
  const L = lines[8] || '';
  console.log('第9行 长度', L.length);
  console.log('片段(280-420):', JSON.stringify(L.slice(280,420)));
} else console.log('没抓到生成代码');
