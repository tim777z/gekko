// Mock Bittrex exchange wrapper for testing
// This allows the trader to be tested without connecting to live exchange APIs

const _ = require('lodash');
const moment = require('moment');

const Trader = function(config) {
  this.currency = config.currency;
  this.asset = config.asset;

  // Use dummy credentials for testing - no live API calls
  this.key = 'test-key';
  this.secret = 'test-secret';

  this.name = 'Bittrex';
  this.balance;
  this.price;
  this.pair = [this.currency, this.asset].join('-');
};

// Mock ticker data for testing
const mockTicker = {
  result: {
    Bid: 40000,
    Ask: 40100
  }
};

Trader.prototype.getTicker = function(callback) {
  // Simulate API response without network call
  callback(null, {
    bid: parseFloat(mockTicker.result.Bid),
    ask: parseFloat(mockTicker.result.Ask)
  });
};

Trader.prototype.getFee = function(callback) {
  callback(false, 0.00025);
};

Trader.prototype.getPortfolio = function(callback) {
  const assetEntry = { Available: 1.5, Currency: this.asset };
  const currencyEntry = { Available: 10000, Currency: this.currency };

  const assetAmount = parseFloat(assetEntry.Available);
  const currencyAmount = parseFloat(currencyEntry.Available);

  const portfolio = [
    { name: this.asset, amount: assetAmount },
    { name: this.currency, amount: currencyAmount }
  ];

  callback(undefined, portfolio);
};

Trader.prototype.buy = function(amount, price, callback) {
  const id = 'mock-order-' + Date.now();
  callback(undefined, id);
};

Trader.prototype.sell = function(amount, price, callback) {
  const id = 'mock-order-' + Date.now();
  callback(undefined, id);
};

Trader.prototype.checkOrder = function(order, callback) {
  callback(undefined, { executed: true, open: false });
};

Trader.prototype.getOrder = function(order, callback) {
  callback(undefined, {
    price: 40000,
    amount: 0.1,
    date: moment(0)
  });
};

Trader.prototype.cancelOrder = function(order, callback) {
  callback(undefined, true);
};

Trader.prototype.getTrades = function(since, callback, descending) {
  const result = [
    {
      tid: 1,
      amount: 0.1,
      date: moment().unix(),
      price: 40000,
      timeStamp: moment().format()
    }
  ];
  callback(null, result.reverse());
};

Trader.getCapabilities = function() {
  return {
    name: 'bittrex',
    slug: 'bittrex',
    currencies: ['BTC', 'ETH', 'USDT'],
    assets: ['BTC', 'ETH'],
    markets: [
      { pair: ['BTC', 'USD'], minimalOrder: { amount: 0.00000001, unit: 'asset' } }
    ],
    requires: ['key', 'secret'],
    tid: 'tid',
    providesHistory: 'date',
    providesFullHistory: false,
    tradable: false,
    gekkoBroker: '0.6.0'
  };
};

module.exports = Trader;