import { Plugin, MarkdownView, Editor, TFile } from "obsidian";
import { GCalSettingTab, DEFAULT_SETTINGS } from "./settings";
import type { GCalSettings } from "./types";
import {
  parseEventCommand,
  createEventFromCommand,
} from "./commands/create-event";
import { importDailyEvents } from "./sync/import-events";
import { createAutoCompleteController } from "./sync/auto-complete";
import { createCalendarClient } from "./calendar-api";
import type { calendar_v3 } from "googleapis";

export const isDailyNote = (path: string, folder: string): boolean => {
  return path.startsWith(folder);
};

export const getCurrentLine = (editor: Editor): string => {
  const cursor = editor.getCursor();
  return editor.getLine(cursor.line);
};

export const updateCurrentLine = (editor: Editor, newLine: string): void => {
  const cursor = editor.getCursor();
  editor.setLine(cursor.line, newLine);
};

export const buildCompletedLine = (line: string): string => {
  const cleaned = line.replace(/\/@cal\s*/i, "").trim();
  return `- [x] ${cleaned}`;
};

export default class GCalSyncPlugin extends Plugin {
  settings: GCalSettings = DEFAULT_SETTINGS;
  calendarClient: calendar_v3.Calendar | null = null;
  autoCompleteController: { start: () => void; stop: () => void } | null = null;

  async onload() {
    await this.loadSettings();
    this.initializeCalendarClient();
    this.registerCommands();
    this.registerFileOpenHandler();
    this.initializeAutoComplete();
    this.addSettingTab(new GCalSettingTab(this.app, this));
  }

  onunload() {
    this.autoCompleteController?.stop();
  }

  async loadSettings() {
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private initializeCalendarClient(): void {
    const { clientId, clientSecret, refreshToken, timezone } = this.settings;
    const hasCredentials = clientId && clientSecret && refreshToken;

    if (hasCredentials) {
      this.calendarClient = createCalendarClient({
        clientId,
        clientSecret,
        refreshToken,
        timezone,
      });
    }
  }

  private registerCommands(): void {
    this.addCommand({
      id: "create-calendar-event",
      name: "Create calendar event from current line",
      editorCallback: async (editor: Editor, _view: MarkdownView) => {
        await this.handleCreateEvent(editor);
      },
    });

    this.addCommand({
      id: "import-daily-events",
      name: "Import today's calendar events",
      callback: async () => {
        await this.handleImportEvents();
      },
    });
  }

  private registerFileOpenHandler(): void {
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        await this.handleFileOpen(file);
      })
    );
  }

  private initializeAutoComplete(): void {
    if (!this.settings.autoCompleteEnabled) return;

    const config = {
      interval: this.settings.autoCompleteInterval,
      dailyNotesFolder: this.settings.dailyNotesFolder,
    };

    this.autoCompleteController = createAutoCompleteController(this.app, config);
    this.autoCompleteController.start();
  }

  private async handleCreateEvent(editor: Editor): Promise<void> {
    if (!this.calendarClient) return;

    const line = getCurrentLine(editor);
    const parsed = parseEventCommand(line);

    if (!parsed) return;

    const { timezone, defaultDuration } = this.settings;
    const success = await createEventFromCommand(
      this.calendarClient,
      parsed,
      timezone,
      defaultDuration
    );

    if (success) {
      const newLine = buildCompletedLine(line);
      updateCurrentLine(editor, newLine);
    }
  }

  private async handleImportEvents(): Promise<void> {
    if (!this.calendarClient) return;

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const config = {
      scheduleHeading: this.settings.scheduleHeading,
      eventFormat: this.settings.eventFormat,
      timezone: this.settings.timezone,
    };

    await importDailyEvents(this.calendarClient, this.app, activeFile, config);
  }

  private async handleFileOpen(file: TFile | null): Promise<void> {
    if (!file) return;
    if (!this.settings.autoImportOnOpen) return;
    if (!this.calendarClient) return;

    const isDaily = isDailyNote(file.path, this.settings.dailyNotesFolder);
    if (!isDaily) return;

    const config = {
      scheduleHeading: this.settings.scheduleHeading,
      eventFormat: this.settings.eventFormat,
      timezone: this.settings.timezone,
    };

    await importDailyEvents(this.calendarClient, this.app, file, config);
  }
}
