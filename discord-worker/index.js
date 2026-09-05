const crypto=require('crypto');

const TOKEN=String(process.env.DISCORD_BOT_TOKEN||'').trim();
const GUILD_ID=String(process.env.DISCORD_GUILD_ID||'1538780933082193980').trim();
const CHANNEL_IDS=new Set(String(process.env.DISCORD_CHANNEL_IDS||'1540805179388203078,1538785106351624233').split(',').map(x=>x.trim()).filter(Boolean));
const AUTONOMOUS_CHANNEL_IDS=new Set(String(process.env.COUNCIL_AUTONOMOUS_CHANNEL_IDS||'1538785106351624233').split(',').map(x=>x.trim()).filter(Boolean));
const COUNCIL_URL=String(process.env.COUNCIL_URL||'https://twilight-drafter-overview.vercel.app/api/discord-live').trim();
const AUTONOMOUS=/^(1|true|yes)$/i.test(String(process.env.COUNCIL_AUTONOMOUS||'false'));
const TEST_MODE=!/^(0|false|no)$/i.test(String(process.env.COUNCIL_TEST_MODE||'true'));
const AUTONOMOUS_COOLDOWN_MS=Math.max(60_000,Number(process.env.COUNCIL_AUTONOMOUS_COOLDOWN_MS||900_000));
const INTENTS=1|512|32768; // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT
const API='https://discord.com/api/v10';

if(!TOKEN){console.error('[gateway] DISCORD_BOT_TOKEN is required');process.exit(1)}

let ws=null,seq=null,sessionId=null,resumeGatewayUrl=null,botId=null;
let heartbeatTimer=null,heartbeatAck=true,reconnectTimer=null,reconnectAttempt=0,stopping=false;
const seen=new Set(),inFlight=new Set(),lastAutonomousByChannel=new Map();

function clean(v,max=2000){return String(v||'').replace(/\u0000/g,'').trim().slice(0,max)}
function remember(id){if(!id)return false;if(seen.has(id))return true;seen.add(id);if(seen.size>500){const first=seen.values().next().value;seen.delete(first)}return false}
function canonical(body={}){
  return JSON.stringify({
    guildId:clean(body.guildId,32),channelId:clean(body.channelId,32),messageId:clean(body.messageId,32),authorId:clean(body.authorId,32),authorName:clean(body.authorName,100),content:clean(body.content,1800),
    recentMessages:Array.isArray(body.recentMessages)?body.recentMessages.slice(-10).map(m=>({id:clean(m?.id,32),author:clean(m?.author,100),content:clean(m?.content,600)})):[]
  });
}
function sign(body,timestamp){return crypto.createHmac('sha256',TOKEN).update(`${timestamp}.${canonical(body)}`).digest('hex')}
function botHeaders(){return{Authorization:`Bot ${TOKEN}`,'Content-Type':'application/json','User-Agent':'GalacticCouncilBot/1.0'}}

async function discord(path,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10_000);
  try{
    const r=await fetch(`${API}${path}`,{...options,headers:{...botHeaders(),...(options.headers||{})},signal:controller.signal});
    if(r.status===204)return null;
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!r.ok){const err=new Error(`discord_${r.status}`);err.status=r.status;err.data=data;throw err}
    return data;
  }finally{clearTimeout(timer)}
}

async function fetchRecent(channelId,beforeId){
  try{
    const rows=await discord(`/channels/${channelId}/messages?limit=10&before=${encodeURIComponent(beforeId)}`,{method:'GET'});
    return (Array.isArray(rows)?rows:[]).filter(m=>!m?.author?.bot&&!m?.webhook_id&&m?.content).reverse().slice(-8).map(m=>({id:clean(m.id,32),author:clean(m.member?.nick||m.author?.global_name||m.author?.username||'Unknown',100),content:clean(m.content,600)}));
  }catch(e){console.warn('[gateway] recent context unavailable',e?.status||e?.message||e);return[]}
}

async function hydrateMessage(m){
  if(m?.content)return m;
  try{
    const fresh=await discord(`/channels/${m.channel_id}/messages/${m.id}`,{method:'GET'});
    if(fresh?.id){
      console.log('[gateway] hydrated message',{channel:m.channel_id,message:m.id,hasContent:Boolean(fresh.content)});
      return{...m,...fresh};
    }
  }catch(e){console.warn('[gateway] message hydration unavailable',e?.status||e?.message||e)}
  return m;
}

