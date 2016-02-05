/* eslint strict:0 no-console:0 */

'use strict'

const aawait = require('asyncawait/await')

const request = require('request')
const Promise = require('bluebird')

function awaitFn(fn) {  // accepts other arguments
  const args = Array.prototype.slice.call(arguments, 1)
  const asyncFn = Promise.promisify(fn)
  return aawait(asyncFn.apply(this, args))
}

function awaitRequest(opts) {
  return aawait(new Promise((resolve, reject) => {
    request(opts, function(err, response, data) {
      if (err) {
        console.log(`[error] registry replied with: '${err}'`)
        return reject
      }
      return resolve({response: response, data: data})
    })
  }))
}

module.exports = {
  awaitFn: awaitFn,
  awaitRequest: awaitRequest,
}
