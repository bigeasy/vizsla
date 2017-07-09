var http = require('http')

var server = http.createServer(function (request, response) {
    console.log('opened')
    response.writeHead(301)
    response.end()
})

server.listen(8888, '127.0.0.1', function () {
    var request = http.request({ method: 'POST', host: '127.0.0.1', port: 8888 })
    request.on('response', function (response) {
        console.log(response.statusCode, response.headers)
        server.close()
    })
    request.write(new Buffer('1'))
})
