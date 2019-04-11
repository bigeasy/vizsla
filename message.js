var stream = require('stream')
var util = require('util')

function Message (response, transaction) {
    stream.PassThrough.call(this)
    this._response = response
    this._transaction = transaction
    response.once('end', function () {
        response.unpipe()
        response.resume()
        transaction.trailers = response.trailers
        transaction.completed = response.completed
        transaction.aborted = response.aborted
    })
    response.pipe(this)
}
util.inherits(Message, stream.PassThrough)

Message.prototype.destroy = function (error) {
    this._response.unpipe()
    this._response.destroy()
    if (error) {
        this.emit('error', error)
    }
}

module.exports = Message
