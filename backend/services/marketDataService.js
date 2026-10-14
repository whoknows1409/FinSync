// backend/services/marketDataService.js
//
// Stock quotes built from Yahoo Finance's public chart and fundamentals-timeseries
// endpoints. yahoo-finance2's quote()/quoteSummary() need a cookie/crumb handshake
// that Yahoo rejects with HTTP 429 from cloud hosts like Render; these endpoints
// don't, so they behave the same locally and in production.
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const YAHOO_HOSTS = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 10000;

// Cache lifetimes in seconds
const CHART_TTL = 30;
const BENCHMARK_TTL = 60 * 60;
const FUNDAMENTALS_TTL = 6 * 60 * 60;

const DAY_SECONDS = 24 * 60 * 60;
const TRADING_DAYS_3_MONTHS = 63;
const MIN_BETA_SAMPLES = 60;

const cache = new NodeCache({ checkperiod: 60, useClones: false });

class MarketDataError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'MarketDataError';
    this.status = status;
  }
}

async function yahooGet(path) {
  let lastError;
  for (const host of YAHOO_HOSTS) {
    try {
      const resp = await fetch(`${host}${path}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (resp.status === 404) {
        throw new MarketDataError('Stock not found', 404);
      }
      if (!resp.ok) {
        lastError = new MarketDataError(`Yahoo Finance responded with ${resp.status}`);
        continue;
      }
      return await resp.json();
    } catch (err) {
      if (err.status === 404) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof MarketDataError
    ? lastError
    : new MarketDataError(`Yahoo Finance request failed: ${lastError?.message}`);
}

async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = await load();
  cache.set(key, value, ttl);
  return value;
}

function fetchDailyChart(symbol, ttl) {
  return cached(`chart:${symbol}`, ttl, async () => {
    const json = await yahooGet(
      `/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&events=div`
    );
    const result = json?.chart?.result?.[0];
    if (!result?.meta?.regularMarketPrice) {
      throw new MarketDataError('Stock not found', 404);
    }
    return result;
  });
}

// Latest daily trailing market cap and P/E, each with the date it was computed for
function fetchFundamentals(symbol) {
  return cached(`fundamentals:${symbol}`, FUNDAMENTALS_TTL, async () => {
    const now = Math.floor(Date.now() / 1000);
    const json = await yahooGet(
      `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
      `?type=trailingMarketCap,trailingPeRatio&period1=${now - 365 * DAY_SECONDS}&period2=${now}`
    );
    const latest = {};
    for (const series of json?.timeseries?.result || []) {
      const type = series?.meta?.type?.[0];
      const points = (series?.[type] || []).filter(p => p?.reportedValue?.raw != null);
      const last = points[points.length - 1];
      if (last) latest[type] = { value: last.reportedValue.raw, asOfDate: last.asOfDate };
    }
    return latest;
  });
}

const localDate = (ts, gmtoffset) => new Date((ts + gmtoffset) * 1000).toISOString().slice(0, 10);

// Completed daily bars keyed by exchange-local date. The in-progress session has a
// null close until the market shuts, so it drops out here.
function toDailyBars(chart) {
  const offset = chart.meta.gmtoffset || 0;
  const q = chart.indicators?.quote?.[0] || {};
  return (chart.timestamp || [])
    .map((ts, i) => ({ date: localDate(ts, offset), close: q.close?.[i], volume: q.volume?.[i] }))
    .filter(bar => bar.close != null);
}

function closeOnOrBefore(bars, date) {
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i].date <= date) return bars[i].close;
  }
  return null;
}

// Market cap and trailing P/E move 1:1 with price between earnings reports, so
// rescale Yahoo's last daily value from its as-of close to the live price.
function rescaleToPrice(point, bars, price) {
  if (!point) return null;
  const refClose = closeOnOrBefore(bars, point.asOfDate);
  return refClose ? point.value * (price / refClose) : point.value;
}

// 1-year beta from daily returns against the benchmark index
function computeBeta(bars, benchmarkBars) {
  const benchByDate = new Map(benchmarkBars.map(bar => [bar.date, bar.close]));
  const stockReturns = [];
  const benchReturns = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = benchByDate.get(bars[i - 1].date);
    const curr = benchByDate.get(bars[i].date);
    if (prev == null || curr == null) continue;
    stockReturns.push(bars[i].close / bars[i - 1].close - 1);
    benchReturns.push(curr / prev - 1);
  }
  if (stockReturns.length < MIN_BETA_SAMPLES) return null;

  const mean = values => values.reduce((sum, v) => sum + v, 0) / values.length;
  const stockMean = mean(stockReturns);
  const benchMean = mean(benchReturns);
  let covariance = 0;
  let benchVariance = 0;
  for (let i = 0; i < stockReturns.length; i++) {
    covariance += (stockReturns[i] - stockMean) * (benchReturns[i] - benchMean);
    benchVariance += (benchReturns[i] - benchMean) ** 2;
  }
  return benchVariance > 0 ? covariance / benchVariance : null;
}

