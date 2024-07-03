
type ConcreteBatch = {
  kind: 'Batch';
  fragment: any;
  id: string | null;
  metadata: { [key: string]: any };
  name: string;
  query: any;
  text: string | null;
  operationKind: string;
};
type Variables = { [name: string]: any };
interface FetchOpts {
  url?: string;
  method: 'POST' | 'GET';
  headers: Headers;
  body: string | FormData;
  credentials?: 'same-origin' | 'include' | 'omit';
  mode?: 'cors' | 'websocket' | 'navigate' | 'no-cors' | 'same-origin';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  redirect?: 'follow' | 'error' | 'manual';
  signal?: AbortSignal;
  [name: string]: any;
}
export interface RelayRequest {
  lastGenId: number;
  id: string;
  fetchOpts: FetchOpts;

  operation: ConcreteBatch;
  variables: Variables;
  controller: AbortController | null;

  getBody(): string | FormData;
  prepareBody(): string | FormData;
  getID(): string;
  getQueryString(): string;
  getVariables(): Variables;
  isMutation(): boolean;
  isFormData(): boolean;
  cancel(): boolean;
  clone(): RelayRequest;
}

declare class RelayRequestBatch {
  requests: RelayRequest[];

  setFetchOption(name: string, value: any): void;
  setFetchOptions(opts: {}): void;
  getBody(): string;
  prepareBody(): string;
  getIds(): string[];
  getID(): string;
  isMutation(): boolean;
  isFormData(): boolean;
  clone(): RelayRequestBatch;
  getQueryString(): string;
}
type GraphQLResponseErrors = Array<{
  message: string;
  locations?: [{ column: number; line: number }];
  stack?: string[];
}>;
export interface RelayResponse {
  _res: any;

  data?: Record<string, any>;
  errors?: GraphQLResponseErrors;

  ok: any;
  status: number;
  statusText?: string;
  headers?: Headers;
  url?: string;
  text?: string;
  json: unknown;

  processJsonData(json: unknown): void;
  clone(): RelayResponse;
  toString(): string;
}

export type RelayRequestAny = RelayRequest | RelayRequestBatch;
export type MiddlewareNextFn = (req: RelayRequestAny) => Promise<RelayResponse>;
export type Middleware = (next: MiddlewareNextFn) => MiddlewareNextFn;
