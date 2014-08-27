# Path

A Path is an abstraction of a uri that helps with building
isomorphic web apps. Here is a basic example:

## Installation

```
npm install osh-path
```

## Narrative

Example:

```js
var Path = require('osh-path');

var userPath = Path({
  pattern: '/users/<user>',
  params: {
    user: /\w+/
  }
});
```

The `pattern` format keeps it simple; everything is literal in the string
except for parameter names between `<` `>`. A parameter name should
match an entry in the `params` object, which maps parameter names to
`RegExp`s. (Yes, the express way of writing `'/users/:user'` is a nice
shorthand, but I find that separating the RegExp for the parameter from
the url pattern helps a lot with code reuse; e.g. web forms.)

Path wraps up SuperAgent, so one can make requests from the server
and browser.

```js
userPath.get({
  params: {user: 'fred'}
})
.end(function(res) {
  // Check out Fred's res.body...
});
```

If the `user` param doesn't match the RegExp, the request will be avoided
completely, and a valid 404 SuperAgent response will be returned.

At this point, though, there is no server. Attach http methods to the
Path and serve them using Express. For example,

```js
var userPath = Path({
  pattern: '/users/<user>',
  params: {
    user: /\w+/
  },
  get: function(req, res) {
    res.send({username: req.params.user});
  }
});
```

(`get` can also be an array of middleware functions; just make sure to
call `next()` in each.)

To serve the path in node.js:

```js
var app = express();
userPath.serve(app);
```

Do not attach the middleware function(s) directly to the Path config
object, because they'll end up in the browser bundle of your app. Use
absolute module strings instead:

```js
var userPath = Path({
  pattern: '/users/<user>',
  params: {
    user: /\w+/
  },
  get: __dirname + '/get',
  post: __dirname + '/post'
});
```

The above tells a client that the `GET/POST` endpoints exist (because `get` and
`post` are truthy), and tells the server where to find the middleware when you
call `userPath.serve(app)`.  Make sure the modules export a single middleware
function or an array of middleware functions.

That's basically it.

One more bump in the road occurs when dealing with hostnames. Accessing your
API from another service on your backend requires requesting a host like
`localhost:3333` or something, whereas on the client it's something like
`https://api.app.com`. Path doesn't really help you with this (apart from
separating host from path), but here are some ways to deal with it.

One strategy is to use environment variables.

```js
var userPath = Path({
  host: process.env.API_HOST,
  pattern: '/users/<user>',
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

Now I can write my Path isomorphically,

```js
var userPath = Path({
  host: require('./host'),
  pattern: '/users/<user>',
  params: {
    user: /\w+/
  }
});
```


## License

MIT
