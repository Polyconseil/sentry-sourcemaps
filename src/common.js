/* eslint no-console:0 */

'use strict';

const aasync = require('asyncawait/async');
const aawait = require('asyncawait/await');

const fs = require('fs');
const npm = require('npm');
const npmlog = require('npmlog');
const path = require('path');
const request = require('request');
const temp = require('temp');
const Promise = require('bluebird');
const RegistryClient = require('npm-registry-client');
const util = require('util');


const PROGRAM_NAME = 'sentry-sourcemaps';


class AsyncSilentNpmClient extends RegistryClient {
  constructor(_config) {
    const npmConfig = util._extend(npm.config);
    npmConfig.log = npmlog;
    npmConfig.log.level = 'silent';
    super(npmConfig);
  }

  getAsync(url, params) {
    return new Promise((resolve, reject) => {
      this.get(url, params, function(_err, _data, _raw, res) {
        if (_err && _err.code) {
          console.log(`[error] NPM replied with: '${_err}'`);
          return reject;
        }
        return resolve(res);
      });
    });
  }
}

function fnAwait(fn) {  // accepts other arguments
  const args = Array.prototype.slice.call(arguments, 1);
  const asyncFn = Promise.promisify(fn);
  return aawait(asyncFn.apply(this, args));
}

function strippedPathAfter(str, prefix) {
  const lastPart = str.split(prefix)[1];
  return lastPart.replace(/^\/|\/$/g, '');
}

const streamToTempFile = aasync(function(buffer) {
  const temporaryFile = fnAwait(temp.open, PROGRAM_NAME);
  fs.close(temporaryFile.fd);
  fs.writeFileSync(temporaryFile.path, buffer);
  return temporaryFile.path;
});

const downloadPackage = aasync(function(pkgName, pkgVersion, pRegistryUrl) {

  if (pRegistryUrl) {
    fnAwait(npm.load, {loaded: false, loglevel: 'silent', registry: pRegistryUrl});
  } else {
    fnAwait(npm.load, {loaded: false, loglevel: 'silent'});
  }

  const registryUrl = pRegistryUrl || npm.config.get('registry');

  const pkgData = fnAwait(npm.commands.show, [`${pkgName}@${pkgVersion}`], {loglevel: 'silent'});
  const tarballUrl = pkgData[pkgVersion].dist.tarball;

  const client = new AsyncSilentNpmClient(npm.config);
  const npmResponse = aawait(client.getAsync(tarballUrl, {auth: npm.config.getCredentialsByURI(registryUrl)}));
  return streamToTempFile(npmResponse.body, PROGRAM_NAME);
});

function uploadMapFile(mapFile, dirPath, stripPrefix, releaseFilesUrl, appUrl, orgToken) {
  const mapFilePackagePath = strippedPathAfter(mapFile, path.join(dirPath, 'package'));
  const mapFileStrippedPath = strippedPathAfter(mapFilePackagePath, stripPrefix);

  const response = fnAwait(request, {
    url: releaseFilesUrl,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${orgToken}`,
    },
    formData: {
      file: fs.createReadStream(mapFile),
      name: `${appUrl}/${mapFileStrippedPath}`,
    },
  });
  if ([200, 201, 409].indexOf(response.statusCode) === -1) {
    throw response;
  }
}

module.exports = {
  PROGRAM_NAME: PROGRAM_NAME,

  fnAwait: fnAwait,
  downloadPackage: downloadPackage,
  uploadMapFile: uploadMapFile,
};
