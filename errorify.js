var http = require('http')

module.exports = function (statusCode, headers) {
    var description = http.STATUS_CODES[statusCode]
    headers['content-type'] = 'application/json'
    var rawHeaders = []
    for (var header in headers) {
        rawHeaders.push(header, headers[header])
    }
    return [ description, {
        statusCode: statusCode,
        statusMessage: description,
        headers: headers,
        rawHeaders: rawHeaders,
        trailers: null
    }]
}
