from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
p=R/'index.html';s=p.read_text();assert 'content="2.8.0"' in s
s=s.replace('content="2.8.0"','content="2.9.0"',1).replace('reader-v28.css','reader-v29.css',1).replace('reader-v28.js','reader-v29.js',1)
s=s.replace('<script src="./encyclopedia-v28.js"></script>','<script src="./visual-seeds-v29.js"></script>\n  <script src="./encyclopedia-v29.js"></script>',1)
a=s.index('async function downloadReaderOffline(');b=s.index('window.RootLabReaderBridge',a)
body=s[a:b];body=body.replace("const items=metas.flatMap(m=>Object.values(m.bundles||{})),cache=await caches.open('rootlab-offline-20261025-v270-universal');let done=0;","const pictures=Object.values(window.ROOTLAB_VISUAL_SEEDS||{}).map(r=>({url:r.image.src}));const items=[...metas.flatMap(m=>Object.values(m.bundles||{})),...pictures],cache=await caches.open('rootlab-offline-20261025-v290-visual');let done=0;")
assert '...pictures' in body;s=s[:a]+body+s[b:];p.write_text(s)
s=(R/'reader-v28.js').read_text()
old="$('profileBody')?.insertAdjacentHTML('beforeend',statsMarkup());"
new="$('profileBody')?.insertAdjacentHTML('beforeend',statsMarkup());const about=$('profileBody')?.querySelector('#readingStatsV24 .visual-preference');if(!about)$('readingStatsV24')?.insertAdjacentHTML('beforeend',window.RootLabEncyclopedia?.preferences()||'');"
assert old in s;s=s.replace(old,new,1)
s=s.replace('词根实验室 · V2.6.1','词根实验室 · V2.9',1)
s=s.replace('完整英文释义和例句按需缓存，也可下载全部扩展资料（约 19 MB）。','完整英文释义、例句和已整理的图片按需缓存，也可下载全部本地扩展资料。在线新找的图片仍可能需要联网。',1)
s=s.replace('在线查询会将正在查询的单词发送至第三方词典。','在线查询会把当前单词发送至第三方词典；开启自动找图时，进入阅读视野的具体事物会向维基百科查询主题，可在下方关闭。',1)
(R/'reader-v29.js').write_text(s)
(R/'reader-v29.css').write_text((R/'reader-v28.css').read_text()+'\n'+(R/'scripts/visual-v29.css').read_text())
p=R/'sw.js';s=p.read_text();s=s.replace('rootlab-offline-20261025-v280-encyclopedia','rootlab-offline-20261025-v290-visual',1).replace('reader-v28.js','reader-v29.js').replace('reader-v28.css','reader-v29.css').replace("'./encyclopedia-v28.js'","'./visual-seeds-v29.js','./encyclopedia-v29.js'")
s=s.replace("url.pathname.includes('/data/usage-v27/')","url.pathname.includes('/data/usage-v27/')||url.pathname.includes('/images/visual-v29/')")
p.write_text(s)
p=R/'manifest.webmanifest';j=json.loads(p.read_text());j['description']='免费查词、按词义看图、词源联想与智能复习；图片保留来源许可';p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
print('V2.9 all-word visual learning, local image caching, and opt-out setting installed')
