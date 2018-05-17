var cadence = require('cadence')
var delta = require('delta')

var PARSERS = {
    json: require('./parser/json'),
    text: require('./parser/text'),
    buffer: require('./parser/buffer'),
    jsons: require('./parser/jsons')
}

function Parse (parsers) {
    this._parsers = parsers
}

function select (options, response) {
    var selected = true
    for (var i = 1, I = options.length; selected && i < I; i++) {
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
            for (var j = 0, J = headers.length; j < J; j++) {
                var pair = headers[j].split(/:\s*/, 2)
                selected = pair.length == 2 && response.headers[pair[0]] == pair[1]
            }
            break
        }
    }
    return selected
}

Parse.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        console.log(this._parsers)
        if (this._parsers === null) {
            return
        }
        var parsers = typeof this._parsers == 'string' ? [ this._parsers ] : this._parsers
        var parser = null
        while (parser == null && parsers.length != 0) {
            var options = parsers.shift()
            if (typeof options == 'string') {
                parser = PARSERS[options]()
            }
            if (parser != null && !select(parser.options, response)) {
                parser = null
            }
        }
        console.log(!!parser)
        if (parser == null) {
            if (body != null) {
                body.resume()
            }
            throw response
        }
        async([function () {
            parser.parse(body, response, async())
        }, function (error) {
            console.log("parsing!!", error.stack)
            body.resume()
            return [ null, response ]
        }], function (body) {
            return [ body, response ]
        })
    })
})

module.exports = function (parsers) {
    return new Parse(parsers)
}
