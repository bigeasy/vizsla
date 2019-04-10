var cadence = require('cadence')
var delta = require('delta')
var path = require('path')

var Interrupt = require('interrupt').createInterrupter('vizsla')
var logger = require('prolific.logger').createLogger('vizsla')

var PARSERS = {
    json: null,
    text: null,
    buffer: null,
    jsons: null,
    stream: null,
    dump: null
}

var SELECTORS = {
    json: {
        statusCode: 2,
        headers: {
            'content-type': 'application/json'
        },
        parser: 'json'
    },
    text: {
        statusCode: 2,
        parser: 'text'
    },
    buffer: {
        statusCode: 2,
        parser: 'buffer'
    },
    jsons: {
        statusCode: 2,
        headers: {
            'content-type': 'application/json-stream'
        },
        parser: 'jsons'
    },
    stream: {
        statusCode: 2,
        parser: 'stream'
    },
    dump: {
        statusCode: 2,
        parser: 'dump'
    }
}

function Parse (parsers) {
    this._parsers = parsers || []
}

Parse.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        var parsers = [].concat(this._parsers, {}), parser = null
        for (var i = 0, I = parsers.length; parser == null && i < I; i++) {
            var selector = parsers[i]
            var selected = true
            if (typeof selector == 'string') {
                Interrupt.assert(SELECTORS[selector], 'unknown:parser', {
                    selector: selector,
                    parse: this._parsers
                })
                selector = SELECTORS[selector]
            }
            if (selector.statusCode) {
                if (selector.statusCode < 10) {
                    selected = selector.statusCode == Math.floor(response.statusCode / 100)
                } else {
                    selected = selector.statusCode == response.statusCode
                }
            }
            if (selected && selector.headers) {
                for (var header in selector.headers) {
                    var test = selector.headers[header]
                    var value = response.headers[header]
                    if (value == null) {
                        selected = false
                    } else {
                        if (header == 'content-type') {
                            value = response.type.type
                        }
                        if (typeof test == 'string') {
                            selected = value == test
                        } else {
                            selected = test.test(value)
                        }
                    }
                    if (!selected) {
                        break
                    }
                }
            }
            if (selected) {
                selected = selector.parser || 'stream'
                if (typeof selected == 'string') {
                    parser = PARSERS[selected]
                    if (parser == null) {
                        parser = PARSERS[selected] = require(path.join(__dirname, selected))()
                    }
                } else {
                    parser = selected
                }
            }
        }
        async(function () {
            parser.parse(body, response, async())
        }, function (body) {
            return [ body, response ]
        })
    })
})

module.exports = function (parsers) {
    return new Parse(parsers)
}
