/* Collins Mulligan: undo UI + Council-context rollback for erased picks. */
(function(){
  const PICK_TRACES=new Map();
  let latestVerdictTrace=null;
  const mulliganUsedByPlayer=new Set();

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
  function mulliganTarget(){
    const last=state?.picks?.[state.picks.length-1];
    if(!last)return null;
    return{playerIdx:last.playerIdx,player:playerName(last.playerIdx),faction:last.faction?.name||''};
  }
  function labelMulliganButtons(){
    const pick=$('#undoBtn');
    if(pick){pick.textContent='↶ Collins Mulligan';pick.title='Undo the last locked faction. Each player gets one Mulligan per draft. A second attempt on the same player is medically inadvisable.';pick.setAttribute('aria-label','Collins Mulligan — undo last locked faction')}
    const final=$('#undoFinal');
    if(final){final.textContent='↶ Collins Mulligan';final.title='Undo the final locked faction. Each player gets one Mulligan per draft. Do not test the Council twice.';final.setAttribute('aria-label','Collins Mulligan — undo final locked faction')}
  }
  function ensureAssassinationUi(){
    if(!document.querySelector('#councilMulliganAssassinationStyle')){
      const style=document.createElement('style');style.id='councilMulliganAssassinationStyle';style.textContent=`
        .mulligan-assassination{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(88,0,18,.58),rgba(3,0,8,.96) 58%,#020105 100%);opacity:0;pointer-events:none;transition:opacity .18s ease;font-family:'Rajdhani',sans-serif}
        .mulligan-assassination.open{opacity:1;pointer-events:auto}
        .mulligan-assassination-card{width:min(800px,94vw);border:1px solid rgba(255,76,94,.95);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 30px 120px rgba(0,0,0,.85),0 0 90px rgba(255,25,60,.32);background:linear-gradient(145deg,rgba(32,1,10,.99),rgba(7,2,13,.995));padding:34px 38px;text-align:center;position:relative;overflow:hidden}
        .mulligan-assassination-card:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 4px,rgba(255,255,255,.018) 5px);pointer-events:none}
        .mulligan-assassination-code{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#ff7584;font-weight:700;margin-bottom:15px}
        .mulligan-assassination-title{font-family:'Cinzel',serif;font-size:clamp(28px,5vw,52px);line-height:1.02;color:#fff2f3;text-transform:uppercase;text-shadow:0 0 26px rgba(255,52,82,.35);margin-bottom:18px}
        .mulligan-assassination-text{font-size:21px;line-height:1.42;color:#f1dfe4;max-width:690px;margin:0 auto 24px}
        .mulligan-assassination-kill{font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#ff5268;font-weight:800;margin:22px auto;max-width:690px}
        .mulligan-assassination button{border:1px solid rgba(255,107,126,.8);background:rgba(255,52,82,.08);color:#ffd9df;font:700 13px 'Rajdhani',sans-serif;letter-spacing:.16em;text-transform:uppercase;padding:11px 18px;cursor:pointer}
        .mulligan-assassination.open .mulligan-assassination-card{animation:mulliganAssassinationHit .18s linear 3}
        @keyframes mulliganAssassinationHit{50%{transform:translate(2px,-1px);filter:brightness(1.3)}75%{transform:translate(-2px,1px)}}
        @media(max-width:650px){.mulligan-assassination-card{padding:26px 20px}.mulligan-assassination-text{font-size:18px}}
        @media(prefers-reduced-motion:reduce){.mulligan-assassination.open .mulligan-assassination-card{animation:none}}
      `;document.head.appendChild(style);
    }
    let el=document.querySelector('#mulliganAssassination');
    if(!el){
      el=document.createElement('div');el.id='mulliganAssassination';el.className='mulligan-assassination';el.setAttribute('role','alertdialog');el.setAttribute('aria-modal','true');el.innerHTML=`<div class="mulligan-assassination-card"><div class="mulligan-assassination-code">COUNCIL ERROR // CM-02</div><div class="mulligan-assassination-title">Second Mulligan Detected</div><div class="mulligan-assassination-text" id="mulliganAssassinationText"></div><div class="mulligan-assassination-kill" id="mulliganAssassinationKill"></div><button type="button">Continue as Next of Kin →</button></div>`;document.body.appendChild(el);
      el.querySelector('button').onclick=()=>el.classList.remove('open');
    }
    return el;
  }
  function assassinationCopy(target){
    const player=target?.player||'Delegate',faction=target?.faction?` for ${target.faction}`:'';
    const body=`${player}. No. The Council already granted you one Collins Mulligan. You have now attempted to reverse causality${faction} AGAIN. This is no longer indecision. This is an unauthorized attack on linear time. Your draft privileges are revoked, your chair has been marked vacant, and an intern is already measuring it for your replacement.`;
    const kill='CORRECTION PROTOCOL ACTIVE // ASSASSIN EN ROUTE // APPEAL DENIED IN ADVANCE';
    const speech=`Council error C M zero two. Second Mulligan detected. ${body} Correction protocol active. Assassin en route. Appeal denied in advance. Please remain where you are. Running only makes the paperwork funnier.`;
    return{body,kill,speech};
  }
  function assassinateSecondMulligan(target){
    if(typeof councilStopVoice==='function')councilStopVoice();
    if(typeof playCouncilStinger==='function')playCouncilStinger();
    const el=ensureAssassinationUi(),copy=el.querySelector('#mulliganAssassinationText'),kill=el.querySelector('#mulliganAssassinationKill'),lines=assassinationCopy(target);
    if(copy)copy.textContent=lines.body;
    if(kill)kill.textContent=lines.kill;
    el.classList.add('open');setTimeout(()=>el.querySelector('button')?.focus({preventScroll:true}),120);
    if(typeof councilSpeak==='function'&&typeof councilVoiceEnabled!=='undefined'&&councilVoiceEnabled){
      setTimeout(()=>councilSpeak(lines.speech,'pick',null,null,null,null,'council-meltdown'),180);
    }
  }
  function requestMulligan(action){
    const target=mulliganTarget();if(!target)return false;
    const key=String(target.playerIdx);
    if(mulliganUsedByPlayer.has(key)){assassinateSecondMulligan(target);return false}
    const changed=Boolean(action());
    if(changed)mulliganUsedByPlayer.add(key);
    return changed;
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
  renderFinal=function(){
    const out=baseRenderFinal();labelMulliganButtons();
    const final=$('#undoFinal');
    if(final)final.onclick=()=>requestMulligan(()=>{
      if(!state.picks.length)return false;
      const last=state.picks.pop();councilForgetPick(last.memoryId);state.current=state.players-1;state.assignments[state.current].chosen=null;state.selected=null;renderPick();toast('COLLINS MULLIGAN GRANTED • previous choice expunged from Council memory');return true;
    });
    return out;
  };

  const baseUndoPick=undoPick;
  undoPick=function(){
    return requestMulligan(()=>{
      const hadPick=Boolean(state?.picks?.length);if(!hadPick)return false;
      baseUndoPick();
      toast('COLLINS MULLIGAN GRANTED • previous choice expunged from Council memory');
      return true;
    });
  };

  const baseResetSetup=resetSetup;
  resetSetup=function(){mulliganUsedByPlayer.clear();ensureAssassinationUi().classList.remove('open');return baseResetSetup()};

  window.__councilMulliganDebug={
    pickTraceCount:()=>PICK_TRACES.size,
    hasVerdictTrace:()=>Boolean(latestVerdictTrace),
    uses:()=>[...mulliganUsedByPlayer].map(Number),
    usedByPlayer:()=>[...mulliganUsedByPlayer].map(key=>({playerIdx:Number(key),player:playerName(Number(key))})),
    recent:()=>({headlines:[...councilRecentHeadlines],achievements:[...councilRecentAchievements],shapes:[...councilRecentPerformanceShapes],bodyPatterns:[...councilRecentBodyPatterns],motifs:[...councilRecentComedyMotifs]})
  };
})();
