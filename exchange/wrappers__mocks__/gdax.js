// Mock GDAX exchange wrapper for testing
// This allows the trader to be tested without connecting to live exchange APIs

const _ = require('lodash');
const moment = require('moment');

const Trader = function(config) {
  this.post_only = true;
  this.use_sandbox = false;
  this.name = 'GDAX';
  this.scanback = false;
  this.scanbackTid = 0;
  this.scanbackResults = [];
  this.asset = config.asset;
  this.currency = config.currency;

  this.api_url = 'https://api.gdax.com';
  this.api_sandbox_url = 'https://api-public.sandbox.gdax.com';

  // Use dummy credentials for testing
  this.key = 'test-key';
  this.secret = 'test-secret';
  this.passphrase = 'test-passphrase';

  this.pair = [config.asset, config.currency].join('-').toUpperCase();

  // Mock public client
  this.gdax_public = {
    getProductTicker: function(pair, cb) {
      cb(null, { bid: 2000, ask: 2010 });
    },
    getProductTrades: function(pair, options, cb) {
      cb(null, []);
    }
  };

  // Mock authenticated client
  this.gdax = {
    getAccounts: function(cb) {
      cb(null, [
        { currency: 'BTC', available: '10000.00' },
        { currency: 'USD', available: '1000.00' }
      ]);
    },
    buy: function(params, cb) {
      cb(null, { id: 'mock-order-' + Date.now() });
    },
    sell: function(params, cb) {
      cb(null, { id: 'mock-order-' + Date.now() });
    },
    getOrder: function(order, cb) {
      cb(null, {
        price: 20000,
        filled_size: '0.1',
        status: 'done',
        done_at: new Date().toISOString(),
        fill_fees: '10.00'
      });
    },
    cancelOrder: function(order, cb) {
      cb(null, true);
    }
  };
};

const recoverableErrors = [
  'SOCKETTIMEDOUT',
  'TIMEDOUT',
  'CONNRESET',
  'CONNREFUSED',
  'NOTFOUND'
];

const includes = (str, list) => {
  if (!_.isString(str)) return false;
  return _.some(list, item => str.includes(item));
};

Trader.prototype.processResponse = function(method, next) {
  return (error, response, body) => {
    if (!error && body && !_.isEmpty(body.message)) {
      error = new Error(body.message);
    }

    if (response && response.statusCode < 200 && response.statusCode >= 300) {
      error = new Error(`Response code ${response.statusCode}`);
    }

    if (error) {
      if (includes(error.message, recoverableErrors)) {
        error.notFatal = true;
      }

      if (
        ['buy', 'sell'].includes(method) &&
        error.message.includes('Insufficient funds')
      ) {
        error.retry = 10;
      }

      console.log(error.message);
      return next(error);
    }

    return next(undefined, body);
  };
};

Trader.prototype.getPortfolio = function(callback) {
  const result = (err, data) => {
    if (err) return callback(err);

    var portfolio = data.map(function(account) {
      return {
        name: account.currency.toUpperCase(),
        amount: parseFloat(account.available)
      };
    });
    callback(undefined, portfolio);
  };

  const fetch = cb => this.gdax.getAccounts(this.processResponse('getPortfolio', cb));
  // Simplified retry - just call directly for testing
  fetch(result);
};

Trader.prototype.getTicker = function(callback) {
  const result = (err, data) => {
    if (err) return callback(err);
    callback(undefined, { bid: +data.bid, ask: +data.ask });
  };

  const fetch = cb => this.gdax_public.getProductTicker(this.pair, this.processResponse('getTicker', cb));
  fetch(result);
};

Trader.prototype.getFee = function(callback) {
  const fee = 0; // post_only on GDAX means maker trades are free
  callback(undefined, this.post_only ? 0 : fee);
};

Trader.prototype.roundPrice = function(price) {
  return this.getMaxDecimalsNumber(price, this.currency == 'BTC' ? 5 : 2);
};

Trader.prototype.roundAmount = function(amount) {
  return this.getMaxDecimalsNumber(amount);
};

Trader.prototype.buy = function(amount, price, callback) {
  const buyParams = {
    price: this.getMaxDecimalsNumber(price, this.currency == 'BTC' ? 5 : 2),
    size: this.getMaxDecimalsNumber(amount),
    product_id: this.pair,
    post_only: this.post_only
  };

  const result = (err, data) => {
    if (err) {
      console.log({ buyParams }, err.message);
      return callback(err);
    }
    callback(undefined, data.id);
  };

  const fetch = cb => this.gdax.buy(buyParams, this.processResponse('buy', cb));
  fetch(result);
};

Trader.prototype.sell = function(amount, price, callback) {
  const sellParams = {
    price: this.getMaxDecimalsNumber(price, this.currency == 'BTC' ? 5 : 2),
    size: this.getMaxDecimalsNumber(amount),
    product_id: this.pair,
    post_only: this.post_only
  };

  const result = (err, data) => {
    if (err) {
      console.log({ sellParams }, err.message);
      return callback(err);
    }
    if (data.message && data.message.includes('Insufficient funds')) {
      err = new Error(data.message);
      err.retryOnce = true;
      return callback(err);
    }
    callback(undefined, data.id);
  };

  const fetch = cb => this.gdax.sell(sellParams, this.processResponse('sell', cb));
  fetch(result);
};

