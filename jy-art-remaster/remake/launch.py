"""Run the game locally, optionally allowing phones on the same Wi-Fi."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
import argparse, json, socket, subprocess, sys, webbrowser

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('port', type=int, nargs='?', default=5409)
parser.add_argument('--lan', action='store_true')
parser.add_argument('--no-open', action='store_true')
args = parser.parse_args()

def lan_ip():
    try:
        address = subprocess.check_output(['ipconfig', 'getifaddr', 'en0'], text=True, stderr=subprocess.DEVNULL).strip()
        if address:
            return address
    except (OSError, subprocess.CalledProcessError):
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(('192.168.0.1', 9))
            return probe.getsockname()[0]
    except OSError:
        return None

class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root), **kw)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/play-info.json':
            ip = lan_ip() if args.lan else None
            payload = json.dumps({'game':'jy-remake', 'lan':args.lan,
                'phone_url':f'http://{ip}:{self.server.server_port}/remake/' if ip else None}).encode()
            from io import BytesIO
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return BytesIO(payload)
        target = (root / path.lstrip('/')).resolve()
        try:
            rel = target.relative_to(root).as_posix()
        except ValueError:
            self.send_error(404)
            return None
        # Share game resources and art previews, keeping local QA saves and reviews off the LAN.
        ext = target.suffix.lower()
        allowed = (
            rel in ('remake', 'demo') or
            rel.startswith('remake/') and (
                len(Path(rel).parts) == 2 and ext in ('.html', '.js', '.css') or
                rel.startswith('remake/assets/') and ext in ('.png', '.jpg', '.webp', '.json', '.mp3', '.ogg', '.m4a') or
                rel.startswith('remake/assets/fonts/') and ext in ('.woff', '.woff2', '.ttf', '.txt', '.md') or
                rel.startswith('remake/chapters/') and ext == '.grp' or
                rel.startswith('remake/qa/') and ext == '.png') or
            rel.startswith('characters/') and ext == '.png' or
            rel.startswith('references/portraits/') and ext == '.png' or
            rel.startswith('demo/') and ext in ('.html', '.js', '.css', '.png', '.jpg', '.mp3', '.ogg')
        )
        if not allowed:
            self.send_error(404)
            return None
        return super().send_head()

    def do_POST(self):
        # Player-initiated export of one game save into remake/output/. Loopback only, fixed
        # directory, fixed type, size-limited, never overwrites; no caller-supplied path.
        def reply(code, body):
            data = json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        parts = urlsplit(self.path)
        if parts.path != '/remake/local-save-export':
            return reply(404, {'ok': False, 'error': '未知入口'})
        host = (self.headers.get('Host') or '').rsplit(':', 1)[0]
        origin = self.headers.get('Origin') or ''
        local_origins = {f'http://{h}:{self.server.server_port}' for h in ('127.0.0.1', 'localhost')}
        if self.client_address[0] != '127.0.0.1' or host not in ('127.0.0.1', 'localhost') or origin not in local_origins:
            return reply(403, {'ok': False, 'error': '仅限本机页面使用'})
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            length = 0
        if not 0 < length <= 9_000_000:
            return reply(413, {'ok': False, 'error': '存档大小不符'})
        try:
            raw = self.rfile.read(length)
            save = json.loads(raw)
            if not (isinstance(save, dict) and save.get('format') == 'jy-remake-save' and save.get('version') == 1
                    and all(isinstance(save.get(k), str) for k in ('r', 's', 'd'))):
                raise ValueError
        except Exception:
            return reply(400, {'ok': False, 'error': '不是江湖重绘存档'})
        slot = parts.query[5:] if parts.query in ('slot=1', 'slot=2', 'slot=3') else 'x'
        from datetime import datetime
        out_dir = root / 'remake' / 'output'
        out_dir.mkdir(exist_ok=True)
        name = f'local-export-slot{slot}-{datetime.now():%Y%m%d-%H%M%S}.jy-save.json'
        try:
            with open(out_dir / name, 'xb') as handle:
                handle.write(raw)
        except FileExistsError:
            return reply(409, {'ok': False, 'error': '同名文件已存在，请稍后再试'})
        except OSError as error:
            return reply(500, {'ok': False, 'error': f'写入失败：{error}'})
        return reply(200, {'ok': True, 'path': f'remake/output/{name}', 'bytes': len(raw)})

    def end_headers(self):
        if urlsplit(self.path).path.endswith(('.html', '.js', '.css', '/')):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

class GameServer(ThreadingHTTPServer):
    # The opening loads many sprite sheets together. The default backlog of 5
    # resets connections during this burst and makes Image.decode abort boot.
    request_queue_size = 128

url = f'http://127.0.0.1:{args.port}/remake/'
try:
    server = GameServer(('0.0.0.0' if args.lan else '127.0.0.1', args.port), GameHandler)
except OSError as error:
    try:
        with urlopen(f'http://127.0.0.1:{args.port}/play-info.json', timeout=2) as response:
            info = json.load(response)
        if info.get('game') != 'jy-remake' or args.lan and not info.get('lan'):
            raise ValueError('已有服务未开启手机访问')
    except Exception:
        sys.exit(f'端口 {args.port} 已被占用。请先关闭原来的游戏启动窗口，再重新启动。不会改用新地址，以免找不到原存档。\n{error}')
    print(f'电脑入口：{url}', flush=True)
    if info.get('phone_url'):
        print(f'手机入口（同一 Wi-Fi）：{info["phone_url"]}', flush=True)
    if not args.no_open:
        webbrowser.open(url)
    sys.exit(0)
print(f'电脑入口：{url}', flush=True)
if args.lan:
    ip = lan_ip()
    print(f'手机入口（同一 Wi-Fi）：http://{ip}:{server.server_port}/remake/' if ip else '尚未取得 Wi-Fi 地址，请检查网络。', flush=True)
print('游玩时保持此窗口和电脑开启。关闭窗口即可停止。', flush=True)
if not args.no_open:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
