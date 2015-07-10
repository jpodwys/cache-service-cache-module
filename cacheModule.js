/**
 * cacheModule constructor
 * @constructor
 * @param config: {
 *    type:                 {string | 'cache-module'}
 *    verbose:              {boolean | false},
 *    expiration:           {integer | 900},
 *    readOnly:             {boolean | false},
 *    checkOnPreviousEmpty  {boolean | true}
 * }
 */
function cacheModule(config){
  var self = this;
  config = config || {};
  self.verbose = config.verbose || false;
  self.type = config.type || 'cache-module';
  self.defaultExpiration = config.defaultExpiration || 900;
  self.readOnly = (typeof config.readOnly === 'boolean') ? config.readOnly : false;
  self.checkOnPreviousEmpty = (typeof config.checkOnPreviousEmpty === 'boolean') ? config.checkOnPreviousEmpty : true;
  var cache = {
    db: {},
    expirations: {}
  };
  log(false, 'Cache-module client created with the following defaults:', {expiration: this.expiration, verbose: this.verbose, readOnly: this.readOnly});

  /**
   * Get the value associated with a given key
   * @param {string} key
   * @param {function} cb
   * @param {string} cleanKey
   */
  self.get = function(key, cb, cleanKey){
    log(false, 'Attempting to get key:', {key: key});
    try {
      var cacheKey = (cleanKey) ? cleanKey : key;
      log(false, 'Attempting to get key:', {key: cacheKey});
      var now = Date.now();
      var expiration = cache.expirations[key] || this.defaultExpiration;
      if(expiration && expiration > now){
        cb(null, cache.db[key]);
      }
      else{
        self.del(key);
        cb(null, null);
      }

    } catch (err) {
      cb({name: 'GetException', message: err}, null);
    }
  }

  /**
   * Get multiple values given multiple keys
   * @param {array} keys
   * @param {function} cb
   * @param {integer} index
   */
  self.mget = function(keys, cb, index){
    log(false, 'Attempting to mget keys:', {keys: keys});
    var values = {};
    for(var i = 0; i < keys.length; i++){
      var key = keys[i];
      self.get(key, function(err, response){
        if(response !== null){
          values[key] = response;
        }
      });
    }
    cb(null, values, index);
  }

  /**
   * Associate a key and value and optionally set an expiration
   * @param {string} key
   * @param {string | object} value
   * @param {integer} expiration
   * @param {function} cb
   */
  self.set = function(key, value, expiration, cb){
    log(false, 'Attempting to set key:', {key: key, value: value});
    try {
      if(!self.readOnly){
        expiration = expiration || self.defaultExpiration;
        var exp = (expiration) ? (expiration * 1000) : self.defaultExpiration;
        cache.expirations[key] = Date.now() + exp;
        cache.db[key] = value;
        if(cb) cb();
      }
    } catch (err) {
      log(true, 'Set failed for cache of type ' + self.type, {name: 'NodeCacheSetException', message: err});
    }
  }

  /**
   * Associate multiple keys with multiple values and optionally set expirations per function and/or key
   * @param {object} obj
   * @param {integer} expiration
   * @param {function} cb
   */
  self.mset = function(obj, expiration, cb){
    log(false, 'Attempting to mset data:', {data: obj});
    for(key in obj){
      if(obj.hasOwnProperty(key)){
        var tempExpiration = expiration || self.defaultExpiration;
        var value = obj[key];
        if(typeof value === 'object' && value.cacheValue){
          tempExpiration = value.expiration || tempExpiration;
          value = value.cacheValue;
        }
        self.set(key, value, tempExpiration);
      }
    }
    if(cb) cb();
  }

  /**
   * Delete the provided keys and their associated values
   * @param {array} keys
   * @param {function} cb
   */
  self.del = function(keys, cb){
    log(false, 'Attempting to delete keys:', {keys: keys});
    if(typeof keys === 'object'){
      for(var i = 0; i < keys.length; i++){
        var key = keys[i];
        cache.db[key] = undefined;
        cache.expirations[key] = undefined;
      }
      if(cb) cb(null, keys.length);
    }
    else{
      cache.db[keys] = undefined;
      cache.expirations[keys] = undefined;
      if(cb) cb(null, 1); 
    }
  }

  /**
   * Flush all keys and values
   * @param {function} cb
   */
  self.flush = function(cb){
    log(false, 'Attempting to flush all data.');
    cache.db = {};
    cache.expirations = {};
    if(cb) cb();
  }

  /**
   * Error logging logic
   * @param {boolean} isError
   * @param {string} message
   * @param {object} data
   */
  function log(isError, message, data){
    var indentifier = 'cacheModule: ';
    if(self.verbose || isError){
      if(data) console.log(indentifier + message, data);
      else console.log(indentifier + message);
    }
  }
}

module.exports = cacheModule;
