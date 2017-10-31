var cadence = require('cadence')
var defaultify = require('./default')
var createSelector = require('./select')
var coalesce = require('extant')
var merge = require('./merge')

function Parser (options, merge) {
    this._options = options
    this._merge = merge
    this._select = createSelector(coalesce(options.when, []))
}

Parser.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    async(function () {
        request = merge(request, this._merge.slice())
        request.gateways.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (this._select.call(null, response)) {
            this._parse(body, response, async())
        }
        return [ body, response ]
    })
})

module.exports = Parser
