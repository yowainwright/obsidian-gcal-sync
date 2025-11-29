import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  parseTime,
  parseDate,
  parseDuration,
  cleanTitle,
  parseEventCommand,
  buildCalendarEvent,
} from "../src/commands/create-event";
import { mockDate, restoreDate } from "./helpers/mock-date";

describe("create-event", () => {
  describe("parseTime", () => {
    it("parses 12-hour time with am", () => {
      expect(parseTime("9am")).toBe("09:00");
    });

    it("parses 12-hour time with pm", () => {
      expect(parseTime("3pm")).toBe("15:00");
    });

    it("parses 12pm as noon", () => {
      expect(parseTime("12pm")).toBe("12:00");
    });

    it("parses 12am as midnight", () => {
      expect(parseTime("12am")).toBe("00:00");
    });

    it("parses time with minutes", () => {
      expect(parseTime("9:30am")).toBe("09:30");
    });

    it("parses 24-hour time", () => {
      expect(parseTime("14:30")).toBe("14:30");
    });

    it("returns original for invalid format", () => {
      expect(parseTime("invalid")).toBe("invalid");
    });

    it("handles uppercase AM/PM", () => {
      expect(parseTime("9AM")).toBe("09:00");
      expect(parseTime("3PM")).toBe("15:00");
    });
  });

  describe("parseDate", () => {
    beforeEach(() => {
      mockDate("2024-01-15T12:00:00Z");
    });

    afterEach(() => {
      restoreDate();
    });

    it("parses 'today'", () => {
      expect(parseDate("today")).toBe("2024-01-15");
    });

    it("parses 'tomorrow'", () => {
      expect(parseDate("tomorrow")).toBe("2024-01-16");
    });

    it("returns date string as-is for ISO format", () => {
      expect(parseDate("2024-03-20")).toBe("2024-03-20");
    });

    it("is case insensitive", () => {
      expect(parseDate("TODAY")).toBe("2024-01-15");
      expect(parseDate("Tomorrow")).toBe("2024-01-16");
    });
  });

  describe("parseDuration", () => {
    it("parses minutes", () => {
      expect(parseDuration("30m")).toBe(30);
    });

    it("parses hours", () => {
      expect(parseDuration("2h")).toBe(120);
    });

    it("parses number without unit as minutes", () => {
      expect(parseDuration("45")).toBe(45);
    });

    it("returns 60 for invalid format", () => {
      expect(parseDuration("invalid")).toBe(60);
    });

    it("handles uppercase units", () => {
      expect(parseDuration("30M")).toBe(30);
      expect(parseDuration("2H")).toBe(120);
    });
  });

  describe("cleanTitle", () => {
    it("removes /@cal", () => {
      expect(cleanTitle("/@cal Meeting")).toBe("Meeting");
    });

    it("removes date parameter", () => {
      expect(cleanTitle("Meeting /@date:today")).toBe("Meeting");
    });

    it("removes time parameter", () => {
      expect(cleanTitle("Meeting /@time:3pm")).toBe("Meeting");
    });

    it("removes duration parameter", () => {
      expect(cleanTitle("Meeting /@duration:30m")).toBe("Meeting");
    });

    it("removes with parameter", () => {
      expect(cleanTitle("Meeting /@with:john@example.com")).toBe("Meeting");
    });

    it("removes video parameter", () => {
      expect(cleanTitle("Meeting /@video:zoom")).toBe("Meeting");
    });

    it("removes checkbox prefix", () => {
      expect(cleanTitle("- [ ] Meeting")).toBe("Meeting");
    });

    it("removes all parameters", () => {
      const input =
        "- [ ] /@cal Team sync /@date:today /@time:3pm /@duration:1h /@with:team@co.com /@video:meet";
      expect(cleanTitle(input)).toBe("Team sync");
    });
  });

  describe("parseEventCommand", () => {
    it("returns null for line without /@cal", () => {
      expect(parseEventCommand("Regular task")).toBeNull();
    });

    it("parses line with /@cal only", () => {
      const result = parseEventCommand("/@cal Meeting");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Meeting");
    });

    it("parses all parameters", () => {
      const input =
        "/@cal Team standup /@date:today /@time:9am /@duration:30m /@with:team@co.com /@video:zoom";
      const result = parseEventCommand(input);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Team standup");
      expect(result!.time).toBe("09:00");
      expect(result!.duration).toBe(30);
      expect(result!.attendees).toEqual(["team@co.com"]);
      expect(result!.video).toBe("zoom");
    });

    it("parses multiple attendees", () => {
      const input = "/@cal Meeting /@with:a@co.com,b@co.com,c@co.com";
      const result = parseEventCommand(input);

      expect(result!.attendees).toEqual(["a@co.com", "b@co.com", "c@co.com"]);
    });

    it("handles missing optional parameters", () => {
      const result = parseEventCommand("/@cal Quick sync");

      expect(result!.title).toBe("Quick sync");
      expect(result!.date).toBeUndefined();
      expect(result!.time).toBeUndefined();
      expect(result!.duration).toBeUndefined();
      expect(result!.attendees).toBeUndefined();
      expect(result!.video).toBeUndefined();
    });
  });

  describe("buildCalendarEvent", () => {
    it("builds event with all fields", () => {
      const parsed = {
        title: "Team meeting",
        date: "2024-01-15",
        time: "14:00",
        duration: 60,
        attendees: ["john@example.com"],
      };

      const event = buildCalendarEvent(parsed, "America/New_York", 60);

      expect(event.summary).toBe("Team meeting");
      expect(event.start.dateTime).toBe("2024-01-15T14:00:00");
      expect(event.start.timeZone).toBe("America/New_York");
      expect(event.attendees).toEqual([{ email: "john@example.com" }]);
    });

    it("uses default duration when not specified", () => {
      const parsed = { title: "Quick chat" };
      const event = buildCalendarEvent(parsed, "UTC", 30);

      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const durationMs = end.getTime() - start.getTime();

      expect(durationMs).toBe(30 * 60 * 1000);
    });

    it("uses default time when not specified", () => {
      const parsed = { title: "Morning meeting", date: "2024-01-15" };
      const event = buildCalendarEvent(parsed, "UTC", 60);

      expect(event.start.dateTime).toContain("T09:00:00");
    });
  });
});
