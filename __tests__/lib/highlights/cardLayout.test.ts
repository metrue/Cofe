/**
 * @jest-environment node
 */

import { solveCardLayout, CardSpec } from '@/lib/highlights/cardLayout'

describe('solveCardLayout', () => {
  it('keeps non-overlapping cards at their desired tops', () => {
    const specs: CardSpec[] = [
      { id: 'a', desiredTop: 0, height: 50 },
      { id: 'b', desiredTop: 100, height: 50 },
      { id: 'c', desiredTop: 200, height: 50 },
    ]
    const tops = solveCardLayout(specs)
    expect(tops.get('a')).toBe(0)
    expect(tops.get('b')).toBe(100)
    expect(tops.get('c')).toBe(200)
  })

  it('pushes overlapping cards down by stacking with gap', () => {
    const specs: CardSpec[] = [
      { id: 'a', desiredTop: 0, height: 100 },
      { id: 'b', desiredTop: 50, height: 50 }, // wants 50, but a goes to 100
    ]
    const tops = solveCardLayout(specs, 8)
    expect(tops.get('a')).toBe(0)
    expect(tops.get('b')).toBe(108) // a.bottom (100) + gap (8)
  })

  it('preserves order by desiredTop even when input is unsorted', () => {
    const specs: CardSpec[] = [
      { id: 'c', desiredTop: 200, height: 50 },
      { id: 'a', desiredTop: 0, height: 50 },
      { id: 'b', desiredTop: 100, height: 50 },
    ]
    const tops = solveCardLayout(specs)
    expect(tops.get('a')).toBe(0)
    expect(tops.get('b')).toBe(100)
    expect(tops.get('c')).toBe(200)
  })

  it('handles a single card', () => {
    const tops = solveCardLayout([{ id: 'a', desiredTop: 75, height: 100 }])
    expect(tops.get('a')).toBe(75)
  })

  it('handles empty input', () => {
    const tops = solveCardLayout([])
    expect(tops.size).toBe(0)
  })

  it('cascades multiple stacked cards through a tight cluster', () => {
    const specs: CardSpec[] = [
      { id: 'a', desiredTop: 0, height: 100 },
      { id: 'b', desiredTop: 10, height: 50 },
      { id: 'c', desiredTop: 20, height: 50 },
    ]
    const tops = solveCardLayout(specs, 4)
    expect(tops.get('a')).toBe(0)
    expect(tops.get('b')).toBe(104) // a.bottom + 4
    expect(tops.get('c')).toBe(158) // b.bottom + 4
  })
})
