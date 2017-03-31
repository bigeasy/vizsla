var http = require('http')

var server = http.createServer(function (request, response) {
    console.log(request.url, request.headers)
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.write('hello world\n')
    response.end()
})

server.listen(8888, '127.0.0.1', function () {
    var request = http.request({
        host: '127.0.0.1',
        port: 8888,
        headers: { connection: 'close' }
    })
    request.on('response', function (response) {
        response.pipe(process.stdout)
        server.close()
    })
    request.end()
})
