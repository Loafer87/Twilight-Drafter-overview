const councilV7=require('./council-v7');

function runCase(ctx){
  return new Promise(resolve=>{
    const req={method:'POST',headers:{},body:ctx};
    const res={
      statusCode:200,
      setHeader(){return res},
      status(code){res.statusCode=code;return res},
      json(body){resolve({status:res.statusCode,...body});return res},
      end(body){resolve({status:res.statusCode,body});return res}
    };
    Promise.resolve(councilV7(req,res)).catch(error=>resolve({status:500,error:String(error?.message||error)}));
  });
}

function pick(player,faction,rejected,n){
  return {
    mode:'pick',seed:`personality-smoke-${Date.now()}-${n}`,transmissionNonce:`smoke-${Date.now()}-${n}-${Math.random()}`,
    player,playerKey:String(player).toLowerCase(),pickNumber:n,totalPlayers:6,speaker:n===1,
    faction,tag:'',blurb:'',expansion:'Prophecy of Kings',offered:[faction,...rejected],rejected,
    alreadyPicked:[],history:{totalDraftPicks:2,factions:{},speakerCount:0,achievements:[]},tableLore:[],
    recentHeadlines:[],recentAchievements:[],recentPerformanceShapes:[],recentDirectorModes:[],recentBodyPatterns:[],recentComedyMotifs:[],
    temporal:{timeZone:'America/Vancouver'}
  };
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','no-store');
  const batch=String(req.query?.batch||'1');
  const cases=batch==='2' ? [
    pick('Joshua','The Ghosts of Creuss',['The Embers of Muaat','The Nomad'],2),
    pick('Kevin','The Mentak Coalition',['The Emirates of Hacan','The Yssaril Tribes'],3),
    pick('Ashley','The Universities of Jol-Nar',['The Nekro Virus','The Naaz-Rokha Alliance'],4),
    pick('Shane','The Crimson Rebellion',['The Ghosts of Creuss','The Xxcha Kingdom'],5)
  ] : [
    pick('Joshua','The Ghosts of Creuss',['The Empyrean','The Nomad'],1),
    pick('Chris','The Ghosts of Creuss',['The Arborec','The Empyrean'],2),
    pick('Shane','The Embers of Muaat',['The Federation of Sol','The Barony of Letnev'],3),
    pick('Kevin',"The Vuil'raith Cabal",['The Mentak Coalition','The Universities of Jol-Nar'],4)
  ];
  const results=await Promise.all(cases.map(runCase));
  return res.status(200).json({batch,results:results.map((x,i)=>({case:{player:cases[i].player,faction:cases[i].faction},headline:x.headline||x.title||null,directorMode:x.directorMode||null,bodyPattern:x.bodyPattern||null,comedyMotifs:x.comedyMotifs||[],achievement:x.achievement||null,commentary:x.commentary||null,serverFallback:Boolean(x.serverFallback),elapsedMs:x.elapsedMs||null,status:x.status}))});
};
