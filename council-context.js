/* Real-world session awareness + knowledge-aware Council uplink. */
const COUNCIL_V2_API=location.hostname==='loafer87.github.io'?'https://twilight-drafter-overview.vercel.app/api/council-v2':'/api/council-v2';
let councilSessionStartedAt=null;

function councilSessionTemporal(){
  let timeZone='America/Vancouver';
  try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||timeZone}catch(e){}
  return{timeZone,sessionStartedAt:councilSessionStartedAt?new Date(councilSessionStartedAt).toISOString():null};
}

const councilContextBaseBegin=begin;
begin=function(){councilSessionStartedAt=Date.now();return councilContextBaseBegin()};
const councilContextBaseReset=resetSetup;
resetSetup=function(){councilSessionStartedAt=null;return councilContextBaseReset()};

councilRemoteReaction=async function(ctx){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try{
    const payload={...ctx,temporal:councilSessionTemporal()};
    const r=await fetch(COUNCIL_V2_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const error=new Error(String(data.code||`http_${r.status}`));error.code=String(data.code||`http_${r.status}`);throw error}
    const text=String(data.commentary||'').trim();
    if(!text){const error=new Error('empty_response');error.code='empty_response';throw error}
    return{text,source:'llm'};
  }finally{clearTimeout(timer)}
};
