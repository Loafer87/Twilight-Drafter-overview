/* Real-world session awareness + knowledge-aware Council uplink. */
const COUNCIL_API=location.hostname==='loafer87.github.io'?'https://twilight-drafter-overview.vercel.app/api/council-v5':'/api/council-v5';
const COUNCIL_RECENT_HEADLINES_KEY='ti4-council-recent-headlines-v1';
const COUNCIL_RECENT_ACHIEVEMENTS_KEY='ti4-council-recent-ai-achievements-v1';
const COUNCIL_RECENT_SHAPES_KEY='ti4-council-recent-performance-shapes-v1';
let councilSessionStartedAt=null,councilTransmissionCounter=0;
let councilRecentHeadlines=[],councilRecentAchievements=[],councilRecentPerformanceShapes=[];
try{const saved=JSON.parse(localStorage.getItem(COUNCIL_RECENT_HEADLINES_KEY)||'[]');if(Array.isArray(saved))councilRecentHeadlines=saved.filter(Boolean).map(String).slice(-18)}catch(e){}
try{const saved=JSON.parse(localStorage.getItem(COUNCIL_RECENT_ACHIEVEMENTS_KEY)||'[]');if(Array.isArray(saved))councilRecentAchievements=saved.filter(Boolean).map(String).slice(-16)}catch(e){}
try{const saved=JSON.parse(localStorage.getItem(COUNCIL_RECENT_SHAPES_KEY)||'[]');if(Array.isArray(saved))councilRecentPerformanceShapes=saved.filter(Boolean).map(String).slice(-4)}catch(e){}

function councilSessionTemporal(){
  let timeZone='America/Vancouver';
  try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||timeZone}catch(e){}
  return{timeZone,clientNow:new Date().toISOString(),sessionStartedAt:councilSessionStartedAt?new Date(councilSessionStartedAt).toISOString():null};
}
function councilRememberItem(list,value,limit,key){
  const clean=String(value||'').replace(/\s+/g,' ').trim();if(!clean)return list;
  const next=list.filter(x=>x.toLowerCase()!==clean.toLowerCase());next.push(clean);const trimmed=next.slice(-limit);
  try{localStorage.setItem(key,JSON.stringify(trimmed))}catch(e){}
  return trimmed;
}
function councilRememberHeadline(title){councilRecentHeadlines=councilRememberItem(councilRecentHeadlines,title,18,COUNCIL_RECENT_HEADLINES_KEY)}
function councilRememberAchievement(title){councilRecentAchievements=councilRememberItem(councilRecentAchievements,title,16,COUNCIL_RECENT_ACHIEVEMENTS_KEY)}
function councilRememberPerformanceShape(shape){councilRecentPerformanceShapes=councilRememberItem(councilRecentPerformanceShapes,shape,4,COUNCIL_RECENT_SHAPES_KEY)}
function councilTransmissionNonce(){
  councilTransmissionCounter++;
  try{const a=new Uint32Array(2);crypto.getRandomValues(a);return`${Date.now().toString(36)}-${councilTransmissionCounter.toString(36)}-${a[0].toString(36)}${a[1].toString(36)}`}
  catch(e){return`${Date.now().toString(36)}-${councilTransmissionCounter.toString(36)}-${Math.random().toString(36).slice(2,10)}`}
}

const councilContextBaseBegin=begin;
begin=function(){councilSessionStartedAt=Date.now();return councilContextBaseBegin()};
const councilContextBaseReset=resetSetup;
resetSetup=function(){councilSessionStartedAt=null;return councilContextBaseReset()};

councilRemoteReaction=async function(ctx){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),24000);
  try{
    const payload={...ctx,temporal:councilSessionTemporal(),transmissionNonce:councilTransmissionNonce(),recentHeadlines:[...councilRecentHeadlines],recentAchievements:[...councilRecentAchievements],recentPerformanceShapes:[...councilRecentPerformanceShapes]};
    const r=await fetch(COUNCIL_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const error=new Error(String(data.code||`http_${r.status}`));error.code=String(data.code||`http_${r.status}`);throw error}
    const text=String(data.commentary||'').trim(),title=String(data.title||'').trim();
    if(!text){const error=new Error('empty_response');error.code='empty_response';throw error}
    if(title)councilRememberHeadline(title);
    if(data.achievement?.title)councilRememberAchievement(data.achievement.title);
    if(data.performanceShape)councilRememberPerformanceShape(data.performanceShape);
    return{text,title,achievement:data.achievement&&data.achievement.title?data.achievement:null,performanceShape:data.performanceShape||null,source:'llm'};
  }finally{clearTimeout(timer)}
};
