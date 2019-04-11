var assert = require('assert')
var cadence = require('cadence')
var typer = require('content-type')
var Signal = require('signal')
var coalesce = require('extant')
var logger = require('prolific.logger').createLogger('vizsla')
var stream = require('stream')
var http = require('http')
var unlisten = require('./unlisten')
var delta = require('delta')
var Message = require('./message')

function Transport () {
    this.cancel = new Signal
}

// TODO Does cancel also cancel negotiation?

// TODO You need to consider whether you would like to use 503 with a retry
// after header to implement back-pressure. This distinquishes between an
// overloaded server and one that has shutdown.

Transport.prototype.descend = cadence(function (async, descent) {
    if (this.cancel.open != null) {
        throw {
            statusCode: 502,
            code: 'ECONNABORTED',
            module: 'vizsla/transport'
        }
    }
    var signal = new Signal, wait = null
    var timeout = null, status = 'requesting', errors = 0, caught = false
    var properties = descent.properties()
    var request = properties.http.request(properties.options)
    request.on('error', properties.error)
    var cancel = {
        descent: null,
        transport: this.cancel.wait(descent.cancel, 'unlatch')
    }
    async([function () {
        if (timeout != null) {
            clearTimeout(timeout)
        }
    }], [function () {
        var response = delta(async()).ee(request).on('response').on('finish')
        cancel.descent = descent.cancel.wait(function (code) {
            request.abort()
            response.cancel([ code ])
        })
        if (properties.timeout != null) {
            timeout = setTimeout(function () {
                timeout = null
                descent.cancel.unlatch('ETIMEDOUT')
            }, properties.timeout)
        }
        // TODO Make this terminate correctly and pipe up a stream
        // correctly.
        if ('buffer' in properties) {
            request.end(properties.buffer)
        } else {
            descent.input.pipe(request)
        }
    }, function (error) {
        // If we closed the connection with a client abort then we are going to
        // get a single `ECONNRESET` error that we went to swallow since we've
        // reported the error ourselves with alternative codes.
        if (error === 'ECONNABORTED' || error === 'ETIMEDOUT') {
            request.once('error', function (error) { assert(error.code == 'ECONNRESET') })
        }
        this.cancel.cancel(cancel.transport)
        descent.input.unpipe()
        descent.input.resume()
        throw  {
            stage: 'negotiation',
            statusCode: 502,
            module: 'vizsla/transport',
            code: typeof error == 'string' ? error : coalesce(error.code, error.message)
        }
    }], function (response) {
        descent.cancel.cancel(cancel.descent)
        descent.response = response
        var statusCodeClass = Math.floor(response.statusCode / 100)
        var message = new Message(this, cancel.transport, descent, request, response, {
            aborted: false,
            completed: false,
            okay: statusCodeClass == 2,
            statusCode: response.statusCode,
            statusCodeClass: statusCodeClass,
            statusMessage: response.statusMessage,
            headers: JSON.parse(JSON.stringify(response.headers)),
            rawHeaders: JSON.parse(JSON.stringify(response.rawHeaders)),
            trailers: null,
            type: typer.parse(coalesce(response.headers['content-type'], 'application/octet-stream')),
            request: properties.request
        })
        return [ message, message.transaction ]
    })
})

module.exports = Transport
