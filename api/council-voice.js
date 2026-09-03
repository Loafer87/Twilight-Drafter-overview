function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const COUNCIL_VOICE='onyx';
const MODE_SPEED={opening:1.02,pick:1.05,verdict:1.01,achievement:1.08};
const VOICE_INSTRUCTIONS={
  opening:'Perform as an original futuristic game-show system announcer with huge broadcast presence: booming, polished, grand, crisp, and unmistakably in command. The first impression should be expensive and professional, like a galaxy-spanning competition broadcast. Underneath that polish, allow a faint creepy personal interest in the contestants to leak through. As the text becomes petty, excited, profane, or obsessive, let the professional facade crack: sharpen the rhythm, become more personally invested, and sound disturbingly pleased with yourself. Strong profanity should land clearly and confidently, not sheepishly. Use deliberate broadcast pauses before names, rulings, and punch lines, but keep momentum. Do not imitate any existing fictional character or narrator.',
  pick:'Perform as an original corrupted game-show system issuing a live ruling. Start with authoritative broadcast-announcer clarity and weight, then let the machine become visibly too interested in the decision. Swing quickly between grand institutional authority, creepy fascination, sarcastic contempt, and sudden gleeful excitement. When chaos pleases you, sound genuinely thrilled and briefly lose professional composure. When bored or disappointed, become clipped, cold, and personally offended. Profanity should sound spontaneous and satisfying. Land short punch lines hard. The listener should feel that a premium galactic announcer is slowly becoming an unstable participant in the show. Do not imitate any existing fictional character.',
  verdict:'Perform as an original galaxy-wide competition announcer delivering a prestigious final ruling while barely concealing an unhealthy emotional investment in the contestants. Begin booming, ceremonial, and controlled. Then escalate: smug amusement, delighted alarm, petty disgust, fascination, and profanity should break through the broadcast polish as the verdict develops. Give names and accusations extra weight. The final ruling should feel enormous and official, followed by the uncomfortable realization that the machine enjoyed this far too much. Do not imitate any existing fictional character or narrator.',
  achievement:'This is a special game-show achievement announcement. Be MUCH more excited than normal. Begin with a huge, booming, triumphant broadcast cry of NEW ACHIEVEMENT! Make it celebratory, excessive, and slightly disturbing, as though this is the most important event in the galaxy. Hit the achievement title with theatrical prestige. Then deliver the description with gleeful personal amusement, as though the system has been waiting specifically to embarrass or reward this contestant. Energetic, grand, unreasonably enthusiastic, and just a little creepy. Do not imitate any existing fictional character or specific catchphrase performance beyond the supplied words.'
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
