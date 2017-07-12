var cadence = require('cadence')
var stream = require('stream')
var url = require('url')
var coalesce = require('extant')
var assert = require('assert')
var noop = require('nop')
var Signal = require('signal')
var slice = [].slice
var interrupt = require('interrupt').createInterrupter('vizsla')
var Transport = require('./transport')
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

    var merged = merge(this._bind, vargs.slice(), this)

    merged.input = new stream.PassThrough

    var fetch = new Fetch

    if (callback != null) {
        fetch.response.wait(callback)
    }

    this._fetch(merged, fetch, fetch.response.unlatch.bind(fetch.response))

    return fetch
}

UserAgent.prototype._fetch = cadence(function (async, request, fetch) {
    if (request.plugins == null) {
        request.plugins = []
    }
    request.plugins.push(new Transport)
    async(function () {
        request.plugins.shift().fetch(this, request, fetch, async())
    }, function (converter, response) {
        response.okay = Math.floor(response.statusCode / 100) == 2
        if (!response.okay && request.raise) {
                async(function () {
                    converter.parsify(async())
                }, function (parsed, buffer) {
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
                            body: parsed,
                            response: response,
                            buffer: buffer
                        }
                    })
                })
        }
        async(function () {
            if (request.response == 'stream') {
                async(function () {
                    converter.streamify(async())
                }, function (stream) {
                    return [ stream, null ]
                })
            } else if (request.response == 'buffer') {
                converter.bufferify(async())
            } else {
                converter.parsify(async())
            }
        }, function (parsed, buffer) {
            if (!response.okay) {
                if (request.nullify) {
                    return [ null ]
                }
                if (request.falsify) {
                    return [ false ]
                }
            }
            return request.nullify || request.falsify ? [ parsed ] : [ parsed, response, buffer ]
        })
    })
})

module.exports = UserAgent
