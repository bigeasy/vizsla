var send = require('./send')
var Interlocutor = require('interlocutor')

function Transport (middleware) {
    this._interlocutor = new Interlocutor(middleware)
}

Transport.prototype.send = function (request, cancel, callback) {
    send(this._interlocutor, request, cancel, callback)
}

module.exports = Transport
