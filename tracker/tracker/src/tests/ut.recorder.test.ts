// @ts-nocheck

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import mockApp from '../main/app/index'
import Recorder, { Quality } from '../main/modules/userTesting/recorder' // Adjust the import path

global.MediaRecorder = jest.fn()
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(),
}
global.fetch = jest.fn()

jest.mock('../main/app/index')

describe('Recorder', () => {
  let recorder
  let mockAppInstance
  let mockMediaStream
  let mockMediaRecorder

  beforeEach(() => {
    // Setup
    mockMediaStream = {
      getTracks: jest.fn().mockReturnValue([{}]),
    }
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      onstop: null,
      ondataavailable: null,
    }
    global.navigator.mediaDevices.getUserMedia.mockResolvedValue(mockMediaStream)
    global.MediaRecorder.mockImplementation(() => mockMediaRecorder)

    mockAppInstance = {
      timestamp: () => 123456,
    } as unknown as mockApp
    recorder = new Recorder(mockAppInstance)
  })

  test('should start recording', async () => {
    await recorder.startRecording(30, Quality.Standard)
    expect(mockMediaRecorder.start).toHaveBeenCalled()
  })

  test('should stop recording and return blob', async () => {
    await recorder.startRecording(30, Quality.Standard)
    mockMediaRecorder.onstop = jest.fn()

    const promise = recorder.stopRecording()
    const blob = new Blob([], { type: 'video/webm' })

    mockMediaRecorder.onstop()
    mockMediaRecorder.ondataavailable({ data: blob })

    await expect(promise).resolves.toEqual(blob)
  })
})
