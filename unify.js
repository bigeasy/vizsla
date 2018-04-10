var cadence = require('cadence')

function Unify () {
}

Unify.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body) {
        return [ body ]
    })
})

module.exports = function () {
    return new Unify
}
