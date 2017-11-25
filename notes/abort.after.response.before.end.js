console.log('-------------')

var http = require('http')
var start = Date.now()

var resume = {}
var server = http.createServer(function (request, response) {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.write('hello, world 1')
    request.resume()
    resume.server = function () {
        console.log('completing')
        response.end('hello, world 2')
    }
    request.on('data', function (chunk) {
        console.log(chunk.toString())
    })
    request.on('close', function () {
        console.log('server close')
    })
    request.on('aborted', function () {
        console.log('server aborted')
    })
    request.on('end', function () {
        console.log('server ended')
    })
    setTimeout(function () {
        resume.client()
    }, 1000)
})

server.listen(8888, function () {
    var request = http.request({ host: '127.0.0.1', port: 8888, method: 'POST' })
    request.on('error', function (error) {
        console.log('error')
        console.log(error.stack)
    })
    request.on('abort', function () {
        console.log('abort')
    })
    request.on('aborted', function () {
        console.log('aborted')
    })
    request.on('response', function (response) {
        console.log('got response')
        response.on('data', function (chunk) {
            console.log(chunk.toString())
        })
        response.on('aborted', function () {
            console.log('client aborted')
        })
        response.on('close', function () {
            console.log('client close')
        })
        response.on('end', function () {
            console.log('client end')
            setTimeout(function () {
                server.close()
            }, 3000)
        })
    })
    resume.client = function () {
        setTimeout(function () {
            request.abort()
            request.end()
            setTimeout(function () {
                resume.server()
            }, 1000)
        }, 1000)
    }
    request.write('going up')
})
