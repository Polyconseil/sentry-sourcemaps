/* eslint strict:0 */

'use strict'

const aasync = require('asyncawait/async')

const chai = require('chai')
const fs = require('fs')
const nock = require('nock')

const awaitHelpers = require('./await_helpers.js')

describe('await_helpers', () => {

  it('awaitFn function should make a regular Node function synchronous', aasync(() => {
    chai.expect(awaitHelpers.awaitFn(fs.readFile, './package.json').toString()).to.contain('sentry-sourcemaps')
  }))

  it('awaitRequest should make a HTTP request asynchronous', aasync(() => {
    nock('http://foo.bar').get('/request').reply(200, 'HELLO')
    const resp = awaitHelpers.awaitRequest({
      url: 'http://foo.bar/request',
      method: 'GET',
    })
    chai.expect(resp.response.body).to.equal('HELLO')
    chai.expect(resp.data).to.equal('HELLO')
  }))

})
