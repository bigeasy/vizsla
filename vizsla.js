var byline = require('byline')
var JsonStream = require('./jsons')
var cadence = require('cadence')
var stream = require('stream')
var url = require('url')
var coalesce = require('extant')
var typer = require('media-typer')
var assert = require('assert')
var delta = require('delta')
var noop = require('nop')
var Signal = require('signal')
var slice = [].slice
var interrupt = require('interrupt').createInterrupter('vizsla')
var transport = {
    Network: require('./network'),
    Mock: require('./mock')
}
var ClientCredentials = require('./cc')
var merge = require('./merge')
var defaultify = require('./default')

function UserAgent (middleware) {
    this._bind = []
    this.storage = {}
    this._transport = middleware ? new transport.Mock(middleware) : transport.Network
}

UserAgent.prototype.bind = function () {
    var ua = new UserAgent
    ua._transport = this._transport
    ua._bind = this._bind.concat(Array.prototype.slice.call(arguments))
    ua.storage = this.storage
    return ua
}

function Fetch (ua, request) {
    this.input = new stream.PassThrough
    this.request = new Signal
    this.response = new Signal
    this._cancel = new Signal
}

Fetch.prototype.cancel = function () {
    this._cancel.unlatch()
}

UserAgent.prototype.fetch = function () {
    var vargs = slice.call(arguments)
    var callback = (typeof vargs[vargs.length - 1] == 'function') ? vargs.pop() : null

    var merged = defaultify(merge(this._bind, vargs.slice(), this))
    assert(typeof merged.url == 'object')

    merged.input = new stream.PassThrough

    var fetch = new Fetch

    if (callback != null) {
        fetch.response.wait(callback)
    }

    this._fetch(merged, fetch, fetch.response.unlatch.bind(fetch.response))

    return fetch
}

UserAgent.prototype._fetch = cadence(function (async, request, fetch) {
    var sent = {
        url: request.url,
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }
    async(function () {
        var loop = async.forEach(function (plugin) {
            plugin.before(this, request, async())
        }, function (outcome) {
            if (outcome != null) {
                return [ loop.break, outcome ]
            }
        })(request.plugins)
    }, function (outcome) {
        fetch.request.unlatch(null, outcome == null, fetch)
        if (outcome != null) {
            return [ outcome.body, outcome.response, outcome.buffer ]
        }
        async(function () {
            async([function () {
                this._transport.send(request, fetch._cancel, async())
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
                    var stream = new stream.PassThrough
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
    }, function (parsed, response, buffer) {
        response.okay = Math.floor(response.statusCode / 100) == 2
        async(function () {
            var loop = async.forEach(function (plugin) {
                plugin.after(this, request, response, async())
            }, function (outcome) {
                if (outcome != null) {
                    return [ loop.break, outcome ]
                }
            })(request.plugins)
        }, function (outcome) {
            if (outcome != null) {
// TODO Outcome is an array to return.
                return [ outcome.body, outcome.response, outcome.buffer ]
            }
            if (!response.okay) {
                if (request.raise) {
                    throw interrupt('fetch', {
                        statusCode: response.statusCode,
                        url: request.url,
                        headers: {
                            sent: request.headers,
                            received: response.headers
                        }
                    }, {
                        cause: coalesce(response.cause),
                        properties: {
                            response: response,
                            body: parsed,
                            buffer: buffer
                        }
                    })
                } else if (request.nullify) {
                    return [ async.break, null ]
                } else if (request.falsify) {
                    return [ async.break, false ]
                }
            }
            return request.nullify || request.falsify ? [ parsed ] : [ parsed, response, buffer ]
        })
    })
})

module.exports = UserAgent
