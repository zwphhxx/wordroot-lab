#!/usr/bin/env python3
"""Add explicit reviewed topic illustrations without modifying the existing image library."""
from pathlib import Path
import json,re,concurrent.futures,time,urllib.parse
ROOT=Path(__file__).resolve().parent.parent
# Reuse tested HTTPS request/cache and licensed Commons image extraction functions only.
old=(ROOT/'scripts/build_visual_v29.py').read_text()
scope={'__file__':str(ROOT/'scripts/build_root_visual_v210.py')}
exec(old[:old.index('rows=[line.strip()')],scope)
scope['WORK']=ROOT/'.v12-work/visual-v210';scope['WORK'].mkdir(parents=True,exist_ok=True)
scope['OUT']=ROOT/'images/visual-v210';scope['OUT'].mkdir(parents=True,exist_ok=True)
api=scope['api'];request=scope['request'];plain=scope['plain']
core=json.loads((ROOT/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);known={r[0] for r in core}
rows=[s.split('|') for s in (ROOT/'scripts/root-visual-topics-v210.tsv').read_text().splitlines() if s.strip()]
rows=[r for r in rows if r[0] in known and r[0]!='injection']
page_map={}
for at in range(0,len(rows),10):
 batch=rows[at:at+10];x=api('en.wikipedia.org',titles='|'.join(r[1] for r in batch),redirects=1,prop='pageimages|pageprops|info',piprop='name',pilicense='free',inprop='url')
 aliases={z['from']:z['to'] for k in ('normalized','redirects') for z in x.get('query',{}).get(k,[])};pages={p['title']:p for p in x.get('query',{}).get('pages',[])}
 for word,title,*_ in batch:
  for _ in range(5):title=aliases.get(title,title)
  p=pages.get(title)
  if p and not p.get('missing') and 'disambiguation' not in p.get('pageprops',{}):page_map[word]=p
 print('TOPICS',min(at+10,len(rows)),'/',len(rows),flush=True)
files=list(dict.fromkeys(p['pageimage'] for p in page_map.values() if p.get('pageimage')));meta={}
for at in range(0,len(files),8):
 x=api('commons.wikimedia.org',titles='|'.join('File:'+f for f in files[at:at+8]),redirects=1,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=640)
 for p in x.get('query',{}).get('pages',[]):meta[p.get('title','').replace('_',' ')]=p
 time.sleep(.2)
scope['page_map']=page_map;scope['commons_meta']=meta
exec(old[old.index('def build(row):'):old.index('seeds={};failures=[]')],scope)
seeds={};failed=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for w,value,status in pool.map(scope['build'],rows):
  if value:
   value['image']['src']=value['image']['src'].replace('/visual-v29/','/visual-v210/');value['image']['licenseUrl']=value['image']['licenseUrl'].replace('http:','https:');seeds[w]=value
  else:failed.append([w,status])
# Explicit morphological relatives can use the same concrete scene, with a meaning-specific caption.
base=json.loads((ROOT/'visual-seeds-v29.js').read_text().split('window.ROOTLAB_VISUAL_SEEDS=',1)[1].split(';\nwindow.ROOTLAB_VISUAL_HINTS=')[0])
aliases={
 'microscopic':('microscope','微小的；显微镜下的','场景图：显微镜帮助理解 microscopic。形容词描述非常微小或只有显微镜下才能看到的东西。'),
 'telescopic':('telescope','望远镜的；伸缩式的','设备图展示望远镜，与 telescopic 的望远镜相关义对应；伸缩式等其他用法需看语境。'),
 'photographic':('photograph','摄影的；照片的','照片示例对应 photographic 的摄影相关义项。'),
 'photography':('photograph','摄影','照片是摄影活动的结果；photography 指拍摄照片的技术、过程或艺术。'),
 'construct':('construction','建造','场景图展示施工，用来理解 construct 这一建造动作。'),
 'constructor':('construction','建造者','施工场景帮助理解建造者这一义项；程序语言中的构造函数是另一个领域的用法。'),
 'transportation':('transport','运输；交通运输','交通运输场景，表示把人或物从一个地方送往另一个地方。'),
 'recycle':('recycling','回收利用','回收标志的循环箭头帮助理解 recycle，即把材料回收并重新利用。'),
 'recyclable':('recycling','可回收利用的','回收场景说明 recyclable 的性质：材料能够被处理后重新使用。'),
 'reflect':('reflection','反射；映出','本图对应反射或映出影像的用法；reflect 还可以表示认真思考。'),
 'rotate':('rotation','旋转','示意图表示物体绕中心或轴转动的动作。'),
 'aquatic':('aquarium','水生的','水族箱中的生物场景帮助理解 aquatic，即生活或生长在水中的。'),
 'computerize':('computer','使计算机化','设备场景说明用计算机处理原来由人工完成的工作。'),
 'cyclist':('bicycle','骑自行车的人','自行车帮助联系 cyclist 所指的骑行者。'),
 'photocopying':('photocopy','复印','复印机是完成复印动作的设备。')
}
for word,(parent,label,caption) in aliases.items():
 obj=seeds.get(parent) or base.get(parent)
 if word not in known or not obj:continue
 cp=json.loads(json.dumps(obj));cp.update(word=word,zhTitle=label,caption=caption,visualRole='context',illustrates=parent);cp['image']['alt']=label+'：'+caption;seeds[word]=cp
path=ROOT/'visual-extra-v210.js';path.write_text('Object.assign(window.ROOTLAB_VISUAL_SEEDS, '+json.dumps(seeds,ensure_ascii=False,separators=(',',':'))+');\n')
report={'topicRequests':len(rows),'directPictures':len(seeds)-sum(v.get('visualRole')=='context' for v in seeds.values()),'imageWords':len(seeds),'contextPictures':sum(v.get('visualRole')=='context' for v in seeds.values()),'failed':failed}
(ROOT/'data/visual-extra-coverage-v210.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('FINISHED',json.dumps(report,ensure_ascii=False),flush=True)
assert seeds and 'microscopic' in seeds
