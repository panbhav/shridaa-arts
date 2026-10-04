import math
import os
from PIL import Image, ImageDraw, ImageFont

def create_brand_logo(
    output_png_icon,
    output_png_full_light,
    output_png_full_dark,
    output_svg_icon,
    output_svg_full
):
    # Ensure directory
    os.makedirs(os.path.dirname(output_png_icon), exist_ok=True)

    # -------------------------------------------------------------
    # 1. GENERATE HIGH-RES EMBLEM ICON PNG (1024x1024 with antialiasing)
    # -------------------------------------------------------------
    # Supersampling 2x (2048x2048 -> 1024x1024)
    canvas_size = 2048
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = canvas_size / 2, canvas_size / 2

    # Brand Colors
    GOLD = (197, 154, 78, 255)         # #C59A4E
    GOLD_LIGHT = (230, 194, 126, 255)   # #E6C27E
    TERRACOTTA = (184, 115, 82, 255)   # #B87352
    TERRA_DEEP = (148, 86, 56, 255)    # #945638
    MIRROR_CYAN = (232, 246, 248, 240) # Mirror silver sheen
    WHITE = (255, 255, 255, 255)

    # Outer decorative ring (subtle dash/dots)
    r_outer = 940
    num_outer_dots = 48
    for i in range(num_outer_dots):
        angle = (2 * math.pi / num_outer_dots) * i
        dx = cx + r_outer * math.cos(angle)
        dy = cy + r_outer * math.sin(angle)
        dot_r = 14 if (i % 4 == 0) else 8
        col = GOLD if (i % 4 == 0) else GOLD_LIGHT
        draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=col)

    # Concentric Ring 1 (Gold boundary ring)
    r_ring1 = 880
    draw.ellipse([cx - r_ring1, cy - r_ring1, cx + r_ring1, cy + r_ring1], outline=GOLD, width=12)

    # 16-petal Lippan Relief Lotus Crown
    num_petals = 16
    r_petal_tip = 860
    r_petal_base = 690
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        angle_left = angle - (math.pi / num_petals) * 0.7
        angle_right = angle + (math.pi / num_petals) * 0.7

        p_tip = (cx + r_petal_tip * math.cos(angle), cy + r_petal_tip * math.sin(angle))
        p_left = (cx + r_petal_base * math.cos(angle_left), cy + r_petal_base * math.sin(angle_left))
        p_right = (cx + r_petal_base * math.cos(angle_right), cy + r_petal_base * math.sin(angle_right))
        p_mid = (cx + (r_petal_base + 30) * math.cos(angle), cy + (r_petal_base + 30) * math.sin(angle))

        # Petal outline in terracotta/gold
        fill_col = (184, 115, 82, 35) if (i % 2 == 0) else (197, 154, 78, 30)
        draw.polygon([p_left, p_tip, p_right, p_mid], fill=fill_col, outline=GOLD, width=8)

        # Embedded diamond mirror (Aabhla) inside each petal
        r_mirror = 780
        mx, my = cx + r_mirror * math.cos(angle), cy + r_mirror * math.sin(angle)
        md = 26
        # Diamond orientation aligned with ray
        ca, sa = math.cos(angle), math.sin(angle)
        # 4 diamond corners
        d1 = (mx + md * 1.5 * ca, my + md * 1.5 * sa)
        d2 = (mx - md * sa, my + md * ca)
        d3 = (mx - md * 1.5 * ca, my - md * 1.5 * sa)
        d4 = (mx + md * sa, my - md * ca)
        draw.polygon([d1, d2, d3, d4], fill=MIRROR_CYAN, outline=GOLD, width=6)

    # Concentric Ring 2 (Terracotta inner boundary ring)
    r_ring2 = 660
    draw.ellipse([cx - r_ring2, cy - r_ring2, cx + r_ring2, cy + r_ring2], outline=TERRACOTTA, width=16)

    # 8-fold Secondary Star / Octagram
    num_star = 8
    star_outer = 640
    star_inner = 530
    star_points = []
    for i in range(num_star * 2):
        r = star_outer if (i % 2 == 0) else star_inner
        ang = (math.pi / num_star) * i
        star_points.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    draw.polygon(star_points, fill=(245, 237, 226, 80), outline=GOLD_LIGHT, width=10)

    # Central Core Disc (Terracotta Earth Background)
    r_core = 480
    draw.ellipse([cx - r_core, cy - r_core, cx + r_core, cy + r_core], fill=TERRACOTTA, outline=GOLD, width=14)

    # Inner Pearl Border
    num_pearls = 32
    r_pearls = 445
    for i in range(num_pearls):
        ang = (2 * math.pi / num_pearls) * i
        px = cx + r_pearls * math.cos(ang)
        py = cy + r_pearls * math.sin(ang)
        draw.ellipse([px - 10, py - 10, px + 10, py + 10], fill=WHITE, outline=GOLD, width=4)

    # Central Sacred Geometry & Stylized "S" Monogram (Clay Coil & Mirror Facet)
    # We draw an elegant central geometric "S" motif composed of clay relief spirals and diamond mirror center
    # Top arc of S
    draw.arc([cx - 240, cy - 340, cx + 240, cy + 20], start=150, end=380, fill=WHITE, width=44)
    # Connecting diagonal relief
    draw.line([cx + 120, cy - 140, cx - 120, cy + 140], fill=WHITE, width=44)
    # Bottom arc of S
    draw.arc([cx - 240, cy - 20, cx + 240, cy + 340], start=-30, end=200, fill=WHITE, width=44)

    # Central Faceted Mirror in the heart of S
    cd = 75
    c_mirror = [
        (cx, cy - cd * 1.3),
        (cx + cd, cy),
        (cx, cy + cd * 1.3),
        (cx - cd, cy)
    ]
    draw.polygon(c_mirror, fill=MIRROR_CYAN, outline=GOLD, width=8)

    # Sparkle glint on center mirror
    glint_len = 110
    draw.line([cx, cy - glint_len, cx, cy + glint_len], fill=WHITE, width=6)
    draw.line([cx - glint_len, cy, cx + glint_len, cy], fill=WHITE, width=6)
    draw.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=WHITE)

    # 4 satellite diamond mirrors in cardinal points of the core
    cardinals = [(0, -290), (290, 0), (0, 290), (-290, 0)]
    for ox, oy in cardinals:
        px, py = cx + ox, cy + oy
        sd = 30
        draw.polygon([(px, py - sd), (px + sd, py), (px, py + sd), (px - sd, py)], fill=MIRROR_CYAN, outline=GOLD, width=5)

    # Downsample with Lanczos for ultra-crisp antialiasing
    img_icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_icon.save(output_png_icon, "PNG", optimize=True)
    print(f"Saved Icon PNG: {output_png_icon}")

    # Also save standard 512x512 and 192x192 favicon versions
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save("Assets/brand/shridaa-arts-emblem-512.png", "PNG", optimize=True)
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save("Assets/brand/shridaa-arts-emblem-192.png", "PNG", optimize=True)

    # -------------------------------------------------------------
    # 2. GENERATE FULL HORIZONTAL LOGO WITH TYPOGRAPHY (LIGHT & DARK BG)
    # -------------------------------------------------------------
    # Target 2400 x 680 (High-res for print & hero)
    def render_full_logo(bg_mode="transparent", dark_text=True):
        full_w, full_h = 2400, 680
        if bg_mode == "light":
            base_img = Image.new("RGBA", (full_w, full_h), (250, 247, 242, 255)) # Warm Ivory
        elif bg_mode == "dark":
            base_img = Image.new("RGBA", (full_w, full_h), (28, 25, 23, 255))    # Rich Charcoal
        else:
            base_img = Image.new("RGBA", (full_w, full_h), (0, 0, 0, 0))         # Transparent

        # Paste Emblem on Left
        emblem_size = 540
        emblem_thumb = img.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        ey = int((full_h - emblem_size) / 2)
        ex = 70
        base_img.paste(emblem_thumb, (ex, ey), emblem_thumb)

        draw_txt = ImageDraw.Draw(base_img)

        # Typography
        # Brand Name: SHRIDAA ARTS
        # Tagline: HANDCRAFTED LIPPAN ART
        font_title_path = "C:\\Windows\\Fonts\\georgiab.ttf"
        font_sub_path = "C:\\Windows\\Fonts\\segoeui.ttf"

        font_title = ImageFont.truetype(font_title_path, 172)
        font_sub = ImageFont.truetype(font_sub_path, 52)
        font_est = ImageFont.truetype(font_sub_path, 34)

        text_x = ex + emblem_size + 90
        title_y = ey + 75
        sub_y = title_y + 205
        est_y = sub_y + 85

        primary_col = (28, 25, 23, 255) if dark_text else (255, 255, 255, 255)
        terracotta_col = (184, 115, 82, 255) if dark_text else (230, 150, 115, 255)
        gold_col = (197, 154, 78, 255)

        # Draw SHRIDAA ARTS with tracked letter spacing
        title_text = "SHRIDAA ARTS"
        # Draw with custom letter spacing
        cur_x = text_x
        spacing = 16
        for ch in title_text:
            draw_txt.text((cur_x, title_y), ch, fill=primary_col, font=font_title)
            # Advance
            bbox = font_title.getbbox(ch)
            ch_w = bbox[2] - bbox[0]
            cur_x += ch_w + spacing

        # Draw Decorative Horizontal Gold Filigree Line with Diamond Center
        line_y = sub_y - 28
        line_end = cur_x - spacing
        draw_txt.line([(text_x, line_y), (line_end, line_y)], fill=(197, 154, 78, 140), width=4)
        mid_x = (text_x + line_end) / 2
        # Diamond ornament on line
        draw_txt.polygon([(mid_x, line_y - 12), (mid_x + 12, line_y), (mid_x, line_y + 12), (mid_x - 12, line_y)], fill=gold_col)

        # Subtitle: HANDCRAFTED LIPPAN ART
        sub_text = "HANDCRAFTED LIPPAN ART"
        cur_sub_x = text_x
        sub_spacing = 15
        for ch in sub_text:
            draw_txt.text((cur_sub_x, sub_y), ch, fill=terracotta_col, font=font_sub)
            bbox = font_sub.getbbox(ch)
            ch_w = bbox[2] - bbox[0]
            cur_sub_x += ch_w + sub_spacing

        # Byline: BY ASHIMA GOYAL • MUD & MIRROR STUDIO
        byline_text = "BY ASHIMA GOYAL  •  AUTHENTIC KUTCH MUD & MIRROR WORK"
        draw_txt.text((text_x, est_y), byline_text, fill=(140, 130, 120, 255) if dark_text else (190, 180, 170, 255), font=font_est)

        return base_img

    # Save Transparent/Light Full Logo
    full_transparent = render_full_logo(bg_mode="transparent", dark_text=True)
    full_transparent.save(output_png_full_light, "PNG", optimize=True)
    print(f"Saved Full Logo PNG: {output_png_full_light}")

    # Save Dark Full Logo (for dark sections / footer / branding)
    full_dark = render_full_logo(bg_mode="transparent", dark_text=False)
    full_dark.save(output_png_full_dark, "PNG", optimize=True)
    print(f"Saved Dark Logo PNG: {output_png_full_dark}")

    # -------------------------------------------------------------
    # 3. GENERATE CRISP SCALABLE VECTOR GRAPHICS (SVG) LOGO
    # -------------------------------------------------------------
    svg_icon_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" aria-label="Shridaa Arts Lippan Art Logo">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8C888"/>
      <stop offset="50%" stop-color="#C59A4E"/>
      <stop offset="100%" stop-color="#9C7532"/>
    </linearGradient>
    <linearGradient id="terraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C9734D"/>
      <stop offset="100%" stop-color="#9E5333"/>
    </linearGradient>
    <linearGradient id="mirrorSheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#EAF6F8"/>
      <stop offset="100%" stop-color="#CDE3E7"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1C1917" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Outer Dotted Circle (Clay Relief Pearls) -->
  <circle cx="256" cy="256" r="236" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="222" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>

  <!-- 16 Radial Petals with Embedded Diamond Mirrors -->
  <g transform="translate(256 256)">
    <!-- 16 Lippan Relief Petals -->
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(0)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(22.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(45)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(67.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(90)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(112.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(135)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(157.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(180)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(202.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(225)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(247.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(270)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(292.5)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(315)"/>
    <path d="M 0,-218 L 18,-172 L 0,-162 L -18,-172 Z" fill="url(#terraGrad)" stroke="#C59A4E" stroke-width="1.5" transform="rotate(337.5)"/>

    <!-- 16 Diamond Mirror Inlays (Aabhla) -->
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(0)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(22.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(45)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(67.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(90)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(112.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(135)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(157.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(180)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(202.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(225)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(247.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(270)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(292.5)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(315)"/>
    <polygon points="0,-195 8,-185 0,-175 -8,-185" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1" transform="rotate(337.5)"/>
  </g>

  <!-- Middle Concentric Ring -->
  <circle cx="256" cy="256" r="162" fill="none" stroke="url(#terraGrad)" stroke-width="4"/>
  <circle cx="256" cy="256" r="154" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="4 6"/>

  <!-- Core Terracotta Art Medallion -->
  <circle cx="256" cy="256" r="122" fill="url(#terraGrad)" stroke="url(#goldGrad)" stroke-width="4" filter="url(#softGlow)"/>
  <circle cx="256" cy="256" r="112" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5"/>

  <!-- Stylized Sculpted Clay Monogram "S" with Mirror Center -->
  <path d="M 285,188 C 240,165 210,185 210,215 C 210,240 235,250 256,256 C 277,262 302,272 302,297 C 302,327 270,347 225,324" 
        fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 285,188 C 240,165 210,185 210,215 C 210,240 235,250 256,256 C 277,262 302,272 302,297 C 302,327 270,347 225,324" 
        fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Central Diamond Mirror -->
  <polygon points="256,236 274,256 256,276 238,256" fill="url(#mirrorSheen)" stroke="url(#goldGrad)" stroke-width="2.5"/>
  <circle cx="256" cy="256" r="3.5" fill="#FFFFFF"/>

  <!-- Corner Accent Mirrors -->
  <polygon points="256,150 263,158 256,166 249,158" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1.5"/>
  <polygon points="256,346 263,354 256,362 249,354" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1.5"/>
  <polygon points="158,256 166,263 158,270 150,263" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1.5"/>
  <polygon points="354,256 362,263 354,270 346,263" fill="url(#mirrorSheen)" stroke="#C59A4E" stroke-width="1.5"/>
</svg>'''

    with open(output_svg_icon, "w", encoding="utf-8") as f:
        f.write(svg_icon_content)
    print(f"Saved SVG Icon: {output_svg_icon}")

    # Full Horizontal SVG for Responsive Header & Retina Display
    svg_full_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 80" width="100%" height="100%" aria-label="Shridaa Arts Logo">
  <defs>
    <linearGradient id="fullGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8C888"/>
      <stop offset="50%" stop-color="#C59A4E"/>
      <stop offset="100%" stop-color="#9C7532"/>
    </linearGradient>
    <linearGradient id="fullTerra" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B87352"/>
      <stop offset="100%" stop-color="#8F4829"/>
    </linearGradient>
    <linearGradient id="fullMirror" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%"料 stop-color="#D5E8EC"/>
    </linearGradient>
  </defs>

  <!-- Left Emblem (Scalable Mini Mandala) -->
  <g transform="translate(40, 40) scale(0.14)">
    <circle cx="0" cy="0" r="236" fill="none" stroke="url(#fullGold)" stroke-width="4" stroke-dasharray="6 14"/>
    <circle cx="0" cy="0" r="218" fill="none" stroke="url(#fullGold)" stroke-width="6"/>

    <!-- 8 Petals -->
    <g>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(0)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(45)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(90)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(135)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(180)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(225)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(270)"/>
      <path d="M 0,-218 L 30,-160 L 0,-146 L -30,-160 Z" fill="url(#fullTerra)" stroke="#C59A4E" stroke-width="3" transform="rotate(315)"/>
    </g>

    <!-- Core Disc -->
    <circle cx="0" cy="0" r="130" fill="url(#fullTerra)" stroke="url(#fullGold)" stroke-width="8"/>
    
    <!-- Monogram S -->
    <path d="M 35,-65 C -25,-95 -65,-65 -65,-25 C -65,15 -25,25 0,35 C 25,45 65,55 65,95 C 65,135 15,165 -45,135" 
          fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
    
    <!-- Diamond Mirror Center -->
    <polygon points="0,-28 26,0 0,28 -26,0" fill="#FFFFFF" stroke="url(#fullGold)" stroke-width="6"/>
  </g>

  <!-- Typography: SHRIDAA ARTS -->
  <text x="88" y="38" font-family="'Cinzel', 'Playfair Display', 'Georgia', serif" font-size="28" font-weight="700" letter-spacing="3.5" fill="#1C1917">SHRIDAA ARTS</text>
  
  <!-- Divider -->
  <line x1="88" y1="46" x2="360" y2="46" stroke="#C59A4E" stroke-width="1.2" stroke-opacity="0.8"/>
  <polygon points="224,44 227,46 224,48 221,46" fill="#C59A4E"/>

  <!-- Subtitle: HANDCRAFTED LIPPAN ART -->
  <text x="89" y="60" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-size="10.5" font-weight="600" letter-spacing="2.8" fill="#B87352">HANDCRAFTED LIPPAN ART</text>
</svg>'''

    with open(output_svg_full, "w", encoding="utf-8") as f:
        f.write(svg_full_content)
    print(f"Saved SVG Full: {output_svg_full}")

if __name__ == "__main__":
    create_brand_logo(
        output_png_icon="Assets/brand/shridaa-arts-logo-icon.png",
        output_png_full_light="Assets/brand/shridaa-arts-logo-full.png",
        output_png_full_dark="Assets/brand/shridaa-arts-logo-dark.png",
        output_svg_icon="Assets/brand/shridaa-arts-logo-icon.svg",
        output_svg_full="Assets/brand/shridaa-arts-logo-full.svg"
    )
