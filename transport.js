var cadence = require('cadence')
var typer = require('media-typer')
var delta = require('delta')
var extractOptions = require('./options')
var errorify = require('./errorify')
var defaultify = require('./defaultify')
var Signal = require('signal')
var noop = require('nop')
var coalesce = require('extant')
var logger = require('prolific.logger').createLogger('vizsla')
var stream = require('stream')

var Instance = 0
function Transport () {
}

Transport.prototype.fetch = cadence(function (async, descent) {
    var instance = ++Instance
    var request = descent.request()
    var sent = {
        url: request.url,
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }
    var timeout = null, status = 'requesting', errors = 0, $response = null, caught = false
    var client = request.http.request(request.options)
    async([function () {
        async(function () {
            var wait = delta(async()).ee(client).on('response')
            var signal = new Signal
            descent.cancel.wait(function () { signal.unlatch('ECONNABORTED') })
            if (request.timeout != null) {
                timeout = setTimeout(function () {
                    timeout = null
                    signal.unlatch('ETIMEDOUT')
                }, request.timeout)
            }
            signal.wait(function (error) {
                // The abort is going to close the socket. If we are waiting on
                // a response there is going to be an error. Otherwise, there is
                // going to be an `"aborted"` message on the response.
                if (status == 'requesting') {
                    client.once('error', function () {
                        caught = true
                    })
                }
                status = 'aborted'
                descent.input.unpipe()
                client.abort()
                wait.cancel([ error ])
            })
            // TODO Make this terminate correctly and pipe up a stream
            // correctly.
            if ('payload' in request) {
                client.end(request.payload)
            } else {
                descent.input.pipe(client)
            }
        }, function (response) {
            status = 'responded'
            $response = response
            client.once('error', function (error) {
                $response.unpipe()
                $response.resume()
            })
            $response.once('end', function () {
                response.trailers = $response.trailers
            })
            response = {
                statusCode: $response.statusCode,
                statusMessage: $response.statusMessage,
                headers: JSON.parse(JSON.stringify($response.headers)),
//                rawHeaders: JSON.parse(JSON.stringify(response.rawHeaders)),
                trailers: null,
                type: typer.parse(coalesce(response.headers['content-type'], 'application/octet-stream'))
            }
            var body = new stream.PassThrough
            $response.pipe(body)
            return [ body, response ]
        })
    }, function (error) {
        var statusCode = typeof error == 'string' ? 504 : 503
        var code = typeof error == 'string' ? error : coalesce(error.code, 'EIO')
        return errorify(statusCode, { 'x-vizsla-errno': code })
    }], function (body, response) {
        // TODO Come back and test this when you've created a Prolific Test library.
        client.on('error', function (error) {
            switch (status) {
            case 'aborted':
                console.log(caught)
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
                break
            case 'requesting':
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
                break
            case 'responded':
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
                body.emit('error', error)
                break
            }
        })
        if (timeout) {
            clearTimeout(timeout)
        }
        return [ body, response ]
    })
})

module.exports = Transport
