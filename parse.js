var cadence = require('cadence')
var delta = require('delta')

function Parse (parsers) {
    this._parsers = parsers
}

function select (options) {
    return true
}

function Jsonify (options) {
    this._options = options
}

Jsonify.prototype.parse = cadence(function (async, body, response) {
    if (select(this._options, response)) {
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
            console.log(options)
            if (typeof options == 'string') {
                switch (options) {
                case 'json':
                    parser = json()
                    break
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