Trader.prototype.checkOrder = function(order, callback) {
  const result = (err, data) => {
    if (err) return callback(err);

    var status = data.status;
    if (status == 'pending') {
      return callback(undefined, { executed: false, open: true, filledAmount: 0 });
    } if (status === 'done' || status === 'settled') {
      return callback(undefined, { executed: true, open: false });
    } else if (status === 'rejected') {
      return callback(undefined, { executed: false, open: false });
    } else if (status === 'open' || status === 'active') {
      return callback(undefined, { executed: false, open: true, filledAmount: parseFloat(data.filled_size) });
    }

    callback(new Error('Unknown status ' + status));
  };

  const fetch = cb => this.gdax.getOrder(order, this.processResponse('checkOrder', cb));
  fetch(result);
};

Trader.prototype.getOrder = function(order, callback) {
  const result = (err, data) => {
    if (err) return callback(err);

    const price = parseFloat(data.price);
    const amount = parseFloat(data.filled_size);
    const date = moment(data.done_at);
    const fees = { [this.currency]: +data.fill_fees };
    const feePercent = +data.fill_fees / price / amount * 100;

    callback(undefined, { price, amount, date, fees, feePercent });
  };

  const fetch = cb => this.gdax.getOrder(order, this.processResponse('getOrder', cb));
  fetch(result);
};

Trader.prototype.cancelOrder = function(order, callback) {
  const result = (err, data) => {
    if (err) return callback(null, true);
    return callback(null, false);
  };

  const fetch = cb => this.gdax.cancelOrder(order, this.processResponse('cancelOrder', cb));
  fetch(result);
};

Trader.prototype.getTrades = function(since, callback, descending) {
  var lastScan = 0;

  const handle = function(err, data) {
    if (err) return callback(err);

    var result = _.map(data, function(trade) {
      return {
        tid: trade.trade_id,
        amount: parseFloat(trade.size),
        date: moment.utc(trade.time).format('X'),
        price: parseFloat(trade.price)
      };
    });

    if (this.scanback) {
      var last = _.last(data);
      var first = _.first(data);

      if (!this.scanbackTid) {
        if (moment.utc(last.time) < moment.utc(since)) {
          this.scanbackTid = last.trade_id;
        } else {
          console.log('Scanning backwards...' + last.time);
        }
      }

      if (this.scanbackTid) {
        this.scanbackResults = this.scanbackResults.concat(result.reverse());

        if (this.scanbackTid != first.trade_id) {
          this.scanbackTid = first.trade_id;
        } else {
          this.scanback = false;
          this.scanbackTid = 0;
          console.log('Scan finished: data found:' + this.scanbackResults.length);
          callback(null, this.scanbackResults);
          this.scanbackResults = [];
        }
      }
    } else {
      callback(null, result.reverse());
    }
  };

  if (since || this.scanback) {
    this.scanback = true;
    if (this.scanbackTid) {
      // simplified for mock
    } else {
      console.log('Scanning back in the history needed...', since);
    }
  }

  const fetch = cb => this.gdax_public.getProductTrades(
    this.pair,
    { limit: 100 },
    this.processResponse('getTrades', cb)
  );
  fetch(handle);
};

Trader.prototype.getMaxDecimalsNumber = function(number, decimalLimit = 8) {
  var decimalNumber = parseFloat(number);
  var decimalCount = (+decimalNumber).toString().replace(/^-?\d*\.?|0+$/g, '').length;

  var decimalMultiplier = 1;
  for (i = 0; i < decimalLimit; i++) {
    decimalMultiplier *= 10;
  }

  return decimalCount <= decimalLimit
    ? decimalNumber.toString()
    : (Math.floor(decimalNumber * decimalMultiplier) / decimalMultiplier).toFixed(decimalLimit);
};

Trader.getCapabilities = function() {
  return {
    name: 'GDAX',
    slug: 'gdax',
    currencies: ['USD', 'EUR', 'GBP', 'BTC'],
    assets: ['BTC', 'LTC', 'ETH', 'BCH'],
    markets: [
      { pair: ['USD', 'BTC'], minimalOrder: { amount: 0.001, unit: 'asset' } },
      { pair: ['USD', 'LTC'], minimalOrder: { amount: 0.1, unit: 'asset' } },
      { pair: ['USD', 'ETH'], minimalOrder: { amount: 0.01, unit: 'asset' } },
      { pair: ['USD', 'BCH'], minimalOrder: { amount: 0.01, unit: 'asset' } }
    ],
    requires: ['key', 'secret', 'passphrase'],
    providesHistory: 'date',
    providesFullHistory: true,
    tid: 'tid',
    tradable: true,
    forceReorderDelay: false,
    gekkoBroker: 0.6
  };
};

module.exports = Trader;