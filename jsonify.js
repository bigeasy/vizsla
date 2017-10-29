var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var merge = require('./merge')
var defaultify = require('./default')
var typer = require('media-typer')

function Parser (options) {
    this._options = options
}

Parser.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    stringify({
        when: [ coalesce(this._options.when, []), function (response) {
            return response.type.type + '/' + response.type.subtype == 'application/json'
        } ]
        unless: coalesce(this._options.unless, [])
    })
    async(function () {
        request.plugins.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (codes(response.code, this._when, this._unless)) {
            if (response.type.type + '/' + response.type.subtype == 'application/json') {
                try {
                    return [ JSON.parse(body), response ]
                } catch (e) {
                    return errorify(503)
                }
            } else if (this._passThrough) {
                return [ response, response ]
            } else {
                return errorify(503)
            }
        } else {
            return [ response, response ]
        }
    })
})

module.exports = function (options) {
    return new Parser(options)
}
