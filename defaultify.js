var url = require('url')
var coalesce = require('extant')

var merge = require('./merge')
var http = require('http')
var https = require('https')

module.exports = function (request, extended) {
    if (request.token) {
        request = merge(request, [{ headers: { authorization: 'Bearer ' + request.token } }])
    }
    if (request.response == null || request.response == 'parse') {
        request = merge(request, [{ headers: { accept: 'application/json' } }])
    }
    if (('payload' in request) && !Buffer.isBuffer(request.payload)) {
        request = merge(request, [{ headers: { 'content-type': 'application/json' } }])
        request.payload = Buffer.from(JSON.stringify(request.payload))
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
    expanded.http = request.http || (expanded.url.protocol == 'https:' ? https : http)
    if (extended) {
        // TODO Should we close ourselves based on headers or a flag? There
        // should be a flag to defeat this behavior, maybe, or else maybe if you
        // have an API where you need to pass a body to DELETE you need to use
        // `http` directly to accommodate that. Should be more like cURL,
        // defaults and defeats.
        if (!('payload' in expanded) && /^HEAD|DELETE|GET$/.test(expanded.method)) {
            expanded.payload = Buffer.alloc(0)
        }
    }
    return expanded
}
