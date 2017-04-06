var f = cadence(function (async, ua, stream) {
    async(function () {
        var fetch = ua.fetch({ url: '/put', method: 'POST' })
        async(function () {
            fetch.request.wait(async())
        }, function () {
            if (fetch.input != null) {
                stream.pipe(input)
            }
            fetch.repsonse.wait(async())
        })
    })
})
