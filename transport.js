var cadence = require('cadence')
var _stream = require('stream')
var typer = require('media-typer')
var delta = require('delta')
var defaultify = require('./default')
var byline = require('byline')
var JsonStream = require('./jsons')

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
            request.input.end()
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
            switch (request.response) {
            case 'stream':
                var stream = new _stream.PassThrough
                stream.write(body)
                stream.end()
                body = stream
                break
            case 'buffer':
                body = new Buffer(body)
                break
            }
            return [ async.break, body, response ]
        }], function (response, _request) {
            var chunks = []
            var type = typer.parse(response.headers['content-type'] || 'application/octet-stream')
            var fullType = type.type + '/' + type.subtype
            async(function () {
                if (request.response == 'parse' && fullType == 'application/json-stream') {
                    return [ response.pipe(byline()).pipe(new JsonStream()) ]
                }
                if (request.response == 'stream') {
                    return [ response, request ]
                }
                async(function () {
                    delta(async())
                        .ee(_request)
                        .ee(response)
                            .on('data', [])
                            .on('end')
                }, function (chunks) {
                    return [ Buffer.concat(chunks) ]
                })
            }, function (buffer) {
                response.duration = Date.now() - sent.when
                response.sent = sent
                var parsed = buffer
                if (request.response == 'stream') {
                    return [ parsed, response, null ]
                } else if (request.response == 'buffer') {
                    return [ parsed, response, buffer  ]
                }
                switch (type.type + '/' + type.subtype) {
                case 'application/json-stream':
                    return [ buffer, response ]
                case 'application/json':
                    try {
                        parsed = JSON.parse(buffer.toString())
                    } catch (e) {
                        parsed = buffer.toString()
                    }
                    break
                case 'text/html':
                case 'text/plain':
                    parsed = buffer.toString()
                    break
                }
                return [ parsed, response, buffer ]
            })
        })
    })
})

module.exports = Transport
