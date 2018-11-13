/* eslint strict:0 no-console:0 */

'use strict'

const fs = require('fs')
const path = require('path')
const request = require('request-promise-native')
const temp = require('temp')
const url = require('url')

const PROGRAM_NAME = 'sentry-sourcemaps'

function strippedPathAfter (str, prefix) {
  const lastPart = str.split(prefix)[1]
  return lastPart.replace(/^\/|\/$/g, '')
}


async function authGet (url, token, encoding) {
  const answer = await request({
    url: url,
    method: 'GET',
    encoding: encoding,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  return answer
}


async function streamToTempFile (buffer) {
  const temporaryFile = temp.openSync(PROGRAM_NAME)
  fs.close(temporaryFile.fd)
  fs.writeFileSync(temporaryFile.path, buffer, 'binary')
  return temporaryFile.path
}

async function downloadPackage (pkgName, pkgVersion, registryUrl, registryToken) {

  const fullPackageUrl = new url.URL(pkgName, registryUrl)
  const pkgJson = await authGet(fullPackageUrl, registryToken)

  const tarballUrl = JSON.parse(pkgJson).versions[pkgVersion].dist.tarball
  const tarballData = await authGet(tarballUrl, registryToken, 'binary')

  const filePath = await streamToTempFile(tarballData, PROGRAM_NAME)
  return filePath
}


async function uploadMapFile (mapFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken) {
  const mapFilePackagePath = strippedPathAfter(mapFile, path.join(dirPath, 'package'))
  const mapFileStrippedPath = strippedPathAfter(mapFilePackagePath, stripPrefix)

  try {
    var answer = await request({
      url: releaseFilesUrl,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${orgToken}`,
      },
      formData: {
        file: fs.createReadStream(mapFile),
        name: `${appUrl}/${mapFileStrippedPath}`,
      },
    })
  } catch (exc) {
    if (exc.statusCode === 409) {
      console.log('file already uploaded, continuing.')
    } else {
      console.log('could not upload the file:', exc)
      process.exit(1)
    }
  }

  return answer
}

async function createSentryRelease (releaseUrl, projectName, pkgVersion, orgToken) {
  const releaseData = await request({
    url: releaseUrl,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${orgToken}`,
    },
    json: true,
    body: {
      projects: [projectName],
      version: pkgVersion,
    },
  })
  return releaseData
}

module.exports = {
  PROGRAM_NAME: PROGRAM_NAME,

  createSentryRelease: createSentryRelease,
  downloadPackage: downloadPackage,
  uploadMapFile: uploadMapFile,
}
