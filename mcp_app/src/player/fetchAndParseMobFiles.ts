import MobFileParser from '@openreplay/player/web/messages/MobFileParser';
import { fixMessageOrder } from '@openreplay/player/web/messages/messageOrder';
import { decryptSessionBytes } from '@openreplay/player/web/network/crypto';

type CallServerTool = (req: { name: string; arguments: Record<string, unknown> }) => Promise<any>;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** `{ code, error }` payload returned by the server's fetch proxies. */
function readProxyError(text: string): { code?: string; error?: string } | null {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchAndParseMobFiles(
  fileUrls: string[],
  startTs: number,
  callServerTool: CallServerTool,
  fileKey?: string,
): Promise<{ messages: any[]; error?: string; expired?: boolean }> {
  const errors: string[] = [];
  const allMessages: any[] = [];
  let successCount = 0;
  let expired = false;

  // Single parser instance across all batches — format detected from the
  // first file, reader state shared across continuation files (dom.mobs +
  // dom.mobe). Mirrors MessageLoader's per-session parser pipeline.
  const parser = new MobFileParser(startTs);

  for (let i = 0; i < fileUrls.length; i++) {
    const url = fileUrls[i];
    try {
      // Fetch via server proxy (sandbox CSP blocks direct fetch)
      const result = await callServerTool({
        name: '_fetch_mob_file',
        arguments: { url },
      });

      const text = result?.content?.[0]?.text;
      if (!text || result.isError) {
        const proxyError = text ? readProxyError(text) : null;
        if (proxyError?.code === 'expired') expired = true;
        errors.push(`File ${i}: server proxy error - ${proxyError?.error || text || 'empty response'}`);
        continue;
      }

      let data = base64ToUint8Array(text);
      // Instances with file encryption enabled hand back AES-CBC cyphertext;
      // the key travels with the replay metadata. MessageLoader wraps every
      // parser in the same decrypt step.
      if (fileKey) {
        data = await decryptSessionBytes(data, fileKey);
      }
      const batch = parser.feed(data);
      for (const msg of batch) {
        if ((msg.tp as number) === 9999) continue;
        allMessages.push(msg);
      }

      successCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`File ${i}: ${errMsg}`);
      continue;
    }
  }

  if (successCount === 0) {
    return {
      messages: [],
      expired,
      error: `Failed to fetch mob files (${fileUrls.length} URLs). Errors: ${errors.join('; ') || 'unknown'}`,
    };
  }

  // Cross-batch ordering only; MobFileParser already ordered each batch.
  const sorted = fixMessageOrder(allMessages);
  return { messages: sorted };
}
