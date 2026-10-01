#!/usr/bin/env python3
"""comms chat/*.md の発言ブロック(### [時刻] ...)を全員分集めて時刻順表示 (マルチバイト安全)"""
import sys, glob, re, os
d, n = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 20
recs = []
for f in glob.glob(os.path.join(d, '*.md')):
    txt = open(f, encoding='utf-8', errors='replace').read()
    for b in re.split(r'\n(?=### \[)', '\n' + txt):
        b = b.strip()
        if b.startswith('### ['):
            recs.append(b)
recs.sort(key=lambda b: b[5:28])
print('\n\n'.join(recs[-n:]))
