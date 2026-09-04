const council=require('./council-v7');

async function invoke(body){
  const captured={statusCode:200,headers:{},body:null};
  const res={setHeader:(k,v)=>{captured.headers[String(k).toLowerCase()]=String(v);return res},status:c=>{captured.statusCode=c;return res},json:b=>{captured.body=b;return res},send:b=>{captured.body=b;return res},end:b=>{captured.body=b;return res}};
  await council({method:'POST',headers:{},body},res);
  return captured;
}
function base(faction,offered,rejected){return{seed:'collins-mulligan-smoke',sessionId:'smoke-session',player:'Chris',playerId:'smoke-chris',playerKey:'smoke-chris',pickNumber:1,totalPlayers:3,speaker:true,faction,tag:'Test faction',blurb:'Production mulligan smoke test.',expansion:'Base Game',offered,rejected,alreadyPicked:[],history:{totalDraftPicks:0,factions:{},speakerCount:0,achievements:[],games:0,wins:0,winRate:0,winStreak:0,legacyRecord:'',lastGame:null},recentHeadlines:[],recentAchievements:[],recentPerformanceShapes:[],recentDirectorModes:[],recentBodyPatterns:[],recentComedyMotifs:[]}}
module.exports=async function handler(req,res){
  const first=await invoke(base('The Arborec',['The Arborec','The Ghosts of Creuss','The Embers of Muaat'],['The Ghosts of Creuss','The Embers of Muaat']));
  const replacement=await invoke(base('The Ghosts of Creuss',['The Arborec','The Ghosts of Creuss','The Embers of Muaat'],['The Arborec','The Embers of Muaat']));
  const summarize=x=>({status:x.statusCode,title:String(x.body?.title||x.body?.headline||''),chars:String(x.body?.commentary||'').length,serverFallback:Boolean(x.body?.serverFallback),apiVersion:x.body?.apiVersion||null});
  return res.status(200).json({first:summarize(first),replacement:summarize(replacement),replacementCleanContext:true});
};
