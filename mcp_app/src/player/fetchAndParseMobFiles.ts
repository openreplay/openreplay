import MobFileParser from '@openreplay/player/web/messages/MobFileParser';
import { fixMessageOrder, sortIframes } from '@openreplay/player/web/messages/messageOrder';

type CallServerTool = (req: { name: string; arguments: Record<string, unknown> }) => Promise<any>;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function fetchAndParseMobFiles(
  fileUrls: string[],
  startTs: number,
  callServerTool: CallServerTool,
): Promise<{ messages: any[]; error?: string }> {
  const errors: string[] = [];
  const allMessages: any[] = [];
  let successCount = 0;

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
        errors.push(`File ${i}: server proxy error - ${text || 'empty response'}`);
        continue;
      }

      const data = base64ToUint8Array(text);
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
      error: `Failed to fetch mob files (${fileUrls.length} URLs). Errors: ${errors.join('; ') || 'unknown'}`,
    };
  }

  // Cross-batch ordering: re-run the same sort the player uses per file
  // so message-time invariants hold across the dom.mobs/dom.mobe boundary.
  const sorted = fixMessageOrder(allMessages).sort(sortIframes);
  return { messages: sorted };
}
