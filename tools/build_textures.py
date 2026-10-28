#!/usr/bin/env python3
"""
Builds the website's item-icon atlas from a Minecraft resource pack.

    python tools/build_textures.py                      # uses texture-pack/texture-pack.zip
    python tools/build_textures.py path/to/pack.zip     # or any other pack (zip or unzipped folder)

Output (committed, served by the site):
    textures/atlas.png    one sprite sheet with an icon for every item/block in the pack
    textures/index.json   item id -> tile position, plus display names from the pack's lang file

Flat items use their layer textures; blocks are drawn as the same isometric cube Minecraft shows in
the inventory (top + two sides). The recipes page looks icons up by item id (e.g. "golden_apple"),
so a recipe added in-game gets its texture automatically. Needs Python 3 + Pillow (pip install pillow).
"""
import io, json, os, re, sys, zipfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'texture-pack', 'texture-pack.zip')
OUT = os.path.join(ROOT, 'textures')
TILE = 32          # px per icon in the atlas
SS = 8             # supersampling for the isometric cubes

# ---------------------------------------------------------------- pack access
class Pack:
    def __init__(self, path):
        self.z = None
        self.base = path
        if os.path.isfile(path):
            self.z = zipfile.ZipFile(path)
            names = self.z.namelist()
            mc = next((n for n in names if n.endswith('pack.mcmeta')), None)
            if mc is None:
                sys.exit('pack.mcmeta not found in ' + path)
            self.prefix = mc[:-len('pack.mcmeta')]
            self.names = set(names)
        else:
            self.prefix = ''
    def read(self, rel):
        if self.z:
            return self.z.read(self.prefix + rel)
        with open(os.path.join(self.base, rel), 'rb') as f:
            return f.read()
    def exists(self, rel):
        if self.z:
            return (self.prefix + rel) in self.names
        return os.path.isfile(os.path.join(self.base, rel))
    def listdir(self, rel):
        if self.z:
            p = self.prefix + rel.rstrip('/') + '/'
            return sorted({n[len(p):] for n in self.names if n.startswith(p) and '/' not in n[len(p):] and n != p})
        return sorted(os.listdir(os.path.join(self.base, rel)))

pack = Pack(SRC)
MC = 'assets/minecraft/'

def jload(rel):
    try:
        return json.loads(pack.read(rel))
    except Exception:
        return None

def strip_ns(s):
    return s.split(':', 1)[1] if ':' in s else s

# ---------------------------------------------------------------- models
_model_cache = {}
def model_chain(name):
    """The model, then its parents (child first)."""
    name = strip_ns(name)
    if name in _model_cache:
        return _model_cache[name]
    chain, cur, seen = [], name, set()
    while cur and cur not in seen:
        seen.add(cur)
        m = jload(MC + 'models/' + cur + '.json')
        if not m:
            chain.append({'_name': cur})
            break
        m['_name'] = cur
        chain.append(m)
        cur = strip_ns(m['parent']) if m.get('parent') else None
    _model_cache[name] = chain
    return chain

def merged(chain):
    textures, elements = {}, None
    for m in reversed(chain):               # parents first so children override
        textures.update(m.get('textures', {}))
    for m in chain:                          # nearest model that defines elements wins
        if m.get('elements'):
            elements = m['elements']
            break
    return textures, elements

def resolve_tex(ref, textures):
    seen = 0
    if isinstance(ref, dict):                     # newer packs: {"sprite": "minecraft:block/glass", ...}
        ref = ref.get('sprite')
    while isinstance(ref, str) and ref.startswith('#') and seen < 12:
        ref = textures.get(ref[1:])
        if isinstance(ref, dict):
            ref = ref.get('sprite')
        seen += 1
    if isinstance(ref, str) and not ref.startswith('#'):
        return strip_ns(ref)
    return None

def item_model_name(node):
    """Follow an items/<id>.json definition down to one model path."""
    if not isinstance(node, dict):
        return None
    t = strip_ns(node.get('type', 'model'))
    if t == 'model':
        return node.get('model')
    if t == 'special':
        return None        # heads, chests, beds, banners, shulker boxes... are drawn by the game from entity models
    if t == 'condition':
        return item_model_name(node.get('on_false')) or item_model_name(node.get('on_true'))
    if t in ('select', 'range_dispatch'):
        r = item_model_name(node.get('fallback'))
        if r:
            return r
        if node.get('cases'):
            return item_model_name(node['cases'][0].get('model'))
        if node.get('entries'):
            return item_model_name(node['entries'][0].get('model'))
    if t == 'composite' and node.get('models'):
        return item_model_name(node['models'][0])
    return None

# ---------------------------------------------------------------- textures
_tex_cache = {}
def load_tex(path):
    """First frame of a texture as a square RGBA image, or None."""
    if path in _tex_cache:
        return _tex_cache[path]
    img = None
    rel = MC + 'textures/' + path + '.png'
    if pack.exists(rel):
        im = Image.open(io.BytesIO(pack.read(rel))).convert('RGBA')
        w = im.size[0]
        if im.size[1] != w:
            im = im.crop((0, 0, w, min(w, im.size[1])))   # animated strip: keep frame 0
        img = im
    _tex_cache[path] = img
    return img

def tint(img, rgb):
    r, g, b = rgb
    px = img.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            pr, pg, pb, pa = px[x, y]
            px[x, y] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
    return img

FOLIAGE, GRASS = (72, 181, 24), (145, 189, 89)
def tint_for(name):
    return FOLIAGE if 'leaves' in name else GRASS

