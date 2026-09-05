const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core');

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const result=await generateDiscordCouncil({
      command:'council',
      invoker:'Shane',
      message:'Shane has already declared a planet on the far side of the map to be his and is warning everyone not to take it.',
      recentMessages:[
        {author:'Ashley',content:'Nobody is even near that planet yet.'},
        {author:'Joshua',content:'He has pre-claimed it anyway.'}
      ],
      guildId:'smoke',
      channelId:'smoke',
      interactionId:`status-smoke-${Date.now()}`,
      forceAchievement:false,
      forceSystemEvent:true,
      forceSystemType:'status'
    });
    return res.status(200).json({ok:true,result,reply:formatDiscordReply(result)});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.stack||e?.message||e)})}
};
