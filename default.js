var url = require('url')
var coalesce = require('extant')

var merge = require('./merge')

module.exports = function (request) {
    if (request.token) {
        request = merge(request, [{ headers: { authorization: 'Bearer ' + request.token } }])
    }
    if (request.response == null || request.response == 'parse') {
        request = merge(request, [{ headers: { accept: 'application/json' } }])
    }
    if (request.payload != null && !Buffer.isBuffer(request.payload)) {
        request = merge(request, [{ headers: { 'content-type': 'application/json' } }])
        request.payload = new Buffer(JSON.stringify(request.payload))
    }
    var expanded = {}
    for (var name in request) {
        expanded[name] = request[name]
    }
    expanded.url = url.parse(expanded.url)
    if (expanded.url.hostname == 'unix') {
        var $ = /^(?:(.*):)?(.*)$/.exec(expanded.url.auth)
        expanded.url.auth = coalesce($[1])
        expanded.socketPath = $[2]
    } else {
        expanded.host = expanded.url.hostname
        expanded.port = expanded.url.port
    }
    expanded.path = url.format({
        pathname: expanded.url.pathname,
        search: expanded.url.search,
        hash: expanded.url.hash
    })
    expanded.identifier = expanded.socketPath
                        ? expanded.socketPath
                        : expanded.host + ':' + expanded.port
    expanded.response || (expanded.response = 'parse')
    if (expanded.method == null) {
        expanded.method = request.payload == null ? 'GET' : 'POST'
    }
    if (expanded.plugins == null) {
        expanded.plugins = []
    }
    return expanded
}
