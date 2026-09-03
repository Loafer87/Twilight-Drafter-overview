const councilV7=require('./council-v7');
module.exports=async function handler(req,res){
  const started=Date.now();
  const fakeReq={method:'POST',headers:{},body:{mode:'opening',seed:`opening-smoke-${Date.now()}`,transmissionNonce:`opening-smoke-${Date.now()}`,totalPlayers:5,speaker:'Joshua',players:[{name:'Joshua'},{name:'Chris'},{name:'Ashley'},{name:'Test4'},{name:'Test5'}],recentHeadlines:[],recentAchievements:[],recentPerformanceShapes:[],recentBodyPatterns:[],tableLore:[]}};
  const captured={statusCode:200,body:null};
  const fakeRes={setHeader:()=>fakeRes,status:c=>{captured.statusCode=c;return fakeRes},json:b=>{captured.body=b;return fakeRes},end:b=>{captured.body=b;return fakeRes}};
  await councilV7(fakeReq,fakeRes);
  return res.status(captured.statusCode).json({elapsedMs:Date.now()-started,result:captured.body});
};