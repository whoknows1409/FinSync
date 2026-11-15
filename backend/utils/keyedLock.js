// backend/utils/keyedLock.js
//
// Runs async tasks one at a time per key. Used so that two requests for the
// same trading account (for example two orders placed at once) cannot both read
// the same wallet balance and then both spend it.
//
// This is in-process only, which is enough while the API runs as one instance.

const tails = new Map();

function withLock(key, task) {
  const id = String(key);
  const previous = tails.get(id) || Promise.resolve();

  // Start after whatever is queued for this key, whether it succeeded or failed
  const run = previous.then(task, task);
  const tail = run.then(() => {}, () => {});

  tails.set(id, tail);
  tail.then(() => {
    if (tails.get(id) === tail) tails.delete(id);
  });

  return run;
}

module.exports = { withLock };
