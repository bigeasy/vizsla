var http = require('http')
var start = Date.now()

var server = http.createServer(function (request, response) {
    setTimeout(function () {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end('hello, world\n')
        console.log('sent')
    }, 5000)
})

server.listen(8888, function () {
    var request = http.request('http://127.0.0.1:8888')
    request.setTimeout(3000, function () {
        console.log('timedout')
    })
    request.on('response', function (response) {
        response.on('data', function (chunk) {
            console.log(chunk.toString())
        })
        response.on('end', function () {
            console.log(new Error().stack)
            console.log('end', Date.now() - start)
            server.close()
        })
    })
    request.end()
})
