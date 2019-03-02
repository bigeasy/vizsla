require('proof')(12, prove)

function prove (okay) {
    var merge = require('../merge')
    okay(merge({}, []), {}, 'empty')
    okay(merge({}, [[]]), {}, 'nested array')
    okay(merge({ url: 'http://127.0.0.1' }, []), { url: 'http://127.0.0.1' }, 'url')
    okay(merge({ url: 'http://127.0.0.1' }, [{ url: '/x' }]), { url: 'http://127.0.0.1/x' }, 'resolved url')
    okay(merge({ socketPath: '/var/sock', method: 'GET' }, [{ url: '/x', path: '/y' }]), {
        url: 'http://%2Fvar%2Fsock@unix/y',
        method: 'GET'
    }, 'socket path, url and path')
    okay(merge({ headers: {} }, [{ headers: { value: 1 }}]), { headers: { value: '1' } }, 'headers')
    okay(merge({ headers: { value: 1 } }, [{ headers: { value: null }}]), { headers: { } }, 'delete headers')
    okay(merge({ method: 'GET' }, []), { method: 'GET' }, 'other property')
    try {
        merge({ plugins: {} }, [{ grant: 'cc' }], { storage: {} })
    } catch (error) {
        okay('cc depricated')
    }
    okay(merge({ put: {} }, []), { method: 'PUT', payload: {} }, 'put')
    okay(merge({ body: {} }, []), { payload: {} }, 'body')
    okay(merge({ method: 'POST' }, [ null ]), {}, 'total reset')
}
