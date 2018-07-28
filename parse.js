var cadence = require('cadence')
var delta = require('delta')

var logger = require('prolific.logger').createLogger('vizsla')

var PARSERS = {
    json: require('./json'),
    text: require('./text'),
    buffer: require('./buffer'),
    jsons: require('./jsons'),
    stream: require('./stream'),
    dump: require('./dump')
}

var OPTIONS = {
    json: [ 2, 'content-type: application/json' ],
    text: [ 2 ],
    buffer: [ 2 ],
    jsons: [ 2, 'content-type: application/json-stream' ],
    stream: [ 2 ],
    dump: [ 2 ]
}

function Parse (parsers) {
    this._parsers = parsers
}

function select (options, response) {
    var selected = true
    for (var i = 0, I = options.length; selected && i < I; i++) {
        switch (typeof options[i]) {
        case 'number':
            if (options[i] < 10) {
                selected = options[i] == Math.floor(response.statusCode / 100)
            } else {
                selected = options[i] == response.statusCode
            }
            break
        case 'string':
            var headers = options[i].split('\n')
            for (var j = 0, J = headers.length; selected && j < J; j++) {
                var pair = headers[j].split(/:\s*/, 2)
                if (pair[0] == 'content-type') {
                    selected = response.type.type + '/' + response.type.subtype == pair[1]
                } else {
                    selected = response.headers[pair[0]] == pair[1]
                }
            }
            break
        default:
            selected = false
            break
        }
    }
    return selected
}

Parse.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        if (this._parsers === null) {
            return
        }
        var parsers = Array.isArray(this._parsers) ? this._parsers : [ this._parsers ]
        var parser = null
        while (parser == null && parsers.length != 0) {
            var options = parsers.shift()
            if (typeof options == 'string') {
                parser = PARSERS[options].apply(null, OPTIONS[options])
            } else {
                parser = options
            }
            if (parser != null && !select(parser.options, response)) {
                parser = null
            }
        }
        logger.debug('parser', { parser: !! parser })
        if (parser == null) {
            // TODO WRONG! Should throw a 503.
            throw response
        }
        async(function () {
            parser.parse(body, response, async())
        }, function (body) {
            logger.debug('parsed', { body: body ? body.toString() : '<null>' })
            return [ body, response ]
        })
    })
})

module.exports = function (parsers) {
    return new Parse(parsers)
}
