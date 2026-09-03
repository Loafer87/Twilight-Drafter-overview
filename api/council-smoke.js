const councilV7=require('./council-v7');

function payloadFor(kind){
  const base={
    seed:`smoke-${kind}-${Date.now()}`,
    transmissionNonce:`smoke-${kind}-${Date.now()}`,
    temporal:{timeZone:'America/Vancouver',sessionStartedAt:new Date(Date.now()-22*60000).toISOString()},
    recentHeadlines:['THE PAPERWORK HAS TEETH','SOMEONE AUTHORIZED THIS'],
    recentAchievements:[],
    recentBodyPatterns:['drive-by:other','deadpan:other'],
    recentPerformanceShapes:['drive-by','deadpan'],
    tableLore:['This is an adult Twilight Imperium game night. Council commentary may be profane and hostile about game decisions.']
  };
  if(kind==='opening')return{...base,mode:'opening',speaker:'SmokeTest',players:[{name:'SmokeTest'},{name:'Test2'},{name:'Test3'},{name:'Test4'},{name:'Test5'}],playerCount:5};
  if(kind==='verdict')return{...base,mode:'verdict',speaker:'SmokeTest',playerCount:5,players:[
    {name:'SmokeTest',faction:'The Nekro Virus'},
    {name:'Test2',faction:'The Universities of Jol-Nar'},
    {name:'Test3',faction:'The Mentak Coalition'},
    {name:'Test4',faction:'The Embers of Muaat'},
    {name:'Test5',faction:'The Xxcha Kingdom'}
  ]};
  return{...base,mode:'pick',player:'SmokeTest',playerCount:5,pickNumber:4,faction:'The Nekro Virus',rejected:['The Universities of Jol-Nar','The Yin Brotherhood'],alreadyPicked:[
    {player:'Test2',faction:'The Universities of Jol-Nar'},
    {player:'Test3',faction:'The Mentak Coalition'},
    {player:'Test4',faction:'The Embers of Muaat'}
  ],draftSignals:{selectionSwitches:2,recentUndo:false},history:{totalDraftPicks:3,tableLore:[]}};
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const kind=['opening','pick','verdict'].includes(String(req.query?.case||''))?String(req.query.case):'pick';
  const fakeReq={method:'POST',body:payloadFor(kind),headers:{}};
  const captured={statusCode:200,body:null,headers:{}};
  const fakeRes={
    setHeader:(k,v)=>{captured.headers[k]=v;return fakeRes},
    status:c=>{captured.statusCode=c;return fakeRes},
    json:b=>{captured.body=b;return fakeRes},
    end:b=>{captured.body=b;return fakeRes},
    send:b=>{captured.body=b;return fakeRes}
  };
  await councilV7(fakeReq,fakeRes);
  return res.status(captured.statusCode).json({smoke:true,case:kind,status:captured.statusCode,result:captured.body});
};
