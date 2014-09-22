var request = require('superagent');
var extend = require('xtend');
var tick = process.nextTick;
var Class = require('osh-class');


// http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


var Hierarchy = Class({
  constructor: function(opts) {
    var Constructor = this.constructor; // Must detach Constructor from 'this'!
    if (opts.parent) {
      this.parent = (
        opts.parent instanceof Constructor ?
        opts.parent : Constructor(opts.parent)
      );
    }
  }
});


/**
 *  Options:
 *    - pattern {String}: The pattern string has only one simple rule;
 *      any sections surrounded by '<' and '>' are considered parameters and
 *      should have a corresponding RegExp defined in the given params object.
 *    - params {Object<String, RegExp>} (optional):
 *    - parent {Function|Object}: If a function, we assume, it was
 *      created by a call to Path(...). If an object, we create a Path.
 */

var Path = Class(Hierarchy, {
  constructor: function(opts) {
    this._super(opts);
    var parent = this.parent || {};
    this.pattern = (parent.pattern || '') + opts.pattern.replace(/\/$/, '');
    this.params = extend(parent.params || {}, opts.params);
    this.host = opts.host || '';
    this._query = opts.query || {}; // Do not inherit.
    this.queryKeys = Object.keys(this._query).sort();
  }
});

var proto = Path.prototype;

var ParamError = Class(Error, function(opts) {
  this.name = opts.name;
  this.value = opts.value;
  this.message = (
    'Invalid path parameter ' + name + '=' +
    value.toString()
  );
});

/**
 *  Build the path string from parameters. If the parameters do
 *  not fully describe the path, return undefined.
 *
 *  Example:
 *    var path = Path({
 *      pattern: '/users/<user>',
 *      params: {user: /\w+/}
 *      parent: {
 *        pattern: '/api'
 *      }
 *    });
 *    path.string({user: 'tory'}); // '/api/users/tory'
 *
 */
  
proto.string = function(params) {
  params = params || {};

  var string = this.pattern;
  var name;
  var value;
  var regexp;
  
  for (name in this.params) {
    value = params[name];
    regexp = this.params[name];
    if (value !== undefined && regexp.test(value)) {
      string = string.replace(
        new RegExp('<' + RegExp.escape(name) + '>', 'g'),
        function() {return encodeURIComponent(value);}
      );
    }
    else {
      throw ParamError({
        name: name,
        value: value
      });
    }
  }

  return string;
};


var QueryError = Class(Error, function _QueryError(opts) {
  this.key = opts.key;
  this.value = opts.value;
  this.message = (
    'Invalid query parameter ' + opts.key + '=' +
    opts.value.toString()
  );
});

/**
 *  Return a uri with query parameters sorted by key for comparing
 *  .
 */

proto.uri = function(params) {
  params = params || {};

  var uri = this.string(params);
  var query = this.query(params);

  for (var key in query) {
    uri += (
      (i == 0 ? '?' : '&') +
      encodeURIComponent(key) + '=' +
      encodeURIComponent(query[key])
    );
  }

  return uri;
};

/**
 *  Returns query object given a bunch of uri parameters. If a
 *  parameter's name matches, but the value does not satisfy the
 *  associated RegExp, it is not placed in the resulting query
 *  object. Therefore, one can test a valid query parameter via:
 *
 *    var q = path.query({a: 'bad'});
 *    if (!('a' in q));
 */

proto.query = function(params) {
  params = params || {};

  var query = {};
  var queryKeys = this.queryKeys; //Object.keys(query).sort();
  var key;
  var value;
  var regexp;

  for (var i = 0, len = queryKeys.length; i < len; i++) {
    key = queryKeys[i];
    value = params[key];
    regexp = this._query[key];
    if (value !== undefined && regexp.test(value)) {
      //if (!regexp.test(value)) {
      //  throw QueryError({
      //    key: key,
      //    value: value
      //  });
      //}
      query[key] = value;
    }
  }

  return query;
};

Path.VERBS = ['get', 'post', 'del', 'put'];

Path.VERBS.forEach(function(verb) {
  proto[verb] = function(params) {
    var path;
    var query;
    var err;

    try {
      path = this.string(params);
      query = this.query(params);
    }
    catch (e) {
      err = e;
    }

    if (err) {
      var req = request[verb]('');

      // Replace end() method to return 404 response immediately. Response
      // is not actually a superagent Response object, but conforms to its
      // basic api.

      req.end = function(fn) {
        var res = {
          ok: false,
          status: 404,
          statusType: 4,
          clientError: true,
          serverError: false,
          error: err,
          notFound: true
        };

        tick(function() {
          if (fn) {
            if (fn.length == 2) fn(null, res);
            else fn(res);
          }
        });
      };

      return req;
    }
    else {
      console.log('Requesting ' + verb.toUpperCase() + ' ' + (this.host || '') + path);
      return (
        request[verb](
          (this.host || '') +
          path
        )
        .query(query)
      );
    }
  };
});

Path.ParamError = ParamError;
Path.QueryError = QueryError;

module.exports = Path;
