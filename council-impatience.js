const COUNCIL_IMPATIENCE_API=location.hostname==='loafer87.github.io'?'https://twilight-drafter-overview.vercel.app/api/council-stall':'/api/council-stall';
const COUNCIL_IMPATIENCE_WINDOWS=[{min:240,max:300},{min:420,max:510},{min:600,max:720}];
let councilImpatience=null;

function councilImpatienceEnsureUi(){
  if(!document.querySelector('#councilImpatienceStyle')){
    const style=document.createElement('style');style.id='councilImpatienceStyle';style.textContent=`
      .council-impatience{position:fixed;left:50%;bottom:24px;z-index:900;transform:translate(-50%,28px);width:min(920px,calc(100vw - 32px));opacity:0;pointer-events:none;transition:opacity .28s ease,transform .35s cubic-bezier(.2,.8,.2,1);font-family:'Rajdhani',sans-serif}
      .council-impatience.open{opacity:1;transform:translate(-50%,0)}
      .council-impatience-card{position:relative;overflow:hidden;border:1px solid rgba(171,93,255,.7);border-left:4px solid #bd72ff;background:linear-gradient(100deg,rgba(14,7,28,.98),rgba(7,4,17,.97));box-shadow:0 18px 60px rgba(0,0,0,.55),0 0 34px rgba(145,72,255,.2);padding:14px 18px 15px 18px}
      .council-impatience-card:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(178,97,255,.08),transparent);transform:translateX(-100%);animation:councilImpatienceScan 2.8s linear infinite;pointer-events:none}
      .council-impatience-head{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:7px;text-transform:uppercase;letter-spacing:.13em;font-size:11px;font-weight:700;color:#cf9cff}
      .council-impatience-subject{color:#f0cc6a;white-space:nowrap}
      .council-impatience-text{position:relative;min-height:48px;font-size:18px;line-height:1.32;font-weight:600;color:#f3eefb;text-shadow:0 1px 10px rgba(0,0,0,.4);transition:opacity .13s ease}
      .council-impatience.level-2 .council-impatience-card{border-color:rgba(240,204,106,.8);border-left-color:#f0cc6a;box-shadow:0 18px 60px rgba(0,0,0,.58),0 0 40px rgba(240,204,106,.16)}
      .council-impatience.level-2 .council-impatience-head{color:#f0cc6a}
      .council-impatience.level-3 .council-impatience-card{border-color:rgba(255,91,91,.92);border-left-color:#ff5b5b;background:linear-gradient(100deg,rgba(37,5,14,.99),rgba(12,3,8,.98));box-shadow:0 18px 72px rgba(0,0,0,.66),0 0 54px rgba(255,70,95,.28);animation:councilImpatienceCritical .72s ease-in-out 3}
      .council-impatience.level-3 .council-impatience-head{color:#ff8585}
      .council-impatience.level-3 .council-impatience-card:before{background:linear-gradient(90deg,transparent,rgba(255,91,91,.13),transparent);animation-duration:1.65s}
      @keyframes councilImpatienceScan{to{transform:translateX(100%)}}
      @keyframes councilImpatienceCritical{50%{box-shadow:0 18px 72px rgba(0,0,0,.66),0 0 78px rgba(255,70,95,.42)}}
      @media(max-width:650px){.council-impatience{bottom:12px;width:calc(100vw - 20px)}.council-impatience-card{padding:12px 14px}.council-impatience-head{align-items:flex-start;flex-direction:column;gap:3px}.council-impatience-text{font-size:16px}}
      @media(prefers-reduced-motion:reduce){.council-impatience{transition:none}.council-impatience-card:before,.council-impatience.level-3 .council-impatience-card{animation:none}}
    `;document.head.appendChild(style);
  }
  let el=document.querySelector('#councilImpatience');
  if(!el){el=document.createElement('div');el.id='councilImpatience';el.className='council-impatience';el.setAttribute('aria-live','assertive');el.innerHTML='<div class="council-impatience-card"><div class="council-impatience-head"><span id="councilImpatienceLabel">COUNCIL INTERRUPTION // DELIBERATION AUDIT</span><span class="council-impatience-subject" id="councilImpatienceSubject"></span></div><div class="council-impatience-text" id="councilImpatienceText"></div></div>';document.body.appendChild(el)}
  return el;
}
function councilImpatienceFormat(seconds){const m=Math.floor(seconds/60),s=Math.max(0,seconds%60);return`${m}:${String(s).padStart(2,'0')}`}
function councilImpatienceDelay(windowSpec){return Math.round((windowSpec.min+Math.random()*(windowSpec.max-windowSpec.min))*1000)}
function councilImpatienceKey(){const a=state.assignments?.[state.current];return a?`${state.seed}|${state.current}|${a.playerIdx}`:null}
function councilImpatienceClear({hide=true,stopVoice=false}={}){if(!councilImpatience)return;for(const t of councilImpatience.timers||[])clearTimeout(t);if(councilImpatience.controller){try{councilImpatience.controller.abort()}catch(e){}}councilImpatience.timers=[];councilImpatience.controller=null;if(hide)councilImpatienceHide();if(stopVoice&&typeof councilStopVoice==='function')councilStopVoice();councilImpatience=null}
function councilImpatienceHide(){const el=document.querySelector('#councilImpatience');el?.classList.remove('open','level-1','level-2','level-3')}
function councilImpatienceShow(text,player,elapsedSeconds,level){
  const el=councilImpatienceEnsureUi(),textEl=document.querySelector('#councilImpatienceText');el.classList.remove('level-1','level-2','level-3');el.classList.add(`level-${level}`);
  const labels={1:'COUNCIL INTERRUPTION // DELIBERATION AUDIT',2:'COUNCIL INTERRUPTION // ADMINISTRATIVE EMERGENCY',3:'COUNCIL EMERGENCY // DELIBERATION INCIDENT: CRITICAL'};document.querySelector('#councilImpatienceLabel').textContent=labels[level]||labels[1];document.querySelector('#councilImpatienceSubject').textContent=`${player} // ${councilImpatienceFormat(elapsedSeconds)}`;
  textEl.textContent='';textEl.style.opacity='0';requestAnimationFrame(()=>el.classList.add('open'));if(level===3&&typeof playCouncilStinger==='function')playCouncilStinger();else if(typeof councilIntelSound==='function')councilIntelSound();
  let hidden=false,hideTimer=null;const finish=()=>{if(hidden)return;hidden=true;if(hideTimer)clearTimeout(hideTimer);councilImpatienceHide()};const reveal=()=>{textEl.textContent=text;textEl.style.opacity='1'};const revealFallback=()=>{reveal();hideTimer=setTimeout(finish,level===3?12000:9000)};
  if(typeof councilSpeak==='function'&&typeof councilVoiceEnabled!=='undefined'&&councilVoiceEnabled){councilSpeak(text,'pick',()=>setTimeout(finish,650),()=>reveal(),()=>revealFallback())}else revealFallback();
}
function councilImpatienceHistory(player){try{const h=typeof councilHistoryFor==='function'?councilHistoryFor(player):null;return h?{totalDraftPicks:h.total||0,factions:h.factions||{},achievements:h.achievements||[],tableLore:h.tableLore||h.profile?.lore||[]}:{} }catch(e){return{}}}
function councilImpatienceContext(level){const a=state.assignments[state.current],player=playerName(a.playerIdx),elapsedSeconds=Math.max(0,Math.floor((Date.now()-councilImpatience.startedAt)/1000)),selected=a.options.find(x=>x.name===state.selected);return{mode:'stall',seed:state.seed,player,playerKey:typeof councilPlayerKey==='function'?councilPlayerKey(player):player.toLowerCase(),pickNumber:state.current+1,totalPlayers:state.players,speaker:state.current===0,elapsedSeconds,interruptionNumber:level,offered:a.options.map(x=>({name:x.name,tag:x.tag,blurb:x.blurb,expansion:E[x.exp]?.name||x.exp})),selected:selected?selected.name:null,alreadyPicked:state.picks.map(p=>({player:playerName(p.playerIdx),faction:p.faction.name,pick:p.pos+1})),previousInterruptions:[...(councilImpatience.texts||[])],history:councilImpatienceHistory(player),expansions:[...state.exp],temporal:typeof councilSessionTemporal==='function'?councilSessionTemporal():null}}
async function councilImpatienceInterrupt(level,key){if(!councilImpatience||councilImpatience.key!==key||state.phase!=='pick'||councilImpatience.count>=level)return;const ctx=councilImpatienceContext(level),controller=new AbortController();councilImpatience.controller=controller;const timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(COUNCIL_IMPATIENCE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ctx),signal:controller.signal});let data={};try{data=await r.json()}catch(e){}if(!r.ok)throw new Error(String(data.code||`http_${r.status}`));const text=String(data.commentary||'').trim();if(!text)throw new Error('empty_response');if(!councilImpatience||councilImpatience.key!==key||state.phase!=='pick')return;councilImpatience.count=level;councilImpatience.texts.push(text);councilImpatienceShow(text,ctx.player,ctx.elapsedSeconds,level)}catch(e){if(e?.name!=='AbortError')console.warn('Council impatience uplink unavailable',e)}finally{clearTimeout(timer);if(councilImpatience?.key===key)councilImpatience.controller=null}}
function councilImpatienceStart(){if(state.phase!=='pick')return;const key=councilImpatienceKey();if(!key)return;if(councilImpatience?.key===key)return;councilImpatienceClear({hide:true,stopVoice:false});councilImpatience={key,startedAt:Date.now(),count:0,texts:[],timers:[],controller:null};COUNCIL_IMPATIENCE_WINDOWS.forEach((w,i)=>{const t=setTimeout(()=>councilImpatienceInterrupt(i+1,key),councilImpatienceDelay(w));councilImpatience.timers.push(t)})}

const councilImpatienceBaseRenderPick=renderPick;
renderPick=function(){const out=councilImpatienceBaseRenderPick();councilImpatienceStart();return out};
const councilImpatienceBaseConfirm=confirmSelection;
confirmSelection=function(){if(state.selected)councilImpatienceClear({hide:true,stopVoice:true});return councilImpatienceBaseConfirm()};
const councilImpatienceBaseReset=resetSetup;
resetSetup=function(){councilImpatienceClear({hide:true,stopVoice:true});return councilImpatienceBaseReset()};
