var request = require('superagent');
var extend = require('xtend');
var tick = process.nextTick;
var Class = require('osh-class');



// http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


var Hierarchy = Class(function(opts) {
  var Constructor = this.constructor; // Must detach Constructor from 'this'!
  this.parent = opts.parent && Constructor(opts.parent);
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

var Path = Class(Hierarchy, function(opts) {
  this._super(opts);
  var parent = this.parent || {};
  this.pattern = (parent.pattern || '') + opts.pattern.replace(/\/$/, '');
  this.params = extend(parent.params || {}, opts.params);
  this.host = opts.host || '';
  //this.query = opts.query || {}; // Do not inherit.
  //this.queryKeys = Object.keys(this.query).sort();
});

var proto = Path.prototype;

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
  var name, value, regexp;
  
  for (name in this.params) {
    value = params[name];
    regexp = this.params[name];
    if (value !== undefined && regexp.test(value)) {
      string = string.replace(
        new RegExp('<' + RegExp.escape(name) + '>', 'g'),
        function() {return encodeURIComponent(value);}
      );
    }
    else return;
  }

  //for (var i = 0, len = this.queryKeys.length; i < len; i++) {
  //  name = this.queryKeys[i];
  //  if (value = params[name]) {
  //    if (this.query[name].test(value)) {
  //      string += (
  //        (i == 0 ? '?' : '&') +
  //        name + '=' + encodeURIComponent(value)
  //      );
  //    }
  //    else return;
  //  }
  //}

  return string;
};

/**
 *  Return a uri with query parameters sorted by key for comparing
 *  .
 */

proto.uri = function(opts) {
  opts = opts || {};
  var uri = this.string(opts.params);
  var query = opts.query || {};
  var queryKeys = Object.keys(query).sort();
  var key;

  for (var i = 0, len = queryKeys.length; i < len; i++) {
    key = queryKeys[i];
    uri += (
      (i == 0 ? '?' : '&') +
      key + '=' + query[key]
    );
  }

  return uri;
};

Path.VERBS = ['get', 'post', 'del', 'put'];

Path.VERBS.forEach(function(verb) {
  proto[verb] = function(opts) {
    var path;
    var msg;

    if (!this.opts[verb]) {
      msg = (
        'No ' + verb.toUpperCase() + ' method ' +
        'on Path: ' + JSON.stringify(this.opts)
      );
    }
    else if ((path = this.string(opts.params)) === undefined) {
      msg = (
        'Bad param in: ' + JSON.stringify(opts.params) +
        ' for Path: ' + JSON.stringify(this.opts)
      );
    }

    if (msg) {
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
          error: new Error('Not found: ' + msg),
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
      console.log('Requesting ' + verb.toUpperCase() + ' ' + (opts.host || this.host || '') + path);
      return (
        request[verb](
          (opts.host || this.host || '') +
          path
        )
        .query(opts.query || {})
      );
    }
  };
});

module.exports = Path;
