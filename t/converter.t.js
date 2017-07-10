require('proof')(9, require('cadence')(prove))

function prove (async, okay) {
    var stream = require('stream')
    var delta = require('delta')

    var Converter = require('../converter')
    var converter

    async(function () {
        converter = new Converter({}, new Buffer('a'), 'buffer')
        converter.jsonify(async())
    }, function (json) {
        okay(json, { contentType: 'application/octet-stream', buffer: 'YQ==' }, 'jsonify buffer')
        converter = new Converter({}, { a: 1 }, 'json')
        converter.parsify(async())
    }, function (json) {
        okay(json, { a: 1 }, 'parsify json')
        var input = new stream.PassThrough
        input.write(new Buffer(JSON.stringify({ a: 1 })))
        input.end()
        converter = new Converter({ 'content-type': 'application/json' }, input, 'stream')
        converter.parsify(async())
    }, function (json) {
        okay(json, { a: 1 }, 'parisify json from stream')
        var input = new stream.PassThrough
        input.write(new Buffer(JSON.stringify({ a: 1 }) + '\n'))
        input.end()
        converter = new Converter({ 'content-type': 'application/json-stream' }, input, 'stream')
        converter.parsify(async())
    }, function (stream) {
        async(function () {
            delta(async()).ee(stream).on('readable')
        }, function () {
            okay(stream.read(), { a: 1 }, 'parseify json stream')
        })
        converter = new Converter({ 'content-type': 'text/plain' }, new Buffer('x'), 'buffer')
        converter.parsify(async())
    }, function (text) {
        okay(text, 'x', 'parsify text')
        converter = new Converter({ }, {}, 'json')
        converter.bufferify(async())
    }, function (buffer) {
        okay(buffer.toString(), '{}', 'bufferify json')
        var input = new stream.PassThrough
        input.write('x')
        input.end()
        converter = new Converter({}, input, 'stream')
        converter.streamify(async())
    }, function (stream) {
        async(function () {
            delta(async()).ee(stream).on('readable')
        }, function () {
            okay(stream.read().toString(), 'x', 'streamify stream')
        })
        converter = new Converter({}, {}, 'json')
        converter.streamify(async())
    }, function (stream) {
        async(function () {
            delta(async()).ee(stream).on('readable')
        }, function () {
            okay(stream.read().toString(), '{}', 'streamify json')
        })
        converter = new Converter({}, new Buffer('x'), 'buffer')
        converter.streamify(async())
    }, function (stream) {
        async(function () {
            delta(async()).ee(stream).on('readable')
        }, function () {
            okay(stream.read().toString(), 'x', 'streamify buffer')
        })
    })
}
