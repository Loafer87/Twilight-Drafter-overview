function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const VOICE_INSTRUCTIONS={
  opening:'Perform as an original machine-run galactic game-show administrator. Dark, controlled, intelligent voice with crisp bureaucratic diction, dry contempt, and dangerous amusement underneath. Do not sound warm or reassuring. Begin eerily composed, then allow sudden flashes of manic delight when the text becomes entertaining. Let profanity land bluntly and naturally rather than politely. Use deliberate pauses before names, accusations, and rulings. Occasionally accelerate for one excited sentence, then snap immediately back to cold institutional control. Sound like a machine that has been waiting all day for these idiots to entertain it. Do not imitate any existing fictional character. Do not sound like a movie trailer narrator or a cartoon villain.',
  pick:'Perform as an original capricious machine game-show host issuing a live ruling. Dark, sharp, precise, and emotionally unstable in a controlled way. Default to dry bureaucratic authority, but when the text approves of chaos, let genuine almost-unprofessional excitement break through. When disappointed, become clipped, icy, and personally offended. Deliver strong profanity plainly and with conviction when it appears; do not soften it or turn it into comedy-announcer shouting. Hit short punch lines hard. Use tense pauses before judgments, sanctions, and direct addresses. You are enjoying this more than is professionally acceptable. Do not imitate any existing fictional character.',
  verdict:'Perform as an original machine administrator delivering a final pre-game ruling. Commanding, darkly theatrical, smug, volatile, and deeply invested in the spectacle. Start with controlled institutional authority, then gradually let fascination, disgust, and delighted alarm leak through. Strong profanity should sound like an involuntary crack in the bureaucracy, not casual chatter. Shift pace when excitement spikes, then recover into unsettling calm. Give the final warning extra weight with a long measured pause. Do not imitate any existing fictional character or become a generic movie trailer voice.'
};
module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key),model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'onyx'});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!key)return res.status(503).json({error:'Voice is not configured'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict'].includes(req.body?.mode)?req.body.mode:'pick';
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'onyx',input:text,instructions:VOICE_INSTRUCTIONS[mode],response_format:'mp3',speed:.98})});
    if(!r.ok){let detail='speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}return res.status(r.status).json({error:'Council voice synthesis failed',code:detail})}
    const bytes=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).send(bytes);
  }catch(e){return res.status(500).json({error:'Council voice malfunction',code:'server_error'})}
}
