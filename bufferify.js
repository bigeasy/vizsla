var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var defaultify = require('./default')

function Parser (options) {
    this._options = options
    this._select = createSelector(coalesce(options.when, []))
}

Parser.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    async(function () {
        request.plugins.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (this._select.call(null, response)) {
            async([function () {
                delta(async()).ee(body).on('data', []).on('end')
            }, function (error) {
                return [ async.break ].concat(errorify(request, 502, 'buffer')
            }], function (chunks) {
                return [ Buffer.concat(chunks), response ]
            })
        }
        return [ response, response ]
    })
})

module.exports = function (options) {
    return new Parser(options)
}
