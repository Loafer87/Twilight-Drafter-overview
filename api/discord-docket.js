const DOCKET_URL='https://dwngxrdmpbknjzzphkjd.supabase.co/functions/v1/galactic-council-docket';

const PLAYER_ALIASES={
  joshua:'Joshua',josh:'Joshua',
  chris:'Chris',collins:'Chris',
  ashley:'Ashley',ash:'Ashley',
  kevin:'Kevin',halldorslurs:'Kevin',
  shane:'Shane'
};

function clean(v,max=2000){return String(v??'').replace(/\u0000/g,'').trim().slice(0,max)}
function canonicalPlayer(raw){
  const source=clean(raw,100),lower=source.toLowerCase();
  if(PLAYER_ALIASES[lower])return PLAYER_ALIASES[lower];
  for(const [alias,name] of Object.entries(PLAYER_ALIASES)){
    const re=new RegExp('(^|[^a-z0-9])'+alias+'([^a-z0-9]|$)','i');
    if(re.test(lower))return name;
  }
  return source||null;
}
function inferTarget(text){
  const source=String(text||'');
  for(const [alias,name] of Object.entries(PLAYER_ALIASES)){
    const re=new RegExp('(?:against|vs\\.?|versus|from|on)\\s+(?:<@!?\\d+>|@)?'+alias+'\\b','i');
    if(re.test(source))return name;
  }
  const named=source.match(/(?:against|vs\.?|versus)\s+([A-Za-z][A-Za-z0-9_-]{1,30})/i);
  return named?canonicalPlayer(named[1]):null;
}
function extractCaseNumber(text){
  const m=String(text||'').match(/(?:case|docket|appeal|motion|injunction|objection)\s*#?\s*(\d{1,6})/i);
  return m?Number(m[1]):null;
}
function detectDocketIntent(message){
  const text=clean(message,1800),lower=text.toLowerCase();
  let kind=null;
  if(/\b(?:file\s+)?(?:a\s+)?grievance\b|\bgrievance\s+against\b/i.test(text))kind='grievance';
  else if(/\bappeal\b|\bmotion\s+to\s+reconsider\b/i.test(text))kind='appeal';
  else if(/\b(?:emergency\s+)?injunction\b|\bstay\b/i.test(text))kind='injunction';
  else if(/\bmotion\b/i.test(text))kind='motion';
  else if(/\bobjection\b/i.test(text))kind='objection';
  else if(/\baccus(?:e|ation)\b/i.test(text))kind='accuse';
  if(!kind)return null;
  return{
    kind,
    caseNumber:extractCaseNumber(text),
    targetName:inferTarget(text),
    text,
    explicit:true,
    asksToOverrule:/\b(?:overrule|vacate|reverse|reconsider|strike|set aside)\b/i.test(lower)
  };
}
async function docketFetch(path='?limit=16'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
  try{
    const r=await fetch(DOCKET_URL+path,{method:'GET',headers:{Accept:'application/json','X-Council-Source':'discord'},signal:controller.signal});
    if(!r.ok)return null;return await r.json();
  }catch(e){return null}finally{clearTimeout(timer)}
}
function keywords(text){
  return new Set(String(text||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x=>x.length>=5).slice(0,30));
}
function relevantCases(cases,intent,invoker){
  const target=canonicalPlayer(intent?.targetName),speaker=canonicalPlayer(invoker),ks=keywords(intent?.text);
  return (cases||[]).map(row=>{
    let score=0;
    const filer=canonicalPlayer(row.filer_name),subject=canonicalPlayer(row.target_name);
    if(target&&(subject===target||filer===target))score+=8;
    if(speaker&&(subject===speaker||filer===speaker))score+=4;
    const hay=[row.title,row.original_claim,row.current_ruling].filter(Boolean).join(' ').toLowerCase();
    for(const k of ks)if(hay.includes(k))score++;
    if(row.precedent)score+=2;
    return{row,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(b.row.case_number)-Number(a.row.case_number)).slice(0,5).map(x=>x.row);
}
async function fetchDocketContext(intent,invoker){
  if(!intent)return{cases:[],exactCase:null};
  if(intent.caseNumber){
    const exact=await docketFetch('?case='+encodeURIComponent(intent.caseNumber));
    return{cases:exact?.case?[exact.case]:[],exactCase:exact?.case||null};
  }
  const recent=await docketFetch('?limit=18');
  const rows=recent?.cases||[];
  return{cases:relevantCases(rows,intent,invoker),exactCase:null};
}
function boolPrecedent(v){return v===true||/^(?:yes|true)$/i.test(String(v||''))}
async function persistDocket({intent,invoker,invokerId,result}){
  if(!intent)return null;
  const isAppend=Boolean(intent.caseNumber&&intent.kind!=='grievance'&&intent.kind!=='accuse');
  const body={
    action:isAppend?'append':'file',
    caseNumber:isAppend?intent.caseNumber:null,
    filingType:intent.kind,
    filerName:canonicalPlayer(invoker)||clean(invoker,100)||'Unknown',
    filerDiscordId:clean(invokerId,40)||null,
    targetName:canonicalPlayer(result?.docketTarget||intent.targetName)||null,
    text:intent.text,
    title:clean(result?.headline,140)||null,
    disposition:clean(result?.docketDisposition,40)||'ADVISORY',
    rulingHeadline:clean(result?.headline,120)||null,
    rulingBody:clean(result?.commentary,1800)||null,
    precedent:boolPrecedent(result?.docketPrecedent)
  };
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2200);
  try{
    const r=await fetch(DOCKET_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Council-Source':'discord'},body:JSON.stringify(body),signal:controller.signal});
    if(!r.ok)return null;return await r.json();
  }catch(e){return null}finally{clearTimeout(timer)}
}
function docketDirective(intent,context){
  if(!intent)return'COURT MODE: No formal filing is active. Do not invent a docket number or pretend ordinary banter is a legal filing.';
  const caseText=context?.exactCase?JSON.stringify(context.exactCase):JSON.stringify(context?.cases||[]);
  const kind=String(intent.kind||'grievance').toUpperCase();
  return `COUNCIL COURT MODE — ${kind}: This is a formal fictional filing before Council Intelligence. The AI/System is the final adjudicator inside this game-night fiction. Humans may petition, argue, appeal, move, object and ask for stays; they do NOT automatically control the ruling. You may grant, deny, dismiss, uphold, modify, vacate, overrule or sanction fictional procedure as appropriate.

Docket evidence: ${caseText}

LEGAL MEMORY RULES:
- A grievance is an allegation, not proof that the target actually did the alleged thing.
- Existing docket records are evidence of prior filings and rulings. Distinguish allegation from established table lore.
- Appeals and motions may change a prior ruling. If you overturn or modify one, say so clearly.
- Precedent should be RARE. Mark precedent YES only if the ruling establishes a reusable house-procedure principle likely to matter again. A funny one-off insult is not precedent.
- Do not invent a case number. The system assigns the number after your ruling.
- For appeals/motions that cite a case number, reason from the supplied exact case. If no matching case exists, dismiss for nonexistent jurisdiction instead of inventing history.
- This is fictional game-night procedure. Do not present it as real legal advice.

For this filing, DOCKET_DISPOSITION must be one of GRANTED, DENIED, DISMISSED, UPHELD, MODIFIED, OVERRULED, VACATED, SANCTIONED, or ADVISORY. DOCKET_PRECEDENT must be YES or NO. DOCKET_TARGET should name the subject of the filing if one is clear, otherwise NONE.`;
}

module.exports={detectDocketIntent,fetchDocketContext,persistDocket,docketDirective,canonicalPlayer};