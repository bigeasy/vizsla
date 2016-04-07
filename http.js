var Delta = require('delta')
var cadence = require('cadence')
var typer = require('media-typer')
var interrupt = require('interrupt').createInterrupter('bigeasy.vizsla.transport')

function Transport (logger) {
    this._logger = logger
}

Transport.prototype.send = cadence(function (async, request) {
    var logger = this._logger
    var sent = {
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }
    var http
    if (request.url.protocol == 'https:') {
        http = require('https')
    } else {
        http = require('http')
    }
    http.globalAgent.maxSockets = 5000
    async([function () {
        var client = http.request(request.options)
        new Delta(async()).ee(client).on('response')
        if (request.payload) {
            client.write(request.payload)
        }
        if (request.timeout) {
            client.setTimeout(request.timeout, function () {
                client.abort()
            })
        }
        client.end()
    }, function (error) {
        sent.duration = Date.now() - sent.when
        var body = new Buffer(JSON.stringify({ message: error.message, errno: error.code }))
        var response = {
            statusCode: 599,
            errno: error.code,
            okay: false,
            sent: sent,
            headers: {
                'content-length': body.length,
                'content-type': 'application/json'
            }
        }
        logger('response', {
            status: 'exceptional',
            options: request.options,
            sent: request.payload,
            received: JSON.parse(body.toString()),
            statusCode: response.statusCode,
            headers: response.headers
        })
        if (request.raise) {
            throw interrupt(new Error('fetch'), { response: response, parsed: JSON.parse(body.toString()), body: body })
        }
        return [ async.break, JSON.parse(body.toString()), response, body ]
    }], function (response) {
        var chunks = []
        async(function () {
            new Delta(async()).ee(response)
                 .on('data', function (chunk) { chunks.push(chunk) })
                 .on('end')
        }, function () {
            sent.duration = Date.now() - sent.when
            response.sent = sent
            var parsed = null
            var body = Buffer.concat(chunks)
            var parsed = body
            var display = null
            var type = typer.parse(response.headers['content-type'] || 'application/octet-stream')
            switch (type.type + '/' + type.subtype) {
            case 'application/json':
                try {
                    display = parsed = JSON.parse(body.toString())
                } catch (e) {
                    display = body.toString()
                }
                break
            case 'text/html':
            case 'text/plain':
                display = body.toString()
                break
            }
            response.okay = Math.floor(response.statusCode / 100) == 2
            logger('response', {
                status: 'responded',
                options: request.options,
                sent: request.payload,
                received: display,
                parsed: parsed,
                statusCode: response.statusCode,
                headers: response.headers
            })
            return [ parsed, response, body ]
        })
    })
})

module.exports = Transport
