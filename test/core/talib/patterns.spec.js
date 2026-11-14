// Test that verifyParams throws on missing required parameters
// This test validates the talib method validation logic

var _ = require('lodash');
var TalibPatterns = require('../../../../core/talib/patterns');
var methods = TalibPatterns;

// verifyParams function (extracted from core/talib.js)
var talibError = 'Gekko was unable to configure talib indicator:\n\t';

var verifyParams = (methodName, params) => {
    var requiredParams = methods[methodName].requires;

    _.each(requiredParams, paramName => {
        if (!_.has(params, paramName)) {
            throw new Error(talibError + methodName + ' requires ' + paramName + '.');
        }

        var val = params[paramName];

        if (!_.isNumber(val)) {
            throw new Error(talibError + paramName + ' needs to be a number');
        }
    });
};

describe('core/talib verifyParams', function() {

  it('should throw when required param is missing for cdlabandonedbaby', function() {
    // cdlabandonedbaby requires optInPenetration
    var methodName = 'cdlabandonedbaby';

    // Missing required param should throw
    expect(function() {
      verifyParams(methodName, {});
    }).to.throw(Error);

    // Providing the required param should not throw
    expect(function() {
      verifyParams(methodName, { optInPenetration: 0.5 });
    }).to.not.throw(Error);
  });

  it('should throw when required param is not a number', function() {
    var methodName = 'cdlabandonedbaby';

    // Providing a non-number should throw
    expect(function() {
      verifyParams(methodName, { optInPenetration: 'invalid' });
    }).to.throw(Error);

    // Providing a number should not throw
    expect(function() {
      verifyParams(methodName, { optInPenetration: 0.5 });
    }).to.not.throw(Error);
  });

  it('should not throw when no required params are defined', function() {
    var methodName = 'cdl2crows';

    // cdl2crows has no required params
    expect(function() {
      verifyParams(methodName, {});
    }).to.not.throw(Error);
  });
});