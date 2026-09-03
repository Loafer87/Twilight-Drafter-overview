// TEMPORARY production reliability probe; remove after verification.
const councilV7=require('./council-v7');
const CASES=[
  {player:'Joshua',faction:'The Ghosts of Creuss',tag:'mobility',rejected:['The Arborec','The Barony of Letnev']},
  {player:'Chris',faction:'The Arborec',tag:'growth',rejected:['The Nekro Virus','The Emirates of Hacan']},
  {player:'Ashley',faction:'The Nekro Virus',tag:'aggressive',rejected:['The Universities of Jol-Nar','The Empyrean']},
  {player:'Test4',faction:'The Embers of Muaat',tag:'military',rejected:['The Federation of Sol','The Xxcha Kingdom']},
  {player:'Test5',faction:'The Mentak Coalition',tag:'economic',rejected:['The Emirates of Hacan','The Nomad']}
];
module.exports=async function handler(req,res){
  const i=Math.max(0,Math.min(CASES.length-1,Number(req.query?.case||0))),c=CASES[i],started=Date.now();
  const body={mode:'pick',seed:`reliability-${i}-${Date.now()}`,transmissionNonce:`smoke-${i}-${Date.now()}`,player:c.player,pickNumber:i+1,totalPlayers:5,speaker:i===0,faction:c.faction,tag:c.tag,blurb:'Smoke test faction context',expansion:'Base Game',offered:[c.faction,...c.rejected],rejected:c.rejected,alreadyPicked:CASES.slice(0,i).map((x,j)=>({player:x.player,faction:x.faction,pick:j+1})),players:CASES.map((x,j)=>({name:x.player,order:j+1,speaker:j===0,faction:j<i?x.faction:null})),history:{totalDraftPicks:0,factions:{},speakerCount:0,achievements:[]},recentHeadlines:[],recentAchievements:[],recentPerformanceShapes:[],recentBodyPatterns:[],tableLore:[]};
  const captured={statusCode:200,body:null};
  const fakeRes={setHeader:()=>fakeRes,status:c=>{captured.statusCode=c;return fakeRes},json:b=>{captured.body=b;return fakeRes},end:b=>{captured.body=b;return fakeRes}};
  await councilV7({method:'POST',headers:{},body},fakeRes);
  return res.status(captured.statusCode).json({case:i,elapsedMs:Date.now()-started,result:captured.body});
};
