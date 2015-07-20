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
  //self.backgroundRefresh = (typeof config.backgroundRefresh === 'boolean') ? config.backgroundRefresh : false;
  self.backgroundRefreshInterval = config.backgroundRefreshInterval || 60000;
  self.backgroundRefreshTtl = config.backgroundRefreshTtl || 70000;
  self.db = {};
  self.expirations = {};
  self.refreshKeys = {};

  setInterval(function(){

    for(key in self.refreshKeys){
      if(self.refreshKeys.hasOwnProperty(key)){
        var data = self.refreshKeys[key];
        if(data.expiration - Date.now() < self.backgroundRefreshTtl){
          data.refresh(function (err, response){
            if(!err){
              self.set(key, response, data.lifeSpan, data.refresh, noop);
            }
          });
        }
      }
    }

  }, self.backgroundRefreshInterval);

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
      var expiration = self.expirations[key] || this.defaultExpiration;
      if(expiration && expiration > now){
        cb(null, self.db[key]);
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
  self.set = function(){

    var key = arguments[0];
    var value = arguments[1];
    var expiration = arguments[2] || null;
    var refresh = (arguments.length == 5) ? arguments[3] : null;
    var cb = (arguments.length == 5) ? arguments[4] : arguments[3];

    log(false, 'Attempting to set key:', {key: key, value: value});
    //try {
      if(!self.readOnly){
        expiration = (expiration) ? (expiration * 1000) : self.defaultExpiration;
        var exp = expiration + Date.now();
        self.expirations[key] = exp;
        self.db[key] = value;
        if(cb) cb();
        if(refresh){
          self.refreshKeys[key] = {expiration: exp, lifeSpan: expiration, refresh: refresh};
        }
      }
    //} catch (err) {
    //  log(true, 'Set failed for cache of type ' + self.type, {name: 'CacheModuleSetException', message: err});
    //}
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
        self.db[key] = undefined;
        self.expirations[key] = undefined;
      }
      if(cb) cb(null, keys.length);
    }
    else{
      self.db[keys] = undefined;
      self.expirations[keys] = undefined;
      if(cb) cb(null, 1); 
    }
  }

  /**
   * Flush all keys and values
   * @param {function} cb
   */
  self.flush = function(cb){
    log(false, 'Attempting to flush all data.');
    self.db = {};
    self.expirations = {};
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

  function noop(){}
}

module.exports = cacheModule;
