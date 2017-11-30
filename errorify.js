var http = require('http')
var stream = require('stream')
var coalesce = require('extant')

module.exports = function (statusCode, headers) {
    var description = coalesce(http.STATUS_CODES[statusCode], 'Unknown')
    var body = new stream.PassThrough
    body.end(JSON.stringify(description))
    headers['content-type'] = 'application/json'
    var rawHeaders = []
    for (var header in headers) {
        rawHeaders.push(header, headers[header])
    }
    return [ body, {
        statusCode: statusCode,
        statusMessage: description,
        headers: headers,
        rawHeaders: rawHeaders,
        trailers: null,
        type: {
            type: 'application',
            subtype: 'json',
            suffix: null,
            parameters: {}
        }
    }]
}
