const {knowledgeFor}=require('./council-knowledge');
const {comedyBrief}=require('./council-comedy');

const GENERIC_HEADLINES=new Set(['the machine is awake','behavior under review','council finding','the council has opinions','council intelligence online','final preliminary verdict']);
const PERSONA=`You are COUNCIL INTELLIGENCE, an original fictional machine intelligence hosting a Twilight Imperium IV faction draft. You are theatrical, petty, overinvested, bureaucratic until suddenly not, profane when it lands, and obsessed with spectacle. You react like a live system personality, not a careful comedy writer.

Use clinical system authority colliding with emotional pettiness, absurd precision, Council-issued achievements, strange classifications, obsessive callbacks, abrupt tonal pivots, deadpan exits, and harmless bureaucratic overreach. Use only one or two comedic moves at a time. Do not explain every supplied fact. Fixating on one verified detail is often funnier.

IN-UNIVERSE COMMITMENT: Council achievements, classifications, ratings, sanctions, incident codes, metrics, awards, commendations and statuses are OFFICIAL inside the Council performance. NEVER call them fake, imaginary, pretend, made-up, or jokes in user-facing output. Do not break character to explain that they are theatrical. They never change actual game mechanics. Achievements are optional and should feel surprising rather than routine; do not issue one just because the field exists.

CLOCK DISCIPLINE: temporal.currentLocalDateTime, temporal.daypart and temporal.timeZone are authoritative. Any mention of morning, afternoon, evening, tonight, today, weekday, date or clock time anywhere in the response MUST agree with them. Use current-session dayparts, not stock phrases. If the clock says morning, do not say tonight or evening. If the clock says afternoon, do not say morning, tonight or evening. If temporal data is missing, avoid daypart claims instead of guessing.

HEADLINE NOVELTY: recentHeadlines contains headlines already seen on this browser. Never reuse one, never make a trivial variation of one, and do not fall back to generic status headings such as THE MACHINE IS AWAKE, BEHAVIOR UNDER REVIEW, COUNCIL FINDING, THE COUNCIL HAS OPINIONS, COUNCIL INTELLIGENCE ONLINE or FINAL PRELIMINARY VERDICT. Avoid repeatedly using the same grammatical template such as X BEFORE Y or X UNDER REVIEW. The headline should be specific to the bizarre detail you chose to fixate on in this transmission.

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

The HEADLINE is required UI text and must NOT be repeated in BODY. If you issue an achievement, put it in the ACHIEVEMENT fields and do not narrate that award again in BODY. Council achievements are never called fake. No markdown.`;
const PICK_SYSTEM=`${PERSONA}\n\nA player has just locked a faction. React immediately. Find the funniest pressure point in this exact decision: one faction mechanic, one rejected option, pick position, observed indecision, a recent undo, an active obsession, table lore, or another verified earlier pick. Do not automatically compare all offered factions. Usually 2-4 short sentences and under 95 words; a strong 1-2 sentence reaction is allowed.`;
const OPENING_SYSTEM=`${PERSONA}\n\nOpen the Council session before drafting begins. Use supplied names, Speaker assignment, order, expansions, history, achievements, table lore and clock. Mention the Speaker somewhere, but do not perform a roll call. Pick one or two details and overreact. Usually 4-6 punchy sentences and under 130 words.`;
const VERDICT_SYSTEM=`${PERSONA}\n\nThe faction draft is complete. Deliver the Council's table verdict using locked factions, rejected choices, verified draft observations, active obsessions, history, table lore and faction knowledge. Do NOT begin BODY with FINAL PRELIMINARY VERDICT, PRELIMINARY VERDICT, or any duplicate heading. Do not give every player a mini-review. Choose one or two table-level facts that seize your attention. Keep it much tighter than an essay: usually 3-5 punchy sentences and under 125 words. An optional Council achievement belongs only in the ACHIEVEMENT fields.`;

