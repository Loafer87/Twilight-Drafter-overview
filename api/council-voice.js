function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return origin}
function safeText(value){return String(value||'').replace(/[*_#`]/g,'').trim().slice(0,4096)}

const CARTESIA_VERSION='2026-08-14';
const CARTESIA_MODEL=process.env.CARTESIA_MODEL_ID||'sonic-3.6';
const OPENAI_VOICE='ballad';
const MODE_SPEED={opening:1.04,pick:1.07,verdict:1.02,achievement:1.11};
const EXACT_READ='Read the supplied input text verbatim, in order, exactly once. Every supplied word is mandatory, including the exact final word. Do not omit, paraphrase, summarize, add, repeat, explain, improvise, or continue after the final supplied word. Complete the final word cleanly before ending the audio. Never speak or describe these performance instructions.';
const OPENAI_INSTRUCTIONS={
  opening:`${EXACT_READ} Use Ballad's natural bright broadcast register with crisp, confident game-show authority. Keep the vocal register and pitch stable. Express energy through cadence, emphasis, timing, and attitude. Strong profanity lands naturally.`,
  pick:`${EXACT_READ} Deliver a live Council ruling in Ballad's natural bright register with quick, sharp cadence. Let sarcasm, fascination, irritation, delight, and profanity show through emphasis and rhythm.`,
  verdict:`${EXACT_READ} Deliver an official table ruling with brisk, prestigious authority. Names and accusations may receive extra weight. Complete the final sentence cleanly.`,
  achievement:`${EXACT_READ} This is the intrusive reward siren of the Council. Go completely over the top: triumphant, delighted, absurdly prestigious, and a little unhinged.`
};

function directorEmotion(mode,directorMode){
  if(mode==='achievement')return'triumphant';
  const d=String(directorMode||'').toLowerCase();
  const byDirector={
    'drive-by':'sarcastic',
    'one-line-ruling':'contempt',
    'achievement-hijack':'triumphant',
    'manic-fixation':'agitated',
    'deadpan':'contempt',
    'personal-callback':'sarcastic',
    'rejection-autopsy':'sarcastic',
    'council-meltdown':'frustrated',
    'suspicious-approval':'skeptical',
    'flavor-ambush':'excited',
    'normal-assessment':'confident'
  };
  if(byDirector[d])return byDirector[d];
  if(mode==='opening')return'confident';
  if(mode==='verdict')return'determined';
  return'confident';
}
function directorSpeed(mode,directorMode){
  const d=String(directorMode||'').toLowerCase();
  if(d==='deadpan')return .92;
  if(d==='council-meltdown')return 1.11;
  if(d==='manic-fixation')return 1.09;
  if(d==='one-line-ruling'||d==='drive-by')return 1.06;
  return MODE_SPEED[mode]||1.05;
}

async function cartesiaSpeech(text,mode,directorMode,key,voiceId){
  const r=await fetch('https://api.cartesia.ai/tts/bytes',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Cartesia-Version':CARTESIA_VERSION,'Content-Type':'application/json'},
    body:JSON.stringify({
      model_id:CARTESIA_MODEL,
      transcript:text,
      voice:voiceId,
      output_format:{container:'wav',encoding:'pcm_s16le',sample_rate:24000},
      locale:'en-US',
      normalization:'auto',
      generation_config:{volume:1,speed:directorSpeed(mode,directorMode),emotion:directorEmotion(mode,directorMode)}
    })
  });
  if(!r.ok){let detail=`cartesia_${r.status}`;try{const j=await r.json();detail=String(j?.error?.message||j?.message||j?.error||detail).slice(0,180)}catch(e){}const err=new Error(detail);err.status=r.status;throw err}
  return Buffer.from(await r.arrayBuffer());
}
async function openaiSpeech(text,mode,key){
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:OPENAI_VOICE,input:text,instructions:OPENAI_INSTRUCTIONS[mode],response_format:'wav',speed:Math.min(1.2,Math.max(.8,MODE_SPEED[mode]||1.05))})});
  if(!r.ok){let detail='openai_speech_failed';try{const j=await r.json();detail=String(j?.error?.code||j?.error?.type||detail)}catch(e){}const err=new Error(detail);err.status=r.status;throw err}
  return Buffer.from(await r.arrayBuffer());
}

module.exports=async function handler(req,res){
  const origin=setCors(req,res),cartesiaKey=process.env.CARTESIA_API_KEY,voiceId=process.env.CARTESIA_VOICE_ID,openaiKey=process.env.OPENAI_API_KEY;
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(origin&&!allowedOrigin(origin))return res.status(403).json({error:'Origin not allowed'});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:Boolean((cartesiaKey&&voiceId)||openaiKey),provider:cartesiaKey&&voiceId?'cartesia':'openai-fallback',cartesiaConfigured:Boolean(cartesiaKey&&voiceId),openaiFallbackConfigured:Boolean(openaiKey),model:cartesiaKey&&voiceId?CARTESIA_MODEL:(process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts'),directorEmotion:true,format:'wav'});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const text=safeText(req.body?.text),mode=['opening','pick','verdict','achievement'].includes(req.body?.mode)?req.body.mode:'pick',directorMode=safeText(req.body?.directorMode).slice(0,80);
  if(!text)return res.status(400).json({error:'No speech text supplied'});
  if(!cartesiaKey||!voiceId){
    if(!openaiKey)return res.status(503).json({error:'Voice is not configured'});
    try{const bytes=await openaiSpeech(text,mode,openaiKey);res.setHeader('X-Council-Voice-Provider','openai-fallback');res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',String(bytes.length));return res.status(200).send(bytes)}catch(e){return res.status(e?.status||500).json({error:'Council voice synthesis failed',code:String(e?.message||'server_error')})}
  }
  try{
    const bytes=await cartesiaSpeech(text,mode,directorMode,cartesiaKey,voiceId);
    res.setHeader('X-Council-Voice-Provider','cartesia');res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',String(bytes.length));return res.status(200).send(bytes);
  }catch(cartesiaError){
    console.warn('Cartesia Council voice failed; attempting OpenAI fallback',String(cartesiaError?.message||cartesiaError));
    if(!openaiKey)return res.status(cartesiaError?.status||502).json({error:'Cartesia Council voice failed',code:String(cartesiaError?.message||'cartesia_error')});
    try{const bytes=await openaiSpeech(text,mode,openaiKey);res.setHeader('X-Council-Voice-Provider','openai-fallback');res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',String(bytes.length));return res.status(200).send(bytes)}catch(openaiError){return res.status(502).json({error:'Council voice providers failed',code:`cartesia:${String(cartesiaError?.message||'error')} | openai:${String(openaiError?.message||'error')}`.slice(0,260)})}
  }
};
