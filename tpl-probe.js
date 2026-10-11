const fs=require('fs'),vm=require('vm');
const ROOT='/opt/gh-web/web';
const ctx={console,window:null,location:{hash:'',origin:'http://x'},navigator:{},document:{},addEventListener(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
for(const f of ['app/util.js','app/api.js','app/components.js','app/views/search.js']){
  vm.runInContext(fs.readFileSync(ROOT+'/'+f,'utf8'),ctx,{filename:f});
}
const tpl = ctx.VIEWS.search.template;
console.log('模板长度', tpl.length);
// 用官方编译器（prod 运行时构建里就是它）
const V=require('@vue/compiler-dom');
const errs=[];
V.compile(tpl,{onError:e=>errs.push(e)});
console.log('编译错误数', errs.length);
errs.slice(0,5).forEach(e=>console.log(' ->', e.message, e.loc? JSON.stringify(e.loc.start):''));
