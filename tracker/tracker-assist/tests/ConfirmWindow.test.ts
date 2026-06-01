import ConfirmWindow from '../src/ConfirmWindow/ConfirmWindow'
import { describe, expect, test, beforeEach, afterEach, } from '@jest/globals'

const baseOptions = {
  text: 'Are you sure?',
  confirmBtn: 'Yes',
  declineBtn: 'No',
}

describe('ConfirmWindow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('mount appends a wrapper to document body', () => {
    const cw = new ConfirmWindow(baseOptions)
    cw.mount()
    expect(document.getElementById('openreplay-confirm-window-wrapper')).not.toBeNull()
    expect(document.getElementById('openreplay-confirm-window-confirm-btn')).not.toBeNull()
    expect(document.getElementById('openreplay-confirm-window-decline-btn')).not.toBeNull()
  })

  test('renders the supplied text', () => {
    const cw = new ConfirmWindow({ ...baseOptions, text: 'Custom prompt', })
    cw.mount()
    const p = document.getElementById('openreplay-confirm-window-p')
    expect(p?.innerText).toBe('Custom prompt')
  })

  test('confirm button resolves the promise with true', async () => {
    const cw = new ConfirmWindow(baseOptions)
    const answer = cw.mount()
    document.getElementById('openreplay-confirm-window-confirm-btn')?.click()
    await expect(answer).resolves.toBe(true)
  })

  test('decline button resolves the promise with false', async () => {
    const cw = new ConfirmWindow(baseOptions)
    const answer = cw.mount()
    document.getElementById('openreplay-confirm-window-decline-btn')?.click()
    await expect(answer).resolves.toBe(false)
  })

  test('remove rejects the pending promise and detaches the wrapper', async () => {
    const cw = new ConfirmWindow(baseOptions)
    const answer = cw.mount()
    expect(document.getElementById('openreplay-confirm-window-wrapper')).not.toBeNull()
    cw.remove()
    await expect(answer).rejects.toBe('no answer')
    expect(document.getElementById('openreplay-confirm-window-wrapper')).toBeNull()
  })

  test('button text comes from the string options form', () => {
    const cw = new ConfirmWindow({ ...baseOptions, confirmBtn: 'Allow', declineBtn: 'Block', })
    cw.mount()
    expect(document.getElementById('openreplay-confirm-window-confirm-btn')?.textContent).toBe('Allow')
    expect(document.getElementById('openreplay-confirm-window-decline-btn')?.textContent).toBe('Block')
  })

  test('button text comes from the object options form and applies style', () => {
    const cw = new ConfirmWindow({
      ...baseOptions,
      confirmBtn: { innerHTML: 'OK', style: { backgroundColor: 'rgb(1, 2, 3)', }, },
      declineBtn: { innerHTML: 'Cancel', },
    })
    cw.mount()
    const confirmBtn = document.getElementById('openreplay-confirm-window-confirm-btn') as HTMLButtonElement
    expect(confirmBtn?.textContent).toBe('OK')
    expect(confirmBtn?.style.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(document.getElementById('openreplay-confirm-window-decline-btn')?.textContent).toBe('Cancel')
  })
})
