var cadence = require('cadence')
var delta = require('delta')

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
                var headers = headers[j].split(/:\s*/, 2)
                selected = pair.length == 2 && options.headers[pair[0]] == pair[1]
            }
            break
        }
    }
    return selected
}

function Jsonify (options) {
    this.options = options
}

Jsonify.prototype.parse = cadence(function (async, body, response) {
    if (select(this.options, response)) {
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            return JSON.parse(Buffer.concat(chunks).toString('utf8'))
        })
    } else {
        return []
    }
})

function json (options) {
    return new Jsonify(options || [ 'content-type: application/json', 2 ])
}

Parse.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        if (this._parsers === null) {
            return
        }
        var parsers = typeof this._parsers == 'string' ? [ this._parsers ] : this._parsers
        var parser = null
        while (parser == null && parsers.length != 0) {
            var options = parsers.shift()
            if (typeof options == 'string') {
                switch (options) {
                case 'json':
                    parser = json()
                    break
                }
            }
            if (!select(parser.options, response)) {
                parser = null
            }
        }
        if (parser == null) {
            body.resume()
            return [ null, response ]
        }
        async([function () {
            parser.parse(body, response, async())
        }, function (error) {
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
