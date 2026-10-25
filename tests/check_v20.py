#!/usr/bin/env python3
"""V2 release checks: scripts, backward compatibility and static resource integrity."""
from pathlib import Path
import re,json
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text(encoding='utf8')
sw=(root/'sw.js').read_text(encoding='utf8')
manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf8'))
checks=[
 ('V2.0 title and meta','memory-engine-v2.js' in html and '自适应复习' in html),
 ('same site origin','https://zwphhxx.github.io/wordroot-lab/' in (root/'README.md').read_text()),
 ('SRS engine loaded','memory-engine-v2.js' in html and (root/'memory-engine-v2.js').exists()),
 ('free mode,no membership',all(v not in html for v in ['开通会员','会员精讲','data-action="open-member"'])),
 ('existing V1 local storage reused',"const KEY='rootlab_standalone_demo_v3'" in html),
 ('old and new backup accepted','rootlab_learning_backup_v1' in html and 'rootlab_learning_backup_v2' in html),
 ('daily activity saved','dailyGoal' in html and 'state.activity' in html),
 ('4-level memory rating',all(f'data-grade="{x}"' in html for x in ['again','hard','good','easy'])),
 ('SRS reveal before grading','session-reveal' in html and 'session-grade' in html),
 ('goal UI','data-action="daily-goal"' in html and 'goal-choice' in html),
 ('four quiz types','quiz-type' in html and 'quizTextAnswer' in html),
 ('separate mistake reinforcement','mistakeCounts' in html and 'data-scope="mistakes"' in html),
 ('daily chart and mastery','activity-chart' in html and 'mastery-row' in html),
 ('portable without server dependency',not re.search(r'<script[^>]+src="https?://',html)),
 ('PWA cache bumped','rootlab-offline-20261025-v250-minimal' in sw),
 ('offline caches new engine'," './memory-engine-v2.js'" in sw or "'./memory-engine-v2.js'" in sw),
 ('dictionary & root assets still cached','lexicon-core-v24.js' in sw and 'roots-v21.js' in sw),
 ('mobile standalone install','standalone' == manifest['display'] and '词根实验室' in manifest['name']),
 ('licensed dictionary source retained',(root/'THIRD_PARTY_NOTICES.md').exists()),
 ('no sensitive data on server','localStorage' in html and not re.search(r'fetch\s*\(\s*localStorage',html)),
]
for name,valid in checks:print(('PASS ' if valid else 'FAIL ')+name)
assert all(ok for _,ok in checks), 'V2 release check failed'
print('PASS',len(checks),'V2 static release checks')
