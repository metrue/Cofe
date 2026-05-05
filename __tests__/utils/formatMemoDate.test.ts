import { formatMemoDate, MEMO_UNKNOWN_DATE_SENTINEL } from '@/lib/utils'

describe('formatMemoDate', () => {
  it('returns "date unknown" for the sentinel timestamp', () => {
    expect(formatMemoDate(`${MEMO_UNKNOWN_DATE_SENTINEL}.000Z`)).toBe('date unknown')
  })

  it('returns "date unknown" for staggered orphan timestamps', () => {
    // The DailyMemo importer staggers orphans by 1 ms — they all share the
    // sentinel prefix so the badge applies to every one of them.
    expect(formatMemoDate('2000-01-01T00:00:00.001Z')).toBe('date unknown')
    expect(formatMemoDate('2000-01-01T00:00:00.999Z')).toBe('date unknown')
  })

  it('formats real ISO timestamps as DD/MM/YYYY', () => {
    // Pick a UTC timestamp deep in the day so the local date is stable
    // across reasonable timezones.
    expect(formatMemoDate('2024-03-07T12:00:00.000Z')).toBe('07/03/2024')
  })

  it('returns "invalid date" for unparseable input', () => {
    expect(formatMemoDate('not-a-date')).toBe('invalid date')
  })

  it('does not match dates that merely contain "2000-01-01"', () => {
    // Sentinel is a prefix, not a substring — a real 2000-01-02 should still
    // render normally.
    expect(formatMemoDate('2000-01-02T00:00:00.000Z')).not.toBe('date unknown')
  })
})
