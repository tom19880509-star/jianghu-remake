// Initial candidate by Claude Fable 5.1; reviewed and integrated by Codex.
// audio-settings.js — framework-free DOM module for the HUD drawer.
// Contract: no timers, fetch, localStorage, AudioContext or game writes.
// Parent owns player.onChange and should call the returned refresh() from it.

let seq = 0;

const STATUS_TEXT = {
  off: '声音已关闭',
  idle: '此处暂歇琴声，声效照常',
  loading: '正在备琴，请稍候…',
  recorded: '器乐演奏中',
  classic: '简音演奏中',
  fallback: '器乐暂未备好，先以简音相代',
  paused: '声音已暂停，点按钮继续',
  armed: '已记住开启 · 点一下画面即可奏响'
};

// Constant trusted markup. Only __ID__ (numeric counter) is substituted.
const MARKUP = [
  '<details class="jy-audio">',
  '  <summary class="jy-audio__summary">琴音与声息</summary>',
  '  <div class="jy-audio__body">',
  '    <button type="button" class="jy-audio__toggle" data-ref="toggle"',
  '      aria-pressed="false" aria-describedby="__ID__-status">开启声音</button>',
  '    <p class="jy-audio__status" id="__ID__-status" data-ref="status"',
  '      role="status" aria-live="polite"></p>',
  '    <label class="jy-audio__row">',
  '      <span class="jy-audio__name">曲风</span>',
  '      <select class="jy-audio__select" data-ref="mode" aria-describedby="__ID__-mode-help">',
  '        <option value="recorded">器乐</option>',
  '        <option value="classic">简音</option>',
  '      </select>',
  '    </label>',
  '    <p class="jy-audio__help" id="__ID__-mode-help">同一原版旋律：器乐层次更丰富，简音轻巧清淡。</p>',
  '    <label class="jy-audio__row">',
  '      <span class="jy-audio__name">选曲</span>',
  '      <select class="jy-audio__select" data-ref="variety" aria-describedby="__ID__-variety-help">',
  '        <option value="on">久留换曲</option>',
  '        <option value="off">原版单曲</option>',
  '      </select>',
  '    </label>',
  '    <p class="jy-audio__help" id="__ID__-variety-help">久留一地或久战不下时，在同类原曲之间轮换；原版单曲则始终循环剧情指定的那一首。</p>',
  '    <label class="jy-audio__row">',
  '      <span class="jy-audio__name">乐曲 <output data-ref="musicOut">100%</output></span>',
  '      <input class="jy-audio__range" data-ref="music" type="range" min="0" max="100" step="1" value="100" aria-valuetext="100%">',
  '    </label>',
  '    <label class="jy-audio__row">',
  '      <span class="jy-audio__name">声效 <output data-ref="effectsOut">100%</output></span>',
  '      <input class="jy-audio__range" data-ref="effects" type="range" min="0" max="100" step="1" value="100" aria-valuetext="100%">',
  '    </label>',
  '    <p class="jy-audio__help">音量与音色记在本机；再次打开游戏时，点一下即可开启声音。</p>',
  '  </div>',
  '</details>'
].join('\n');

function toPercent(v) {
  const n = Number(v);
  const c = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  return Math.round(c * 100);
}

export function mountAudioSettings(root, player, onToggle) {
  const id = 'jy-audio-' + (++seq);
  root.innerHTML = MARKUP.replace(/__ID__/g, id);

  const q = (ref) => root.querySelector('[data-ref="' + ref + '"]');
  const el = {
    toggle: q('toggle'),
    status: q('status'),
    mode: q('mode'),
    variety: q('variety'),
    music: q('music'),
    musicOut: q('musicOut'),
    effects: q('effects'),
    effectsOut: q('effectsOut')
  };

  let pending = false; // onToggle in flight
  let failed = false;  // last onToggle rejected

  function paintRange(input, out, value, skipIfActive) {
    const p = toPercent(value);
    const text = p + '%';
    if (!(skipIfActive && document.activeElement === input)) {
      input.value = String(p);
    }
    out.textContent = text;
    input.setAttribute('aria-valuetext', text);
  }

  function refresh() {
    const on = !!player.enabled;
    if (failed && (on || player.status === 'loading')) failed = false;
    el.toggle.textContent = player.status === 'paused' && on ? '继续声音' : on ? '关闭声音' : '开启声音';
    el.toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.toggle.disabled = pending;

    const mode = player.mode === 'classic' ? 'classic' : 'recorded';
    if (document.activeElement !== el.mode) el.mode.value = mode;
    if (document.activeElement !== el.variety) el.variety.value = player.variety === false ? 'off' : 'on';

    paintRange(el.music, el.musicOut, player.musicVolume, true);
    paintRange(el.effects, el.effectsOut, player.effectVolume, true);

    let text;
    if (pending) text = '稍候…';
    else if (failed) text = '未能开启声音，请再点一次';
    else text = STATUS_TEXT[player.status] || (on ? '声音已开启' : '声音已关闭');
    el.status.textContent = text;
    return refresh;
  }

  el.toggle.addEventListener('click', function () {
    if (pending) return;
    pending = true;
    failed = false;
    refresh();
    let p;
    try { p = Promise.resolve(onToggle()); }
    catch (e) { p = Promise.reject(e); }
    p.then(function () { failed = false; }, function () { failed = true; })
     .then(function () { pending = false; refresh(); });
  });

  // Mode change only reschedules timbre; never calls onToggle, so a muted
  // player stays muted.
  el.mode.addEventListener('change', function () {
    player.setMode(el.mode.value === 'classic' ? 'classic' : 'recorded');
    refresh();
  });

  // Rotation preference only; like the timbre switch it never unmutes.
  el.variety.addEventListener('change', function () {
    if (typeof player.setVariety === 'function') player.setVariety(el.variety.value !== 'off');
    refresh();
  });

  function bindRange(input, out, channel) {
    input.addEventListener('input', function () {
      const p = toPercent(Number(input.value) / 100);
      player.setVolume(channel, p / 100);
      const text = p + '%';
      out.textContent = text;
      input.setAttribute('aria-valuetext', text);
    });
  }
  bindRange(el.music, el.musicOut, 'music');
  bindRange(el.effects, el.effectsOut, 'effects');

  return refresh();
}
