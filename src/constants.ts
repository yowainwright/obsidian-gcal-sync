export const PARAM_PATTERNS = {
  date: /\/@date:(\S+)/i,
  time: /\/@time:(\S+)/i,
  duration: /\/@duration:(\S+)/i,
  with: /\/@with:(\S+)/i,
  video: /\/@video:(zoom|meet|teams)/i,
} as const;

export const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/;

export const DURATION_PATTERN = /^(\d+)(m|h)?$/i;

export const CHECKBOX_PATTERN = /^-\s*\[.\]\s*/;

export const TASK_LINE_PATTERN = /^- \[ \] (\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;

export const CAL_COMMAND = "/@cal";

export const DEFAULT_TIME = "09:00";

export const DEFAULT_DURATION_MINUTES = 60;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PRIMARY_CALENDAR_ID = "primary";

export const GOOGLE_OAUTH_SCOPES = ["https://www.googleapis.com/auth/calendar"];
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_CLOUD_CONSOLE_URL =
  "https://console.cloud.google.com/apis/credentials";
export const OAUTH_REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
