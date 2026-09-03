function councilUiEsc(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function councilUiHeadline(result,fallback){const title=String(result?.title||'').trim();return title||fallback}
function councilUiDaypart(){const hour=new Date().getHours();return hour<12?'morning':hour<17?'afternoon':'evening'}
function councilNormalizeAchievement(achievement){
  if(!achievement?.title)return achievement||null;
  let copy=String(achievement.copy||'');
  copy=copy.replace(/\bStart the (?:morning|afternoon|evening|night)\b/i,`Start the ${councilUiDaypart()}`);
  return{...achievement,copy};
}
function councilUiRenderAchievement(achievement,label='ACHIEVEMENT UNLOCKED // COUNCIL RECORD'){
  const el=document.querySelector('#intelAchievement');if(!el)return;
  const normalized=councilNormalizeAchievement(achievement);
  if(!normalized?.title){el.hidden=true;el.innerHTML='';el.classList.remove('council-issued','council-ach-pop');return}
  el.hidden=false;el.classList.add('council-issued');el.classList.remove('council-ach-pop');el.innerHTML=`<div class="intel-ach-label">${councilUiEsc(label)}</div><div class="intel-ach-title">${councilUiEsc(normalized.title)}</div>${normalized.copy?`<div class="intel-ach-copy">${councilUiEsc(normalized.copy)}</div>`:''}`;
}

const councilDynamicPick=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  const official=councilNormalizeAchievement(achievement||result?.achievement||null);
  councilDynamicPick(result,ctx,official,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'Behavior Under Review');
  if(official)councilUiRenderAchievement(official,achievement?'ACHIEVEMENT UNLOCKED // COUNCIL RECORD':'COUNCIL ACHIEVEMENT // FILED');
};

const councilDynamicOpening=showCouncilOpening;
showCouncilOpening=function(result,ctx,done){
  councilDynamicOpening(result,ctx,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'The Machine Is Awake');
  if(result?.achievement)councilUiRenderAchievement(councilNormalizeAchievement(result.achievement),'COUNCIL ACHIEVEMENT // SESSION FILE');
};

const councilDynamicVerdict=showCouncilVerdict;
showCouncilVerdict=function(result,ctx,done){
  councilDynamicVerdict(result,ctx,done);
  const title=document.querySelector('.intel-title');if(title)title.textContent=councilUiHeadline(result,'Council Finding');
  if(result?.achievement)councilUiRenderAchievement(councilNormalizeAchievement(result.achievement),'ACHIEVEMENT UNLOCKED // COUNCIL RULING');
};
