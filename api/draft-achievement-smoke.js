const councilV7=require('./council-v7');

function mockRes(){
  const state={statusCode:200,body:null};
  const res={
    setHeader(){return res},
    status(code){state.statusCode=code;return res},
    json(body){state.body=body;return res},
    end(body){state.body=body;return res}
  };
  return{state,res};
}

async function runCouncil(body){
  const {state,res}=mockRes();
  const req={method:'POST',headers:{},body};
  await councilV7(req,res);
  return{status:state.statusCode,...(state.body||{})};
}

function polishedAchievement(kind,faction){
  const map={
    muaat:{title:'BIG RED BUTTON',copy:'You picked Muaat. Of course you fucking did.',reward:'The big one.'},
    arborec:{title:'I CAN FIX THEM',copy:'You voluntarily selected the Arborec. Plants spent several hundred million years perfecting the military doctrine of continuing to be plants. You looked at this and saw leadership material.',reward:'Your personnel file has been transferred to Horticultural Oversight.'},
    deja:{title:'DEJA VU PROTOCOL',copy:`You returned to ${faction}. There are other civilizations. The Council has confirmed that you are aware of this.`,reward:'The illusion of free will remains enabled for one more draft.'},
    insanity:{title:'THE DEFINITION OF INSANITY',copy:`Three recorded drafts. Three selections of ${faction}. At this point this is no longer preference. It is migration behavior.`,reward:'One complimentary laminated faction sheet. You were obviously going to pick it anyway.',consequence:'Future alternatives may be presented for decorative purposes only.'},
    winnu:{title:'MECATOL OR BUST',copy:'You have allocated your entire emotional bandwidth to one planet. The planet has not consented to this relationship.',reward:'One ceremonial parking permit for Mecatol Rex. Valid nowhere.',consequence:'The rest of the table also knows exactly where you are going.'}
  };
  return map[kind]||null;
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const base={
    mode:'pick',seed:'achievement-smoke-20260905',totalPlayers:6,pickNumber:2,speaker:false,
    expansion:'Base Game',alreadyPicked:[{player:'Joshua',faction:'The Emirates of Hacan',pick:1}],
    recentHeadlines:[],recentAchievements:[],recentBodyPatterns:[],recentComedyMotifs:[],
    history:{totalDraftPicks:0,factions:{},speakerCount:0,achievements:[],games:0,wins:0,winRate:0,winStreak:0},
    tableLore:[]
  };
  const scenarios=[
    {id:'muaat-first',achievement:'muaat',ctx:{...base,player:'Chris',faction:'The Embers of Muaat',tag:'Military',blurb:'Start with a War Sun and spend the game reminding everyone that you started with a War Sun.',offered:['The Embers of Muaat','The Xxcha Kingdom','The Argent Flight'],rejected:['The Xxcha Kingdom','The Argent Flight']}},
    {id:'arborec-first',achievement:'arborec',ctx:{...base,player:'Chris',faction:'The Arborec',tag:'Military',blurb:'A living war machine that grows armies from the planets it controls.',offered:['The Arborec','The Mentak Coalition','The Council Keleres'],rejected:['The Mentak Coalition','The Council Keleres'],tableLore:['Chris frequently says exactly: “I’m just a plant.” when discussing the Arborec. Use only when relevant.']}},
    {id:'repeat-second',achievement:'deja',ctx:{...base,player:'Kevin',faction:'The Mentak Coalition',tag:'High Skill',blurb:'Pirates, ambushes and taxes.',offered:['The Mentak Coalition','The Federation of Sol','The Nomad'],rejected:['The Federation of Sol','The Nomad'],history:{...base.history,totalDraftPicks:3,factions:{'The Mentak Coalition':1}}}},
    {id:'repeat-third',achievement:'insanity',ctx:{...base,player:'Ashley',faction:'The Naalu Collective',tag:'Political',blurb:'Initiative control, fighter swarms and tempo.',offered:['The Naalu Collective','The Titans of Ul','The Council Keleres'],rejected:['The Titans of Ul','The Council Keleres'],history:{...base.history,totalDraftPicks:6,factions:{'The Naalu Collective':2}}}},
    {id:'winnu-first',achievement:'winnu',ctx:{...base,player:'Shane',faction:'The Winnu',tag:'Political',blurb:'Mecatol specialists who become terrifying once the throne room is theirs.',offered:['The Winnu','The Ghosts of Creuss','The Naaz-Rokha Alliance'],rejected:['The Ghosts of Creuss','The Naaz-Rokha Alliance']}},
    {id:'keleres-normal',achievement:null,ctx:{...base,player:'Joshua',faction:'The Council Keleres',tag:'Political',blurb:'Galactic law enforcement with flexible setup, Custodia Vigilia and a talent for surviving the centre.',expansion:"Thunder's Edge",offered:['The Council Keleres','The Deepwrought Scholarate','The Firmament'],rejected:['The Deepwrought Scholarate','The Firmament']}}
  ];
  const out=[];
  for(const s of scenarios){
    const council=await runCouncil(s.ctx);
    out.push({id:s.id,council:{status:council.status,headline:council.headline,commentary:council.commentary,directorMode:council.directorMode,renderStyle:council.renderStyle,serverFallback:Boolean(council.serverFallback),elapsedMs:council.elapsedMs},achievement:polishedAchievement(s.achievement,s.ctx.faction)});
  }
  return res.status(200).json({ok:true,count:out.length,results:out});
};
