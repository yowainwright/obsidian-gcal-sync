import type { calendar_v3 } from "googleapis";
import { createEvent } from "../calendar-api";
import type { CalendarEvent, ParsedCommand } from "../types";
import {
  PARAM_PATTERNS,
  TIME_PATTERN,
  DURATION_PATTERN,
  CHECKBOX_PATTERN,
  CAL_COMMAND,
  DEFAULT_TIME,
  MS_PER_DAY,
} from "../constants";

export const parseTime = (timeStr: string): string => {
  const lower = timeStr.toLowerCase();
  const match = lower.match(TIME_PATTERN);

  if (!match) return timeStr;

  const rawHours = parseInt(match[1], 10);
  const minutes = match[2] || "00";
  const period = match[3];

  let hours = rawHours;
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  const paddedHours = String(hours).padStart(2, "0");

  return `${paddedHours}:${minutes}`;
};

export const parseDate = (dateStr: string): string => {
  const lower = dateStr.toLowerCase();
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  if (lower === "today") return todayISO;

  if (lower === "tomorrow") {
    const tomorrow = new Date(today.getTime() + MS_PER_DAY);
    return tomorrow.toISOString().split("T")[0];
  }

  return dateStr;
};

export const parseDuration = (durationStr: string): number => {
  const match = durationStr.match(DURATION_PATTERN);

  if (!match) return 60;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "m").toLowerCase();
  const isHours = unit === "h";

  return isHours ? value * 60 : value;
};

export const cleanTitle = (line: string): string => {
  const withoutCal = line.replace(/\/@cal\s*/i, "");
  const withoutDate = withoutCal.replace(PARAM_PATTERNS.date, "");
  const withoutTime = withoutDate.replace(PARAM_PATTERNS.time, "");
  const withoutDuration = withoutTime.replace(PARAM_PATTERNS.duration, "");
  const withoutWith = withoutDuration.replace(PARAM_PATTERNS.with, "");
  const withoutVideo = withoutWith.replace(PARAM_PATTERNS.video, "");
  const withoutCheckbox = withoutVideo.replace(CHECKBOX_PATTERN, "");

  return withoutCheckbox.trim();
};

export const parseEventCommand = (line: string): ParsedCommand | null => {
  const hasCal = line.includes(CAL_COMMAND);
  if (!hasCal) return null;

  const dateMatch = line.match(PARAM_PATTERNS.date);
  const timeMatch = line.match(PARAM_PATTERNS.time);
  const durationMatch = line.match(PARAM_PATTERNS.duration);
  const withMatch = line.match(PARAM_PATTERNS.with);
  const videoMatch = line.match(PARAM_PATTERNS.video);

  const date = dateMatch ? parseDate(dateMatch[1]) : undefined;
  const time = timeMatch ? parseTime(timeMatch[1]) : undefined;
  const duration = durationMatch ? parseDuration(durationMatch[1]) : undefined;
  const attendees = withMatch ? withMatch[1].split(",") : undefined;
  const video = videoMatch
    ? (videoMatch[1] as "zoom" | "meet" | "teams")
    : undefined;
  const title = cleanTitle(line);

  return { title, date, time, duration, attendees, video };
};

export const buildCalendarEvent = (
  parsed: ParsedCommand,
  timezone: string,
  defaultDuration: number
): CalendarEvent => {
  const today = new Date().toISOString().split("T")[0];
  const date = parsed.date || today;
  const time = parsed.time || DEFAULT_TIME;
  const duration = parsed.duration || defaultDuration;

  const startDateTime = `${date}T${time}:00`;
  const endDate = new Date(startDateTime);
  endDate.setMinutes(endDate.getMinutes() + duration);
  const endDateTime = endDate.toISOString().replace("Z", "");

  const summary = parsed.title;
  const start = { dateTime: startDateTime, timeZone: timezone };
  const end = { dateTime: endDateTime, timeZone: timezone };
  const attendees = parsed.attendees?.map((email) => ({ email }));

  return { summary, start, end, attendees };
};

export const createEventFromCommand = async (
  client: calendar_v3.Calendar,
  parsed: ParsedCommand,
  timezone: string,
  defaultDuration: number
): Promise<boolean> => {
  const event = buildCalendarEvent(parsed, timezone, defaultDuration);
  const id = await createEvent(client, event);

  return id !== null;
};
