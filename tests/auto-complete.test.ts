import { describe, expect, it } from "bun:test";
import {
  parseEventTime,
  markLineComplete,
  processLine,
  processFileContent,
  getTodayFilePath,
} from "../src/sync/auto-complete";

describe("auto-complete", () => {
  describe("parseEventTime", () => {
    it("parses AM time", () => {
      const result = parseEventTime("- [ ] 9:00 AM - Meeting");

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(0);
    });

    it("parses PM time", () => {
      const result = parseEventTime("- [ ] 3:30 PM - Call");

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(15);
      expect(result!.getMinutes()).toBe(30);
    });

    it("parses 12 PM as noon", () => {
      const result = parseEventTime("- [ ] 12:00 PM - Lunch");

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(12);
    });

    it("parses 12 AM as midnight", () => {
      const result = parseEventTime("- [ ] 12:00 AM - Midnight");

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(0);
    });

    it("returns null for non-task lines", () => {
      expect(parseEventTime("Regular text")).toBeNull();
      expect(parseEventTime("- [x] Completed task")).toBeNull();
      expect(parseEventTime("- Just a bullet")).toBeNull();
    });

    it("returns null for task without time", () => {
      expect(parseEventTime("- [ ] Task without time")).toBeNull();
    });
  });

  describe("markLineComplete", () => {
    it("marks unchecked task as complete", () => {
      const result = markLineComplete("- [ ] 9:00 AM - Meeting");
      expect(result).toBe("- [x] 9:00 AM - Meeting");
    });

    it("does not double-mark", () => {
      const result = markLineComplete("- [x] Already done");
      expect(result).toBe("- [x] Already done");
    });
  });

  describe("processLine", () => {
    it("marks passed event as complete", () => {
      const today = new Date();
      const morningTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        9,
        0
      );
      const afternoonNow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        14,
        0
      );

      const line = "- [ ] 9:00 AM - Morning meeting";
      const result = processLine(line, afternoonNow);

      expect(result).toBe("- [x] 9:00 AM - Morning meeting");
    });

    it("leaves future event unchanged", () => {
      const today = new Date();
      const morningNow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        8,
        0
      );

      const line = "- [ ] 9:00 AM - Morning meeting";
      const result = processLine(line, morningNow);

      expect(result).toBe("- [ ] 9:00 AM - Morning meeting");
    });

    it("leaves non-event lines unchanged", () => {
      const now = new Date();
      const line = "- [ ] Regular task";

      const result = processLine(line, now);
      expect(result).toBe("- [ ] Regular task");
    });

    it("leaves already completed tasks unchanged", () => {
      const now = new Date();
      const line = "- [x] 9:00 AM - Already done";

      const result = processLine(line, now);
      expect(result).toBe("- [x] 9:00 AM - Already done");
    });
  });

  describe("processFileContent", () => {
    it("marks multiple passed events", () => {
      const today = new Date();
      const now = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        10,
        0
      );

      const content = `# Schedule
- [ ] 8:00 AM - Standup
- [ ] 9:00 AM - Review
- [ ] 3:00 PM - Future meeting
- Regular bullet`;

      const result = processFileContent(content, now);

      expect(result.modified).toBe(true);
      expect(result.content).toContain("- [x] 8:00 AM - Standup");
      expect(result.content).toContain("- [x] 9:00 AM - Review");
      expect(result.content).toContain("- [ ] 3:00 PM - Future meeting");
      expect(result.content).toContain("- Regular bullet");
    });

    it("returns modified false when no changes", () => {
      const today = new Date();
      const now = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        8,
        0
      );

      const content = `# Schedule
- [ ] 3:00 PM - Future meeting
- Regular text`;

      const result = processFileContent(content, now);

      expect(result.modified).toBe(false);
    });

    it("handles empty content", () => {
      const result = processFileContent("", new Date());
      expect(result.modified).toBe(false);
      expect(result.content).toBe("");
    });
  });

  describe("getTodayFilePath", () => {
    it("builds correct path", () => {
      const today = new Date().toISOString().split("T")[0];
      const result = getTodayFilePath("daily");

      expect(result).toBe(`daily/${today}.md`);
    });

    it("works with nested folders", () => {
      const today = new Date().toISOString().split("T")[0];
      const result = getTodayFilePath("notes/journal/daily");

      expect(result).toBe(`notes/journal/daily/${today}.md`);
    });
  });
});
