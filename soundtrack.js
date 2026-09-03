const COUNCIL_SOUNDTRACKS=[
  {name:'Event Horizon',src:'audio/event-horizon.m4a'},
  {name:'Cathedral of the Void',src:'audio/cathedral-of-the-void.m4a'}
];
const councilProceduralStart=startMusic,councilProceduralStop=stopMusic,councilProceduralUpdate=updateMusic,councilProceduralDuck=duckMusic;
let councilTrackEls=[],councilTrackSources=[],councilTrackGains=[],councilTrackIndex=0,councilCrossfading=false,councilSoundtrackReady=false,councilUsingProcedural=false;
const COUNCIL_MUSIC_GAIN=.20,COUNCIL_CROSSFADE=3.6;
function councilInitSoundtrack(){
  ensureAudio();if(councilSoundtrackReady)return true;
  try{
    musicMaster=audioCtx.createGain();musicMaster.gain.value=.0001;musicMaster.connect(audioCtx.destination);musicNodes.push(musicMaster);
    COUNCIL_SOUNDTRACKS.forEach((track,i)=>{
      const el=new Audio(track.src);el.preload='auto';el.loop=false;el.playsInline=true;
      const source=audioCtx.createMediaElementSource(el),gain=audioCtx.createGain();gain.gain.value=.0001;source.connect(gain);gain.connect(musicMaster);
      el.addEventListener('error',()=>{if(musicOn&&!councilUsingProcedural)councilFallbackToProcedural()});
      el.addEventListener('ended',()=>{if(musicOn&&!councilCrossfading&&i===councilTrackIndex)councilCrossfadeTo((i+1)%COUNCIL_SOUNDTRACKS.length,.45)});
      councilTrackEls.push(el);councilTrackSources.push(source);councilTrackGains.push(gain);
    });
    councilSoundtrackReady=true;return true;
  }catch(e){return false}
}
function councilRememberTrack(){try{localStorage.setItem('ti4-council-soundtrack-index',String(councilTrackIndex))}catch(e){}}
function councilStoredTrack(){try{return Math.abs(Number(localStorage.getItem('ti4-council-soundtrack-index')||0))%COUNCIL_SOUNDTRACKS.length}catch(e){return 0}}
function councilPlayTrack(index,fade=1.2){
  if(!councilSoundtrackReady)return Promise.reject(new Error('soundtrack_not_ready'));
  const i=(index+COUNCIL_SOUNDTRACKS.length)%COUNCIL_SOUNDTRACKS.length,el=councilTrackEls[i],gain=councilTrackGains[i],t=audioCtx.currentTime;
  councilTrackIndex=i;councilRememberTrack();
  try{el.currentTime=0}catch(e){}
  gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(1,t+Math.max(.08,fade));
  updateMusic();return el.play();
}
function councilCrossfadeTo(nextIndex,fade=COUNCIL_CROSSFADE){
  if(!musicOn||councilCrossfading||!councilSoundtrackReady)return;councilCrossfading=true;
  const oldIndex=councilTrackIndex,oldEl=councilTrackEls[oldIndex],oldGain=councilTrackGains[oldIndex],t=audioCtx.currentTime,i=(nextIndex+COUNCIL_SOUNDTRACKS.length)%COUNCIL_SOUNDTRACKS.length;
  const newEl=councilTrackEls[i],newGain=councilTrackGains[i];try{newEl.currentTime=0}catch(e){}
  newGain.gain.cancelScheduledValues(t);newGain.gain.setValueAtTime(.0001,t);newGain.gain.exponentialRampToValueAtTime(1,t+fade);
  oldGain.gain.cancelScheduledValues(t);oldGain.gain.setValueAtTime(Math.max(.0001,oldGain.gain.value),t);oldGain.gain.exponentialRampToValueAtTime(.0001,t+fade);
  councilTrackIndex=i;councilRememberTrack();updateMusic();
  newEl.play().then(()=>setTimeout(()=>{try{oldEl.pause();oldEl.currentTime=0}catch(e){}councilCrossfading=false},fade*1000+120)).catch(()=>councilFallbackToProcedural());
}
function councilSoundtrackTick(){
  if(!musicOn||councilUsingProcedural||!councilSoundtrackReady||councilCrossfading)return;const el=councilTrackEls[councilTrackIndex];
  if(Number.isFinite(el.duration)&&el.duration>0&&el.currentTime>=Math.max(0,el.duration-COUNCIL_CROSSFADE-.35))councilCrossfadeTo((councilTrackIndex+1)%COUNCIL_SOUNDTRACKS.length);
}
function councilFallbackToProcedural(){
  if(councilUsingProcedural)return;councilUsingProcedural=true;clearInterval(musicTimer);musicTimer=null;councilTrackEls.forEach(el=>{try{el.pause()}catch(e){}});
  try{musicMaster?.disconnect()}catch(e){}musicMaster=null;musicOn=false;councilProceduralStart();toast('Council soundtrack fallback engaged');
}
startMusic=function(){
  ensureAudio();if(musicOn)return;councilUsingProcedural=false;
  if(!councilInitSoundtrack()){councilFallbackToProcedural();return}
  musicOn=true;councilTrackIndex=councilStoredTrack();const t=audioCtx.currentTime;musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(.0001,t);musicMaster.gain.exponentialRampToValueAtTime(COUNCIL_MUSIC_GAIN,t+.9);
  councilPlayTrack(councilTrackIndex,1.25).catch(()=>councilFallbackToProcedural());musicTimer=setInterval(councilSoundtrackTick,250);updateMusic();
};
stopMusic=function(){
  if(councilUsingProcedural){councilUsingProcedural=false;councilProceduralStop();return}
  musicOn=false;clearInterval(musicTimer);musicTimer=null;councilCrossfading=false;if(musicMaster){const t=audioCtx.currentTime;try{musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(Math.max(.0001,musicMaster.gain.value),t);musicMaster.gain.exponentialRampToValueAtTime(.0001,t+.32)}catch(e){}}
  setTimeout(()=>councilTrackEls.forEach(el=>{try{el.pause()}catch(e){}}),360);updateMusic();
};
updateMusic=function(){
  const btn=$('#musicBtn');if(!btn)return;if(councilUsingProcedural){councilProceduralUpdate();return}
  btn.textContent=musicOn?`♪ ${COUNCIL_SOUNDTRACKS[councilTrackIndex]?.name||'Council Soundtrack'}`:'♪ Council Soundtrack Off';btn.style.color=musicOn?'var(--gold2)':'';btn.title=musicOn?'Playing the Council soundtrack • click to mute':'Play the Council soundtrack';
};
duckMusic=function(duration=4){
  if(councilUsingProcedural){councilProceduralDuck(duration);return}if(!musicOn||!musicMaster)return;const t=audioCtx.currentTime;try{musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(Math.max(.001,musicMaster.gain.value),t);musicMaster.gain.linearRampToValueAtTime(.035,t+.16);musicMaster.gain.setValueAtTime(.035,t+Math.max(.5,duration-.8));musicMaster.gain.linearRampToValueAtTime(COUNCIL_MUSIC_GAIN,t+duration)}catch(e){}
};
updateMusic();
