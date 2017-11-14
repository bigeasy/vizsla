var cadence = require('cadence')
var _stream = require('stream')
var typer = require('media-typer')
var delta = require('delta')
var extractOptions = require('../options')
var errorify = require('../errorify')
var http = require('http')
var defaultify = require('../default')
var Signal = require('signal')
var noop = require('nop')
var coalesce = require('extant')
var logger = require('prolific.logger').createLogger('vizsla')

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
    var timeout = null, status = 'requesting', errors = 0, $response = null
    async([function () {
        async(function () {
            var options = extractOptions(request)
            var client = request.http.request(options)
            client.on('error', function (error) {
                console.log('errrored')
                switch (status) {
                case 'requesting':
                    logger.error(status, { errors: ++errors, stack: error.stack, $options: options })
                    break
                case 'responded':
                    logger.error(status, { errors: ++errors, stack: error.stack, $options: options })
                    $response.emit('error', error)
                    break
                }
            })
            client.on('response', function () { console.log('yes response') })
            var wait = delta(async()).ee(client).on('response')
            client.on('response', function () { console.log('yes response 2') })
            var signal = new Signal
            fetch._cancel.wait(function () {
                signal.unlatch('ECONNABORTED')
            })
            if (request.timeout != null) {
                timeout = setTimeout(function () {
                    timeout = null
                    signal.unlatch('ETIMEDOUT')
                }, request.timeout)
            }
            signal.wait(function (error) {
                client.once('error', noop)
                request.input.unpipe()
                client.abort()
                wait.cancel([ error ])
            })
            // TODO Make this terminate correctly and pipe up a stream
            // correctly.
            if (('payload' in request)) {
                client.write(request.payload)
            } else {
                fetch.input.pipe(client)
            }
            // TODO Should we close ourselves based on headers or a flag? There
            // should be a flag to defeat this behavior, maybe, or else maybe if
            // you have an API where you need to pass a body to DELETE you need
            // to use `http` directly to accommodate that. Should be more like
            // cURL, defaults and defeats.
            if (('payload' in request) || /^HEAD|DELETE|GET$/.test(request.method)) {
                console.log('-ending-')
                client.end()
            }
        }, function (response) {
            console.log('endering', status)
            status = 'responded'
            $response = response
            console.log('endering', status)
            response.once('end', function () {
                _response.trailers = response.trailers
            })
            var _response = {
                statusCode: response.statusCode,
                statusMessage: response.statusMessage,
                headers: JSON.parse(JSON.stringify(response.headers)),
                rawHeaders: JSON.parse(JSON.stringify(response.rawHeaders)),
                trailers: null,
                type: typer.parse(coalesce(response.headers['content-type'], 'application/octet-stream'))
            }
            return [ response, _response ]
        })
    }, function (error) {
        console.log('.', error.stack)
        var statusCode = typeof error == 'string' ? 504 : 503
        var code = typeof error == 'string' ? error : error.code
        return errorify(statusCode, { 'x-vizsla-errno': code })
    }], function (response, _request) {
        if (timeout) {
            clearTimeout(timeout)
        }
        return [ response, _request ]
    })
})

module.exports = Transport
