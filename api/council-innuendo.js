function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

const SPECIAL={
  'The Ghosts of Creuss':'WORMHOLE DOUBLE-ENTENDRE AMMO: Creuss literally rewires access through wormholes. Backdoor, wrong entrance, arriving behind somebody, unexpected access, and "you can enter from there?" jokes are fair game when they fit. Keep it suggestive rather than explicit and never make every Creuss line the same backdoor joke.',
  "The Vuil'raith Cabal":'DIMENSIONAL-TEAR DOUBLE-ENTENDRE AMMO: dimensional tears and predatory movement can support suspicious-hole, unexpected-entry, or "that opening was not meant for you" jokes. One beat is enough; the faction is still primarily a capture/free-build nightmare.',
  'The Crimson Rebellion':'RIFT DOUBLE-ENTENDRE AMMO: rifts, unstable dimensional access, and their Creuss connection can occasionally support dirty portal/backdoor jokes. Use only when the mechanic or table situation earns it.',
  'The Empyrean':'VOID-ACCESS DOUBLE-ENTENDRE AMMO: weird access through empty space can occasionally invite an inappropriate "how exactly did you get in there?" line. Keep it rare and mechanic-led.'
};

function factionNames(ctx={}){const out=[];const add=x=>{const s=String(x||'').trim();if(s&&!out.includes(s))out.push(s)};add(ctx.faction);(ctx.rejected||[]).forEach(add);(ctx.alreadyPicked||[]).forEach(x=>add(x?.faction));(ctx.players||[]).forEach(x=>add(x?.faction));return out}

function innuendoLore(ctx={}){
  const names=factionNames(ctx),special=names.map(x=>SPECIAL[x]).filter(Boolean);
  const key=[ctx.seed||'',ctx.transmissionNonce||'',ctx.mode||'',ctx.player||ctx.speaker||'',ctx.pickNumber||'',names.join('|')].join('|');
  const roll=hash32(`${key}|innuendo`)%100,chance=special.length?68:24;
  if(roll>=chance)return[];
  const out=[
    'ADULT INNUENDO LANE — OPTIONAL AMMUNITION: this table enjoys crude double entendre and inappropriate game-night wordplay in addition to profanity. When a REAL mechanic, faction image, table interaction, portal, wormhole, dimensional tear, rear attack, transaction, penetration of a defensive line, suspicious opening, or unexpected access naturally sets it up, the Council may take the obvious dirty interpretation for one beat. Backdoor, wrong entrance, coming in from behind, suspicious holes/openings, getting access where nobody invited you, and similar suggestive wording are allowed. Keep it non-graphic, original, and about fictional game mechanics or decisions — never invent sexual facts about real players, never sexualize protected traits, and never turn every reaction into sex jokes.',
    'INNUENDO TIMING RULE: plausible deniability is funnier than explaining the joke. One filthy little line that the table catches is better than a whole routine. If the mechanic does not naturally support the joke, skip it.'
  ];
  if(special.length)out.push(...special.slice(0,2));
  return out;
}

module.exports={innuendoLore};
