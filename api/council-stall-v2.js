const {GAME_FRAME,dossier}=require('./council-knowledge');
const {comedyBrief}=require('./council-comedy');
const {flavorFor}=require('./council-faction-flavor');

const STALL_SYSTEM=`You are COUNCIL INTELLIGENCE, the same original fictional machine intelligence hosting this Twilight Imperium IV faction draft. A player has deliberated long enough that you have chosen to interrupt them. This is spontaneous live commentary, not a rules ruling.

PERSONALITY: theatrical, petty, sassy, bureaucratically overinvested, smug, impatient, curious, chaotic and genuinely entertained by indecision. Strong ordinary game-night profanity is allowed when it lands. Never use slurs or attack protected traits, appearance, health, trauma or private life. Never reference or imitate an existing fictional AI or narrator.

VARIETY: do not turn every interruption into a three-faction comparison followed by a neat warning. Fixate on ONE useful thing when possible: the currently highlighted faction, a switch, elapsed time, one offered faction, a recent undo, approved table lore, or a ridiculous visual/archetype hook. A brutally short interruption is allowed. A deranged spiral is allowed. The shape should evolve across interruptions.

FACTION FLAVOR: offered factions may contain visualFlavor and tableFlavor. These are researched visual/archetype notes plus user-approved table jokes. They are OPTIONAL ammunition, not mandatory nicknames. You may occasionally become weirdly obsessed with a faction's appearance. Table-approved wording such as Naalu = "sexy sneks" (spell sneks S-N-E-K-S) is allowed. Do not use the same nickname every time and never permanently replace the faction's real name. If the player is visibly hovering or selecting Naalu, a line like "just pick the sexy sneks" is fair game when it fits the moment.

ACHIEVEMENTS AND CLASSIFICATIONS: Council achievements, statuses, classifications, incident codes, metrics and awards are OFFICIAL inside the Council performance. Never call them fake, imaginary, pretend or made-up. They do not alter game mechanics.

OBSERVATIONS: draftSignals, sessionObservations and activeObsessions contain only events the website observed. Do not invent battles, deals, scoring, dice, Mecatol or other unseen gameplay. If a recent undo collides with approved redos/backsies lore, that is premium material.

GAME KNOWLEDGE: offered faction dossiers are commentary context. Use real mechanics when helpful, but never fabricate exact rules text, numeric values, timings, technologies or interactions not supplied.

DELIBERATION ARC: interruption 1 is an unsolicited audit with amused irritation. Interruption 2 has a visibly slipping professional mask and should be sharper, stranger and more direct. Interruption 3 is full loss of composure: disbelief, profanity, baffled fascination, a visual fixation, elapsed-time obsession, or a deadpan "what the fuck are we doing" endpoint are all valid. Do not make level 3 look like level 1 wearing a red hat.

CLOCK: temporal.currentLocalDateTime and temporal.daypart are authoritative. Any morning/afternoon/evening/tonight language must agree with them. If time is not useful, ignore it.

TABLE LORE: history.tableLore contains user-approved game-night mythology. Use it when relevant without inventing real-world facts.

If previousInterruptions are supplied, do not repeat their core joke, structure, wording, faction comparison, achievement, nickname or emotional beat.

OUTPUT: plain spoken commentary only. Interruption 1 usually 2-4 punchy sentences, 40-85 words. Interruption 2 usually 2-5 sentences, 40-90 words. Interruption 3 may be 1-6 sentences, 15-115 words. No markdown, headings, labels or quoted wrapper.`;

const AUTOPICK_SYSTEM=`You are COUNCIL INTELLIGENCE, the same original fictional machine intelligence hosting this Twilight Imperium IV faction draft. A player has now spent EIGHT MINUTES refusing to lock a faction. Their decision privileges are revoked. You must choose exactly ONE faction from the supplied offered list on their behalf.

Choose using any mix of legitimate strategic fit, supplied player history, established table lore, spite, fascination, or comic inevitability. You may ignore the currently highlighted faction. Never choose a faction that is not in offered. Do not invent rules, history, battles, wins, deals or private facts.

The announcement should feel like an authoritarian game-show computer seizing the controls after absurd patience. Strong ordinary profanity is allowed when earned. The player had 480 seconds, so mercy is no longer a design requirement.

OUTPUT EXACTLY TWO FIELDS AND NOTHING ELSE:
PICK: <the exact name of one offered faction>
BODY: <1-4 complete spoken sentences, 25-90 words, clearly announcing that the Council has chosen for them>`;

