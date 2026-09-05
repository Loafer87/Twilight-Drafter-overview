// Drafter-only achievement polish. Keeps the existing achievement triggers/titles
// intact, but gives the notifications a more expressive system-AI voice plus
// optional reward/consequence lines. Loaded last so it can decorate the stable UI
// without touching Council API timing, draft state, memory, or undo behavior.

councilAchievementFor=function(ctx,afterHistory){
  const count=afterHistory.factions[ctx.faction]||0;

  if(count>=3)return{
    title:'THE DEFINITION OF INSANITY',
    copy:`Three recorded drafts. Three selections of ${ctx.faction}. At this point this is no longer preference. It is migration behavior.`,
    reward:'One complimentary laminated faction sheet. You were obviously going to pick it anyway.',
    consequence:'Future alternatives may be presented for decorative purposes only.'
  };

  if(count===2)return{
    title:'DEJA VU PROTOCOL',
    copy:`You returned to ${ctx.faction}. There are other civilizations. The Council has confirmed that you are aware of this.`,
    reward:'The illusion of free will remains enabled for one more draft.'
  };

  const specials={
    'The Arborec':{
      title:'I CAN FIX THEM',
      copy:'You voluntarily selected the Arborec. Plants spent several hundred million years perfecting the military doctrine of continuing to be plants. You looked at this and saw leadership material.',
      reward:'Your personnel file has been transferred to Horticultural Oversight.'
    },
    'The Clan of Saar':{
      title:'HOMELESS BY CHOICE',
      copy:'You rejected the concept of a home system as strategically limiting. Property ownership has been reviewed and found insufficiently mobile.',
      reward:'A forwarding address will not be provided.'
    },
    'The Embers of Muaat':{
      title:'BIG RED BUTTON',
      copy:'You picked Muaat. Of course you fucking did.',
      reward:'The big one.'
    },
    'The Nekro Virus':{
      title:'TECH SUPPORT NIGHTMARE',
      copy:'You selected a research strategy based primarily on hitting educated people until the useful ideas fall out.',
      reward:'An honorary doctorate in Applied Theft.'
    },
    'The Winnu':{
      title:'MECATOL OR BUST',
      copy:'You have allocated your entire emotional bandwidth to one planet. The planet has not consented to this relationship.',
      reward:'One ceremonial parking permit for Mecatol Rex. Valid nowhere.',
      consequence:'The rest of the table also knows exactly where you are going.'
    },
    "The Vuil'raith Cabal":{
      title:'FREE RANGE SPACE MONSTERS',
      copy:'You have turned enemy plastic into inventory and violence into procurement. Supply-chain management has become carnivorous.',
      reward:'A deeply concerning warehouse lease.'
    }
  };

  if(specials[ctx.faction])return specials[ctx.faction];

  if(afterHistory.total===5)return{
    title:'REPEAT OFFENDER',
    copy:'Five recorded faction selections. This is enough data for the Council to stop calling them isolated incidents.',
    reward:'Your file now requires a second staple.'
  };

  if(afterHistory.speakerCount===3&&ctx.speaker)return{
    title:'THE TOKEN KNOWS YOUR NAME',
    copy:'Three recorded turns as Speaker. At this point the token is beginning to assume you work here.',
    reward:'A chair with your name on it. It is not actually your chair.'
  };

  return null;
};

const councilAchievementPolishBase=showCouncilIntelligence;
showCouncilIntelligence=function(result,ctx,achievement,done){
  councilAchievementPolishBase(result,ctx,achievement,done);
  if(!achievement)return;
  const ach=$('#intelAchievement');
  if(!ach)return;
  const copy=ach.querySelector('.intel-ach-copy');
  if(!copy)return;

  if(achievement.reward){
    const reward=document.createElement('div');
    reward.className='intel-ach-reward';
    const label=document.createElement('b');
    label.textContent='Reward: ';
    reward.append(label,document.createTextNode(achievement.reward));
    copy.appendChild(reward);
  }

  if(achievement.consequence){
    const consequence=document.createElement('div');
    consequence.className='intel-ach-consequence';
    const label=document.createElement('b');
    label.textContent='Consequence: ';
    consequence.append(label,document.createTextNode(achievement.consequence));
    copy.appendChild(consequence);
  }
};
