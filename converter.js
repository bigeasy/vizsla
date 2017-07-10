// TODO Do not assume UTF-8.

var stream = require('stream')
var cadence = require('cadence')
var delta = require('delta')
var typer = require('media-typer')
var byline = require('byline')
var JsonStream = require('./jsons')

function Converter (headers, body, bodyType, start) {
    this._headers = headers
    this._body = body
    this._bodyType = bodyType
    this._start = start
    this.duration = Date.now() - this._start
}

Converter.prototype._parsify = cadence(function (async) {
    if (this._bodyType == 'json') {
        return { json: this._body }
    }
    var type = typer.parse(this._headers['content-type'] || 'application/octet-stream')
    var fullType = type.type + '/' + type.subtype
    if (this._bodyType == 'stream' && fullType == 'application/json-stream') {
        return { stream: this._body.pipe(byline()).pipe(new JsonStream()) }
    }
    async(function () {
        this.bufferify(async())
    }, function (buffer) {
        if (fullType == 'application/json') {
            return { json: JSON.parse(buffer.toString()) }
        }
        if (type.type == 'text') {
            return { contentType: fullType, text: buffer.toString() }
        }
        return { contentType: fullType, buffer: buffer.toString('base64') }
    })
})

Converter.prototype.parsify = cadence(function (async) {
    async(function () {
        this._parsify(async())
    }, function (result) {
        return result.json || result.text || result.buffer || result.stream
    })
})

Converter.prototype.jsonify = cadence(function (async) {
    async(function () {
        this._parsify(async())
    }, function (result) {
        return result.json || result.stream || result
    })
})

Converter.prototype.streamify = cadence(function (async) {
    var body = this._body
    switch (this._bodyType) {
    case 'stream':
        return body
    case 'json':
        body = JSON.stringify(body)
    case 'buffer':
        var readable = new stream.PassThrough
        readable.write(body)
        readable.end()
        return readable
    }
})

Converter.prototype.bufferify = cadence(function (async) {
    switch (this._bodyType) {
    case 'buffer':
        return this._body
    case 'json':
        return new Buffer(JSON.stringify(this._body))
    case 'stream':
        async(function () {
            delta(async()).ee(this._body).on('data', []).on('end')
        }, function (chunks) {
            this._bodyType = 'buffer'
            this._body = Buffer.concat(chunks)
            this.duration = Date.now() - this._start
            return this._body
        })
    }
})

module.exports = Converter
