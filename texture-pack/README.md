# Texture pack

`texture-pack.zip` is the resource pack the website takes item icons from (the recipes page).

The site doesn't read the zip directly. `python tools/build_textures.py` turns it into
`textures/atlas.png` + `textures/index.json`, which are already built and committed. The recipes page
looks up each item's id (e.g. `golden_apple`) in that index, so any recipe made in-game gets its icon
automatically.

To change the textures: replace `texture-pack.zip` with another pack and run
`python tools/build_textures.py` (needs Python 3 and `pip install pillow`), then commit `textures/`.
Hand-made renders embedded in `index.html` are only used for entity-rendered blocks (chests, shulker boxes,
beds, heads) and for custom items that aren't in the pack.
