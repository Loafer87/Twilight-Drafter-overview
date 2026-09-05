const APP_ID=process.env.DISCORD_APP_ID||'1545662376911573002';
const GUILD_ID=process.env.DISCORD_GUILD_ID||'1538780933082193980';
const TOKEN=process.env.DISCORD_BOT_TOKEN;
const commands=[
  {name:'council',description:'Summon the Galactic Council for judgment',type:1,integration_types:[0],contexts:[0],options:[{name:'message',description:'What requires Council judgment?',type:3,required:true,max_length:1200}]},
  {name:'grievance',description:'File an official grievance with the Council',type:1,integration_types:[0],contexts:[0],options:[{name:'details',description:'State the grievance',type:3,required:true,max_length:1200},{name:'against',description:'Optional accused player',type:6,required:false}]},
  {name:'accuse',description:'Formally accuse a player of a game-night crime',type:1,integration_types:[0],contexts:[0],options:[{name:'player',description:'Who is being accused?',type:6,required:true},{name:'crime',description:'State the alleged crime',type:3,required:true,max_length:1000}]}
];
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!TOKEN)return res.status(503).json({error:'DISCORD_BOT_TOKEN missing'});
  const url=`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;
  const r=await fetch(url,{method:'PUT',headers:{Authorization:`Bot ${TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(commands)});
  let body=null;try{body=await r.json()}catch(e){body={raw:await r.text().catch(()=> '')}}
  if(!r.ok)return res.status(r.status).json({ok:false,status:r.status,body});
  return res.status(200).json({ok:true,guildId:GUILD_ID,commands:(body||[]).map(x=>({id:x.id,name:x.name,description:x.description}))});
};
