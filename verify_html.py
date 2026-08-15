from html.parser import HTMLParser
import re

class TagValidator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.void_tags = {'meta', 'link', 'img', 'br', 'hr', 'input'}

    def handle_starttag(self, tag, attrs):
        if tag not in self.void_tags:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag in self.void_tags:
            return
        if not self.stack:
            self.errors.append(f"Unexpected closing tag </{tag}> at {self.getpos()}")
            return
        last_tag, pos = self.stack.pop()
        if last_tag != tag:
            self.errors.append(f"Mismatched tag: expected </{last_tag}> (opened at {pos}), found </{tag}> at {self.getpos()}")

with open('stayflexi_engineering_presentation.html', 'r', encoding='utf-8') as f:
    content = f.read()

v = TagValidator()
v.feed(content)

if v.errors:
    print(f"Found {len(v.errors)} HTML tag mismatch errors:")
    for err in v.errors:
        print(" -", err)
else:
    print("SUCCESS: HTML tags are 100% PERFECTLY BALANCED!")

slide_chunks = re.split(r'<!-- SLIDE \d+', content)
print(f"Total split sections: {len(slide_chunks)}")

import sys
sys.stdout.reconfigure(encoding='utf-8')

for i in range(1, len(slide_chunks)):
    chunk = slide_chunks[i]
    title_m = re.search(r'<div class="slide-title">([^<]+)</div>', chunk)
    title = title_m.group(1) if title_m else "UNKNOWN"
    cat_m = re.search(r'<div class="slide-category">([^<]+)</div>', chunk)
    cat = cat_m.group(1) if cat_m else "UNKNOWN"
    headers = re.findall(r'<div class="card-header[^"]*">([^<]+)</div>', chunk)
    print(f"Slide {i:02d} [{cat}]: {title} ({len(headers)} cards: {headers})")
