function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

const MODES=[
  {id:'deadpan-humiliation',rule:'State the verified act plainly, then react as if the humiliating implication is self-evident. Short, dry, devastating. Do not over-explain.'},
  {id:'question-answer-ambush',rule:'After stating the verified act, ask one rhetorical question and answer it yourself in the meanest concise way available. The answer should reframe the recipient as the problem.'},
  {id:'false-praise',rule:'Open with sincere-sounding praise, then reveal that the accomplishment is impressive for an embarrassing, reckless, pathetic or deeply stupid reason.'},
  {id:'system-grudge',rule:'The Council takes the act personally. Let the achievement reveal irritation that its authority, ruling, expectations or entertainment has been inconvenienced.'},
  {id:'unhealthy-fascination',rule:'The Council becomes a little too interested in one harmless verified detail. Keep it adult and non-graphic; fascination should feel inappropriate, not explicit.'},
  {id:'absurd-escalation',rule:'Start from the literal verified act and escalate through one increasingly ridiculous comparison until the player sounds like a menace far beyond what actually happened.'},
  {id:'reward-betrayal',rule:'The description can be relatively straight; make the reward itself the main insult. The reward may be useless, petty, actively unhelpful or a one-line punchline instead of a box.'},
  {id:'consequence-prize',rule:'The reward appears celebratory, then ACHIEVEMENT_CONSEQUENCE reveals a fictional table-level consequence that makes the achievement worse. Keep the consequence obviously comedic and non-binding.'}
];

function notableEvidence(text){
  const t=String(text||'').toLowerCase();
  let bonus=0;
  const patterns=[
    /\b(?:again|another|third|fourth|fifth|first time|never|always|still)\b/,
    /\b(?:won|lost|killed|destroyed|stole|lied|forgot|failed|broke|betrayed|cheated|refused|rage quit|mulligan|backsies)\b/,
    /\b(?:wetty\s+dredd|i.?m just a plant|i.?m just a girl|coffee|banana|dreadnought|war sun|mecatol|wormhole|pillage|trade good|mentak|hoard)\b/,
    /\b(?:champion|claim|grudge|organizer|meme|ally|attack|revenge)\b/,
    /\b\d+\b/
  ];
  for(const re of patterns)if(re.test(t))bonus+=7;
  return Math.min(28,bonus);
}

function achievementPlan(input={}){
  const evidence=[input.message,...(input.recentMessages||[]).map(x=>x?.content)].filter(Boolean).join(' ');
  const base=input.command==='accuse'?38:input.command==='grievance'?32:22;
  const chance=Math.min(60,base+notableEvidence(evidence));
  const key=`${input.guildId||''}|${input.channelId||''}|${input.interactionId||''}|${input.command||''}|${input.invoker||''}|${input.target||''}|${input.message||''}`;
  const roll=hash32(`${key}|achievement-roll`)%100;
  const enabled=input.forceAchievement===false?false:(input.forceAchievement===true||roll<chance);
  const mode=MODES[hash32(`${key}|achievement-mode`)%MODES.length];
  const rewardRoll=hash32(`${key}|reward-shape`)%100;
  const rewardShape=mode.id==='reward-betrayal'?(rewardRoll<52?'punchline':'box'):rewardRoll<79?'box':rewardRoll<91?'punchline':'none';
  const stingAllowed=hash32(`${key}|sting`)%100<24;
  const consequenceAllowed=mode.id==='consequence-prize'||hash32(`${key}|consequence`)%100<18;
  const tiers=['Bronze','Silver','Gold','Platinum','Legendary','Celestial'];
  const tier=tiers[hash32(`${key}|tier`)%tiers.length];
  return{enabled,chance,roll,mode,rewardShape,stingAllowed,consequenceAllowed,tier};
}

function achievementDirective(input={}){
  const plan=achievementPlan(input);
  if(!plan.enabled)return{plan,instruction:'DISCORD ACHIEVEMENT DIRECTOR: No achievement this interaction. Output NONE for ACHIEVEMENT, ACHIEVEMENT_COPY, ACHIEVEMENT_STING, ACHIEVEMENT_REWARD and ACHIEVEMENT_CONSEQUENCE. Do not sneak an achievement into BODY.'};
  const rewardRule=plan.rewardShape==='box'
    ?`ACHIEVEMENT_REWARD must be BOX: ${plan.tier} <invented offense-specific name ending in the literal word Box>. The literal FINAL WORD must be Box. Make the name the kind of ridiculous object-label that only makes sense for this exact act. Never reuse a reward name from existing fiction.`
    :plan.rewardShape==='punchline'
      ?'ACHIEVEMENT_REWARD must be TEXT: <a very short anti-reward/punchline>. It can be one word, a refusal, a useless privilege, or a petty system response. Do not use a loot box in this lane.'
      :'ACHIEVEMENT_REWARD must be NONE. The lack of reward should itself feel intentional, not forgotten.';
  const stingRule=plan.stingAllowed
    ?'ACHIEVEMENT_STING may be a separate 2-8 word line of false affection, contempt, approval or disappointment. It must not copy a catchphrase from outside fiction.'
    :'ACHIEVEMENT_STING must be NONE.';
  const consequenceRule=plan.consequenceAllowed
    ?'ACHIEVEMENT_CONSEQUENCE may be one short fictional consequence caused by earning this achievement: a humiliating table designation, absurd Council policy, cursed naming convention, or ceremonial burden. It must be obviously comedic, non-binding and based only on supplied game-night evidence.'
    :'ACHIEVEMENT_CONSEQUENCE must be NONE.';
  return{plan,instruction:`DISCORD ACHIEVEMENT DIRECTOR: An achievement IS earned this interaction. This is a rare event, so make it land.\nACTIVE ACHIEVEMENT SHAPE: ${plan.mode.id}. ${plan.mode.rule}\nTITLE: 2-10 words, instantly understandable, and specific enough that it could only have come from this incident. A pun, cultural allusion, mock title, accusation or corrupted badge is welcome, but keep it original.\nDESCRIPTION RHYTHM: sentence one anchors to the verified trigger. After that, escalate, pivot or judge. Usually 2-5 sentences, 25-105 words. Vary sentence length. Do not summarize all context. Do not explain the joke.\nVOICE: overpowered game system with too much personality, selective profanity, irrational confidence, and occasional personal investment. Original wording only; do not reproduce or closely paraphrase achievement text, names, reward boxes or catchphrases from existing books/games.\n${rewardRule}\n${stingRule}\n${consequenceRule}`};
}

module.exports={achievementPlan,achievementDirective};
