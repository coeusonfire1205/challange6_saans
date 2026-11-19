export const hosted=process.env.NODE_ENV==='production'||process.env.VERCEL==='1'||process.env.RENDER==='true';
export const bindHost=process.env.HOST||(hosted?'0.0.0.0':'127.0.0.1');
export function permittedRequest(req,port){
 const host=req.headers.host||'';
 const localHosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`]);
 if(!hosted&&!localHosts.has(host))return 'Local access only';
 if(req.method==='POST'&&req.headers.origin){
  const allowed=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
  if(hosted){
   allowed.clear();
   // Host is supplied by the serving platform; never trust arbitrary forwarded-host headers.
   if(host&&!/[\s/@\\]/.test(host))allowed.add('https://'+host);
   for(const value of [process.env.PUBLIC_ORIGIN,process.env.RENDER_EXTERNAL_URL,process.env.VERCEL_URL&&'https://'+process.env.VERCEL_URL]){
    if(value){try{allowed.add(new URL(value).origin);}catch{}}
   }
  }
  if(!allowed.has(req.headers.origin))return 'Origin not allowed';
 }
 return null;
}
