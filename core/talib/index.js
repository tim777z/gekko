// Talib indicator modules - split from core/talib.js
// Each sub-module exports a `methods` object with indicator definitions

// Pattern Recognition indicators
require('./patterns');

// Overlap Studies and other indicators
require('./overlap');

// Re-export the combined methods object for backward compatibility
// Methods are accumulated from sub-modules below