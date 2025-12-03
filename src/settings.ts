import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type GCalSyncPlugin from "./index";
import type { GCalSettings, GoogleCalendarListItem } from "./types";
import {
  DEFAULT_DURATION_MINUTES,
  GOOGLE_CLOUD_CONSOLE_URL,
} from "./constants";
import { getDefaultTimezone } from "./utils";
import { generateAuthUrl, exchangeCodeForTokens } from "./oauth";
import { fetchCalendarList } from "./calendar-api";

export { getDefaultTimezone } from "./utils";

class AuthCodeModal extends Modal {
  private plugin: GCalSyncPlugin;
  private onSubmit: (code: string) => void;

  constructor(
    app: App,
    plugin: GCalSyncPlugin,
    onSubmit: (code: string) => void,
  ) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Enter Authorization Code" });
    contentEl.createEl("p", {
      text: "Paste the authorization code from Google below:",
    });

    let codeValue = "";
    new Setting(contentEl).setName("Authorization Code").addText((text) =>
      text.setPlaceholder("Paste code here").onChange((value) => {
        codeValue = value;
      }),
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(async () => {
          if (!codeValue.trim()) {
            new Notice("Please enter an authorization code");
            return;
          }
          this.close();
          this.onSubmit(codeValue.trim());
        }),
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export const DEFAULT_SETTINGS: GCalSettings = {
  clientId: "",
  clientSecret: "",
  accessToken: "",
  refreshToken: "",
  dailyNotesFolder: "daily",
  scheduleHeading: "## Calendar",
  eventFormat: "task",
  autoImportOnOpen: true,
  autoCompleteEnabled: true,
  autoCompleteInterval: 60000,
  defaultDuration: DEFAULT_DURATION_MINUTES,
  timezone: getDefaultTimezone(),
  selectedCalendars: ["primary"],
};

export const createClientIdSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createClientSecretSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createDailyNotesFolderSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createScheduleHeadingSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
): Setting => {
  return new Setting(containerEl)
    .setName("Schedule Heading")
    .setDesc("Heading under which to insert events")
    .addText((text) =>
      text
        .setPlaceholder("## Calendar")
        .setValue(plugin.settings.scheduleHeading)
        .onChange(async (value) => {
          plugin.settings.scheduleHeading = value;
          await plugin.saveSettings();
        }),
    );
};

export const createEventFormatSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createAutoImportSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createAutoCompleteSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
    );
};

export const createDefaultDurationSetting = (
  containerEl: HTMLElement,
  plugin: GCalSyncPlugin,
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
        }),
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

    const authDesc = containerEl.createEl("div", {
      cls: "setting-item-description",
    });
    authDesc.createEl("p", {
      text: "1. Create a Google Cloud project and OAuth credentials:",
    });
    const link = authDesc.createEl("a", {
      text: "Open Google Cloud Console",
      href: GOOGLE_CLOUD_CONSOLE_URL,
    });
    link.setAttr("target", "_blank");
    authDesc.createEl("p", {
      text: "2. Create an OAuth 2.0 Client ID (Desktop app type), then enter Client ID and Secret below.",
    });

    createClientIdSetting(containerEl, this.plugin);
    createClientSecretSetting(containerEl, this.plugin);

    new Setting(containerEl)
      .setName("Connect to Google")
      .setDesc(
        this.plugin.settings.refreshToken
          ? "Connected. Click to reconnect."
          : "Click to authorize access to your Google Calendar.",
      )
      .addButton((btn) =>
        btn
          .setButtonText(
            this.plugin.settings.refreshToken ? "Reconnect" : "Connect",
          )
          .setCta()
          .onClick(async () => {
            const { clientId, clientSecret } = this.plugin.settings;
            if (!clientId || !clientSecret) {
              new Notice("Please enter Client ID and Client Secret first");
              return;
            }

            const authUrl = generateAuthUrl(clientId);
            window.open(authUrl, "_blank");

            new AuthCodeModal(this.app, this.plugin, async (code) => {
              try {
                const refreshToken = await exchangeCodeForTokens(
                  code,
                  clientId,
                  clientSecret,
                );
                this.plugin.settings.refreshToken = refreshToken;
                await this.plugin.saveSettings();
                new Notice("Successfully connected to Google Calendar!");
                this.display();
              } catch (err) {
                new Notice(`Failed to connect: ${err}`);
              }
            }).open();
          }),
      );

    containerEl.createEl("h3", { text: "Daily Notes" });
    createDailyNotesFolderSetting(containerEl, this.plugin);
    createScheduleHeadingSetting(containerEl, this.plugin);

    containerEl.createEl("h3", { text: "Calendars" });
    this.renderCalendarSettings(containerEl);

    containerEl.createEl("h3", { text: "Events" });
    createEventFormatSetting(containerEl, this.plugin);
    createAutoImportSetting(containerEl, this.plugin);
    createAutoCompleteSetting(containerEl, this.plugin);
    createDefaultDurationSetting(containerEl, this.plugin);
  }

  private renderCalendarSettings(containerEl: HTMLElement): void {
    const hasConnection = Boolean(this.plugin.settings.refreshToken);

    if (!hasConnection) {
      containerEl.createEl("p", {
        text: "Connect to Google Calendar above to select calendars.",
        cls: "setting-item-description",
      });
      return;
    }

    const calendarListEl = containerEl.createEl("div", {
      cls: "gcal-calendar-list",
    });

    new Setting(containerEl)
      .setName("Load Calendars")
      .setDesc("Fetch your available calendars from Google")
      .addButton((btn) =>
        btn
          .setButtonText("Load")
          .onClick(() => this.loadCalendars(btn, calendarListEl)),
      );
  }

  private async loadCalendars(
    btn: import("obsidian").ButtonComponent,
    listEl: HTMLElement,
  ): Promise<void> {
    if (!this.plugin.calendarClient) {
      new Notice("Not connected to Google Calendar");
      return;
    }

    btn.setDisabled(true);
    btn.setButtonText("Loading...");

    try {
      const calendars = await fetchCalendarList(this.plugin.calendarClient);
      this.renderCalendarList(listEl, calendars);
    } catch (err) {
      new Notice(`Failed to load calendars: ${err}`);
    } finally {
      btn.setDisabled(false);
      btn.setButtonText("Load");
    }
  }

  private renderCalendarList(
    listEl: HTMLElement,
    calendars: GoogleCalendarListItem[],
  ): void {
    listEl.empty();

    for (const cal of calendars) {
      const isSelected = this.plugin.settings.selectedCalendars.includes(
        cal.id,
      );
      const itemEl = listEl.createEl("div", { cls: "gcal-calendar-item" });

      const checkbox = itemEl.createEl("input", { type: "checkbox" });
      checkbox.checked = isSelected;
      checkbox.addEventListener("change", () =>
        this.toggleCalendar(cal.id, checkbox.checked),
      );

      const label = cal.primary ? `${cal.summary} (Primary)` : cal.summary;
      itemEl.createEl("span", { text: label });
    }
  }

  private async toggleCalendar(
    calendarId: string,
    isSelected: boolean,
  ): Promise<void> {
    const selected = new Set(this.plugin.settings.selectedCalendars);

    if (isSelected) {
      selected.add(calendarId);
    } else {
      selected.delete(calendarId);
    }

    this.plugin.settings.selectedCalendars = Array.from(selected);
    await this.plugin.saveSettings();
  }
}
