content = open('d:/ReliqueSmp-main/ReliqueSmp-main/index.html', encoding='utf-8').read()

marker = '<!-- ===== RANKED TAB (paste this whole block just before </body> in index.html) ===== -->'
idx = content.find(marker)
if idx < 0:
    print('ERROR: marker not found')
else:
    content = content[:idx].rstrip() + '\n'
    open('d:/ReliqueSmp-main/ReliqueSmp-main/index.html', 'w', encoding='utf-8').write(content)
    print('Done. Removed Ranked tab block. New size:', len(content))
