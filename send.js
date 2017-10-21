var cadence = require('cadence')
var delta = require('delta')
var assert = require('assert')
var extractOptions = require('./options')

module.exports = cadence(function (async, http, request, cancel) {
    var options = extractOptions(request)
    var client = http.request(options)
    async(function () {
        var wait = delta(async()).ee(client).on('response')
        cancel.wait(function () {
            client.once('error', function (error) { assert(error.message == 'socket hang up') })
            request.input.unpipe()
            client.abort()
            var error = new Error('socket hang up')
            error.code = 'ECONNRESET'
            wait.cancel([ error ])
        })
        if (request.timeout) {
            client.setTimeout(request.timeout, function () { cancel.unlatch() })
        }
        // TODO Fetch and Reqest can have the same `PassThrough`.
        request.input.pipe(client)
    }, function (response) {
        return [ response, client ]
    })
})
