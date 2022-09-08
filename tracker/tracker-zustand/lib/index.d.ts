import { App } from "@openreplay/tracker";
export interface Options {
    filter: (mutation: any, state: any) => boolean;
    transformer: (state: any) => any;
    mutationTransformer: (mutation: any) => any;
}
export default function (opts?: Partial<Options>): (app: App | null) => Function;
