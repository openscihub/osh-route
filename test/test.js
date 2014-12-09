var Route = require('..');
var expect = require('expect.js');

describe('Route', function() {

  var route = new Route({
    host: 'localhost:3333',
    path: '/articles/<article>',
    params: {article: /\w+/},
    parent: {
      path: '/users/<user>',
      params: {user: /[^\/]+/},
      parent: {
        path: '/',
        params: {}
      }
    }
  });

  describe('PATH', function() {
    it('should be the right RegExp', function() {
      expect('/users/tory/articles/article').to.match(route.PATH);
      expect('/users/tory/articles/article/').to.match(route.PATH);
    });
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

    it('should return undefined on undefined param', function() {
      expect(route.path({})).to.be(undefined);
    });

    it('should return undefined on invalid param', function() {
      expect(route.path({user: 'tory', article: '!@#%^'}))
      .to.be(undefined);
    });

    it('should return at least /', function() {
      var route = new Route({
        path: ''
      });
      expect(route.path()).to.be('/');
    });

    it('should not repeat slashes', function() {
      var route = new Route({
        path: '/',
        parent: {path: '/'}
      });
      expect(route.path()).to.be('/');

      route = new Route({
        path: '/slashes/',
        parent: {path: '/slashes/'}
      });
      expect(route.path()).to.be('/slashes/slashes');
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

  describe('uri()', function() {
    it('should put the slash in', function() {
      var route = new Route({
        path: ''
      });
      expect(route.uri({hi: 'hi'})).to.be('/?hi=hi');
    });
  });
});
