import { App, PluginSettingTab, Setting } from "obsidian";
import type GCalSyncPlugin from "./index";
import type { GCalSettings } from "./types";
import { DEFAULT_DURATION_MINUTES } from "./constants";
import { getDefaultTimezone } from "./utils";

export { getDefaultTimezone } from "./utils";

export const DEFAULT_SETTINGS: GCalSettings = {
  clientId: "",
  clientSecret: "",
  accessToken: "",
  refreshToken: "",
  dailyNotesFolder: "daily",
  scheduleHeading: "## Schedule",
  eventFormat: "task",
  autoImportOnOpen: true,
  autoCompleteEnabled: true,
  autoCompleteInterval: 60000,
  defaultDuration: DEFAULT_DURATION_MINUTES,
  timezone: getDefaultTimezone(),
};

export const createClientIdSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Client ID")
    .setDesc("Google OAuth Client ID")
    .addText((text) =>
      text
        .setPlaceholder("Enter client ID")
        .setValue(plugin.settings.clientId)
        .onChange(async (value) => {
          plugin.settings.clientId = value;
          await plugin.saveSettings();
        })
    );
};

export const createClientSecretSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Client Secret")
    .setDesc("Google OAuth Client Secret")
    .addText((text) =>
      text
        .setPlaceholder("Enter client secret")
        .setValue(plugin.settings.clientSecret)
        .onChange(async (value) => {
          plugin.settings.clientSecret = value;
          await plugin.saveSettings();
        })
    );
};

export const createRefreshTokenSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Refresh Token")
    .setDesc("Google OAuth Refresh Token (run get-google-token script to obtain)")
    .addText((text) =>
      text
        .setPlaceholder("Enter refresh token")
        .setValue(plugin.settings.refreshToken)
        .onChange(async (value) => {
          plugin.settings.refreshToken = value;
          await plugin.saveSettings();
        })
    );
};

export const createDailyNotesFolderSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Daily Notes Folder")
    .setDesc("Path to your daily notes folder")
    .addText((text) =>
      text
        .setPlaceholder("daily")
        .setValue(plugin.settings.dailyNotesFolder)
        .onChange(async (value) => {
          plugin.settings.dailyNotesFolder = value;
          await plugin.saveSettings();
        })
    );
};

export const createScheduleHeadingSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Schedule Heading")
    .setDesc("Heading under which to insert events")
    .addText((text) =>
      text
        .setPlaceholder("## Schedule")
        .setValue(plugin.settings.scheduleHeading)
        .onChange(async (value) => {
          plugin.settings.scheduleHeading = value;
          await plugin.saveSettings();
        })
    );
};

export const createEventFormatSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Event Format")
    .setDesc("How to format imported events")
    .addDropdown((dropdown) =>
      dropdown
        .addOption("task", "Task (- [ ])")
        .addOption("bullet", "Bullet (- )")
        .setValue(plugin.settings.eventFormat)
        .onChange(async (value: "task" | "bullet") => {
          plugin.settings.eventFormat = value;
          await plugin.saveSettings();
        })
    );
};

export const createAutoImportSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Auto Import on Open")
    .setDesc("Automatically import events when opening a daily note")
    .addToggle((toggle) =>
      toggle
        .setValue(plugin.settings.autoImportOnOpen)
        .onChange(async (value) => {
          plugin.settings.autoImportOnOpen = value;
          await plugin.saveSettings();
        })
    );
};

export const createAutoCompleteSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Auto Complete Passed Events")
    .setDesc("Automatically check off events after they pass")
    .addToggle((toggle) =>
      toggle
        .setValue(plugin.settings.autoCompleteEnabled)
        .onChange(async (value) => {
          plugin.settings.autoCompleteEnabled = value;
          await plugin.saveSettings();
        })
    );
};

export const createDefaultDurationSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin
): Setting => {
  return new Setting(containerEl)
    .setName("Default Duration")
    .setDesc("Default event duration in minutes")
    .addText((text) =>
      text
        .setPlaceholder("60")
        .setValue(String(plugin.settings.defaultDuration))
        .onChange(async (value) => {
          plugin.settings.defaultDuration =
            parseInt(value) || DEFAULT_DURATION_MINUTES;
          await plugin.saveSettings();
        })
    );
};

export class GCalSettingTab extends PluginSettingTab {
  plugin: GCalSyncPlugin;

  constructor(app: App, plugin: GCalSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Google Calendar Sync Settings" });

    containerEl.createEl("h3", { text: "Authentication" });
    const authDesc = containerEl.createEl("p", {
      cls: "setting-item-description",
    });
    authDesc.innerHTML =
      "Run <code>bun scripts/get-google-token.ts</code> from the plugin folder to get your credentials.";

    createClientIdSetting(containerEl, this.plugin);
    createClientSecretSetting(containerEl, this.plugin);
    createRefreshTokenSetting(containerEl, this.plugin);

    containerEl.createEl("h3", { text: "Daily Notes" });
    createDailyNotesFolderSetting(containerEl, this.plugin);
    createScheduleHeadingSetting(containerEl, this.plugin);

    containerEl.createEl("h3", { text: "Events" });
    createEventFormatSetting(containerEl, this.plugin);
    createAutoImportSetting(containerEl, this.plugin);
    createAutoCompleteSetting(containerEl, this.plugin);
    createDefaultDurationSetting(containerEl, this.plugin);
  }
}
