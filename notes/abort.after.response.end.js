var http = require('http')
var start = Date.now()

var server = http.createServer(function (request, response) {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('hello, world\n')
})

server.listen(8888, function () {
    var request = http.request('http://127.0.0.1:8888')
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
        response.on('end', function () {
            console.log('end', Date.now() - start)
            request.abort()
            server.close()
        })
    })
    request.end()
})
