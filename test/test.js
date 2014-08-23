var Path = require('..');
var expect = require('expect.js');
var express = require('express');
var http = require('http');
var supertest = require('supertest');

describe('Path', function() {

  var path = Path({
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
        host: 'localhost:3333',
        params: {user: 'tory', article: 'health'}
      })
      .end(function(res) {
        expect(res.ok).to.be.ok();
        expect(res.body.user).to.be('tory');
        expect(res.body.article).to.be('health');
        done();
      });
    });

    it('should fail a request', function(done) {
      path.post({
        host: 'localhost:3333',
        params: {user: 'tory', article: 'health'}
      })
      .end(function(res) {
        expect(res.ok).not.to.be.ok();
        expect(res.error.message).to.match(/method/);
        done();
      });
    });

    after(function() {
      server && server.close();
    });
  });

  describe('serve()', function() {
    var path = Path({
      pattern: '/users/<user>',
      params: {user: /\w+/},
      get: function(req, res) {
        res.send({upper: req.params.user.toUpperCase()});
      }
    });

    var app = express();
    path.serve(app);

    var request = supertest(app);

    it('should work', function(done) {
      request.get('/users/tory')
      .end(function(err, res) {
        if (err) done(err);
        else {
          expect(res.body.upper).to.be('TORY');
          done();
        }
      });
    });
  });
});
