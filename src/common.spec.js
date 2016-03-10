/* eslint strict:0 */

'use strict'

const aasync = require('asyncawait/async')
const aawait = require('asyncawait/await')

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

  it('should have a downloadPackage function that downloads from NPM', aasync(() => {
    const outputFile = aawait(common.downloadPackage('request', '2.67.0', fakeRegistry)).toString()
    chai.expect(outputFile).to.contain('/tmp/')
    chai.expect(fs.readFileSync(outputFile).toString()).to.equal('HELLOWORLD')
  }))

  it('should have an uploadMapFile function that uploads to Sentry', aasync(() => {
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
    aawait(common.uploadMapFile(filePath, '/foobar', 'stripMe', pushUrl, appUrl, 'FAKETOKEN'))
    fsmock.restore()

    chai.expect(mockedPost.isDone()).to.equal(true)
    chai.expect(savedBody).to.contain(`${appUrl}/some.file.map`)
  }))
})
