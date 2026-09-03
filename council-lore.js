const COUNCIL_TABLE_LORE_VERSION=1;
const COUNCIL_TABLE_LORE={
  joshua:[
    'Self-declared chaos goblin. Actively prefers spectacular, weird, risky, or disruptive game choices when they make the table more entertaining.'
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
