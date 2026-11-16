const { waitAtMost } = require('../utils/timeBudget');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('waitAtMost', () => {
  let consoleError;
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => consoleError.mockRestore());

  test('returns as soon as the work finishes', async () => {
    const started = Date.now();
    await waitAtMost(sleep(10), 1000);
    expect(Date.now() - started).toBeLessThan(500);
  });

  test('stops waiting at the deadline and lets the work finish in the background', async () => {
    let finished = false;
    const work = sleep(150).then(() => { finished = true; });

    const started = Date.now();
    await waitAtMost(work, 30);
    const waited = Date.now() - started;

    expect(waited).toBeLessThan(120);
    expect(finished).toBe(false);

    await work;
    expect(finished).toBe(true);
  });

  test('never throws, whether the work fails before or after the deadline', async () => {
    await expect(waitAtMost(Promise.reject(new Error('early')), 50)).resolves.toBeUndefined();

    const late = sleep(40).then(() => { throw new Error('late'); });
    await expect(waitAtMost(late, 10)).resolves.toBeUndefined();
    await sleep(60); // the late failure is logged, not left unhandled
    expect(consoleError).toHaveBeenCalledTimes(2);
  });
});