const benchmarkFor = symbol => (/\.(NS|BO)$/.test(symbol) ? '^NSEI' : '^GSPC');

async function loadQuote(symbol) {
  const [chart, fundamentals, benchmark] = await Promise.all([
    fetchDailyChart(symbol, CHART_TTL),
    fetchFundamentals(symbol).catch(err => {
      logger.warn(`Fundamentals unavailable for ${symbol}: ${err.message}`);
      return {};
    }),
    fetchDailyChart(benchmarkFor(symbol), BENCHMARK_TTL).catch(err => {
      logger.warn(`Benchmark unavailable for ${symbol}: ${err.message}`);
      return null;
    }),
  ]);

  const { meta } = chart;
  const offset = meta.gmtoffset || 0;
  const price = meta.regularMarketPrice;
  const bars = toDailyBars(chart);
  const closes = bars.map(bar => bar.close);

  const sessionDate = localDate(meta.regularMarketTime, offset);
  const priorBars = bars.filter(bar => bar.date < sessionDate);
  const previousClose = priorBars.length
    ? priorBars[priorBars.length - 1].close
    : meta.chartPreviousClose ?? null;
  const change = previousClose ? price - previousClose : null;

  const monthAgoClose = closeOnOrBefore(bars, localDate(meta.regularMarketTime - 30 * DAY_SECONDS, offset));

  const recentVolumes = bars.slice(-TRADING_DAYS_3_MONTHS).map(bar => bar.volume).filter(v => v > 0);

  const dividendCutoff = meta.regularMarketTime - 365 * DAY_SECONDS;
  const trailingDividends = Object.values(chart.events?.dividends || {})
    .filter(d => d.date > dividendCutoff)
    .reduce((sum, d) => sum + d.amount, 0);

  const marketCap = rescaleToPrice(fundamentals.trailingMarketCap, bars, price);
  const peRatio = rescaleToPrice(fundamentals.trailingPeRatio, bars, price);

  const regularSession = meta.currentTradingPeriod?.regular;
  const nowSeconds = Date.now() / 1000;
  const isMarketOpen = regularSession && nowSeconds >= regularSession.start && nowSeconds < regularSession.end;

  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency,
    exchange: meta.fullExchangeName || meta.exchangeName,
    currentPrice: price,
    previousClose,
    change,
    changePercent: change != null ? (change / previousClose) * 100 : null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    volume: meta.regularMarketVolume ?? 0,
    averageVolume: recentVolumes.length
      ? Math.round(recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length)
      : null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? (closes.length ? Math.max(...closes) : null),
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? (closes.length ? Math.min(...closes) : null),
    marketCap: marketCap != null ? Math.round(marketCap) : null,
    peRatio,
    // Percent, matching what yahoo-finance2's quote() returned
    dividendYield: trailingDividends > 0 ? (trailingDividends / price) * 100 : null,
    beta: benchmark ? computeBeta(bars, toDailyBars(benchmark)) : null,
    monthlyChange: monthAgoClose ? ((price - monthAgoClose) / monthAgoClose) * 100 : null,
    marketState: isMarketOpen ? 'REGULAR' : 'CLOSED',
    lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString(),
  };
}

// Daily closes over the last `days` calendar days, ending on the live price.
// Yahoo leaves the latest session's close null in the daily series.
async function loadDailyHistory(symbol, days) {
  const chart = await fetchDailyChart(symbol, CHART_TTL);
  const { meta } = chart;
  const offset = meta.gmtoffset || 0;
  const sessionDate = localDate(meta.regularMarketTime, offset);
  const since = localDate(meta.regularMarketTime - days * DAY_SECONDS, offset);

  const points = toDailyBars(chart)
    .filter(bar => bar.date > since && bar.date < sessionDate)
    .map(({ date, close }) => ({ date, close }));
  points.push({ date: sessionDate, close: meta.regularMarketPrice });
  return points;
}

// Bare NSE tickers (e.g. "WIPRO") only resolve on Yahoo with the .NS suffix,
// so retry with it when the symbol as given isn't found.
async function withNseFallback(rawSymbol, load) {
  const symbol = String(rawSymbol || '').trim().toUpperCase();
  if (!symbol) throw new MarketDataError('Stock symbol is required', 400);

  try {
    return await load(symbol);
  } catch (err) {
    if (err.status === 404 && !/[.^=]/.test(symbol)) {
      return load(`${symbol}.NS`);
    }
    throw err;
  }
}

// Both throw MarketDataError: status 400 for a blank symbol, 404 when Yahoo has
// no such symbol, 502 when Yahoo can't be reached.
const getQuote = rawSymbol => withNseFallback(rawSymbol, loadQuote);
const getDailyHistory = (rawSymbol, days) =>
  withNseFallback(rawSymbol, symbol => loadDailyHistory(symbol, days));

module.exports = { getQuote, getDailyHistory, MarketDataError };
