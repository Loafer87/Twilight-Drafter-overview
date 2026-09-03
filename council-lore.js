const COUNCIL_TABLE_LORE_VERSION=2;
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
    'Has one long-ago victory and is currently enduring an extended championship drought.'
  ]
};
function councilMergeLore(existing,incoming){return[...(existing||[]),...(incoming||[])].filter((x,i,arr)=>arr.findIndex(y=>String(y).trim().toLowerCase()===String(x).trim().toLowerCase())===i)}
function councilApplyTableLoreSeed(){
  const joshua=councilResolveProfile('Joshua',true),chris=councilResolveProfile('Chris',true),store=councilLoadStore();
  store.meta=store.meta||{};if((store.meta.tableLoreSeed||0)>=COUNCIL_TABLE_LORE_VERSION)return;
  const j=store.profiles.find(p=>p.id===joshua.id),c=store.profiles.find(p=>p.id===chris.id);
  if(j)j.lore=councilMergeLore(j.lore,COUNCIL_TABLE_LORE.joshua);
  if(c)c.lore=councilMergeLore(c.lore,COUNCIL_TABLE_LORE.chris);
  store.meta.tableLoreSeed=COUNCIL_TABLE_LORE_VERSION;councilSaveStore(store);
}
function councilLoreFor(playerOrId){const store=councilLoadStore(),profile=councilFindProfile(store,playerOrId);return profile?.lore?[...profile.lore]:[]}
councilApplyTableLoreSeed();
const councilHistoryForBeforeLore=councilHistoryFor;
councilHistoryFor=function(playerOrId){const h=councilHistoryForBeforeLore(playerOrId);return{...h,tableLore:h.profile?.lore?[...h.profile.lore]:[]}};
const councilContextBeforeLore=councilContext;
councilContext=function(a,f){const ctx=councilContextBeforeLore(a,f);ctx.history={...(ctx.history||{}),tableLore:councilLoreFor(ctx.playerId||ctx.player)};return ctx};
if(typeof councilHistoryPayload==='function'){
  const councilHistoryPayloadBeforeLore=councilHistoryPayload;
  councilHistoryPayload=function(history){return{...councilHistoryPayloadBeforeLore(history),tableLore:[...(history.tableLore||history.profile?.lore||[])]}};
}
