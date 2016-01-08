# sentry-sourcemaps

[![Build Status](https://travis-ci.org/Polyconseil/sentry-sourcemaps.svg?branch=master)](https://travis-ci.org/Polyconseil/sentry-sourcemaps)
[![codecov.io](https://codecov.io/github/Polyconseil/sentry-sourcemaps/coverage.svg?branch=master)](https://codecov.io/github/Polyconseil/sentry-sourcemaps?branch=master)

Sentry 8 comes with a brand new [Releases API][release_api] that finally enables us to
upload JavaScript Source Maps directly to Sentry, and avoid the costly and fragile
remote fetching of the source maps from our application servers.

This tool is intended to do just that: upload your application's source maps to
Sentry along with every release.

It does that seamlessly by downloading your application's package from the NPM
registry (even private ones, of course), looking at the source maps within it,
and gracefully uploading them to your Sentry instance.


## How it works

Here is a sample CLI usage:

    $ npm install -g sentry-sourcemaps
    $ sentry-sourcemaps --sentry-url https://my.sentry.url foobar_app 1.0.0 https://foobar.org TOKEN

As you can see, there are 4 mandatory parameters:

* Your application's NPM package name;
* The desired release version;
* The URL onto which your application is deployed;
* The Sentry Token needed to push to the Sentry API.

The application will [create a release][create_release] and upload every MAP file for your app onto
the designed Sentry server.


## Usage

Typical command line:

    sentry-sourcemaps [OPTIONS] <PACKAGE> <VERSION> <APP_URL> <ORG_TOKEN>

### Parameters

##### PACKAGE
 is the NPM package name for your application on the registry.
##### VERSION
 is the target version of that package.
##### APP_URL
 is the URL of the deployed application, that is linked with Sentry.
##### ORG_TOKEN
 is the Sentry API Organization-wide token.

### Options

##### --sentry-url
The URL to your Sentry server. Defaults to 'https://app.getsentry.com'

##### --sentry-organization
The organization to which the project belongs. Defaults to 'sentry'

##### --sentry-project
The name under which your project is named within Sentry. Defaults to <PACKAGE>.

##### --pattern
The MAP files search pattern. Defaults to '**/*.map'

##### --registry
Your NPM registry URL, or the default one for your system.

##### --strip-prefix

The prefix to the MAP files in your NPM package, defaults to 'dist'.

For instance, if your MAP files look like './built-app/dist/libraries/js/foo.map'
and the MAP file itself is hosted at '<APP_URL>/libraries/js/foo.map', then
the appropriate prefix would be 'built-app/dist'.

## Contributing

At this stage, any PR is welcome !

Especially, there's room for improvement with our Promisify/Asyncawait approach,
the rejection clauses of many promises are not clearly validated yet.

## Contributors

Victor Perron


## License

MIT

[release_api]: https://docs.getsentry.com/hosted/clients/javascript/sourcemaps/#uploading-source-maps-to-sentry
[create_release]:https://docs.getsentry.com/hosted/api/releases/post-project-releases/
