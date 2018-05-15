var cadence = require('cadence')
var coalesce = require('extant')

var merge = require('./merge')
var options = require('./options')
var defaults = require('./defaultify')

var stream = require('stream')
var Signal = require('signal')

var Transport = require('./transport')

var jsonify = require('./jsonify')
var stringify = require('./stringify')

var parse = require('./parse')

function Descent (bind, input, cancel, storage, UserAgent) {
    this._UserAgent = UserAgent
    this._merged = merge({}, bind)
    // TODO Probably belongs in merged.
    if (this._merged.negotiate != null || this._merged.parse != null) {
        this._merged.gateways = coalesce(this._merged.parse, []).concat(coalesce(this._merged.negotiate, []))
    }
    if ('_negotiate' in this._merged) {
        this._merged.gateways = this._merged._negotiate
        if (!('_parse' in this._merged)) {
            this._merged._parse = []
        }
    }
    if ('_parse' in this._merged) {
        if (this._merged.gateways == null) {
            this._merged.gateways = []
        }
        this._merged.gateways.push(parse(this._merged._parse))
    }
    if (this._merged.gateways == null) {
        this._merged.gateways = [
            jsonify([ 'content-type: application/json' ]),
            stringify([ 'content-type: text/plain' ])
        ]
    }
    this.input = input || new stream.PassThrough
    this.cancel = cancel || new Signal
    this.storage = storage
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
    return new (this._UserAgent)().fetch(this._merged, Array.prototype.slice.call(arguments))
}

Descent.prototype.descend = cadence(function (async) {
    if (this._merged.gateways.length != 0) {
        this._merged.gateways.shift().descend(this, async())
    } else {
        new Transport().descend(this, async())
    }
})

module.exports = Descent
