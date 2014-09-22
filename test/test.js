var Path = require('..');
var expect = require('expect.js');
var express = require('express');
var http = require('http');
var supertest = require('supertest');

describe('Path', function() {

  var path = Path({
    host: 'localhost:3333',
    pattern: '/articles/<article>',
    params: {article: /[^\/]+/},
    get: true,
    parent: {
      pattern: '/users/<user>',
      params: {user: /[^\/]+/},
      parent: {
        pattern: '/',
        params: {}
      }
    }
  });

  describe('string()', function() {
    it('should build a path string', function() {
      expect(
        path.string({
          user: 'tory',
          article: 'health'
        })
      ).to.be('/users/tory/articles/health');
    });
  });

  describe('regexp', function() {
    it('should match a path', function() {
      //console.log(path.regexp.source);
      var m = path.regexp.exec('/users/tory/articles/health');
      expect(m).to.be.ok();
      expect(m[1]).to.be('tory');
      expect(m[2]).to.be('health');
    });
  });

  describe('verb', function() {
    var server;
    before(function(done) {
      server = http.createServer(
        express().get('/users/:user/articles/:article', function(req, res) {
          res.send({
            user: req.params.user,
            article: req.params.article
          });
        })
      );
      server.listen(3333, done);
    });

    it('should make a request', function(done) {
      path.get({
        user: 'tory',
        article: 'health'
      })
      .end(function(res) {
        expect(res.ok).to.be.ok();
        expect(res.body.user).to.be('tory');
        expect(res.body.article).to.be('health');
        done();
      });
    });

    it('should fail a request', function(done) {
      path.post(
        {user: 'tory', article: 'health'}
      )
      .end(function(res) {
        expect(res.ok).not.to.be.ok();
        expect(res.status).to.be(404);
        done();
      });
    });

    after(function() {
      server && server.close();
    });
  });

  describe('query()', function() {
    it('should accept good query parameter', function() {
      var path = Path({
        pattern: '/',
        query: {
          tab: /^[a-z]+$/
        }
      });
      expect(
        path.query({tab: 'articles'})
      ).to.eql(
        {tab: 'articles'}
      );
    });

    it('should ignore bad query parameter', function() {
      var path = Path({
        pattern: '/',
        query: {
          tab: /^[a-z]+$/
        }
      });
      expect(
        path.query({tab: 'ARTICLES'})
      ).to.eql({});
    });
  });

  describe('parse()', function() {
    var path = Path({
      pattern: '/users/<user>',
      params: {user: /\w+/},
      query: {tab: /\w+/}
    });

    it('should skip bad query parameter', function(done) {
      var app = express();
      app.get(
        path.regexp,
        path.parse(),
        function(req, res) {
          expect(req.params.tab).to.be(undefined);
          res.send();
        }
      );
      supertest(app).get('/users/tory?tab=' + encodeURIComponent('!@#$%$'))
      .expect(200, done);
    });

    it('should add query parameter to params', function(done) {
      var app = express();
      app.get(
        path.regexp,
        path.parse(),
        function(req, res) {
          expect(req.params.tab).to.be('articles');
          res.send();
        }
      );
      supertest(app).get('/users/tory?tab=articles')
      .expect(200, done);
    });

  });

  describe('serve()', function() {
    var path = Path({
      pattern: '/users/<user>',
      params: {user: /\w+/}
    });

    var path2 = Path({
      pattern: '/pets/<name>',
      params: {name: /\w+/}
    });

    var app = express();

    path.serve(app, 'get', function(req, res) {
      res.send({upper: req.params.user.toUpperCase()});
    });

    path2.serve(app, 'get',
      function(req, res, next) {
        expect(req.params.name).to.be.ok();
        next();
      },
      function(req, res, next) {
        expect(req.params.name).to.be.ok();
        res.send({name: req.params.name.toUpperCase()});
      }
    );

    path2.serve(app, 'post',
      function(req, res) {
        res.send({});
      }
    );

    var request = supertest(app);

    it('should serve single function', function(done) {
      request.get('/users/tory')
      .end(function(err, res) {
        if (err) done(err);
        else {
          expect(res.body.upper).to.be('TORY');
          done();
        }
      });
    });

    it('should serve middleware array', function(done) {
      request.get('/pets/spot')
      .expect(200, /"name":"SPOT"/, done);
    });
  });
});
