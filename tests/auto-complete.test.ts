import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  parseEventTime,
  markLineComplete,
  processLine,
  processFileContent,
  processFile,
  getTodayFilePath,
  getTodayFile,
  createAutoCompleteController,
} from "../src/sync/auto-complete";
import { mockDate, restoreDate } from "./helpers/mock-date";
import { createMockApp, createMockFile } from "./helpers/mock-obsidian";

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
        0,
      );
      const afternoonNow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        14,
        0,
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
        0,
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
        0,
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
        0,
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
    beforeEach(() => {
      mockDate("2024-01-15T12:00:00Z");
    });

    afterEach(() => {
      restoreDate();
    });

    it("builds correct path", () => {
      const result = getTodayFilePath("daily");

      expect(result).toBe("daily/2024-01-15.md");
    });

    it("works with nested folders", () => {
      const result = getTodayFilePath("notes/journal/daily");

      expect(result).toBe("notes/journal/daily/2024-01-15.md");
    });
  });

  describe("processFile", () => {
    beforeEach(() => {
      mockDate("2024-01-15T15:00:00");
    });

    afterEach(() => {
      restoreDate();
    });

    it("modifies file when content changes", async () => {
      let modifiedContent = "";
      const files = new Map([
        ["daily/2024-01-15.md", "- [ ] 9:00 AM - Meeting"],
      ]);
      const app = createMockApp({
        files,
        modifyCallback: (_file, content) => {
          modifiedContent = content;
        },
      });
      const file = createMockFile("daily/2024-01-15.md");

      await processFile(app, file);

      expect(modifiedContent).toBe("- [x] 9:00 AM - Meeting");
    });

    it("does not modify file when no changes needed", async () => {
      let wasCalled = false;
      const files = new Map([["daily/2024-01-15.md", "Just some text"]]);
      const app = createMockApp({
        files,
        modifyCallback: () => {
          wasCalled = true;
        },
      });
      const file = createMockFile("daily/2024-01-15.md");

      await processFile(app, file);

      expect(wasCalled).toBe(false);
    });
  });

  describe("getTodayFile", () => {
    beforeEach(() => {
      mockDate("2024-01-15T12:00:00Z");
    });

    afterEach(() => {
      restoreDate();
    });

    it("returns file when it exists", () => {
      const files = new Map([["daily/2024-01-15.md", "content"]]);
      const app = createMockApp({ files });

      const result = getTodayFile(app, "daily");

      expect(result).not.toBeNull();
      expect(result!.path).toBe("daily/2024-01-15.md");
    });

    it("returns null when file does not exist", () => {
      const app = createMockApp({ files: new Map() });

      const result = getTodayFile(app, "daily");

      expect(result).toBeNull();
    });
  });

  describe("createAutoCompleteController", () => {
    beforeEach(() => {
      mockDate("2024-01-15T15:00:00");
    });

    afterEach(() => {
      restoreDate();
    });

    it("creates controller with start and stop methods", () => {
      const app = createMockApp();
      const config = { dailyNotesFolder: "daily", interval: 60000 };

      const controller = createAutoCompleteController(app, config);

      expect(typeof controller.start).toBe("function");
      expect(typeof controller.stop).toBe("function");
    });

    it("processes file on start when file exists", async () => {
      let modifiedContent = "";
      const files = new Map([
        ["daily/2024-01-15.md", "- [ ] 9:00 AM - Meeting"],
      ]);
      const app = createMockApp({
        files,
        modifyCallback: (_file, content) => {
          modifiedContent = content;
        },
      });
      const config = { dailyNotesFolder: "daily", interval: 60000 };

      const controller = createAutoCompleteController(app, config);
      controller.start();

      await new Promise((resolve) => setTimeout(resolve, 10));
      controller.stop();

      expect(modifiedContent).toBe("- [x] 9:00 AM - Meeting");
    });

    it("does nothing when file does not exist", async () => {
      let wasCalled = false;
      const app = createMockApp({
        files: new Map(),
        modifyCallback: () => {
          wasCalled = true;
        },
      });
      const config = { dailyNotesFolder: "daily", interval: 60000 };

      const controller = createAutoCompleteController(app, config);
      controller.start();

      await new Promise((resolve) => setTimeout(resolve, 10));
      controller.stop();

      expect(wasCalled).toBe(false);
    });

    it("stops processing after stop is called", async () => {
      let callCount = 0;
      const files = new Map([
        ["daily/2024-01-15.md", "- [ ] 9:00 AM - Meeting"],
      ]);
      const app = createMockApp({
        files,
        modifyCallback: () => {
          callCount++;
        },
      });
      const config = { dailyNotesFolder: "daily", interval: 10 };

      const controller = createAutoCompleteController(app, config);
      controller.start();

      await new Promise((resolve) => setTimeout(resolve, 5));
      controller.stop();

      const countAfterStop = callCount;
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(callCount).toBe(countAfterStop);
    });
  });
});
