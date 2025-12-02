const OriginalDate = globalThis.Date;

export const mockDate = (fixedDate: string | Date): void => {
  const fixed =
    typeof fixedDate === "string" ? new OriginalDate(fixedDate) : fixedDate;

  class MockDate extends OriginalDate {
    constructor();
    constructor(value: number | string);
    constructor(
      year: number,
      month: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number
    );
    constructor(
      yearOrValue?: number | string,
      month?: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number
    ) {
      if (yearOrValue === undefined) {
        super(fixed.getTime());
      } else if (month === undefined) {
        super(yearOrValue);
      } else {
        super(
          yearOrValue as number,
          month,
          date ?? 1,
          hours ?? 0,
          minutes ?? 0,
          seconds ?? 0,
          ms ?? 0
        );
      }
    }

    static now(): number {
      return fixed.getTime();
    }
  }

  globalThis.Date = MockDate as DateConstructor;
};

export const restoreDate = (): void => {
  globalThis.Date = OriginalDate;
};
