var merge = require('xtend/immutable');
var extend = require('xtend/mutable');
var parseUri = require('parseUri');


// http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


/**
 *  Options:
 *    - path {String}: The pattern string has only one simple rule;
 *      any sections surrounded by '<' and '>' are considered parameters and
 *      should have a corresponding RegExp defined in the given params object.
 *    - params {Object<String, RegExp>} (optional):
 *    - parent {Function|Object}: If a function, we assume, it was
 *      created by a call to Route(...). If an object, we create a Route.
 */

function Route(opts) {
  var parent = {};
  if (opts.parent) {
    parent = opts.parent.PATH ? opts.parent : new Route(opts.parent);
  }
  this.pattern = '/' + ((parent.pattern || '') + opts.path).replace(/^\/+|\/$/g, '');
  this._params = merge(parent._params || {}, opts.params);
  this.host = opts.host || '';
  this._compile();
}

extend(Route.prototype, {

  _compile: function() {
    var source = '^';
    var paramNames = [];
    var parts = this._parts = this.pattern.split(/[<>]/);
    for (var i = 0; i < parts.length; i++) {
      part = parts[i];
      source += (
        i % 2 ?
        // Enforces that param RegExp exists on Route creation.
        '(' + this._params[part].source.replace(/^\^/, '').replace(/\$$/, '') + ')' :
        RegExp.escape(part)
      );
      (i % 2) && paramNames.push(part);
    }
    this._paramNames = paramNames;
    this.PATH = new RegExp(source + '/?$');
  },


  /*\
   *
   *  Build the path string from parameters. If the parameters do
   *  not fully describe the path, return undefined.
   *
   *  Example:
   *
   *    var route = new Route({
   *      path: '/users/<user>',
   *      params: {user: /\w+/}
   *      parent: {
   *        path: '/api'
   *      }
   *    });
   *    route.path({user: 'tory'}); // '/api/users/tory'
   *
  \*/

  path: function(props) {
    props = props || {};
  
    var path = '';
    var part;
    var value;

    for (var i = 0, len = this._parts.length; i < len; i++) {
      part = this._parts[i];
      if (i % 2) {
        value = props[part];
        // RegExp in this._params is guaranteed to exist at this point.
        // See _compile() method comments.
        if (!value || !this._params[part].test(value)) return;
        path += encodeURIComponent(value);
      }
      else path += part;
    }

    return path;
  },

  /**
   *  Return a uri with query parameters sorted by key.
   */
  
  uri: function(props) {
    var path = this.path(props);
    if (path === undefined) return;
    return path + this.qs(props);
  },

  query: function(props) {
    var query = {};
    this._iterQuery(props, function(key, value) {
      query[key] = value;
    });
    return query;
  },
  
  qs: function(props) {
    var query = [];
    this._iterQuery(props, function(key, value) {
      query.push(
        encodeURIComponent(key) + '=' +
        encodeURIComponent(value)
      );
    });
    return (query.length ? '?' : '') + query.join('&');
  },
  
  params: function(path) {
    var match = this.PATH.exec(path);
    if (!match) return;

    var name;
    var params = {};
    for (var i = 1, len = match.length; i < len; i++) {
      name = this._paramNames[i - 1];
      params[name] = decodeURIComponent(match[i]);
    }
  
    return params;
  },

  props: function(uri) {
    uri = parseUri(uri);
    var params = this.params(uri.path);
    if (!params) return;
    for (var name in uri.queryKey) {
      params[decodeURIComponent(name)] = decodeURIComponent(uri.queryKey[name]);
    }
    return params;
  },

  /**
   *  Apply fn over the query string pairs in sorted order by key.
   */

  _iterQuery: function(props, fn) {
    props = props || {};
    var names = Object.keys(props).sort();
    var name;

    for (var i = 0, len = names.length; i < len; i++) {
      !((name = names[i]) in this._params) && fn(name, props[name]);
    }
  }
});

module.exports = Route;
