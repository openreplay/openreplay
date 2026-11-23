import { describe, expect, test, jest } from '@jest/globals'
import IFrameOffsets from '../main/app/observer/iframe_offsets.js'

describe('IFrameOffsets', () => {
  test('offset is cached until the parent document scrolls or its window resizes', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    let left = 10
    iframe.getBoundingClientRect = () => ({ left, top: 5 }) as DOMRect
    const offsets = new IFrameOffsets()
    offsets.observe(iframe)
    const doc = iframe.contentDocument!

    expect(offsets.getDocumentOffset(doc)).toEqual([10, 5])
    left = 20
    expect(offsets.getDocumentOffset(doc)).toEqual([10, 5])
    document.dispatchEvent(new Event('scroll'))
    expect(offsets.getDocumentOffset(doc)).toEqual([20, 5])
    left = 30
    window.dispatchEvent(new Event('resize'))
    expect(offsets.getDocumentOffset(doc)).toEqual([30, 5])

    const removeDoc = jest.spyOn(document, 'removeEventListener')
    const removeWin = jest.spyOn(window, 'removeEventListener')
    offsets.clear()
    expect(removeDoc).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeWin).toHaveBeenCalledWith('resize', expect.any(Function))
    removeDoc.mockRestore()
    removeWin.mockRestore()
    iframe.remove()
  })
})
