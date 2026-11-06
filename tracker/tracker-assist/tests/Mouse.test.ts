import Mouse from '../src/Mouse'
import { describe, expect, test, jest, afterEach } from '@jest/globals'

// jsdom has no layout: hit-testing and scroll geometry are stubbed
describe('Mouse inside shadow DOM', () => {
  const hit = (el: Element) => ((document as any).elementFromPoint = () => el)
  afterEach(() => {
    jest.restoreAllMocks()
    delete (document as any).elementFromPoint
    document.body.innerHTML = ''
  })

  test('click goes to the innermost element of open shadow roots, as a composed event', () => {
    const host = document.createElement('x-datetime')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const day = document.createElement('button')
    root.append(day)
    hit(host)
    ;(root as any).elementFromPoint = () => day
    const onDay = jest.fn()
    const onHost = jest.fn()
    day.addEventListener('click', onDay)
    host.addEventListener('click', onHost)

    const mouse = new Mouse('agent')
    expect(mouse.click([10, 10])).toBe(day)
    expect(onDay).toHaveBeenCalledTimes(1)
    expect(onHost).toHaveBeenCalledTimes(1)
  })

  test('scroll finds the scroll container inside the shadow root a node is slotted into', () => {
    const host = document.createElement('x-content')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const scroller = document.createElement('main')
    scroller.style.overflow = 'auto'
    scroller.append(document.createElement('slot'))
    root.append(scroller)
    const item = document.createElement('p')
    host.append(item)
    let top = 0
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000 })
    Object.defineProperty(scroller, 'clientHeight', { value: 100 })
    Object.defineProperty(scroller, 'scrollTop', { get: () => top, set: (v) => (top = v) })
    hit(item)
    const windowScroll = jest.spyOn(window, 'scroll').mockImplementation(() => {})

    const mouse = new Mouse('agent')
    mouse.move([10, 10])
    mouse.scroll([0, 120])
    expect(top).toBe(120)
    expect(windowScroll).not.toHaveBeenCalled()
  })
})
