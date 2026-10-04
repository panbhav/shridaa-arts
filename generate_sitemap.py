import json

with open('data/artworks.json', encoding='utf-8') as f:
    artworks = json.load(f)

xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '  <!-- Core Website Pages -->',
    '  <url>',
    '    <loc>https://shridaaarts.com/</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '    <image:image>',
    '      <image:loc>https://shridaaarts.com/Assets/brand/shridaa-arts-logo-full.png</image:loc>',
    '      <image:title>Shridaa Arts - Handcrafted Lippan Art Studio</image:title>',
    '      <image:caption>Handcrafted Lippan Mud and Mirror Art by Ashima Goyal</image:caption>',
    '    </image:image>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#artworks</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>0.9</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#categories</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.85</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#about</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.8</priority>',
    '    <image:image>',
    '      <image:loc>https://shridaaarts.com/Assets/artist/ashima-goyal.jpg</image:loc>',
    '      <image:title>Ashima Goyal - Lippan Art Artisan and Founder</image:title>',
    '      <image:caption>Ashima Goyal at Shridaa Arts Studio</image:caption>',
    '    </image:image>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#craftsmanship</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.75</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#reviews</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.75</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://shridaaarts.com/#contact</loc>',
    '    <lastmod>2026-10-04</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.8</priority>',
    '  </url>',
    '  <!-- All 27 Individual Lippan Artworks with Google Image Search Tags -->'
]

for art in artworks:
    art_id = art.get('id', '')
    name = (art.get('name') or '').replace('&', '&amp;')
    short_desc = (art.get('shortDescription') or '').replace('&', '&amp;')
    img_path = art.get('fallbackImage') or art.get('image', '')
    
    xml.append('  <url>')
    xml.append(f'    <loc>https://shridaaarts.com/#artwork={art_id}</loc>')
    xml.append('    <lastmod>2026-10-04</lastmod>')
    xml.append('    <changefreq>weekly</changefreq>')
    xml.append('    <priority>0.85</priority>')
    if img_path:
        xml.append('    <image:image>')
        xml.append(f'      <image:loc>https://shridaaarts.com/{img_path}</image:loc>')
        xml.append(f'      <image:title>{name}</image:title>')
        xml.append(f'      <image:caption>{short_desc}</image:caption>')
        xml.append('    </image:image>')
    xml.append('  </url>')

xml.append('</urlset>')

with open('sitemap.xml', 'w', encoding='utf-8') as out:
    out.write('\n'.join(xml) + '\n')

print(f"Successfully generated sitemap.xml with {len(artworks)} artworks.")
