import type { App, TFile } from "obsidian";
import { fetchTodayEvents, type CalendarClient } from "../calendar-api";
import type { CalendarEvent, ImportConfig } from "../types";

export const formatTime = (dateTime: string): string => {
  const date = new Date(dateTime);
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleTimeString("en-US", options);
};

export const formatEventLine = (
  event: CalendarEvent,
  format: "task" | "bullet",
): string => {
  const time = formatTime(event.start.dateTime);
  const prefix = format === "task" ? "- [ ]" : "-";

  return `${prefix} ${time} - ${event.summary}`;
};

export const getHeadingLevel = (heading: string): number => {
  const match = heading.match(/^#+/);
  return match ? match[0].length : 0;
};

export const findHeadingPosition = (
  content: string,
  heading: string,
): { start: number; end: number } | null => {
  const lines = content.split("\n");
  const headingLevel = getHeadingLevel(heading);

  let start = -1;
  let end = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTargetHeading = line.trim() === heading.trim();

    if (isTargetHeading) {
      start = i;
      continue;
    }

    if (start !== -1) {
      const lineLevel = getHeadingLevel(line);
      const isNewSection = lineLevel > 0 && lineLevel <= headingLevel;

      if (isNewSection) {
        end = i;
        break;
      }
    }
  }

  if (start === -1) return null;
  if (end === -1) end = lines.length;

  return { start, end };
};

export const buildNewContent = (
  content: string,
  eventLines: string[],
  scheduleHeading: string,
): string => {
  const lines = content.split("\n");
  const position = findHeadingPosition(content, scheduleHeading);

  if (position) {
    const before = lines.slice(0, position.start + 1);
    const after = lines.slice(position.end);

    return [...before, ...eventLines, "", ...after].join("\n");
  }

  return [content, "", scheduleHeading, ...eventLines, ""].join("\n");
};

export const importDailyEvents = async (
  client: CalendarClient,
  app: App,
  file: TFile,
  config: ImportConfig,
): Promise<void> => {
  const events = await fetchTodayEvents(
    client,
    config.timezone,
    config.selectedCalendars,
  );
  const hasEvents = events.length > 0;

  if (!hasEvents) return;

  const content = await app.vault.read(file);
  const eventLines = events.map((e) => formatEventLine(e, config.eventFormat));
  const newContent = buildNewContent(
    content,
    eventLines,
    config.scheduleHeading,
  );

  await app.vault.modify(file, newContent);
};
