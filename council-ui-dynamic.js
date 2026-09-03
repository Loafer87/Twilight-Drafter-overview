function councilUiEsc(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function councilUiHeadline(result,fallback){const title=String(result?.title||result?.headline||'').trim();return title||fallback}
function councilUiApplyHeadline(result,fallback){const value=councilUiHeadline(result,fallback),apply=()=>{const title=document.querySelector('.intel-title');if(title)title.textContent=value;const source=document.querySelector('#intelSource');if(source&&result?.apiVersion){source.dataset.apiVersion=result.apiVersion;source.title=`Council Intelligence ${result.apiVersion}`}};apply();queueMicrotask(apply);requestAnimationFrame(apply)}
function councilUiDaypart(){const hour=new Date().getHours();return hour<12?'morning':hour<17?'afternoon':'evening'}
function councilNormalizeAchievement(achievement){if(!achievement?.title)return achievement||null;let copy=String(achievement.copy||'');copy=copy.replace(/\bStart the (?:morning|afternoon|evening|night)\b/i,`Start the ${councilUiDaypart()}`);return{...achievement,copy}}

/* Keep milestone achievements guaranteed, but let faction-flavor legacy awards breathe so live AI awards can surface. */
const councilLegacyAchievementFor=typeof councilAchievementFor==='function'?councilAchievementFor:null;
if(councilLegacyAchievementFor){councilAchievementFor=function(ctx,afterHistory){const achievement=councilLegacyAchievementFor(ctx,afterHistory);if(!achievement)return null;const guaranteed=new Set(['THE DEFINITION OF INSANITY','DEJA VU PROTOCOL','REPEAT OFFENDER','THE TOKEN KNOWS YOUR NAME']);if(guaranteed.has(String(achievement.title||'').toUpperCase()))return achievement;const hash=typeof councilHash==='function'?councilHash(`${ctx.seed}|${ctx.playerKey}|${ctx.faction}|legacy-flavor`):Math.floor(Math.random()*100000);return hash%100<48?achievement:null}}

function councilUiRenderAchievement(achievement,label='ACHIEVEMENT UNLOCKED!!'){const el=document.querySelector('#intelAchievement');if(!el)return;const normalized=councilNormalizeAchievement(achievement);if(!normalized?.title){el.hidden=true;el.innerHTML='';el.classList.remove('council-issued','council-ach-pop');return}el.hidden=false;el.classList.add('council-issued');el.classList.remove('council-ach-pop');el.innerHTML=`<div class="intel-ach-burst">ACHIEVEMENT UNLOCKED!!</div><div class="intel-ach-label">${councilUiEsc(label)}</div><div class="intel-ach-title">${councilUiEsc(normalized.title)}</div>${normalized.copy?`<div class="intel-ach-copy">${councilUiEsc(normalized.copy)}</div>`:''}`}

const councilDynamicPick=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){const official=councilNormalizeAchievement(achievement||result?.achievement||null);councilDynamicPick(result,ctx,official,done);councilUiApplyHeadline(result,'Council Transmission');if(official)councilUiRenderAchievement(official,achievement?'COUNCIL RECORD // FILED':'COUNCIL RECORD // SPONTANEOUS')};

const councilDynamicOpening=showCouncilOpening;
showCouncilOpening=function(result,ctx,done){councilDynamicOpening(result,ctx,done);councilUiApplyHeadline(result,'Council Transmission');if(result?.achievement)councilUiRenderAchievement(councilNormalizeAchievement(result.achievement),'COUNCIL RECORD // SESSION')};

const councilDynamicVerdict=showCouncilVerdict;
showCouncilVerdict=function(result,ctx,done){councilDynamicVerdict(result,ctx,done);councilUiApplyHeadline(result,'Council Transmission');if(result?.achievement)councilUiRenderAchievement(councilNormalizeAchievement(result.achievement),'COUNCIL RECORD // RULING')};
