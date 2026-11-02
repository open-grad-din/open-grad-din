const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const svg=fs.readFileSync('favicon.svg','utf8');
for(const [n,s,pad] of [['favicon-32.png',32,0],['apple-touch-icon.png',180,1],['icon-512.png',512,1]]){
const p=await b.newPage({viewport:{width:s,height:s}});
const inner=pad?svg.replace('rx="16"','rx="0"'):svg;
await p.setContent(`<html><body style="margin:0;background:${pad?'#f8f4ec':'transparent'}"><div style="width:${s}px;height:${s}px;display:grid;place-items:center">${inner.replace('<svg ',`<svg width="${pad?s*0.86:s}" height="${pad?s*0.86:s}" `)}</div></body></html>`);
await p.screenshot({path:n,omitBackground:!pad});await p.close();}
await b.close();})();
