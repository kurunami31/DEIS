import { describe, expect, it } from 'vitest';
import { parseSchedule, schedulesConflict } from '../src/lib/schedule.js';

describe('schedule conflict detection', () => {
  it('parses day pairs and time ranges', () => {
    expect(parseSchedule('TTh 07:00-10:00')).toEqual({ days: ['T', 'Th'], start: 420, end: 600 });
    expect(parseSchedule('MW 07:00-10:00')).toEqual({ days: ['M', 'W'], start: 420, end: 600 });
    expect(parseSchedule('FS 09:00-12:00')).toEqual({ days: ['F', 'S'], start: 540, end: 720 });
  });

  it('returns null for unrecognized formats', () => {
    expect(parseSchedule('TBA')).toBeNull();
    expect(parseSchedule('MW 10:00-09:00')).toBeNull();
    expect(parseSchedule('')).toBeNull();
  });

  it('flags overlapping blocks on the same day', () => {
    expect(schedulesConflict('MW 07:00-10:00', 'MW 08:00-11:00')).toBe(true);
    expect(schedulesConflict('MW 07:00-10:00', 'M 09:00-12:00')).toBe(true);
  });

  it('allows adjacent blocks', () => {
    expect(schedulesConflict('MW 07:00-10:00', 'MW 10:00-12:00')).toBe(false);
  });

  it('allows the same times on different days', () => {
    expect(schedulesConflict('MW 07:00-10:00', 'TTh 07:00-10:00')).toBe(false);
  });

  it('treats identical strings as a conflict', () => {
    expect(schedulesConflict('MW 07:00-10:00', 'MW 07:00-10:00')).toBe(true);
  });

  it('does not fabricate conflicts from unparseable schedules', () => {
    expect(schedulesConflict('TBA', 'MW 07:00-10:00')).toBe(false);
  });
});
