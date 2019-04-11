var http = require('http')
var start = Date.now()

var server = http.createServer(function (request, response) {
    console.log('requested')
    setTimeout(function () {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end('hello, world\n')
        console.log('sent')
    }, 2000)
})

server.listen(8888, function () {
    var request = http.request('http://127.0.0.1:8888')
    setTimeout(function () {
        console.log('aborting')
        request.abort()
        request.end()
    }, 1000)
    request.on('error', function (error) {
        console.log('error', error.code)
        console.log(error.stack)
    })
    request.on('abort', function () {
        console.log('abort', arguments)
    })
    request.on('aborted', function () {
        console.log('aborted', arguments)
    })
    request.on('response', function (response) {
        console.log('got response')
        response.on('data', function (chunk) {
            console.log(chunk.toString())
        })
        response.on('end', function () {
            console.log('end', Date.now() - start)
            server.close()
        })
    })
})

// aborting
// abort {}
// error
// Error: socket hang up
//     at createHangUpError (_http_client.js:213:15)
//     at Socket.socketCloseListener (_http_client.js:245:23)
//     at emitOne (events.js:82:20)
//     at Socket.emit (events.js:169:7)
//     at TCP._onclose (net.js:490:12)
