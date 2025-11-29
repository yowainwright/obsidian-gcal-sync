export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
}

export interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  timezone: string;
}

export interface GCalSettings {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  dailyNotesFolder: string;
  scheduleHeading: string;
  eventFormat: "task" | "bullet";
  autoImportOnOpen: boolean;
  autoCompleteEnabled: boolean;
  autoCompleteInterval: number;
  defaultDuration: number;
  timezone: string;
}

export interface ParsedCommand {
  title: string;
  date?: string;
  time?: string;
  duration?: number;
  attendees?: string[];
  video?: "zoom" | "meet" | "teams";
}

export interface ImportConfig {
  scheduleHeading: string;
  eventFormat: "task" | "bullet";
  timezone: string;
}

export interface AutoCompleteConfig {
  interval: number;
  dailyNotesFolder: string;
}
