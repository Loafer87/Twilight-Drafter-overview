const TE_PORTRAITS={
  'Last Bastion':{
    url:'https://images-cdn.fantasyflightgames.com/filer_public/f9/b6/f9b6d799-cdc5-48dc-af93-47cd68ebd022/ti11_faction-article_factions_sheet_lastbastion.png',
    size:'260% auto',position:'71% 28%'
  },
  'The Deepwrought Scholarate':{
    url:'https://images-cdn.fantasyflightgames.com/filer_public/10/20/102016e2-4737-4c57-97c3-7dee24f39f09/ti11_faction-article_factions_sheet_thedeepwroughtscholarate.png',
    size:'260% auto',position:'80% 28%'
  },
  'The Crimson Rebellion':{
    url:'https://images-cdn.fantasyflightgames.com/filer_public/aa/f4/aaf4c0bc-cc93-4b9c-bde3-dc5b1b4eb7ae/ti11_faction-article_factions_sheet_thecrimsonrebellion.png',
    size:'260% auto',position:'71% 33%'
  },
  'The Ral Nel Consortium':{
    url:'https://images-cdn.fantasyflightgames.com/filer_public/f0/4e/f04e4aa0-6b97-48e6-957c-233dcf2c9ccd/ti11_article_factions_sheet_theralnelconsortium.png',
    size:'260% auto',position:'79% 35%'
  },
  'The Firmament':{
    url:'https://images-cdn.fantasyflightgames.com/filer_public/c3/1d/c31d42da-dfcd-4889-87f6-6edd85a7e865/ti11_article_factions_sheet_thefirmament.png',
    size:'260% auto',position:'72% 25%'
  }
};

Object.entries(TE_PORTRAITS).forEach(([name,portrait])=>{
  const faction=factions.find(f=>f.name===name);
  if(faction){faction.portrait=portrait;faction.reference=portrait.url}
});

function factionPortraitStyle(f){
  const p=f&&f.portrait;if(!p)return'';
  return `background-image:url(${p.url});background-size:${p.size||'260% auto'};background-position:${p.position||'72% 30%'};background-repeat:no-repeat`;
}

const baseArtMarkupTE=artMarkup;
artMarkup=function(f,cls=''){
  if(f.portrait)return `<div class="card-art portrait-art ${cls}" style="${factionPortraitStyle(f)}" role="img" aria-label="${escapeAttr(f.name)} official faction artwork"></div>`;
  return baseArtMarkupTE(f,cls);
};

const baseOpenFactionTE=openFaction;
openFaction=function(name){
  const f=factions.find(x=>x.name===name);if(!f)return;
  if(!f.reference){baseOpenFactionTE(name);return}
  $('#modalBody').innerHTML=`<div class="modal-title">${f.name}</div><div class="modal-meta">${E[f.exp].name} • ${f.tag}</div><div style="color:var(--text);font-size:14px;line-height:1.5;margin-bottom:14px">${f.blurb}</div><img class="reference-img" src="${f.reference}" alt="${escapeAttr(f.name)} official faction reference sheet" onerror="this.outerHTML='<div class=&quot;modal-fallback&quot;>Official faction reference image could not be loaded.</div>'">`;
  $('#modal').classList.add('open');
};

showCeremony=function(player,f,done){
  const c=$('#ceremony'),btn=$('#ceremonyContinue'),sig=$('#ceremonySigil'),isFinal=state.current===state.players-1;
  $('#ceremonyPlayer').textContent=player;$('#ceremonyName').textContent=f.name;$('#ceremonyPrelude').textContent='The choice is sealed';
  btn.textContent=isFinal?'Submit to Council Intelligence →':'Continue to Council Intelligence →';btn.disabled=true;c.classList.remove('settled','ready','leaving');
  sig.style.setProperty('--accent',f.color);sig.classList.toggle('te-portrait',Boolean(f.portrait));sig.style.backgroundImage='';sig.style.backgroundSize='';sig.style.backgroundPosition='';sig.style.backgroundRepeat='';
  if(f.portrait){sig.innerHTML='';sig.style.backgroundImage=`url(${f.portrait.url})`;sig.style.backgroundSize=f.portrait.size;sig.style.backgroundPosition=f.portrait.position;sig.style.backgroundRepeat='no-repeat'}
  else sig.innerHTML=f.art?`<img src="${f.art}" alt="" onerror="this.outerHTML='<span>${initials(f.name)}</span>'">`:`<span>${initials(f.name)}</span>`;
  c.classList.add('open');playFactionStinger();requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.add('settled')));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,armDelay=reduced?250:2200;
  const armTimer=setTimeout(()=>{btn.disabled=false;c.classList.add('ready');btn.focus({preventScroll:true})},armDelay);
  const finish=()=>{if(btn.disabled)return;clearTimeout(armTimer);btn.disabled=true;c.classList.add('leaving');setTimeout(()=>{c.classList.remove('open','settled','ready','leaving');done()},reduced?20:820)};btn.onclick=finish;
};

rosterHtml=function(){return state.picks.map(p=>{const f=p.faction,portrait=f.portrait?`<div class="roster-sigil te-roster-portrait" style="${factionPortraitStyle(f)}"></div>`:`<div class="roster-sigil">${f.art?`<img src="${f.art}" alt="" onerror="this.outerHTML='${initials(f.name)}'">`:initials(f.name)}</div>`;return `<div class="roster-card" style="--accent:${f.color}">${portrait}<div><div class="roster-player">${p.pos===0?'✦ ':''}${playerName(p.playerIdx)}${p.pos===0?'<span class="crown">SPEAKER</span>':''}</div><div class="roster-faction">${f.name}</div><div class="roster-meta">Pick ${p.pos+1} • ${E[f.exp].short} • ${f.tag}</div></div></div>`}).join('')};
