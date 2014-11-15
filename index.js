var merge = require('xtend/immutable');
var extend = require('xtend/mutable');
var parseUri = require('parseUri');


// http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


/**
 *  Options:
 *    - pattern {String}: The pattern string has only one simple rule;
 *      any sections surrounded by '<' and '>' are considered parameters and
 *      should have a corresponding RegExp defined in the given params object.
 *    - params {Object<String, RegExp>} (optional):
 *    - parent {Function|Object}: If a function, we assume, it was
 *      created by a call to Route(...). If an object, we create a Route.
 */

function Route(opts) {
  var parent = {};
  if (opts.parent) {
    parent = new Route(opts.parent);
  }
  this._path = '/' + ((parent._path || '') + opts.path).replace(/^\/+|\/$/g, '');
  this._params = merge(parent._params || {}, opts.params);
  this.host = opts.host || '';
  this._compile();
}

extend(Route.prototype, {

  _compile: function() {
    var source = '^';
    var parts = this._path.split(/[<>]/);
    var paramNames = [];
    for (var i = 0; i < parts.length; i++) {
      part = parts[i];
      source += (
        i % 2 ? '(.*)' : RegExp.escape(part)
      );
      (i % 2) && paramNames.push(part);
    }
    this._paramNames = paramNames;
    this._regexp = new RegExp(source + '/?$');
  },

  validate: function(name, value) {
    if (value === undefined) return;
    var validator = this._params[name];
    if (!validator) return;
    var valid = (
      validator instanceof RegExp ?
      validator.test(value) :
      validator(value)
    );
    return valid;
  },


  /*\
   *
   *  Build the path string from parameters. If the parameters do
   *  not fully describe the path, throw an error.
   *
   *  Example:
   *
   *    var route = Route({
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
  
    var path = this._path;
    var name;
    var value;
    var regexp;

    for (name in this._params) {
      value = props[name];
      if (this.validate(name, value)) {
        path = path.replace(
          new RegExp('<' + RegExp.escape(name) + '>', 'g'),
          function() {return encodeURIComponent(value);}
        );
      }
      else {
        throw new Error('EBADPARAM: ' + name);
      }
    }
  
    return path;
  },

  /**
   *  Return a uri with query parameters sorted by key for comparing
   *  .
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
    var match = this._regexp.exec(path);
    if (!match) return;

    var name;
    var value;
    var params = {};
    for (var i = 1, len = match.length; i < len; i++) {
      name = this._paramNames[i - 1];
      value = match[i];
      if (!this.validate(name, value)) return;
      params[name] = value;
    }
  
    return params;
  },

  props: function(uri) {
    uri = parseUri(uri);
    var params = this.params(uri.path);
    if (!params) return;
    return merge(params, uri.queryKey);
  },
  
  /**
   *  Returns query object given a bunch of uri parameters. If a
   *  parameter's name matches, but the value does not satisfy the
   *  associated RegExp, it is not placed in the resulting query
   *  object. Therefore, one can test a valid query parameter via:
   *
   *    var q = path.query({a: 'bad'});
   *    if (!('a' in q));
   */
  
  _iterQuery: function(props, fn) {
    props = props || {};
    var names = Object.keys(props).sort();
    var name;

    for (var i = 0, len = names.length; i < len; i++) {
      if (!((name = names[i]) in this._params)) {
        fn(name, props[name]);
      }
    }
  }
});

module.exports = Route;
