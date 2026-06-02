import json
try:
    with open('graphify-out/.graphify_detect.json') as f:
        d = json.load(f)
    files = d.get('files', {})
    print(f"total_files: {d.get('total_files')}")
    print(f"total_words: {d.get('total_words')}")
    print(f"code: {len(files.get('code', []))}")
    print(f"document: {len(files.get('document', []))}")
    print(f"paper: {len(files.get('paper', []))}")
    print(f"image: {len(files.get('image', []))}")
    print(f"video: {len(files.get('video', []))}")
    print(f"skipped: {len(d.get('skipped_sensitive', []))}")
except Exception as e:
    print(e)
