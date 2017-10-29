var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var merge = require('./merge')
var defaultify = require('./default')
var typer = require('media-typer')

function Parser (options) {
    this._options = options
    this._when = caolesce(options._when, [])
    this._unless = caolesce(options._unless, [])
    this._bufferify = bufferify({
        when: coalesce(this._options.when, [])
        unless: coalesce(this._options.unless, [])
    })
}

Parser.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    async(function () {
        request = merge(request, [{ plugins: [ this._bufferify ].concat(request.plugins) }]
        request.plugins.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (should(response.code, this._when, this._unless)) {
            return [ body.toString(coalesce(response.type.parameters.charset, 'utf8')), response ]
        }
        return [ response, response ]
    })
})

module.exports = function (options) {
    return new Parser(options)
}
