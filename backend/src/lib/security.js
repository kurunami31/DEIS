// In-memory failed-attempt tracker for login lockout. One instance per
// process is fine for a single-node deployment; a Redis store would be the
// production swap-in for multi-node scale.
const FAIL_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map();

function keyOf(identifier, ip) {
  return `${ip}|${identifier.toLowerCase()}`;
}

export function recordFailedAttempt(identifier, ip) {
  const key = keyOf(identifier, ip);
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= FAIL_LIMIT) {
    entry.lockedUntil = Date.now() + LOCK_MS;
  }
  attempts.set(key, entry);
  return { remaining: Math.max(0, FAIL_LIMIT - entry.count), lockedUntil: entry.lockedUntil };
}

export function clearFailedAttempts(identifier, ip) {
  attempts.delete(keyOf(identifier, ip));
}

export function isLocked(identifier, ip) {
  const entry = attempts.get(keyOf(identifier, ip));
  if (!entry || entry.lockedUntil <= 0) return false;
  if (Date.now() < entry.lockedUntil) return true;
  attempts.delete(keyOf(identifier, ip));
  return false;
}

export function remainingLockSeconds(identifier, ip) {
  const entry = attempts.get(keyOf(identifier, ip));
  if (!entry) return 0;
  return Math.max(0, Math.floor((entry.lockedUntil - Date.now()) / 1000));
}

// Prevent the laziest, most common credentials from ever being set.
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', '123456789', '1234567890', 'qwerty123',
  'qwertyuiop', 'iloveyou', 'letmein', 'admin123', 'welcome123', 'monkey123',
  'dragon123', 'football', 'baseball', 'trustno1', 'abc12345', '11111111',
  '00000000', 'dorsu2025', 'students2025', 'changeme123',
]);

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}