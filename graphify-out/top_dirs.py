import json
from collections import Counter
from pathlib import Path

with open('graphify-out/.graphify_detect.json', 'r', encoding='utf-8') as f:
    result = json.load(f)

files = []
for category in result.get('files', {}).values():
    files.extend(category)

subdirs = Counter()
for file_path in files:
    parts = Path(file_path).parts
    if len(parts) > 2: # e.g. C:\Stayflexi\src\...
        subdirs[parts[2]] += 1
    elif len(parts) > 1:
        subdirs[parts[1]] += 1

print("Top subdirectories:")
for subdir, count in subdirs.most_common(5):
    print(f"  {subdir}: {count} files")
