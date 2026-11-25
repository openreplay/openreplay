import { describe, expect, test, jest, afterEach, } from '@jest/globals'
import CallWindow from '../src/CallWindow'

const fakeStream = (track: { enabled: boolean }) => ({
  stream: { getAudioTracks: () => [track,], },
  toggleAudio: () => (track.enabled = !track.enabled),
}) as any

describe('CallWindow mute', () => {
  afterEach(() => {
    delete (globalThis as any).fetch
    document.body.innerHTML = ''
  })

  test('a stream added while muted starts muted', () => {
    ;(globalThis as any).fetch = jest.fn(() => new Promise(() => {}))
    const callUI = new CallWindow(jest.fn())
    const first = { enabled: true, }
    callUI.setLocalStreams([fakeStream(first),])
    ;(callUI as any).toggleAudio()
    expect(first.enabled).toBe(false)

    const joined = { enabled: true, }
    callUI.setLocalStreams([fakeStream(first), fakeStream(joined),])
    expect(joined.enabled).toBe(false)
  })
})
