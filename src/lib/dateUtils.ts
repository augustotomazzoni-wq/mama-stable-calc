export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Excel EDATE style: add months, clamp to last day if needed */
export function addMonthsExcelLike(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  // If the day overflowed (e.g. Jan 31 + 1 month = Mar 3), clamp to last day
  const expectedMonth = ((date.getMonth() + months) % 12 + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    result.setDate(0); // last day of previous month
  }
  return result;
}

/** Ceil months between two dates. If start >= end, returns 0. */
export function ceilMonthsBetween(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;

  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;

  // Check if there are remaining days
  const dayDiff = endDate.getDate() - startDate.getDate();
  if (dayDiff > 0) return totalMonths + 1;
  if (dayDiff === 0) return totalMonths;
  // dayDiff < 0 means we haven't reached the same day yet
  return totalMonths;
}

export function formatDateBR(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
