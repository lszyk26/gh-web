const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT='/opt/gh-web/web';
const html=fs.readFileSync(ROOT+'/index.html','utf8').replace(/<script src="[^"]*"><\/script>/g,'');
const dom=new JSDOM(html,{url:'http://127.0.0.1/',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window;
const store={'ghw.pat':JSON.stringify('ghp_faketoken_0123456789abcdefghij')};
w.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},clear:()=>{}};
w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
w.fetch=async(u)=>{
  const p=String(u).replace(/^https?:\/\/[^/]+/,'').replace(/^\/api/,'').split('?')[0];
  const body = p==='/user' ? {login:'lszyk26',name:'zsn',avatar_url:'',public_repos:11,private_repos:11}
    : p==='/user/repos' ? [{id:1,name:'gh-mcp',full_name:'lszyk26/gh-mcp',owner:{login:'lszyk26',avatar_url:''},pushed_at:new Date().toISOString(),stargazers_count:3,forks_count:1,language:'Python'}]
    : p==='/user/starred' ? [] : p==='/user/following' ? [] : p==='/rate_limit' ? {rate:{limit:5000,remaining:4900,reset:Math.floor(Date.now()/1000)+600,used:100}}
    : p==='/notifications' ? [] : {};
  return {ok:true,status:200,headers:{get:k=>k==='X-GHW-Cache'?'HIT':null},text:async()=>JSON.stringify(body)};
};
w.eval(fs.readFileSync(ROOT+'/vendor/vue.global.prod.js','utf8'));
w.hljs={getLanguage:()=>false,highlightAuto:()=>({value:''})};w.marked={setOptions(){},parse:s=>'<p>'+s+'</p>'};
for(const f of ['app/util.js','app/api.js','app/components.js',...fs.readdirSync(ROOT+'/app/views').sort().map(f=>'app/views/'+f),'app/app.js']){
  try{w.eval(fs.readFileSync(ROOT+'/'+f,'utf8'))}catch(e){console.log('LOAD '+f+': '+e.message)}
}
setTimeout(async()=>{
  const app=w.document.getElementById('app');
  console.log('--- 首屏长度',app.innerHTML.length);
  console.log('含 sidebar:',/class="sidebar"/.test(app.innerHTML));
  console.log('含 login-art:',/login-art/.test(app.innerHTML));
  console.log(app.innerHTML.slice(0,600).replace(/\s+/g,' '));
  console.log('--- 切换到 #/repos');
  w.location.hash='#/repos'; w.dispatchEvent(new w.Event('hashchange'));
  await new Promise(r=>setTimeout(r,400));
  console.log('长度',app.innerHTML.length,'| 含 row-list:',/row-list/.test(app.innerHTML),'| 含 gh-mcp:',/gh-mcp/.test(app.innerHTML));
  console.log(app.innerHTML.slice(0,700).replace(/\s+/g,' '));
},700);
