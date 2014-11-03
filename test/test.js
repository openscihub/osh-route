var Route = require('..');
var expect = require('expect.js');

describe('Route', function() {

  var route = Route({
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

    it('should return undefined on undefined param', function() {
      expect(route.path({})).to.be(undefined);
    });

    it('should return undefined on invalid param', function() {
      expect(route.path({user: 'tory', article: '!@#%^'}))
      .to
      .be(undefined);
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
    it('should accept good query parameter', function() {
      var route = Route({
        path: '/',
        query: {
          tab: /^[a-z]+$/
        }
      });
      expect(
        route.query({tab: 'articles'})
      ).to.eql(
        {tab: 'articles'}
      );
    });

    it('should ignore bad query parameter', function() {
      var route = Route({
        path: '/',
        query: {
          tab: /^[a-z]+$/
        }
      });
      expect(route.query({tab: 'ARTICLES'})).to.eql({});
    });
  });

});
