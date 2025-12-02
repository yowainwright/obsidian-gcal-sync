import type { CalendarClient } from "../../src/calendar-api";
import type { CalendarConfig } from "../../src/types";

interface MockFetchResponse {
  id?: string;
  items?: Array<{
    id?: string;
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
    attendees?: Array<{ email?: string }>;
  }>;
  error?: { message: string };
}

export interface MockCalendarOptions {
  insertResult?: { data: { id?: string } };
  insertError?: Error;
  listResult?: {
    data: {
      items?: Array<{
        id?: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
        attendees?: Array<{ email?: string }>;
      }>;
    };
  };
  listError?: Error;
}

export const createMockCalendarClient = (
  options: MockCalendarOptions = {}
): CalendarClient => {
  const config: CalendarConfig = {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    refreshToken: "mock-refresh-token",
  };

  const getAccessToken = async (): Promise<string> => {
    return "mock-access-token";
  };

  return { getAccessToken, config };
};

export const setupMockFetch = (options: MockCalendarOptions = {}): void => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("/events") && init?.method === "POST") {
      if (options.insertError) {
        return new Response(
          JSON.stringify({ error: { message: options.insertError.message } }),
          { status: 400 }
        );
      }
      const data = options.insertResult?.data || { id: "mock-event-id" };
      return new Response(JSON.stringify(data), { status: 200 });
    }

    if (url.includes("/events")) {
      if (options.listError) {
        return new Response(
          JSON.stringify({ error: { message: options.listError.message } }),
          { status: 400 }
        );
      }
      const data = options.listResult?.data || { items: [] };
      return new Response(JSON.stringify(data), { status: 200 });
    }

    return originalFetch(input, init);
  };
};

export const restoreFetch = (): void => {
  // In tests, we'll save and restore fetch manually
};
