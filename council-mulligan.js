/* Collins Mulligan: undo UI + Council-context rollback for erased picks. */
(function(){
  const PICK_TRACES=new Map();
  let latestVerdictTrace=null;

  function clean(value){return String(value||'').replace(/\s+/g,' ').trim()}
  function removeRemembered(list,value,key){
    const target=clean(value).toLowerCase();
    if(!target)return list;
    const next=(Array.isArray(list)?list:[]).filter(x=>clean(x).toLowerCase()!==target);
    try{localStorage.setItem(key,JSON.stringify(next))}catch(e){}
    return next;
  }
  function forgetReactionTrace(result){
    if(!result||result.source!=='llm')return;
    const headline=clean(result.title||result.headline);
    if(headline)councilRecentHeadlines=removeRemembered(councilRecentHeadlines,headline,COUNCIL_RECENT_HEADLINES_KEY);
    const achievement=clean(result.achievement?.title);
    if(achievement)councilRecentAchievements=removeRemembered(councilRecentAchievements,achievement,COUNCIL_RECENT_ACHIEVEMENTS_KEY);
    const director=clean(result.directorMode||result.performanceShape);
    if(director)councilRecentPerformanceShapes=removeRemembered(councilRecentPerformanceShapes,director,COUNCIL_RECENT_SHAPES_KEY);
    const bodyPattern=clean(result.bodyPattern);
    if(bodyPattern)councilRecentBodyPatterns=removeRemembered(councilRecentBodyPatterns,bodyPattern,COUNCIL_RECENT_BODY_PATTERNS_KEY);
    for(const motif of Array.isArray(result.comedyMotifs)?result.comedyMotifs:[]){
      councilRecentComedyMotifs=removeRemembered(councilRecentComedyMotifs,motif,COUNCIL_RECENT_COMEDY_MOTIFS_KEY);
    }
  }
  function labelMulliganButtons(){
    const pick=$('#undoBtn');
    if(pick){pick.textContent='↶ Collins Mulligan';pick.title='Undo the last locked faction. Chris Collins would understand.';pick.setAttribute('aria-label','Collins Mulligan — undo last locked faction')}
    const final=$('#undoFinal');
    if(final){final.textContent='↶ Collins Mulligan';final.title='Undo the final locked faction. The Council will forget the invalid verdict too.';final.setAttribute('aria-label','Collins Mulligan — undo final locked faction')}
  }

  const baseRemote=councilRemoteReaction;
  councilRemoteReaction=async function(ctx){
    const result=await baseRemote(ctx);
    if(ctx?.mode==='verdict')latestVerdictTrace=result;
    else if(!ctx?.mode||ctx.mode==='pick'){
      try{PICK_TRACES.set(councilEventId(ctx),result)}catch(e){}
    }
    return result;
  };

  const baseForgetPick=councilForgetPick;
  councilForgetPick=function(id){
    const trace=PICK_TRACES.get(id);
    baseForgetPick(id);
    if(trace){forgetReactionTrace(trace);PICK_TRACES.delete(id)}
    if(state?.phase==='final'&&latestVerdictTrace){forgetReactionTrace(latestVerdictTrace);latestVerdictTrace=null}
  };

  const baseRenderPick=renderPick;
  renderPick=function(){const out=baseRenderPick();labelMulliganButtons();return out};
  const baseRenderFinal=renderFinal;
  renderFinal=function(){const out=baseRenderFinal();labelMulliganButtons();return out};

  const baseUndoPick=undoPick;
  undoPick=function(){
    const hadPick=Boolean(state?.picks?.length);
    const out=baseUndoPick();
    if(hadPick)toast('COLLINS MULLIGAN GRANTED • previous choice expunged from Council memory');
    return out;
  };

  window.__councilMulliganDebug={
    pickTraceCount:()=>PICK_TRACES.size,
    hasVerdictTrace:()=>Boolean(latestVerdictTrace),
    recent:()=>({headlines:[...councilRecentHeadlines],achievements:[...councilRecentAchievements],shapes:[...councilRecentPerformanceShapes],bodyPatterns:[...councilRecentBodyPatterns],motifs:[...councilRecentComedyMotifs]})
  };
})();
