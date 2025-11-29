import type { App, TFile } from "obsidian";
import type { AutoCompleteConfig } from "../types";
import { TASK_LINE_PATTERN } from "../constants";

export const parseEventTime = (line: string): Date | null => {
  const match = line.match(TASK_LINE_PATTERN);

  if (!match) return null;

  const timeStr = match[1].trim();
  const today = new Date();
  const [time, period] = timeStr.split(/\s+/);
  const [hoursStr, minutesStr] = time.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  let hour = hours;
  const isPM = period?.toUpperCase() === "PM";
  const isAM = period?.toUpperCase() === "AM";

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  return new Date(year, month, date, hour, minutes);
};

export const markLineComplete = (line: string): string => {
  return line.replace("- [ ]", "- [x]");
};

export const processLine = (line: string, now: Date): string => {
  const eventTime = parseEventTime(line);
  const isPassed = eventTime && eventTime < now;

  return isPassed ? markLineComplete(line) : line;
};

export const processFileContent = (
  content: string,
  now: Date
): { content: string; modified: boolean } => {
  const lines = content.split("\n");

  let modified = false;
  const newLines = lines.map((line) => {
    const processed = processLine(line, now);
    const wasModified = processed !== line;

    if (wasModified) modified = true;

    return processed;
  });

  return {
    content: newLines.join("\n"),
    modified,
  };
};

export const processFile = async (app: App, file: TFile): Promise<void> => {
  const content = await app.vault.read(file);
  const now = new Date();
  const result = processFileContent(content, now);

  if (result.modified) {
    await app.vault.modify(file, result.content);
  }
};

export const getTodayFilePath = (folder: string): string => {
  const today = new Date().toISOString().split("T")[0];

  return `${folder}/${today}.md`;
};

export const getTodayFile = (app: App, folder: string): TFile | null => {
  const path = getTodayFilePath(folder);
  const file = app.vault.getAbstractFileByPath(path);
  const isFile = file && "extension" in file;

  return isFile ? (file as TFile) : null;
};

export const createAutoCompleteController = (
  app: App,
  config: AutoCompleteConfig
): { start: () => void; stop: () => void } => {
  let abortController: AbortController | null = null;

  const tick = async (signal: AbortSignal) => {
    if (signal.aborted) return;

    const file = getTodayFile(app, config.dailyNotesFolder);

    if (file) {
      await processFile(app, file);
    }

    if (!signal.aborted) {
      setTimeout(() => tick(signal), config.interval);
    }
  };

  const start = () => {
    abortController = new AbortController();
    tick(abortController.signal);
  };

  const stop = () => {
    abortController?.abort();
    abortController = null;
  };

  return { start, stop };
};
