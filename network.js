var http = require('http')
var https = require('https')
var send = require('./send')

module.exports = {
    send: function (request, cancel, callback) {
        send(request.url.protocol == 'https:' ? https : http, request, cancel, callback)
    }
}
