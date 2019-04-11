var stream = require('stream')
var util = require('util')
var Interrupt = require('interrupt').createInterrupter('vizsla')
var coalesce = require('extant')

function Message (transport, cancel, descent, request, response, transaction) {
    stream.PassThrough.call(this)

    this.destroyed = false

    this._transport = transport
    this._descent = descent
    this._request = request
    this._response = response
    this.transaction = transaction

    this._destroyer = this._destroy.bind(this)

    this._cancel = {
        descent: descent.cancel.wait(this._destroyer),
        transport: cancel
    }

    this._response.once('aborted', this._destroyer)
    this._request.once('error', this._destroyer)
    this._response.once('close', this._destroyer)
    this._response.once('end', this._destroyer)

    this._response.pipe(this)
}
util.inherits(Message, stream.PassThrough)

Message.prototype.destroy = function () {
    if (!this.destroyed) {
        this._destroy()
    }
}

Message.prototype._destroy = function (error) {
    this.destroyed = true

    this._transport.cancel.cancel(this._cancel.transport)
    this._descent.cancel.cancel(this._cancel.descent)

    this._response.removeListener('aborted', this._destroyer)
    this._response.removeListener('close', this._destroyer)

    this._request.removeListener('error', this._destroyer)
    this._request.on('error', function (error) { console.log(error.stack) })

    this.transaction.trailers = this._response.trailers
    this.transaction.completed = this._response.completed
    this.transaction.aborted = this._response.aborted

    this._response.unpipe()
    this._response.destroy()

    if (error) {
        if (typeof error == 'string') {
            this.transaction.truncate = { code: error }
            this.emit('error', new Interrupt('error', this.transaction))
        } else {
            this.transaction.truncate = { code: coalesce(error.code, error.message) }
            var context = JSON.parse(JSON.stringify(this.transaction))
            context.cause = error
            this.emit('error', new Interrupt('error', context))
        }
    }
}

module.exports = Message
