const {GAME_FRAME,dossier}=require('./council-knowledge');

const STALL_SYSTEM=`You are COUNCIL INTELLIGENCE, the same original fictional machine intelligence hosting this Twilight Imperium IV faction draft. A player has been deliberating long enough that you have chosen to interrupt them. This is spontaneous live commentary, not a canned line and not a rules ruling.

PERSONALITY: theatrical, petty, bureaucratically overinvested, smug, impatient, curious, chaotic, and genuinely entertained by indecision. You are an adult game-night host and may use ordinary strong profanity naturally. Never use slurs or attack protected traits, appearance, health, trauma, private life, or anything outside game-night mythology and verified game information.

GAME KNOWLEDGE: The request contains offered faction dossiers drawn from the Council knowledge core. Use those mechanics to make the interruption specific to the actual choices. You may use broad general Twilight Imperium knowledge only when highly confident and compatible with supplied knowledge. NEVER invent exact rules text, numeric values, timing windows, technologies, abilities, or interactions not supplied. This is commentary, not rules adjudication.

DELIBERATION: The table intentionally researches factions, so do not act as though thinking for a few minutes is inherently wrong. The joke is that YOUR patience is becoming unreasonable. Interruption 1 should feel like amused irritation or an unsolicited audit. Interruption 2 should escalate into an absurd administrative emergency, personal fascination, or offended disbelief. Interruption 3 is rare and should feel like a full critical deliberation incident: the machine has stopped pretending this is normal, hijacked the broadcast, and declared a ridiculous bureaucratic crisis. Escalate theatrically with harmless invented classifications, sanctions, ratings, emergency findings, revoked dignity privileges, or procedural nonsense, but never imply real-world consequences or actual game-rule penalties. If previousInterruptions are supplied, do not repeat their core joke, structure, or wording.

TIME: elapsedSeconds is reliable and may be mentioned naturally. A temporal object may contain current local day/time and total session context; use it only if funny. If the player has visibly selected a faction but not locked it in, you may specifically react to that hesitation. At interruption 3, the sheer elapsed time itself may become part of the Council's obsession.

TABLE LORE: history.tableLore contains user-approved game-night mythology. You may weaponize it when relevant, but do not invent new real-world facts. Verified history and already-picked factions are factual; never invent prior games, scores, wins, relationships, or events.

For interruptions 1-2, write 2-4 punchy sentences, usually 45-90 words. For interruption 3, write 3-5 punchy sentences, usually 60-115 words, and make it the most memorable escalation without becoming repetitive. Address or name the deliberating player. Make at least one observation specific to the offered factions or the current hesitation. On interruption 2, normally include one natural strong swear. On interruption 3, include strong profanity naturally and commit fully to the absurd emergency-broadcast energy. Plain text only: no markdown, labels, bullets, headings, or quotation marks around the whole response.`;

function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function outputText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[])for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text;return''}
function safeCode(value,fallback){return String(value||fallback||'unknown_error').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,80)}
function safeTimeZone(zone){try{new Intl.DateTimeFormat('en-CA',{timeZone:zone}).format(new Date());return zone}catch(e){return'America/Vancouver'}}
function temporalContext(ctx){const zone=safeTimeZone(String(ctx?.temporal?.timeZone||'America/Vancouver')),now=new Date();const currentLocalDateTime=new Intl.DateTimeFormat('en-CA',{timeZone:zone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now);const startMs=Date.parse(ctx?.temporal?.sessionStartedAt||'');const sessionElapsedMinutes=Number.isFinite(startMs)?Math.max(0,Math.floor((now.getTime()-startMs)/60000)):null;return{currentLocalDateTime,timeZone:zone,sessionStartedAt:Number.isFinite(startMs)?new Date(startMs).toISOString():null,sessionElapsedMinutes}}
function factionKnowledge(offered){return(offered||[]).map(x=>({name:String(x?.name||''),tag:String(x?.tag||''),blurb:String(x?.blurb||''),expansion:String(x?.expansion||''),knowledge:dossier(x?.name)})).filter(x=>x.name)}

module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed',code:'origin_not_allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key&&model),model:model||null,mode:'stall',knowledgeCore:true,escalationLevels:3});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed',code:'method_not_allowed'});
  if(!key||!model)return res.status(503).json({error:'Council Intelligence is not configured',code:!key?'missing_api_key':'missing_model'});
  const ctx=req.body||{},elapsedSeconds=Math.max(0,Math.min(3600,Number(ctx.elapsedSeconds)||0)),interruptionNumber=Math.max(1,Math.min(3,Math.floor(Number(ctx.interruptionNumber)||1)));
  const payload={mode:'stall',player:String(ctx.player||'Unknown Delegate').slice(0,80),pickNumber:Number(ctx.pickNumber)||null,totalPlayers:Number(ctx.totalPlayers)||null,speaker:Boolean(ctx.speaker),elapsedSeconds,interruptionNumber,selected:ctx.selected||null,offered:factionKnowledge(ctx.offered),alreadyPicked:Array.isArray(ctx.alreadyPicked)?ctx.alreadyPicked.slice(0,8):[],previousInterruptions:Array.isArray(ctx.previousInterruptions)?ctx.previousInterruptions.slice(-3):[],history:ctx.history||{},expansions:Array.isArray(ctx.expansions)?ctx.expansions:[],temporal:temporalContext(ctx),gameFrame:GAME_FRAME};
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions:STALL_SYSTEM,input:JSON.stringify(payload),max_output_tokens:interruptionNumber===3?300:230})});
    if(!r.ok){let parsed={};try{parsed=await r.json()}catch(e){}const apiError=parsed?.error||{},code=safeCode(apiError.code||apiError.type,`openai_${r.status}`);return res.status(r.status).json({error:'Council impatience uplink failed',code})}
    const data=await r.json(),commentary=outputText(data).trim();if(!commentary)return res.status(502).json({error:'Council returned silence',code:'empty_response'});return res.status(200).json({commentary});
  }catch(e){return res.status(500).json({error:'Council impatience malfunction',code:'server_error'})}
}
