(function () {
  'use strict';

  var tuner = require('./tuner'),
    pghba = require('./hba'),
    pgctl = require('./ctl'),
    exec = require('execSync'),
    format = require('string-format'),
    defaults = require('./defaults'),
    _ = require('underscore');

  var pg = exports;
  
  _.extend(pg, /** @exports pg */ {

    options: {
      mode: {
        required: '<mode>',
        description: 'Installation mode (dedicated|cloud|testing). Dedicated implies one slot.'
      },
      version: {
        optional: '[version]',
        description: 'Version of postgres to install [' + defaults.slot.base.version + ']',
        value: defaults.slot.base.version
      },
      slots: {
        optional: '[int]',
        description: 'Number of provisioned "slots" to consume [1]',
        value: 1
      }
    },

    /**
     *  options {
     *    version: 9.1,
     *    name: 'kelhay',
     *    mode: 'production',
     *    slots: 1,
     *    ...
     *  }
     */
    run: function (options) {
      var mode = options.pg.mode,
        slot = defaults.slot;
        //config = pg.configure(mode, options);

      return _.extend({ mode: mode, slots: options.pg.slots }, slot.base, slot[mode]);
    },

    /**
     * derive additional info from the environment.
     */
    configure: function (mode, options) {
      var config = _.extend({ mode: mode }, defaults.base, defaults[mode], options),
        clusters = pgctl.lsclusters(),
        collection = _.compact(_.map(_.pluck(_.flatten(_.values(clusters)), 'config'),
            function (path) {
          var conf = path + '/postgresql.conf';
          try {
            return JSON.parse(exec('head -1 ' + conf).slice(1));
          }
          catch (e) {
            return('%s is not readable by this tool', conf);
          }
        }));

      // TODO check 'collection' against provisioning guidelines

      return config;
    }
  });
})();