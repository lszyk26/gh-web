const fs=require('fs'),vm=require('vm'),{JSDOM}=require('jsdom');
const ROOT='/opt/gh-web/web';
const dom=new JSDOM('<div id="app"></div>',{url:'http://127.0.0.1/',runScripts:'outside-only'});
const w=dom.window;
w.eval(fs.readFileSync(ROOT+'/vendor/vue.global.prod.js','utf8'));
const ctx={console,window:null,location:{hash:'',origin:'http://x'},navigator:{},document:{},addEventListener(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['app/util.js','app/api.js','app/components.js','app/views/search.js']){
  vm.runInContext(fs.readFileSync(ROOT+'/'+f,'utf8'),ctx,{filename:f});
}
const tpl=ctx.VIEWS.search.template;
try{
  const fn=w.eval('(function(t){return Vue.compile(t)})')(tpl);
  console.log('编译 OK', Object.keys(fn));
}catch(e){
  console.log('编译抛出:', e.message);
  // 手工取生成代码：Vue.compile 内部就是把模板编成函数体
  const code = w.eval('(function(t){return Vue.compile(t)})');
}
