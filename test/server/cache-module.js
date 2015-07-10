var expect = require('expect');
var cModule = require('../../cacheModule');
var cacheModule = new cModule();

var key = 'key';
var value = 'value';

beforeEach(function(){
  cacheModule.flush();
});

describe('cacheModule Tests', function () {
  it('Getting absent key should return null', function (done) {
    cacheModule.get(key, function (err, result){
      expect(result).toBe(null);
      done();
    });
  });
  it('Setting then getting key should return value', function (done) {
    cacheModule.set(key, value);
    cacheModule.get(key, function (err, result) {
      expect(result).toBe(value);
      done();
    });
  });
  it('Setting then deleting then getting key should return null', function (done) {
    cacheModule.set(key, value);
    cacheModule.del(key);
    cacheModule.get(key, function (err, result) {
      expect(result).toBe(null);
      done();
    });
  });
  it('Setting several keys then calling .flushAll() should remove all keys', function (done) {
    cacheModule.set(key, value);
    cacheModule.set('key2', 'value2');
    cacheModule.set('key3', 'value3');
    cacheModule.flush();
    cacheModule.get(key, function (err, response){
      expect(response).toBe(null);
      cacheModule.get(key, function (err, response){
        expect(response).toBe(null);
        cacheModule.get(key, function (err, response){
          expect(response).toBe(null);
          done();
        });
      });
    });
  });
  it('Setting several keys then calling .mget() should retrieve all keys', function (done) {
    cacheModule.set(key, value);
    cacheModule.set('key2', 'value2');
    cacheModule.set('key3', 'value3');
    cacheModule.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });
  it('Setting several keys via .mset() then calling .mget() should retrieve all keys', function (done) {
    cacheModule.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    cacheModule.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });
});
