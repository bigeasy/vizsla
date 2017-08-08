var cadence = require('cadence')
var _stream = require('stream')
var typer = require('media-typer')
var delta = require('delta')
var defaultify = require('./default')
var byline = require('byline')
var JsonStream = require('./jsons')
var Converter = require('./converter')

function Transport () {
}

Transport.prototype.fetch = cadence(function (async, ua, request, fetch) {
    request = defaultify(request)
    var sent = {
        url: request.url,
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }
    async(function () {
        async([function () {
            ua._transport.send(request, fetch._cancel, async())
            // TODO Make this terminate correctly and pipe up a stream
            // correctly.
            if (('payload' in request)) {
                request.input.write(request.payload)
            }
            // TODO Should we close ourselves based on headers or a flag? There
            // should be a flag to defeat this behavior, maybe, or else maybe if
            // you have an API where you need to pass a body to DELETE you need
            // to use `http` directly to accommodate that. Should be more like
            // cURL, defaults and defeats.
            if (
                ('payload' in request) ||
                request.method == 'HEAD' ||
                request.method == 'DELETE' ||
                request.method == 'GET'
            ) {
                request.input.end()
            }
        }, function (error) {
            var body = error.message
            console.log(error.stack)
            var response = {
                statusCode: 599,
                duration: Date.now() - sent.when,
                errno: error.code,
                okay: false,
                sent: sent,
                cause: error,
                headers: {
                    'content-length': body.length,
                    'content-type': 'text/plain'
                }
            }
            return [ async.break, new Converter(response.headers, new Buffer(body), 'buffer'), response ]
        }], function (response, _request) {
            return [ new Converter(response.headers, response, 'stream'), response ]
        })
    })
})

module.exports = Transport
