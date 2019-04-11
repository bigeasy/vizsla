var http = require('http')

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
            if (typeof error == 'number') {
                error = { statusCode: error }
            } else if (! error.statusCode) {
                throw error
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
            // TODO Maybe don't raise, instead flatten.
            if (this._merged.raise) {
                throw error
            }
            var response = coalesce(error.response, this.response)
            if (response) {
                response = {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    rawHeaders: response.rawHeaders
                }
            }
            console.log('>', response)
            var request = this.request()
            logger.debug('error', { error: error })
            return [ null, {
                statusCode: error.statusCode,
                statusMessage: http.STATUS_CODES[error.statusCode],
                stage: response ? 'response' : 'request',
                code: coalesce(error.code),
                okay: false,
                request: request.options,
                response: response
            } ]
        }])
    }, function (body, response) {
        if (this._merged.raise && !response.okay) {
            throw new Interrupt('vizsla#error', {
                statusCode: response.statusCode,
                headers: response.headers,
                code: response.code
            })
        } else if (this._merged.nullify) {
            return [ body ]
        }
    })
})

module.exports = Descent
