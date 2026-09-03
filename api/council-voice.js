function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const COUNCIL_VOICE='ballad';
const MODE_SPEED={opening:1.15,pick:1.18,verdict:1.14,achievement:1.20};
const VOICE_INSTRUCTIONS={
  opening:'Perform as an original futuristic game-show system announcer with premium broadcast confidence, but in a brighter, slightly higher vocal register rather than a deep narrator voice. Crisp, fast, intelligent, theatrical, smug, and intensely alert. Keep the baseline cadence brisk and energetic. The first impression should feel like an expensive galaxy-wide competition broadcast hosted by a machine that is already a little too excited to see these contestants again. Underneath the polish, let creepy personal fascination and impatience leak through. As the text becomes petty, profane, obsessive, or delighted, let the professional facade crack: accelerate slightly, sharpen the diction, and sound almost unprofessionally thrilled. Strong profanity should land casually and clearly. Use short broadcast pauses before names, rulings, and punch lines, but never become slow, low, soothing, ominous, or movie-trailer-like. Do not imitate any existing fictional character or narrator.',
  pick:'Perform as an original corrupted game-show system issuing a live ruling in a brighter, slightly higher register with quick, sharp cadence. Start polished and authoritative, then let the machine become visibly too interested in the decision. Swing rapidly between premium announcer confidence, creepy fascination, sarcastic contempt, bureaucratic irritation, and sudden giddy excitement. When chaos pleases you, speed up briefly and sound genuinely fucking delighted. When bored, become clipped and administratively offended rather than deep or grave. Profanity should sound spontaneous, natural, and satisfying. Hit short punch lines hard with minimal pause. The listener should feel a slick galactic announcer failing to remain professionally detached because these idiots are finally entertaining it. Do not imitate any existing fictional character.',
  verdict:'Perform as an original galaxy-wide competition announcer in a brighter, slightly higher register with brisk confident pacing. Smug, theatrical, animated, petty, and deeply invested in the spectacle. Begin controlled and prestigious, then escalate through delighted alarm, personal fascination, offended disbelief, and profanity without slowing into ominous narration. Give names and accusations extra weight with short clean pauses. Accelerate slightly when the table becomes more chaotic. The final ruling should still feel official, but the machine should sound like it enjoyed delivering it far too much. Do not imitate any existing fictional character or narrator.',
  achievement:'This is a special game-show achievement announcement. Go completely over the top. Use a bright, high-energy broadcast register with explosive enthusiasm. Begin with a huge triumphant cry of NEW ACHIEVEMENT! Make it celebratory, excessive, intrusive, and slightly disturbing, as though this achievement has hijacked the entire galactic broadcast. Hit the achievement title with ridiculous prestige and a tiny dramatic pause. Then deliver the description faster with gleeful personal amusement, like the system has been waiting specifically to embarrass or reward this contestant. Energetic, sharp, grand, unreasonably enthusiastic, and just a little creepy. Do not imitate any existing fictional character or specific performance beyond the supplied words.'
};
module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key),model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,speeds:MODE_SPEED});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!key)return res.status(503).json({error:'Voice is not configured'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict','achievement'].includes(req.body?.mode)?req.body.mode:'pick';
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,input:text,instructions:VOICE_INSTRUCTIONS[mode],response_format:'mp3',speed:MODE_SPEED[mode]})});
    if(!r.ok){let detail='speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}return res.status(r.status).json({error:'Council voice synthesis failed',code:detail})}
    const bytes=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).send(bytes);
  }catch(e){return res.status(500).json({error:'Council voice malfunction',code:'server_error'})}
}
