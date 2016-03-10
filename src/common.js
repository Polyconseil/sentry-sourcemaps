/* eslint strict:0 no-console:0 */

'use strict'

const aasync = require('asyncawait/async')

const fs = require('fs')
const path = require('path')
const request = require('request')
const temp = require('temp')
const url = require('url')

const awaitHelpers = require('./await_helpers.js')


const PROGRAM_NAME = 'sentry-sourcemaps'

function strippedPathAfter(str, prefix) {
  const lastPart = str.split(prefix)[1]
  return lastPart.replace(/^\/|\/$/g, '')
}

const streamToTempFile = aasync(function(buffer) {
  const temporaryFile = awaitHelpers.awaitFn(temp.open, PROGRAM_NAME)
  fs.close(temporaryFile.fd)
  fs.writeFileSync(temporaryFile.path, buffer, 'binary')
  return temporaryFile.path
})

const downloadPackage = aasync(function(pkgName, pkgVersion, registryUrl, registryToken) {
  let ans = null

  const fullPackageUrl = url.resolve(registryUrl, pkgName)
  ans = awaitHelpers.awaitAuthenticatedGet(fullPackageUrl, registryToken)

  const tarballUrl = JSON.parse(ans.response.body).versions[pkgVersion].dist.tarball
  ans = awaitHelpers.awaitAuthenticatedGet(tarballUrl, registryToken, 'binary')

  return streamToTempFile(ans.data, PROGRAM_NAME)
})

function uploadMapFile(mapFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken) {
  const mapFilePackagePath = strippedPathAfter(mapFile, path.join(dirPath, 'package'))
  const mapFileStrippedPath = strippedPathAfter(mapFilePackagePath, stripPrefix)

  const response = awaitHelpers.awaitFn(request, {
    url: releaseFilesUrl,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${orgToken}`,
    },
    formData: {
      file: fs.createReadStream(mapFile),
      name: `${appUrl}/${mapFileStrippedPath}`,
    },
  })
  if ([200, 201, 409].indexOf(response.statusCode) === -1) {
    throw response
  }
}

function createSentryRelease(releaseUrl, pkgVersion, orgToken) {
  return awaitHelpers.awaitRequest({
    url: releaseUrl,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${orgToken}`,
    },
    json: true,
    body: {
      version: pkgVersion,
    },
  })
}

module.exports = {
  PROGRAM_NAME: PROGRAM_NAME,

  createSentryRelease: createSentryRelease,
  downloadPackage: downloadPackage,
  uploadMapFile: uploadMapFile,
}
