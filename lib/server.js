var Path = require('./base');
var Class = require('osh-class');
var extend = require('xtend/mutable');

var ServerPath = Class(Path, function(opts) {
  this._super(opts);
  this.compilePattern();
});

/**
 *  Compile an array of strings and regular expressions into
 *  a RegExp for matching uris. Each segment (element of the input
 *  array) is prepended with '/'. If a segment is a RegExp instance,
 *  then its source is modified as follows:
 *
 *    - '^' is stripped from the beginning,
 *    - '$' is stripped from the end, and
 *    - the result is surrounded by '(' and ')'
 *
 *  Capture groups within a segment RegExp are retained; these
 *  must be given ids in your region configuration in addition to an id
 *  for the entire segment.
 *
 *  Let's say your pattern is ['users', /^(\w+)-(\w+)$/], where the first
 *  part of the RegExp segment is first name and second is last name.
 *  The resulting uri RegExp will be:
 *
 *    /^\/users\/((\w+)-(\w+))\/?$/
 *
 *  Therefore, your region ids should be something like:
 *  ['name', 'first', 'last'].
 *  
 *
 *  {
 *    path: '/users/:name',
 *    ids: {
 *      name: {
 *        re: /(\w+)-(\w+)/,
 *        ids: ['first', 'last']
 *      }
 *    }
 *  }
 *
 *
 *  Arguments:
 *    - pattern (Array<String|RegExp>)
 *
 *  Returns:
 *    (RegExp)
 */


ServerPath.prototype.compilePattern = function() {
  var source = '^';
  var part;
  var parts = this.pattern.split(/[<>]/);
  var array = [];

  for (var i = 0; i < parts.length; i++) {
    part = parts[i];
    source += (
      i % 2 ?
      ( '(' +
        this.params[part].source
        .replace(/^\^/, '')
        .replace(/\$$/, '') +
      ')' ) :
      RegExp.escape(part)
    );
    (i % 2) && array.push(part);
  }

  this.regexp = new RegExp(source + '/?$');
  this.array = array;
};


/**
 *  Because the route pattern is always a RegExp, and regions always
 *  specify their parameter ids, we create a new object on the request
 *  that maps ids to parameter values from the path.
 *
 *  Arguments:
 *    - values (Array<String>)
 *    - params (Object): This
 */

ServerPath.prototype.match = function(string) {
  var m = this.regexp.exec(string);
  if (m) {
    return this.idParams(
      Array.prototype.slice.call(m, 1)
    );
  }
};

ServerPath.prototype.idParams = function(paramArray) {
  var params = {};
  for (var i = 0; i < this.array.length; i++) {
    params[this.array[i]] = paramArray[i];
  }
  return params;
};

/**
 *
 *  middleware can be an absolute path to a module that
 *  exports
 */

ServerPath.prototype.serve = function(opts) {
  var self = this;
  var app = ('function' == typeof opts) ? opts : opts.app;
  Path.VERBS.forEach(function(verb) {

    var middleware;
    if (middleware = self.opts[verb]) {
      middleware = (
        'string' == typeof middleware ?
        require(middleware) :
        middleware
      );

      app[verb](
        self.regexp,
        parseParams,
        middleware
      );

      console.log('Serving ' + verb.toUpperCase() + ' ' + self.pattern);
    }
  });

  function parseParams(req, res, next) {
    extend(
      req.params,
      self.idParams(req.params)
    );
    next();
  }
};


module.exports = ServerPath;
