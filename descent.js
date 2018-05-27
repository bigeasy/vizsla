var cadence = require('cadence')
var coalesce = require('extant')

var interrupt = require('interrupt').createInterrupter('vizsla')

var merge = require('./merge')
var options = require('./options')
var defaults = require('./defaultify')

var stream = require('stream')
var Signal = require('signal')

var Transport = require('./transport')

var parse = require('./parse')

function Descent (ua, bind, input, cancel) {
    this.ua = ua
    this._merged = merge({}, bind)
    if ('negotiate' in this._merged) {
        this._gateways = this._merged.negotiate
    } else {
        this._gateways = []
    }
    if ('parse' in this._merged) {
        this._gateways.unshift(parse(this._merged.parse))
    }
    this.input = input || new stream.PassThrough
    this.cancel = cancel || new Signal
}

Descent.prototype.merge = function (vargs) {
    this._merged = merge(this._merged, vargs)
}

Descent.prototype.request = function () {
    var defaulted = defaults(this._merged, true)
    defaulted.options = options(defaulted)
    return defaulted
}

Descent.prototype.fetch = function () {
    return this.ua.fetch(this._merged, Array.prototype.slice.call(arguments))
}

Descent.prototype.descend = cadence(function (async) {
    if (this._gateways.length != 0) {
        this._gateways.shift().descend(this, async())
    } else {
        new Transport().descend(this, async())
    }
})

Descent.prototype.attempt = cadence(function (async) {
    async(function () {
        async([function () {
            this.descend(async())
        }, function (error) {
            if (error instanceof Error) {
                console.log(error.stack)
            } else {
                if (typeof error == 'number') {
                    error = { statusCode: error }
                }
                if (this.response) {
                    this.response.resume()
                }
                error.statusCode = coalesce(error.statusCode, 503)
                error.headers = coalesce(error.headers, {})
                error.rawHeaders = coalesce(error.rawHeaders, [])
                error.type = null
                if (this._merged.raise) {
                    throw interrupt('error', error)
                }
                return [ null, error ]
            }
        }])
    }, function (body) {
        if (this._merged.nullify) {
            return [ body ]
        }
    })
})

module.exports = Descent
