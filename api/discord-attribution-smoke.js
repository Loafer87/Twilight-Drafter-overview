const {generateDiscordCouncil}=require('./discord-council-core');

function runCase(input){
  return generateDiscordCouncil(input).then(result=>({
    invoker:input.invoker,
    message:input.message,
    recentMessages:input.recentMessages||[],
    headline:result?.headline||null,
    commentary:result?.commentary||null,
    achievement:result?.achievement||null,
    systemEvent:result?.systemEvent||null
  }));
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  const batch=String(req.query?.batch||'1');
  const base={command:'council',guildId:'1538780933082193980',channelId:'1540805179388203078',interactionId:'attribution-smoke-'+Date.now()};
  const cases=batch==='2'?[
    {...base,invoker:'halldorslurs',invokerId:'kevin-test',message:'Chris wants another Collins Mulligan. This is cowardice and I want a ruling.',recentMessages:[]},
    {...base,invoker:'halldorslurs',invokerId:'kevin-test',message:'This is bullshit.',recentMessages:[
      {authorId:'chris-test',author:'Chris',content:"I'm just a plant. I did nothing wrong."},
      {authorId:'kevin-test',author:'halldorslurs',content:'No, you absolutely did.'}
    ]}
  ]:[
    {...base,invoker:'halldorslurs',invokerId:'kevin-test',message:'6-7 is ruining this server and I would like to file a formal complaint.',recentMessages:[]},
    {...base,invoker:'halldorslurs',invokerId:'kevin-test',message:'The Collins Mulligan is a coward button and I stand by that.',recentMessages:[]}
  ];
  const results=[];
  for(const item of cases)results.push(await runCase({...item,interactionId:item.interactionId+'-'+results.length}));
  return res.status(200).json({batch,results});
};