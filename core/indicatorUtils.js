// Indicator utility functions extracted from core/talib.js
// Provides execute and verifyParams for technical indicator processing

var _ = require('lodash');

var talibError = 'Gekko was unable to configure talib indicator:\n\t';

// Validate that talib is installed, if not we'll throw an exception which will
// prevent further loading or use outside this module
try {
    var talib = require('talib');
} catch (e) {
    module.exports = null;
    return;
}

var talibGTEv103 = talib && require('semver').gte(talib.version, '1.0.3');

// Wrapper that executes a talib indicator
var execute = function(callback, params) {
    // talib callback style since talib-v1.0.3
    var talibCallback = function(err, result) {
        if(err) return callback(err);
        callback(null, result.result);
    };

    // talib legacy callback style before talib-v1.0.3
    var talibLegacyCallback = function(result) {
        var error = result.error;
        talibCallback.apply(this, [error, result]);
    };

    return talib.execute(params, talibGTEv103 ? talibCallback : talibLegacyCallback);
};

// Helper that makes sure all required parameters
// for a specific talib indicator are present.
var verifyParams = (methodName, params, methods) => {
    var requiredParams = methods[methodName] && methods[methodName].requires;

    if (!requiredParams) {
        throw new Error(talibError + methodName + ' not found in methods.');
    }

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

module.exports = {
    execute: execute,
    verifyParams: verifyParams
};