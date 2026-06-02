import json
from graphify.detect import detect
from pathlib import Path

result = detect(Path('.'))
with open('graphify-out/.graphify_detect.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)

files = result.get('files', {})
print(f"total_files: {result.get('total_files')}")
print(f"total_words: {result.get('total_words')}")
print(f"code: {len(files.get('code', []))}")
print(f"document: {len(files.get('document', []))}")
print(f"paper: {len(files.get('paper', []))}")
print(f"image: {len(files.get('image', []))}")
print(f"video: {len(files.get('video', []))}")
print(f"skipped: {len(result.get('skipped_sensitive', []))}")
