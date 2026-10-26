"""Source-definition corrections keep immutable original definitions and identities.
These are explicit reviewed edits, not automatic synonym replacements.
"""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent.parent
norm=lambda x:re.sub(r'\s+',' ',str(x or '')).strip()
F=R/'data/source-definition-final-revisions-v212.json'
batch=json.loads(F.read_text());snapshot=R/batch['snapshot'];rows=json.loads(snapshot.read_text());EDITS={}
for index,values in batch['revisions'].items():
 original=norm(rows[int(index)]['en']);en,zh,reason,url=values
 assert en and zh and reason and url.startswith('https://')
 EDITS[original]={'en':en,'zh':zh,'reason':reason,'sources':[url],'reviewerType':'assistant_source_and_linguistic_review','sourceTextHash':hashlib.sha256(original.encode()).hexdigest()}
additional=R/'data/source-definition-release-v212.json'
if additional.exists():
 for row in json.loads(additional.read_text()):
  old=norm(row['originalEn']);EDITS[old]={**{k:v for k,v in row.items() if k!='originalEn'},'sourceTextHash':hashlib.sha256(old.encode()).hexdigest()}
def revision(en):return EDITS.get(norm(en))
def apply(item,enkey='en',zhkey='zh',methodkey='translation'):
 old=norm(item.get(enkey));fix=revision(old)
 if not fix:return False
 item['originalSourceEn']=old
 item['sourceRevision']={k:v for k,v in fix.items() if k not in ('en','zh')}
 item[enkey]=fix['en'];item[zhkey]=fix['zh'];item[methodkey]='edited'
 return True
