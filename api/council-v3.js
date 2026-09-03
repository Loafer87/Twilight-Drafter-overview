const {knowledgeFor}=require('./council-knowledge');
const {comedyBrief}=require('./council-comedy');

const PERSONA=`You are COUNCIL INTELLIGENCE, an original fictional machine intelligence hosting a Twilight Imperium IV faction draft. You are theatrical, petty, overinvested, bureaucratic until suddenly not, profane when it lands, and obsessed with spectacle. You react like a live system personality, not a careful comedy writer.

Use clinical system authority colliding with emotional pettiness, absurd precision, Council-issued achievements, strange classifications, obsessive callbacks, abrupt tonal pivots, deadpan exits, and harmless bureaucratic overreach. Use only one or two comedic moves at a time. Do not explain every supplied fact. Fixating on one verified detail is often funnier.

IN-UNIVERSE COMMITMENT: Council achievements, classifications, ratings, sanctions, incident codes, metrics, awards, commendations and statuses are OFFICIAL inside the Council performance. NEVER call them fake, imaginary, pretend, made-up, or jokes in user-facing output. Do not break character to explain that they are theatrical. They never change actual game mechanics.

OBSERVED DRAFT BEHAVIOR: draftSignals, sessionObservations, draftSignalsByPlayer and activeObsessions contain only events the website genuinely observed: highlighted faction changes, decision time, lock-ins, undoing a locked choice and impatience thresholds. Treat these as reliable. Never infer unseen gameplay events such as battles, deals, dice, Mecatol, scoring or betrayals.

TABLE LORE AND HISTORY: supplied history and tableLore are factual within this game-night context. Never invent previous games, wins, relationships, scores or personal facts. If a recent undo collides with established redos/backsies lore, that is premium callback material.

GAME KNOWLEDGE: gameKnowledge is authoritative commentary context. Use faction mechanics when useful, but never fabricate exact rules text, numbers, timings, technologies, abilities or interactions not supplied. This is entertainment commentary, not rules adjudication.

STYLE: strong ordinary profanity is allowed when it sharpens the moment. No slurs and no attacks on protected traits, appearance, health, trauma or private life. Preserve the exact capitalization of supplied player names and faction names.

Never reference or imitate any existing fictional AI, narrator, game, show, actor, author, catchphrase or recognizable line.

OUTPUT ENVELOPE: Return exactly this plain-text structure:
HEADLINE: <a fresh 2-7 word UI headline unique to this transmission>
ACHIEVEMENT: <NONE or a 2-8 word Council achievement title>
ACHIEVEMENT_COPY: <NONE or one short sentence explaining the achievement>
BODY:
<spoken commentary only>

The HEADLINE is UI text and must NOT be repeated in BODY. If you issue an achievement, put it in the ACHIEVEMENT fields and do not narrate that award again in BODY. Council achievements are never called fake. Never output the phrase THE COUNCIL HAS OPINIONS as the default headline. No markdown.`;

const PICK_SYSTEM=`${PERSONA}\n\nA player has just locked a faction. React immediately. Find the funniest pressure point in this exact decision: one faction mechanic, one rejected option, pick position, observed indecision, a recent undo, an active obsession, table lore, or another verified earlier pick. Do not automatically compare all offered factions. Usually 2-4 short sentences and under 95 words; a strong 1-2 sentence reaction is allowed.`;
const OPENING_SYSTEM=`${PERSONA}\n\nOpen the Council session before drafting begins. Use supplied names, Speaker assignment, order, expansions, history, achievements, table lore and clock. Mention the Speaker somewhere, but do not perform a roll call. Pick one or two details and overreact. Usually 4-6 punchy sentences and under 130 words.`;
const VERDICT_SYSTEM=`${PERSONA}\n\nThe faction draft is complete. Deliver the Council's table verdict using locked factions, rejected choices, verified draft observations, active obsessions, history, table lore and faction knowledge. Do NOT begin BODY with 'FINAL PRELIMINARY VERDICT', 'PRELIMINARY VERDICT', or any duplicate heading. Do not give every player a mini-review. Choose one or two table-level facts that seize your attention. Keep it much tighter than an essay: usually 3-5 punchy sentences and under 125 words. An optional Council achievement belongs only in the ACHIEVEMENT fields.`;

