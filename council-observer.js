const COUNCIL_OBSERVER_MAX_EVENTS=48;
let councilDraftObserver=null;

function councilObserverNorm(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function councilObserverReset(){councilDraftObserver={seed:state.seed||'',startedAt:Date.now(),turn:null,events:[],players:{},obsessions:[]}}
function councilObserverState(){if(!councilDraftObserver||councilDraftObserver.seed!==state.seed)councilObserverReset();return councilDraftObserver}
function councilObserverPlayer(name){const o=councilObserverState(),key=councilObserverNorm(name);if(!o.players[key])o.players[key]={name:String(name||'Unknown'),selectionSwitches:0,selectionVisits:{},undoCount:0,lockCount:0,maxDecisionSeconds:0,lastDecisionSeconds:0,lastUndo:null,lastLocked:null,impatienceLevel:0,selectionTrail:[]};return o.players[key]}
function councilObserverTurnKey(){const a=state.assignments?.[state.current];return a?`${state.seed}|${state.current}|${a.playerIdx}`:null}
function councilObserverEnsureTurn(){if(state.phase!=='pick')return null;const a=state.assignments?.[state.current],key=councilObserverTurnKey();if(!a||!key)return null;const o=councilObserverState(),player=playerName(a.playerIdx);if(o.turn?.key!==key)o.turn={key,player,startedAt:Date.now(),selections:[],switches:0,lastSlowLevel:0};return o.turn}
function councilObserverRecord(type,detail={}){const o=councilObserverState();o.events.push({type,ts:Date.now(),...detail});if(o.events.length>COUNCIL_OBSERVER_MAX_EVENTS)o.events=o.events.slice(-COUNCIL_OBSERVER_MAX_EVENTS)}
function councilObserverLoreCollision(player){try{return(typeof councilLoreFor==='function'?councilLoreFor(player):[]).some(x=>/backsies|redos|redo|revers/i.test(String(x)))}catch(e){return false}}
function councilObserverUpsertObsession(id,data){const o=councilObserverState(),existing=o.obsessions.find(x=>x.id===id),next={id,updatedAt:Date.now(),...data};if(existing)Object.assign(existing,next);else o.obsessions.push(next);o.obsessions=o.obsessions.sort((a,b)=>(b.strength||0)-(a.strength||0)||(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8)}
function councilObserverRefresh(player){const p=councilObserverPlayer(player),key=councilObserverNorm(player);if(p.undoCount){const loreCollision=councilObserverLoreCollision(player);councilObserverUpsertObsession(`undo:${key}`,{subject:player,strength:loreCollision?10:8,type:'reversal',loreCollision,evidence:`${player} has reversed ${p.undoCount} locked faction choice${p.undoCount===1?'':'s'} this session. Most recent reversal: ${p.lastUndo?.faction||'unknown faction'}.${loreCollision?' This directly collides with established table lore about redos/backsies.':''}`})}if(p.selectionSwitches>=2)councilObserverUpsertObsession(`switch:${key}`,{subject:player,strength:Math.min(8,4+p.selectionSwitches),type:'commitment-instability',evidence:`${player} has changed highlighted faction ${p.selectionSwitches} times before locking. Recent selection trail: ${p.selectionTrail.slice(-6).join(' -> ')}.`});if(p.impatienceLevel>=1||p.maxDecisionSeconds>=300)councilObserverUpsertObsession(`time:${key}`,{subject:player,strength:Math.min(9,4+p.impatienceLevel+(p.maxDecisionSeconds>=600?3:p.maxDecisionSeconds>=420?2:1)),type:'deliberation-time',evidence:`${player}'s longest observed faction deliberation is ${p.maxDecisionSeconds}s${p.impatienceLevel?`; Council impatience reached level ${p.impatienceLevel}`:''}.`})}
function councilObserverSelect(name){const turn=councilObserverEnsureTurn();if(!turn||!name||name===state.selected)return;const p=councilObserverPlayer(turn.player),previous=state.selected||null;turn.selections.push(name);p.selectionTrail.push(name);p.selectionTrail=p.selectionTrail.slice(-12);p.selectionVisits[name]=(p.selectionVisits[name]||0)+1;if(previous&&previous!==name){turn.switches++;p.selectionSwitches++}councilObserverRecord('highlight',{player:turn.player,faction:name,previous,switchNumber:p.selectionSwitches});councilObserverRefresh(turn.player)}
function councilObserverLock(){const turn=councilObserverEnsureTurn();if(!turn||!state.selected)return;const p=councilObserverPlayer(turn.player),elapsedSeconds=Math.max(0,Math.floor((Date.now()-turn.startedAt)/1000));p.lockCount++;p.lastDecisionSeconds=elapsedSeconds;p.maxDecisionSeconds=Math.max(p.maxDecisionSeconds,elapsedSeconds);p.lastLocked=state.selected;councilObserverRecord('lock',{player:turn.player,faction:state.selected,elapsedSeconds,selectionSwitches:turn.switches,selectionTrail:[...turn.selections]});councilObserverRefresh(turn.player)}
function councilObserverUndo(last,source='pick-screen'){if(!last)return;const player=playerName(last.playerIdx),p=councilObserverPlayer(player);p.undoCount++;p.lastUndo={faction:last.faction?.name||'Unknown',source,ts:Date.now(),count:p.undoCount};councilObserverRecord('undo',{player,faction:p.lastUndo.faction,source,undoCount:p.undoCount,loreCollision:councilObserverLoreCollision(player)});councilObserverRefresh(player)}
function councilObserverSlow(level){const turn=councilObserverEnsureTurn();if(!turn||level<=turn.lastSlowLevel)return;turn.lastSlowLevel=level;const p=councilObserverPlayer(turn.player),elapsedSeconds=Math.max(0,Math.floor((Date.now()-turn.startedAt)/1000));p.impatienceLevel=Math.max(p.impatienceLevel,level);p.maxDecisionSeconds=Math.max(p.maxDecisionSeconds,elapsedSeconds);councilObserverRecord('slow-deliberation',{player:turn.player,level,elapsedSeconds,selected:state.selected||null});councilObserverRefresh(turn.player)}
function councilObserverSnapshot(player){const o=councilObserverState(),p=councilObserverPlayer(player),sameTurn=o.turn&&councilObserverNorm(o.turn.player)===councilObserverNorm(player),elapsedSeconds=sameTurn?Math.max(0,Math.floor((Date.now()-o.turn.startedAt)/1000)):p.lastDecisionSeconds;return{player:p.name,currentTurn:sameTurn?{elapsedSeconds,selections:[...o.turn.selections],selectionSwitches:o.turn.switches,currentHighlight:state.selected||null}:null,totals:{selectionSwitches:p.selectionSwitches,undoCount:p.undoCount,lockCount:p.lockCount,maxDecisionSeconds:p.maxDecisionSeconds,lastDecisionSeconds:p.lastDecisionSeconds,impatienceLevel:p.impatienceLevel},recentUndo:p.lastUndo?{...p.lastUndo}:null,lastLocked:p.lastLocked,recentEvents:o.events.filter(e=>councilObserverNorm(e.player)===councilObserverNorm(player)).slice(-6)}}
function councilObserverObsessions(player=null){const list=councilObserverState().obsessions;if(!player)return list.slice(0,6).map(x=>({...x}));const key=councilObserverNorm(player);return list.filter(x=>!x.subject||councilObserverNorm(x.subject)===key).slice(0,4).map(x=>({...x}))}
function councilObserverRecentEvents(){return councilObserverState().events.slice(-12).map(e=>({...e}))}
function councilObserverSignalsByPlayer(){const o=councilObserverState(),out={};Object.values(o.players).forEach(p=>out[p.name]=councilObserverSnapshot(p.name));return out}

councilObserverReset();

const councilObserverBaseBegin=begin;
begin=function(){councilObserverReset();return councilObserverBaseBegin()};
const councilObserverBaseRenderPick=renderPick;
renderPick=function(){const out=councilObserverBaseRenderPick();if(state.phase==='pick')councilObserverEnsureTurn();else councilObserverState().turn=null;return out};
const councilObserverBaseSelectFaction=selectFaction;
selectFaction=function(name){councilObserverSelect(name);return councilObserverBaseSelectFaction(name)};
const councilObserverBaseConfirmSelection=confirmSelection;
confirmSelection=function(){if(state.selected)councilObserverLock();return councilObserverBaseConfirmSelection()};
const councilObserverBaseUndoPick=undoPick;
undoPick=function(){const last=state.picks?.[state.picks.length-1];if(last)councilObserverUndo(last,'pick-screen');return councilObserverBaseUndoPick()};
const councilObserverBaseRenderFinal=renderFinal;
renderFinal=function(){const out=councilObserverBaseRenderFinal();councilObserverState().turn=null;const btn=$('#undoFinal'),original=btn?.onclick;if(btn&&original)btn.onclick=()=>{const last=state.picks?.[state.picks.length-1];if(last)councilObserverUndo(last,'final-screen');return original()};return out};
const councilObserverBaseResetSetup=resetSetup;
resetSetup=function(){councilObserverReset();return councilObserverBaseResetSetup()};

const councilObserverBaseCouncilContext=councilContext;
councilContext=function(a,f){const ctx=councilObserverBaseCouncilContext(a,f);ctx.draftSignals=councilObserverSnapshot(ctx.player);ctx.sessionObservations=councilObserverRecentEvents();ctx.activeObsessions=councilObserverObsessions();return ctx};
if(typeof councilOpeningContext==='function'){
  const councilObserverBaseOpeningContext=councilOpeningContext;
  councilOpeningContext=function(){const ctx=councilObserverBaseOpeningContext();ctx.sessionObservations=councilObserverRecentEvents();ctx.activeObsessions=councilObserverObsessions();return ctx};
}
if(typeof councilVerdictContext==='function'){
  const councilObserverBaseVerdictContext=councilVerdictContext;
  councilVerdictContext=function(){const ctx=councilObserverBaseVerdictContext();ctx.sessionObservations=councilObserverRecentEvents();ctx.activeObsessions=councilObserverObsessions();ctx.draftSignalsByPlayer=councilObserverSignalsByPlayer();return ctx};
}
if(typeof councilImpatienceContext==='function'){
  const councilObserverBaseImpatienceContext=councilImpatienceContext;
  councilImpatienceContext=function(level){const ctx=councilObserverBaseImpatienceContext(level);ctx.draftSignals=councilObserverSnapshot(ctx.player);ctx.sessionObservations=councilObserverRecentEvents();ctx.activeObsessions=councilObserverObsessions();return ctx};
}
if(typeof councilImpatienceInterrupt==='function'){
  const councilObserverBaseImpatienceInterrupt=councilImpatienceInterrupt;
  councilImpatienceInterrupt=async function(level,key){councilObserverSlow(level);return councilObserverBaseImpatienceInterrupt(level,key)};
}
