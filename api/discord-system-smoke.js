const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core');

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const result=await generateDiscordCouncil({
      command:'council',
      invoker:'Kevin',
      message:'Kevin has once again hoarded a mountain of trade goods while insisting he is everyone’s ally.',
      recentMessages:[
        {author:'Joshua',content:'Kevin is sitting on all the trade goods again.'},
        {author:'Shane',content:'He says he is still open to deals.'}
      ],
      guildId:'smoke',
      channelId:'smoke',
      interactionId:`system-smoke-${Date.now()}`,
      forceAchievement:false,
      forceSystemEvent:true
    });
    return res.status(200).json({ok:true,result,reply:formatDiscordReply(result)});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.stack||e?.message||e)})}
};
