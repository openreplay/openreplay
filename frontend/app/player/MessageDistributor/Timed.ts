import type { Message } from './messages';

export interface  Timed { readonly time: number };
export interface Indexed { readonly _index: number }; // TODO: remove dash (evwrywhere)
export type TimedMessage = Timed & Message;