function stripSummon(content){
  let out=String(content||'');
  if(botId)out=out.replace(new RegExp(`<@!?${botId}>`,'g'),' ');
  out=out.replace(/^\s*(?:hey[,.!]?\s+)?(?:the\s+)?(?:galactic\s+)?council\b\s*[:,.!?\-]*\s*/i,'');
  return clean(out,1800);
}
function explicitSummon(m){
  const text=String(m?.content||'');
  const mentionByArray=Boolean(botId&&Array.isArray(m?.mentions)&&m.mentions.some(u=>u?.id===botId));
  const mentionByText=Boolean(botId&&new RegExp(`<@!?${botId}>`).test(text));
  const named=/^\s*(?:hey[,.!]?\s+)?(?:the\s+)?(?:galactic\s+)?council\b/i.test(text);
  const reply=Boolean(botId&&m?.referenced_message?.author?.id===botId);
  return{yes:mentionByArray||mentionByText||named||reply,mention:mentionByArray||mentionByText,mentionByArray,mentionByText,named,reply};
}
function autonomousTrigger(m){
  if(!AUTONOMOUS||!AUTONOMOUS_CHANNEL_IDS.has(m.channel_id))return false;
  const now=Date.now(),last=lastAutonomousByChannel.get(m.channel_id)||0;if(now-last<AUTONOMOUS_COOLDOWN_MS)return false;
  const text=String(m.content||'').toLowerCase();
  const strong=/wetty\s+dredd|collins\s+mulligan|backsies|take (?:that|it) back|i.?m just a plant|i.?m just a girl|golden banana|rage quit|you cheated|that.?s bullshit|claimed? (?:that )?planet|my planet/.test(text);
  const ti=/mentak|arborec|mecatol|war sun|dreadnought|trade goods?|alliance|ally|attack|planet|champion|banana|faction|speaker|strategy card|promissory|support for the throne|ceasefire|deal|rules?/.test(text);
  if(!strong&&!ti)return false;
  const n=Number(BigInt(m.id)%100n),threshold=strong?35:8;if(n>=threshold)return false;
  lastAutonomousByChannel.set(m.channel_id,now);return true;
}