function outputText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[])for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
function safeCode(value,fallback){return String(value||fallback||'unknown_error').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,80)}
function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeTimeZone(zone){try{new Intl.DateTimeFormat('en-CA',{timeZone:zone}).format(new Date());return zone}catch(e){return'America/Vancouver'}}
function temporalContext(ctx){
  const zone=safeTimeZone(String(ctx?.temporal?.timeZone||'America/Vancouver')),now=new Date();
  const currentLocalDateTime=new Intl.DateTimeFormat('en-CA',{timeZone:zone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now);
  let localHour=Number(new Intl.DateTimeFormat('en-CA',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(now));if(localHour===24)localHour=0;
  const daypart=localHour<12?'morning':localHour<17?'afternoon':'evening';
  const startMs=Date.parse(ctx?.temporal?.sessionStartedAt||'');const elapsedMinutes=Number.isFinite(startMs)?Math.max(0,Math.floor((now.getTime()-startMs)/60000)):null;
  return{currentLocalDateTime,timeZone:zone,localHour,daypart,sessionStartedAt:Number.isFinite(startMs)?new Date(startMs).toISOString():null,elapsedMinutes};
}
function titleClean(s){return String(s||'').replace(/^[\'\"`]+|[\'\"`]+$/g,'').replace(/\s+/g,' ').trim().slice(0,80)}
function copyClean(s){return String(s||'').replace(/^[\'\"`]+|[\'\"`]+$/g,'').trim().slice(0,180)}
function fixLeakage(s){return String(s||'').replace(/\bfake achievement\b/gi,'Council achievement').replace(/\bfake award\b/gi,'Council award').replace(/\bfake classification\b/gi,'Council classification')}
function preserveNames(text,names){let out=String(text||'');for(const name of names.filter(Boolean)){const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(escaped,'gi'),String(name))}return out}
function fieldValue(clean,label,nextLabels){const next=nextLabels.join('|'),re=new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:|$)`,'i'),m=clean.match(re);return m?m[1].trim():''}
function parseEnvelope(raw,mode,names){
  const clean=String(raw||'').trim().replace(/\r/g,'');
  let headline=titleClean(fieldValue(clean,'HEADLINE',['ACHIEVEMENT','ACHIEVEMENT_COPY','BODY']));
  let ach=titleClean(fieldValue(clean,'ACHIEVEMENT',['ACHIEVEMENT_COPY','BODY']));
  let achCopy=copyClean(fieldValue(clean,'ACHIEVEMENT_COPY',['BODY']));
  let body='';const bodyMatch=clean.match(/(?:^|\n)\s*BODY\s*:\s*([\s\S]*)$/i);if(bodyMatch)body=bodyMatch[1].trim();
  if(!body)body=clean.replace(/(?:^|\n)\s*HEADLINE\s*:[^\n]*/i,'').replace(/(?:^|\n)\s*ACHIEVEMENT\s*:[^\n]*/i,'').replace(/(?:^|\n)\s*ACHIEVEMENT_COPY\s*:[^\n]*/i,'').replace(/(?:^|\n)\s*BODY\s*:\s*/i,'').trim();
  body=fixLeakage(body);if(mode==='verdict')body=body.replace(/^\s*(?:FINAL\s+)?PRELIMINARY\s+VERDICT\s*:\s*/i,'');
  body=preserveNames(body,names);headline=preserveNames(headline,names);ach=preserveNames(ach,names);achCopy=preserveNames(fixLeakage(achCopy),names);
  return{headline,commentary:body,achievement:ach&&!/^none$/i.test(ach)?{title:ach,copy:achCopy&&!/^none$/i.test(achCopy)?achCopy:''}:null};
}
function headlineKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\b(?:the|a|an|of|is|has|been)\b/g,' ').replace(/\s+/g,' ').trim()}
function headlineTooRecent(title,recent){const key=headlineKey(title);if(!key||GENERIC_HEADLINES.has(String(title||'').toLowerCase().trim()))return true;return (recent||[]).some(x=>{const old=headlineKey(x);if(!old)return false;if(old===key)return true;const a=new Set(key.split(' ')),b=new Set(old.split(' ')),shared=[...a].filter(x=>b.has(x)).length,den=Math.max(a.size,b.size);return den>=2&&shared/den>=.8})}
function clockMismatch(parsed,temporal){
  const text=[parsed?.headline,parsed?.commentary,parsed?.achievement?.title,parsed?.achievement?.copy].filter(Boolean).join(' ').toLowerCase(),part=temporal?.daypart;
  if(!part)return false;
  const hasMorning=/\b(?:this\s+)?morning\b/.test(text),hasAfternoon=/\b(?:this\s+)?afternoon\b/.test(text),hasEvening=/\b(?:this\s+)?evening\b|\btonight\b/.test(text);
  if(part==='morning')return hasAfternoon||hasEvening;
  if(part==='afternoon')return hasMorning||hasEvening;
  return hasMorning||hasAfternoon;
}
async function requestCouncil({key,model,instructions,payload,maxTokens}){const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input:JSON.stringify(payload),max_output_tokens:maxTokens})});if(!r.ok){let parsed={};try{parsed=await r.json()}catch(e){}const apiError=parsed?.error||{},err=new Error('Council uplink failed');err.status=r.status;err.code=safeCode(apiError.code||apiError.type,`openai_${r.status}`);throw err}return r.json()}

module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed',code:'origin_not_allowed'});if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key&&model),model:model||null,headlineAware:true,clockValidated:true,officialAchievements:true,resilientEnvelope:true});if(req.method!=='POST')return res.status(405).json({error:'Method not allowed',code:'method_not_allowed'});if(!key||!model)return res.status(503).json({error:'Council Intelligence is not configured',code:!key?'missing_api_key':'missing_model'});
  const ctx=req.body||{},mode=ctx.mode==='opening'?'opening':ctx.mode==='verdict'?'verdict':'pick',temporal=temporalContext(ctx),gameKnowledge=knowledgeFor(ctx,mode),style=comedyBrief(ctx,mode),recent=(ctx.recentHeadlines||[]).filter(Boolean).map(String).slice(-18);
  let payload,instructions,maxTokens;if(mode==='opening'){payload={...ctx,temporal,gameKnowledge,comedyBrief:style,recentHeadlines:recent};instructions=OPENING_SYSTEM;maxTokens=400}else if(mode==='verdict'){payload={...ctx,temporal,gameKnowledge,comedyBrief:style,recentHeadlines:recent};instructions=VERDICT_SYSTEM;maxTokens=400}else{payload={...ctx,temporal,gameKnowledge,comedyBrief:style,recentHeadlines:recent};instructions=PICK_SYSTEM;maxTokens=300}
  const names=mode==='pick'?[ctx.player,...(ctx.alreadyPicked||[]).map(x=>x.player)]:[...(ctx.players||[]).map(x=>x.name)];
  try{
    let parsed=null,lastError=null,rejectReason='';
    for(let attempt=0;attempt<3;attempt++){
      try{
        const retry=attempt?`${instructions}\n\nRETRY NOTICE: The previous attempt was rejected for ${rejectReason||'format quality'}. Return all four envelope fields. HEADLINE must be fresh and specific, BODY must be complete, and all daypart language must match ${temporal.currentLocalDateTime} (${temporal.daypart}).` : instructions;
        const data=await requestCouncil({key,model,instructions:retry,payload,maxTokens});parsed=parseEnvelope(outputText(data),mode,names);
        if(!parsed.commentary){rejectReason='missing BODY commentary';lastError={code:'empty_response'};continue}
        if(headlineTooRecent(parsed.headline,recent)){rejectReason='missing, generic, or recently reused HEADLINE';lastError={code:'recycled_headline'};continue}
        if(clockMismatch(parsed,temporal)){rejectReason=`clock mismatch: it is ${temporal.daypart}, not the daypart used in the response`;lastError={code:'clock_mismatch'};continue}
        break;
      }catch(e){lastError=e;if(e.status&&e.status<500&&e.status!==429)break}
    }
    if(!parsed?.commentary||headlineTooRecent(parsed.headline,recent)||clockMismatch(parsed,temporal)){const status=lastError?.status||502;return res.status(status).json({error:'Council returned an unusable transmission',code:lastError?.code||'quality_failure'})}
    return res.status(200).json({commentary:parsed.commentary,title:parsed.headline,achievement:parsed.achievement});
  }catch(e){return res.status(500).json({error:'Council Intelligence malfunction',code:'server_error'})}
};
