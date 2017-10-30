var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var defaultify = require('./default')
var createSelector = require('./select')
var coalesce = require('extant')
var errorify = require('./errorify')
var delta = require('delta')

function Parser (options) {
    this._options = options
    this._select = createSelector(coalesce(options.when, []))
}

Parser.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    async(function () {
        request.gateways.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (this._select.call(null, response)) {
            async([function () {
                delta(async()).ee(body).on('data', []).on('end')
            }, function (error) {
                // TODO Maybe report stack here.
                return [ async.break ].concat(errorify(502, {}))
            }], function (chunks) {
                return [ Buffer.concat(chunks), response ]
            })
        }
        return [ body, response ]
    })
})

module.exports = function (options) {
    return new Parser(options)
}
