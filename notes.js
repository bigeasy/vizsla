cadence(function () {
    ua.fetch({
        url: 'http://127.0.0.1:8080',
        post: input = new stream.PassThrough
        response: 'application/jsonstream'
    }, async())
    ua.fetch({
        plugin: cc
    }, async())
}, function (response) {
    var staccato = new Staccato(response)
    var loop = async(function () {
        staccato.read(async())
    }, function (json) {
        if (json == null) {
            return [ loop.break ]
        }
    })()
})
