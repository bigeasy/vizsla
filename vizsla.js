var cadence = require('cadence')
var stream = require('stream')
var Signal = require('signal')
var merge = require('./merge')
var Descent = require('./descent')

function UserAgent () {
    this._bind = []
    this.storage = {}
}

UserAgent.prototype.bind = function () {
    var ua = new UserAgent
    ua._transport = this._transport
    ua._bind = this._bind.concat(Array.prototype.slice.call(arguments))
    ua.storage = this.storage
    return ua
}

function Fetch (cancel) {
    this.input = new stream.PassThrough
    this.request = new Signal
    this.response = new Signal
    this._cancel = cancel
}

Fetch.prototype.cancel = function () {
    this._cancel.unlatch()
}

UserAgent.prototype.fetch = function () {
    var vargs = Array.prototype.slice.call(arguments)
    var callback = (typeof vargs[vargs.length - 1] == 'function') ? vargs.pop() : null

    var cancel = new Signal
    var fetch = new Fetch(cancel)

    if (callback != null) {
        fetch.response.wait(callback)
    }

    var descent = new Descent(this._bind.concat(vargs), fetch.input, cancel, this.storage, UserAgent)
    descent.descend(fetch.response.unlatch.bind(fetch.response))

    return fetch
}

module.exports = UserAgent
