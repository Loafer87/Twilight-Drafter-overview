const {generateDiscordCouncil,formatDiscordReply}=require('./discord-council-core');
const {achievementPlan}=require('./discord-achievement-director');
const cases=[
  {command:'grievance',invoker:'Joshua',target:'Chris',message:'Chris called dreadnoughts Wetty Dreddys again after everyone told him to stop. This is now the fourth time tonight.',recentMessages:[{author:'Chris',content:'Need another Wetty Dreddy.'},{author:'Joshua',content:'Stop making this a thing.'}]},
  {command:'accuse',invoker:'Joshua',target:'Chris',message:'Chris declared his move, realized it was bad, and immediately asked for another Collins Mulligan.',recentMessages:[{author:'Chris',content:'Can I take that back?'},{author:'Joshua',content:'You literally just declared it.'}]},
  {command:'council',invoker:'Joshua',message:'I won again and have placed the Golden Banana in front of my seat like an actual constitutional office.',recentMessages:[{author:'Joshua',content:'The throne recognizes itself.'}]}
];
module.exports=async function handler(req,res){const n=Math.max(0,Math.min(2,Number(req.query?.case||0)));const input={...cases[n],forceAchievement:true,guildId:'1538780933082193980',channelId:'achievement-smoke',interactionId:`achievement-smoke-${n}`};const plan=achievementPlan(input);const result=await generateDiscordCouncil(input);return res.status(200).json({ok:true,plan:{mode:plan.mode.id,rewardShape:plan.rewardShape,stingAllowed:plan.stingAllowed,consequenceAllowed:plan.consequenceAllowed,tier:plan.tier},result,formatted:formatDiscordReply(result)});};
