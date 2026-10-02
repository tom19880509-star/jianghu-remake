const AUDIO_PREFS = "jy-audio-v2";
const ARM_EVENTS = ["pointerup", "keydown", "touchend"];
const unit = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;

// music155 score plan: pure data and pure functions (no WebAudio, no DOM), so
// tests/music155-*.test.mjs can check the mapping and its fallbacks in node.
// Only the 25 source scores already shipped in assets/music are referenced.
// Source facts, asserted against content.js by tests/music155-plan.test.mjs:
//  - war.sta music is only 5/6/7 -> game06/07/08 (49/65/26 battles): the source
//    already has ordinary/elite/boss tiers, and no scene enters with those
//    three, so the requested file alone tells a battle from a place.
//  - no scene enters with id 0, so game01 right after a battle is always
//    jymain's "this scene has no music" fallback, never a composed choice.
//  - exit-music ids 16/19/0 (game17/20/01) are the source's world-map themes.
//    The Lua port reads JY.MmapMusic but scene exits write JY.MMAPMusic, so
//    only game17 (later game04 through instruct_8) is ever requested.
export const BATTLE_TIERS = Object.freeze({ "game06.mid": "normal", "game07.mid": "elite", "game08.mid": "boss" });
export const POST_BATTLE_FALLBACK = "game01.mid";
// A long stay rotates inside one family instead of looping a 30-70 s score for
// many minutes. The requested score always plays first and keeps its identity.
export const ROTATIONS = Object.freeze({
  "game17.mid": Object.freeze(["game17.mid", "game20.mid", "game01.mid"]),
  "game04.mid": Object.freeze(["game04.mid", "game01.mid", "game20.mid"]),
  "game06.mid": Object.freeze(["game06.mid", "game07.mid"]),
  "game07.mid": Object.freeze(["game07.mid", "game06.mid"]),
  "game08.mid": Object.freeze(["game08.mid", "game07.mid"]),
});
const ROTATE_LEAD = 3;
// Q4 audio395: where the source game loops each score — the MIDI end of track
// (s, tempo map applied) of jy-dos-reference/sound/gameNN.mid, asserted by
// tests/audio395-loop-duck.test.mjs. The sampled renders ring on 1.3-2.0 s past it
// (release and reverb down to -60 dBFS), which was heard as a pause per loop.
export const SCORE_END = Object.freeze({
  "game01.mid": 49.61, "game02.mid": 55.077, "game03.mid": 38.66, "game04.mid": 71.528, "game05.mid": 77.648,
  "game06.mid": 41.965, "game07.mid": 34.028, "game08.mid": 27.882, "game09.mid": 43.757, "game10.mid": 63.596,
  "game11.mid": 62.34, "game12.mid": 48.146, "game13.mid": 44.27, "game14.mid": 35.318, "game15.mid": 52.174,
  "game16.mid": 25.275, "game17.mid": 39.432, "game18.mid": 59.307, "game19.mid": 59.643, "game20.mid": 63.291,
  "game21.mid": 32.801, "game22.mid": 60.577, "game23.mid": 54.821, "game24.mid": 43.667, "game25.mid": 115.625,
});
// Seconds after which a decoded recording loops back to 0. Without a known
// musical end (or if it falls outside the render): the render minus its trailing
// digital silence (< -60 dBFS) plus 20 ms, as before. With one: the render's
// first audible sample + musicalEnd, moved by at most 3 ms to the sample closest
// to the first one so the wrap adds no step. 0 = no audible sample.
export function loopPoint(ch, rate, musicalEnd = 0) {
  const n = ch?.[0]?.length || 0;
  if (!n || !rate) return 0;
  const quiet = (k) => ch.every((d) => Math.abs(d[k]) < 1e-3);
  let end = n; while (end > 0 && quiet(end - 1)) end--;
  if (!end) return 0;
  const trimmed = Math.min(n / rate, end / rate + 0.02);
  if (!(musicalEnd > 0)) return trimmed;
  let lead = 0; while (lead < end && quiet(lead)) lead++;
  const target = Math.min(lead, Math.round(0.1 * rate)) + Math.round(musicalEnd * rate), w = Math.round(0.003 * rate);
  if (target + w >= end || target < n / 2) return trimmed;
  let best = target, step = Infinity;
  for (let k = target - w; k <= target + w; k++) {
    let s = 0; for (const d of ch) s = Math.max(s, Math.abs(d[k] - d[0]));
    if (s < step) { step = s; best = k; }
  }
  return best / rate;
}
// A synthesized score restarts at the musical end too; its notes' releases
// overlap the next pass the way the original MIDI playback did.
// Only when the score data is that source score: music.js durations are the last
// note-off + 0.6 s, i.e. 0.4-0.6 s past SCORE_END.
const classicLoop = (key, score) => {
  const gap = score.duration - SCORE_END[key];
  return gap >= 0 && gap <= 1 ? SCORE_END[key] : score.duration;
};
// Dialogue pages close and the next opens a frame or two later (16-27 ms
// measured; 154 ms after a battle). Releasing the duck at once swelled the score
// between pages, so the release waits this long and a new duck cancels it.
const DUCK_HOLD = 0.35;
// The synthesized notes (0.021 x velocity per voice) measured 14.6-25.2 dB (median
// 17.7) below the loudness-matched recordings at the same slider, so a failed
// recording's fallback was nearly silent. x4 (+12 dB) leaves the light timbre a
// little quieter; the loudest synthesized peak is then -5.9 dBFS at full volume.
const CLASSIC_GAIN = 4;
export const scoreKey = file => String(file ?? "").split(/[\\/]/).at(-1).toLowerCase();
export const cueKind = key => (BATTLE_TIERS[key] ? "battle" : "place");
// Whole loops nearest to about 170 s, never fewer than two.
export const dwellSeconds = duration => (duration > 0 ? Math.max(2, Math.round(170 / duration)) * duration : Infinity);
// Seconds. Battles cut in quickly; leaving one, and rotating, is gentle.
export function fadePlan(fromKind, toKind, rotating = false) {
  if (rotating) return { out: 2.4, in: 2.4 };
  if (!fromKind) return { out: 0, in: 0.9 };
  if (toKind === "battle") return { out: 0.45, in: 0.18 };
  if (fromKind === "battle") return { out: 1.1, in: 1.6 };
  return { out: 1.2, in: 1.2 };
}
// A missing partner is skipped; it can never silence or replace the request.
export function rotationFor(request, has = () => true, variety = true) {
  const partners = variety && ROTATIONS[request] ? ROTATIONS[request].slice(1) : [];
  return [request, ...partners.filter(key => key !== request && has(key))];
}
export function nextMember(members, current) {
  if (!members || members.length < 2) return null;
  return members[(members.indexOf(current) + 1) % members.length];
}
// state: previousKind = kind of the request before this one; ambientRequest =
// last place request; positions = Map(place request -> {key, offset, played}).
export function resolveScore(file, state = {}, has = () => true) {
  const asked = scoreKey(file);
  if (!asked) return null;
  const { previousKind = null, ambientRequest = null, positions = null, variety = true } = state;
  const afterBattle = asked === POST_BATTLE_FALLBACK && previousKind === "battle" &&
    !!ambientRequest && ambientRequest !== asked && cueKind(ambientRequest) === "place" && has(ambientRequest);
  const request = afterBattle ? ambientRequest : asked;
  // An unknown score keeps the existing contract: that place stays silent.
  if (!has(request)) return null;
  const kind = cueKind(request), members = rotationFor(request, has, variety);
  const saved = kind === "place" ? positions?.get?.(request) : null;
  const resumed = !!saved && members.includes(saved.key);
  return {
    request, key: resumed ? saved.key : request, kind, tier: BATTLE_TIERS[request] ?? null, members,
    offset: resumed ? saved.offset || 0 : 0, played: resumed ? saved.played || 0 : 0, afterBattle,
  };
}

