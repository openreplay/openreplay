import connection from '../main/modules/connection'
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

describe('Connection module', () => {
  const appMock = {
    send: jest.fn(),
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send connection information', () => {
    const connectionInfo = {
      downlink: 1,
      type: 'wifi',
      addEventListener: jest.fn(),
    }
    Object.assign(navigator, { connection: connectionInfo })
    // @ts-ignore
    connection(appMock)
    expect(appMock.send).toHaveBeenCalledWith([54, 1000, 'wifi'])
  })

  it('should send unknown connection type', () => {
    const connectionInfo = {
      downlink: 1,
      addEventListener: jest.fn(),
    }
    Object.assign(navigator, { connection: connectionInfo })
    // @ts-ignore
    connection(appMock)
    expect(appMock.send).toHaveBeenCalledWith([54, 1000, 'unknown'])
  })

  it('should not send connection information if connection is undefined', () => {
    Object.assign(navigator, { connection: undefined })
    // @ts-ignore
    connection(appMock)
    expect(appMock.send).not.toHaveBeenCalled()
  })
})
