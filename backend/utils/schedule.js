// backend/utils/schedule.js
//
// Date maths for budget periods and recurring transactions. Pure functions, all
// in UTC, so results do not depend on the timezone of the machine running them.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The app's users are in India: "today" for a recurring bill means today in IST
const APP_UTC_OFFSET_MINUTES = 330;

const startOfUtcDay = date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfUtcDay = date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const daysInUtcMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// The instant at which the local (IST) calendar day containing `date` began
function startOfLocalDay(date, offsetMinutes = APP_UTC_OFFSET_MINUTES) {
  const shifted = new Date(new Date(date).getTime() + offsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMinutes * 60 * 1000);
}

// The budget period that follows one ending on `previousEndDate`.
// Monthly, quarterly and yearly periods end on calendar boundaries.
function nextBudgetPeriod(period, previousEndDate) {
  const startDate = startOfUtcDay(previousEndDate);
  startDate.setUTCDate(startDate.getUTCDate() + 1);

  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  let endDate;

  switch (period) {
    case 'daily':
      endDate = new Date(startDate);
      break;
    case 'weekly':
      endDate = new Date(startDate.getTime() + 6 * MS_PER_DAY);
      break;
    case 'quarterly':
      endDate = new Date(Date.UTC(year, month + 3, 0));
      break;
    case 'yearly':
      endDate = new Date(Date.UTC(year, 11, 31));
      break;
    case 'monthly':
    default:
      endDate = new Date(Date.UTC(year, month + 1, 0));
      break;
  }

  return { startDate, endDate };
}

// The period, counting on from `previousEndDate`, that contains `now`.
// Periods nobody was around for are skipped rather than created empty.
function currentBudgetPeriod(period, previousEndDate, now = new Date()) {
  const today = startOfUtcDay(now);
  let range = nextBudgetPeriod(period, previousEndDate);
  let skipped = 0;

  while (range.endDate < today) {
    range = nextBudgetPeriod(period, range.endDate);
    skipped++;
  }

  return { ...range, skipped };
}

// The occurrence of a recurring transaction after `from`.
// `anchor` is the schedule's start date: a monthly item that starts on the 31st
// lands on the last day of shorter months and returns to the 31st afterwards.
function nextOccurrence(from, frequency, anchor) {
  const current = new Date(from);
  const anchorDate = new Date(anchor || from);
  const next = new Date(current);

  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'monthly': {
      const month = current.getUTCMonth() + 1;
      const year = current.getUTCFullYear() + Math.floor(month / 12);
      const targetMonth = month % 12;
      next.setUTCFullYear(year, targetMonth, 1);
      next.setUTCDate(Math.min(anchorDate.getUTCDate(), daysInUtcMonth(year, targetMonth)));
      break;
    }
    case 'yearly': {
      const year = current.getUTCFullYear() + 1;
      const targetMonth = anchorDate.getUTCMonth();
      next.setUTCFullYear(year, targetMonth, 1);
      next.setUTCDate(Math.min(anchorDate.getUTCDate(), daysInUtcMonth(year, targetMonth)));
      break;
    }
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }

  return next;
}

module.exports = {
  MS_PER_DAY,
  startOfUtcDay,
  endOfUtcDay,
  startOfLocalDay,
  nextBudgetPeriod,
  currentBudgetPeriod,
  nextOccurrence,
};
