import re
import sys
import os

CSS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "app", "globals.css")

def read_css(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def tokenize_css(raw):
    blocks = []
    i = 0
    n = len(raw)

    while i < n:
        while i < n and raw[i] in ' \t\n\r':
            i += 1
        if i >= n:
            break
        if raw[i:i+2] == '/*':
            end = raw.find('*/', i+2)
            if end == -1:
                break
            i = end + 2
            continue

        brace = raw.find('{', i)
        if brace == -1:
            break

        selector = raw[i:brace].strip()

        depth = 1
        j = brace + 1
        while j < n and depth > 0:
            if raw[j] == '{':
                depth += 1
            elif raw[j] == '}':
                depth -= 1
            j += 1

        body_raw = raw[brace+1:j-1].strip()
        i = j

        if selector.startswith('@keyframes') or selector.startswith('@-webkit-keyframes'):
            blocks.append((selector, body_raw, 'keyframes'))
        elif selector.startswith('@media') or selector.startswith('@supports'):
            children = []
            ci = 0
            cn = len(body_raw)
            while ci < cn:
                while ci < cn and body_raw[ci] in ' \t\n\r':
                    ci += 1
                if ci >= cn:
                    break
                if body_raw[ci:ci+2] == '/*':
                    cend = body_raw.find('*/', ci+2)
                    if cend == -1:
                        break
                    ci = cend + 2
                    continue
                cb = body_raw.find('{', ci)
                if cb == -1:
                    break
                cselector = body_raw[ci:cb].strip()
                cd = 1
                cj = cb + 1
                while cj < cn and cd > 0:
                    if body_raw[cj] == '{':
                        cd += 1
                    elif body_raw[cj] == '}':
                        cd -= 1
                    cj += 1
                cbody = body_raw[cb+1:cj-1].strip()
                children.append((cselector, cbody))
                ci = cj
            blocks.append((selector, None, children))
        else:
            blocks.append((selector, body_raw, None))

    return blocks

def parse_declarations(body):
    if not body:
        return []
    decls = []
    parts = body.split(';')
    for part in parts:
        part = part.strip()
        if not part:
            continue
        colon = part.find(':')
        if colon == -1:
            continue
        prop = part[:colon].strip()
        val = part[colon+1:].strip()
        decls.append((prop, val))
    return decls

def merge_declarations(existing, new_decls):
    merged = {}
    order = []
    for p, v in existing:
        if p not in merged:
            order.append(p)
        merged[p] = v
    for p, v in new_decls:
        if p not in merged:
            order.append(p)
        merged[p] = v
    return [(p, merged[p]) for p in order]

def selector_matches(selector, patterns):
    for pat in patterns:
        if pat in selector:
            return True
    return False

RESTAURANT_CARD_PATTERNS = [
    'restaurant-card', 'luxury-restaurant-card', 'restaurant-card-compact',
    'restaurant-card-mini', 'card-image-link', 'luxury-card-',
    'restaurants-grid', 'restaurant-rail', 'open-status',
    'image-loading-surface', 'restaurantCardReveal',
]

CATALOG_PATTERNS = [
    'client-page', 'catalog-page', 'catalog-title', 'catalog-section',
    'catalog-quick-row', 'quick-filter-row', 'catalog-layout',
    'catalog-filter', 'catalog-search', 'catalog-empty-state',
    'restaurant-list-anchor', 'restaurant-filter-bar', 'filter-search',
    'filter-trigger', 'filter-dropdown', 'filter-submit', 'filter-reset',
    'show-all-link', 'catalog', 'filter-pill',
]

HOME_PATTERNS = [
    'client-home-hero', 'client-home-copy', 'client-stat-strip',
    'home-feature-card', 'home-banner-slider', 'banner-',
    'home-search-card', 'value-grid', 'insight-row',
    'home-banner', 'home-feature',
]

def extract_and_consolidate(blocks, patterns):
    top_level = {}
    top_order = []
    media_rules = {}
    media_order = {}
    media_global_order = []
    keyframes_dict = {}
    keyframes_order = []

    for block in blocks:
        selector, body, children = block

        if children == 'keyframes':
            if selector_matches(selector, patterns):
                if selector not in keyframes_dict:
                    keyframes_order.append(selector)
                keyframes_dict[selector] = body
        elif children is not None:
            matched_children = []
            for cselector, cbody in children:
                if selector_matches(cselector, patterns):
                    matched_children.append((cselector, cbody))

            if matched_children:
                if selector not in media_rules:
                    media_rules[selector] = {}
                    media_order[selector] = []
                    media_global_order.append(selector)

                for cselector, cbody in matched_children:
                    decls = parse_declarations(cbody)
                    if cselector in media_rules[selector]:
                        media_rules[selector][cselector] = merge_declarations(
                            media_rules[selector][cselector], decls
                        )
                    else:
                        media_rules[selector][cselector] = decls
                        media_order[selector].append(cselector)
        else:
            if selector_matches(selector, patterns):
                decls = parse_declarations(body)
                if selector in top_level:
                    top_level[selector] = merge_declarations(top_level[selector], decls)
                else:
                    top_level[selector] = decls
                    top_order.append(selector)

    return top_level, top_order, media_rules, media_order, media_global_order, keyframes_dict, keyframes_order

def format_output(top_level, top_order, media_rules, media_order, media_global_order, keyframes_dict, keyframes_order):
    lines = []

    for sel in top_order:
        decls = top_level[sel]
        if not decls:
            continue
        lines.append(f"{sel} {{")
        for prop, val in decls:
            lines.append(f"  {prop}: {val};")
        lines.append("}")
        lines.append("")

    for kf in keyframes_order:
        body = keyframes_dict[kf]
        lines.append(f"{kf} {{")
        inner_blocks = tokenize_css(body)
        for ib_sel, ib_body, ib_children in inner_blocks:
            if ib_body is not None:
                decls = parse_declarations(ib_body)
                lines.append(f"  {ib_sel} {{")
                for prop, val in decls:
                    lines.append(f"    {prop}: {val};")
                lines.append("  }")
        lines.append("}")
        lines.append("")

    consolidated_media = {}
    consolidated_media_order_selectors = {}
    unique_mq_order = []
    seen_mq = set()

    for mq in media_global_order:
        if mq not in seen_mq:
            seen_mq.add(mq)
            unique_mq_order.append(mq)
            consolidated_media[mq] = {}
            consolidated_media_order_selectors[mq] = []

        for sel in media_order[mq]:
            decls = media_rules[mq][sel]
            if sel in consolidated_media[mq]:
                consolidated_media[mq][sel] = merge_declarations(
                    consolidated_media[mq][sel], decls
                )
            else:
                consolidated_media[mq][sel] = decls
                consolidated_media_order_selectors[mq].append(sel)

    for mq in unique_mq_order:
        sels = consolidated_media_order_selectors[mq]
        if not sels:
            continue
        lines.append(f"{mq} {{")
        for sel in sels:
            decls = consolidated_media[mq][sel]
            if not decls:
                continue
            lines.append(f"  {sel} {{")
            for prop, val in decls:
                lines.append(f"    {prop}: {val};")
            lines.append("  }")
            lines.append("")
        lines.append("}")
        lines.append("")

    return '\n'.join(lines)

def main():
    raw = read_css(CSS_FILE)
    blocks = tokenize_css(raw)

    print(f"Total blocks parsed: {len(blocks)}", file=sys.stderr)

    rc_top, rc_top_order, rc_media, rc_media_order, rc_media_global, rc_kf, rc_kf_order = extract_and_consolidate(blocks, RESTAURANT_CARD_PATTERNS)
    rc_output = format_output(rc_top, rc_top_order, rc_media, rc_media_order, rc_media_global, rc_kf, rc_kf_order)

    cat_top, cat_top_order, cat_media, cat_media_order, cat_media_global, cat_kf, cat_kf_order = extract_and_consolidate(blocks, CATALOG_PATTERNS)
    cat_output = format_output(cat_top, cat_top_order, cat_media, cat_media_order, cat_media_global, cat_kf, cat_kf_order)

    home_top, home_top_order, home_media, home_media_order, home_media_global, home_kf, home_kf_order = extract_and_consolidate(blocks, HOME_PATTERNS)
    home_output = format_output(home_top, home_top_order, home_media, home_media_order, home_media_global, home_kf, home_kf_order)

    styles_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "styles")
    os.makedirs(styles_dir, exist_ok=True)

    with open(os.path.join(styles_dir, "restaurant-card.css"), 'w', encoding='utf-8') as f:
        f.write("/* Restaurant Card styles - extracted and consolidated from globals.css */\n\n")
        f.write(rc_output)

    with open(os.path.join(styles_dir, "catalog.css"), 'w', encoding='utf-8') as f:
        f.write("/* Catalog and Filter styles - extracted and consolidated from globals.css */\n\n")
        f.write(cat_output)

    with open(os.path.join(styles_dir, "home.css"), 'w', encoding='utf-8') as f:
        f.write("/* Homepage styles - extracted and consolidated from globals.css */\n\n")
        f.write(home_output)

    print("Done! Files written:", file=sys.stderr)
    print(f"  restaurant-card.css: {len(rc_top)} top-level rules, {sum(len(v) for v in rc_media_order.values())} media rules, {len(rc_kf)} keyframes", file=sys.stderr)
    print(f"  catalog.css: {len(cat_top)} top-level rules, {sum(len(v) for v in cat_media_order.values())} media rules, {len(cat_kf)} keyframes", file=sys.stderr)
    print(f"  home.css: {len(home_top)} top-level rules, {sum(len(v) for v in home_media_order.values())} media rules, {len(home_kf)} keyframes", file=sys.stderr)

if __name__ == '__main__':
    main()
