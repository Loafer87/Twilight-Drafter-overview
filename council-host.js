function councilOpeningContext(){
  const players=state.assignments.map((a,i)=>{
    const name=playerName(a.playerIdx),history=councilHistoryFor(name);
    return {name:history.profile?.displayName||name,playerId:history.profile?.id||null,order:i+1,speaker:i===0,history:{totalDraftPicks:history.total,factions:history.factions,speakerCount:history.speakerCount,achievements:history.achievements,games:history.games,wins:history.wins,winRate:history.winRate,winStreak:history.winStreak,lastGame:history.lastGame}};
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
function councilSetSource(result){
  const source=$('#intelSource'),reason=String(result.reason||'uplink_failed').toUpperCase().replace(/_/g,' ');
  source.textContent=result.source==='llm'?'LIVE COGNITIVE LINK':`LOCAL CHAOS ENGINE // ${reason}`;
  source.dataset.state=result.source==='llm'?'live':'local';
}
const councilPickScreen=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  const el=$('#councilIntel');
  el.classList.remove('opening');
  $('.intel-status b').textContent='COUNCIL INTELLIGENCE // UNSOLICITED ANALYSIS';
  $('.intel-kicker').textContent='Behavioral Assessment';
  $('.intel-title').textContent='The Council Has Opinions';
  councilPickScreen(result,ctx,achievement,done);
  councilSetSource(result);
};
function showCouncilOpening(result,ctx,done){
  const el=$('#councilIntel'),text=$('#intelText'),ach=$('#intelAchievement'),btn=$('#intelContinue');
  el.classList.add('opening');
  $('.intel-status b').textContent='COUNCIL INTELLIGENCE // SESSION AUTHORIZATION';
  $('.intel-kicker').textContent='Initial Delegation Assessment';
  $('.intel-title').textContent='Council Intelligence Online';
  $('#intelSubject').textContent=`${ctx.totalPlayers} DELEGATIONS // SPEAKER: ${ctx.speaker}`;
  text.textContent=result.text;
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
