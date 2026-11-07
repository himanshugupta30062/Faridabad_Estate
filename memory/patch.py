import sys
_STORE = {}


def rep(p, a, b):
    s = _STORE.setdefault(p, open(p).read())
    assert a in s, (p, a[:70])
    _STORE[p] = s.replace(a, b, 1)


exec(open(sys.argv[1]).read())
for p, s in _STORE.items():
    open(p, "w").write(s)
print("applied", len(_STORE))
