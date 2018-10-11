/* @flow */
const reduxLoggerEnable = true;
console.disableYellowBox = false;

// Polyfill for Number.isInteger, needed by iOS 8
Number.isInteger = Number.isInteger || function (value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};

module.exports = {
  reduxLoggerEnable,
};
