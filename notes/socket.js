var http = require('http')

var server = http.createServer(function (request, response) {
    console.log(request.url, request.headers, request)
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.write('hello world\n')
    response.end()
})

server.listen('./path', function () {
    var request = http.request({
        socketPath: './path',
        headers: { connection: 'close' }
    })
    request.on('response', function (response) {
        response.pipe(process.stdout)
        server.close()
    })
    request.end()
})
