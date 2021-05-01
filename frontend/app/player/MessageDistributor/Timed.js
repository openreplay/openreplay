// @flow
import type { Message } from './messages';

export type Timed = { +time: number };
export type TimedMessage = Timed & Message;
