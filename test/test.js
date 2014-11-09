var Route = require('..');
var expect = require('expect.js');

describe('Route', function() {

  var route = new Route({
    host: 'localhost:3333',
    path: '/articles/<article>',
    params: {article: /\w+/},
    get: true,
    parent: {
      path: '/users/<user>',
      params: {user: /[^\/]+/},
      parent: {
        path: '/',
        params: {}
      }
    }
  });

  describe('path()', function() {
    it('should build a route string', function() {
      expect(
        route.path({
          user: 'tory',
          article: 'health'
        })
      ).to.be('/users/tory/articles/health');
    });

    it('should throw on undefined param', function() {
      expect(route.path.bind(route, {})).to.throwException(/EBADPARAM/);
    });

    it('should throw on invalid param', function() {
      expect(route.path.bind(route, {user: 'tory', article: '!@#%^'}))
      .to
      .throwException(/ebadparam/i);
    });
  });

  describe('props()', function() {
    it('should match', function() {
      //console.log(route.regexp.source);
      var props = route.props('/users/tory/articles/health');
      expect(props).to.be.ok();
      expect(props.user).to.be('tory');
      expect(props.article).to.be('health');
    });
  });

  describe('query()', function() {
    it('should take non-path param props', function() {
      expect(
        route.query({user: 'tory', article: 'health', page: '1'})
      ).to.eql(
        {page: '1'}
      );
    });
  });

});
