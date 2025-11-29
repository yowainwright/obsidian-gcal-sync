import { describe, expect, it } from "bun:test";
import { getDefaultTimezone, DEFAULT_SETTINGS } from "../src/settings";

describe("settings", () => {
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

  describe("DEFAULT_SETTINGS", () => {
    it("has empty credentials by default", () => {
      expect(DEFAULT_SETTINGS.clientId).toBe("");
      expect(DEFAULT_SETTINGS.clientSecret).toBe("");
      expect(DEFAULT_SETTINGS.accessToken).toBe("");
      expect(DEFAULT_SETTINGS.refreshToken).toBe("");
    });

    it("has sensible defaults", () => {
      expect(DEFAULT_SETTINGS.dailyNotesFolder).toBe("daily");
      expect(DEFAULT_SETTINGS.scheduleHeading).toBe("## Schedule");
      expect(DEFAULT_SETTINGS.eventFormat).toBe("task");
      expect(DEFAULT_SETTINGS.autoImportOnOpen).toBe(true);
      expect(DEFAULT_SETTINGS.autoCompleteEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.defaultDuration).toBe(60);
    });

    it("has valid autoCompleteInterval", () => {
      expect(DEFAULT_SETTINGS.autoCompleteInterval).toBe(60000);
    });

    it("has a timezone set", () => {
      expect(DEFAULT_SETTINGS.timezone.length).toBeGreaterThan(0);
    });
  });
});
