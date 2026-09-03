function councilHistoryPayload(history){return{totalDraftPicks:history.total,factions:history.factions,speakerCount:history.speakerCount,achievements:history.achievements,games:history.games,wins:history.wins,winRate:history.winRate,winStreak:history.winStreak,legacyRecord:history.legacyRecord,lastGame:history.lastGame}}
function councilOpeningContext(){
  const players=state.assignments.map((a,i)=>{
    const name=playerName(a.playerIdx),history=councilHistoryFor(name);
    return {name:history.profile?.displayName||name,playerId:history.profile?.id||null,order:i+1,speaker:i===0,history:councilHistoryPayload(history)};
  });
  return {mode:'opening',seed:state.seed,totalPlayers:state.players,speaker:players[0]?.name||'',expansions:[...state.exp].map(id=>E[id]?.name||id),players};
}
function councilLocalOpening(ctx){
  const returning=ctx.players.filter(p=>p.history.totalDraftPicks>0||p.history.games>0).sort((a,b)=>(b.history.games||0)-(a.history.games||0)||b.history.totalDraftPicks-a.history.totalDraftPicks);
  const veterans=returning.length?`Prior violations are on file for ${returning.slice(0,3).map(p=>p.name).join(', ')}.`:'No prior violations are on file. The Council finds this suspicious rather than reassuring.';
  const achievements=ctx.players.flatMap(p=>(p.history.achievements||[]).map(a=>`${p.name}: ${a.title}`));
  const record=achievements.length?` Recorded honors include ${achievements.slice(0,2).join(' and ')}.`:'';
  const champion=ctx.players.find(p=>p.history.winStreak>0),wins=champion?` ${champion.name} enters with a recorded win streak of ${champion.history.winStreak}; confidence containment protocols have failed.`:'';
  return `${ctx.totalPlayers} delegations detected. ${ctx.speaker} has acquired the Speaker token and therefore a medically inadvisable amount of confidence.\n\n${veterans}${record}${wins} Faction selection may now begin; future regret has been pre-authorized.`;
}
function prepareCouncilOpening(){
  const ctx=councilOpeningContext(),local=councilLocalOpening(ctx);
  const promise=councilRemoteReaction(ctx).catch(error=>({text:local,source:'local',reason:error?.name==='AbortError'?'timeout':String(error?.code||error?.message||'uplink_failed')}));
  return {ctx,promise};
}
function councilVerdictContext(){
  const players=state.assignments.map((a,i)=>{
    const raw=playerName(a.playerIdx),history=councilHistoryFor(raw),chosen=a.chosen;
    return {name:history.profile?.displayName||raw,playerId:history.profile?.id||null,order:i+1,speaker:i===0,faction:chosen?.name||null,tag:chosen?.tag||null,expansion:chosen?E[chosen.exp]?.name||chosen.exp:null,rejected:a.options.filter(f=>!chosen||f.name!==chosen.name).map(f=>f.name),history:councilHistoryPayload(history)};
  });
  return {mode:'verdict',seed:state.seed,totalPlayers:state.players,speaker:players[0]?.name||'',expansions:[...state.exp].map(id=>E[id]?.name||id),players};
}
function councilLocalVerdict(ctx){
  const speaker=ctx.players[0],chaos=ctx.players.find(p=>/chaos|aggressive|military/i.test(String(p.tag||'')))||ctx.players[ctx.players.length-1],repeat=ctx.players.find(p=>(p.history?.factions?.[p.faction]||0)>1);
  const repeatLine=repeat?` ${repeat.name} has returned to ${repeat.faction}; the pattern-recognition subsystem has stopped pretending this is coincidence.`:'';
  return `All ${ctx.totalPlayers} delegations are locked. ${speaker.name} used first priority on ${speaker.faction}, which the Council will classify as either leadership or an early confession.${repeatLine} ${chaos.name} currently carries the highest provisional entertainment risk. Final ruling: grudges are authorized, excuses are not.`;
}
function prepareCouncilVerdict(){
  const ctx=councilVerdictContext(),local=councilLocalVerdict(ctx);
  const promise=councilRemoteReaction(ctx).catch(error=>({text:local,source:'local',reason:error?.name==='AbortError'?'timeout':String(error?.code||error?.message||'uplink_failed')}));
  return {ctx,promise};
}
function councilTransmissionBeats(raw,mode='pick'){
  const clean=String(raw||'').trim().replace(/\r/g,'');if(!clean)return[];
  const authored=clean.split(/\n{2,}/).map(x=>x.replace(/\s*\n\s*/g,' ').trim()).filter(Boolean);
  if(authored.length>1)return authored;
  const sentences=clean.replace(/\s*\n\s*/g,' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(x=>x.trim()).filter(Boolean);
  if(sentences.length<=2)return[clean.replace(/\s*\n\s*/g,' ')];
  const size=mode==='pick'&&sentences.length<=3?1:2,beats=[];
  for(let i=0;i<sentences.length;i+=size)beats.push(sentences.slice(i,i+size).join(' '));
  return beats;
}
function councilRenderTransmission(raw,mode='pick'){
  const el=$('#intelText');if(!el)return;el.innerHTML='';const beats=councilTransmissionBeats(raw,mode);
  (beats.length?beats:[String(raw||'')]).forEach((beat,i)=>{const p=document.createElement('p');p.className='intel-beat';if(i===beats.length-1)p.classList.add('intel-beat-final');p.textContent=beat;el.appendChild(p)});
}
function councilSetSource(result){
  const source=$('#intelSource'),reason=String(result.reason||'uplink_failed').toUpperCase().replace(/_/g,' ');
  source.textContent=result.source==='llm'?'LIVE COGNITIVE LINK':`LOCAL CHAOS ENGINE // ${reason}`;
  source.dataset.state=result.source==='llm'?'live':'local';
}
const councilPickScreen=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  const el=$('#councilIntel');
  el.classList.remove('opening','verdict');
  $('.intel-status b').textContent='COUNCIL INTELLIGENCE // UNSOLICITED ANALYSIS';
  $('.intel-kicker').textContent='Behavioral Assessment';
  $('.intel-title').textContent='The Council Has Opinions';
  councilPickScreen(result,ctx,achievement,done);
  councilRenderTransmission(result.text,'pick');
  if(ctx.pickNumber>=ctx.totalPlayers)$('#intelContinue').textContent='Summon Final Verdict →';
  councilSetSource(result);
};
function showCouncilOpening(result,ctx,done){
  const el=$('#councilIntel'),ach=$('#intelAchievement'),btn=$('#intelContinue');
  el.classList.add('opening');el.classList.remove('verdict');
  $('.intel-status b').textContent='COUNCIL INTELLIGENCE // SESSION AUTHORIZATION';
  $('.intel-kicker').textContent='Initial Delegation Assessment';
  $('.intel-title').textContent='Council Intelligence Online';
  $('#intelSubject').textContent=`${ctx.totalPlayers} DELEGATIONS // SPEAKER: ${ctx.speaker}`;
  councilRenderTransmission(result.text,'opening');
  councilSetSource(result);
  ach.hidden=true;ach.innerHTML='';
  btn.textContent='Begin Deliberations →';
  btn.disabled=true;
  el.classList.remove('ready','leaving');
  el.classList.add('open');
  councilIntelSound();
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('ready')));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unlock=setTimeout(()=>{btn.disabled=false;btn.focus({preventScroll:true})},reduced?100:1100);
  btn.onclick=()=>{
    if(btn.disabled)return;
    clearTimeout(unlock);btn.disabled=true;el.classList.add('leaving');
    setTimeout(()=>{el.classList.remove('open','ready','leaving','opening');done()},reduced?20:720);
  };
}
function showCouncilVerdict(result,ctx,done){
  const el=$('#councilIntel'),ach=$('#intelAchievement'),btn=$('#intelContinue');
  el.classList.remove('opening');el.classList.add('verdict');
  $('.intel-status b').textContent='COUNCIL INTELLIGENCE // PROVISIONAL TABLE RULING';
  $('.intel-kicker').textContent='Draft Classification Complete';
  $('.intel-title').textContent='Final Preliminary Verdict';
  $('#intelSubject').textContent=`${ctx.totalPlayers} FACTIONS LOCKED // APPEALS: DENIED`;
  councilRenderTransmission(result.text,'verdict');councilSetSource(result);ach.hidden=true;ach.innerHTML='';
  btn.textContent='Reveal the Council Chamber →';btn.disabled=true;
  el.classList.remove('ready','leaving');el.classList.add('open');
  playCouncilStinger();requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('ready')));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unlock=setTimeout(()=>{btn.disabled=false;btn.focus({preventScroll:true})},reduced?100:1200);
  btn.onclick=()=>{if(btn.disabled)return;clearTimeout(unlock);btn.disabled=true;el.classList.add('leaving');setTimeout(()=>{el.classList.remove('open','ready','leaving','verdict');done()},reduced?20:760)};
}
