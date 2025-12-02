import { describe, expect, it } from "bun:test";
import {
  isDailyNote,
  buildCompletedLine,
  getDefaultTimezone,
} from "../src/utils";

describe("utils", () => {
  describe("isDailyNote", () => {
    it("returns true for file in daily folder", () => {
      expect(isDailyNote("daily/2024-01-15.md", "daily")).toBe(true);
    });

    it("returns false for file outside daily folder", () => {
      expect(isDailyNote("notes/some-note.md", "daily")).toBe(false);
    });

    it("handles nested daily folder", () => {
      expect(isDailyNote("journal/daily/2024-01-15.md", "journal/daily")).toBe(
        true
      );
    });

    it("returns false for partial match", () => {
      expect(isDailyNote("daily-notes/2024-01-15.md", "daily")).toBe(false);
    });
  });

  describe("buildCompletedLine", () => {
    it("removes /@cal and marks as complete", () => {
      const result = buildCompletedLine("/@cal Team meeting");
      expect(result).toBe("- [x] Team meeting");
    });

    it("removes /@cal with surrounding content", () => {
      const result = buildCompletedLine("- [ ] /@cal Quick sync /@time:3pm");
      expect(result).toBe("- [x] - [ ] Quick sync /@time:3pm");
    });

    it("handles line with only /@cal", () => {
      const result = buildCompletedLine("/@cal");
      expect(result).toBe("- [x]");
    });

    it("is case insensitive", () => {
      const result = buildCompletedLine("/@CAL Meeting");
      expect(result).toBe("- [x] Meeting");
    });
  });

  describe("getDefaultTimezone", () => {
    it("returns a string", () => {
      const result = getDefaultTimezone();
      expect(typeof result).toBe("string");
    });

    it("returns a valid timezone", () => {
      const result = getDefaultTimezone();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
