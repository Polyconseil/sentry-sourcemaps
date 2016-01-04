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

if (!yargs.argv._ || yargs.argv._.length !== 2) {
  console.log(`
Usage:  ${PROGRAM_NAME} [--registry REGISTRY] [--pattern PATTERN] <PACKAGE> <VERSION>

       * REGISTRY defaults to your default NPM registry (from your npmrc)
       * PATTERN defaults to '**/*.map'
`);
  process.exit(1);
}

const pkgName = yargs.argv._[0];
const pkgVersion = yargs.argv._[1];
const registryUrl = yargs.argv.registry || null;
const mapFilePattern = yargs.argv.pattern || '**/*.map';

const sentryUrl = yargs.argv.sentryUrl || 'https://app.getsentry.com/';
const organizationSlug = yargs.argv.organizationSlug || 'polyconseil';
const sentryProject = 'foobar';
const releaseFilesUrl = `${sentryUrl}/api/0/projects/${organizationSlug}/${sentryProject}/releases/${pkgVersion}/files/`;

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
  // curl http://127.0.0.1:9000/api/0/projects/sentry/foobar/releases/ -H "Authorization: Basic YjliMzA1ODE4NmMwNGI1ZThiMjI4NzJkZjVjMDg0ZDA6" -X POST -d '{"version": "1.2.12"}' -H 'Content-Type: application/json'

  for (const mapFile of mapFiles) {
    console.log(mapFile);
    //  curl https://app.getsentry.com/api/0/projects/:organization_slug/:project_slug/releases/2da95dfb052f477380608d59d32b4ab9/files/ \
    //   -u [api_key]: \
    //   -X POST \
    //   -F file=@app.js.map \
    //   -F name="http://example.com/app.js.map"
    const reqOptions = {
      url: releaseFilesUrl,
      method: 'POST',
      headers: {
        'Authorization': 'Basic YjliMzA1ODE4NmMwNGI1ZThiMjI4NzJkZjVjMDg0ZDA6',
        'Content-Type': 'application/json',
      },
    };

    const dataStream = fs.createReadStream(mapFile);
    dataStream.pipe(request(reqOptions, function (err, resp, body) {
      if (err) {
        console.log('Error!', err);
      } else {
        console.log('URL: ' + body);
      }
    }));
  }

})();