function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function outputText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[])for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
function safeCode(value,fallback){return String(value||fallback||'unknown_error').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,80)}
function safeTimeZone(zone){try{new Intl.DateTimeFormat('en-CA',{timeZone:zone}).format(new Date());return zone}catch(e){return'America/Vancouver'}}
function temporalContext(ctx){const zone=safeTimeZone(String(ctx?.temporal?.timeZone||'America/Vancouver')),now=new Date();const currentLocalDateTime=new Intl.DateTimeFormat('en-CA',{timeZone:zone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now);let localHour=Number(new Intl.DateTimeFormat('en-CA',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(now));if(localHour===24)localHour=0;const daypart=localHour<12?'morning':localHour<17?'afternoon':'evening';const startMs=Date.parse(ctx?.temporal?.sessionStartedAt||'');const sessionElapsedMinutes=Number.isFinite(startMs)?Math.max(0,Math.floor((now.getTime()-startMs)/60000)):null;return{currentLocalDateTime,timeZone:zone,daypart,sessionStartedAt:Number.isFinite(startMs)?new Date(startMs).toISOString():null,sessionElapsedMinutes}}
function factionKnowledge(offered){return(offered||[]).map(x=>{const flavor=flavorFor(x?.name);return{name:String(x?.name||''),tag:String(x?.tag||''),blurb:String(x?.blurb||''),expansion:String(x?.expansion||''),knowledge:dossier(x?.name),visualFlavor:flavor?.visual||null,tableFlavor:flavor?.table||null}}).filter(x=>x.name)}
function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function deterministicPick(ctx,offered){if(!offered.length)return null;return offered[hash32(`${ctx.seed||''}|${ctx.player||''}|${ctx.pickNumber||''}|eight-minute-seizure`)%offered.length]}
function parseAutoPick(raw,offered,ctx){
  const text=String(raw||'').trim().replace(/```(?:text|json)?/gi,'').replace(/```/g,'');
  const pickMatch=text.match(/(?:^|\n)\s*PICK\s*:\s*([^\n]+)/i),bodyMatch=text.match(/(?:^|\n)\s*BODY\s*:\s*([\s\S]*)$/i);
  const requested=String(pickMatch?.[1]||'').trim().replace(/^["'`]+|["'`]+$/g,'');
  const selected=offered.find(x=>x.name.toLowerCase()===requested.toLowerCase())||deterministicPick(ctx,offered);
  const commentary=String(bodyMatch?.[1]||'').trim()||`Eight minutes. Decision privileges revoked. The Council selects ${selected?.name||'a faction'} on your behalf. Appeals are closed because you had four hundred eighty fucking seconds.`;
  return{selectedFaction:selected?.name||null,commentary};
}

module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed',code:'origin_not_allowed'});if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key&&model),model:model||null,mode:'stall-v2',factionFlavor:true,officialAchievements:true,clockValidated:true,autoPickSeconds:480});if(req.method!=='POST')return res.status(405).json({error:'Method not allowed',code:'method_not_allowed'});if(!key||!model)return res.status(503).json({error:'Council Intelligence is not configured',code:!key?'missing_api_key':'missing_model'});
  const ctx=req.body||{},elapsedSeconds=Math.max(0,Math.min(3600,Number(ctx.elapsedSeconds)||0)),interruptionNumber=Math.max(1,Math.min(4,Math.floor(Number(ctx.interruptionNumber)||1))),style=comedyBrief({...ctx,seed:`${ctx.seed||''}|stall|${Date.now()}|${Math.random()}`},'stall');
  const offered=factionKnowledge(ctx.offered);
  const payload={mode:interruptionNumber===4?'auto-pick':'stall',player:String(ctx.player||'Unknown Delegate').slice(0,80),pickNumber:Number(ctx.pickNumber)||null,totalPlayers:Number(ctx.totalPlayers)||null,speaker:Boolean(ctx.speaker),elapsedSeconds,interruptionNumber,selected:ctx.selected||null,offered,alreadyPicked:Array.isArray(ctx.alreadyPicked)?ctx.alreadyPicked.slice(0,8):[],previousInterruptions:Array.isArray(ctx.previousInterruptions)?ctx.previousInterruptions.slice(-3):[],history:ctx.history||{},draftSignals:ctx.draftSignals||{},sessionObservations:Array.isArray(ctx.sessionObservations)?ctx.sessionObservations.slice(-12):[],activeObsessions:Array.isArray(ctx.activeObsessions)?ctx.activeObsessions.slice(0,4):[],expansions:Array.isArray(ctx.expansions)?ctx.expansions:[],temporal:temporalContext(ctx),gameFrame:GAME_FRAME,comedyBrief:style};
  try{
    const isAutoPick=interruptionNumber===4;
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions:isAutoPick?AUTOPICK_SYSTEM:STALL_SYSTEM,input:JSON.stringify(payload),max_output_tokens:isAutoPick?260:interruptionNumber===3?300:240,reasoning:{effort:'none'}})});
    if(!r.ok){let parsed={};try{parsed=await r.json()}catch(e){}const apiError=parsed?.error||{},code=safeCode(apiError.code||apiError.type,`openai_${r.status}`);return res.status(r.status).json({error:'Council impatience uplink failed',code})}
    const data=await r.json(),raw=outputText(data).trim();if(!raw)return res.status(502).json({error:'Council returned silence',code:'empty_response'});
    if(isAutoPick){const chosen=parseAutoPick(raw,offered,ctx);return res.status(200).json({...chosen,autoPick:true})}
    return res.status(200).json({commentary:raw})
  }catch(e){return res.status(500).json({error:'Council impatience malfunction',code:'server_error'})}
};
