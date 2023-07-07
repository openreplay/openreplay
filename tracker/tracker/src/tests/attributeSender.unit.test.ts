import { Type } from '../common/messages.gen.js'
import AttributeSender from '../main/modules/attributeSender.js'
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals'

describe('AttributeSender', () => {
  let attributeSender: AttributeSender
  let appMock: any

  beforeEach(() => {
    appMock = {
      send: (...args: any[]) => args,
    }
    attributeSender = new AttributeSender(appMock, false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should send the set attribute message to the app', () => {
    const sendSpy = jest.spyOn(appMock, 'send')
    const id = 1
    const name = 'color'
    const value = 'red'
    // @ts-ignore
    const expectedMessage = [Type.SetNodeAttributeDict, id, 1, 2]

    attributeSender.sendSetAttribute(id, name, value)

    expect(sendSpy).toHaveBeenCalledWith(expectedMessage)
  })

  test('should apply dictionary to the attribute name and value', () => {
    const id = 1
    const name = 'color'
    const value = 'red'
    const sendSpy = jest.spyOn(appMock, 'send')

    attributeSender.sendSetAttribute(id, name, value)

    expect(sendSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        // @ts-ignore
        Type.SetNodeAttributeDict,
        id,
        expect.any(Number),
        expect.any(Number),
      ]),
    )
  })

  test('should send the string dictionary entry if the attribute is new', () => {
    const id = 1
    const name = 'color'
    const value = 'red'
    const sendSpy = jest.spyOn(appMock, 'send')

    attributeSender.sendSetAttribute(id, name, value)

    // @ts-ignore
    expect(sendSpy).toHaveBeenCalledWith([Type.StringDict, expect.any(Number), name])
  })

  test('should not send the string dictionary entry if the attribute already exists', () => {
    const id = 1
    const name = 'color'
    const value = 'red'
    const sendSpy = jest.spyOn(appMock, 'send')

    attributeSender.sendSetAttribute(id, name, value)
    attributeSender.sendSetAttribute(id, name, value)

    // 2 attributes + 1 stringDict name + 1 stringDict value
    expect(sendSpy).toHaveBeenCalledTimes(4)
    expect(sendSpy).toHaveBeenCalledWith(
      // @ts-ignore
      expect.not.arrayContaining([Type.StringDict, expect.any(Number), name]),
    )
  })

  test('should clear the dictionary', () => {
    const id = 1
    const name = 'color'
    const value = 'red'
    const sendSpy = jest.spyOn(appMock, 'send')

    attributeSender.sendSetAttribute(id, name, value)
    attributeSender.clear()
    attributeSender.sendSetAttribute(id, name, value)

    // (attribute + stringDict name + stringDict value) * 2 = 6
    expect(sendSpy).toHaveBeenCalledTimes(6)
    expect(sendSpy).toHaveBeenCalledWith(
      // @ts-ignore
      expect.arrayContaining([Type.StringDict, expect.any(Number), name]),
    )
  })
})
