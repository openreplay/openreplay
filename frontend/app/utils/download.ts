/** Saves `blob` as a file. Revoking the URL right after click() can cancel the download in Firefox and Safari, so it waits a beat. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** one CSV field, quoted when it holds a comma, a quote or a line break.
    One a spreadsheet would run as a formula gets a leading quote. */
export const csvCell = (v: unknown) => {
  const raw = v == null ? '' : String(v);
  const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** without it Excel reads the file in the system's code page: accents and emoji break */
export const CSV_BOM = '\uFEFF';

export function saveCsv(
  filename: string,
  header: readonly unknown[],
  rows: readonly (readonly unknown[])[],
) {
  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(','))
    .join('\r\n');
  saveBlob(
    new Blob([CSV_BOM, csv], { type: 'text/csv;charset=utf-8;' }),
    filename,
  );
}
