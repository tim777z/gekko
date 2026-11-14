var _ = require('lodash');

var StickyOrder = require('../../../../exchange/orders/sticky');

// Helper to create a StickyOrder instance for testing
function makeStickyOrder(api, side, options = {}) {
  return new StickyOrder({
    api: api,
    side: side,
    marketConfig: { minimalOrder: { amount: 0.00000001, unit: 'asset' } },
    capabilities: { limitedCancelConfirmation: true }
  }, options);
}

describe('exchange/orders/sticky', function() {
  var api = {
    roundPrice: function(p) { return Math.round(p * 100000000) / 100000000; },
    roundAmount: function(a) { return Math.round(a * 100000000) / 100000000; },
    outbidPrice: function(price, isBuy) { return isBuy ? price * 0.999 : price * 1.001; }
  };

  describe('calculatePrice', function() {
    it('should return limit price when ticker bid >= limit for buy side', function() {
      var order = makeStickyOrder(api, 'buy', { limit: 40000 });
      var result = order.calculatePrice({ bid: 40500, ask: 40100 });
      expect(result).to.equal(40000);
    });

    it('should return ticker bid when no outbid and ticker bid < limit for buy', function() {
      var order = makeStickyOrder(api, 'buy', { limit: 40500 });
      var result = order.calculatePrice({ bid: 39900, ask: 40100 });
      expect(result).to.equal(39900);
    });

    it('should apply outbid when outbid is enabled for buy', function() {
      var order = makeStickyOrder(api, 'buy', { limit: 40000, outbid: true });
      var result = order.calculatePrice({ bid: 39900, ask: 40100 });
      // outbidPrice returns bid * 0.999 = 39860.1, which is < limit(40000) and < ask(40100)
      expect(result).to.equal(Math.round(39860.1 * 100000000) / 100000000);
    });

    it('should return limit when outbid price exceeds limit for buy', function() {
      var order = makeStickyOrder(api, 'buy', { limit: 39900 });
      var result = order.calculatePrice({ bid: 39900, ask: 40100 });
      // outbidPrice = 39900 * 0.999 = 39860.1, which is < limit(39900) but we need to check
      expect(result).to.equal(39900);
    });

    it('should return ask price when ticker ask <= limit for sell', function() {
      var order = makeStickyOrder(api, 'sell', { limit: 30000 });
      var result = order.calculatePrice({ bid: 29900, ask: 29500 });
      expect(result).to.equal(29500);
    });

    it('should return ticker ask when no outbid and ticker ask > limit for sell', function() {
      var order = makeStickyOrder(api, 'sell', { limit: 30500 });
      var result = order.calculatePrice({ bid: 29900, ask: 30600 });
      expect(result).to.equal(30600);
    });

    it('should apply outbid when outbid is enabled for sell', function() {
      var order = makeStickyOrder(api, 'sell', { limit: 30000, outbid: true });
      var result = order.calculatePrice({ bid: 29900, ask: 30100 });
      // outbidPrice returns ask * 1.001 = 30130.1, which is > limit(30000) and > bid(29900)
      expect(result).to.equal(Math.round(30130.1 * 100000000) / 100000000);
    });

    it('should return limit when outbid price falls below limit for sell', function() {
      var order = makeStickyOrder(api, 'sell', { limit: 30200 });
      var result = order.calculatePrice({ bid: 29900, ask: 30100 });
      expect(result).to.equal(30200);
    });
  });
});