const networkActions = require('./networkActions');
const locationActions = require('./locationActions');
const settingsActions = require('./settingsActions');

module.exports = {
  ...networkActions,
  ...locationActions,
  ...settingsActions,
};
