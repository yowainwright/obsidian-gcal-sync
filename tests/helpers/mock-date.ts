const OriginalDate = globalThis.Date;

export const mockDate = (fixedDate: string | Date): void => {
  const fixed = typeof fixedDate === "string" ? new Date(fixedDate) : fixedDate;

  globalThis.Date = class extends OriginalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(fixed.getTime());
      } else {
        // @ts-expect-error - spreading args to Date constructor
        super(...args);
      }
    }

    static now(): number {
      return fixed.getTime();
    }
  } as DateConstructor;
};

export const restoreDate = (): void => {
  globalThis.Date = OriginalDate;
};
