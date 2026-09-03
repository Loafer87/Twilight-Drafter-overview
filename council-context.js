/* Real-world session awareness + knowledge-aware Council uplink. */
const COUNCIL_API=location.hostname==='loafer87.github.io'?'https://twilight-drafter-overview.vercel.app/api/council-v4':'/api/council-v4';
const COUNCIL_RECENT_HEADLINES_KEY='ti4-council-recent-headlines-v1';
let councilSessionStartedAt=null;
let councilRecentHeadlines=[];
try{const saved=JSON.parse(localStorage.getItem(COUNCIL_RECENT_HEADLINES_KEY)||'[]');if(Array.isArray(saved))councilRecentHeadlines=saved.filter(Boolean).map(String).slice(-18)}catch(e){}

function councilSessionTemporal(){
  let timeZone='America/Vancouver';
  try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||timeZone}catch(e){}
  return{timeZone,clientNow:new Date().toISOString(),sessionStartedAt:councilSessionStartedAt?new Date(councilSessionStartedAt).toISOString():null};
}
function councilRememberHeadline(title){
  const clean=String(title||'').replace(/\s+/g,' ').trim();if(!clean)return;
  councilRecentHeadlines=councilRecentHeadlines.filter(x=>x.toLowerCase()!==clean.toLowerCase());
  councilRecentHeadlines.push(clean);councilRecentHeadlines=councilRecentHeadlines.slice(-18);
  try{localStorage.setItem(COUNCIL_RECENT_HEADLINES_KEY,JSON.stringify(councilRecentHeadlines))}catch(e){}
}

const councilContextBaseBegin=begin;
begin=function(){councilSessionStartedAt=Date.now();return councilContextBaseBegin()};
const councilContextBaseReset=resetSetup;
resetSetup=function(){councilSessionStartedAt=null;return councilContextBaseReset()};

councilRemoteReaction=async function(ctx){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);
  try{
    const payload={...ctx,temporal:councilSessionTemporal(),recentHeadlines:[...councilRecentHeadlines]};
    const r=await fetch(COUNCIL_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const error=new Error(String(data.code||`http_${r.status}`));error.code=String(data.code||`http_${r.status}`);throw error}
    const text=String(data.commentary||'').trim(),title=String(data.title||'').trim();
    if(!text){const error=new Error('empty_response');error.code='empty_response';throw error}
    if(title)councilRememberHeadline(title);
    return{text,title,achievement:data.achievement&&data.achievement.title?data.achievement:null,source:'llm'};
  }finally{clearTimeout(timer)}
};