# ---------------------------------------------------------------- icon drawing
def flat_icon(layers):
    out = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    for tex, rgb in layers:
        im = load_tex(tex)
        if im is None:
            continue
        im = im.copy()
        if rgb:
            tint(im, rgb)
        out.alpha_composite(im.resize((TILE, TILE), Image.NEAREST))
    return out if out.getbbox() else None

def shade(img, f):
    img = img.copy()
    px = img.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * f), int(g * f), int(b * f), a)
    return img

def paste_face(canvas, face, origin, u, v):
    """Map a square face onto the parallelogram origin + s*u + t*v (s,t in 0..1)."""
    w = face.size[0]
    (ux, uy), (vx, vy) = u, v
    det = ux * vy - uy * vx
    # output -> input affine (Pillow wants the inverse mapping)
    a, b = vy / det * w, -vx / det * w
    d, e = -uy / det * w, ux / det * w
    c = -(a * origin[0] + b * origin[1])
    f = -(d * origin[0] + e * origin[1])
    layer = face.transform(canvas.size, Image.AFFINE, (a, b, c, d, e, f), Image.NEAREST)
    # hard edge mask so the supersampled cube has no seams
    canvas.alpha_composite(layer)

def cube_icon(top, left, right):
    S = TILE * SS
    cv = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    k = S / 32.0
    P = lambda x, y: (x * k, y * k)
    big = lambda im: im.resize((im.size[0] * SS, im.size[1] * SS), Image.NEAREST) if im.size[0] < 64 else im
    # top face
    paste_face(cv, big(shade(top, 1.0)), P(16, 2), (14 * k, 7 * k), (-14 * k, 7 * k))
    # left face (south), right face (east)
    paste_face(cv, big(shade(left, 0.8)), P(2, 9), (14 * k, 7 * k), (0, 14 * k))
    paste_face(cv, big(shade(right, 0.6)), P(16, 16), (14 * k, -7 * k), (0, 14 * k))
    return cv.resize((TILE, TILE), Image.BOX)

def face_tex(face, elements, textures, tex_default):
    """Texture (path, tinted?) for one face of the block, or None."""
    if elements:
        for el in elements:
            f = el.get('faces', {}).get(face)
            if f:
                t = resolve_tex(f.get('texture'), textures)
                if t:
                    return t, 'tintindex' in f
    return (tex_default, False) if tex_default else None

def block_icon(chain):
    textures, elements = merged(chain)
    any_t = None
    for k in ('all', 'side', 'top', 'end', 'front', 'particle'):
        any_t = resolve_tex('#' + k, textures)
        if any_t:
            break
    ft = {}
    for face in ('up', 'south', 'east'):
        r = face_tex(face, elements, textures, any_t)
        if not r:
            return None
        tex, tinted = r
        im = load_tex(tex)
        if im is None:
            return None
        im = im.copy()
        if tinted:
            tint(im, tint_for(tex))
        ft[face] = im
    return cube_icon(ft['up'], ft['south'], ft['east'])

def icon_for(item_id):
    d = jload(MC + 'items/' + item_id + '.json')
    mname = item_model_name(d.get('model')) if d else None
    if not mname:
        mname = 'item/' + item_id if pack.exists(MC + 'models/item/' + item_id + '.json') else None
    if not mname:
        return None
    chain = model_chain(mname)
    names = [m.get('_name', '') for m in chain]
    parents = {m.get('parent', '') for m in chain}
    textures, _ = merged(chain)
    is_gen = any(n in ('item/generated', 'builtin/generated', 'item/handheld') for n in names) or \
        any(strip_ns(p) in ('item/generated', 'builtin/generated') for p in parents)
    if 'builtin/entity' in {strip_ns(p) for p in parents}:
        return None
    if is_gen or (textures.get('layer0') and not textures.get('up')):
        layers = []
        for i in range(0, 5):
            t = resolve_tex('#layer%d' % i, textures)
            if not t:
                continue
            rgb = None
            if t.endswith('potion_overlay'):
                rgb = (56, 93, 198)
            elif item_id.startswith('leather_') and i == 0 and not t.endswith('_overlay'):
                rgb = (160, 101, 64)
            layers.append((t, rgb))
        return flat_icon(layers)
    return block_icon(chain)

# ---------------------------------------------------------------- build
def main():
    ids = sorted(n[:-5] for n in pack.listdir(MC + 'items') if n.endswith('.json'))
    icons = {}
    for i in ids:
        try:
            im = icon_for(i)
        except Exception as e:     # one odd model should not stop the whole build
            print('skip', i, e)
            im = None
        if im is not None:
            icons[i] = im
    cols = max(1, int(len(icons) ** 0.5) + 1)
    rows = (len(icons) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * TILE, rows * TILE), (0, 0, 0, 0))
    index = {}
    for n, (k, im) in enumerate(sorted(icons.items())):
        c, r = n % cols, n // cols
        atlas.paste(im, (c * TILE, r * TILE))
        index[k] = [c, r]
    os.makedirs(OUT, exist_ok=True)
    atlas.save(os.path.join(OUT, 'atlas.png'), optimize=True)

    names = {}
    lang = jload(MC + 'lang/en_us.json') or {}
    for k in index:
        v = lang.get('item.minecraft.' + k) or lang.get('block.minecraft.' + k)
        if v:
            names[k] = v
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'tile': TILE, 'cols': cols, 'rows': rows, 'icons': index, 'names': names}, f, separators=(',', ':'))
    print('wrote %d icons (%d missing) -> %s' % (len(index), len(ids) - len(index), OUT))

main()
