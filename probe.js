const fs=require('fs'),{JSDOM}=require('jsdom');
const ROOT='/opt/gh-web/web';
const html=fs.readFileSync(ROOT+'/index.html','utf8').replace(/<script src="[^"]*"><\/script>/g,'');
const dom=new JSDOM(html,{url:'http://127.0.0.1/',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window;
const store={'ghw.pat':JSON.stringify('ghp_faketoken_0123456789abcdefghij')};
w.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},clear:()=>{}};
w.scrollTo=()=>{};
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
w.__calls=[];
w.fetch=async(u,init)=>{
  w.__calls.push(String(u));
  const p=String(u).replace(/^https?:\/\/[^/]+/,'').replace(/^\/api/,'').split('?')[0];
  const body = p==='/user' ? {login:'lszyk26',name:'zsn',avatar_url:'',public_repos:11}
    : p==='/user/repos' ? []
    : p==='/user/starred' ? [] : p==='/user/following' ? [] 
    : p==='/rate_limit' ? {rate:{limit:5000,remaining:4900,reset:Math.floor(Date.now()/1000)+600,used:100}} : {};
  return {ok:true,status:200,headers:{get:k=>k==='X-GHW-Cache'?'HIT':null},text:async()=>JSON.stringify(body)};
};
w.eval(fs.readFileSync(ROOT+'/vendor/vue.global.prod.js','utf8'));
w.hljs={getLanguage:()=>false,highlightAuto:()=>({value:''})};w.marked={setOptions(){},parse:s=>'<p>'+s+'</p>'};
for(const f of ['app/util.js','app/api.js','app/components.js',...fs.readdirSync(ROOT+'/app/views').sort().map(f=>'app/views/'+f),'app/app.js']){
  try{w.eval(fs.readFileSync(ROOT+'/'+f,'utf8'))}catch(e){console.log('LOAD '+f+': '+e.message)}
}
setTimeout(async()=>{
  console.log('typeof w.fetch =',typeof w.fetch);
  console.log('API.token =', JSON.stringify(w.API && w.API.token));
  try{ const u=await w.API.me(); console.log('手动 API.me() =>', JSON.stringify(u)); }
  catch(e){ console.log('手动 API.me() 抛错:', e.message, e.status); }
  console.log('fetch 调用记录:', w.__calls);
  const root=w.document.getElementById('app');
  console.log('bootErr 显示?', /banner-bad/.test(root.innerHTML));
  const vm=w.document.querySelector('.login-wrap');
  console.log('仍在登录页?', !!vm);
},800);
setTimeout(()=>{
  console.log('--- 深入 ---');
  console.log('localStorage.getItem("ghw.pat") =', w.localStorage.getItem('ghw.pat'));
  console.log('U.store.get("pat") =', JSON.stringify(w.U.store.get('pat','__DEF__')));
  console.log('U.store 有 get?', typeof (w.U.store && w.U.store.get));
  console.log('API.loadToken 返回 =', JSON.stringify(w.API.loadToken()));
  console.log('localStorage === w.localStorage ?', (w.localStorage===w.window.localStorage));
},1500);
