const COUNCIL_VOICE_KEY='ti4-council-ai-voice-v1';
const COUNCIL_VOICE_VOLUME_KEY='ti4-council-ai-voice-volume-v1';
const COUNCIL_VOICE_API=location.hostname==='loafer87.github.io'?'https://twilight-drafter-overview.vercel.app/api/council-voice':'/api/council-voice';
let councilVoiceEnabled=localStorage.getItem(COUNCIL_VOICE_KEY)!=='off';
let councilVoiceVolume=Math.max(.5,Math.min(1.5,Number(localStorage.getItem(COUNCIL_VOICE_VOLUME_KEY))||1.10));
let councilVoiceSource=null,councilVoiceGain=null,councilVoiceController=null,councilVoiceRequest=0;

function councilUpdateVoiceButton(){const btn=$('#voiceBtn');if(!btn)return;btn.textContent=councilVoiceEnabled?'◉ AI Voice On':'◯ AI Voice Off';btn.style.color=councilVoiceEnabled?'var(--gold2)':'';btn.setAttribute('aria-pressed',councilVoiceEnabled?'true':'false');btn.title='Council speech is AI-generated, not a human recording.';const control=$('.voice-volume-control');if(control)control.classList.toggle('muted',!councilVoiceEnabled)}
function councilEnsureVolumeControl(){const btn=$('#voiceBtn');if(!btn||$('.voice-volume-control'))return;const wrap=document.createElement('label');wrap.className='voice-volume-control';wrap.title='Council AI voice playback volume';wrap.innerHTML=`<span id="voiceVolumeLabel">Voice ${Math.round(councilVoiceVolume*100)}%</span><input id="voiceVolume" type="range" min="50" max="150" step="5" value="${Math.round(councilVoiceVolume*100)}" aria-label="Council AI voice volume">`;btn.insertAdjacentElement('afterend',wrap);const slider=$('#voiceVolume');slider.addEventListener('input',()=>{councilVoiceVolume=Math.max(.5,Math.min(1.5,Number(slider.value)/100));localStorage.setItem(COUNCIL_VOICE_VOLUME_KEY,String(councilVoiceVolume));$('#voiceVolumeLabel').textContent=`Voice ${Math.round(councilVoiceVolume*100)}%`;if(councilVoiceGain&&audioCtx){const t=audioCtx.currentTime;councilVoiceGain.gain.cancelScheduledValues(t);councilVoiceGain.gain.setTargetAtTime(councilVoiceVolume,t,.025)}})}
function councilRestoreMusic(){if(typeof restoreMusic==='function'){restoreMusic();return}if(!musicOn||!musicMaster||!audioCtx)return;try{const t=audioCtx.currentTime;musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(Math.max(.001,musicMaster.gain.value),t);musicMaster.gain.linearRampToValueAtTime(.16,t+.45)}catch(e){}}
function councilStopVoice(restore=true){councilVoiceRequest++;if(councilVoiceController){try{councilVoiceController.abort()}catch(e){}councilVoiceController=null}if(councilVoiceSource){try{councilVoiceSource.stop()}catch(e){}try{councilVoiceSource.disconnect()}catch(e){}councilVoiceSource=null}if(councilVoiceGain){try{councilVoiceGain.disconnect()}catch(e){}councilVoiceGain=null}$('#councilIntel')?.classList.remove('voice-speaking','voice-loading');if(restore)councilRestoreMusic()}
async function councilSpeak(text,mode='pick',onEnded=null){
  if(!councilVoiceEnabled||!String(text||'').trim())return;
  councilStopVoice(false);const requestId=++councilVoiceRequest,el=$('#councilIntel');el?.classList.add('voice-loading');
  const controller=new AbortController();councilVoiceController=controller;
  try{
    const r=await fetch(COUNCIL_VOICE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).trim(),mode}),signal:controller.signal});
    if(!r.ok)throw new Error(`voice_${r.status}`);const bytes=await r.arrayBuffer();if(requestId!==councilVoiceRequest||!councilVoiceEnabled)return;
    ensureAudio();const buffer=await audioCtx.decodeAudioData(bytes.slice(0));if(requestId!==councilVoiceRequest||!councilVoiceEnabled)return;
    const source=audioCtx.createBufferSource(),gain=audioCtx.createGain(),comp=audioCtx.createDynamicsCompressor();gain.gain.value=Math.min(1.5,councilVoiceVolume*(mode==='achievement'?1.06:1));comp.threshold.value=-8;comp.knee.value=8;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.16;source.buffer=buffer;source.connect(gain);gain.connect(comp);comp.connect(audioCtx.destination);councilVoiceSource=source;councilVoiceGain=gain;councilVoiceController=null;
    el?.classList.remove('voice-loading');el?.classList.add('voice-speaking');duckMusic(Math.max(3.5,buffer.duration+.8));source.onended=()=>{if(councilVoiceSource===source)councilVoiceSource=null;if(councilVoiceGain===gain)councilVoiceGain=null;el?.classList.remove('voice-speaking');if(typeof onEnded==='function'&&councilVoiceEnabled){setTimeout(onEnded,160)}else councilRestoreMusic()};source.start();
  }catch(e){if(e?.name==='AbortError')return;el?.classList.remove('voice-loading','voice-speaking');councilVoiceController=null;console.warn('Council voice unavailable',e);councilRestoreMusic();toast('AI voice uplink unavailable • text mode continues')}
}
function councilToggleVoice(){councilVoiceEnabled=!councilVoiceEnabled;localStorage.setItem(COUNCIL_VOICE_KEY,councilVoiceEnabled?'on':'off');if(!councilVoiceEnabled)councilStopVoice();councilUpdateVoiceButton();toast(councilVoiceEnabled?'AI-generated Council voice enabled':'Council voice muted')}
function councilAchievementSpeech(achievement){if(!achievement)return'';return `NEW ACHIEVEMENT! ${achievement.title}. ${achievement.copy}`}

const councilVoiceBasePick=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  councilVoiceBasePick(result,ctx,achievement,()=>{councilStopVoice();done()});
  const achievementSpeech=councilAchievementSpeech(achievement);
  councilSpeak(result.text,'pick',achievementSpeech?()=>councilSpeak(achievementSpeech,'achievement'):null);
};
const councilVoiceBaseOpening=showCouncilOpening;
showCouncilOpening=function(result,ctx,done){councilVoiceBaseOpening(result,ctx,()=>{councilStopVoice();done()});councilSpeak(result.text,'opening')};
const councilVoiceBaseVerdict=showCouncilVerdict;
showCouncilVerdict=function(result,ctx,done){councilVoiceBaseVerdict(result,ctx,()=>{councilStopVoice();done()});councilSpeak(result.text,'verdict')};

councilEnsureVolumeControl();
$('#voiceBtn')?.addEventListener('click',councilToggleVoice);councilUpdateVoiceButton();
