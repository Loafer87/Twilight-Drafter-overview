const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const result=await generateDiscordCouncil({
    command:'grievance',
    invoker:'Joshua',
    target:'Chris',
    message:'Chris called dreadnoughts Wetty Dreddys again after everyone explicitly told him to stop, and now two other people are saying it too.',
    recentMessages:[
      {author:'Chris',content:'Need another Wetty Dreddy.'},
      {author:'Joshua',content:'This phrase needs to die.'},
      {author:'Chris',content:'I’m just a plant.'}
    ],
    guildId:'1538780933082193980',
    channelId:'achievement-smoke',
    interactionId:`achievement-smoke-${Date.now()}`
  });
  return res.status(200).json({ok:true,result,formatted:formatDiscordReply(result)});
};
