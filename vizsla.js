var cadence = require('cadence')
var stream = require('stream')
var Signal = require('signal')
var Descent = require('./descent')
var Transport = require('./transport')

function UserAgent () {
    this._bind = []
    this.storage = {}
    this._transport = new Transport
}

UserAgent.json = require('./json')
UserAgent.text = require('./text')
UserAgent.buffer = require('./buffer')
UserAgent.jsons = require('./jsons')
UserAgent.stream = require('./stream')

UserAgent.prototype.bind = function () {
    var ua = new UserAgent
    ua._transport = this._transport
    ua._bind = this._bind.concat(Array.prototype.slice.call(arguments))
    ua.storage = this.storage
    return ua
}

UserAgent.prototype.destroy = function () {
    this.destroyed = true
    this._transport.cancel.unlatch('ECONNABORTED')
}

function Fetch (cancel) {
    this.input = new stream.PassThrough
    this.request = new Signal
    this.response = new Signal
    this._cancel = cancel
}

Fetch.prototype.cancel = function () {
    this._cancel.unlatch('ECONNABORTED')
}

UserAgent.prototype.fetch = function () {
    var vargs = Array.prototype.slice.call(arguments)
    var callback = (typeof vargs[vargs.length - 1] == 'function') ? vargs.pop() : null

    var cancel = new Signal
    var fetch = new Fetch(cancel)

    if (callback != null) {
        fetch.response.wait(callback)
    }

    var descent = new Descent(this, this._bind.concat(vargs), fetch.input, cancel)
    descent.attempt(fetch.response.unlatch.bind(fetch.response))

    return fetch
}

module.exports = UserAgent
