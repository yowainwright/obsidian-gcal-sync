import type { CalendarEvent, CalendarConfig } from "./types";
import { PRIMARY_CALENDAR_ID, MS_PER_DAY } from "./constants";

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

export const createEvent = async (
  client: CalendarClient,
  event: CalendarEvent
): Promise<string | null> => {
  const accessToken = await client.getAccessToken();
  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(PRIMARY_CALENDAR_ID)}/events`;

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

export const fetchTodayEvents = async (
  client: CalendarClient,
  timezone: string
): Promise<CalendarEvent[]> => {
  const now = new Date();
  const startOfDay = getStartOfDay(now);
  const endOfDay = getEndOfDay(startOfDay);

  const accessToken = await client.getAccessToken();

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: timezone,
  });

  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(PRIMARY_CALENDAR_ID)}/events?${params}`;

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
