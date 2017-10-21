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
    }, function (parsed, buffer) {
        if (fullType == 'application/json') {
            // TODO Really should be an error with a 599 error code.
            try {
                return { json: JSON.parse(buffer.toString()) }
            } catch (e) {
                return { contentType: 'application/json', text: buffer.toString() }
            }
        }
        if (type.type == 'text') {
            return { contentType: fullType, text: buffer.toString() }
        }
        return { contentType: fullType, buffer: buffer }
    })
})

Converter.prototype.parsify = cadence(function (async) {
    async(function () {
        this._parsify(async())
    }, function (result) {
        return [ true, result.buffer || result.stream || (('json' in result) ? result.json : result.text), this._body ]
    })
})

Converter.prototype.jsonify = cadence(function (async) {
    async(function () {
        this._parsify(async())
    }, function (result) {
        if (result.buffer) {
            return [ true, { contentType: result.contentType, buffer: result.buffer.toString('base64') } ]
        }
        return [ true, result.json || result.stream || result ]
    })
})

Converter.prototype.streamify = cadence(function (async) {
    var body = this._body
    switch (this._bodyType) {
    case 'stream':
        return [ true, body ]
    case 'json':
        body = JSON.stringify(body)
    case 'buffer':
        var readable = new stream.PassThrough
        readable.write(body)
        readable.end()
        return [ true, readable ]
    }
})

Converter.prototype._bufferify = cadence(function (async) {
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

Converter.prototype.bufferify = cadence(function (async) {
    async(function () {
        this._bufferify(async())
    }, function (buffer) {
        return [ true, buffer, buffer ]
    })
})

module.exports = Converter
