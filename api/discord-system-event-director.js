function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

const SKILL_MODES=[
  {id:'mechanics-first',rule:'Begin like a dry game tooltip, state the skill name and level, then let the machine personality leak into the explanation before returning to a clean mechanical-style Effect line.'},
  {id:'obsessive-detail',rule:'Fixate far too intensely on one harmless verified detail from the incident. The fixation should become funny because the system clearly cares more than any sane referee would.'},
  {id:'false-instructional',rule:'Pretend this is a useful educational skill description while quietly turning the player’s recurring behavior into evidence against them.'},
  {id:'clinical-insult',rule:'Write the description with sterile technical confidence while describing obviously ridiculous friend-table behavior as though it is a measurable competency.'},
  {id:'reluctant-praise',rule:'The Council must admit the behavior is effective, but it resents having to acknowledge it. Praise the competency and insult the method.'},
  {id:'personal-fascination',rule:'The Council has developed a weirdly specific fascination with this skill. Keep it non-graphic and based only on supplied game-night evidence.'}
];

const STATUS_MODES=[
  {id:'diagnostic',rule:'Treat the behavior like a newly detected condition. Diagnose the problem with absurd confidence and provide a concise game-night Effect.'},
  {id:'bureaucratic-curse',rule:'The Council declares that the incident has created an official but ridiculous temporary condition or designation.'},
  {id:'threat-assessment',rule:'Frame the status as a warning to the rest of the table about what this player is currently becoming.'},
  {id:'self-inflicted',rule:'Make clear that the player personally caused this status through their own decision, argument, greed, paranoia or ambition.'},
  {id:'contagious',rule:'Treat a phrase, meme, strategy or bad habit as though it is spreading through the table. Do not use medical claims; this is purely fictional game-night contamination.'}
];

function evidenceScore(text){
  const t=String(text||'').toLowerCase();
  let score=0;
  const patterns=[
    /\b(?:again|another|always|still|every time|keeps?|repeated|multiple|habit|known for)\b/,
    /\b(?:trade good|commodit|hoard|pillage|mentak|ally|deal|meme|organizer|organiser)\b/,
    /\b(?:mulligan|backsies|wetty\s+dredd|i.?m just a plant|i.?m just a girl|banana|coffee)\b/,
    /\b(?:claim|planet|grudge|revenge|attack|betray|charm|sneak|rules?|turn order|keep.*track)\b/,
    /\b(?:war sun|dreadnought|mecatol|wormhole|fleet|objective|speaker|strategy card)\b/
  ];
  for(const re of patterns)if(re.test(t))score+=7;
  return Math.min(35,score);
}

function eventPlan(input={},achievementEnabled=false){
  const evidence=[input.message,...(input.recentMessages||[]).map(x=>x?.content)].filter(Boolean).join(' ');
  const key=`${input.guildId||''}|${input.channelId||''}|${input.interactionId||''}|${input.command||''}|${input.invoker||''}|${input.target||''}|${input.message||''}`;
  if(achievementEnabled)return{enabled:false,type:'none',chance:0,roll:100,mode:null,level:null};
  const base=input.command==='grievance'?24:input.command==='accuse'?20:18;
  const chance=Math.min(58,base+evidenceScore(evidence));
  const roll=hash32(`${key}|system-event-roll`)%100;
  const enabled=input.forceSystemEvent===true||roll<chance;
  const typeRoll=hash32(`${key}|system-event-type`)%100;
  const recurring=/\b(?:again|always|still|every time|multiple|habit|known for|hoard|mulligan|backsies|wetty\s+dredd|i.?m just a plant|i.?m just a girl)\b/i.test(evidence);
  const forcedType=/^(skill|status)$/i.test(String(input.forceSystemType||''))?String(input.forceSystemType).toLowerCase():null;
  const type=forcedType||(typeRoll<(recurring?72:56)?'skill':'status');
  const modes=type==='skill'?SKILL_MODES:STATUS_MODES;
  const mode=modes[hash32(`${key}|system-event-mode`)%modes.length];
  const level=type==='skill'?2+(hash32(`${key}|skill-level`)%8):null;
  return{enabled,type:enabled?type:'none',chance,roll,mode,level};
}

function systemEventDirective(input={},achievementEnabled=false){
  const plan=eventPlan(input,achievementEnabled);
  if(!plan.enabled)return{plan,instruction:'DISCORD SYSTEM EVENT DIRECTOR: No Skill or Status notification this interaction. Output NONE for SYSTEM_EVENT, SYSTEM_TITLE, SYSTEM_LEVEL, SYSTEM_COPY, SYSTEM_EFFECT and SYSTEM_DURATION. Do not sneak one into BODY.'};
  if(plan.type==='skill')return{plan,instruction:`DISCORD SYSTEM EVENT DIRECTOR: A SKILL notification is triggered. This is not an achievement and has no loot reward.\nACTIVE SHAPE: ${plan.mode.id}. ${plan.mode.rule}\nSYSTEM_EVENT must be SKILL.\nSYSTEM_TITLE: invent a concise, incident-specific skill name, usually 2-6 words. It should sound like a game-system skill that only this table could have produced.\nSYSTEM_LEVEL must be ${plan.level}. This is a theatrical Council rating, not persistent stat tracking.\nSYSTEM_COPY: 2-5 sentences, usually 30-105 words. Start from verified behavior. The description may begin clinically and then derail into judgment, fascination, fake praise or profanity before returning to the mechanic. Do not copy wording, skill names, catchphrases or descriptions from existing fiction.\nSYSTEM_EFFECT: one concise fictional game-night effect written like a tooltip. It may use a percentage or numerical-sounding modifier for comedy, but NEVER present it as a real Twilight Imperium rule and never alter actual gameplay unless the humans choose to adopt it.\nSYSTEM_DURATION must be NONE.`};
  return{plan,instruction:`DISCORD SYSTEM EVENT DIRECTOR: A STATUS notification is triggered. This is not an achievement and has no loot reward.\nACTIVE SHAPE: ${plan.mode.id}. ${plan.mode.rule}\nSYSTEM_EVENT must be STATUS.\nSYSTEM_TITLE: invent a concise status-effect name, usually 2-7 words, specific to the verified incident.\nSYSTEM_LEVEL must be NONE.\nSYSTEM_COPY: 1-4 sentences, usually 20-90 words. Diagnose or announce the condition with irrational system confidence. Keep it grounded in supplied table behavior and recent context.\nSYSTEM_EFFECT: one concise fictional game-night effect. It can describe social threat, table behavior, Council scrutiny or an absurd modifier, but it must not masquerade as an official Twilight Imperium rule.\nSYSTEM_DURATION: either NONE or a short comedic duration/cleansing condition such as "until somebody takes the planet" or "until the trade goods are finally spent." Keep it based on the supplied incident.\nOriginal wording only; do not reproduce or closely paraphrase status text from existing fiction.`};
}

module.exports={eventPlan,systemEventDirective};
