var http = require('http')
var coalesce = require('extant')

module.exports = function (response, statusCode, headers) {
    var rawHeaders = []
    for (var header in headers) {
        rawHeaders.push(header, headers[header])
    }
    return [ null, {
        via: response,
        stage: 'parse',
        statusCode: statusCode,
        statusMessage: coalesce(http.STATUS_CODES[statusCode], 'Unknown'),
        headers: headers,
        rawHeaders: rawHeaders,
        trailers: null,
        type: {
            type: 'vizsla',
            subtype: 'null',
            suffix: null,
            parameters: {}
        }
    }]
}
