export declare const genResponseByType: (responseType: XMLHttpRequest["responseType"], response: any) => string | Record<string, any>;
export declare const getStringResponseByType: (responseType: XMLHttpRequest["responseType"], response: any) => string;
export declare const genStringBody: (body?: BodyInit) => string;
export declare const genGetDataByUrl: (url: string, getData?: Record<string, any>) => Record<string, any>;
export declare const genFormattedBody: (body?: BodyInit) => string | {
    [key: string]: string;
};
export declare function isPureObject(input: any): input is Record<any, any>;
export declare function isIterable(value: any): boolean;
export declare function formatByteSize(bytes: number): string;
export declare const getURL: (urlString: string) => URL;
