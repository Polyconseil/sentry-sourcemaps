/* global before, describe */
/* eslint strict:0 */

'use strict'

const chai = require('chai')
const fs = require('fs')
const nock = require('nock')

const common = require('./common.js')

const fakeRegistry = 'http://foo.bar'

describe('common', () => {
  before(function () {
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
      })

    nock(fakeRegistry)
      .get('/request/-/request-2.67.0.tgz').reply(200, 'HELLOWORLD')
  })

  it('should export PROGRAM_NAME', () => {
    chai.expect(common.PROGRAM_NAME).to.equal('sentry-sourcemaps')
  })

  it('should have a downloadPackage function that downloads from NPM', async function () {
    const outputFile = await common.downloadPackage('request', '2.67.0', fakeRegistry)
    chai.expect(outputFile.toString()).to.contain('/tmp/')
    chai.expect(fs.readFileSync(outputFile.toString()).toString()).to.equal('HELLOWORLD')
  })

  it('should have an uploadMapFile function that uploads to Sentry', async function () {
    const filePath = '/foobar/package/stripMe/some.file.map'
    const appUrl = 'https://fantastic.app/js'
    const pushUrl = 'http://sentry/xxx/release/'

    const fsmock = require('mock-fs')
    fsmock({
      '/foobar/package/stripMe': {
        'some.file.map': 'CONTENT',
      },
    })

    let savedBody = null
    const mockedPost = nock('http://sentry').post('/xxx/release/', function (body) {
      savedBody = body
      return true
    }).reply(200, 'OK')
    await common.uploadMapFile(filePath, '/foobar', 'stripMe', pushUrl, appUrl, 'FAKETOKEN')
    fsmock.restore()

    chai.expect(mockedPost.isDone()).to.equal(true)
    chai.expect(savedBody).to.contain(`${appUrl}/some.file.map`)
  })
})
