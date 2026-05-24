export function defaultRange(now: Date = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
