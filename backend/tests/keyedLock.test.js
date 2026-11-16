const { withLock } = require('../utils/keyedLock');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('withLock', () => {
  test('runs tasks for the same key one at a time, in order', async () => {
    const events = [];
    const task = (name, ms) => async () => {
      events.push(`${name}:start`);
      await sleep(ms);
      events.push(`${name}:end`);
      return name;
    };

    const results = await Promise.all([
      withLock('account-1', task('a', 30)),
      withLock('account-1', task('b', 5)),
      withLock('account-1', task('c', 1)),
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
  });

  test('different keys do not wait for each other', async () => {
    const events = [];
    await Promise.all([
      withLock('account-1', async () => { await sleep(30); events.push('slow'); }),
      withLock('account-2', async () => { events.push('fast'); }),
    ]);
    expect(events).toEqual(['fast', 'slow']);
  });

  test('a failing task rejects its own caller and does not block the next one', async () => {
    const failed = withLock('account-1', async () => { throw new Error('boom'); });
    const next = withLock('account-1', async () => 'still runs');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('still runs');
  });
});
