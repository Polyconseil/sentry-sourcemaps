/* eslint strict:0 no-console:0 */

'use strict'

const aawait = require('asyncawait/await')

const request = require('request')
const Promise = require('bluebird')

function awaitFn (fn) {  // accepts other arguments
  const args = Array.prototype.slice.call(arguments, 1)
  const asyncFn = Promise.promisify(fn)
  return aawait(asyncFn.apply(this, args))
}

/**
 * Waits for the completion of a HTTP request.
 *
 * @param opts
 * @returns [response: HttpResponse, data: raw body]
 */
function awaitRequest (opts) {
  return aawait(new Promise((resolve, reject) => {
    request(opts, function (err, response, data) {
      if (err) {
        reject(err)
        console.log(`[error] registry replied with: '${err}'`)
        return reject
      }
      return resolve({response: response, data: data})
    })
  }))
}

/**
 * Almost the same, but only for authenticated GET.
 *
 * Also, may throw if an error occurred.
 *
 * @param url:String, the URL to GET from.
 * @param token:String, the Bearer token to be passed.
 * @param encoding:String, the eventual encoding.
 * @returns [response: HttpResponse, data: raw body]
 */
function awaitAuthenticatedGet (url, token, encoding) {

  const ans = awaitRequest({
    url: url,
    method: 'GET',
    encoding: encoding,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  if (ans.response.statusCode !== 200) throw JSON.parse(ans.response.body).error

  return ans
}

module.exports = {
  awaitFn: awaitFn,
  awaitRequest: awaitRequest,
  awaitAuthenticatedGet: awaitAuthenticatedGet,
}
