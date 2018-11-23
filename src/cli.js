#!/usr/bin/env node

'use strict'

const exec = require('child_process').exec
const fs = require('fs')

const glob = require('glob')
const yargs = require('yargs')

const common = require('./common.js')


if (!yargs.argv._ || yargs.argv._.length !== 4) {
  console.log(`
Usage:  ${common.PROGRAM_NAME} [OPTIONS] <PACKAGE> <VERSION> <APP_URL> <ORG_TOKEN>

  PACKAGE is the NPM package name for your application on the registry.
  VERSION is the target version of that package.
  APP_URL is the URL of the deployed application, that is linked with Sentry.
  ORG_TOKEN is the Sentry API Organization-wide token.

  OPTIONS are to be chosen within:

  Sentry Options
  ==============

  --sentry-url : the URL to your Sentry server. Defaults to 'https://app.getsentry.com'
  --sentry-organization : the organization to which the project belongs. Defaults to 'sentry'
  --sentry-project : the name under which your project is named within Sentry. Defaults to <PACKAGE>.

  Other Options
  =============

  --pattern : the MAP files search pattern. Defaults to '**/*.map'
  --registry : your NPM registry URL, or the default one for your system.
  --registry-token : an optional registry security token, defaults to the one in your npmrc.
  --strip-prefix : the prefix to the MAP files in your NPM package, defaults to 'dist'.
      For instance, if your MAP files look like './built-app/dist/libraries/js/foo.map'
      and the MAP file itself is hosted at '<APP_URL>/libraries/js/foo.map', then
      the appropriate prefix would be 'built-app/dist'.
`)
  process.exit(1)
}

const pkgName = yargs.argv._[0]
const pkgVersion = yargs.argv._[1]
const appUrl = yargs.argv._[2]
const orgToken = yargs.argv._[3]

const registryUrl = yargs.argv.registry || null
const jsFilePattern = yargs.argv.pattern || '**/*.js'
const mapFilePattern = yargs.argv.pattern || '**/*.map'
const stripPrefix = yargs.argv.stripPrefix || 'dist'

const sentryUrl = yargs.argv.sentryUrl || 'https://app.getsentry.com'
const sentryOrganization = yargs.argv.sentryOrganization || 'sentry'
const sentryProject = yargs.argv.sentryProject || pkgName
const registryToken = yargs.argv.registryToken || null
const releaseUrl = `${sentryUrl}/api/0/organizations/${sentryOrganization}/releases/`
const releaseFilesUrl = `${releaseUrl}${pkgVersion}/files/`

async function main () {

  const dirPath = fs.mkdtempSync(common.PROGRAM_NAME)

  const filePath = await common.downloadPackage(pkgName, pkgVersion, registryUrl, registryToken)

  await exec(`tar -xvzf ${filePath} -C ${dirPath}`)
  console.log(`package extracted to dirname=${dirPath}`)

  await common.createSentryRelease(releaseUrl, sentryProject, pkgVersion, orgToken)

  const sourceFiles = glob.sync(`${dirPath}/package/${jsFilePattern}`)
  for (let jsFile of sourceFiles) {
    console.log(`uploading source file='${jsFile}'`)
    await common.uploadMapFile(jsFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken)
  }

  const sourceMaps = glob.sync(`${dirPath}/package/${mapFilePattern}`)
  for (let mapFile of sourceMaps) {
    console.log(`uploading source map='${mapFile}'`)
    await common.uploadMapFile(mapFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken)
  }
}

main()
