function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const VOICE_INSTRUCTIONS={
  opening:'Perform as an original machine-run galactic game-show administrator. Low, controlled, intelligent voice with crisp bureaucratic diction and dangerous amusement underneath. Begin composed and ceremonial, then let flashes of excitement or contempt break through when the text becomes personal. Use deliberate pauses. Sound invested in the contestants and slightly too pleased to have authority. Do not imitate any existing fictional character. Do not sound like a movie trailer narrator or a cartoon villain.',
  pick:'Perform as an original capricious machine game-show host delivering a live ruling. Dry, precise, authoritative, and emotionally volatile. If the text approves of chaos, let genuine delighted energy leak through and briefly quicken the pace. If disappointed, become colder and more bureaucratic. Land short punch lines sharply. Use subtle pauses before judgments. Do not imitate any existing fictional character.',
  verdict:'Perform as an original machine administrator giving a final pre-game ruling. Commanding, theatrical, smug, and deeply invested in the spectacle. Move between formal institutional authority and unsettling personal amusement. Give the final warning extra weight with a measured pause. Do not imitate any existing fictional character or become a generic movie trailer voice.'
};
module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key),model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'cedar'});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!key)return res.status(503).json({error:'Voice is not configured'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict'].includes(req.body?.mode)?req.body.mode:'pick';
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:process.env.OPENAI_TTS_VOICE||'cedar',input:text,instructions:VOICE_INSTRUCTIONS[mode],response_format:'mp3',speed:.96})});
    if(!r.ok){let detail='speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}return res.status(r.status).json({error:'Council voice synthesis failed',code:detail})}
    const bytes=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).send(bytes);
  }catch(e){return res.status(500).json({error:'Council voice malfunction',code:'server_error'})}
}
