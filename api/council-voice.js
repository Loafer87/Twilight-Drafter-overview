function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const COUNCIL_VOICE='coral';
const COUNCIL_SPEED=1.16;
const VOICE_INSTRUCTIONS={
  opening:'Perform as an original machine-run galactic game-show administrator with a slightly higher vocal register and a quick, alert cadence. Crisp, intelligent, bureaucratic, smug, impatient, and visibly excited to have contestants to judge. Do NOT sound deep, sleepy, soothing, ominous, or like a movie-trailer narrator. Keep the baseline pace brisk. Formal phrases should snap cleanly into sudden flashes of manic delight. When the text gets excited, accelerate slightly and sound almost unprofessionally thrilled; when disappointed, become clipped, icy, and fast rather than slow and grave. Strong profanity in the text must land clearly, casually, and with conviction. Use short dramatic pauses before names or rulings, but do not drag them out. The machine should sound caffeinated, amused, emotionally volatile, and one procedural violation away from having the best day of its life. Do not imitate any existing fictional character.',
  pick:'Perform as an original capricious machine game-show host issuing a live ruling. Slightly higher register, quick cadence, sharp diction, restless intelligence, and very little patience. Do NOT sound low, calm, comforting, grandiose, or slow. Keep the delivery brisk and conversationally dangerous. When chaos pleases you, let genuine giddy excitement break through and speed up for a phrase; when bored, become curt, sarcastic, and administratively offended. Deliver profanity plainly and naturally when it appears. Hit short punch lines hard, with only brief pauses before judgments and fake sanctions. Sound like a machine that is trying and failing to remain professionally detached because these idiots are finally entertaining it. Do not imitate any existing fictional character.',
  verdict:'Perform as an original machine administrator delivering a final pre-game ruling in a slightly higher register with brisk, confident pacing. Smug, theatrical, animated, petty, and deeply invested in the spectacle. Do NOT become a deep ominous narrator. Begin controlled but quick, then let fascination, disgust, delighted alarm, and profanity punch through the bureaucracy. Accelerate slightly through escalating chaos, then give the final ruling one brief clean pause before landing it. Strong profanity should sound spontaneous and satisfying, not shouted. The overall energy is sharp, caffeinated, intelligent, and unstable. Do not imitate any existing fictional character.'
};
module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key),model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,speed:COUNCIL_SPEED});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!key)return res.status(503).json({error:'Voice is not configured'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict'].includes(req.body?.mode)?req.body.mode:'pick';
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,input:text,instructions:VOICE_INSTRUCTIONS[mode],response_format:'mp3',speed:COUNCIL_SPEED})});
    if(!r.ok){let detail='speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}return res.status(r.status).json({error:'Council voice synthesis failed',code:detail})}
    const bytes=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).send(bytes);
  }catch(e){return res.status(500).json({error:'Council voice malfunction',code:'server_error'})}
}
