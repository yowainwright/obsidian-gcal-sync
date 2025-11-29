import { describe, expect, it } from "bun:test";
import { getStartOfDay, getEndOfDay, mapEventItem } from "../src/calendar-api";

describe("calendar-api", () => {
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
        attendees: [{ email: "john@example.com" }, { email: "jane@example.com" }],
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
});
