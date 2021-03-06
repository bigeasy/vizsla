An error-first callback friendly user agent.

This exists because I always have to:

 * Convert buffers to strings using the correct encoding.
 * Parse JSON bodies.
 * Resolve relative URLs.
 * Fuss with formatting bearer token headers.
 * Catch JSON parse errors.
 * Not parse a JSON body if there is an error (because it could be a proxy.)
 * Not trust content type unless everything is hunky dory, otherwise don't
 bother with the body.
 * Cancel HTTP requests before and after the response has started streaming.
 * Drain the HTTP response if you cancel or for other reasons do not consume the
 body.

HTTP is not a simple fetch. Even if I'm good about HTTP mime-types, there are
always proxies and whatnot that I use.

HTTP clients are different from HTTP servers. They have to deal with gateways
and caching doing rude thing coming back that they don't do going forward. They
have to implement redirections and authentication. The have to implement
retries.

Vizsla is supposed to help you build a client appropriate for your application,
but retries and redirects ought to be a part of your application.

As for gateways (a plugin mechanism) there are two things that you do with them,
negotiate and parse. That is about it. Either you are intercepting an response
response and retrying, like a redirect, or you are running the response through
a pipeline.

If instead of an array of gateways we have an array of negotation gateways and
parsing gateways. This accommodates the common case of setting redirects and
authentication negotiation at the outset while swapping out different parse
responses for different requests.

Now trying to sort out whether to shoehorn all errors into response reports,
which would sacrifice stack traces, or to make them all `Error`s which is
difficult because you don't really consider a 404 to be an `Error`. A connection
timeout doesn't have a meaningful stack trace. Hmm… That kind of answers it,
doesn't it?

If there is a stack you can put it in `stack`, which will get it into the
logging one way or another in case you do have a bonafide exception, but who
gets those anymore? You don't get out of memory errors ever, you just get
OOMKilled.

Ah, but still. Even if you do have an OOM error, what good is the stack trace?
Maybe we go ahead and check the result codes and see what sort of errors are
actually raised. Maybe the lack of a `code` causes it to get written to standard
error so that we can debug it. Maybe we log the error with the `trace` level and
we can turn that one to see the stack trace.

But, I don't imagine that ordinary usage would benefit from a stack trace
because we're not expecting stack trace based errors.

Errors ought to be messages, we cordon it off into a JSON structure that can be
stuffed into an exception and thrown if that's what you'd prefer. There is a
status code and status message, but not always a body. There is a stage which
can be 'negotiate', 'transport' or 'parse'.

## Lastest Thoughts

Separate between negotiate and parse. Negotiate handles redirections or other
negotiations like client credentials. Really the only two negotitations that
I've encountered so far.

Parse is a separate step. Specify a parser or parsers based on conditions.
Because this library is meant for IPC we do not have complicated mime-type
parser resolution. You're going to know the types that will be returned. You're
going to know which parsers are needed based on the headers. If they don't match
it is an error. If you need to do a lot figuring to do determine what to do with
the body, then tell Vizsla so skip parsing and sort that out yourself with the
status code, headers and stream returned.

How you want to deal with errors is another step. You can raise them as
exceptions, or get them back, or decided to just go by whether the body is null.

A parse error will get reported as a 503 and the status of the actual network
request will be a nested error. Negotiation will not nest. You can only make one
call at a time. The status of successful negotation is discarded. Failed
negotitaion is returned as an error. If you really need to inspect the body of a
failed negotiation maybe just do that outside a negotiation extension.

Parsers and negotiation are now overridden instead of extened when you merge
properties.
