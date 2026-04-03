import unpack from '@openreplay/player/common/unpack';
import MFileReader from '@openreplay/player/web/messages/MFileReader';

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

  // Single reader across all files — first file sets index mode, continuation files inherit it
  const reader = new MFileReader(new Uint8Array(0), startTs);

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

      const unpacked = unpack(data);

      reader.append(unpacked);
      reader.checkForIndexes();

      let msg;
      while ((msg = reader.readNext()) !== null) {
        if ((msg.tp as number) === 9999) continue;
        allMessages.push(msg);
      }

      // Reset error flag so next file can still be attempted
      reader.error = false;

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

  allMessages.sort((a, b) => a.time - b.time);
  return { messages: allMessages };
}