export class JianghuAudio {
  constructor(scores) {
    this.scores = scores;
    this.enabled = false;
    this.file = "";
    this.active = new Set();
    this.musicVoices = new Set();
    this.buffers = new Map();
    this.generation = 0;
    this.toggleEpoch = 0;
    this.hidden = false;
    this.status = "off";
    this.mode = "recorded";
    this.musicVolume = 0.72;
    this.effectVolume = 0.8;
    this.ducked = false;
    this.variety = true;
    this.previousKind = null;
    this.ambientRequest = null;
    this.positions = new Map();
    this.cue = null;
    this.classic = null;
    try {
      const saved = JSON.parse(localStorage.getItem(AUDIO_PREFS) || "{}");
      this.mode = saved.mode === "classic" ? "classic" : "recorded";
      this.variety = saved.variety !== false;
      this.musicVolume = unit(saved.musicVolume, 0.72);
      this.effectVolume = unit(saved.effectVolume, 0.8);
      // S8 (Tom 2026-10-02): on/off is an ordinary preference like the volume.
      // A remembered "on" may not sound before a gesture, so it only arms.
      if (saved.on === true) { this.enabled = true; this.arm(); }
    } catch {}
  }
  changed(status = this.status) { this.status = status; this.onChange?.(); }
  persist() {
    try { localStorage.setItem(AUDIO_PREFS, JSON.stringify({mode:this.mode,musicVolume:this.musicVolume,effectVolume:this.effectVolume,variety:this.variety,on:this.enabled})); } catch {}
  }
  // Armed: sound is on by preference but no AudioContext exists yet. The
  // first trusted gesture anywhere (pointerup covers mouse and touch after
  // activation, keydown covers keys) creates and resumes the context, then
  // plays the track the story has already requested. Nothing is attempted
  // before that gesture, so there is no autoplay error to spam. A gesture
  // that does not unlock (no activation, resume timeout) re-arms quietly.
  arm() {
    if (this.armed || typeof addEventListener !== "function") return;
    const fire = (event) => { if (event?.isTrusted === false) return; this.disarm(); this.unlock(); };
    this.armed = fire;
    for (const type of ARM_EVENTS) addEventListener(type, fire, {capture:true, passive:true});
    this.status = "armed";
  }
  disarm() {
    if (!this.armed) return;
    for (const type of ARM_EVENTS) removeEventListener(type, this.armed, {capture:true});
    this.armed = null;
  }
  async unlock() {
    const epoch = ++this.toggleEpoch;
    try { await this.start(epoch); }
    catch (error) {
      if (epoch !== this.toggleEpoch || !this.enabled) return;
      this.lastUnlockError = String(error?.message || error);
      this.arm(); this.changed("armed");
    }
  }
  // Shared by toggle() and unlock(): context, buses, resume, then the current cue.
  async start(epoch) {
    this.context ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    this.routing();
    await this.resumeContext();
    if (epoch === this.toggleEpoch) this.restart();
  }
  routing() {
    if (!this.context || this.musicBus) return;
    this.musicBus = this.context.createGain();
    this.effectsBus = this.context.createGain();
    this.musicBus.connect(this.context.destination);
    this.effectsBus.connect(this.context.destination);
    this.applyVolumes(true);
  }
  applyVolumes(immediate = false, release = false) {
    if (!this.musicBus) return;
    const at = this.context.currentTime;
    for (const [bus,value,wait] of [[this.musicBus,this.musicVolume*(this.ducked?0.55:1),release?DUCK_HOLD:0], [this.effectsBus,this.effectVolume,0]]) {
      const current = bus.gain.value;
      bus.gain.cancelScheduledValues(at);
      bus.gain.setValueAtTime(current,at);
      if (immediate) bus.gain.setValueAtTime(value,at);
      else bus.gain.setTargetAtTime(value,at+wait,0.09);
    }
  }
  setVolume(kind, value) {
    if (kind === "music") this.musicVolume = unit(value,this.musicVolume);
    else if (kind === "effects") this.effectVolume = unit(value,this.effectVolume);
    else return;
    this.applyVolumes(); this.persist(); this.changed();
  }
  setMode(mode) {
    if (!["recorded","classic"].includes(mode) || mode === this.mode) return;
    this.mode = mode; this.persist(); this.restart();
  }
  // Rotation only. Off = always loop the one score the story asked for.
  setVariety(value) {
    if (!!value === this.variety) return;
    this.variety = !!value; this.persist(); this.restart();
  }
  setDucked(value) { const release = this.ducked && !value; this.ducked = !!value; this.applyVolumes(false,release); }
  async resumeContext() {
    // A phone interruption may leave resume pending until a fresh gesture.
    // Keep the retry control usable instead of leaving it disabled indefinitely.
    let timeout;
    try {
      await Promise.race([this.context.resume(),new Promise((_,reject) => {
        timeout = setTimeout(() => reject(Error("Audio resume needs another gesture")),2500);
      })]);
    } finally { clearTimeout(timeout); }
  }
  async toggle() {
    const epoch = ++this.toggleEpoch;
    this.enabled = this.enabled && this.status === "paused" ? true : !this.enabled;
    this.persist();
    if (!this.enabled) { this.disarm(); this.stop(); this.changed("off"); return false; }
    try { await this.start(epoch); }
    catch (error) {
      if (epoch === this.toggleEpoch) { this.enabled = false; this.persist(); this.stop(); this.changed("off"); }
      throw error;
    }
    return this.enabled;
  }
  has(key) { return !!this.scores?.[key]; }
  resolve() {
    return resolveScore(this.file, {previousKind:this.previousKind, ambientRequest:this.ambientRequest,
      positions:this.positions, variety:this.variety}, key => this.has(key));
  }
  select(file) {
    if (this.file === file) return;
    const before = scoreKey(this.file);
    if (before) this.previousKind = cueKind(before);
    this.file = file;
    // Bookkeeping is independent of whether sound is on: music enabled in the
    // middle of a battle still returns to the right place afterwards.
    const cue = this.resolve();
    if (cue?.kind === "place") this.ambientRequest = cue.request;
    this.restart();
  }
  // A place score continues where it left off (battle, another room, a hidden
  // tab) instead of replaying its first bars every time. Battles start at 0.
  remember() {
    const r = this.recording, c = this.classic;
    if (r && r.kind === "place" && r.duration) {
      const elapsed = Math.max(0, this.context.currentTime - r.startedAt);
      this.positions.set(r.request, {key:r.key, offset:(r.offset+elapsed)%r.duration, played:r.played+elapsed});
    } else if (c && c.kind === "place") this.positions.set(c.request, {key:c.key, offset:0, played:0});
  }
  stopMusic(fade = 0) {
    this.remember();
    clearInterval(this.timer); clearTimeout(this.rotateTimer); this.rotateTimer = null;
    if (this.retiring) { for (const voice of this.retiring) { try { voice.stop(); } catch {} } this.retiring = null; }
    const at = this.context?.currentTime ?? 0, retiring = new Set();
    if (fade) for (const gain of [this.recording?.gain.gain, this.classic?.bus.gain]) {
      if (!gain) continue;
      const current = gain.value;
      gain.cancelScheduledValues(at); gain.setValueAtTime(current,at);
      gain.linearRampToValueAtTime(0,at+fade);
    }
    for (const voice of this.musicVoices) {
      try {
        if (fade) { retiring.add(voice); voice.stop(at+fade); } else voice.stop();
      } catch {}
    }
    this.retiring = retiring.size ? retiring : null;
    this.musicVoices.clear();
    this.recording = null; this.classic = null;
  }
  stop() {
    ++this.generation;
    this.pending?.abort(); this.pending = null;
    this.stopMusic();
    for (const voice of this.active) { try { voice.stop(); } catch {} }
    this.active.clear();
  }
  async setHidden(hidden) {
    this.hidden = !!hidden;
    if (!this.enabled || !this.context) return;
    if (this.hidden) {
      this.stop(); this.changed("paused");
      try { await this.context.suspend(); } catch {}
    } else {
      try { await this.resumeContext(); if (!this.hidden && this.enabled) this.restart(); }
      catch { this.changed("paused"); }
    }
  }
  restart() {
    const generation = ++this.generation;
    this.pending?.abort(); this.pending = null;
    if (!this.enabled || this.hidden || !this.file) {
      this.stopMusic(); this.cue = null; this.changed(this.enabled ? this.hidden ? "paused" : this.context ? "idle" : "armed" : "off"); return;
    }
    // Remembered on, no gesture yet: only the bookkeeping above ran, so the
    // right track resumes from the right place once the page is touched.
    if (!this.context) { this.cue = null; this.changed("armed"); return; }
    const cue = this.resolve();
    if (!cue) { this.stopMusic(0.8); this.cue = null; this.changed("idle"); return; }
    this.routing();
    this.cue = cue;
    // Already sounding (the world theme kept through a music-less scene and
    // its battle, or a settings change): keep it instead of starting over.
    const sounding = this.mode === "classic" ? this.classic?.key : this.recording?.key;
    if (sounding === cue.key) { this.scheduleRotation(); this.changed(); return; }
    this.play(cue.key,generation,{request:cue.request,offset:cue.offset,played:cue.played});
  }
  play(key, generation, options = {}) {
    if (this.mode === "classic") { this.startClassic(key,"classic",options); return; }
    if (!options.rotating) this.changed("loading");
    this.startRecorded(key,generation,options).catch(error => {
      if (generation !== this.generation || !this.enabled || this.hidden) return;
      // A failed recording must never block the source game's event coroutine.
      this.lastLoadError = String(error?.message || error);
      this.startClassic(key,"fallback",options);
    });
  }
  // Land the change on a loop boundary of the outgoing score, ROTATE_LEAD early.
  scheduleRotation() {
    clearTimeout(this.rotateTimer); this.rotateTimer = null;
    const r = this.recording, cue = this.cue;
    if (!r || !cue || cue.key !== r.key || cue.members.length < 2 || !r.duration) return;
    // Count from now: a score kept sounding (restart) has advanced since it started.
    const elapsed = Math.max(0, this.context.currentTime - r.startedAt);
    const earliest = Math.max(ROTATE_LEAD+5, dwellSeconds(r.duration)-r.played-elapsed);
    const toBoundary = (r.duration-((r.offset+elapsed+earliest)%r.duration))%r.duration;
    this.rotateTimer = setTimeout(() => this.rotate(), (earliest+toBoundary-ROTATE_LEAD)*1000);
    this.rotateTimer?.unref?.();
  }
  async rotate() {
    const cue = this.cue, r = this.recording, generation = this.generation;
    if (!this.enabled || this.hidden || !cue || !r || r.key !== cue.key) return;
    const next = nextMember(cue.members,cue.key);
    if (!next || next === cue.key) return;
    try { await this.startRecorded(next,generation,{request:cue.request,rotating:true}); }
    catch (error) {
      // Variety is optional: keep the current recording rather than dropping
      // to the synthesized fallback, and try again one loop later.
      if (generation !== this.generation || this.recording !== r) return;
      this.lastLoadError = String(error?.message || error);
      clearTimeout(this.rotateTimer);
      this.rotateTimer = setTimeout(() => this.rotate(), r.duration*1000);
      this.rotateTimer?.unref?.();
    }
  }
  async startRecorded(key, generation, {fades, request = key, offset = 0, played = 0, rotating = false} = {}) {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const controller = this.pending = new AbortController();
      const response = await fetch(`assets/music/${key.replace(/\.mid$/i,".m4a")}?v=sampled-20260913`, {signal:controller.signal});
      if (!response.ok) throw Error(`Score HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      if (generation !== this.generation) return;
      buffer = await this.context.decodeAudioData(data);
      if (generation !== this.generation) return;
      this.pending = null;
      // Loop seam at the source game's loop point (see loopPoint); the start stays.
      if (typeof buffer.getChannelData === "function") {
        const ch = Array.from({length:buffer.numberOfChannels}, (_,i) => buffer.getChannelData(i));
        buffer.jyLoopEnd = loopPoint(ch, buffer.sampleRate, SCORE_END[key]) || undefined;
      }
    }
    if (generation !== this.generation || !this.enabled || this.hidden) return;
    this.buffers.delete(key); this.buffers.set(key,buffer);
    while (this.buffers.size > 2) this.buffers.delete(this.buffers.keys().next().value);
    const ac = this.context, source = ac.createBufferSource(), gain = ac.createGain(), kind = cueKind(request);
    fades ??= fadePlan(this.recording?.kind ?? this.classic?.kind ?? null,kind,rotating);
    source.buffer = buffer; source.loop = true; source.loopEnd = buffer.jyLoopEnd || buffer.duration || 0;
    source.connect(gain).connect(this.musicBus);
    this.stopMusic(fades.out);
    const at = ac.currentTime, duration = buffer.jyLoopEnd || buffer.duration || 0, from = duration ? offset%duration : 0;
    gain.gain.setValueAtTime(0,at);
    gain.gain.linearRampToValueAtTime(1,at+fades.in);
    this.recording = {source,gain,key,kind,request,startedAt:at,offset:from,played,duration};
    if (this.cue?.request === request) this.cue.key = key;
    this.active.add(source); this.musicVoices.add(source);
    source.onended = () => {
      this.active.delete(source); this.musicVoices.delete(source);
      this.retiring?.delete(source);
      source.disconnect(); gain.disconnect();
    };
    if (from) source.start(0,from); else source.start();
    this.remember(); this.scheduleRotation(); this.changed("recorded");
  }
  startClassic(key, status = "classic", {fades, request = key, rotating = false} = {}) {
    const ac = this.context, kind = cueKind(request), score = this.scores[key], bus = ac.createGain();
    fades ??= fadePlan(this.recording?.kind ?? this.classic?.kind ?? null,kind,rotating);
    this.stopMusic(fades.out);
    // One bus per synthesized score, so it can fade like a recording does.
    bus.connect(this.musicBus);
    bus.gain.setValueAtTime(0,ac.currentTime);
    bus.gain.linearRampToValueAtTime(CLASSIC_GAIN,ac.currentTime+Math.min(0.9,fades.in));
    this.classic = {key,kind,request,bus,loops:0};
    if (this.cue?.request === request) this.cue.key = key;
    this.remember();
    this.pointer = 0; this.loopAt = this.context.currentTime + 0.08;
    const loop = classicLoop(key,score);
    const schedule = () => {
      if (this.hidden || !this.enabled) return;
      const now = this.context.currentTime;
      // The next pass is queued inside the look-ahead, one musical loop after this
      // one; only a timer that fell behind re-anchors to now.
      if (this.pointer >= score.notes.length && this.loopAt + loop < now + 0.8) {
        this.loopAt = this.loopAt + loop >= now ? this.loopAt + loop : now + 0.05; this.pointer = 0;
        const members = this.cue?.request === request ? this.cue.members : null;
        if (members?.length > 1 && !this.classic.turning && ++this.classic.loops*loop >= dwellSeconds(loop)) {
          // Same request, next member, asked once. A "fallback" synth retries the recording.
          this.classic.turning = true;
          this.play(nextMember(members,key),this.generation,{request,rotating:true}); return;
        }
      }
      while (this.pointer < score.notes.length && this.loopAt + score.notes[this.pointer][0] < now + 0.8) {
        const [t,pitch,length,velocity,program] = score.notes[this.pointer++];
        if (this.loopAt+t >= now-0.05) this.note(pitch,this.loopAt+t,length,velocity,program,"music");
      }
    };
    schedule(); this.timer = setInterval(schedule,150); this.changed(status);
  }
  note(pitch, at, length, velocity, program, bus = "effects", scale = 0.021) {
    const ac = this.context;
    // Separate voice caps: dense scores (game11/18) need ~75 synth voices at once.
    if (!ac || !this.enabled || this.hidden ||
      (bus === "music" ? this.musicVoices.size > 96 : this.active.size - this.musicVoices.size > 64)) return;
    this.routing();
    const o = ac.createOscillator(), v = ac.createGain(), filter = ac.createBiquadFilter(), pluck = program < 32 || program >= 104;
    at = Math.max(at,ac.currentTime);
    o.type = pluck ? "triangle" : "sine";
    o.frequency.value = 440*2**((pitch-69)/12);
    filter.type = "lowpass"; filter.frequency.value = pluck ? 2500 : 1600;
    const volume = (velocity/127)*scale;
    v.gain.setValueAtTime(0.0001,at);
    v.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),at+(pluck?0.009:0.07));
    v.gain.exponentialRampToValueAtTime(0.0001,at+Math.max(0.14,length+(pluck?0.28:0.12)));
    o.connect(filter).connect(v).connect(bus === "music" ? this.classic?.bus ?? this.musicBus : this.effectsBus);
    o.start(at); o.stop(at+Math.max(0.18,length+0.4));
    this.active.add(o); if (bus === "music") this.musicVoices.add(o);
    o.onended = () => { this.active.delete(o); this.musicVoices.delete(o); this.retiring?.delete(o); o.disconnect(); v.disconnect(); filter.disconnect(); };
  }
  effect(file, profile) {
    if (!this.enabled || this.hidden) return;
    this.routing();
    if (profile === "five-wheels") {
      const ac = this.context,
        at = ac.currentTime,
        cast = file.includes("atk");
      this.lastEffect = { file, profile: cast ? "wheel-cast" : "wheel-clang", at };
      // Several quiet, inharmonic metal contacts suggest the rim and inner
      // rattle. The source still determines when each sound is triggered.
      for (let strike = 0; strike < (cast ? 3 : 2); strike++) {
        for (const [partial, ratio] of [1, 1.53, 2.41].entries()) {
          const o = ac.createOscillator(),
            volume = ac.createGain();
          const start = at + strike * (cast ? 0.045 : 0.028),
            duration = cast ? 0.19 : 0.29;
          o.type = "sine";
          o.frequency.value = (cast ? 640 : 460) * ratio * (1 + strike * 0.04);
          volume.gain.setValueAtTime(0.0001, start);
          volume.gain.exponentialRampToValueAtTime(
            0.035 / (partial + 1) / (strike + 1),
            start + 0.003,
          );
          volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          o.connect(volume).connect(this.effectsBus);
          this.active.add(o);
          o.onended = () => this.active.delete(o);
          o.start(start);
          o.stop(start + duration);
        }
      }
      return;
    }
    if (profile === "heavy-sword") {
      const swing = file.includes("atk"),
        ac = this.context,
        at = ac.currentTime;
      this.lastEffect = { file, profile: swing ? "heavy-wind" : "heavy-impact", at };
      const duration = swing ? 0.24 : 0.32;
      const buffer = ac.createBuffer(1, Math.ceil(duration * ac.sampleRate), ac.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const air = ac.createBufferSource(),
        filter = ac.createBiquadFilter(),
        gain = ac.createGain();
      air.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = swing ? 620 : 380;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(swing ? 0.075 : 0.045, at + (swing ? 0.065 : 0.012));
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      air.connect(filter).connect(gain).connect(this.effectsBus);
      this.active.add(air);
      air.onended = () => this.active.delete(air);
      air.start(at);
      air.stop(at + duration);
      if (!swing) {
        const body = ac.createOscillator(),
          volume = ac.createGain();
        body.type = "sine";
        body.frequency.setValueAtTime(126, at);
        body.frequency.exponentialRampToValueAtTime(66, at + 0.24);
        volume.gain.setValueAtTime(0.0001, at);
        volume.gain.exponentialRampToValueAtTime(0.075, at + 0.008);
        volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.29);
        body.connect(volume).connect(this.effectsBus);
        this.active.add(body);
        body.onended = () => this.active.delete(body);
        body.start(at);
        body.stop(at + duration);
      }
      return;
    }
    this.lastEffect = { file, profile: "source", at: this.context.currentTime };
    // Same peak level (~-27 dBFS) as the five-wheels / heavy-sword effects, audible over the score.
    this.note(file.includes("atk") ? 47 : 77, this.context.currentTime, 0.12, 75, 24, "effects", 0.09);
  }
}
