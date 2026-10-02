"""Get the existing open source base and public game resources. No player saves."""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
import argparse, gzip, hashlib, io, json, shutil, zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parent
BASE_COMMIT = '89962d7fc2837c143e176c306d83b4e38dab6e77'
BASE_URL = 'https://codeload.github.com/ZhanruiLiang/jinyong-legend/zip/' + BASE_COMMIT

def reference_files(name):
    return name in {'config.lua', 'hzmb.dat', 'readme.txt'} or name.startswith(('script/', 'data/')) or name.startswith('sound/game') and name.endswith('.mid')

def prepare_reference(existing=None):
    target = ROOT / 'jy-dos-reference'
    if (target / 'script/jymain.lua').exists():
        return
    if existing and (existing.parent / 'jy-dos-reference/script/jymain.lua').exists():
        source = existing.parent / 'jy-dos-reference'
        for p in source.rglob('*'):
            rel = p.relative_to(source).as_posix()
            if p.is_file() and reference_files(rel):
                q = target / rel
                q.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(p, q)
        return
    print('Downloading original Lua scripts, map data and MIDI scores…', flush=True)
    with urlopen(BASE_URL, timeout=90) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    for entry in archive.infolist():
        rel = '/'.join(entry.filename.split('/')[1:])
        if entry.is_dir() or not reference_files(rel):
            continue
        q = target / rel
        q.parent.mkdir(parents=True, exist_ok=True)
        q.write_bytes(archive.read(entry))

def prepare_assets(existing=None, workers=4):
    manifest = json.loads((ROOT / 'runtime-assets.json').read_text())
    def get(row):
        target = ROOT / row['path']
        if target.exists():
            return
        if existing:
            source = existing / Path(row['path']).relative_to('jy-art-remaster')
            if not source.exists():
                raise FileNotFoundError(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            return
        url = manifest['source'].rstrip('/') + '/' + quote(row['remote'])
        with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=90) as response:
            raw = response.read()
        if hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError('Public resource changed; refresh the release manifest: ' + row['remote'])
        target.parent.mkdir(parents=True, exist_ok=True)
        if row['decode'] == 'webp':
            with Image.open(io.BytesIO(raw)) as im:
                im.save(target, 'PNG')
        else:
            target.write_bytes(gzip.decompress(raw) if row['decode'] == 'gzip' else raw)
    print(f'Preparing {len(manifest["files"])} resource files…', flush=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(get, manifest['files']))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-existing', type=Path, help='Existing jy-art-remaster directory; copies resources only')
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    existing = args.from_existing.resolve() if args.from_existing else None
    prepare_reference(existing)
    prepare_assets(existing, max(1, min(args.workers, 8)))
    print('Ready. Install npm dependencies in jy-art-remaster/remake, then build and start.')
