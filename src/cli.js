#!/usr/bin/env node

/* eslint no-console:0 */

import yargs from 'yargs';

const PROGRAM_NAME = 'sentry-sourcemaps';

// Process arguments
const argv = yargs.argv;
const files = argv._.sort() || [];
const outputFile = argv.output || null;

if (!files || files.length === 0) {
  console.log(`Usage:\n\t${PROGRAM_NAME} [--output OUTFILE] <FILES>`);
  process.exit(1);
}
