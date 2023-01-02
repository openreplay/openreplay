import { DateTime } from 'luxon';

const ASSIGN = 'assign';
const MESSAGE = 'message';
const OPEN = 'open';
const CLOSE = 'close';

export const TYPES = { ASSIGN, MESSAGE, OPEN, CLOSE } as const;


type TypeKeys = keyof typeof TYPES
type TypeValues = typeof TYPES[TypeKeys]


export interface IActivity {
  id: string;
  type: TypeValues;
  author: string;
  createdAt: number;
  message: string;
  user: string;
}

export default class Activity {
  id: IActivity["id"];
  type: IActivity["type"];
  author: IActivity["author"];
  createdAt?: DateTime;
  message: IActivity["message"];
  user: IActivity["user"];

  constructor(activity?: IActivity) {
    if (activity) {
      Object.assign(this, {
        ...activity,
        createdAt: activity.createdAt ? DateTime.fromMillis(activity.createdAt, {}).toUTC() : undefined,
      })
    } else {
      Object.assign(this, {
        id: undefined,
        type: '',
        author: '',
        createdAt: undefined,
        message: '',
        user: ''
      })
    }
  }
}
