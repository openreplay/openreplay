// 4 levels, 128 frames between each level, 8_388_608 nodes per page
// lets hope no one will need more :D
export const BITS_LEVEL = 2 // 4
export const BITS_ORDER = 7 // 128
export const BITS_NODE  = 22 // 8_388_608

export const SHIFT_ORDER = BITS_NODE
export const SHIFT_LEVEL = BITS_NODE + BITS_ORDER

export const MASK_NODE  = (1 << BITS_NODE)  - 1
export const MASK_ORDER = (1 << BITS_ORDER) - 1
export const MASK_LEVEL = (1 << BITS_LEVEL) - 1

export function pack(level: number, order: number, nodeId: number): number {
  if (level < 0 || level > MASK_LEVEL) throw new RangeError('OR: nesting level overflow, max 4')
  if (order < 0 || order > MASK_ORDER) throw new RangeError('OR: frame order overflow, max 128')
  if (nodeId < 0 || nodeId > MASK_NODE) throw new RangeError('OR: nodeId overflow, max 8_388_608')

  const v =
    ((level & MASK_LEVEL) << SHIFT_LEVEL) |
    ((order & MASK_ORDER) << SHIFT_ORDER) |
    (nodeId & MASK_NODE)
  return v >>> 0
}

export function unpack(id: number) {
  id = id >>> 0
  const level  = (id >>> SHIFT_LEVEL) & MASK_LEVEL
  const order  = (id >>> SHIFT_ORDER) & MASK_ORDER
  const nodeId = id & MASK_NODE
  return { level, order, nodeId }
}
