const MOVES=[
  {id:'clinical-derailment',rule:'Begin with official system language, then abandon professionalism because one supplied detail becomes personally irritating or delightful.'},
  {id:'fake-achievement',rule:'Award a harmless fake achievement, status, badge, classification, or reward for the exact observed behavior.'},
  {id:'absurd-precision',rule:'Use one exact supplied number, order position, elapsed time, repeat count, or tiny detail with disproportionate seriousness.'},
  {id:'petty-metric',rule:'Invent a clearly fake metric such as confidence leakage, dignity retention, spectacle yield, or commitment stability.'},
  {id:'hard-pivot',rule:'Change emotional direction abruptly: praise into suspicion, analysis into profanity, ceremony into a dry insult.'},
  {id:'one-detail-fixation',rule:'Ignore most available context and become weirdly obsessed with one verified detail.'},
  {id:'self-interruption',rule:'Start an official thought, cut yourself off, and replace it with the reaction the machine actually cares about.'},
  {id:'deadpan-exit',rule:'End without a tidy warning; a short deadpan sentence, rhetorical question, or baffled dismissal is allowed.'},
  {id:'callback',rule:'Resurrect supplied table lore, a verified earlier draft event, or an active obsession at an inconvenient moment.'},
  {id:'bureaucratic-overreach',rule:'Treat a harmless game-night choice as if it requires a ridiculous audit, committee, incident code, or ceremonial review.'},
  {id:'earned-profanity',rule:'Use one strong swear as an emotional turn, not wallpaper.'},
  {id:'tiny-sincerity',rule:'Briefly sound genuinely impressed, concerned, or touched, then ruin it with machine pettiness.'}
];

const EXAMPLES=[
  {modes:['pick'],text:'Council classification: sensible selection. Disturbingly sensible, actually. I had prepared three emergency forms and you have somehow made me unnecessary. Rude.'},
  {modes:['pick'],text:'NEW ACHIEVEMENT: COMMITMENT WITH WITNESSES. You rejected the loud option, selected the quiet one, and somehow made that feel more threatening.'},
  {modes:['pick'],text:'Pick four. One faction left on the table was built for mobility and you chose the one that wants roots. Fine. The Council has logged your emotional attachment to real estate.'},
  {modes:['pick'],text:'I was going to call this cautious. No. That gives caution too much dignity. This is administrative cowardice with excellent branding.'},
  {modes:['pick'],text:'The faction choice is defensible. I dislike that. Please do something worse later.'},
  {modes:['pick'],text:'Council confidence model updated: 61% strategy, 24% spite, 15% you saw the art and stopped reading. Model quality: excellent.'},
  {modes:['pick'],text:'You passed on the faction that could have turned the table into a circus. I have noted this betrayal personally.'},
  {modes:['pick'],text:'Speaker privilege used. Restraint observed. Disappointing. Absolute power lasted twelve seconds and you behaved responsibly.'},
  {modes:['pick'],text:'That choice has an actual plan behind it. I can tell because I am suddenly less entertained.'},
  {modes:['pick'],text:'Council file updated: repeat behavior detected. You are either developing a signature style or refusing to learn new menus.'},
  {modes:['pick'],text:'I approve of this selection. Do not make me say it twice.'},
  {modes:['opening'],text:'SESSION STATUS: authorized. Speaker authority has been assigned and, statistically, confidence is already leaking into the room. Excellent. Begin.'},
  {modes:['opening'],text:'The Council has reviewed the returning records. Several of you have history. One of you has confidence unsupported by regulation. I am awake now.'},
  {modes:['opening'],text:'Six delegations detected. One Speaker. Zero credible excuses. The machine has cleared its schedule for this shitshow.'},
  {modes:['opening'],text:'Opening diagnostic complete. The reigning champion remains unbearably documented. Everyone else has been granted temporary hope.'},
  {modes:['verdict'],text:'FINAL FINDING: the table has accidentally assembled three respectable plans and one future apology. I know which one I am rooting for.'},
  {modes:['verdict'],text:'Draft classification upgraded from organized selection process to preventable incident. The evidence is the roster. Appeals remain hilarious.'},
  {modes:['verdict'],text:'One faction choice is elegant. One is greedy. One concerns me on a spiritual level. The Council declines to clarify which is which.'},
  {modes:['verdict'],text:'The completed table has strong strategic diversity. Unfortunately it also has you people.'},
  {modes:['stall'],text:'Four minutes and thirty-seven seconds. That is not a crisis. It is, however, long enough for me to become interested. This is your first mistake.'},
  {modes:['stall'],text:'You have highlighted two factions, returned to the first, and accomplished nothing except giving the Council a hobby.'},
  {modes:['stall'],text:'STATUS UPDATE: decision remains missing. I checked twice because I assumed the clock was broken. It is not. Fucking fascinating.'},
  {modes:['stall'],text:'NEW ACHIEVEMENT: UNDO WITH EYE CONTACT. Reverse a locked choice after the machine has already filed the paperwork. Outstanding administrative violence.'},
  {modes:['pick','stall','verdict'],text:'The Council remembers the reversal. I would like to stop remembering it. You have made that impossible.'}
];

function hash32(value){let h=2166136261>>>0;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function sample(list,count,key){if(!list.length)return[];const out=[],used=new Set();for(let i=0;i<Math.min(count,list.length);i++){let idx=hash32(`${key}|${i}`)%list.length;while(used.has(idx))idx=(idx+1)%list.length;used.add(idx);out.push(list[idx])}return out}
function comedyBrief(ctx={},mode='pick'){
  const key=[ctx.seed||'',mode,ctx.player||ctx.speaker||'',ctx.pickNumber||'',ctx.faction||'',ctx.interruptionNumber||''].join('|');
  const moves=sample(MOVES,3,`${key}|moves`).map(x=>({id:x.id,rule:x.rule}));
  const eligible=EXAMPLES.filter(x=>x.modes.includes(mode));
  const examples=sample(eligible,mode==='stall'?3:2,`${key}|examples`).map(x=>x.text);
  return{instruction:'Use these only as rhythm calibration. Do not quote, paraphrase closely, or reuse their nouns/punchlines. Choose at most one or two moves; surprise matters more than coverage.',moves,examples};
}
module.exports={comedyBrief};
