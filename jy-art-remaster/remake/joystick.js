// Eight screen directions mapped onto the original four isometric map axes.
// Cardinal screen directions alternate two original steps; game rules stay in Lua.
export function stickDirections(dx, dy) {
  if (Math.hypot(dx, dy) < 12) return [];
  const sector = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
  return [[273, 275], [275], [275, 274], [274], [274, 276], [276], [276, 273], [273]][sector];
}

// ui156b: the stick sits on the lower-left battlefield, so every tap that lands
// on it used to be lost to walking. A press only becomes steering once it slides
// or is held; anything shorter is a tap on the tile underneath. The slop matches
// the canvas' own tap tolerance in engine.js, so both ends call the same gesture
// a tap.
export const STICK_TAP_SLOP = 10;
export const STICK_TAP_MS = 240;

// Replay a tap on whatever is drawn under the stick (the canvas, normally).
// The stick is the only element in #mobile that takes pointer events at that
// spot, so hiding it for one hit test is enough.
function replayOnTileBelow(element, event) {
  const previous = element.style.pointerEvents;
  element.style.pointerEvents = "none";
  const under = document.elementFromPoint(event.clientX, event.clientY);
  element.style.pointerEvents = previous;
  if (!under || under === element || element.contains(under) || under.closest("#mobile")) return;
  const init = {
    bubbles: true, cancelable: true, composed: true, view: window,
    pointerId: event.pointerId, pointerType: event.pointerType, isPrimary: true,
    clientX: event.clientX, clientY: event.clientY, screenX: event.screenX, screenY: event.screenY,
  };
  under.dispatchEvent(new PointerEvent("pointerdown", { ...init, button: 0, buttons: 1 }));
  under.dispatchEvent(new PointerEvent("pointerup", { ...init, button: 0, buttons: 0 }));
}

export function mountJoystick(element, onDirection, onRelease, tapThrough = replayOnTileBelow) {
  let pointer = null, origin = null, steering = false, hold = 0, dx = 0, dy = 0;
  const knob = element.querySelector(".stick-knob");
  const clearHold = () => { if (hold) { clearTimeout(hold); hold = 0; } };
  const cancel = () => {
    const id = pointer;
    pointer = null;
    origin = null;
    steering = false;
    clearHold();
    element.classList.remove("held");
    knob.style.transform = "translate(0, 0)";
    if (id !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  };
  // The knob follows the finger from the first frame; only the walking order waits.
  const track = (event) => {
    const r = element.getBoundingClientRect();
    dx = event.clientX - r.left - r.width / 2;
    dy = event.clientY - r.top - r.height / 2;
    const length = Math.hypot(dx, dy), scale = Math.min(1, (r.width * .3) / (length || 1));
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  };
  const steer = () => {
    steering = true;
    clearHold();
    onDirection(stickDirections(dx, dy));
  };
  element.addEventListener("pointerdown", (event) => {
    if (element.getAttribute("aria-disabled") === "true" || pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    origin = { x: event.clientX, y: event.clientY };
    steering = false;
    element.setPointerCapture(pointer);
    element.classList.add("held");
    track(event);
    // A finger parked on the ring still means walk; it just proves itself first.
    hold = setTimeout(() => { hold = 0; if (pointer !== null) steer(); }, STICK_TAP_MS);
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointer) return;
    track(event);
    if (steering) onDirection(stickDirections(dx, dy));
    else if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > STICK_TAP_SLOP) steer();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    element.addEventListener(type, (event) => {
      if (event.pointerId !== pointer) return;
      const tapped = !steering && type === "pointerup" && !!origin &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <= STICK_TAP_SLOP;
      cancel();
      onRelease();
      if (tapped) tapThrough(element, event);
    });
  return { cancel, held: () => pointer !== null };
}
