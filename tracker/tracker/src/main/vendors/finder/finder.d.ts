export declare type Options = {
    root: Element;
    idName: (name: string) => boolean;
    className: (name: string) => boolean;
    tagName: (name: string) => boolean;
    attr: (name: string, value: string) => boolean;
    seedMinLength: number;
    optimizedMinLength: number;
    threshold: number;
    maxNumberOfTries: number;
};
export declare function finder(input: Element, options?: Partial<Options>): string;
