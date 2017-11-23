var cadence = require('cadence')

var merge = require('./merge')
var options = require('./options')
var defaults = require('./defaultify')

var stream = require('stream')
var Signal = require('signal')

var Transport = require('./transport')

function Descent (bind, input, cancel) {
    this._merged = merge({}, bind)
    this.input = input || new stream.PassThrough
    this.cancel = cancel || new Signal
}

Descent.prototype.merge = function (vargs) {
    this._merged = merge(this._merged, vargs)
}

Descent.prototype.options = function () {
    return options(this._merged)
}

Descent.prototype.defaults = function () {
    return defaults(this._merged, true)
}

Descent.prototype.descend = cadence(function (async) {
    if (this._merged.gateways.length != 0) {
        this._merged.gateways.shift().fetch(this, async())
    } else {
        new Transport().fetch(this, async())
    }
})

module.exports = Descent
