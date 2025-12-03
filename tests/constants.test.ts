import { describe, expect, it } from "bun:test";
import {
  PARAM_PATTERNS,
  TIME_PATTERN,
  DURATION_PATTERN,
  CHECKBOX_PATTERN,
  TASK_LINE_PATTERN,
  CAL_COMMAND,
  DEFAULT_TIME,
  DEFAULT_DURATION_MINUTES,
  MS_PER_DAY,
  PRIMARY_CALENDAR_ID,
} from "../src/constants";

describe("constants", () => {
  describe("PARAM_PATTERNS", () => {
    it("matches date parameter", () => {
      const match = "date:today".match(PARAM_PATTERNS.date);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("today");
    });

    it("matches time parameter", () => {
      const match = "time:3pm".match(PARAM_PATTERNS.time);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("3pm");
    });

    it("matches duration parameter", () => {
      const match = "duration:30m".match(PARAM_PATTERNS.duration);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("30m");
    });

    it("matches with parameter", () => {
      const match = "with:john@example.com".match(PARAM_PATTERNS.with);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("john@example.com");
    });

    it("matches video parameter zoom", () => {
      const match = "video:zoom".match(PARAM_PATTERNS.video);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("zoom");
    });

    it("matches video parameter meet", () => {
      const match = "video:meet".match(PARAM_PATTERNS.video);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("meet");
    });

    it("matches video parameter teams", () => {
      const match = "video:teams".match(PARAM_PATTERNS.video);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("teams");
    });
  });

  describe("TIME_PATTERN", () => {
    it("matches 12-hour time with am", () => {
      const match = "9am".match(TIME_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("9");
      expect(match![3]).toBe("am");
    });

    it("matches 12-hour time with pm", () => {
      const match = "3pm".match(TIME_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("3");
      expect(match![3]).toBe("pm");
    });

    it("matches 24-hour time", () => {
      const match = "14:30".match(TIME_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("14");
      expect(match![2]).toBe("30");
    });

    it("matches time with minutes and period", () => {
      const match = "9:30am".match(TIME_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("9");
      expect(match![2]).toBe("30");
      expect(match![3]).toBe("am");
    });
  });

  describe("DURATION_PATTERN", () => {
    it("matches minutes", () => {
      const match = "30m".match(DURATION_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("30");
      expect(match![2]).toBe("m");
    });

    it("matches hours", () => {
      const match = "2h".match(DURATION_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("2");
      expect(match![2]).toBe("h");
    });

    it("matches number without unit", () => {
      const match = "45".match(DURATION_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("45");
    });
  });

  describe("CHECKBOX_PATTERN", () => {
    it("matches unchecked checkbox", () => {
      const match = "- [ ] Task".match(CHECKBOX_PATTERN);
      expect(match).not.toBeNull();
    });

    it("matches checked checkbox", () => {
      const match = "- [x] Task".match(CHECKBOX_PATTERN);
      expect(match).not.toBeNull();
    });
  });

  describe("TASK_LINE_PATTERN", () => {
    it("matches task with 12-hour time", () => {
      const match = "- [ ] 9:00 AM - Meeting".match(TASK_LINE_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("9:00 AM");
    });

    it("matches task with pm time", () => {
      const match = "- [ ] 3:30 PM - Call".match(TASK_LINE_PATTERN);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("3:30 PM");
    });
  });

  describe("static constants", () => {
    it("has correct CAL_COMMAND", () => {
      expect(CAL_COMMAND).toBe("/cal");
    });

    it("has correct DEFAULT_TIME", () => {
      expect(DEFAULT_TIME).toBe("09:00");
    });

    it("has correct DEFAULT_DURATION_MINUTES", () => {
      expect(DEFAULT_DURATION_MINUTES).toBe(60);
    });

    it("has correct MS_PER_DAY", () => {
      expect(MS_PER_DAY).toBe(86400000);
    });

    it("has correct PRIMARY_CALENDAR_ID", () => {
      expect(PRIMARY_CALENDAR_ID).toBe("primary");
    });
  });
});
