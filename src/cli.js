#!/usr/bin/env node

'use strict';

/* eslint no-console:0 */

const aasync = require('asyncawait/async');
const aawait = require('asyncawait/await');

const glob = require('glob');
const request = require('request');
const temp = require('temp');
const targz = require('tar.gz');
const yargs = require('yargs');

const common = require('./common.js');


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
`);
  process.exit(1);
}

const pkgName = yargs.argv._[0];
const pkgVersion = yargs.argv._[1];
const appUrl = yargs.argv._[2];
const orgToken = new Buffer(`${yargs.argv._[3]}:`).toString('base64');

const registryUrl = yargs.argv.registry || null;
const mapFilePattern = yargs.argv.pattern || '**/*.map';
const stripPrefix = yargs.argv.stripPrefix || 'dist';

const sentryUrl = yargs.argv.sentryUrl || 'https://app.getsentry.com';
const sentryOrganization = yargs.argv.sentryOrganization || 'sentry';
const sentryProject = yargs.argv.sentryProject || pkgName;
const registryToken = yargs.argv.registryToken || null;
const releaseUrl = `${sentryUrl}/api/0/projects/${sentryOrganization}/${sentryProject}/releases/`;
const releaseFilesUrl = `${releaseUrl}${pkgVersion}/files/`;

if (require.main === module) {
  aasync(function() {

    // Download package from NPM and extract it to /tmp
    const filePath = aawait(common.downloadPackage(pkgName, pkgVersion, registryUrl, registryToken));

    // Extract everything from the package
    const dirPath = common.fnAwait(temp.mkdir, common.PROGRAM_NAME);
    aawait(targz().extract(filePath, dirPath));

    // List source maps and upload them
    // XXX(vperron): A slightly better pattern would be to list every JS file, take the last line,
    // and upload that file as the source map. This requires to read all the (potentially very long)
    // source javascript/CSS files and read the last line, which is not very efficient.
    const mapFiles = common.fnAwait(glob, `${dirPath}/${mapFilePattern}`);

    // Create the release if it doesn't exist
    const releasePostResponse = common.fnAwait(request, {
      url: releaseUrl,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${orgToken}`,
      },
      json: true,
      body: {
        version: pkgVersion,
      },
    });
    if (releasePostResponse.statusCode !== 200) {
      const errMessage = releasePostResponse.body.detail || releasePostResponse.body;
      console.log('[warning] release creation: Sentry replied with ' +
                  `${releasePostResponse.statusCode}: '${errMessage}'`);
    }

    // Upload every map file
    for (let mapFile of mapFiles) {
      try {
        common.uploadMapFile(mapFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken);
      } catch (err) {
        console.log(`[error] uploading '${mapFile}'.\n  Sentry replied with ` +
                    `${err.statusCode}: '${err.body}'`);
      }
    }
  })();
}
