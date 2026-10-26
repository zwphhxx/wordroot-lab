#!/usr/bin/env python3
"""Bounded single-writer lease for this authorized development session."""
from pathlib import Path
import fcntl,json,os,time,signal,subprocess
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';P=W/'foreground-lease.json'
f=(W/'execution.lock').open('a+');fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
started=time.time();identity=subprocess.check_output(['ps','-p',str(os.getpid()),'-o','lstart='],text=True).strip();live=True
release=W/'RELEASE_FOREGROUND_LEASE';release.unlink(missing_ok=True)
def stop(*args):
 global live
 live=False
signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
try:
 while live and time.time()-started<5400 and not release.exists():
  temp=P.with_suffix('.tmp');temp.write_text(json.dumps({'pid':os.getpid(),'processStart':identity,'script':str(Path(__file__).resolve()),'owner':'foreground-user-continue','started':started,'heartbeat':time.time(),'expiresAt':started+5400},indent=2));temp.replace(P)
  time.sleep(5)
finally:
 if P.exists() and json.loads(P.read_text()).get('pid')==os.getpid():P.unlink()
 print('LEASE_RELEASED',flush=True)
