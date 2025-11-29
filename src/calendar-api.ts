import { google, calendar_v3 } from "googleapis";
import type { CalendarEvent, CalendarConfig } from "./types";
import { PRIMARY_CALENDAR_ID, MS_PER_DAY } from "./constants";

export const createCalendarClient = (
  config: CalendarConfig
): calendar_v3.Calendar => {
  const { clientId, clientSecret, refreshToken } = config;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  const credentials = { refresh_token: refreshToken };

  oauth2Client.setCredentials(credentials);

  return google.calendar({ version: "v3", auth: oauth2Client });
};

export const createEvent = async (
  client: calendar_v3.Calendar,
  event: CalendarEvent
): Promise<string | null> => {
  const calendarId = PRIMARY_CALENDAR_ID;
  const requestBody = event;

  const response = await client.events.insert({ calendarId, requestBody });

  return response.data.id || null;
};

export const getStartOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getEndOfDay = (startOfDay: Date): Date => {
  return new Date(startOfDay.getTime() + MS_PER_DAY);
};

export const mapEventItem = (
  item: calendar_v3.Schema$Event,
  fallbackTimezone: string
): CalendarEvent => {
  const id = item.id || undefined;
  const summary = item.summary || "Untitled";
  const description = item.description || undefined;
  const startDateTime = item.start?.dateTime || item.start?.date || "";
  const startTimeZone = item.start?.timeZone || fallbackTimezone;
  const endDateTime = item.end?.dateTime || item.end?.date || "";
  const endTimeZone = item.end?.timeZone || fallbackTimezone;
  const attendees = item.attendees?.map((a) => ({ email: a.email || "" }));

  return {
    id,
    summary,
    description,
    start: { dateTime: startDateTime, timeZone: startTimeZone },
    end: { dateTime: endDateTime, timeZone: endTimeZone },
    attendees,
  };
};

export const fetchTodayEvents = async (
  client: calendar_v3.Calendar,
  timezone: string
): Promise<CalendarEvent[]> => {
  const now = new Date();
  const startOfDay = getStartOfDay(now);
  const endOfDay = getEndOfDay(startOfDay);

  const calendarId = PRIMARY_CALENDAR_ID;
  const timeMin = startOfDay.toISOString();
  const timeMax = endOfDay.toISOString();
  const singleEvents = true;
  const orderBy = "startTime";
  const timeZone = timezone;

  const response = await client.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents,
    orderBy,
    timeZone,
  });

  const items = response.data.items || [];

  return items.map((item) => mapEventItem(item, timezone));
};
