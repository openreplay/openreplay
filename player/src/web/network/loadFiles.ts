import { getPlayerConfig } from '../../config';

const ALLOWED_404 = 'No-file-and-this-is-ok';
const NO_BACKUP_FILE = 'No-efs-file';
export const NO_URLS = 'No-urls-provided';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 300;

export function isAbortError(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'AbortError';
}

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException('Aborted', 'AbortError');
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const isRetryableStatus = (status: number) =>
  status >= 500 || status === 408 || status === 429;

/** Retries network failures and transient statuses; 4xx (incl. expired signed urls) are returned as is. */
async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await window.fetch(url, { signal });
      if (attempt >= MAX_RETRIES || !isRetryableStatus(response.status)) {
        return response;
      }
      void response.body?.cancel();
    } catch (e) {
      // fetch rejects with a TypeError on network failure
      if (isAbortError(e) || attempt >= MAX_RETRIES || !(e instanceof TypeError)) {
        throw e;
      }
    }
    await sleep(RETRY_BASE_DELAY * 2 ** attempt, signal);
  }
}

export async function loadFiles(
  urls: string[],
  onData: (data: Uint8Array) => void | Promise<void>,
  canSkip: boolean = false,
  signal?: AbortSignal,
): Promise<void> {
  const validUrls = urls?.filter(Boolean) ?? [];
  if (!validUrls.length) {
    throw NO_URLS;
  }
  for (const url of validUrls) {
    await loadFile(
      url,
      onData,
      validUrls.length > 1 ? url !== validUrls[0] : canSkip,
      signal,
    );
  }
}

export async function loadFile(
  url: string,
  onData: (data: Uint8Array) => void | Promise<void>,
  canSkip: boolean = false,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetchWithRetry(url, signal);
    const data = await processAPIStreamResponse(response, canSkip);
    await onData(data);
  } catch (e) {
    if (e !== ALLOWED_404) {
      throw e;
    }
  }
}

export async function requestEFSDom(sessionId: string, signal?: AbortSignal) {
  return await requestEFSMobFile(`${sessionId}/dom.mob`, signal);
}

export async function requestSecondEFSDom(sessionId: string, signal?: AbortSignal) {
  return await requestEFSMobFile(`${sessionId}/dom.mob?end`, signal);
}

export async function requestEFSDevtools(sessionId: string, signal?: AbortSignal) {
  return await requestEFSMobFile(`${sessionId}/devtools.mob`, signal);
}

export async function requestTarball(url: string, signal?: AbortSignal) {
  const res = await fetchWithRetry(url, signal);
  if (res.ok) {
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  throw new Error(res.status.toString());
}

const urlPattern = /https?:\/\/[a-zA-Z0-9.-]+(:\d+)?\/(\d+)\/session\/\d+/;

function getSiteId(url) {
  const match = url.match(urlPattern);
  return match ? match[2] : null; // match[2] contains the siteId
}

async function requestEFSMobFile(filename: string, signal?: AbortSignal) {
  const efsClient = getPlayerConfig().efsClient;
  if (!efsClient) {
    throw NO_BACKUP_FILE;
  }
  const siteId = getSiteId(document.location.href);
  if (siteId) {
    efsClient.forceSiteId(siteId);
    efsClient.setSiteIdCheck(() => ({ siteId }));
  }

  // efsClient.fetch takes no signal, so an abort only takes effect once it settles
  const res = await efsClient.fetch(`/unprocessed/${filename}`);
  if (signal?.aborted) {
    throw abortReason(signal);
  }
  if (res.status >= 400) {
    throw NO_BACKUP_FILE;
  }
  return await processAPIStreamResponse(res, false);
}

async function processAPIStreamResponse(response: Response, skippable: boolean) {
  if (response.status === 404 && skippable) {
    throw ALLOWED_404;
  }
  if (response.status >= 400) {
    throw `Bad file status code ${response.status}. Url: ${response.url}`;
  }
  return new Uint8Array(await response.arrayBuffer());
}
