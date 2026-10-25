const fs=require('node:fs');
module.exports=async function connect(port=9250){
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();const tab=tabs.find(t=>t.type==='page'&&t.url.includes('localhost:8799'))||tabs.find(t=>t.type==='page');if(!tab)throw Error('No page');
 const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});let id=0;const pending=new Map(),events=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method)events.push(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
 const call=(method,params={})=>new Promise((ok,no)=>{const i=++id;pending.set(i,{resolve:ok,reject:no});ws.send(JSON.stringify({id:i,method,params}));});
 const val=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const shot=async(path)=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path,Buffer.from(r.data,'base64'));};
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');return{call,val,wait,shot,events,close:()=>ws.close()};
};
