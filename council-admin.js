/* Council archive profile deletion + stacked achievement sequence. */

function councilDeleteProfile(profileId){
  const store=councilLoadStore(),profile=(store.profiles||[]).find(p=>p.id===profileId);if(!profile)return null;
  const active=state?.councilSessionId?(store.sessions||[]).find(s=>s.id===state.councilSessionId):null;
  if(document.body.classList.contains('drafting')&&active?.players?.some(p=>p.profileId===profileId))return{blocked:true,profile};
  store.profiles=(store.profiles||[]).filter(p=>p.id!==profileId);
  store.events=(store.events||[]).filter(e=>e.playerId!==profileId&&e.playerKey!==profileId);
  delete store.achievements[profileId];
  store.sessions=(store.sessions||[]).map(session=>{
    if(!(session.players||[]).some(p=>p.profileId===profileId))return session;
    session.players=(session.players||[]).filter(p=>p.profileId!==profileId);
    if(session.winnerId===profileId){session.status='drafted';session.completedAt=null;session.winnerId=null;session.winnerName=null;session.winnerVp=null}
    return session;
  }).filter(session=>(session.players||[]).length>0);
  if(typeof councilRebuildResultAchievements==='function')councilRebuildResultAchievements(store);
  councilSaveStore(store);return{blocked:false,profile};
}

const councilProfileAdminBaseRender=typeof councilRenderArchive==='function'?councilRenderArchive:null;
if(councilProfileAdminBaseRender){
  councilRenderArchive=function(){
    councilProfileAdminBaseRender();
    const root=$('#councilArchive'),store=councilLoadStore();if(!root)return;
    root.querySelectorAll('[data-alias-profile]').forEach(aliasBtn=>{
      const profile=store.profiles.find(p=>p.id===aliasBtn.dataset.aliasProfile),card=aliasBtn.closest('.profile-card');if(!profile||!card||card.querySelector('[data-delete-profile]'))return;
      const btn=document.createElement('button');btn.className='profile-alias-btn archive-danger';btn.dataset.deleteProfile=profile.id;btn.textContent='Delete Dossier';btn.title=`Permanently remove ${profile.displayName} from Council memory`;
      btn.onclick=()=>{
        const liveStore=councilLoadStore(),current=liveStore.profiles.find(p=>p.id===profile.id);if(!current){councilRenderArchive();return}
        const active=state?.councilSessionId?(liveStore.sessions||[]).find(s=>s.id===state.councilSessionId):null;
        if(document.body.classList.contains('drafting')&&active?.players?.some(p=>p.profileId===profile.id)){toast('Cannot delete an active delegation mid-draft');return}
        const h=councilHistoryFor(profile.id),warning=`Delete ${current.displayName}'s Council dossier?\n\nThis permanently removes this player profile, ${h.total||0} recorded draft pick${h.total===1?'':'s'}, their stored achievements, and their references inside saved Council sessions. Other player dossiers remain intact.`;
        if(!confirm(warning))return;
        const result=councilDeleteProfile(profile.id);if(!result||result.blocked){toast('Council refused the deletion while this delegation is active');return}
        toast(`${result.profile.displayName} erased from Council memory`);councilRenderArchive();
      };
      card.appendChild(btn);
    });
  };
}

/* Stacking removes the need to suppress legacy faction awards. */
try{if(typeof councilLegacyAchievementFor==='function')councilAchievementFor=councilLegacyAchievementFor}catch(e){}

/* Chris + Arborec is established table lore, not a generic plant joke. */
const councilAchievementBeforeChrisPlant=typeof councilAchievementFor==='function'?councilAchievementFor:null;
if(councilAchievementBeforeChrisPlant){
  councilAchievementFor=function(ctx,afterHistory){
    const player=String(ctx?.player||'').trim().toLowerCase();
    if(ctx?.faction==='The Arborec'&&(player==='chris'||player==='chris collins'))return{title:"I'M JUST A PLANT",copy:'Chris has selected Arborec and invoked the ancient strategic defense: “I’m just a plant.”'};
    return councilAchievementBeforeChrisPlant(ctx,afterHistory);
  };
}

function councilAchievementSame(a,b){return Boolean(a?.title&&b?.title&&String(a.title).trim().toLowerCase()===String(b.title).trim().toLowerCase())}
function councilAchievementStack(result,primary){
  const normalize=a=>typeof councilNormalizeAchievement==='function'?councilNormalizeAchievement(a):a;
  const ai=normalize(result?.achievement||null),first=normalize(primary||ai||null),items=[];
  const add=(achievement,label)=>{if(!achievement?.title||items.some(x=>councilAchievementSame(x.achievement,achievement)))return;items.push({achievement,label})};
  if(first)add(first,ai&&councilAchievementSame(first,ai)?'COUNCIL RECORD // SPONTANEOUS':'COUNCIL RECORD // FILED');
  if(ai)add(ai,'COUNCIL RECORD // SPONTANEOUS');
  return items.slice(0,2);
}

const councilSingleAchievementSpeaker=typeof councilSpeakWithAchievement==='function'?councilSpeakWithAchievement:null;
if(councilSingleAchievementSpeaker){
  councilSpeakWithAchievement=function(result,mode,textEl,achievementEl,achievement){
    const stack=councilAchievementStack(result,achievement);if(stack.length<=1)return councilSingleAchievementSpeaker(result,mode,textEl,achievementEl,stack[0]?.achievement||null);
    const text=String(result?.text||'').trim(),sync=councilVoiceEnabled&&Boolean(text),speeches=stack.map(item=>councilAchievementSpeech(item.achievement));
    if(sync)councilVoiceHold(textEl);else councilVoiceReveal(textEl);councilAchievementHold(achievementEl);
    const prepared=speeches.map(s=>councilVoiceEnabled?councilFetchSpeechBytes(s,'achievement').catch(e=>{console.warn('Council stacked achievement prefetch unavailable',e);return null}):null);
    const showItem=index=>{const item=stack[index];councilUiRenderAchievement(item.achievement,item.label);councilAchievementReveal(achievementEl)};
    const speakItem=index=>{
      if(index>=stack.length){councilAchievementHold(achievementEl);councilRestoreMusic();return}
      councilAchievementHold(achievementEl);
      councilSpeak(speeches[index],'achievement',()=>{
        if(index+1<stack.length){councilAchievementHold(achievementEl);setTimeout(()=>speakItem(index+1),140)}else councilRestoreMusic();
      },()=>showItem(index),()=>{
        showItem(index);if(index+1<stack.length)setTimeout(()=>{councilAchievementHold(achievementEl);showItem(index+1)},1050);else councilRestoreMusic();
      },prepared[index]);
    };
    const unavailable=()=>{councilVoiceReveal(textEl);showItem(0);if(stack[1])setTimeout(()=>{councilAchievementHold(achievementEl);showItem(1)},1200)};
    councilSpeak(text,mode,()=>speakItem(0),()=>councilVoiceReveal(textEl),unavailable);
  };
}
