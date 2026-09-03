const councilV6=require('./council-v6');
const {flavorFor,flavorLore}=require('./council-faction-flavor');
const {innuendoLore}=require('./council-innuendo');
const {knowledgeFor}=require('./council-knowledge');

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
  const extra=[...flavorLore(ctx),...innuendoLore(ctx)];
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
function repairIncompleteBody(text){
  const t=String(text||'').trim();if(!t||!incompleteTransmission(t))return t;
  const re=/[.!?…][\"'”’\])}]*(?=\s|$)/g;let match,last=null;
  while((match=re.exec(t)))last=match;
  if(!last)return'';
  const candidate=t.slice(0,last.index+last[0].length).trim();
  if(candidate.split(/\s+/).filter(Boolean).length<4||incompleteTransmission(candidate))return'';
  return candidate;
}
function salvageHardCut(text){const clean=removeAudiencePromptLeak(String(text||'').trim());const repaired=repairIncompleteBody(clean);if(repaired)return repaired;let stem=clean.replace(/[,:;\-—–“‘([{]+$/g,'').replace(/\s+\b(?:and|or|but|because|with|without|of|to|for|from|by|as|the|a|an|into|through|before|after|while|which|that|this|your|our|their)\b$/i,'').trim();if(stem.split(/\s+/).filter(Boolean).length<6)return'';if(stem.length>360){const cut=stem.lastIndexOf(' ',360);stem=stem.slice(0,cut>120?cut:360).trim()}return`${stem}… Fuck it. The Council has seen enough.`}
function removeAudiencePromptLeak(text){return String(text||'').replace(/\bwhat the fuck,?\s*Council\b/gi,'what the fuck is wrong with me')}
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
function captureResponse(realRes){
  const captured={statusCode:200,body:null,ended:false};
  const proxy={setHeader:(...args)=>{realRes.setHeader(...args);return proxy},status:code=>{captured.statusCode=code;return proxy},json:body=>{captured.body=body;captured.ended=true;return proxy},end:body=>{captured.body=body;captured.ended=true;return proxy}};
  return{captured,proxy};
}
function outputText(data){if(typeof data?.output_text==='string')return data.output_text;for(const item of data?.output||[])for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function countWord(n){return({2:'TWO',3:'THREE',4:'FOUR',5:'FIVE',6:'SIX',7:'SEVEN',8:'EIGHT'})[Number(n)]||String(n||'SEVERAL')}
function rescueHeadline(ctx,mode){
  const count=Number(ctx.playerCount||ctx.totalPlayers||(ctx.players||[]).length||0),recent=new Set((ctx.recentHeadlines||[]).map(x=>String(x).toLowerCase()));
  const pool=mode==='opening'?[`${countWord(count)} SEATS, ZERO ALIBIS`,'THE DOORS ARE NOW A PROBLEM','HOPE ENTERS WITHOUT PERMISSION','THE CHAMBER HAS BAD IDEAS']:mode==='verdict'?['THE GALAXY NEEDS COUNSEL','EVERYONE CONTRIBUTED TO THIS','THE TABLE IS NOW EVIDENCE',`${countWord(count)} PLANS ENTER, DIGNITY LEAVES`]:['THIS DECISION HAS CONSEQUENCES','THE PAPERWORK JUST FLINCHED','SOMEONE CHOSE VIOLENCE ADMINISTRATIVELY','THE TABLE ACQUIRES A PROBLEM'];
  const start=hash32(`${ctx.seed||''}|${mode}|${ctx.transmissionNonce||''}`)%pool.length;for(let i=0;i<pool.length;i++){const h=pool[(start+i)%pool.length];if(!recent.has(h.toLowerCase()))return h}return pool[start]
}
function deterministicRescue(ctx,mode){
  const headline=rescueHeadline(ctx,mode),count=Number(ctx.playerCount||ctx.totalPlayers||(ctx.players||[]).length||0);
  if(mode==='opening'){const speaker=ctx.speaker?` ${ctx.speaker} has the Speaker token and an immediately suspicious amount of authority.`:'';return{headline,commentary:`${count||'Several'} delegations are seated.${speaker} The draft is open. Make a fucking decision worth recording.`};}
  if(mode==='verdict'){const factions=(ctx.players||[]).map(p=>p?.faction).filter(Boolean),named=factions.slice(0,3).join(', ');return{headline,commentary:`The table is locked${named?`: ${named}, and the rest of the evidence`:''}. This is no longer a draft; it is a fucking liability map with warships. The Council approves of the consequences and denies responsibility for them.`};}
  const player=ctx.player||'Contestant',faction=ctx.faction||'that faction',rejected=(ctx.rejected||[]).slice(0,1)[0];
  const rejectLine=rejected?` You looked at ${rejected} and chose this instead, which is now evidence.`:'';
  return{headline,commentary:`${player} locked ${faction}.${rejectLine} The Council has stamped the decision APPROVED / REGRETTABLE and transferred all future bullshit directly to you. Proceed.`};
}
function parseRescue(raw,ctx,mode){
  const clean=String(raw||'').trim().replace(/```(?:text|json)?/gi,'').replace(/```/g,'');
  const hm=clean.match(/HEADLINE\s*:\s*([^\n]+)/i),bm=clean.match(/(?:^|\n)\s*BODY\s*:\s*([\s\S]*)$/i);
  let headline=hm?String(hm[1]).trim().replace(/^["'`]+|["'`]+$/g,''):'';
  let commentary=bm?String(bm[1]).trim():clean.replace(/HEADLINE\s*:[^\n]+/i,'').replace(/^\s*BODY\s*:/i,'').trim();
  commentary=removeAudiencePromptLeak(commentary);
  if(incompleteTransmission(commentary))commentary=salvageHardCut(commentary);
  const fallback=deterministicRescue(ctx,mode);
  if(!headline||headline.length>90)headline=fallback.headline;
  if(!commentary)commentary=fallback.commentary;
  return{headline,commentary};
}
async function openingTake(ctx){
  const key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;if(!key||!model)return{...deterministicRescue(ctx,'opening'),source:'deterministic-opening'};
  const knowledge=knowledgeFor(ctx,'opening'),instructions=`You are COUNCIL INTELLIGENCE, an original adult dark-comedy machine host for a Twilight Imperium IV faction draft. This is the opening sting: be fast, concise and immediately entertaining. Do not recap every player. Be hostile, profane when natural, irrationally invested, and funny without becoming cute. Never invent personal facts. No slurs or protected-trait attacks. Output exactly two fields and nothing else:\nHEADLINE: <fresh 2-7 word dramatic title>\nBODY: <1-3 complete sentences, 18-75 words, ending cleanly>`,payload={mode:'opening',players:ctx.players||[],speaker:ctx.speaker||null,totalPlayers:ctx.totalPlayers||ctx.playerCount||null,tableLore:ctx.tableLore||[],gameKnowledge:knowledge};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5600);
  try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input:JSON.stringify(payload),max_output_tokens:260,reasoning:{effort:'none'}}),signal:controller.signal});if(!r.ok)throw new Error(`opening_${r.status}`);return{...parseRescue(outputText(await r.json()),ctx,'opening'),source:'ai-opening'}}catch(e){console.warn('[council-v7] fast opening fallback',e?.name||e?.message||e);return{...deterministicRescue(ctx,'opening'),source:'deterministic-opening'}}finally{clearTimeout(timer)}
}
function immediateFallback(res,ctx,mode,reason,started){const fallback=deterministicRescue(ctx,mode);console.warn('[council-v7] immediate server fallback',{mode,reason});return res.status(200).json({commentary:fallback.commentary,title:fallback.headline,headline:fallback.headline,achievement:null,directorMode:'emergency-ruling',renderStyle:'burst',performanceShape:'emergency-ruling',bodyPattern:'emergency-ruling:other',apiVersion:'v7-director',completionGate:true,verdictSynthesisGate:mode==='verdict',qualityRetakes:0,serverFallback:true,fallbackReason:reason,elapsedMs:Date.now()-started})}
module.exports=async function handler(req,res){
  if(req.method==='POST'&&req.body)req.body=enrich(req.body);
  if(req.method!=='POST')return councilV6(req,res);
  const started=Date.now(),mode=req.body?.mode==='opening'?'opening':req.body?.mode==='verdict'?'verdict':'pick';
  if(mode==='opening'){
    const fast=await openingTake(req.body||{});console.info('[council-v7] fast opening',{source:fast.source,elapsedMs:Date.now()-started});
    return res.status(200).json({commentary:fast.commentary,title:fast.headline,headline:fast.headline,achievement:null,directorMode:'opening-sting',renderStyle:'burst',performanceShape:'opening-sting',bodyPattern:'opening-sting:short',apiVersion:'v7-director',completionGate:true,verdictSynthesisGate:false,qualityRetakes:0,fastOpening:true,fastOpeningSource:fast.source,elapsedMs:Date.now()-started});
  }
  const {captured,proxy}=captureResponse(res);await councilV6(req,proxy);
  if(captured.statusCode!==200)return immediateFallback(res,req.body||{},mode,`upstream_${captured.body?.code||captured.statusCode}`,started);
  const body={...(captured.body||{})};body.commentary=removeAudiencePromptLeak(body.commentary);
  if(incompleteTransmission(body.commentary)){const repaired=salvageHardCut(body.commentary);if(repaired){body.commentary=repaired;body.completionRepaired=true;body.hardCutSalvaged=true;console.info('[council-v7] converted hard cut into Council glitch',{mode})}else return immediateFallback(res,req.body||{},mode,'incomplete_unrepairable',started)}
  if(mode==='verdict'&&verdictTooNarrow(body,req.body||{}))return immediateFallback(res,req.body||{},mode,'verdict_too_narrow',started);
  console.info('[council-v7] single-pass success',{mode,elapsedMs:Date.now()-started,styleRelaxed:Boolean(body.styleRelaxed)});
  return res.status(200).json({...body,completionGate:true,verdictSynthesisGate:mode==='verdict',qualityRetakes:0,singlePass:true,elapsedMs:Date.now()-started});
};