async function askCouncil(m,isExplicit){
  if(inFlight.has(m.id))return;inFlight.add(m.id);
  try{
    discord(`/channels/${m.channel_id}/typing`,{method:'POST'}).catch(()=>{});
    const recentMessages=await fetchRecent(m.channel_id,m.id);
    let content=isExplicit?stripSummon(m.content):clean(m.content,1800);
    if(!content)content='You were summoned. Judge the recent conversation and decide whether anything here deserves your attention.';
    const body={guildId:m.guild_id,channelId:m.channel_id,messageId:m.id,authorId:m.author?.id||'',authorName:m.member?.nick||m.author?.global_name||m.author?.username||'Unknown',content,recentMessages};
    const timestamp=String(Date.now());
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20_000);
    let r;
    try{r=await fetch(COUNCIL_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Council-Timestamp':timestamp,'X-Council-Signature':sign(body,timestamp)},body:JSON.stringify(body),signal:controller.signal})}finally{clearTimeout(timer)}
    const data=await r.json().catch(()=>null);if(!r.ok||!data?.reply)throw new Error(`council_${r.status}_${data?.error||'bad_reply'}`);
    const payload={content:clean(data.reply,1950),message_reference:{message_id:m.id,fail_if_not_exists:false},allowed_mentions:{replied_user:false,parse:[]}};
    try{await discord(`/channels/${m.channel_id}/messages`,{method:'POST',body:JSON.stringify(payload)})}
    catch(e){console.warn('[gateway] reply reference failed; posting normally',e?.status||e?.message||e);delete payload.message_reference;await discord(`/channels/${m.channel_id}/messages`,{method:'POST',body:JSON.stringify(payload)})}
    console.log('[gateway] Council replied',{channel:m.channel_id,message:m.id,explicit:isExplicit,achievement:Boolean(data?.result?.achievement)});
  }catch(e){console.error('[gateway] Council response failed',e?.stack||e?.message||e)}finally{inFlight.delete(m.id)}
}

async function onMessageCreate(raw){
  if(!raw||raw.guild_id!==GUILD_ID||!CHANNEL_IDS.has(raw.channel_id)||raw.author?.bot||raw.webhook_id)return;
  const initialSummon=explicitSummon(raw);
  if(TEST_MODE)console.log('[gateway] MESSAGE_CREATE',{channel:raw.channel_id,message:raw.id,hasContent:Boolean(raw.content),mentionsBot:initialSummon.mention,mentionByArray:initialSummon.mentionByArray,replyToBot:initialSummon.reply});
  let m=raw;
  if(!m.content&&initialSummon.yes)m=await hydrateMessage(m);
  if(remember(m.id))return;
  const summon=explicitSummon(m),auto=autonomousTrigger(m);
  if(TEST_MODE)console.log('[gateway] classified',{message:m.id,explicit:summon.yes,mention:summon.mention,named:summon.named,reply:summon.reply,auto,hasContent:Boolean(m.content)});
  if(!summon.yes&&!auto)return;
  await askCouncil(m,summon.yes);
}

function clearHeartbeat(){if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}}
function send(op,d){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({op,d}))}
function startHeartbeat(interval){
  clearHeartbeat();heartbeatAck=true;
  const beat=()=>{if(!heartbeatAck){console.warn('[gateway] heartbeat missed; reconnecting');try{ws.close(4000,'heartbeat missed')}catch{}return}heartbeatAck=false;send(1,seq)};
  setTimeout(()=>{if(ws?.readyState===WebSocket.OPEN)beat()},Math.floor(Math.random()*interval));heartbeatTimer=setInterval(beat,interval);
}
function identify(){send(2,{token:TOKEN,intents:INTENTS,properties:{os:process.platform,browser:'galactic-council',device:'galactic-council'},presence:{status:'online',activities:[{name:'your bad decisions',type:3}],afk:false}})}
function resume(){send(6,{token:TOKEN,session_id:sessionId,seq})}
function scheduleReconnect(canResume=true){
  if(stopping||reconnectTimer)return;clearHeartbeat();
  const delay=Math.min(30_000,1000*Math.pow(2,Math.min(reconnectAttempt++,5)))+Math.floor(Math.random()*750);
  console.log('[gateway] reconnect scheduled',{delay,canResume:Boolean(canResume&&sessionId)});
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect(Boolean(canResume&&sessionId))},delay);
}
function gatewayUrl(resuming){const base=resuming&&resumeGatewayUrl?resumeGatewayUrl:'wss://gateway.discord.gg';return `${base.replace(/\/$/,'')}/?v=10&encoding=json`}
function connect(resuming=false){
  if(stopping)return;
  const url=gatewayUrl(resuming);console.log('[gateway] connecting',{url,resuming,channels:[...CHANNEL_IDS],autonomousChannels:[...AUTONOMOUS_CHANNEL_IDS],testMode:TEST_MODE,autonomous:AUTONOMOUS,cooldownMs:AUTONOMOUS_COOLDOWN_MS});
  ws=new WebSocket(url);
  ws.addEventListener('open',()=>{reconnectAttempt=0});
  ws.addEventListener('message',event=>{
    try{
      const raw=typeof event.data==='string'?event.data:Buffer.from(event.data).toString('utf8');const p=JSON.parse(raw);if(p.s!==null&&p.s!==undefined)seq=p.s;
      if(p.op===10){startHeartbeat(Number(p.d?.heartbeat_interval)||41_250);if(resuming&&sessionId)resume();else identify();return}
      if(p.op===11){heartbeatAck=true;return}
      if(p.op===7){try{ws.close(4000,'server requested reconnect')}catch{}return}
      if(p.op===9){const resumable=Boolean(p.d);if(!resumable){sessionId=null;seq=null;resumeGatewayUrl=null}try{ws.close(4000,'invalid session')}catch{};setTimeout(()=>scheduleReconnect(resumable),1000+Math.floor(Math.random()*4000));return}
      if(p.op!==0)return;
      if(p.t==='READY'){botId=p.d?.user?.id||botId;sessionId=p.d?.session_id||sessionId;resumeGatewayUrl=p.d?.resume_gateway_url||resumeGatewayUrl;console.log('[gateway] READY',{botId,sessionId:Boolean(sessionId),guild:GUILD_ID,channels:[...CHANNEL_IDS],autonomousChannels:[...AUTONOMOUS_CHANNEL_IDS]});return}
      if(p.t==='RESUMED'){console.log('[gateway] RESUMED');return}
      if(p.t==='MESSAGE_CREATE')onMessageCreate(p.d).catch(e=>console.error('[gateway] message handler failed',e));
    }catch(e){console.error('[gateway] frame parse failed',e?.message||e)}
  });
  ws.addEventListener('close',event=>{
    clearHeartbeat();const code=Number(event.code||0);console.warn('[gateway] closed',{code,reason:event.reason||''});
    if(stopping)return;if(code===4004){console.error('[gateway] authentication failed; token is invalid');process.exit(1)}
    if(code===4014){console.error('[gateway] privileged intent rejected. Enable Message Content Intent in Discord Developer Portal.');process.exit(1)}
    scheduleReconnect(![4007,4009].includes(code));
  });
  ws.addEventListener('error',event=>console.error('[gateway] websocket error',event?.message||'socket error'));
}

function shutdown(signal){if(stopping)return;stopping=true;console.log('[gateway] shutting down',signal);clearHeartbeat();if(reconnectTimer)clearTimeout(reconnectTimer);try{ws?.close(1000,'shutdown')}catch{};setTimeout(()=>process.exit(0),500)}
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('unhandledRejection',e=>console.error('[gateway] unhandled rejection',e));process.on('uncaughtException',e=>{console.error('[gateway] uncaught exception',e);scheduleReconnect(true)});

connect(false);
