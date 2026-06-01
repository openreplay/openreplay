import {
  callConfirmDefault,
  controlConfirmDefault,
  recordRequestDefault,
} from '../src/ConfirmWindow/defaults'
import { describe, expect, test, } from '@jest/globals'

describe('ConfirmWindow defaults', () => {
  test('callConfirmDefault accepts a plain string as the prompt text', () => {
    const out = callConfirmDefault('Pick up?')
    expect(out.text).toBe('Pick up?')
    expect(out.confirmBtn).toBe('Answer')
    expect(out.declineBtn).toBe('Reject')
  })

  test('callConfirmDefault falls back to its default text when given an empty options object', () => {
    const out = callConfirmDefault({})
    expect(out.text).toBe('You have an incoming call. Do you want to answer?')
    expect(out.confirmBtn).toBe('Answer')
    expect(out.declineBtn).toBe('Reject')
  })

  test('callConfirmDefault overrides text and buttons when passed an object', () => {
    const out = callConfirmDefault({
      text: 'Hi',
      confirmBtn: 'Yes',
      declineBtn: 'No',
    })
    expect(out.text).toBe('Hi')
    expect(out.confirmBtn).toBe('Yes')
    expect(out.declineBtn).toBe('No')
  })

  test('controlConfirmDefault uses its remote-control specific defaults', () => {
    const out = controlConfirmDefault({})
    expect(out.text).toBe('Agent requested remote control. Allow?')
    expect(out.confirmBtn).toBe('Grant Remote Control')
    expect(out.declineBtn).toBe('Reject')
  })

  test('recordRequestDefault uses its recording specific defaults', () => {
    const out = recordRequestDefault({})
    expect(out.text).toBe('Agent requested to record activity in this browser tab.')
    expect(out.confirmBtn).toBe('Allow Recording')
    expect(out.declineBtn).toBe('Reject')
  })

  test('partial options override only the provided fields', () => {
    const out = controlConfirmDefault({ text: 'Custom only', })
    expect(out.text).toBe('Custom only')
    expect(out.confirmBtn).toBe('Grant Remote Control')
    expect(out.declineBtn).toBe('Reject')
  })
})
