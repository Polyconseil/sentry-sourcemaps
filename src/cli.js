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
const streamToTempFile = async (function(buffer, prefix) {
  const temporaryFile = await (temp.openAsync(prefix));
  fs.close(temporaryFile.fd);
  const wstream = fs.createWriteStream(temporaryFile.path);
  wstream.write(buffer);
  wstream.end();
  return temporaryFile.path;
});

const downloadPackage = async (function(pkgName, pkgVersion, registryUrl) {
  Promise.promisifyAll(npm);
  Promise.promisifyAll(temp);

  await (npm.loadAsync({loaded: false, loglevel: 'silent'}));
  const npmShowAsync = Promise.promisify(npm.commands.show);
  registryUrl = registryUrl || npm.config.get('registry');

  const pkgData = await (npmShowAsync([`${pkgName}@${pkgVersion}`], {loglevel: 'silent'}));
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
  console.log(`Downloaded as: '${filePath}'`);
})();
