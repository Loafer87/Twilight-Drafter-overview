const COUNCIL_STORE_KEY='ti4-council-store-v2';
const COUNCIL_LEGACY_KEY='ti4-council-memory-v1';
function councilNormalizeName(name){return String(name||'').trim().toLowerCase().replace(/\s+/g,' ')}
function councilNewId(prefix='id'){try{return `${prefix}_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`}catch(e){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}}
function councilEmptyStore(){return{version:2,profiles:[],events:[],achievements:{},sessions:[]}}
function councilLoadStore(){
  try{
    const raw=JSON.parse(localStorage.getItem(COUNCIL_STORE_KEY)||'null');
    if(raw&&raw.version===2&&Array.isArray(raw.profiles)&&Array.isArray(raw.events)&&Array.isArray(raw.sessions)){raw.achievements=raw.achievements||{};return raw}
  }catch(e){}
  return councilMigrateLegacy();
}
function councilSaveStore(store){try{localStorage.setItem(COUNCIL_STORE_KEY,JSON.stringify(store))}catch(e){}}
function councilMigrateLegacy(){
  const store=councilEmptyStore();let old=null;
  try{old=JSON.parse(localStorage.getItem(COUNCIL_LEGACY_KEY)||'null')}catch(e){}
  if(old&&Array.isArray(old.events)){
    const profileFor=(name,key)=>{
      const norm=councilNormalizeName(name||key||'Unknown');
      let p=store.profiles.find(x=>x.aliasKeys.includes(norm));
      if(!p){p={id:councilNewId('p'),displayName:String(name||key||'Unknown').trim()||'Unknown',aliases:[String(name||key||'Unknown').trim()||'Unknown'],aliasKeys:[norm],createdAt:Date.now()};store.profiles.push(p)}
      return p;
    };
    old.events.forEach(e=>{const p=profileFor(e.player,e.playerKey);store.events.push({...e,playerId:p.id,player:p.displayName,playerKey:p.id})});
    Object.entries(old.achievements||{}).forEach(([legacyKey,list])=>{const event=old.events.find(e=>e.playerKey===legacyKey),p=profileFor(event?.player||legacyKey,legacyKey);store.achievements[p.id]=(list||[]).map(a=>({...a,source:a.source||'legacy'}))});
  }
  councilSaveStore(store);
  try{if(old)localStorage.removeItem(COUNCIL_LEGACY_KEY)}catch(e){}
  return store;
}
function councilFindProfile(store,nameOrId){
  const raw=String(nameOrId||'').trim();if(!raw)return null;
  const direct=store.profiles.find(p=>p.id===raw);if(direct)return direct;
  const key=councilNormalizeName(raw);return store.profiles.find(p=>(p.aliasKeys||[]).includes(key)||councilNormalizeName(p.displayName)===key)||null;
}
function councilResolveProfile(name,create=true){
  const store=councilLoadStore();let p=councilFindProfile(store,name);if(p||!create)return p;
  const displayName=String(name||'Unknown').trim()||'Unknown',key=councilNormalizeName(displayName);
  p={id:councilNewId('p'),displayName,aliases:[displayName],aliasKeys:[key],createdAt:Date.now()};store.profiles.push(p);councilSaveStore(store);return p;
}
function councilProfileName(id){const store=councilLoadStore(),p=councilFindProfile(store,id);return p?.displayName||String(id||'Unknown')}
function councilPlayerKey(name){return councilResolveProfile(name,true).id}
function councilLoadMemory(){const s=councilLoadStore();return{events:s.events,achievements:s.achievements}}
function councilSaveMemory(m){const s=councilLoadStore();if(Array.isArray(m?.events))s.events=m.events;if(m?.achievements)s.achievements=m.achievements;councilSaveStore(s)}
function councilCompletedSessionsFor(profileId){return councilLoadStore().sessions.filter(s=>s.status==='complete'&&(s.players||[]).some(p=>p.profileId===profileId)).sort((a,b)=>(b.completedAt||b.startedAt||0)-(a.completedAt||a.startedAt||0))}
function councilHistoryFor(playerOrId){
  const store=councilLoadStore(),profile=councilFindProfile(store,playerOrId)||councilResolveProfile(playerOrId,true),events=store.events.filter(e=>e.playerId===profile.id||e.playerKey===profile.id);
  const games=store.sessions.filter(s=>s.status==='complete'&&(s.players||[]).some(p=>p.profileId===profile.id)).sort((a,b)=>(b.completedAt||b.startedAt||0)-(a.completedAt||a.startedAt||0));
  const wins=games.filter(s=>s.winnerId===profile.id),last=games[0]||null;let winStreak=0;for(const game of games){if(game.winnerId===profile.id)winStreak++;else break}
  const lastSeat=last?.players?.find(p=>p.profileId===profile.id);
  return{profile,events,total:events.length,factions:events.reduce((a,e)=>(a[e.faction]=(a[e.faction]||0)+1,a),{}),speakerCount:events.filter(e=>e.speaker).length,achievements:store.achievements[profile.id]||[],games:games.length,wins:wins.length,winRate:games.length?Math.round((wins.length/games.length)*100):0,winStreak,lastGame:last?{date:last.completedAt||last.startedAt,faction:lastSeat?.faction||null,won:last.winnerId===profile.id,winnerName:last.winnerName||councilProfileName(last.winnerId),vp:last.winnerVp??null,note:last.note||''}:null};
}
function councilContext(a,f){
  const player=playerName(a.playerIdx),history=councilHistoryFor(player),profile=history.profile;
  return{seed:state.seed,sessionId:state.councilSessionId||null,player:profile.displayName,playerId:profile.id,playerKey:profile.id,pickNumber:state.current+1,totalPlayers:state.players,speaker:state.current===0,faction:f.name,tag:f.tag,blurb:f.blurb,expansion:E[f.exp]?.name||f.exp,offered:a.options.map(x=>x.name),rejected:a.options.filter(x=>x.name!==f.name).map(x=>x.name),alreadyPicked:state.picks.map(p=>({player:playerName(p.playerIdx),faction:p.faction.name,pick:p.pos+1})),history:{totalDraftPicks:history.total,factions:history.factions,speakerCount:history.speakerCount,achievements:history.achievements,games:history.games,wins:history.wins,winRate:history.winRate,winStreak:history.winStreak,lastGame:history.lastGame}};
}
function councilEventId(ctx){return`${ctx.sessionId||ctx.seed}|${ctx.pickNumber}|${ctx.playerId||ctx.playerKey}`}
function councilCurrentSession(store=councilLoadStore()){return state.councilSessionId?store.sessions.find(s=>s.id===state.councilSessionId)||null:null}
function councilStartSession(){
  const store=councilLoadStore(),id=councilNewId('s');state.councilSessionId=id;
  const players=state.assignments.map((a,i)=>{const p=councilResolveProfile(playerName(a.playerIdx),true);return{profileId:p.id,name:p.displayName,order:i+1,speaker:i===0,faction:null}});
  store.sessions.push({id,seed:state.seed,startedAt:Date.now(),completedAt:null,status:'drafted',expansions:[...state.exp],players,winnerId:null,winnerName:null,winnerVp:null,note:''});councilSaveStore(store);return id;
}
function councilSyncSessionPick(ctx,faction){const store=councilLoadStore(),session=store.sessions.find(s=>s.id===(ctx.sessionId||state.councilSessionId));if(!session)return;const seat=session.players.find(p=>p.profileId===(ctx.playerId||ctx.playerKey));if(seat)seat.faction=faction||null;councilSaveStore(store)}
function councilRecordPick(ctx){
  const store=councilLoadStore(),id=councilEventId(ctx),pid=ctx.playerId||ctx.playerKey;store.events=store.events.filter(e=>e.id!==id);(store.achievements[pid]||[]).filter(a=>a.sourceEventId===id).forEach(()=>{});store.achievements[pid]=(store.achievements[pid]||[]).filter(a=>a.sourceEventId!==id);
  store.events.push({id,sessionId:ctx.sessionId||state.councilSessionId||null,seed:ctx.seed,player:ctx.player,playerId:pid,playerKey:pid,faction:ctx.faction,pickNumber:ctx.pickNumber,speaker:ctx.speaker,ts:Date.now()});if(store.events.length>500)store.events=store.events.slice(-500);councilSaveStore(store);councilSyncSessionPick(ctx,ctx.faction);
  const h=councilHistoryFor(pid),achievement=councilAchievementFor(ctx,h);if(achievement){const fresh=councilLoadStore(),list=fresh.achievements[pid]||[];if(!list.some(x=>x.title===achievement.title)){list.push({...achievement,source:'draft',sourceEventId:id,ts:Date.now()});fresh.achievements[pid]=list;councilSaveStore(fresh);return achievement}}return null;
}
function councilForgetPick(id){
  if(!id)return;const store=councilLoadStore(),event=store.events.find(e=>e.id===id);store.events=store.events.filter(e=>e.id!==id);if(event){store.achievements[event.playerId]=(store.achievements[event.playerId]||[]).filter(a=>a.sourceEventId!==id);const session=store.sessions.find(s=>s.id===event.sessionId);const seat=session?.players?.find(p=>p.profileId===event.playerId);if(seat)seat.faction=null}councilSaveStore(store);
}
function councilUpdateSessionRoster(){const store=councilLoadStore(),session=councilCurrentSession(store);if(!session)return;state.picks.forEach(p=>{const profile=councilResolveProfile(playerName(p.playerIdx),true),seat=session.players.find(x=>x.profileId===profile.id);if(seat)seat.faction=p.faction.name});councilSaveStore(store)}
function councilRebuildResultAchievements(store){
  Object.keys(store.achievements).forEach(pid=>store.achievements[pid]=(store.achievements[pid]||[]).filter(a=>a.source!=='session'));
  const streaks={};[...store.sessions].filter(s=>s.status==='complete'&&s.winnerId).sort((a,b)=>(a.completedAt||a.startedAt||0)-(b.completedAt||b.startedAt||0)).forEach(s=>{
    (s.players||[]).forEach(p=>{if(p.profileId===s.winnerId)streaks[p.profileId]=(streaks[p.profileId]||0)+1;else streaks[p.profileId]=0});
    const pid=s.winnerId;if((streaks[pid]||0)===2){const list=store.achievements[pid]||[];if(!list.some(a=>a.title==='GOLDEN BANANA DYNASTY'))list.push({title:'GOLDEN BANANA DYNASTY',copy:'Win two recorded Council sessions in a row. The fruit has become hereditary.',source:'session',sourceSessionId:s.id,ts:s.completedAt||Date.now()});store.achievements[pid]=list}
  });
}
function councilCompleteSession(sessionId,{winnerId,vp=null,note=''}){const store=councilLoadStore(),session=store.sessions.find(s=>s.id===sessionId);if(!session)return null;const winner=session.players.find(p=>p.profileId===winnerId);if(!winner)return null;session.status='complete';session.completedAt=Date.now();session.winnerId=winnerId;session.winnerName=winner.name;session.winnerVp=vp===''||vp==null?null:Number(vp);session.note=String(note||'').trim().slice(0,500);councilRebuildResultAchievements(store);councilSaveStore(store);return session}
function councilAddAlias(profileId,alias){
  const clean=String(alias||'').trim(),key=councilNormalizeName(clean);if(!clean||!key)return false;const store=councilLoadStore(),target=store.profiles.find(p=>p.id===profileId);if(!target)return false;const source=store.profiles.find(p=>p.id!==profileId&&((p.aliasKeys||[]).includes(key)||councilNormalizeName(p.displayName)===key));
  if(source){store.events.forEach(e=>{if(e.playerId===source.id||e.playerKey===source.id){e.playerId=target.id;e.playerKey=target.id;e.player=target.displayName}});store.sessions.forEach(s=>{s.players?.forEach(p=>{if(p.profileId===source.id){p.profileId=target.id;p.name=target.displayName}});if(s.winnerId===source.id){s.winnerId=target.id;s.winnerName=target.displayName}});store.achievements[target.id]=[...(store.achievements[target.id]||[]),...(store.achievements[source.id]||[])].filter((a,i,arr)=>arr.findIndex(x=>x.title===a.title)===i);delete store.achievements[source.id];target.aliases=[...(target.aliases||[]),source.displayName,...(source.aliases||[])];store.profiles=store.profiles.filter(p=>p.id!==source.id)}
  target.aliases=[...(target.aliases||[]),clean].filter((a,i,arr)=>arr.findIndex(x=>councilNormalizeName(x)===councilNormalizeName(a))===i);target.aliasKeys=target.aliases.map(councilNormalizeName);councilRebuildResultAchievements(store);councilSaveStore(store);return true;
}
function councilClearTestRecords(){const store=councilLoadStore(),isTest=p=>[p.displayName,...(p.aliases||[])].some(n=>/^test(?:\s*\d+)?$/i.test(String(n).trim())||/^test\d+$/i.test(String(n).trim())),ids=new Set(store.profiles.filter(isTest).map(p=>p.id));if(!ids.size)return 0;store.events=store.events.filter(e=>!ids.has(e.playerId));store.sessions=store.sessions.filter(s=>!(s.players||[]).some(p=>ids.has(p.profileId)));ids.forEach(id=>delete store.achievements[id]);store.profiles=store.profiles.filter(p=>!ids.has(p.id));councilRebuildResultAchievements(store);councilSaveStore(store);return ids.size}
function councilWipeAllMemory(){councilSaveStore(councilEmptyStore());state.councilSessionId=null}
