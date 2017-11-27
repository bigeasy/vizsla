var cadence = require('cadence')
var coalesce = require('extant')

var merge = require('./merge')
var options = require('./options')
var defaults = require('./defaultify')

var stream = require('stream')
var Signal = require('signal')

var Transport = require('./transport')

var jsonify = require('./jsonify')

function Descent (bind, input, cancel, storage, UserAgent) {
    this._UserAgent = UserAgent
    this._merged = merge({}, bind)
    if (this._merged.gateways == null) {
        this._merged.gateways = [ jsonify({ when: [ 'content-type: application/json' ] }) ]
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
