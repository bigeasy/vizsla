var cadence = require('cadence')
var url = require('url')
var typer = require('media-typer')
var assert = require('assert')
var Delta = require('delta')
var slice = [].slice
var interrupt = require('interrupt').createInterrupter('bigeasy.vizsla')
var Transport = require('./http')

function UserAgent (options) {
    options || (options = {})
    this._logger = options.logger || function () {}
    this._tokens = {}
    this._transport = options.transport || new Transport(this._logger)
}

UserAgent.prototype.fetch = cadence(function (async) {
    var logger = this._logger

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
                } else if (/^(?:context|body|payload|grant|token|timeout|post|put|raise)$/.test(key)) {
                    request[key] = object[key]
                } else {
                    request.options[key] = object[key]
                }
            }
        }
    }

    slice.call(arguments, 1).forEach(override)
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

    if (request.grant == 'cc') {
        request.token = this._tokens[request.key]
    }
    var sent = {
        options: request.options,
        body: request.payload,
        when: Date.now(),
        duration: null
    }

    async(function () {
        if (request.grant == 'cc' && !request.token) {
            assert.ok(request.baseUrl.auth)
            async(function () {
                this.fetch({
                    url: url.format(request.url),
                    ca: request.options.ca,
                    rejectUnauthorized: request.options.rejectUnauthorized,
                    timeout: request.timeout
                }, {
                    url: '/token',
                    headers: {
                        authorization: 'Basic ' + new Buffer(request.baseUrl.auth).toString('base64')
                    },
                    payload: {
                        grant_type: 'client_credentials'
                    }
                }, async())
            }, function (body, response) {
                if (body.token_type == 'Bearer' && body.access_token) {
                    request.token = this._tokens[request.key] = body.access_token
                }
            })
        } else {
            return [ null, { statusCode: 200 } ]
        }
    }, function (body, response) {
        if (Math.floor(response.statusCode / 100) != 2) return
        var http, options = {}
        if (request.token) {
            request.options.headers.authorization = 'Bearer ' + request.token
        }
        for (var key in request.options) {
            if (key == 'ca' || key == 'agent') {
                options[key] = true
            } else {
                options[key] = request.options[key]
            }
        }
        logger('request', {
            url: request.url,
            options: options,
            sent: request.payload
        })
        if (request.payload && !Buffer.isBuffer(request.payload)) {
            request.payload = new Buffer(JSON.stringify(request.payload))
        }
        if (request.payload) {
            request.options.headers['content-length'] = request.payload.length
        }
        async([function () {
            this._transport.send(request, async())
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
            console.log(error.stack)
            console.log(request.options)
            if (request.raise) {
                throw interrupt(new Error('fetch'), { response: response, parsed: JSON.parse(body.toString()), body: body, cause: error })
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
                if (request.grant == 'cc' && response.statusCode == 401) {
                    delete this._tokens[request.key]
                }
                if (!response.okay && request.raise) {
                    throw interrupt(new Error('fetch'), { response: response, parsed: parsed, body: body })
                }
                return [ parsed, response, body ]
            })
        })
    })
})


UserAgent.prototype.lookupToken = function (location) {
    location = url.parse(location)
    return this._tokens[location.hostname + ':' + location.port]
}

module.exports = UserAgent
