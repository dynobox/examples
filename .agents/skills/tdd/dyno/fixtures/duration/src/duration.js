const MINUTES_PER_UNIT = { h: 60, m: 1 };

/**
 * Parses a duration like "2h", "45m" or "1h30m" into minutes.
 */
export function parseDuration(input) {
  const match = /(\d+)([hm])/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${input}`);
  }
  return Number(match[1]) * MINUTES_PER_UNIT[match[2]];
}
