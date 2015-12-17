#!/usr/bin/env node
/* eslint no-console:0 */

'use strict';

//-- Program-wide constants
const PROGRAM_NAME = 'sentry-sourcemaps';


//-- Module requires
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const fs = require('fs');
const npm = require('npm');
const npmlog = require('npmlog');
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
  console.log(`Usage:\n\t${PROGRAM_NAME} [--registry REGISTRY] <PACKAGE> <VERSION>`);
  process.exit(1);
}

const pkgName = yargs.argv._[0];
const pkgVersion = yargs.argv._[1];
const registryUrl = yargs.argv.registry || null;

async (function() {
  const filePath = await (downloadPackage(pkgName, pkgVersion, registryUrl));

  // Extract everything from the package
  const dirPath = fnAwait(temp.mkdir, PROGRAM_NAME);
  await (targz().extract(filePath, dirPath));
  console.log(dirPath);

  //
  // List source maps
  //
  // For every file referred to in the source map, publish it to Sentry
})();
