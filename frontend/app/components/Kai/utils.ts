import { DateTime } from 'luxon';

type DatedEntry = {
  date: string;
  entries: { datetime: string }[];
}

export function splitByDate(entries: { datetime: string }[]) {
  const today = DateTime.now().startOf('day');
  const yesterday = today.minus({ days: 1 });

  const result: DatedEntry[] = [
    { date: 'Today', entries: [] },
    { date: 'Yesterday', entries: [] },
  ];

  entries.forEach((ent) => {
    const entryDate = DateTime.fromISO(ent.datetime).startOf('day');

    if (entryDate.toMillis() === today.toMillis()) {
      result[0].entries.push(ent);
    } else if (entryDate.toMillis() === yesterday.toMillis()) {
      result[1].entries.push(ent);
    } else {
      const date = entryDate.toFormat('dd LLL, yyyy')
      const existingEntry = result.find((r) => r.date === date);
      if (existingEntry) {
        existingEntry.entries.push(ent);
      } else {
        result.push({ entries: [ent], date });
      }
    }
  });

  return result.filter((r) => r.entries.length > 0);
}
