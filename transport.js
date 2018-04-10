var cadence = require('cadence')
var typer = require('media-typer')
var errorify = require('./errorify')
var Signal = require('signal')
var coalesce = require('extant')
var logger = require('prolific.logger').createLogger('vizsla')
var stream = require('stream')
var unlisten = require('./unlisten')

function Transport () {
}

Transport.prototype.descend = cadence(function (async, descent) {
    var request = descent.request()
    var sent = {
        url: request.url,
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }
    var timeout = null, status = 'requesting', errors = 0, $response = null, caught = false
    var signal = new Signal, wait = null
    var client = request.http.request(request.options)
    async([function () {
        async(function () {
            var xxx = new Signal
            function responded (response) {
                xxx.unlatch(null, response)
            }
            function errored (error) {
                xxx.unlatch(error)
            }
            client.addListener('error', errored)
            client.addListener('response', responded)
            xxx.wait(function () {
                unlisten(client, [{
                    name: 'error', f: errored
                }, {
                    name: 'response', f: responded
                }])
            })
            xxx.wait(async())
            descent.cancel.wait(function () {
                client.abort()
                signal.unlatch('ECONNABORTED', 'aborted')
            })
            if (request.timeout != null) {
                timeout = setTimeout(function () {
                    timeout = null
                    client.abort()
                    signal.unlatch('ETIMEDOUT', 'timedout')
                }, request.timeout)
            }
            wait = signal.wait(function (code, newStatus) {
                // The abort is going to close the socket. If we are waiting on
                // a response there is going to be an error. Otherwise, there is
                // going to be an `"aborted"` message on the response.
                client.once('error', function () { caught = true })
                descent.input.unpipe()
                descent.input.resume()
                xxx.unlatch(code)
                status = newStatus
            })
            // TODO Make this terminate correctly and pipe up a stream
            // correctly.
            if ('payload' in request) {
                client.end(request.payload)
            } else {
                descent.input.pipe(client)
            }
        }, function (response) {
            signal.cancel(wait)
            status = 'responded'
            $response = response
            client.once('error', function (error) {
                signal.notify(error, 'errored')
            })
            // TODO Likely that the only proper response once the first response
            // is done is to truncate. It is my believe that streams are bound
            // to truncate sooner or later and that all applications should have
            // a strategy for when they do truncate. Rather than raise an error
            // here, simply terminate the stream. Whatever is handling the
            // stream then handles it as if it where a truncation. If it is
            // important that it was as a result of a cancel then maybe cancel
            // your read explicitly before you cancel the http request.
            // TODO We do run errors through our pass-through, but maybe we
            // should log them instead? Doesn't seem like such a bad idea to
            // pass through errors since we might seem them pass through on a
            // socket error. Not sure, though. Seems like the HTTP client is
            // capturing those and then sending the error through HTTP client.
            // The decision to pass them through the pass-through stream is so
            // that we can have an error-first callback to get the response then
            // be done with the request object.
            // TODO Why am I not using Interrupt?
            signal.wait(function (code, newStatus) {
            //    status = newStatus
                $response.unpipe()
                $response.resume()
                if (typeof code == 'string') {
                    var error = new Error('vizsla#cancel')
                    error.code = code
                    body.emit('error', error)
                } else {
                    body.emit('error', code)
                }
            })
            $response.once('end', function () {
                $response.unpipe()
                $response.resume()
                response.trailers = $response.trailers
            })
            $response.once('aborted', function () {
                signal.notify('ECONNABORTED', 'aborted')
            })
            var statusCodeClass = Math.floor($response.statusCode / 100)
            response = {
                okay: statusCodeClass == 2,
                statusCode: $response.statusCode,
                statusCodeClass: statusCodeClass,
                statusMessage: $response.statusMessage,
                headers: JSON.parse(JSON.stringify($response.headers)),
                rawHeaders: JSON.parse(JSON.stringify(response.rawHeaders)),
                trailers: null,
                type: typer.parse(coalesce(response.headers['content-type'], 'application/octet-stream'))
            }
            var body = new stream.PassThrough
            $response.pipe(body)
            return [ body, response ]
        })
    }, function (error) {
        signal.cancel(wait)
        var statusCode = typeof error == 'string' ? 504 : 503
        var code = typeof error == 'string' ? error : coalesce(error.code, 'EIO')
        return errorify(statusCode, { 'x-vizsla-errno': code })
    }], function (body, response) {
        // TODO Come back and test this when you've created a Prolific Test library.
        client.on('error', function (error) {
            switch (status) {
            case 'timedout':
            case 'aborted':
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
                break
            case 'requesting':
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
                break
            case 'responded':
                logger.error(status, { errors: ++errors, stack: error.stack, $options: request.options })
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
