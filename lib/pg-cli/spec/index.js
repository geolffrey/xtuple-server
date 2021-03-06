var assert = require('assert'),
  _ = require('lodash'),
  pgctl = require('../');

_.mixin(require('congruence'));

describe('pg-cli', function () {
  this.timeout(60 * 1000); // 1 minute

  beforeEach(function () {
    this.pgVersion = '9.3';
    this.$k = Math.round((Math.random() * 2e8)).toString(16);
    this.testcluster = {
        pg: {
          version: this.pgVersion,
          cluster: { name: this.$k + '-mochatest1.2.3' }
        },
        xt: {
          name: process.env.SUDO_USER,
          socketdir: '/var/run/postgresql'
        }
      };
  });

  describe('#parse', function () {
    it('should parse mock pg_createcluster', function () {
      var template = {
          config: _.isString,
          data: _.isString,
          locale: _.isString,
          port: _.isString
        },
        pg_createcluster = [
          'Creating new cluster 9.3/faketest ...',
            'config /etc/postgresql/9.3/faketest',
            'data   /var/lib/postgresql/9.3/faketest',
            'locale en_US.UTF-8',
            'port   5442'
        ].join('\n'),
        parsed = pgctl.parse(pg_createcluster, 'pg_createcluster');

      assert(_.similar(template, parsed));
    });
    it('should parse mock pg_hba.conf', function () {
      var hba_conf = [
          'local   all             postgres                                peer',
          'local   all             all                                     peer',
          'host    all             all             127.0.0.1/32            trust',

          'host    all             all             10/8                    md5',
          'host    all             all             172.16/12               md5',
          'host    all             all             192.168/16              md5',

          'host    all             all             .xtuple.com             md5',
          'host    all             all             ::1/128                 md5'
        ].join('\n'),
        parsed = pgctl.parse(hba_conf, 'pg_hba');

      assert(_.findWhere(parsed, { address: '.xtuple.com' }));
      assert.equal(parsed[0].user, 'postgres');
    });
    it('should parse mock pg_lsclusters', function () {
      var rowTemplate = {
          version: _.isNumber,
          name: _.isString,
          port: _.isNumber,
          status: _.isString,
          owner: _.isString,
          data: _.isString,
          log: _.isString
        },
        pg_lsclusters = [
          'Ver Cluster   Port Status Owner    Data directory                    Log file',
          '9.1 main      5432 online postgres /var/lib/postgresql/9.1/main      /var/log/postgresql/postgresql-9.1-main.log',
          '9.1 mochatest 5439 down   postgres /var/lib/postgresql/9.1/mochatest /var/log/postgresql/postgresql-9.1-mochatest.log',
          '9.1 test2     5438 down   postgres /var/lib/postgresql/9.1/test2     /var/log/postgresql/postgresql-9.1-test2.log',
          '9.3 local     5434 online postgres /var/lib/postgresql/9.3/local     /var/log/postgresql/postgresql-9.3-local.log',
          '9.3 local93   5435 online postgres /var/lib/postgresql/9.3/local93   /var/log/postgresql/postgresql-9.3-local93.log',
          '9.3 main      5433 online postgres /var/lib/postgresql/9.3/main      /var/log/postgresql/postgresql-9.3-main.log',
          '9.3 xtuple    5436 online postgres /var/lib/postgresql/9.3/xtuple    /var/log/postgresql/postgresql-9.3-xtuple.log'
        ].join('\n'),
        parsed = pgctl.parse(pg_lsclusters, 'pg_lsclusters'),
        errors = [ ];

      assert(_.all(parsed), function (row) {
        return _.similar(rowTemplate, row, errors);
      });
    });
  });
  describe('#lsclusters()', function () {
    it.skip('should invoke pg_lsclusters and parse actual output', function () {
      var result = pgctl.lsclusters();

      assert.isFalse(_.isEmpty(result));
      assert.operator(_.where(result, { version: this.pgVersion }).length, '>', 0);
    });
  });

  describe('#createcluster', function () {

    it('[sudo] should create a new cluster', function () {
      var a = pgctl.lsclusters().length,
        result = pgctl.createcluster(this.testcluster),
        b = pgctl.lsclusters().length;

      assert.equal(b, a + 1);
    });
    after(function () {
      pgctl.dropcluster(this.testcluster);
    });
  });
  describe('#dropcluster', function () {
    beforeEach(function () {
      pgctl.createcluster(this.testcluster);
    });
    it('[sudo] should drop an existing cluster', function () {
      var a = pgctl.lsclusters().length,
        result = pgctl.dropcluster(this.testcluster),
        b = pgctl.lsclusters().length;

      assert.equal(b, a - 1);
    });
  });
});
