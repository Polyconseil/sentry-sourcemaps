const fs = require('fs');
const npm = require('npm');
const temp = require('temp');
const RegistryClient = require('npm-registry-client');

const PKG = 'sales-ui';
const VERSION = '0.3.6';

npm.load({loaded: false, loglevel: 'silent'}, function() {
  npm.commands.show([`${PKG}@${VERSION}`], {loglevel: 'silent'}, function(_er, data) {
    const tarball = data[VERSION].dist.tarball;
    console.log(`Found tarball for '${PKG}': ${tarball}`);

  });

  var registryUrl = npm.config.get('registry')
  var auth = npm.config.getCredentialsByURI(registryUrl)
  var RegistryClient = require('npm-registry-client')

  console.log(auth);
  npm.config.log = null;
  var client = new RegistryClient(npm.config)
  var params = {timeout: 1000, auth: auth}

  client.get('https://npm.polydev.blue/sales-ui/-/sales-ui-0.3.6.tgz', params, function (error, data, raw, res) {
    temp.open(PKG, function(err, info) {
      if (!err) {
        console.log(res);
        fs.close(info.fd);
        var wstream = fs.createWriteStream(info.path);
        wstream.write(res.body);
        wstream.end();
        console.log(`Downloaded as: '${info.path}'`);
      }
    });
    // error is an error if there was a problem.
    // data is the parsed data object
    // raw is the json string
    // res is the response from couch
  })
});
