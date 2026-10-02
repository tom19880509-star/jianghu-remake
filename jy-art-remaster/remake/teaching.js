// Story teaching belongs to this save, never to the cross-cycle profile.
// A remembered grant is not a learned art, paid investment or item reward.
import { MAX_MARTIAL_SKILL_ID } from './martial-identities.js';
export function normalizeTeaching(raw) {
  if (raw == null) return undefined;
  if (raw.version !== 1 || !raw.grants || typeof raw.grants !== 'object' || Array.isArray(raw.grants)) throw Error('传功记录不完整。');
  const grants = {};
  for (const [key, value] of Object.entries(raw.grants)) {
    const match = /^(0|[1-9]\d*):([1-9]\d*)$/.exec(key);
    if (!match || Number(match[1]) >= 320 || Number(match[2]) > MAX_MARTIAL_SKILL_ID || !value || typeof value.received !== 'boolean') throw Error('传功记录中的人物或武学不正确。');
    grants[key] = { received: value.received };
  }
  return { version: 1, grants };
}
