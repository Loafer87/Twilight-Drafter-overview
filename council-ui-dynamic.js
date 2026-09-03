function councilUiEsc(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function councilUiHeadline(result,fallback){const title=String(result?.title||'').trim();return title||fallback}
function councilUiRenderAchievement(achievement,label='ACHIEVEMENT UNLOCKED // COUNCIL RECORD'){
  const el=document.querySelector('#intelAchievement');if(!el)return;
  if(!achievement?.title){el.hidden=true;el.innerHTML='';el.classList.remove('council-issued');return}
  el.hidden=false;el.classList.add('council-issued');el.innerHTML=`<div class="intel-ach-label">${councilUiEsc(label)}</div><div class="intel-ach-title">${councilUiEsc(achievement.title)}</div>${achievement.copy?`<div class="intel-ach-copy">${councilUiEsc(achievement.copy)}</div>`:''}`;
}

const councilDynamicPick=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  const official=achievement||result?.achievement||null;
  councilDynamicPick(result,ctx,official,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'Behavior Under Review');
  if(official)councilUiRenderAchievement(official,achievement?'ACHIEVEMENT UNLOCKED // COUNCIL RECORD':'COUNCIL ACHIEVEMENT // FILED');
};

const councilDynamicOpening=showCouncilOpening;
showCouncilOpening=function(result,ctx,done){
  councilDynamicOpening(result,ctx,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'The Machine Is Awake');
  if(result?.achievement)councilUiRenderAchievement(result.achievement,'COUNCIL ACHIEVEMENT // SESSION FILE');
};

const councilDynamicVerdict=showCouncilVerdict;
showCouncilVerdict=function(result,ctx,done){
  councilDynamicVerdict(result,ctx,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'Council Finding');
  if(result?.achievement)councilUiRenderAchievement(result.achievement,'ACHIEVEMENT UNLOCKED // COUNCIL RULING');
};
