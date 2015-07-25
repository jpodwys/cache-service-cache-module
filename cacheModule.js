/**
 * cacheModule constructor
 * @constructor
 * @param config: {
 *    type:                           {string | 'cache-module'}
 *    verbose:                        {boolean | false},
 *    expiration:                     {integer | 900},
 *    readOnly:                       {boolean | false},
 *    checkOnPreviousEmpty            {boolean | true},
 *    backgroundRefreshEnabled        {boolean | false},
 *    backgroundRefreshIntervalCheck  {boolean | true},
 *    backgroundRefreshInterval       {integer | 60000},
 *    backgroundRefreshMinTtl         {integer | 70000}
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
  self.backgroundRefreshEnabled = (typeof config.backgroundRefreshEnabled === 'boolean') ? config.backgroundRefreshEnabled : false;
  self.backgroundRefreshIntervalCheck = (typeof config.backgroundRefreshIntervalCheck === 'boolean') ? config.backgroundRefreshIntervalCheck : true;
  self.backgroundRefreshInterval = config.backgroundRefreshInterval || 60000;
  self.backgroundRefreshMinTtl = config.backgroundRefreshMinTtl || 70000;
  var cache = {
    db: {},
    expirations: {},
    refreshKeys: {}
  };

  if(self.backgroundRefreshEnabled){
    if(self.backgroundRefreshIntervalCheck){
      if(self.backgroundRefreshInterval > self.backgroundRefreshMinTtl){
        throw new exception('BACKGROUND_REFRESH_INTERVAL_EXCEPTION', 'backgroundRefreshInterval cannot be greater than backgroundRefreshMinTtl.');
      }
    }
    setInterval(function(){
      backgroundRefresh();
    }, self.backgroundRefreshInterval);
  }

  log(false, 'Cache-module client created with the following defaults:', {expiration: this.expiration, verbose: this.verbose, readOnly: this.readOnly});

  /**
   ******************************************* PUBLIC FUNCTIONS *******************************************
   */

  /**
   * Get the value associated with a given key
   * @param {string} key
   * @param {function} cb
   * @param {string} cleanKey
   */
  self.get = function(key, cb, cleanKey){
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.get() requires 2 arguments.');
    }
    log(false, 'get() called:', {key: key});
    try {
      var cacheKey = (cleanKey) ? cleanKey : key;
      var now = Date.now();
      var expiration = cache.expirations[key];
      if(expiration > now){
        cb(null, cache.db[key]);
      }
      else{
        expire(key);
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
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.mget() requires 2 arguments.');
    }
    log(false, '.mget() called:', {keys: keys});
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
   * @param {function} refresh
   * @param {function} cb
   */
  self.set = function(){
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.set() requires a minimum of 2 arguments.');
    }
    var key = arguments[0];
    var value = arguments[1];
    var expiration = arguments[2] || null;
    var refresh = (arguments.length == 5) ? arguments[3] : null;
    var cb = (arguments.length == 5) ? arguments[4] : arguments[3];
    log(false, '.set() called:', {key: key, value: value});
    try {
      if(!self.readOnly){
        expiration = (expiration) ? (expiration * 1000) : self.defaultExpiration;
        var exp = expiration + Date.now();
        cache.expirations[key] = exp;
        cache.db[key] = value;
        if(cb) cb();
        if(refresh){
          cache.refreshKeys[key] = {expiration: exp, lifeSpan: expiration, refresh: refresh};
        }
      }
    } catch (err) {
      log(true, '.set() failed for cache of type ' + self.type, {name: 'CacheModuleSetException', message: err});
    }
  }

  /**
   * Associate multiple keys with multiple values and optionally set expirations per function and/or key
   * @param {object} obj
   * @param {integer} expiration
   * @param {function} cb
   */
  self.mset = function(obj, expiration, cb){
    if(arguments.length < 1){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.mset() requires a minimum of 1 argument.');
    }
    log(false, '.mset() called:', {data: obj});
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
    if(arguments.length < 1){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.del() requires a minimum of 1 argument.');
    }
    log(false, '.del() called:', {keys: keys});
    if(typeof keys === 'object'){
      for(var i = 0; i < keys.length; i++){
        var key = keys[i];
        delete cache.db[key];
        delete cache.expirations[key];
        delete cache.refreshKeys[key];
      }
      if(cb) cb(null, keys.length);
    }
    else{
      delete cache.db[keys];
      delete cache.expirations[keys];
      delete cache.refreshKeys[keys];
      if(cb) cb(null, 1); 
    }
  }

  /**
   * Flush all keys and values
   * @param {function} cb
   */
  self.flush = function(cb){
    log(false, '.flush() called');
    cache.db = {};
    cache.expirations = {};
    cache.refreshKeys = {};
    if(cb) cb();
  }

  /**
   ******************************************* PRIVATE FUNCTIONS *******************************************
   */

  /**
   * Delete a given key from cache.db and cache.expirations but not from cache.refreshKeys
   * @param {string} key
   */
  function expire(key){
    delete cache.db[key];
    delete cache.expirations[key];
  }

  /**
   * Refreshes all keys that were set with a refresh function
   */
  function backgroundRefresh(){
    for(key in cache.refreshKeys){
      if(cache.refreshKeys.hasOwnProperty(key)){
        var data = cache.refreshKeys[key];
        if(data.expiration - Date.now() < self.backgroundRefreshMinTtl){
          data.refresh(function (err, response){
            if(!err){
              self.set(key, response, data.lifeSpan, data.refresh, noop);
            }
          });
        }
      }
    }
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