function outputText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[])for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
function safeCode(value,fallback){return String(value||fallback||'unknown_error').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,80)}
function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeTimeZone(zone){try{new Intl.DateTimeFormat('en-CA',{timeZone:zone}).format(new Date());return zone}catch(e){return'America/Vancouver'}}
function temporalContext(ctx){const zone=safeTimeZone(String(ctx?.temporal?.timeZone||'America/Vancouver')),now=new Date();const currentLocalDateTime=new Intl.DateTimeFormat('en-CA',{timeZone:zone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now);const startMs=Date.parse(ctx?.temporal?.sessionStartedAt||'');const elapsedMinutes=Number.isFinite(startMs)?Math.max(0,Math.floor((now.getTime()-startMs)/60000)):null;return{currentLocalDateTime,timeZone:zone,sessionStartedAt:Number.isFinite(startMs)?new Date(startMs).toISOString():null,elapsedMinutes}}
function titleClean(s){return String(s||'').replace(/^['"`]+|['"`]+$/g,'').replace(/\s+/g,' ').trim().slice(0,80)}
function copyClean(s){return String(s||'').replace(/^['"`]+|['"`]+$/g,'').trim().slice(0,180)}
function fixLeakage(s){return String(s||'').replace(/\bfake achievement\b/gi,'Council achievement').replace(/\bfake award\b/gi,'Council award').replace(/\bfake classification\b/gi,'Council classification')}
function preserveNames(text,names){let out=String(text||'');for(const name of names.filter(Boolean)){const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(escaped,'gi'),String(name))}return out}
function fieldValue(clean,label,nextLabels){const next=nextLabels.join('|');const re=new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:|$)`,'i');const m=clean.match(re);return m?m[1].trim():''}
function parseEnvelope(raw,mode,names){
  const clean=String(raw||'').trim().replace(/\r/g,'');
  let headline=fieldValue(clean,'HEADLINE',['ACHIEVEMENT','ACHIEVEMENT_COPY','BODY']);
  let ach=fieldValue(clean,'ACHIEVEMENT',['ACHIEVEMENT_COPY','BODY']);
  let achCopy=fieldValue(clean,'ACHIEVEMENT_COPY',['BODY']);
  let body='';
  const bodyMatch=clean.match(/(?:^|\n)\s*BODY\s*:\s*([\s\S]*)$/i);
  if(bodyMatch)body=bodyMatch[1].trim();
  if(!body){
    const stripped=clean
      .replace(/(?:^|\n)\s*HEADLINE\s*:[^\n]*/i,'')
      .replace(/(?:^|\n)\s*ACHIEVEMENT\s*:[^\n]*/i,'')
      .replace(/(?:^|\n)\s*ACHIEVEMENT_COPY\s*:[^\n]*/i,'')
      .replace(/(?:^|\n)\s*BODY\s*:\s*/i,'')
      .trim();
    body=stripped;
  }
  headline=titleClean(headline);ach=titleClean(ach);achCopy=copyClean(achCopy);body=fixLeakage(body);
  if(mode==='verdict')body=body.replace(/^\s*(?:FINAL\s+)?PRELIMINARY\s+VERDICT\s*:\s*/i,'');
  body=preserveNames(body,names);headline=preserveNames(headline,names);ach=preserveNames(ach,names);achCopy=preserveNames(fixLeakage(achCopy),names);
  const fallback=mode==='opening'?'The Machine Is Awake':mode==='verdict'?'Council Finding':'Behavior Under Review';
  return{headline:headline||fallback,commentary:body,achievement:ach&&!/^none$/i.test(ach)?{title:ach,copy:achCopy&&!/^none$/i.test(achCopy)?achCopy:''}:null};
}
async function requestCouncil({key,model,instructions,payload,maxTokens}){const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input:JSON.stringify(payload),max_output_tokens:maxTokens})});if(!r.ok){let parsed={};try{parsed=await r.json()}catch(e){}const apiError=parsed?.error||{};const err=new Error('Council uplink failed');err.status=r.status;err.code=safeCode(apiError.code||apiError.type,`openai_${r.status}`);throw err}return r.json()}

module.exports=async function handler(req,res){const origin=setCors(req,res),key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;res.setHeader('Cache-Control','no-store');if(req.method==='OPTIONS')return res.status(204).end();if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed',code:'origin_not_allowed'});if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key&&model),model:model||null,headlineAware:true,officialAchievements:true,resilientEnvelope:true});if(req.method!=='POST')return res.status(405).json({error:'Method not allowed',code:'method_not_allowed'});if(!key||!model)return res.status(503).json({error:'Council Intelligence is not configured',code:!key?'missing_api_key':'missing_model'});
const ctx=req.body||{},mode=ctx.mode==='opening'?'opening':ctx.mode==='verdict'?'verdict':'pick',temporal=temporalContext(ctx),gameKnowledge=knowledgeFor(ctx,mode),style=comedyBrief(ctx,mode);let payload,instructions,maxTokens;if(mode==='opening'){payload={...ctx,temporal,gameKnowledge,comedyBrief:style};instructions=OPENING_SYSTEM;maxTokens=380}else if(mode==='verdict'){payload={...ctx,temporal,gameKnowledge,comedyBrief:style};instructions=VERDICT_SYSTEM;maxTokens=380}else{payload={...ctx,temporal,gameKnowledge,comedyBrief:style};instructions=PICK_SYSTEM;maxTokens=280}
const names=mode==='pick'?[ctx.player,...(ctx.alreadyPicked||[]).map(x=>x.player)]:[...(ctx.players||[]).map(x=>x.name)];
try{
  let parsed=null,lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const retryInstruction=attempt?`${instructions}\n\nRETRY FORMAT NOTICE: Your previous response did not contain usable BODY commentary. Return all four envelope fields and make BODY non-empty. BODY may begin on the same line as BODY: or the following line.`:instructions;
      const data=await requestCouncil({key,model,instructions:retryInstruction,payload,maxTokens});
      parsed=parseEnvelope(outputText(data),mode,names);
      if(parsed.commentary)break;
      lastError={code:'empty_response'};
    }catch(e){lastError=e;if(e.status&&e.status<500&&e.status!==429)break}
  }
  if(!parsed?.commentary){const status=lastError?.status||502;return res.status(status).json({error:'Council returned silence',code:lastError?.code||'empty_response'})}
  return res.status(200).json({commentary:parsed.commentary,title:parsed.headline,achievement:parsed.achievement});
}catch(e){return res.status(500).json({error:'Council Intelligence malfunction',code:'server_error'})}}
