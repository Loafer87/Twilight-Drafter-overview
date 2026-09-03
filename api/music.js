const TRACKS={
  event:'1XNsZZNg82Jofsgg40mW_foaGvKpgmIfN',
  cathedral:'1042OG2Jy9F0SHZsttl7u7c9lJBhUBrPz'
};
function allowedOrigin(origin){return origin==='https://loafer87.github.io'||origin==='https://twilight-drafter-overview.vercel.app'||/^https:\/\/twilight-drafter-overview-[a-z0-9-]+\.vercel\.app$/i.test(origin)}
function setCors(req,res){const origin=String(req.headers?.origin||'');if(origin&&allowedOrigin(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,HEAD,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Range');res.setHeader('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges');return origin}
module.exports=async function handler(req,res){
  const origin=setCors(req,res);if(req.method==='OPTIONS')return res.status(204).end();if(origin&&!allowedOrigin(origin))return res.status(403).end('Origin not allowed');if(!['GET','HEAD'].includes(req.method))return res.status(405).end('Method not allowed');
  const track=String(req.query?.track||'event').toLowerCase(),id=TRACKS[track];if(!id)return res.status(404).end('Unknown track');
  try{
    const headers={};if(req.headers?.range)headers.Range=req.headers.range;
    const upstream=await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,{headers,redirect:'follow'});
    if(!upstream.ok&&upstream.status!==206)return res.status(upstream.status).end('Track unavailable');
    res.status(upstream.status===206?206:200);
    res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Disposition','inline');res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    for(const h of ['content-length','content-range','accept-ranges','etag','last-modified']){const v=upstream.headers.get(h);if(v)res.setHeader(h,v)}
    if(req.method==='HEAD')return res.end();
    const bytes=Buffer.from(await upstream.arrayBuffer());if(!res.getHeader('Content-Length'))res.setHeader('Content-Length',String(bytes.length));return res.end(bytes);
  }catch(e){return res.status(502).end('Soundtrack uplink failed')}
}
