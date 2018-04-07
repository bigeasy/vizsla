[![Build Status](https://travis-ci.org/bigeasy/vizsla.svg?branch=master)](https://travis-ci.org/bigeasy/vizsla) [![Coverage Status](https://coveralls.io/repos/bigeasy/vizsla/badge.svg?branch=master&service=github)](https://coveralls.io/github/bigeasy/vizsla?branch=master)

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
