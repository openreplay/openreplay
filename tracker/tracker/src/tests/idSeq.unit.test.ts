import { describe, expect, test } from '@jest/globals'
import { pack, unpack, MASK_NODE, MASK_ORDER, MASK_LEVEL } from '../main/app/nodes/idSeq.js'

describe('idSeq', () => {
  test('round-trips the largest values using all 32 bits', () => {
    const id = pack(MASK_LEVEL, MASK_ORDER, MASK_NODE)
    expect(id).toBe(2 ** 32 - 1)
    expect(unpack(id)).toEqual({ level: MASK_LEVEL, order: MASK_ORDER, nodeId: MASK_NODE })
  })

  test('round-trips arbitrary values', () => {
    expect(unpack(pack(2, 5, 12345))).toEqual({ level: 2, order: 5, nodeId: 12345 })
    expect(pack(0, 0, 42)).toBe(42)
  })

  test('frame blocks do not overlap', () => {
    expect(pack(1, 1, MASK_NODE) + 1).toBe(pack(1, 2, 0))
    expect(pack(1, MASK_ORDER, MASK_NODE) + 1).toBe(pack(2, 0, 0))
    // top context ids (level 0, order 0) would need 2^30 nodes to reach level 1
    expect(pack(1, 1, 0)).toBeGreaterThan(2 ** 30)
  })

  test('throws RangeError on out-of-range components', () => {
    expect(() => pack(MASK_LEVEL + 1, 0, 0)).toThrow(RangeError)
    expect(() => pack(-1, 0, 0)).toThrow(/nesting level overflow/)
    expect(() => pack(0, MASK_ORDER + 1, 0)).toThrow(/frame order overflow/)
    expect(() => pack(0, -1, 0)).toThrow(RangeError)
    expect(() => pack(0, 0, MASK_NODE + 1)).toThrow(/nodeId overflow/)
    expect(() => pack(0, 0, -1)).toThrow(RangeError)
  })
})
