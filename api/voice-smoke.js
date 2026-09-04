const councilVoice=require('./council-voice');

module.exports=async function handler(req,res){
  const captured={statusCode:200,headers:{},body:null};
  const fakeRes={
    setHeader:(k,v)=>{captured.headers[String(k).toLowerCase()]=String(v);return fakeRes},
    status:c=>{captured.statusCode=c;return fakeRes},
    json:b=>{captured.body=b;return fakeRes},
    send:b=>{captured.body=b;return fakeRes},
    end:b=>{captured.body=b;return fakeRes}
  };
  await councilVoice({method:'POST',headers:{},body:{text:'Council voice calibration. Restored voice authorization confirmed.',mode:'pick',directorMode:'deadpan'}},fakeRes);
  const provider=captured.headers['x-council-voice-provider']||null;
  const bytes=Buffer.isBuffer(captured.body)?captured.body.length:0;
  return res.status(200).json({voiceStatus:captured.statusCode,provider,bytes,contentType:captured.headers['content-type']||null,error:Buffer.isBuffer(captured.body)?null:captured.body||null});
};
