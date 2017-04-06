## Thu Apr  6 01:37:35 CDT 2017

Had a go at implementing streams through Vizsla.

Problem with this is that we are putting a hidden call prior to making our call
to resolve authentication, which is fine, but it means that we shouldn’t be
ready to receive any messages until we’ve gone through the asynchronous read
step, which in turn means that we need an asynchronous wait step before we can
write our buffer.

Also, wanted to make streams return, so instead of returning a parsed body,
response and then a buffer, I got rid of the buffer.

Sorting out how to send an error and settling on JSON body format for errors so
that they can be serialized and dealt with programmatically. This means that the
error was already JSON, so we keep it as JSON, or plain text so we can keep it
as that, or else it is some sort of hell that needs to be base64 encoded if it
is not application JSON or plain text. Then we can have an object or utilities
that will allow us to parse it or otherwise deal with it. Ah, it could also be
`text/html` so that is one more type we can leave as plain text.

The problem is that Vizsla does stuff on our behalf, so we have to pass through
the CC and other authentication hoops to get to an error which is why error
responses are annoying. We might be expecting a streaming response, hmm… Well if
we get some terrible streaming response as an error message, like an error
video, that is really hellish, yeah. We can pretend that all requests are going
through a proxy such that we are always returning headers that are appropriate
for our content, converting the response to contain our nested error message
that needs to be cracked. I’m trying to make proxies easier.

Keeping that raw buffer on parse might be the easiest way to have something to
return form `cc.js`.

TK Come back and rewrite this. They where notes along the way.
