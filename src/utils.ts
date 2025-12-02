export const isDailyNote = (path: string, folder: string): boolean => {
  return path.startsWith(`${folder}/`);
};

export const buildCompletedLine = (line: string): string => {
  const cleaned = line.replace(/\/@cal\s*/i, "").trim();
  const suffix = cleaned ? ` ${cleaned}` : "";
  return `- [x]${suffix}`;
};

export const getDefaultTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
