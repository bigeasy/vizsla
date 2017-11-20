var cadence = require('cadence')
var stream = require('stream')
var url = require('url')
var coalesce = require('extant')
var assert = require('assert')
var noop = require('nop')
var Signal = require('signal')
var slice = [].slice
var interrupt = require('interrupt').createInterrupter('vizsla')
var Redux = { Transport: require('./redux/transport') }
var ClientCredentials = require('./cc')
var merge = require('./merge')
var defaultify = require('./default')

function UserAgent (middleware) {
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
    merged.input = fetch.input

    if (callback != null) {
        fetch.response.wait(callback)
    }

    this._fetch(merged, fetch, fetch.response.unlatch.bind(fetch.response))

    return fetch
}

UserAgent.prototype._fetch = cadence(function (async, request, fetch) {
    async(function () {
        request.gateways.push(new Redux.Transport)
        request.gateways.shift().fetch(this, request, fetch, async())
    }, function (converter, response) {
        return [ converter, response ]
    })
})

module.exports = UserAgent
