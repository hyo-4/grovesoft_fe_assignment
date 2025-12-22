export function getCountdownParts(endISO: string) {
  const end = new Date(endISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);

  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  return { diff, days, hours, minutes, seconds, ended: diff === 0 };
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
