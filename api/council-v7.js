const councilV6=require('./council-v6');
const {flavorFor,flavorLore}=require('./council-faction-flavor');

function mergeUnique(a,b){const out=[];for(const x of [...(a||[]),...(b||[])]){const s=String(x||'').trim();if(s&&!out.some(y=>y.toLowerCase()===s.toLowerCase()))out.push(s)}return out}
function enrich(ctx={}){
  const extra=flavorLore(ctx);
  if(ctx.mode==='verdict'){
    const table=(ctx.players||[]).map(p=>({player:p?.name,faction:p?.faction,flavor:flavorFor(p?.faction)})).filter(x=>x.flavor).slice(0,5);
    table.forEach(x=>extra.push(`FINAL-TABLE VISUAL FLAVOR — ${x.player} / ${x.faction}: ${x.flavor.visual} ${x.flavor.table}`));
    if(table.length)extra.push('Final-table visual flavor is optional. Do not turn the verdict into a player-by-player nickname roll call; seize only one visual detail if it genuinely improves the reaction.');
  }
  return{...ctx,tableLore:mergeUnique(ctx.tableLore,extra),factionFlavor:{selected:flavorFor(ctx.faction),rejected:(ctx.rejected||[]).map(flavorFor).filter(Boolean).slice(0,2)}};
}
module.exports=async function handler(req,res){
  if(req.method==='POST'&&req.body)req.body=enrich(req.body);
  return councilV6(req,res);
};
