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
    HTTP: require('./http'),
    Mock: require('./mock')
}

function UserAgent (middleware) {
    this._bind = []
    this.storage = {}
    this._transport = middleware ? new transport.Mock(middleware) : new transport.HTTP
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
}

UserAgent.prototype.fetch = function () {
    var vargs = slice.call(arguments)
    var callback = (typeof vargs[vargs.length - 1] == 'function') ? vargs.pop() : null
    var request = {
        options: { headers: {} }
    }

    function override (object) {
        if (Array.isArray(object)) {
            object.forEach(override)
        } else {
            if (object.socketPath) {
                override({ url: 'http://' + encodeURIComponent(object.socketPath) + '@unix' })
            }
            for (var key in object) {
                if (key == 'socketPath') {
                    continue
                } else if (key == 'url') {
                    if (request.options.url) {
                        request.options.url = url.resolve(request.options.url, object.url)
                    } else {
                        request.options[key] = object[key]
                        request.baseUrl = url.parse(object.url)
                    }
                } else if (key == 'headers') {
                    for (var header in object.headers) {
                        request.options.headers[header.toLowerCase()] = object.headers[header]
                    }
                } else if (/^(?:response|context|body|payload|grant|token|timeout|post|put|raise|falsify|nullify|plugins|log)$/.test(key)) {
                    request[key] = object[key]
                } else {
                    request.options[key] = object[key]
                }
            }
        }
    }

    this._bind.concat(slice.call(vargs)).forEach(override)

    if (request.plugins == null) {
        request.plugins = []
    }
    if (request.grant == 'cc') {
        request.plugins.push(new ClientCredentials(this))
    }
    if (request.plugins.length) throw new Error

    if (request.put) {
        request.payload = request.put
        request.options.method = 'PUT'
    } else if (request.post) {
        request.payload = request.post
        request.options.method = 'POST'
    } else if (request.body) {
        request.payload = request.body
    }
    if (!request.options.method) {
        request.options.method = request.payload ? 'POST' : 'GET'
    }
    if (request.payload && !request.options.headers['content-type']) {
        request.options.headers['content-type'] = 'application/json'
    }
    request.options.headers['accept'] = 'application/json'
    request.url = url.parse(request.options.url)

    if (request.url.hostname == 'unix') {
        var $ = /^(?:(.*):)?(.*)$/.exec(request.url.auth)
        request.url.auth = coalesce($[1])
        request.options.socketPath = $[2]
    } else if (!request.options.socketPath) {
        request.options.hostname = request.url.hostname
        request.options.port = request.url.port
    }
    request.options.path = url.format({
        pathname: request.url.pathname,
        search: request.url.search,
        hash: request.url.hash
    })

    request.key = request.url.hostname + ':' + request.url.port

    request.input = new stream.PassThrough

    request.response || (request.response = 'parse')

    var fetch = new Fetch(this, request)

    if (callback != null) {
        fetch.response.wait(callback)
    }

    this._fetch(request, fetch, fetch.response.unlatch.bind(fetch.response))

    return fetch
}

UserAgent.prototype._fetch = cadence(function (async, request, fetch) {
    var log = request.log || noop
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
            if (request.token) {
                request.options.headers.authorization = 'Bearer ' + request.token
            }
            if (request.payload && !Buffer.isBuffer(request.payload)) {
                request.payload = new Buffer(JSON.stringify(request.payload))
            }
            if (request.payload) {
                request.options.headers['content-length'] = request.payload.length
            }
            async([function () {
                log('request', sent)
                this._transport.send(request, async())
                if (('payload' in request)) {
                    request.input.write(request.payload)
                }
                request.input.end()
            }, function (error) {
                var body = error.message
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
        }, function (body, response) {
            log('response', {
                sent: sent,
                received: {
                    duration: response.duration,
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: request.response == 'parsed' ? body : (void(0))
                }
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
                        url: request.options.url,
                        headers: {
                            sent: request.options.headers,
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
