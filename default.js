var url = require('url')
var coalesce = require('extant')

var merge = require('./merge')
var http = require('http')
var https = require('https')

module.exports = function (request) {
    if (request.token) {
        request = merge(request, [{ headers: { authorization: 'Bearer ' + request.token } }])
    }
    if (request.response == null || request.response == 'parse') {
        request = merge(request, [{ headers: { accept: 'application/json' } }])
    }
    if (('payload' in request) && !Buffer.isBuffer(request.payload)) {
        request = merge(request, [{ headers: { 'content-type': 'application/json' } }])
        request.payload = new Buffer(JSON.stringify(request.payload))
    }
    // TODO Not right, really. Needs to be converted into an array.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Transfer-Encoding
    // TODO Do you want to rename `payload` to `buffer`? Meh.
    if (request.payload != null && request.headers['transfer-encoding'] != 'chunked') {
        request.headers['content-length'] = request.payload.length
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
    expanded.http = request.http || (request.url.protocol == 'https:' ? https : http)
    return expanded
}
