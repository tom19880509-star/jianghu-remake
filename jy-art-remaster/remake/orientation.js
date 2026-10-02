export function mountLandscapePreference(stage, beforeOpen) {
  const touch = matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 1;
  const portrait = matchMedia('(orientation: portrait)');
  const guide = document.createElement('dialog');
  guide.id = 'landscape-guide';
  guide.setAttribute('aria-labelledby', 'landscape-title');
  guide.innerHTML = `
    <span class="landscape-device" aria-hidden="true">↶</span>
    <h2 id="landscape-title">横屏入江湖</h2>
    <p id="landscape-message" role="status">将手机或平板横过来，地图更开阔，走位与出招也更顺手。</p>
    <button id="landscape-fullscreen">横屏 / 全屏</button>
    <button id="landscape-continue">暂用竖屏</button>`;
  stage.append(guide);
  const message = guide.querySelector('#landscape-message');
  const enter = guide.querySelector('#landscape-fullscreen');
  let dismissed = false, pending = false;
  function sync() {
    if (!touch || !portrait.matches) {
      if (guide.open) guide.close();
    } else if (!dismissed && !guide.open && !document.querySelector('dialog[open]')) {
      beforeOpen();
      guide.showModal();
    }
  }
  async function enterFullscreen() {
    if (pending) return;
    pending = true; enter.disabled = true;
    beforeOpen();
    // Reopen after fullscreen so the fallback stays above its fullscreen parent.
    if (guide.open) guide.close();
    try {
      if (!document.fullscreenElement && stage.requestFullscreen)
        await stage.requestFullscreen();
      if (touch && screen.orientation?.lock)
        await screen.orientation.lock('landscape');
    } catch {
      // Manual rotation remains available when the browser refuses this request.
    } finally {
      pending = false; enter.disabled = false;
      if (touch && portrait.matches) {
        dismissed = false;
        message.textContent = '请将设备横过来；若画面没有转向，请先关闭设备的方向锁定。';
        sync();
      }
    }
  }
  guide.querySelector('#landscape-continue').onclick = () => {
    dismissed = true; guide.close();
  };
  guide.addEventListener('cancel', () => { dismissed = true; });
  enter.onclick = enterFullscreen;
  const button = document.createElement('button');
  button.id = 'landscape-menu';
  button.textContent = touch ? '横屏 / 全屏' : '全屏游玩';
  button.onclick = enterFullscreen;
  (document.querySelector('#hud-drawer .menu-group:last-child')||document.querySelector('#hud-drawer nav')).append(button);
  portrait.addEventListener('change', sync);
  sync();
  return { enterFullscreen };
}
