import { declineCall, acceptCall, cross, remoteControl, } from '../icons.js'
import type { ButtonOptions, ConfirmWindowOptions, } from './ConfirmWindow.js'


const TEXT_GRANT_REMORTE_ACCESS = 'Grant Remote Control'
const TEXT_REJECT = 'Reject'
const TEXT_ANSWER_CALL = `${acceptCall} &#xa0 Answer`

export type Options = string | Partial<ConfirmWindowOptions>;

function confirmDefault(
  opts: Options,
  confirmBtn: ButtonOptions,
  declineBtn: ButtonOptions,
  text: string
): ConfirmWindowOptions {
  const isStr = typeof opts === 'string'
  return Object.assign(
    {
      text: isStr ? opts : text,
      confirmBtn,
      declineBtn,
    },
    isStr ? undefined : opts
  )
}

export const callConfirmDefault = (opts: Options) =>
  confirmDefault(
    opts,
    TEXT_ANSWER_CALL,
    TEXT_REJECT,
    'You have an incoming call. Do you want to answer?'
  )

export const controlConfirmDefault = (opts: Options) =>
  confirmDefault(
    opts,
    TEXT_GRANT_REMORTE_ACCESS,
    TEXT_REJECT,
    'Agent requested remote control. Allow?'
  )
