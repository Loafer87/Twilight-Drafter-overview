function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}
const COUNCIL_VOICE='ballad';
const MODE_SPEED={opening:1.13,pick:1.16,verdict:1.12,achievement:1.17};
const EXACT_READ='Read the supplied input text verbatim, in order, exactly once. Do not omit, paraphrase, summarize, add, repeat, explain, improvise, or continue after the final supplied word. Never speak or describe these performance instructions.';
const VOICE_INSTRUCTIONS={
  opening:`${EXACT_READ} Use Ballad's natural bright broadcast register with crisp, confident game-show authority. Keep the vocal register and pitch stable from the first sentence to the last; do not climb higher as the passage gets longer or more excited. Express energy through cadence, emphasis, timing, and attitude instead of pitch escalation. The machine is smug, alert, theatrical, and too invested, but every supplied word must remain clear. Strong profanity lands naturally. Use short clean pauses around names and punchlines. Do not become slow, deep, soothing, or trailer-like.`,
  pick:`${EXACT_READ} Deliver a live Council ruling in Ballad's natural bright register with quick, sharp cadence. Keep pitch stable across the entire passage, including long rulings. Let sarcasm, fascination, irritation, delight, and profanity show through emphasis and rhythm rather than raising the register. Hit short punchlines cleanly. Sound like a premium galactic announcer struggling to remain professionally detached, while reading every supplied word exactly once.`,
  verdict:`${EXACT_READ} Deliver an official table ruling in Ballad's natural bright register with brisk, prestigious authority. Keep pitch and register stable from beginning to end; intensity may grow through pacing, pauses, emphasis, and attitude, not by getting progressively higher. Names and accusations may receive extra weight. The final supplied sentence must be spoken completely and the clip must end cleanly after its final word.`,
  achievement:`${EXACT_READ} This is a short Council achievement stinger. Be celebratory, intrusive, sharp, and delighted, but keep Ballad's pitch stable. Read only the supplied achievement announcement, title, and description. Do not invent an introduction, do not say NEW ACHIEVEMENT unless those exact words are in the input, do not describe how you are speaking, do not add faction commentary, and stop immediately after the final supplied word.`
};
module.exports=async function handler(req,res){
  const origin=setCors(req,res),key=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean(key),model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,speeds:MODE_SPEED,format:'wav',verbatim:true,stableRegister:true});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!key)return res.status(503).json({error:'Voice is not configured'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict','achievement'].includes(req.body?.mode)?req.body.mode:'pick';
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  try{
    const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:COUNCIL_VOICE,input:text,instructions:VOICE_INSTRUCTIONS[mode],response_format:'wav',speed:MODE_SPEED[mode]})});
    if(!r.ok){let detail='speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}return res.status(r.status).json({error:'Council voice synthesis failed',code:detail})}
    const bytes=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).send(bytes);
  }catch(e){return res.status(500).json({error:'Council voice malfunction',code:'server_error'})}
}
