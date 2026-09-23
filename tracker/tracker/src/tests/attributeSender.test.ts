import { Type } from '../common/messages.gen.js'
import AttributeSender from '../main/modules/attributeSender.js'
import { describe, expect, test, jest, beforeEach } from '@jest/globals'

describe('AttributeSender', () => {
  let appMock: { send: jest.Mock }

  const make = (isDictDisabled = false) =>
    new AttributeSender({ app: appMock as any, isDictDisabled })

  const dictEntries = () =>
    appMock.send.mock.calls
      .map((c) => c[0] as any[])
      .filter((m) => m[0] === Type.StringDictGlobal)

  beforeEach(() => {
    appMock = { send: jest.fn() }
  })

  test('sends dict entries first, then the attribute referencing their keys', () => {
    make().sendSetAttribute(1, 'color', 'red')

    const calls = appMock.send.mock.calls.map((c) => c[0] as any[])
    expect(calls).toHaveLength(3)
    const [nameEntry, valueEntry, attr] = calls
    expect(nameEntry).toEqual([Type.StringDictGlobal, expect.any(Number), 'color'])
    expect(valueEntry).toEqual([Type.StringDictGlobal, expect.any(Number), 'red'])
    expect(attr).toEqual([Type.SetNodeAttributeDictGlobal, 1, nameEntry[1], valueEntry[1]])
    expect(nameEntry[1]).not.toBe(valueEntry[1])
  })

  test('does not resend dict entries for known strings', () => {
    const sender = make()
    sender.sendSetAttribute(1, 'color', 'red')
    sender.sendSetAttribute(2, 'color', 'red')

    // 2 attributes + 1 stringDict name + 1 stringDict value
    expect(appMock.send).toHaveBeenCalledTimes(4)
    expect(dictEntries()).toHaveLength(2)
    const first = appMock.send.mock.calls[2][0] as any[]
    const second = appMock.send.mock.calls[3][0] as any[]
    expect(second).toEqual([Type.SetNodeAttributeDictGlobal, 2, first[2], first[3]])
  })

  test('same string as name and value is sent once', () => {
    make().sendSetAttribute(1, 'x', 'x')
    expect(dictEntries()).toHaveLength(1)
    const attr = appMock.send.mock.calls[1][0] as any[]
    expect(attr[2]).toBe(attr[3])
  })

  test('clear() resends dictionary entries under fresh keys', () => {
    const sender = make()
    sender.sendSetAttribute(1, 'color', 'red')
    sender.clear()
    sender.sendSetAttribute(1, 'color', 'red')

    // (attribute + stringDict name + stringDict value) * 2 = 6
    expect(appMock.send).toHaveBeenCalledTimes(6)
    const entries = dictEntries()
    expect(entries.map((e) => e[2])).toEqual(['color', 'red', 'color', 'red'])
    expect(new Set(entries.map((e) => e[1])).size).toBe(4)
  })

  test('isDictDisabled sends plain SetNodeAttribute without dictionary', () => {
    make(true).sendSetAttribute(3, 'color', 'red')

    expect(appMock.send).toHaveBeenCalledTimes(1)
    expect(appMock.send).toHaveBeenCalledWith([Type.SetNodeAttribute, 3, 'color', 'red'])
  })
})
