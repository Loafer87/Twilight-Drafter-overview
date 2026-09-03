const councilV6=require('./council-v6');
const {flavorFor,flavorLore}=require('./council-faction-flavor');

function mergeUnique(a,b){const out=[];for(const x of [...(a||[]),...(b||[])]){const s=String(x||'').trim();if(s&&!out.some(y=>y.toLowerCase()===s.toLowerCase()))out.push(s)}return out}
function enrich(ctx={}){
  const extra=flavorLore(ctx);
  if(ctx.mode==='verdict'){
    const table=(ctx.players||[]).map(p=>({player:p?.name,faction:p?.faction,flavor:flavorFor(p?.faction)})).filter(x=>x.flavor).slice(0,5);
    table.forEach(x=>extra.push(`FINAL-TABLE VISUAL FLAVOR — ${x.player} / ${x.faction}: ${x.flavor.visual} ${x.flavor.table}`));
    if(table.length)extra.push('Final-table visual flavor is optional. Do not turn the verdict into a player-by-player nickname roll call; seize only one visual detail if it genuinely improves the reaction.');
  }
  return{...ctx,tableLore:mergeUnique(ctx.tableLore,extra),factionFlavor:{selected:flavorFor(ctx.faction),rejected:(ctx.rejected||[]).map(flavorFor).filter(Boolean).slice(0,2)}};
}
function oddCount(text,re){const m=String(text||'').match(re);return(m?m.length:0)%2===1}
function incompleteTransmission(text){
  const t=String(text||'').trim();if(!t)return true;
  if(/[,:;\-—–“‘([{]$/.test(t))return true;
  if(/\b(?:and|or|but|because|with|without|of|to|for|from|by|as|the|a|an|has|have|is|are|was|were|into|through|before|after|while|which|that|this|your|our|their)$/i.test(t))return true;
  if(oddCount(t,/"/g)||oddCount(t,/“|”/g)||oddCount(t,/‘|’/g))return true;
  const pairs=[['(',')'],['[',']'],['{','}']];for(const[a,b]of pairs){if((t.split(a).length-1)!==(t.split(b).length-1))return true}
  const words=t.split(/\s+/).filter(Boolean);if(words.length<4)return true;
  return false;
}
function captureResponse(realRes){
  const captured={statusCode:200,body:null,ended:false};
  const proxy={
    setHeader:(...args)=>{realRes.setHeader(...args);return proxy},
    status:code=>{captured.statusCode=code;return proxy},
    json:body=>{captured.body=body;captured.ended=true;return proxy},
    end:body=>{captured.body=body;captured.ended=true;return proxy}
  };
  return{captured,proxy};
}
module.exports=async function handler(req,res){
  if(req.method==='POST'&&req.body)req.body=enrich(req.body);
  if(req.method!=='POST')return councilV6(req,res);
  const originalNonce=req.body?.transmissionNonce||Date.now().toString(36);
  for(let take=0;take<3;take++){
    if(take&&req.body){req.body={...req.body,transmissionNonce:`${originalNonce}-completion-retake-${take}`,recentBodyPatterns:[...(req.body.recentBodyPatterns||[]),`incomplete-retake-${take}`]}}
    const {captured,proxy}=captureResponse(res);
    await councilV6(req,proxy);
    if(captured.statusCode!==200)return res.status(captured.statusCode).json(captured.body||{error:'Council Intelligence malfunction',code:'upstream_failure'});
    const body=captured.body||{};
    if(!incompleteTransmission(body.commentary))return res.status(200).json({...body,completionGate:true,completionRetakes:take});
  }
  return res.status(502).json({error:'Council returned an incomplete transmission after retakes',code:'incomplete_transmission',apiVersion:'v7-director'});
};
