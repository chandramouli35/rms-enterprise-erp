/** Calendar date as DD/MM/YYYY. A plain YYYY-MM-DD keeps that day. */
export function formatDisplayDate(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const dayOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayOnly) return `${dayOnly[3]}/${dayOnly[2]}/${dayOnly[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value as string);
  if (!Number.isFinite(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** DD/MM/YYYY, HH:mm */
export function formatDisplayDateTime(value: unknown): string {
  const date = formatDisplayDate(value);
  if (!date) return '';
  const d = value instanceof Date ? value : new Date(value as string);
  if (!Number.isFinite(d.getTime())) return date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${date}, ${hh}:${mi}`;
}

const nativeDate = Date.prototype.toLocaleDateString;
const nativeDateTime = Date.prototype.toLocaleString;

Date.prototype.toLocaleDateString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
) {
  if (options) return nativeDate.call(this, locales, options);
  return formatDisplayDate(this);
};

Date.prototype.toLocaleString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
) {
  if (options) return nativeDateTime.call(this, locales, options);
  return formatDisplayDateTime(this);
};
