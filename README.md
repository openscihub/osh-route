# Route

A Route is basically a translator between properties and URIs. Its two most
important functions are complementary: `route.uri(props)` and `route.props(uri)`.
This allows you to think about URIs as POJOs, which is what you work with in
your scripts.

## Installation

```
npm install osh-route
```

## Usage

Example:

```js
var Route = require('osh-route');

var userRoute = new Route({
  path: '/users/<user>',
  params: {
    user: /^[a-z]+$/
  }
});
```

The `path` format keeps it simple; everything is literal in the string
except for parameter names between `<` `>`. A parameter name should match an
entry in the `params` object, which maps parameter names to `RegExp`s or
validation functions.

Let's use the route.

```js
userRoute.uri({user: 'tony', age: '31'});  // '/users/tony?age=31'
userRoute.uri({user: 'TONY'});             // error!
userRoute.props('/users/tony?age=31');     // {user: 'tony', age: '31'}
userRoute.props('/users/TONY');            // undefined

// Also this stuff...
userRoute.path({user: 'tony', age: '31'}); // '/users/tony'
userRoute.query('/users/tony?age=31');     // {age: '31'}
userRoute.qs({user: 'tony', age: '31'});   // 'age=31'
```

The rules for generating a URI from properties are:

- If a path parameter is missing or invalid, throw an Error.
- Any property that is not a path parameter is added to the query string.

The rules for obtaining props from a URI string are:

- If the path does not match, return undefined.
- If the path matches, return an object with a key for every path/query
  parameter.


## Configuration

A Route is instantiated with a config object, that accepts the following
properties:

- `method {String}`: Either `'GET'` or `'POST'`;
- `path {String}`: Path template. Parameters are specified by `<param_name>`
  and should correspond with an entry in the `params` config property.
- `params {Object}`: An object mapping parameter names (specified in the
  path template) to validation RegExps or functions.

## Methods

### route.uri(props)

Convert a props object into a URI string. The query section is
always ordered by query key name, so that a uri can act as a unique id.

If a path parameter is missing from `props` or exists but is invalid, an
Error is thrown. The error message is of the form

```
EBADPARAM: <param_name>
```

where `<param_name>` is the name of the infringing property.

### route.props(uri)

Convert a uri string into a plain old javascript object. If the path
does not match, `undefined` is returned.

### route.path(props)

Return only the path part of the given props.
If a path parameter is missing from `props` or exists but is invalid,
the EBADPARAM error is thrown.

### route.query(props)

Return only the query part of the given props as an object. Always returns
an object.

### route.qs(props)

Return only the query part of the given props as a string.
The string is always ordered by query key name.

## Hostname

One more bump in the road occurs when dealing with hostnames. Accessing your
API from another service on your backend requires requesting a host like
`localhost:3333` or something, whereas on the client it's something like
`https://api.app.com`. Route doesn't really help you with this (apart from
separating host from route), but here are some ways to deal with it.

One strategy is to use environment variables.

```js
var userRoute = Route({
  host: process.env.API_HOST,
  path: '/users/<user>',
  params: {
    user: /\w+/
  }
});
```

then, `host` could be `'localhost:1234'` on the server (using, for example, the
command `> API_HOST=localhost:1234 node serve.js`), and
`'https://api.app.com/api'` on the client (using [envify] with [browserify] or
something).

Because I'm scared of managing `process.env` and I already make heavy use of
browserify, my preference is to separate server from client using the
`"browser"` parameter in the `package.json` file.  This parameter is used by
browserify to select a different set of modules for use in the browser.

For example,

`package.json` (snippet):

```json
{
  ...
  "browser": {
    "lib/host.js": "lib/browser-host.js"
  },
  ...
}
```

`lib/host.js`:

```js
module.exports = 'localhost:3333';
```

`lib/browser-host.js`:

```js
module.exports = 'https://api.app.com/api';
```

Now I can write my Route isomorphically,

```js
var userRoute = Route({
  host: require('./host'),
  path: '/users/<user>',
  params: {
    user: /\w+/
  }
});
```


## License

MIT
