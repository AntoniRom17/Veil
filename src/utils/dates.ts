import {
  addMonths,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import type { ISODate, RoutinePeriod } from "@/src/types/domain";

export function toLocalDateKey(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: ISODate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatCalendarDate(value: ISODate | Date): string {
  const date = value instanceof Date ? value : parseLocalDate(value);
  return format(date, "EEEE, MMMM d");
}

export function formatShortDate(value: ISODate | Date): string {
  const date = value instanceof Date ? value : parseLocalDate(value);
  return format(date, "MMM d, yyyy");
}

export function formatClockTime(value: string | Date): string {
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? format(date, "h:mm a") : "";
}

export function calendarDayDifference(left: ISODate, right: ISODate): number {
  return differenceInCalendarDays(startOfDay(parseLocalDate(left)), startOfDay(parseLocalDate(right)));
}

export function resolveRoutinePeriod(
  date: Date,
  morningStart: string,
  eveningStart: string,
): Exclude<RoutinePeriod, "anytime"> {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const morning = timeToMinutes(morningStart, 5 * 60);
  const evening = timeToMinutes(eveningStart, 17 * 60);

  if (morning <= evening) return minutes >= morning && minutes < evening ? "am" : "pm";
  return minutes >= morning || minutes < evening ? "am" : "pm";
}

export function getPaoDate(dateOpened?: ISODate, paoMonths?: number): ISODate | undefined {
  if (!dateOpened || !paoMonths || paoMonths < 1) return undefined;
  const opened = parseLocalDate(dateOpened);
  if (!isValid(opened)) return undefined;
  return toLocalDateKey(addMonths(opened, paoMonths));
}

export type PaoState = "unknown" | "fresh" | "expiring-soon" | "past-pao";

export function getPaoState(
  dateOpened: ISODate | undefined,
  paoMonths: number | undefined,
  today: Date,
  warningDays = 30,
): PaoState {
  const paoDate = getPaoDate(dateOpened, paoMonths);
  if (!paoDate) return "unknown";
  const threshold = parseLocalDate(paoDate);
  const start = startOfDay(today);
  if (isBefore(threshold, start)) return "past-pao";
  if (!isAfter(threshold, new Date(start.getTime() + warningDays * 86_400_000))) {
    return "expiring-soon";
  }
  return "fresh";
}

function timeToMinutes(value: string, fallback: number): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}
