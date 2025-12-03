import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  getStartOfDay,
  getEndOfDay,
  mapEventItem,
  createEvent,
  fetchTodayEvents,
} from "../src/calendar-api";
import {
  createMockCalendarClient,
  setupMockFetch,
} from "./helpers/mock-calendar";

describe("calendar-api", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("getStartOfDay", () => {
    it("returns start of day", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      const result = getStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("preserves year, month, and day", () => {
      const date = new Date("2024-06-20T23:59:59Z");
      const result = getStartOfDay(date);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(20);
    });
  });

  describe("getEndOfDay", () => {
    it("returns exactly 24 hours after start", () => {
      const startOfDay = new Date("2024-01-15T00:00:00Z");
      const result = getEndOfDay(startOfDay);

      const diff = result.getTime() - startOfDay.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("mapEventItem", () => {
    it("maps complete event item", () => {
      const item = {
        id: "event123",
        summary: "Team Meeting",
        description: "Weekly sync",
        start: {
          dateTime: "2024-01-15T14:00:00-05:00",
          timeZone: "America/New_York",
        },
        end: {
          dateTime: "2024-01-15T15:00:00-05:00",
          timeZone: "America/New_York",
        },
        attendees: [
          { email: "john@example.com" },
          { email: "jane@example.com" },
        ],
      };

      const result = mapEventItem(item, "UTC");

      expect(result.id).toBe("event123");
      expect(result.summary).toBe("Team Meeting");
      expect(result.description).toBe("Weekly sync");
      expect(result.start.dateTime).toBe("2024-01-15T14:00:00-05:00");
      expect(result.start.timeZone).toBe("America/New_York");
      expect(result.attendees).toEqual([
        { email: "john@example.com" },
        { email: "jane@example.com" },
      ]);
    });

    it("uses fallback timezone when not provided", () => {
      const item = {
        start: { dateTime: "2024-01-15T14:00:00" },
        end: { dateTime: "2024-01-15T15:00:00" },
      };

      const result = mapEventItem(item, "America/Los_Angeles");

      expect(result.start.timeZone).toBe("America/Los_Angeles");
      expect(result.end.timeZone).toBe("America/Los_Angeles");
    });

    it("handles missing optional fields", () => {
      const item = {
        start: { date: "2024-01-15" },
        end: { date: "2024-01-15" },
      };

      const result = mapEventItem(item, "UTC");

      expect(result.id).toBeUndefined();
      expect(result.summary).toBe("Untitled");
      expect(result.description).toBeUndefined();
      expect(result.attendees).toBeUndefined();
    });

    it("handles attendees with missing email", () => {
      const item = {
        start: { dateTime: "2024-01-15T14:00:00" },
        end: { dateTime: "2024-01-15T15:00:00" },
        attendees: [{ email: "valid@example.com" }, {}],
      };

      const result = mapEventItem(item, "UTC");

      expect(result.attendees).toEqual([
        { email: "valid@example.com" },
        { email: "" },
      ]);
    });

    it("uses date when dateTime is not available", () => {
      const item = {
        start: { date: "2024-01-15" },
        end: { date: "2024-01-16" },
      };

      const result = mapEventItem(item, "UTC");

      expect(result.start.dateTime).toBe("2024-01-15");
      expect(result.end.dateTime).toBe("2024-01-16");
    });
  });

  describe("createEvent", () => {
    it("creates event and returns id", async () => {
      setupMockFetch({
        insertResult: { data: { id: "test-event-123" } },
      });
      const client = createMockCalendarClient();
      const event = {
        summary: "Test Event",
        start: { dateTime: "2024-01-15T10:00:00", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00", timeZone: "UTC" },
      };

      const result = await createEvent(client, event);

      expect(result).toBe("test-event-123");
    });

    it("returns null when id is missing", async () => {
      setupMockFetch({
        insertResult: { data: {} },
      });
      const client = createMockCalendarClient();
      const event = {
        summary: "Test Event",
        start: { dateTime: "2024-01-15T10:00:00", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00", timeZone: "UTC" },
      };

      const result = await createEvent(client, event);

      expect(result).toBeNull();
    });
  });

  describe("fetchTodayEvents", () => {
    it("returns empty array when no events", async () => {
      setupMockFetch({
        listResult: { data: { items: [] } },
      });
      const client = createMockCalendarClient();

      const result = await fetchTodayEvents(client, "America/New_York");

      expect(result).toEqual([]);
    });

    it("maps events from response", async () => {
      setupMockFetch({
        listResult: {
          data: {
            items: [
              {
                id: "event1",
                summary: "Meeting",
                start: { dateTime: "2024-01-15T10:00:00" },
                end: { dateTime: "2024-01-15T11:00:00" },
              },
            ],
          },
        },
      });
      const client = createMockCalendarClient();

      const result = await fetchTodayEvents(client, "UTC");

      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe("Meeting");
    });

    it("handles undefined items", async () => {
      setupMockFetch({
        listResult: { data: {} },
      });
      const client = createMockCalendarClient();

      const result = await fetchTodayEvents(client, "UTC");

      expect(result).toEqual([]);
    });
  });
});
