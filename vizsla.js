var cadence = require('cadence')
var url = require('url')
var typer = require('media-typer')
var assert = require('assert')
var Delta = require('delta')
var slice = [].slice
var logger = require('prolific.logger').createLogger('bigeasy.vizsla')
var interrupt = require('interrupt').createInterrupter('bigeasy.vizsla')
var transport = {
    HTTP: require('./http'),
    Mock: require('./mock')
}
var ClientCredentials = require('./cc')

function UserAgent (middleware) {
    this.storage = {}
    this._transport = middleware ? new transport.Mock(middleware) : new transport.HTTP
}

UserAgent.prototype.fetch = cadence(function (async) {
    var request = {
        options: { headers: {} }
    }

    function override (object) {
        if (Array.isArray(object)) {
            object.forEach(override)
        } else {
            for (var key in object) {
                if (key == 'url') {
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
                } else if (/^(?:context|body|payload|grant|token|timeout|post|put|raise|nullify|plugins)$/.test(key)) {
                    request[key] = object[key]
                } else {
                    request.options[key] = object[key]
                }
            }
        }
    }

    slice.call(arguments, 1).forEach(override)

    if (request.plugins == null) {
        request.plugins = []
    }
    if (request.grant == 'cc') {
        request.plugins.push(new ClientCredentials(this))
    }

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

    if (!request.options.socketPath) {
        request.options.hostname = request.url.hostname
        request.options.port = request.url.port
    }
    request.options.path = url.format({
        pathname: request.url.pathname,
        search: request.url.search,
        hash: request.url.hash
    })

    request.key = request.url.hostname + ':' + request.url.port

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
        if (outcome != null) {
            return [ outcome.body, outcome.response, outcome.buffer ]
        }
        async(function () {
// TODO Indent much.
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
                logger.trace('request', sent)
                this._transport.send(request, async())
            }, function (error) {
                var body = new Buffer(JSON.stringify({ message: error.message, errno: error.code }))
                var response = {
                    statusCode: 599,
                    duration: Date.now() - sent.when,
                    errno: error.code,
                    okay: false,
                    sent: sent,
                    cause: error,
                    headers: {
                        'content-length': body.length,
                        'content-type': 'application/json'
                    }
                }
                return [ async.break, JSON.parse(body.toString()), response, body ]
            }], function (response) {
                var chunks = []
                async(function () {
                    new Delta(async()).ee(response)
                         .on('data', function (chunk) { chunks.push(chunk) })
                         .on('end')
                }, function () {
                    response.duration = Date.now() - sent.when
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
                    return [ parsed, response, body ]
                })
            })
        }, function (body, response) {
            logger.trace('response', {
                sent: sent,
                received: {
                    duration: response.duration,
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: body
                }
            })
        })
    }, function (body, response, buffer) {
        response.okay = Math.floor(response.statusCode / 100) == 2
        async(function () {
            var loop = async.forEach(function (plugin) {
                plugin.before(this, request, async())
            }, function (outcome) {
                if (outcome) {
                    return [ loop.break, outcome ]
                }
            })(request.plugins)
        }, function () {
            if (!response.okay) {
                if (request.raise) {
                    throw interrupt({
                        name: 'fetch',
                        cause: response.cause || null,
                        context: {
                            statusCode: response.statusCode,
                            url: request.options.url,
                            headers: {
                                sent: request.options.headers,
                                received: response.headers
                            }
                        },
                        properties: {
                            response: response,
                            body: body,
                            buffer: buffer
                        }
                    })
                } else if (request.nullify) {
                    return [ async.break, null, response, body ]
                }
            }
            return [ body, response, buffer ]
        })
    })
})

module.exports = UserAgent
