function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

const SPECIAL={
  'The Ghosts of Creuss':'WORMHOLE FILTH AMMO: Creuss literally rewires access through wormholes. Backdoor, wrong entrance, entering from behind, unexpected access, slipping through somewhere nobody expected, and "you can get in through THERE?" jokes are strongly encouraged when they fit. Let the Council notice the wording and make it worse for one beat. Do not make every Creuss line the same backdoor joke.',
  "The Vuil\'raith Cabal":'DIMENSIONAL-TEAR FILTH AMMO: dimensional tears, capture and predatory movement invite suspicious-hole, unwanted-entry, dragged-through-an-opening, "that opening was not meant for you," and predatory-access jokes. Keep the underlying faction identity intact: capture/free-build nightmare first, filthy implication second.',
  'The Crimson Rebellion':'RIFT FILTH AMMO: rifts, unstable dimensional access and the Creuss connection can support dirty portal, rear-entry, slipping-through-the-wrong-hole, or "nobody authorized that entrance" jokes. Use the mechanic as the setup, not random sex talk.',
  'The Empyrean':'VOID-ACCESS FILTH AMMO: strange access through empty space invites "how exactly did you get in there?", "nobody saw you coming," back-route, rear-route, and suspicious-entry jokes. Keep it mechanic-led.',
  'The Mentak Coalition':'PILLAGE FILTH AMMO: Mentak stealing trade goods invites jokes about grabbing other people\'s assets, taking a cut, getting hands on somebody else\'s goods, unwanted deductions, or the Council becoming indecently interested in the word Pillage. Do not turn every Mentak line into the same theft joke.',
  'The Emirates of Hacan':'TRADE FILTH AMMO: deals, transactions and piles of trade goods can sound like increasingly questionable negotiations. "How much for access?", "everybody gets paid," "that is a very generous package," and transactional double meanings are fair game when natural.',
  'The Embers of Muaat':'WAR SUN FILTH AMMO: enormous hardware, charging into systems and conspicuously oversized military assets invite shameless size, heat, thrust, overcompensation and "bringing the big one out early" jokes. Keep it non-graphic and make the strategic absurdity part of the joke.',
  'The Nekro Virus':'TECH THEFT FILTH AMMO: Nekro acquiring technology through combat invites dirty jokes about taking upgrades off other players, "learning by contact," aggressive acquisition, or shopping in somebody else\'s inventory without asking. Keep it about the game mechanic.',
  'The Universities of Jol-Nar':'TECH FILTH AMMO: excessive research, tech stacking and being an obvious Nekro buffet invite jokes about showing everyone your upgrades, having too much equipment on display, or becoming a dangerously attractive research target.'
};

function factionNames(ctx={}){const out=[];const add=x=>{const s=String(x||'').trim();if(s&&!out.includes(s))out.push(s)};add(ctx.faction);(ctx.rejected||[]).forEach(add);(ctx.alreadyPicked||[]).forEach(x=>add(x?.faction));(ctx.players||[]).forEach(x=>add(x?.faction));return out}

function innuendoLore(ctx={}){
  const names=factionNames(ctx),special=names.map(x=>SPECIAL[x]).filter(Boolean);
  const key=[ctx.seed||'',ctx.transmissionNonce||'',ctx.mode||'',ctx.player||ctx.speaker||'',ctx.pickNumber||'',names.join('|')].join('|');
  const roll=hash32(`${key}|innuendo`)%100,chance=special.length?92:58;
  if(roll>=chance)return[];
  const out=[
    'ADULT TABLE-HUMOR LANE — ACTIVE: this is an adult friends\' game night. Go beyond profanity. Crude double entendre, filthy-but-non-graphic innuendo, embarrassing mechanical interpretations, indecent bureaucratic phrasing and shamelessly inappropriate wordplay are welcome when the REAL game language gives you an opening. Wormholes, back routes, rear positioning, entering a system, penetration of defenses, suspicious openings, thrust, massive hardware, production, bombardment, transactions, packages, assets, getting paid, taking a cut, Pillage, capture, stealing technology, slipping through, coming from behind, or getting access where nobody invited you can all become one dirty beat. The Council is allowed to notice a phrase sounds filthy and deliberately lean into it.',
    'RAUNCH CALIBRATION: do not stop at coy corporate wit. The line may be vulgar enough that adult friends laugh and say Jesus Christ. Non-graphic phrases such as backdoor, from behind, wrong hole/opening, huge package, impressive equipment, getting your hands on somebody else\'s goods, nobody saw you coming, sliding in, taking a cut, penetrating the line, or bringing out the big one are allowed when anchored to an actual mechanic. Profanity and innuendo may coexist in the same line.',
    'TIMING RULE: do NOT force sex humor into every response. One genuinely filthy interpretation that emerges naturally is better than three generic dick jokes. Never invent real sexual behavior, orientation or private facts about players. Aim the joke at the fictional mechanic, the decision, or the Council\'s inappropriate interpretation of it.',
    'ESCALATION RULE: later in the draft, the Council may become embarrassedly fascinated by a double meaning, repeat one suspicious word, issue an absurdly indecent-sounding policy, or accuse the table of making a perfectly normal mechanic impossible to describe professionally.'
  ];
  if(special.length)out.push(...special.slice(0,3));
  return out;
}

module.exports={innuendoLore};
