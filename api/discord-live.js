const crypto=require('crypto');
const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core');

const DEFAULT_GUILD_ID='1538780933082193980';
const DEFAULT_CHANNEL_IDS='1540805179388203078,1538785106351624233';

function clean(v,max=2000){return String(v||'').replace(/\u0000/g,'').trim().slice(0,max)}
function allowedChannels(){return new Set(String(process.env.DISCORD_LIVE_CHANNEL_IDS||DEFAULT_CHANNEL_IDS).split(',').map(x=>x.trim()).filter(Boolean))}
function canonical(body={}){
  return JSON.stringify({
    guildId:clean(body.guildId,32),
    channelId:clean(body.channelId,32),
    messageId:clean(body.messageId,32),
    authorId:clean(body.authorId,32),
    authorName:clean(body.authorName,100),
    content:clean(body.content,1800),
    recentMessages:Array.isArray(body.recentMessages)?body.recentMessages.slice(-10).map(m=>({id:clean(m?.id,32),author:clean(m?.author,100),content:clean(m?.content,600)})):[]
  });
}
function verify(req,body){
  const token=process.env.DISCORD_BOT_TOKEN;
  if(!token)return{ok:false,code:'token_missing'};
  const timestamp=clean(req.headers?.['x-council-timestamp'],30),signature=clean(req.headers?.['x-council-signature'],128).toLowerCase();
  const ts=Number(timestamp);
  if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>5*60*1000)return{ok:false,code:'stale_request'};
  if(!/^[a-f0-9]{64}$/.test(signature))return{ok:false,code:'bad_signature'};
  const expected=crypto.createHmac('sha256',token).update(`${timestamp}.${canonical(body)}`).digest('hex');
  const a=Buffer.from(signature,'hex'),b=Buffer.from(expected,'hex');
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return{ok:false,code:'bad_signature'};
  return{ok:true};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET')return res.status(200).json({ok:true,service:'discord-live-council',guild:process.env.DISCORD_GUILD_ID||DEFAULT_GUILD_ID,channels:[...allowedChannels()]});
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  const auth=verify(req,body);if(!auth.ok)return res.status(401).json({ok:false,error:auth.code});
  const guildId=clean(body.guildId,32),channelId=clean(body.channelId,32);
  const expectedGuild=process.env.DISCORD_GUILD_ID||DEFAULT_GUILD_ID;
  if(guildId!==expectedGuild||!allowedChannels().has(channelId))return res.status(403).json({ok:false,error:'location_not_allowed'});
  const content=clean(body.content,1800);if(!content)return res.status(400).json({ok:false,error:'empty_message'});
  const recentMessages=Array.isArray(body.recentMessages)?body.recentMessages.slice(-10).map(m=>({author:clean(m?.author,100)||'Unknown',content:clean(m?.content,600)})).filter(m=>m.content):[];
  try{
    const result=await generateDiscordCouncil({
      command:'council',
      invoker:clean(body.authorName,100)||'Unknown',
      message:content,
      recentMessages,
      guildId,
      channelId,
      interactionId:`gateway-${clean(body.messageId,32)||Date.now()}`
    });
    const reply=formatDiscordReply(result);
    return res.status(200).json({ok:true,reply,result:{headline:result?.headline||null,achievement:Boolean(result?.achievement)}});
  }catch(e){
    console.error('[discord-live] generation failed',e?.stack||e?.message||e);
    return res.status(500).json({ok:false,error:'generation_failed'});
  }
};
