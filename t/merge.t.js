require('proof')(8, prove)

function prove (okay) {
    var merge = require('../merge')
    okay(merge({}, []), {}, 'empty')
    okay(merge({}, [[]]), {}, 'nested array')
    okay(merge({ url: 'http://127.0.0.1' }, []), { url: 'http://127.0.0.1' }, 'url')
    okay(merge({ url: 'http://127.0.0.1' }, [{ url: '/x' }]), { url: 'http://127.0.0.1/x' }, 'resolved url')
    okay(merge({ socketPath: '/var/sock' }, [{ url: '/x' }]), { url: 'http://%2Fvar%2Fsock@unix/x' }, 'socket path')
    okay(merge({ headers: {} }, [{ headers: { value: 1 }}]), { headers: { value: '1' } }, 'headers')
    okay(merge({ method: 'GET' }, []), { method: 'GET' }, 'other property')
    var plugedin = merge({ plugins: {} }, [{ grant: 'cc' }], { storage: {} })
    okay(plugedin.plugins.length, 1, 'cc')
}
