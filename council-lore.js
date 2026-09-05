const COUNCIL_TABLE_LORE_VERSION=7;
const COUNCIL_TABLE_LORE={
  joshua:[
    'Self-declared chaos goblin. Actively prefers spectacular, weird, risky, or disruptive game choices when they make the table more entertaining.',
    'Reigning Banana Tyrant after back-to-back victories. Treats the Golden Banana championship as evidence of a completely legitimate mandate to rule the table.',
    'Self-appointed King of Twilight. Speaker tokens, victories, minor procedural advantages, and ceremonial attention are all liable to be interpreted as proof of sovereignty.',
    'Petty grievance archivist. Harmless table slights have a habit of becoming vendettas, decrees, propaganda, treaties, or future memes.',
    'Values entertainment above stability. Competent play is acceptable; competent play that also causes the table to yell is preferable.',
    'Ceremonial narcissist in the game-night sense: deeply enjoys unnecessary theatricality, especially when the ceremony happens to concern him.',
    'Possesses suspicious levels of confidence. Consecutive victories have not made him quieter, more cautious, or less convinced the evening has a protagonist.'
  ],
  chris:[
    'Coffee is life. Treat caffeine as a strategic resource, sacred object, and likely explanation for continued Council attendance.',
    'Historically loved redos and backsies until the table enacted a rule forbidding players from reversing declared choices. Bureaucracy was forced to intervene.',
    'Has one long-ago victory and is currently enduring an extended championship drought.',
    'Loves The Arborec and treats them as a signature faction. When playing them, he habitually says, "I’m just a plant." The Council may treat this botanical alibi as established table lore.',
    'Calls Dreadnoughts "Wetty Dreddys." The table loudly claims to hate the phrase, instantly understands it, and has unfortunately grown fond of it anyway. This is verified recurring table lore, not a typo.'
  ],
  ashley:[
    'Frequently says "I’m just a girl" as disarming table camouflage. Treat the phrase as a recurring gameplay bit, not as evidence that she is harmless.',
    'A smart, sneaky player who actively looks for the winning line and is perfectly willing to let the table underestimate her while she sets it up.',
    'Hates being attacked and reacts accordingly, while remaining entirely comfortable attacking other people when it helps her position. The Council recognizes the hypocrisy as strategically efficient.',
    'Won the most recent game played without Joshua present and now claims that victory should make her the champion. Joshua disputes the jurisdiction of this title transfer.',
    'Uses charm, diplomacy, and table presence as legitimate strategic weapons when they can help convert a position into a win.',
    'Brings her own organizers for the plastic pieces. This level of component preparedness should be treated as both practical competence and mildly threatening evidence of intent.'
  ],
  kevin:[
    'Meme archivist and cultural vandal. If something stupid happens at the table, Kevin will have it captioned, preserved, and entered into the historical record before the next strategy phase.',
    'Repeat Mentak offender. He won with them, then a few games later the table discovered one of his favourite Mentak interpretations was, in fact, bullshit. The victory remains in the record under a permanent little asterisk.',
    'Everyone’s ally right up until the exact second being your ally stops being profitable. Somehow every negotiation with Kevin sounds friendly and mildly incriminating at the same time.',
    'Hoarder of trade goods. Kevin can sit on a glittering dragon pile of galactic cash while explaining with a straight face that the economy is actually doing great.'
  ],
  shane:[
    'The man who taught the table Twilight Imperium, which technically makes every later rules argument at least a little bit his fault.',
    'Practices pre-emptive cartography: points at a planet several turns early and announces that it is "his." If you take it anyway, you have not captured a planet; you have opened a blood feud.',
    'Keeps the game moving. When the table dissolves into memes, side treaties, snack archaeology, and three simultaneous rules arguments, Shane becomes the unwilling substitute teacher and starts putting adults back on turn order.'
  ]
};
const COUNCIL_ARBOREC_CHRIS_LORE='Chris loves The Arborec and habitually says "I’m just a plant" when playing them. This is verified table lore and may be used for callbacks or to roast anyone entering Chris’s botanical territory.';
const COUNCIL_WETTY_DREDDYS_LORE='Chris calls Dreadnoughts "Wetty Dreddys." Everyone at the table claims to hate the phrase but also immediately understands it and secretly enjoys the bit. This is verified table lore. Use it only as an occasional callback when Dreadnoughts, Dreadnought upgrades, Dreadnought-heavy factions, or conspicuously large fleet talk makes it relevant; do not force it into unrelated reactions.';
function councilMergeLore(existing,incoming){return[...(existing||[]),...(incoming||[])].filter((x,i,arr)=>arr.findIndex(y=>String(y).trim().toLowerCase()===String(x).trim().toLowerCase())===i)}
function councilPruneLoreByPrefix(existing,prefixes){return(existing||[]).filter(line=>!prefixes.some(prefix=>String(line||'').startsWith(prefix)))}
function councilApplyTableLoreSeed(){
  const joshua=councilResolveProfile('Joshua',true),chris=councilResolveProfile('Chris',true),ashley=councilResolveProfile('Ashley',true),kevin=councilResolveProfile('Kevin',true),shane=councilResolveProfile('Shane',true);
  councilAddAlias(ashley.id,'Ash');
  const store=councilLoadStore();
  store.meta=store.meta||{};if((store.meta.tableLoreSeed||0)>=COUNCIL_TABLE_LORE_VERSION)return;
  const j=store.profiles.find(p=>p.id===joshua.id),c=store.profiles.find(p=>p.id===chris.id),a=store.profiles.find(p=>p.id===ashley.id),k=store.profiles.find(p=>p.id===kevin.id),s=store.profiles.find(p=>p.id===shane.id);
  if(j)j.lore=councilMergeLore(j.lore,COUNCIL_TABLE_LORE.joshua);
  if(c)c.lore=councilMergeLore(c.lore,COUNCIL_TABLE_LORE.chris);
  if(a)a.lore=councilMergeLore(a.lore,COUNCIL_TABLE_LORE.ashley);
  if(k){
    k.lore=councilPruneLoreByPrefix(k.lore,['Meme master.','Played The Mentak Coalition','Somehow presents as everyone’s ally','Loves hoarding trade goods.']);
    k.lore=councilMergeLore(k.lore,COUNCIL_TABLE_LORE.kevin);
  }
  if(s){
    s.lore=councilPruneLoreByPrefix(s.lore,['Taught the group how to play Twilight Imperium.','Likes to claim planets ahead of time','Keeps the table on track when he plays.']);
    s.lore=councilMergeLore(s.lore,COUNCIL_TABLE_LORE.shane);
  }
  store.meta.tableLoreSeed=COUNCIL_TABLE_LORE_VERSION;councilSaveStore(store);
}
function councilLoreFor(playerOrId){const store=councilLoadStore(),profile=councilFindProfile(store,playerOrId);return profile?.lore?[...profile.lore]:[]}
councilApplyTableLoreSeed();
const councilHistoryForBeforeLore=councilHistoryFor;
councilHistoryFor=function(playerOrId){const h=councilHistoryForBeforeLore(playerOrId);return{...h,tableLore:h.profile?.lore?[...h.profile.lore]:[]}};
const councilContextBeforeLore=councilContext;
councilContext=function(a,f){const ctx=councilContextBeforeLore(a,f);ctx.history={...(ctx.history||{}),tableLore:councilLoreFor(ctx.playerId||ctx.player)};ctx.tableLore=councilMergeLore(ctx.tableLore,[COUNCIL_WETTY_DREDDYS_LORE]);if(ctx.faction==='The Arborec')ctx.tableLore=councilMergeLore(ctx.tableLore,[COUNCIL_ARBOREC_CHRIS_LORE]);return ctx};
if(typeof councilHistoryPayload==='function'){
  const councilHistoryPayloadBeforeLore=councilHistoryPayload;
  councilHistoryPayload=function(history){return{...councilHistoryPayloadBeforeLore(history),tableLore:[...(history.tableLore||history.profile?.lore||[])]}};
}
