export const PORT = process.env.PORT || '3000';
export const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';

export function getTimezoneOffsetMs(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: TIMEZONE,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(date);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
  const match = tzName.match(/GMT([+-]\d{2}):(\d{2})/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return (hours * 60 + (hours < 0 ? -minutes : minutes)) * 60000;
}
