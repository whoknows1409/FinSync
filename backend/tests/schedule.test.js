const {
  startOfUtcDay,
  endOfUtcDay,
  startOfLocalDay,
  nextBudgetPeriod,
  currentBudgetPeriod,
  nextOccurrence,
} = require('../utils/schedule');

const utc = (year, month, day, hour = 0, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute));
const day = date => date.toISOString().slice(0, 10);

describe('nextBudgetPeriod', () => {
  test('monthly: the calendar month after the previous end', () => {
    const next = nextBudgetPeriod('monthly', utc(2026, 11, 30));
    expect([day(next.startDate), day(next.endDate)]).toEqual(['2026-12-01', '2026-12-31']);
  });

  test('monthly: handles February and the year boundary', () => {
    expect(day(nextBudgetPeriod('monthly', utc(2027, 1, 31)).endDate)).toBe('2027-02-28');
    expect(day(nextBudgetPeriod('monthly', utc(2028, 1, 31)).endDate)).toBe('2028-02-29');
    const january = nextBudgetPeriod('monthly', utc(2026, 12, 31));
    expect([day(january.startDate), day(january.endDate)]).toEqual(['2027-01-01', '2027-01-31']);
  });

  test('a first period that started mid-month still ends on the month boundary', () => {
    // 16-30 Nov is followed by the whole of December
    const next = nextBudgetPeriod('monthly', utc(2026, 11, 30));
    expect(day(next.startDate)).toBe('2026-12-01');
  });

  test('daily, weekly, quarterly and yearly', () => {
    const daily = nextBudgetPeriod('daily', utc(2026, 11, 16));
    expect([day(daily.startDate), day(daily.endDate)]).toEqual(['2026-11-17', '2026-11-17']);

    const weekly = nextBudgetPeriod('weekly', utc(2026, 11, 15));
    expect([day(weekly.startDate), day(weekly.endDate)]).toEqual(['2026-11-16', '2026-11-22']);

    const quarterly = nextBudgetPeriod('quarterly', utc(2026, 9, 30));
    expect([day(quarterly.startDate), day(quarterly.endDate)]).toEqual(['2026-10-01', '2026-12-31']);

    const yearly = nextBudgetPeriod('yearly', utc(2026, 12, 31));
    expect([day(yearly.startDate), day(yearly.endDate)]).toEqual(['2027-01-01', '2027-12-31']);
  });

  test('ignores the time of day on the previous end date', () => {
    const next = nextBudgetPeriod('monthly', utc(2026, 11, 30, 23, 59));
    expect(day(next.startDate)).toBe('2026-12-01');
  });
});

describe('currentBudgetPeriod', () => {
  test('returns the very next period when it contains today', () => {
    const period = currentBudgetPeriod('monthly', utc(2026, 10, 31), utc(2026, 11, 16));
    expect([day(period.startDate), day(period.endDate), period.skipped]).toEqual(['2026-11-01', '2026-11-30', 0]);
  });

  test('skips periods nobody was around for', () => {
    const period = currentBudgetPeriod('monthly', utc(2026, 7, 31), utc(2026, 11, 16));
    expect([day(period.startDate), day(period.endDate), period.skipped]).toEqual(['2026-11-01', '2026-11-30', 3]);
  });

  test('a period ending today is still the current one', () => {
    const period = currentBudgetPeriod('monthly', utc(2026, 10, 31), utc(2026, 11, 30, 18));
    expect(day(period.endDate)).toBe('2026-11-30');
  });
});

describe('nextOccurrence', () => {
  test('daily and weekly keep the time of day', () => {
    const start = utc(2026, 11, 16, 9, 30);
    expect(nextOccurrence(start, 'daily', start).toISOString()).toBe('2026-11-17T09:30:00.000Z');
    expect(nextOccurrence(start, 'weekly', start).toISOString()).toBe('2026-11-23T09:30:00.000Z');
  });

  test('monthly on the 31st lands on the last day of shorter months, then returns to the 31st', () => {
    const start = utc(2026, 1, 31);
    const february = nextOccurrence(start, 'monthly', start);
    const march = nextOccurrence(february, 'monthly', start);
    const april = nextOccurrence(march, 'monthly', start);
    expect([day(february), day(march), day(april)]).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  test('monthly rolls over the year', () => {
    const start = utc(2026, 12, 15);
    expect(day(nextOccurrence(start, 'monthly', start))).toBe('2027-01-15');
  });

  test('yearly from 29 February uses 28 February in ordinary years', () => {
    const start = utc(2028, 2, 29);
    const next = nextOccurrence(start, 'yearly', start);
    expect(day(next)).toBe('2029-02-28');
    expect(day(nextOccurrence(utc(2031, 2, 28), 'yearly', start))).toBe('2032-02-29');
  });

  test('rejects an unknown frequency', () => {
    expect(() => nextOccurrence(utc(2026, 1, 1), 'hourly', utc(2026, 1, 1))).toThrow('Unknown frequency');
  });
});

describe('day boundaries', () => {
  test('UTC day start and end', () => {
    const moment = utc(2026, 11, 16, 13, 45);
    expect(startOfUtcDay(moment).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(endOfUtcDay(moment).toISOString()).toBe('2026-11-16T23:59:59.999Z');
    expect(moment.toISOString()).toBe('2026-11-16T13:45:00.000Z'); // input not changed
  });

  test('the IST day starts at 18:30 UTC the evening before', () => {
    expect(startOfLocalDay(utc(2026, 11, 16, 0, 0)).toISOString()).toBe('2026-11-15T18:30:00.000Z');
    expect(startOfLocalDay(utc(2026, 11, 16, 18, 29)).toISOString()).toBe('2026-11-15T18:30:00.000Z');
    expect(startOfLocalDay(utc(2026, 11, 16, 18, 30)).toISOString()).toBe('2026-11-16T18:30:00.000Z');
  });
});
