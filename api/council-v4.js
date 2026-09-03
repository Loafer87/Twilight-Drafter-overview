const councilV3=require('./council-v3');

function modeFor(req){const mode=req?.body?.mode;return mode==='opening'?'opening':mode==='verdict'?'verdict':'pick'}
function qualityCheck(payload,mode){
  const body=String(payload?.commentary||'').trim();
  if(!body)return false;
  const words=body.split(/\s+/).filter(Boolean).length,chars=body.length;
  const minWords=mode==='pick'?7:12,minChars=mode==='pick'?38:65;
  if(words<minWords||chars<minChars)return false;
  const terminal=/[.!?…]["')\]}]*$/.test(body);
  if(!terminal&&chars<120)return false;
  const dangling=/(?:\b(?:and|or|but|because|with|without|of|to|for|from|by|as|the|a|an|has|have|is|are|was|were|into|through|before|after)\b|[,;:—-])$/i.test(body);
  if(dangling&&chars<160)return false;
  return true;
}
function proxyResponse(){
  const state={status:200,payload:null,headers:{},ended:false};
  const proxy={
    setHeader(name,value){state.headers[name]=value;return proxy},
    status(code){state.status=code;return proxy},
    json(payload){state.payload=payload;state.ended=true;return proxy},
    end(){state.ended=true;return proxy}
  };
  return{state,proxy};
}
async function runV3(req){const {state,proxy}=proxyResponse();await councilV3(req,proxy);return state}
function applyHeaders(res,headers){Object.entries(headers||{}).forEach(([k,v])=>{try{res.setHeader(k,v)}catch(e){}})}
function forward(res,result){applyHeaders(res,result?.headers);if(result?.payload!=null)return res.status(result.status||200).json(result.payload);return res.status(result?.status||204).end()}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return councilV3(req,res);
  const mode=modeFor(req);let last=null;
  try{
    for(let attempt=0;attempt<2;attempt++){
      last=await runV3(req);
      if(last.status===200&&qualityCheck(last.payload,mode))return forward(res,last);
      if(last.status!==200&&last.status<500)break;
    }
    if(last?.status===200){applyHeaders(res,last.headers);return res.status(502).json({error:'Council response failed quality check',code:'incomplete_response'})}
    return forward(res,last||{status:502,payload:{error:'Council response unavailable',code:'empty_response'},headers:{}});
  }catch(e){return res.status(500).json({error:'Council quality gate malfunction',code:'server_error'})}
};
