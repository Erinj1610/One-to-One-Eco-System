import re
import os

with open('../1to1_world_portal.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract CSS
css_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if css_match:
    css = css_match.group(1)
    with open('src/portal.css', 'a', encoding='utf-8') as f:
        f.write('\n/* NEW CSS FROM 1to1_world_portal.html */\n')
        f.write(css)
    print('Appended CSS to portal.css')

# Extract Pages
pages = [
    'crm', 'pipeline', 'time', 'products', 'boq', 
    'orders', 'invoices', 'docs', 'hr', 'reports', 'support', 'settings'
]

def html_to_jsx(html_str):
    # Basic replacements
    html_str = html_str.replace('class=', 'className=')
    html_str = html_str.replace('onclick=', 'onClick=')
    html_str = html_str.replace('onchange=', 'onChange=')
    
    # Handle inline styles
    def style_replacer(match):
        style_str = match.group(1)
        styles = {}
        for rule in style_str.split(';'):
            if ':' in rule:
                k, v = rule.split(':', 1)
                k = k.strip()
                v = v.strip()
                # camelCase the key
                parts = k.split('-')
                if len(parts) > 1:
                    k = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                # remove !important
                v = v.replace('!important', '').strip()
                styles[k] = v
        
        style_obj_str = ", ".join(f"'{k}': '{v}'" for k, v in styles.items())
        return f"style={{{{{style_obj_str}}}}}"
    
    html_str = re.sub(r'style="([^"]*)"', style_replacer, html_str)
    
    # Close unclosed tags
    html_str = html_str.replace('<br>', '<br />').replace('<hr>', '<hr />')
    html_str = re.sub(r'<input([^>]*?)>', lambda m: f"<input{m.group(1)} />" if not m.group(1).endswith('/') else m.group(0), html_str)
    html_str = re.sub(r'<img([^>]*?)>', lambda m: f"<img{m.group(1)} />" if not m.group(1).endswith('/') else m.group(0), html_str)

    return html_str

jsx_out = "import React from 'react';\n\n"

for page in pages:
    # Find the div for the page
    pattern = rf'<div class="page(?: active)?" id="page-{page}">(.*?)<!-- ============'
    match = re.search(pattern, html, re.DOTALL)
    
    if match:
        content = match.group(1)
    else:
        # try to find until the next <div class="page
        pattern = rf'<div class="page(?: active)?" id="page-{page}">(.*?)(?:<div class="page|</div>\s*<!-- ════════)'
        match = re.search(pattern, html, re.DOTALL)
        if match:
            content = match.group(1)
            # Find the last closing div of the page content
            content = content.rsplit('</div>', 1)[0]
        else:
            print(f'Could not find page {page}')
            continue
            
    jsx_content = html_to_jsx(content)
    
    # wrap in a component
    component_name = ''.join(word.capitalize() for word in page.split('-')) + 'Page'
    
    jsx_out += f"export function {component_name}() {{\n"
    jsx_out += f"  return (\n    <div className=\"animation-fade-in\">\n      {jsx_content}\n    </div>\n  );\n}}\n\n"

with open('src/pages/MockModules.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx_out)
    print('Generated MockModules.jsx')
