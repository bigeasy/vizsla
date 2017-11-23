var cadence = require('cadence')
var defaultify = require('./defaultify')
var createSelector = require('./select')
var coalesce = require('extant')
var merge = require('./merge')

function Parser (options, merge) {
    this._options = options
    this._merge = coalesce(merge, [])
    this._select = createSelector(coalesce(options.when, []))
}

Parser.prototype.fetch = cadence(function (async, descent) {
    async(function () {
        descent.merge(this._merge.slice())
        descent.descend(async())
    }, function (body, response) {
        if (this._select.call(null, response)) {
            this._parse(body, response, async())
        }
        return [ body, response ]
    })
})

module.exports = Parser
