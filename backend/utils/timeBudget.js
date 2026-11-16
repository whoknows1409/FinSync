// backend/utils/timeBudget.js

// Wait for some work, but only for so long. If it is not finished in time the
// caller carries on and the work completes in the background.
//
// Used for housekeeping done while a page is loading (renewing budgets, adding
// due recurring transactions): normally instant, but it must never be able to
// hold a response until the browser or proxy gives up.
function waitAtMost(work, milliseconds) {
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(resolve, milliseconds);
    if (timer.unref) timer.unref();
  });

  // The work may fail after we stop waiting; make sure that is never unhandled
  const settled = Promise.resolve(work).catch(error => {
    console.error('Background housekeeping failed:', error);
  });

  return Promise.race([settled, deadline]).finally(() => clearTimeout(timer));
}

module.exports = { waitAtMost };
