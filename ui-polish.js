/* Small interaction polish kept separate from the core draft logic. */
(function(){
  function activateFactionCard(card){
    if(!card||card.classList.contains('locked')||card.getAttribute('aria-disabled')==='true')return;
    const name=card.dataset.faction;if(!name)return;
    if(state.phase==='pick'&&$('#setupView').classList.contains('active'))selectFaction(name);
    else openFaction(name);
  }

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const card=e.target.closest?.('.faction-card[role="button"]');
    if(!card)return;
    e.preventDefault();activateFactionCard(card);
  });

  const nameEl=$('#ceremonyName');
  if(nameEl){
    const sizeRevealName=()=>{
      const len=(nameEl.textContent||'').trim().length;
      nameEl.classList.toggle('long-name',len>=22&&len<29);
      nameEl.classList.toggle('very-long-name',len>=29);
    };
    new MutationObserver(sizeRevealName).observe(nameEl,{childList:true,characterData:true,subtree:true});
    sizeRevealName();
  }
})();
