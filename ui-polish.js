/* Small interaction polish kept separate from the core draft logic. */
(function(){
  function enhanceFactionCards(root=document){
    root.querySelectorAll?.('.faction-card').forEach(card=>{
      const locked=card.classList.contains('locked');
      card.setAttribute('role','button');
      card.setAttribute('tabindex',locked?'-1':'0');
      card.setAttribute('aria-disabled',locked?'true':'false');
      card.setAttribute('aria-pressed',card.classList.contains('selected')?'true':'false');
      const name=card.dataset.faction||'Faction';
      card.setAttribute('aria-label',`${name}${locked?' unavailable':card.classList.contains('selected')?' selected — activate again for full reference':' — activate to select and inspect'}`);
    });
  }

  function activateFactionCard(card){
    if(!card||card.classList.contains('locked')||card.getAttribute('aria-disabled')==='true')return;
    const name=card.dataset.faction;if(!name)return;
    if(state.phase==='pick'&&$('#setupView').classList.contains('active')){
      if(state.selected===name)openFaction(name);else selectFaction(name);
    }else openFaction(name);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.faction-card');
    if(!card)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    activateFactionCard(card);
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const card=e.target.closest?.('.faction-card[role="button"]');
    if(!card)return;
    e.preventDefault();activateFactionCard(card);
  });

  ['#stageScreen','#guideGrid'].forEach(selector=>{
    const root=$(selector);if(!root)return;
    new MutationObserver(()=>enhanceFactionCards(root)).observe(root,{childList:true,subtree:true});
  });
  enhanceFactionCards();

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

  if(typeof councilDecorateFinal==='function'){
    const baseDecorateFinal=councilDecorateFinal;
    councilDecorateFinal=function(){
      baseDecorateFinal();
      const stage=$('#stageScreen'),actions=stage?.querySelector('.stage-actions'),status=stage?.querySelector('.session-final-status'),btn=stage?.querySelector('#sessionCloseBtn');
      if(!stage||!actions)return;
      actions.classList.add('final-actions');
      const session=councilCurrentSession?.(councilLoadStore?.());
      if(session&&status){
        status.innerHTML=session.status==='complete'
          ?`<span>GAME RESULT RECORDED</span><b>${councilEscape(session.winnerName||'Winner recorded')}${session.winnerVp!=null?` • ${session.winnerVp} VP`:''}</b>`
          :`<span>COUNCIL RECORD ACTIVE</span><b>Awaiting final game result</b>`;
      }
      if(btn){
        btn.textContent=session?.status==='complete'?'Edit Game Result':'Record Game Result';
        actions.insertBefore(btn,actions.firstChild);
      }
    };
  }

  if(typeof councilOpenSessionForm==='function'){
    const baseOpenSessionForm=councilOpenSessionForm;
    councilOpenSessionForm=function(sessionId){
      baseOpenSessionForm(sessionId);
      const title=$('#modalBody .modal-title'),help=$('#modalBody .record-help'),save=$('#sealRecord');
      if(title)title.textContent='Record Game Result';
      if(help)help.textContent='Record what actually happened. Winner is required; victory points and one Council lore note are optional.';
      if(save)save.textContent='Save Game Result';
    };
  }

  if(typeof councilRenderArchive==='function'){
    const baseRenderArchive=councilRenderArchive;
    councilRenderArchive=function(){
      baseRenderArchive();
      document.querySelectorAll('.session-card.pending .session-top b').forEach(el=>el.textContent='AWAITING GAME RESULT');
      document.querySelectorAll('[data-edit-session]').forEach(btn=>{
        if(btn.textContent.trim()==='Seal Result')btn.textContent='Record Result';
      });
    };
  }
})();
