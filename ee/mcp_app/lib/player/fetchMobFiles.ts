import unpack from './unpack.js';
import MFileReader from './MFileReader.js';

export async function fetchAndParseMobFiles(
  fileUrls: string[],
  startTs: number,
): Promise<{ messages: any[]; error?: string }> {
  console.error(`[SERVER] Fetching ${fileUrls.length} mob file(s)...`);

  const allMessages: any[] = [];
  let successCount = 0;

  // Use a single MFileReader across all files, matching the upstream frontend behavior.
  // The first file establishes the index mode (indexed vs no-indexes) and continuation
  // files inherit it via append().
  const reader = new MFileReader(new Uint8Array(0), startTs);

  for (const url of fileUrls) {
    try {
      console.error(`[SERVER] Fetching mob file: ${url.slice(0, 100)}...`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[SERVER] Mob file returned ${response.status}, skipping`);
        continue;
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      console.error(`[SERVER] Downloaded ${Math.floor(data.byteLength / 1024)}kb`);

      const unpacked = unpack(data);
      console.error(`[SERVER] Unpacked to ${Math.floor(unpacked.byteLength / 1024)}kb`);

      // Append to the shared reader (keeps pointer position, inherits index mode)
      reader.append(unpacked);
      reader.checkForIndexes();

      // Read all available messages from the appended data
      let msg;
      while ((msg = reader.readNext()) !== null) {
        if (msg.tp === 9999) continue; // Skip timestamp-only markers
        allMessages.push(msg);
      }

      // Reset error flag so next file can be attempted even if this one had parse issues
      reader.error = false;

      successCount++;
      console.error(`[SERVER] Parsed ${allMessages.length} messages so far`);
    } catch (err) {
      console.error(`[SERVER] Error fetching/parsing mob file:`, err);
      continue;
    }
  }

  if (successCount === 0) {
    return { messages: [], error: 'Failed to fetch any mob files' };
  }

  // Sort by time
  allMessages.sort((a, b) => a.time - b.time);

  console.error(`[SERVER] Total: ${allMessages.length} messages from ${successCount} file(s)`);
  return { messages: allMessages };
}
