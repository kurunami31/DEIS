// Schedule parsing for conflict detection. Handles the campus format used by
// the seed and section creation, e.g. "MW 07:00-10:00", "TTh 13:00-16:00",
// "WF 08:00-11:00", "FS 09:00-12:00" (day pairs + HH:MM-HH:MM).
//
// Unparseable strings (e.g. "TBA") are treated conservatively: only identical
// strings are flagged, so we never fabricate a conflict from unknown data.

const DAY_LETTERS = new Set(['M', 'T', 'W', 'F', 'S']);

/**
 * Parses a schedule string into day letters and start/end minutes of day.
 * Returns null when the format is not recognized.
 */
export function parseSchedule(schedule) {
  const match = /^([A-Za-z]+)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(String(schedule ?? '').trim());
  if (!match) return null;

  const days = [];
  const tokens = match[1].toUpperCase();
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === 'T' && tokens[i + 1] === 'H') {
      days.push('Th');
      i += 1;
    } else {
      days.push(tokens[i]);
    }
  }
  if (days.some((d) => !DAY_LETTERS.has(d) && d !== 'Th')) return null;

  const start = Number(match[2]) * 60 + Number(match[3]);
  const end = Number(match[4]) * 60 + Number(match[5]);
  if (end <= start) return null;

  return { days, start, end };
}

/** True when two schedule strings occupy overlapping time on a shared day. */
export function schedulesConflict(a, b) {
  if (a === b) return true;
  const pa = parseSchedule(a);
  const pb = parseSchedule(b);
  if (!pa || !pb) return false;
  const sharedDay = pa.days.some((day) => pb.days.includes(day));
  if (!sharedDay) return false;
  return pa.start < pb.end && pb.start < pa.end;
}
