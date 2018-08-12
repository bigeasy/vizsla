var cadence = require('cadence')
var coalesce = require('extant')

var Interrupt = require('interrupt').createInterrupter('vizsla')
var logger = require('prolific.logger').createLogger('vizsla')

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
    this.input = input
    this.cancel = cancel
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
        async(function () {
            this.ua._transport.descend(this, async())
        }, function (body, response) {
            logger.debug('transported', { body: !!body, $response: response })
        })
    }
})

Descent.prototype.attempt = cadence(function (async) {
    async(function () {
        async([function () {
            this.descend(async())
        }, function (error) {
            if (error instanceof Error) {
                error = { cause: error }
            } else if (typeof error == 'number') {
                error = { statusCode: error }
            }
            if (this.response) {
                this.response.resume()
            }
            error.statusCode = coalesce(error.statusCode, 503)
            error.headers = coalesce(error.headers, {})
            error.rawHeaders = coalesce(error.rawHeaders, [])
            // Wasn't I going to have some sort of exploded type, but all
            // the values where going to be null?
            error.type = null
            if (this._merged.raise) {
                throw new Interrupt('error', error)
            }
            logger.debug('error', { error: error })
            return [ null, error ]
        }])
    }, function (body) {
        if (this._merged.nullify) {
            return [ body ]
        }
    })
})

module.exports = Descent
