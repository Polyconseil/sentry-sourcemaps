const aasync = require('asyncawait/async');
const aawait = require('asyncawait/await');

const chai = require('chai');
const fs = require('fs');
const nock = require('nock');

const common = require('./common.js');

const fakeRegistry = 'http://foo.bar';

describe('common', () => {
  before(function() {
    nock(fakeRegistry)
      .get('/request').reply(200, {
        versions: {
          '2.67.0': {
            name: 'request',
            versions: [ '2.67.0' ],
            version: '2.67.0',
            dist: {
              tarball: 'http://foo.bar/request/-/request-2.67.0.tgz',
            },
          },
        },
      });

    nock(fakeRegistry)
      .get('/request/-/request-2.67.0.tgz').reply(200, 'HELLOWORLD');
  });

  it('should export PROGRAM_NAME', () => {
    chai.expect(common.PROGRAM_NAME).to.equal('sentry-sourcemaps');
  });

  it('should display a fnAwait function that makes a function asynchronous', aasync( () => {
    chai.expect(common.fnAwait(fs.readFile, './package.json').toString()).to.contain('sentry-sourcemaps');
  }));

  it('should have a downloadPackage function that downloads from NPM', aasync( () => {
    const outputFile = aawait(common.downloadPackage('request', '2.67.0', fakeRegistry)).toString();
    chai.expect(outputFile).to.contain('/tmp/');
    chai.expect(fs.readFileSync(outputFile).toString()).to.equal('HELLOWORLD');
  }));


});
