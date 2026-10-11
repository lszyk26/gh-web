/* 在 375px 宽（iPhone SE/12 mini 级）视口下渲染，检查列表行是否被挤压 */
const fs=require('fs'), path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=require('path').join(__dirname,'..','web');
const html=fs.readFileSync(ROOT+'/index.html','utf8');

const repo=(o,n,i)=>({id:i,name:n,full_name:o+'/'+n,private:false,
  owner:{login:o,avatar_url:''},
  description:'一个用于测试的手机端列表项描述文字，故意写长一些看看会不会被挤压成竖排',
  language:'JavaScript',stargazers_count:12800,forks_count:1500,
  license:{spdx_id:'Apache-2.0',name:'Apache License 2.0'},
  pushed_at:new Date().toISOString(),created_at:'2026-01-01T00:00:00Z',
  updated_at:new Date().toISOString(),topics:['tooling','cli','test'],
  default_branch:'main',html_url:'#',archived:false,fork:false,is_template:false,
  subscribers_count:4,open_issues_count:3});

(async()=>{
  const dom=new JSDOM(html.replace(/<script src="[^"]*"><\/script>/g,''),{
    url:'http://x/',pretendToBeVisual:true,runScripts:'outside-only'});
  const w=dom.window;
  // 关键：把视口设成手机宽度
  Object.defineProperty(w,'innerWidth',{value:375,configurable:true});
  Object.defineProperty(w,'innerHeight',{value:812,configurable:true});
  w.matchMedia = q => ({matches: /max-width:\s*680px/.test(q) || /max-width:\s*900px/.test(q), addListener(){}, removeListener(){}});
  global.window=w; global.document=w.document;
  w.localStorage.setItem('ghw.pat',JSON.stringify('ghp_fake_for_test_0123456789abcdef'));
  w.scrollTo=()=>{};
  w.fetch=async(url)=>{
    const p=String(url).replace(/^https?:\/\/[^/]+/,'').replace(/^\/api/,'').split('?')[0];
    const enc=o=>({data:o,status:200,headers:{get:k=>k==='X-GHW-Cache'?'HIT':null}});
    let d={};
    if(/^\/user\/repos/.test(p)) d=[repo('openai','math',1),repo('storytold','wordcraft',2),repo('alchaincyf','huashu-art-motion',3)];
    else if(/^\/search\/repositories/.test(p)) d={total_count:1153,items:[repo('openai','math',1),repo('storytold','wordcraft',2),repo('alchaincyf','huashu-art-motion',3)]};
    else if(/^\/user$/.test(p)) d={login:'zsan-ls',name:'zsan-ls',avatar_url:''};
    else d=[];
    return {ok:true,status:200,headers:{get:k=>k==='X-GHW-Cache'?'HIT':null},text:async()=>JSON.stringify(d)};
  };
  const load=f=>w.eval(fs.readFileSync(ROOT+'/'+f,'utf8'));
  load('vendor/vue.global.prod.js');
  w.hljs={getLanguage:()=>false,highlightAuto:()=>({value:''}),highlight:()=>({value:''})};
  w.marked={setOptions(){},parse:s=>'<p>'+s+'</p>'};
  ['app/util.js','app/api.js','app/components.js',
   ...fs.readdirSync(ROOT+'/app/views').sort().map(f=>'app/views/'+f),'app/app.js']
    .forEach(f=>{try{load(f)}catch(e){console.log('LOAD FAIL',f,e.message)}});
  for(let i=0;i<25;i++) await new Promise(r=>setTimeout(r,80));

  for(const r of ['#/trends','#/repos','#/']){
    w.location.hash=r; w.dispatchEvent(new w.Event('hashchange'));
    for(let i=0;i<14;i++) await new Promise(r2=>setTimeout(r2,80));
    const out=w.document.getElementById('app').innerHTML;
    const rows=(out.match(/class="row"/g)||[]).length;
    const side=(out.match(/class="row-side"/g)||[]).length;
    const ufork=(out.match(/u-fork/g)||[]).length;
    const statInline=(out.match(/class="stat-inline"/g)||[]).length;
    console.log(`${r.padEnd(10)} 行数=${rows}  row-side=${side}  u-fork标记=${ufork}  stat-inline=${statInline}  渲染=${out.length}字节`);
    if(r==='#/trends'){
      // 检查 stat-inline 里的数字与标签是否还是行内粘一起
      const m=out.match(/<span class="s"><span class="n[^"]*">[\s\S]{0,80}?<\/span><span class="l">[^<]*<\/span><\/span>/);
      console.log('  stat-inline 结构样例:', m? '✓ 数字与标签分离':'（未匹配到样例）');
    }
  }
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
