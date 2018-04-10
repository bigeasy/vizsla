var cadence = require('cadence')
var createSelector = require('./select')
var coalesce = require('extant')
var assert = require('assert')

function Parser (when, merge) {
    assert(when == null || Array.isArray(when))
    this._select = createSelector(when)
    this._merge = coalesce(merge, [])
}

Parser.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.merge(this._merge.slice())
        descent.descend(async())
    }, function () {
        var body = arguments[0]
        if (body != null) {
            var response = arguments[1]
            if (this._select.call(null, response)) {
                this._parse(body, response, async())
            }
        }
    })
})

Parser.prototype.errorify = function (response, context) {
    return [ null, {
        statusCode: 502,
        statusMessage: http.STATUS_CODES[502],
        headers: {},
        rawHeaders: [],
        trailers: null,
        via: response,
        type: {
            type: 'application',
            subtype: 'json',
            suffix: null,
            parameters: {}
        }
    } ]
}

module.exports = Parser
