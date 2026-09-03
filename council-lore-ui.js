const councilRenderArchiveBeforeLore=councilRenderArchive;
councilRenderArchive=function(){
  councilRenderArchiveBeforeLore();
  const root=$('#councilArchive');if(!root)return;const store=councilLoadStore(),profiles=[...store.profiles].sort((a,b)=>{const ha=councilHistoryFor(a.id),hb=councilHistoryFor(b.id);return hb.wins-ha.wins||hb.games-ha.games||hb.total-ha.total});
  root.querySelectorAll('.profile-card').forEach((card,i)=>{
    const lore=profiles[i]?.lore||[];if(!lore.length)return;
    const block=document.createElement('div');block.className='profile-lore';const label=document.createElement('div');label.className='profile-lore-label';label.textContent='TABLE LORE // AUTHORIZED RUNNING JOKES';block.appendChild(label);
    lore.forEach(item=>{const p=document.createElement('p');p.textContent=item;block.appendChild(p)});
    const alias=card.querySelector('.profile-alias-btn');card.insertBefore(block,alias||null);
  });
};
