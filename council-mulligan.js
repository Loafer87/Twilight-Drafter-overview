/* Collins Mulligan: undo UI + Council-context rollback for erased picks. */
(function(){
  const PICK_TRACES=new Map();
  let latestVerdictTrace=null;
  const mulliganUsedByPlayer=new Set();
  const mulliganPenaltyByPlayer=new Map();
  const RULES_KEY='ti4-collins-mulligan-rules-v1';
  const mulliganRules={dropOrder:false,dropFaction:false};

  function loadMulliganRules(){
    try{
      const saved=JSON.parse(localStorage.getItem(RULES_KEY)||'null');
      if(saved&&typeof saved==='object'){mulliganRules.dropOrder=Boolean(saved.dropOrder);mulliganRules.dropFaction=Boolean(saved.dropFaction)}
    }catch(e){}
    try{
      const p=new URLSearchParams(location.search);
      if(p.has('cmOrder'))mulliganRules.dropOrder=p.get('cmOrder')==='1';
      if(p.has('cmFaction'))mulliganRules.dropFaction=p.get('cmFaction')==='1';
    }catch(e){}
  }
  function saveMulliganRules(){try{localStorage.setItem(RULES_KEY,JSON.stringify(mulliganRules))}catch(e){}}
  function mulliganRuleSummary(){
    const active=[];if(mulliganRules.dropOrder)active.push('drop one draft position');if(mulliganRules.dropFaction)active.push('burn rejected faction');
    return active.length?active.join(' + '):'no optional penalties';
  }
  function renderMulliganRules(){
    const host=document.querySelector('#setupScreen .panel:nth-child(2)');if(!host)return;
    let box=document.querySelector('#mulliganRulesBox');
    if(!box){
      box=document.createElement('div');box.id='mulliganRulesBox';box.className='mulligan-rules-box';
      const seed=host.querySelector('.seedbox');if(seed)host.insertBefore(box,seed);else host.appendChild(box);
    }
    box.innerHTML=`<div class="mulligan-rules-head"><div><span>Optional House Rules</span><b>Collins Mulligan Penalties</b></div><small>Each switch is independent. Second Mulligan assassination protocol remains mandatory.</small></div>
      <label class="mulligan-rule-toggle"><input type="checkbox" id="mulliganDropOrder" ${mulliganRules.dropOrder?'checked':''}><span class="mulligan-switch" aria-hidden="true"></span><span><b>Drop in draft order</b><small>The Mulligan user drops one position. The next delegation drafts first.</small></span></label>
      <label class="mulligan-rule-toggle"><input type="checkbox" id="mulliganDropFaction" ${mulliganRules.dropFaction?'checked':''}><span class="mulligan-switch" aria-hidden="true"></span><span><b>Drop one faction</b><small>The faction they just rejected is burned from their hand. A player is never reduced below one option.</small></span></label>`;
    const order=box.querySelector('#mulliganDropOrder'),faction=box.querySelector('#mulliganDropFaction');
    if(order)order.onchange=()=>{mulliganRules.dropOrder=order.checked;saveMulliganRules();labelMulliganButtons()};
    if(faction)faction.onchange=()=>{mulliganRules.dropFaction=faction.checked;saveMulliganRules();labelMulliganButtons()};
  }
  function syncDraftUrlRules(){
    if(typeof draftUrl!=='function')return;
    const baseDraftUrl=draftUrl;
    draftUrl=function(){
      const raw=baseDraftUrl();
      try{const u=new URL(raw);u.searchParams.set('cmOrder',mulliganRules.dropOrder?'1':'0');u.searchParams.set('cmFaction',mulliganRules.dropFaction?'1':'0');return u.toString()}catch(e){return raw}
    };
  }
  function syncSessionOrder(){
    try{
      const store=councilLoadStore(),session=councilCurrentSession(store);if(!session)return;
      const ordered=[];
      state.assignments.forEach((a,i)=>{
        const profile=councilFindProfile(store,playerName(a.playerIdx)),seat=profile?session.players.find(p=>p.profileId===profile.id):null;
        if(seat){seat.order=i+1;seat.speaker=Boolean(a.speaker);ordered.push(seat)}
      });
      session.players.forEach(seat=>{if(!ordered.includes(seat))ordered.push(seat)});
      session.players=ordered;councilSaveStore(store);
    }catch(e){}
  }
  function applyMulliganPenalties(target){
    const details=[];let idx=state.assignments.findIndex(a=>a.playerIdx===target.playerIdx);if(idx<0)return details;
    state.assignments.forEach((a,i)=>{if(typeof a.speaker!=='boolean')a.speaker=state.speakerOrder?.[0]===a.playerIdx||i===0});
    const assignment=state.assignments[idx];
    if(mulliganRules.dropFaction){
      const before=assignment.options.length;
      if(before>1&&assignment.options.some(f=>f.name===target.faction)){
        assignment.options=assignment.options.filter(f=>f.name!==target.faction);
        details.push(`${target.faction} burned`);
      }else if(before<=1)details.push('faction penalty waived — one option minimum');
    }
    if(mulliganRules.dropOrder&&idx<state.assignments.length-1){
      const [moved]=state.assignments.splice(idx,1);state.assignments.splice(idx+1,0,moved);
      state.assignments.forEach((a,i)=>a.pos=i);
      details.push('dropped one draft position');
      state.current=idx;
    }else{
      state.assignments.forEach((a,i)=>a.pos=i);
      state.current=state.assignments.findIndex(a=>a.playerIdx===target.playerIdx);
    }
    const penalty={used:true,dropOrder:Boolean(mulliganRules.dropOrder&&idx<state.assignments.length-1),dropFaction:Boolean(mulliganRules.dropFaction&&details.some(x=>x.endsWith(' burned'))),burnedFaction:details.find(x=>x.endsWith(' burned'))?.replace(/ burned$/,'')||null,details:[...details]};
    mulliganPenaltyByPlayer.set(String(target.playerIdx),penalty);
    syncSessionOrder();
    return details;
  }

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
    if(pick){pick.textContent='↶ Collins Mulligan';pick.title=`Undo the last locked faction. Each player gets one Mulligan per draft. Active house rules: ${mulliganRuleSummary()}. A second attempt on the same player is medically inadvisable.`;pick.setAttribute('aria-label','Collins Mulligan — undo last locked faction')}
    const final=$('#undoFinal');
    if(final){final.textContent='↶ Collins Mulligan';final.title=`Undo the final locked faction. Each player gets one Mulligan per draft. Active house rules: ${mulliganRuleSummary()}. Do not test the Council twice.`;final.setAttribute('aria-label','Collins Mulligan — undo final locked faction')}
  }
  function pauseImpatienceForMulligan(){
    window.__councilMulliganPauseImpatience=true;
    try{if(typeof councilImpatienceClear==='function')councilImpatienceClear({hide:true,stopVoice:false})}catch(e){}
  }
  function resumeImpatienceAfterMulligan(){
    window.__councilMulliganPauseImpatience=false;
    try{if(state?.phase==='pick'&&typeof councilImpatienceStart==='function')councilImpatienceStart()}catch(e){}
  }
  function closeMulliganRuling(){
    const el=document.querySelector('#mulliganRuling');el?.classList.remove('open');
    resumeImpatienceAfterMulligan();
  }
  function ensureMulliganRulingUi(){
    if(!document.querySelector('#councilMulliganRulingStyle')){
      const style=document.createElement('style');style.id='councilMulliganRulingStyle';style.textContent=`
        .mulligan-ruling{position:fixed;inset:0;z-index:4900;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 42%,rgba(27,44,83,.48),rgba(3,4,12,.94) 62%,#020207 100%);opacity:0;pointer-events:none;transition:opacity .18s ease;font-family:'Rajdhani',sans-serif}
        .mulligan-ruling.open{opacity:1;pointer-events:auto}
        .mulligan-ruling-card{width:min(760px,94vw);padding:32px 36px;border:1px solid rgba(118,166,255,.72);background:linear-gradient(145deg,rgba(9,15,34,.99),rgba(5,4,16,.995));box-shadow:0 28px 110px rgba(0,0,0,.82),0 0 70px rgba(80,135,255,.18);text-align:center}
        .mulligan-ruling-code{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#84b0ff;font-weight:800;margin-bottom:12px}
        .mulligan-ruling-title{font-family:'Cinzel',serif;font-size:clamp(27px,4.6vw,46px);line-height:1.05;color:#f0f5ff;text-transform:uppercase;margin-bottom:15px}
        .mulligan-ruling-text{font-size:20px;line-height:1.45;color:#d8e0ee;max-width:650px;margin:0 auto}
        .mulligan-ruling-consequences{display:grid;gap:8px;margin:20px auto 23px;max-width:610px}
        .mulligan-ruling-consequences div{padding:10px 12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:#bfcbe0;font-size:14px;letter-spacing:.06em;text-transform:uppercase}
        .mulligan-ruling button{border:1px solid rgba(118,166,255,.66);background:rgba(82,130,230,.1);color:#e5eeff;font:800 12px 'Rajdhani',sans-serif;letter-spacing:.15em;text-transform:uppercase;padding:11px 18px;cursor:pointer}
        @media(max-width:650px){.mulligan-ruling-card{padding:25px 20px}.mulligan-ruling-text{font-size:18px}}
      `;document.head.appendChild(style);
    }
    let el=document.querySelector('#mulliganRuling');
    if(!el){
      el=document.createElement('div');el.id='mulliganRuling';el.className='mulligan-ruling';el.setAttribute('role','alertdialog');el.setAttribute('aria-modal','true');
      el.innerHTML=`<div class="mulligan-ruling-card"><div class="mulligan-ruling-code">COUNCIL DISPENSATION // CM-01</div><div class="mulligan-ruling-title">Collins Mulligan Approved</div><div class="mulligan-ruling-text" id="mulliganRulingText"></div><div class="mulligan-ruling-consequences" id="mulliganRulingConsequences"></div><button type="button">Accept Consequences →</button></div>`;document.body.appendChild(el);
      el.querySelector('button').onclick=()=>closeMulliganRuling();
    }
    return el;
  }
  function mulliganRulingCopy(target,penalty){
    const player=target?.player||'Delegate',bits=[];
    if(penalty?.dropFaction&&penalty.burnedFaction)bits.push(`FACTION REVOKED // ${penalty.burnedFaction}`);
    else if(mulliganRules.dropFaction)bits.push('FACTION PENALTY WAIVED // ONE OPTION MINIMUM');
    if(penalty?.dropOrder)bits.push('DRAFT ORDER // DROPPED ONE POSITION');
    else if(mulliganRules.dropOrder)bits.push('DRAFT ORDER PENALTY WAIVED // ALREADY AT THE BOTTOM');
    if(!bits.length)bits.push('OPTIONAL PENALTIES // NONE ACTIVE');
    let body=`${player}, the Council is allowing the Collins Mulligan to proceed. This is already more mercy than the procedure deserves.`;
    if(penalty?.dropFaction&&penalty?.dropOrder)body+=' You have now lost one faction and dropped one place in the draft order. The universe has charged a restocking fee.';
    else if(penalty?.dropFaction)body+=' You have now lost one faction. Apparently indecision has a disposal fee.';
    else if(penalty?.dropOrder)body+=' You have now dropped one place in the draft order. Someone else gets to benefit from your crisis.';
    else body+=' No optional penalties are active, which the Council finds embarrassingly lenient.';
    const spoken=[];
    if(penalty?.dropFaction&&penalty.burnedFaction)spoken.push(`Faction revoked: ${penalty.burnedFaction}`);
    else if(mulliganRules.dropFaction)spoken.push('Faction penalty waived. One option minimum.');
    if(penalty?.dropOrder)spoken.push('Draft order penalty: dropped one position.');
    else if(mulliganRules.dropOrder)spoken.push('Draft order penalty waived. Already at the bottom.');
    if(!spoken.length)spoken.push('No optional penalties are active.');
    const speech=`Collins Mulligan approved. ${body} ${spoken.join(' ')}`;
    return{body,bits,speech};
  }
  function showMulliganRuling(target,penalty){
    const el=ensureMulliganRulingUi(),copy=mulliganRulingCopy(target,penalty),text=el.querySelector('#mulliganRulingText'),list=el.querySelector('#mulliganRulingConsequences');
    if(text)text.textContent=copy.body;if(list)list.innerHTML=copy.bits.map(x=>`<div>${x}</div>`).join('');
    el.classList.add('open');setTimeout(()=>el.querySelector('button')?.focus({preventScroll:true}),100);
    if(typeof councilSpeak==='function'&&typeof councilVoiceEnabled!=='undefined'&&councilVoiceEnabled){setTimeout(()=>councilSpeak(copy.speech,'pick',null,null,null,null,'dry-judgment'),160)}
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
    pauseImpatienceForMulligan();
    const changed=Boolean(action());
    if(!changed){resumeImpatienceAfterMulligan();return false}
    mulliganUsedByPlayer.add(key);
    const penalties=applyMulliganPenalties(target),penalty=mulliganPenaltyByPlayer.get(key);
    state.selected=null;renderPick();showMulliganRuling(target,penalty);
    const suffix=penalties.length?' • '+penalties.join(' • '):'';
    toast('COLLINS MULLIGAN GRANTED'+suffix);
    return true;
  }

  const baseCouncilContextForMulligan=councilContext;
  councilContext=function(a,f){
    const ctx=baseCouncilContextForMulligan(a,f),penalty=mulliganPenaltyByPlayer.get(String(a?.playerIdx));
    if(penalty)ctx.collinsMulligan={...penalty};
    return ctx;
  };

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
      const last=state.picks.pop();if(typeof restoreFactionPoolAfterUndo==='function')restoreFactionPoolAfterUndo(last);councilForgetPick(last.memoryId);const idx=state.assignments.findIndex(a=>a.playerIdx===last.playerIdx);if(idx>=0)state.assignments[idx].chosen=null;state.selected=null;return true;
    });
    return out;
  };

  const baseUndoPick=undoPick;
  undoPick=function(){
    return requestMulligan(()=>{
      if(!state?.picks?.length)return false;
      const last=state.picks.pop();if(typeof restoreFactionPoolAfterUndo==='function')restoreFactionPoolAfterUndo(last);councilForgetPick(last.memoryId);
      const idx=state.assignments.findIndex(a=>a.playerIdx===last.playerIdx);if(idx>=0)state.assignments[idx].chosen=null;
      state.selected=null;return true;
    });
  };

  const baseResetSetup=resetSetup;
  resetSetup=function(){mulliganUsedByPlayer.clear();mulliganPenaltyByPlayer.clear();window.__councilMulliganPauseImpatience=false;ensureAssassinationUi().classList.remove('open');ensureMulliganRulingUi().classList.remove('open');const out=baseResetSetup();renderMulliganRules();return out};

  window.__councilMulliganDebug={
    pickTraceCount:()=>PICK_TRACES.size,
    hasVerdictTrace:()=>Boolean(latestVerdictTrace),
    uses:()=>[...mulliganUsedByPlayer].map(Number),
    usedByPlayer:()=>[...mulliganUsedByPlayer].map(key=>({playerIdx:Number(key),player:playerName(Number(key))})),
    rules:()=>({...mulliganRules}),
    penalties:()=>[...mulliganPenaltyByPlayer.entries()].map(([playerIdx,penalty])=>({playerIdx:Number(playerIdx),player:playerName(Number(playerIdx)),...penalty})),
    recent:()=>({headlines:[...councilRecentHeadlines],achievements:[...councilRecentAchievements],shapes:[...councilRecentPerformanceShapes],bodyPatterns:[...councilRecentBodyPatterns],motifs:[...councilRecentComedyMotifs]})
  };

  loadMulliganRules();saveMulliganRules();renderMulliganRules();syncDraftUrlRules();
})();
