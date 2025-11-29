import { describe, expect, it } from "bun:test";
import {
  formatTime,
  formatEventLine,
  getHeadingLevel,
  findHeadingPosition,
  buildNewContent,
} from "../src/sync/import-events";
import type { CalendarEvent } from "../src/types";

describe("import-events", () => {
  describe("formatTime", () => {
    it("formats morning time", () => {
      const result = formatTime("2024-01-15T09:00:00");
      expect(result).toMatch(/9:00\s*AM/i);
    });

    it("formats afternoon time", () => {
      const result = formatTime("2024-01-15T14:30:00");
      expect(result).toMatch(/2:30\s*PM/i);
    });

    it("formats noon", () => {
      const result = formatTime("2024-01-15T12:00:00");
      expect(result).toMatch(/12:00\s*PM/i);
    });

    it("formats midnight", () => {
      const result = formatTime("2024-01-15T00:00:00");
      expect(result).toMatch(/12:00\s*AM/i);
    });
  });

  describe("formatEventLine", () => {
    const event: CalendarEvent = {
      summary: "Team Meeting",
      start: { dateTime: "2024-01-15T14:00:00", timeZone: "UTC" },
      end: { dateTime: "2024-01-15T15:00:00", timeZone: "UTC" },
    };

    it("formats as task", () => {
      const result = formatEventLine(event, "task");
      expect(result).toMatch(/^- \[ \]/);
      expect(result).toContain("Team Meeting");
    });

    it("formats as bullet", () => {
      const result = formatEventLine(event, "bullet");
      expect(result).toMatch(/^-\s/);
      expect(result).not.toContain("[ ]");
      expect(result).toContain("Team Meeting");
    });
  });

  describe("getHeadingLevel", () => {
    it("returns 0 for non-heading", () => {
      expect(getHeadingLevel("Regular text")).toBe(0);
    });

    it("returns 1 for h1", () => {
      expect(getHeadingLevel("# Title")).toBe(1);
    });

    it("returns 2 for h2", () => {
      expect(getHeadingLevel("## Section")).toBe(2);
    });

    it("returns 3 for h3", () => {
      expect(getHeadingLevel("### Subsection")).toBe(3);
    });
  });

  describe("findHeadingPosition", () => {
    it("finds heading position", () => {
      const content = `# Title
Some content

## Schedule
Event 1
Event 2

## Notes
Some notes`;

      const result = findHeadingPosition(content, "## Schedule");

      expect(result).not.toBeNull();
      expect(result!.start).toBe(3);
      expect(result!.end).toBe(7);
    });

    it("returns null when heading not found", () => {
      const content = `# Title
Some content`;

      const result = findHeadingPosition(content, "## Schedule");
      expect(result).toBeNull();
    });

    it("handles heading at end of document", () => {
      const content = `# Title
## Schedule
Event 1`;

      const result = findHeadingPosition(content, "## Schedule");

      expect(result).not.toBeNull();
      expect(result!.start).toBe(1);
      expect(result!.end).toBe(3);
    });

    it("stops at same-level heading", () => {
      const content = `## Schedule
Event 1
## Other`;

      const result = findHeadingPosition(content, "## Schedule");

      expect(result).not.toBeNull();
      expect(result!.end).toBe(2);
    });

    it("stops at higher-level heading", () => {
      const content = `## Schedule
Event 1
# Top Level`;

      const result = findHeadingPosition(content, "## Schedule");

      expect(result).not.toBeNull();
      expect(result!.end).toBe(2);
    });
  });

  describe("buildNewContent", () => {
    it("inserts events under existing heading", () => {
      const content = `# Daily Note

## Schedule

## Tasks
- Task 1`;

      const eventLines = ["- [ ] 9:00 AM - Meeting", "- [ ] 2:00 PM - Call"];

      const result = buildNewContent(content, eventLines, "## Schedule");

      expect(result).toContain("## Schedule");
      expect(result).toContain("- [ ] 9:00 AM - Meeting");
      expect(result).toContain("- [ ] 2:00 PM - Call");
      expect(result).toContain("## Tasks");
    });

    it("appends heading and events when heading not found", () => {
      const content = `# Daily Note

Some content`;

      const eventLines = ["- [ ] 9:00 AM - Meeting"];

      const result = buildNewContent(content, eventLines, "## Schedule");

      expect(result).toContain("## Schedule");
      expect(result).toContain("- [ ] 9:00 AM - Meeting");
    });

    it("preserves content before heading", () => {
      const content = `# Title
Intro paragraph

## Schedule
Old events

## Other`;

      const eventLines = ["- New event"];
      const result = buildNewContent(content, eventLines, "## Schedule");

      expect(result).toContain("Intro paragraph");
      expect(result).toContain("## Other");
    });
  });
});
