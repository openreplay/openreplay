export const STATES = {
  count: "count",
  recording: "recording",
  saving: "saving",
  idle: "idle",
} as const;

export function formatMsToTime(millis: number) {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return parseInt(seconds) === 60
    ? minutes.toString().padStart(2, "0") + 1 + ":00"
    : minutes.toString().padStart(2, "0") +
        ":" +
        (parseInt(seconds) < 10 ? "0" : "") +
        seconds;
}

const hardLimit = 24 * 1024 * 1024; // 24 MB
export function convertBlobToBase64(
  blob: Blob,
): Promise<{ result: string[]; size: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const parts = [];
      const base64data = reader.result as string;
      if (base64data && base64data.length > hardLimit) {
        const chunkSize = hardLimit;
        for (let i = 0; i < base64data.length; i += chunkSize) {
          parts.push(base64data.slice(i, i + chunkSize));
        }
      } else {
        parts.push(base64data);
      }
      resolve({
        result: parts,
        size: base64data.length,
      });
    };
  });
}

export function getChromeFullVersion() {
  const userAgent = navigator.userAgent;
  const match = userAgent.match(
    /Chrom(e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/,
  );

  if (match) {
    return `${match[2]}.${match[3]}.${match[4]}.${match[5]}`;
  } else {
    return null;
  }
}
