const councilV6=require('./council-v6');
const {flavorFor,flavorLore}=require('./council-faction-flavor');

function mergeUnique(a,b){const out=[];for(const x of [...(a||[]),...(b||[])]){const s=String(x||'').trim();if(s&&!out.some(y=>y.toLowerCase()===s.toLowerCase()))out.push(s)}return out}
function verdictDirective(ctx={}){
  const roster=(ctx.players||[]).filter(p=>p?.faction).map(p=>`${p.name||'Unknown'} = ${p.faction}`);
  if(!roster.length)return[];
  const minimum=Math.min(3,roster.length);
  return[
    `FINAL VERDICT SYNTHESIS DIRECTIVE: this is a judgment on the COMPLETED TABLE, not another reaction to the Speaker or the last interesting player. Build one strong thesis from at least ${minimum} distinct locked factions, their mechanics/strategic identities, or meaningful relationships between them. Synthesize; do not write a player-by-player recap because the factual roster is already visible in the UI. A player-specific behavior such as selection switches, Speaker status, an undo, or a callback may be supporting evidence, but it must not become the entire verdict unless the event was genuinely extraordinary. The body should make sense only for THIS combination of factions, not for one pick in isolation.`,
    `LOCKED ROSTER FOR TABLE SYNTHESIS: ${roster.join(' | ')}`,
    'FINAL VERDICT TONE: find the collective absurdity, danger, contradiction, economy, arms race, political dysfunction or looming table relationship created by the roster. The Council may be unfair, dark, profane or delighted by the consequences. One table-level thesis is better than five mini-reviews.'
  ];
}
function enrich(ctx={}){
  const extra=flavorLore(ctx);
  if(ctx.mode==='verdict')extra.push(...verdictDirective(ctx));
  return{...ctx,tableLore:mergeUnique(ctx.tableLore,extra),factionFlavor:{selected:flavorFor(ctx.faction),rejected:(ctx.rejected||[]).map(flavorFor).filter(Boolean).slice(0,2)}};
}
function oddCount(text,re){const m=String(text||'').match(re);return(m?m.length:0)%2===1}
function incompleteTransmission(text){
  const t=String(text||'').trim();if(!t)return true;
  if(!/[.!?…][\"'”’\])}]*$/.test(t))return true;
  if(/[,:;\-—–“‘([{]$/.test(t))return true;
  if(/\b(?:and|or|but|because|with|without|of|to|for|from|by|as|the|a|an|has|have|is|are|was|were|into|through|before|after|while|which|that|this|your|our|their)$/i.test(t))return true;
  if(/\b(?:ready|trying|planning|intending|hoping|prepared|designed|built|waiting|about)\s+to\s+\w+[\"'”’\])}]*[.!?…]?$/i.test(t))return true;
  if(oddCount(t,/"/g)||oddCount(t,/“|”/g)||oddCount(t,/‘|’/g))return true;
  const pairs=[['(',')'],['[',']'],['{','}']];for(const[a,b]of pairs){if((t.split(a).length-1)!==(t.split(b).length-1))return true}
  const words=t.split(/\s+/).filter(Boolean);if(words.length<4)return true;
  return false;
}
function verdictTooNarrow(payload,ctx={}){
  if(ctx.mode!=='verdict')return false;
  const players=(ctx.players||[]).filter(p=>p?.faction);if(players.length<3)return false;
  const text=[payload?.headline,payload?.title,payload?.commentary].filter(Boolean).join(' '),lower=text.toLowerCase();
  const represented=players.filter(p=>{const name=String(p.name||'').trim().toLowerCase(),faction=String(p.faction||'').trim().toLowerCase();return(faction&&lower.includes(faction))||(name&&name.length>2&&lower.includes(name))}).length;
  const tableCue=/\b(?:table|roster|delegations?|factions?|lineup|galaxy|chamber|everyone|everybody|you people|collective|between them|this group|this mess|all five|all four|all three|entire table)\b/i.test(text);
  const pickReactionCue=/\b(?:speaker|selection switches?|switched|changed (?:his|her|their|its) mind|highlights?|revisions?|undo|redos?|backsies|\d+ seconds?|pick\s*#?\d+|first pick|last pick)\b/i.test(text);
  if(!tableCue&&represented<2)return true;
  if(pickReactionCue&&represented<2)return true;
  return false;
}
function responseIssue(payload,ctx){if(incompleteTransmission(payload?.commentary))return'incomplete';if(verdictTooNarrow(payload,ctx))return'verdict-too-narrow';return''}
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
  const originalNonce=req.body?.transmissionNonce||Date.now().toString(36);let lastIssue='';
  for(let take=0;take<3;take++){
    if(take&&req.body){req.body={...req.body,transmissionNonce:`${originalNonce}-quality-retake-${take}`,recentBodyPatterns:[...(req.body.recentBodyPatterns||[]),`v7-rejected-${lastIssue||'quality'}-${take}`]}}
    const {captured,proxy}=captureResponse(res);
    await councilV6(req,proxy);
    if(captured.statusCode!==200)return res.status(captured.statusCode).json(captured.body||{error:'Council Intelligence malfunction',code:'upstream_failure'});
    const body=captured.body||{};lastIssue=responseIssue(body,req.body);
    if(!lastIssue)return res.status(200).json({...body,completionGate:true,verdictSynthesisGate:req.body?.mode==='verdict',qualityRetakes:take});
  }
  return res.status(502).json({error:'Council returned an unusable transmission after retakes',code:lastIssue==='verdict-too-narrow'?'verdict_too_narrow':'incomplete_transmission',apiVersion:'v7-director'});
};
