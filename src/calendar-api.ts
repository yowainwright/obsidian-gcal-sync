import type { CalendarEvent, CalendarConfig, GoogleCalendarListItem } from "./types";
import { MS_PER_DAY } from "./constants";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface CalendarClient {
  getAccessToken: () => Promise<string>;
  config: CalendarConfig;
}

const refreshAccessToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> => {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Failed to refresh token");
  }

  return data.access_token;
};

export const createCalendarClient = (config: CalendarConfig): CalendarClient => {
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  const getAccessToken = async (): Promise<string> => {
    const now = Date.now();
    const bufferMs = 60000;

    if (cachedToken && now < tokenExpiry - bufferMs) {
      return cachedToken;
    }

    const { clientId, clientSecret, refreshToken } = config;
    cachedToken = await refreshAccessToken(clientId, clientSecret, refreshToken);
    tokenExpiry = now + 3600000;

    return cachedToken;
  };

  return { getAccessToken, config };
};

export const fetchCalendarList = async (
  client: CalendarClient
): Promise<GoogleCalendarListItem[]> => {
  const accessToken = await client.getAccessToken();
  const url = `${GOOGLE_CALENDAR_API}/users/me/calendarList`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to fetch calendar list");
  }

  const items = data.items || [];

  return items.map((item: { id?: string; summary?: string; primary?: boolean; backgroundColor?: string }) => ({
    id: item.id || "",
    summary: item.summary || "Untitled",
    primary: item.primary || false,
    backgroundColor: item.backgroundColor,
  }));
};

export const createEvent = async (
  client: CalendarClient,
  event: CalendarEvent,
  calendarId = "primary"
): Promise<string | null> => {
  const accessToken = await client.getAccessToken();
  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to create event");
  }

  return data.id || null;
};

export const getStartOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getEndOfDay = (startOfDay: Date): Date => {
  return new Date(startOfDay.getTime() + MS_PER_DAY);
};

interface GoogleEventItem {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email?: string }>;
}

export const mapEventItem = (
  item: GoogleEventItem,
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

const fetchEventsFromCalendar = async (
  client: CalendarClient,
  calendarId: string,
  timezone: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<CalendarEvent[]> => {
  const accessToken = await client.getAccessToken();

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: timezone,
  });

  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to fetch events");
  }

  const items: GoogleEventItem[] = data.items || [];

  return items.map((item) => mapEventItem(item, timezone));
};

export const fetchTodayEvents = async (
  client: CalendarClient,
  timezone: string,
  calendarIds: string[] = ["primary"]
): Promise<CalendarEvent[]> => {
  const now = new Date();
  const startOfDay = getStartOfDay(now);
  const endOfDay = getEndOfDay(startOfDay);

  const eventPromises = calendarIds.map((calendarId) =>
    fetchEventsFromCalendar(client, calendarId, timezone, startOfDay, endOfDay)
  );

  const results = await Promise.all(eventPromises);
  const allEvents = results.flat();

  const sortedEvents = allEvents.sort((a, b) => {
    const aTime = new Date(a.start.dateTime).getTime();
    const bTime = new Date(b.start.dateTime).getTime();
    return aTime - bTime;
  });

  return sortedEvents;
};
