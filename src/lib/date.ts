function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getThisWeekMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return formatDate(monday);
}

export function getTodayDateString(): string {
  return formatDate(new Date());
}
