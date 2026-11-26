const percent = new Intl.NumberFormat("pt-BR", { style: "percent" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** A fraction between 0 and 1 as a percentage, for example 0.4 as "40%". */
export function formatPercent(fraction: number) {
  return percent.format(fraction);
}

/** An ISO timestamp as a short local date and time. */
export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}
