var Path = require('./base');
var Class = require('osh-class');
var extend = require('xtend/mutable');

var ServerPath = Class(Path, {
  constructor: function(opts) {
    this._super(opts);
    this.compileRegExp();
  }
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


ServerPath.prototype.compileRegExp = function() {
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

ServerPath.prototype.parse = function() {
  var self = this;
  var _query = this._query;

  return function(req, res, next) {
    // Validation of path params happens by virtue of
    // regexp pattern.
    extend(
      req.params,
      self.idParams(req.params)
    );

    // Check query params.
    var regexp;
    var value;
    for (var key in req.query) {
      value = req.query[key];
      if ((regexp = _query[key]) && regexp.test(value)) {
        req.params[key] = value;
      }
    }

    next();
  };
};
  

/**
 *
 *  middleware can be an absolute path to a module that
 *  exports
 */

ServerPath.prototype.serve = function(app, method) {
  console.log('Serving ' + method.toUpperCase() + ' ' + this.pattern);
  app[method].apply(app,
    [
      this.regexp,
      this.parse()
    ]
    .concat(
      Array.prototype.slice.call(arguments, 2)
    )
  );
};


module.exports = ServerPath;
