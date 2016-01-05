#!/usr/bin/env node
/* eslint no-console:0 */

'use strict';

//-- Program-wide constants
const PROGRAM_NAME = 'sentry-sourcemaps';


//-- Module requires
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const fs = require('fs');
const glob = require('glob');
const npm = require('npm');
const npmlog = require('npmlog');
const path = require('path');
const request = require('request');
const temp = require('temp');
const Promise = require('bluebird');
const RegistryClient = require('npm-registry-client');
const util = require('util');
const targz = require('tar.gz');
const yargs = require('yargs');


//-- Type definitions
class AsyncSilentNpmClient extends RegistryClient {
  constructor(config) {
    const npmConfig = util._extend(npm.config);
    npmConfig.log = npmlog;
    npmConfig.log.level = 'silent';
    super(npmConfig);
  }

  getAsync(url, params) {
    return new Promise((resolve, reject) => {
      this.get(url, params, (_err, _data, _raw, res) => resolve(res))
    })
  }
}


//-- Helper functions
function fnAwait(fn) {  // accepts other arguments
  const args = Array.prototype.slice.call(arguments, 1);
  const asyncFn = Promise.promisify(fn);
  return await (asyncFn.apply(this, args));
}

function strippedPathAfter(str, prefix) {
  const path = str.split(prefix)[1];
  return path.replace(/^\/|\/$/g, '');
}

const streamToTempFile = async (function(buffer) {
  const temporaryFile = fnAwait(temp.open, PROGRAM_NAME);
  fs.close(temporaryFile.fd);
  const wstream = fs.createWriteStream(temporaryFile.path);
  wstream.write(buffer);
  wstream.end();
  return temporaryFile.path;
});

const downloadPackage = async (function(pkgName, pkgVersion, registryUrl) {
  fnAwait(npm.load, {loaded: false, loglevel: 'silent'});

  registryUrl = registryUrl || npm.config.get('registry');

  const pkgData = fnAwait(npm.commands.show, [`${pkgName}@${pkgVersion}`], {loglevel: 'silent'});
  const tarballUrl = pkgData[pkgVersion].dist.tarball;

  const client = new AsyncSilentNpmClient(npm.config);
  const npmResponse = await (client.getAsync(tarballUrl, {auth: npm.config.getCredentialsByURI(registryUrl)}));
  return streamToTempFile(npmResponse.body, PROGRAM_NAME);
});


//-- Main execution

if (!yargs.argv._ || yargs.argv._.length !== 4) {
  console.log(`
Usage:  ${PROGRAM_NAME} [OPTIONS] <PACKAGE> <VERSION> <APP_URL> <ORG_TOKEN>

  PACKAGE is the NPM package name for your application on the registry.
  VERSION is the target version of that package.
  APP_URL is the URL of the deployed application, that is linked with Sentry.
  ORG_TOKEN is the Sentry API Organization-wide token.

  OPTIONS are to be chosen within:

  Sentry Options
  ==============

  --sentry-url : the URL to your Sentry server. Defaults to 'https://app.getsentry.com/'
  --sentry-organization : the organization to which the project belongs. Defaults to 'sentry'
  --sentry-project : the name under which your project is named within Sentry. Defaults to <PACKAGE>.

  Other Options
  =============

  --pattern : the MAP files search pattern. Defaults to '**/*.map'
  --registry : your NPM registry URL, or the default one for your system.
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

const sentryUrl = yargs.argv.sentryUrl || 'https://app.getsentry.com/';
const sentryOrganization = yargs.argv.sentryOrganization || 'sentry';
const sentryProject = yargs.argv.sentryProject || pkgName;
const releaseUrl = `${sentryUrl}/api/0/projects/${sentryOrganization}/${sentryProject}/releases/`;
const releaseFilesUrl = `${releaseUrl}${pkgVersion}/files/`;


async (function() {
  const filePath = await (downloadPackage(pkgName, pkgVersion, registryUrl));

  // Extract everything from the package
  const dirPath = fnAwait(temp.mkdir, PROGRAM_NAME);
  await (targz().extract(filePath, dirPath));

  // List source maps and upload them
  // XXX(vperron): A slightly better pattern would be to list every JS file, take the last line,
  // and upload that file as the source map. This requires to read all the (potentially very long)
  // source javascript/CSS files and read the last line, which is not very efficient.
  const mapFiles = fnAwait(glob, `${dirPath}/${mapFilePattern}`);

  // Create the release if it doesn't exist
  const response = fnAwait (request, {
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
  if (response.statusCode != 200) {
    console.log(`Error when creating release. Sentry replied with: '${response.body.detail}'`);
  }

  // Upload every map file
  for (const mapFile of mapFiles) {
    const mapFilePackagePath = strippedPathAfter(mapFile, path.join(dirPath, 'package'));
    const mapFileStrippedPath = strippedPathAfter(mapFilePackagePath, stripPrefix);

    const response = fnAwait (request, {
      url: releaseFilesUrl,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${orgToken}`,
      },
      formData: {
        file: fs.createReadStream(mapFile),
        name: `${appUrl}/${mapFileStrippedPath}`,
      }
    });
    if ([200, 409].indexOf(response.statusCode) !== 0) {
      console.log(`Successfully uploaded '${mapFilePackagePath}'`);
    } else {
      console.log(`Error when uploading '${mapFilePackagePath}'. Sentry replied with: '${response.body.detail}'`);
    }
  }
})();
