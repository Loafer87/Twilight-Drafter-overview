import {createPublicKey,verify as verifySignature} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core.js');

const DEFAULT_APP_ID='1545662376911573002';
const DEFAULT_GUILD_ID='1538780933082193980';
const DEFAULT_PUBLIC_KEY='2d3a63a410b49aa71609a8f0b908df4eeda6d1d7396b824e7aa67abcdfa917d9';

function env(name,fallback=''){return String(process.env[name]||fallback).trim()}
function discordKey(){const hex=env('DISCORD_PUBLIC_KEY',DEFAULT_PUBLIC_KEY);const raw=Buffer.from(hex,'hex');if(raw.length!==32)throw new Error('invalid_discord_public_key');const der=Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]);return createPublicKey({key:der,format:'der',type:'spki'})}
function validSignature(request,raw){const sig=request.headers.get('x-signature-ed25519')||'',ts=request.headers.get('x-signature-timestamp')||'';if(!sig||!ts)return false;try{return verifySignature(null,Buffer.from(ts+raw),discordKey(),Buffer.from(sig,'hex'))}catch(e){return false}}
function option(data,name){return(data?.options||[]).find(x=>x.name===name)?.value??null}
function userDisplay(interaction){const member=interaction?.member||{},user=member.user||interaction?.user||{};return String(member.nick||user.global_name||user.username||'Unknown').trim()}
function resolvedUserName(interaction,id){if(!id)return null;const users=interaction?.data?.resolved?.users||{},members=interaction?.data?.resolved?.members||{},u=users[id]||{},m=members[id]||{};return String(m.nick||u.global_name||u.username||id).trim()}
function commandInput(interaction){const command=String(interaction?.data?.name||'council').toLowerCase(),invoker=userDisplay(interaction);if(command==='accuse'){const id=option(interaction.data,'player');return{command,invoker,target:resolvedUserName(interaction,id),message:String(option(interaction.data,'crime')||'').trim()}}if(command==='grievance'){const id=option(interaction.data,'against');return{command,invoker,target:resolvedUserName(interaction,id),message:String(option(interaction.data,'details')||'').trim()}}return{command:'council',invoker,target:null,message:String(option(interaction.data,'message')||'').trim()}}
async function recentMessages(channelId){const token=env('DISCORD_BOT_TOKEN');if(!token||!channelId)return[];try{const r=await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=8`,{headers:{Authorization:`Bot ${token}`}});if(!r.ok)return[];const rows=await r.json();return(rows||[]).filter(m=>!m?.author?.bot&&String(m?.content||'').trim()).slice(0,8).reverse().map(m=>({author:String(m.member?.nick||m.author?.global_name||m.author?.username||'Unknown'),content:String(m.content||'').trim()}))}catch(e){return[]}}
async function editOriginal(interaction,content){const appId=env('DISCORD_APP_ID',DEFAULT_APP_ID),url=`https://discord.com/api/v10/webhooks/${appId}/${interaction.token}/messages/@original`;const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content,allowed_mentions:{parse:[]}})});if(!r.ok){let detail='';try{detail=await r.text()}catch(e){}console.warn('[discord] failed editing interaction response',r.status,detail.slice(0,240))}}
async function runCommand(interaction){const guildId=String(interaction.guild_id||''),expected=env('DISCORD_GUILD_ID',DEFAULT_GUILD_ID);if(expected&&guildId&&guildId!==expected){await editOriginal(interaction,'**WRONG CHAMBER**\nThe Council does not recognize this server. Jurisdiction denied.');return}const input=commandInput(interaction),history=await recentMessages(interaction.channel_id);const result=await generateDiscordCouncil({...input,recentMessages:history,guildId,channelId:interaction.channel_id,interactionId:interaction.id});await editOriginal(interaction,formatDiscordReply(result))}

export default {
  async fetch(request,context){
    if(request.method==='GET')return Response.json({ok:true,service:'discord-council',guild:env('DISCORD_GUILD_ID',DEFAULT_GUILD_ID),configured:Boolean(env('DISCORD_BOT_TOKEN')&&env('OPENAI_API_KEY')&&env('OPENAI_MODEL'))});
    if(request.method!=='POST')return new Response('Method not allowed',{status:405});
    const raw=await request.text();
    if(!validSignature(request,raw))return new Response('invalid request signature',{status:401});
    let interaction;try{interaction=JSON.parse(raw)}catch(e){return new Response('invalid json',{status:400})}
    if(interaction.type===1)return Response.json({type:1});
    if(interaction.type!==2)return Response.json({type:4,data:{content:'The Council received an unsupported ritual.',flags:64,allowed_mentions:{parse:[]}}});
    const job=runCommand(interaction).catch(async e=>{console.error('[discord] command failed',String(e?.stack||e));try{await editOriginal(interaction,'**COUNCIL UPLINK FAILURE**\nThe machine has fallen down the stairs. Try that again.')}catch(_) {}});
    if(context?.waitUntil){context.waitUntil(job);return Response.json({type:5,data:{allowed_mentions:{parse:[]}}})}
    try{await Promise.race([job,new Promise((_,reject)=>setTimeout(()=>reject(new Error('sync_timeout')),2400))]);return Response.json({type:5,data:{allowed_mentions:{parse:[]}}})}catch(e){return Response.json({type:5,data:{allowed_mentions:{parse:[]}}})}
  }
};
