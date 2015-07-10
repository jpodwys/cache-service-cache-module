# cache-service-cache-module

* A bare-bones cache plugin for [cache-service](https://github.com/jpodwys/cache-service)
* AND a standalone in-memory cache

# Basic Usage

Require and instantiate
```javascript
var cModule = require('cache-service-cache-module');

var cacheModuleConfig = {defaultExpiration: 60};
var cacheModule = new cModule(cacheModuleConfig);
```

Cache!
```javascript
cacheModule.set('key', 'value');
```

# Benefits of Using `cache-service-cache-module`

If you're using `cache-service-cache-module` with `cache-service`, the benefits are obvious. However, there are also a couple of reasons you might like it as a standalone in-memory cache module:

* No external dependencies.
* It features an excellent `.mset()` implementation which allows you to set expirations on a per key, per function call, and/or per `cache-service-cache-module` instance basis.
* Built-in logging with a `verbose` flag.

# Cache Module Configuration Options

## type

An arbitrary identifier you can assign so you know which cache is responsible for logs and errors.

* type: string
* default: 'cache-module'

## defaultExpiration

The expiration to include when executing cache set commands. Can be overridden via `.set()`'s optional expiraiton param.

* type: int
* default: 900
* measure: seconds

## verbose

> When used with `cache-service`, this property is overridden by `cache-service`'s `verbose` value.

When false, `cache-service-cache-module` will log only errors. When true, `cache-service-cache-module` will log all activity (useful for testing and debugging).

* type: boolean
* default: false

# API

As a `cache-service`-compatible cache, `cache-service-cache-module` matches [`cache-service`'s API](https://github.com/jpodwys/cache-service#api).

## .get(key, callback (err, response))

Retrieve a value by a given key.

* key: type: string
* callback: type: function
* err: type: object
* response: type: string or object

## .mget(keys, callback (err, response))

Retrieve the values belonging to a series of keys. If a key is not found, it will not be in `response`.

* keys: type: an array of strings
* callback: type: function
* err: type: object
* response: type: object, example: {key: 'value', key2: 'value2'...}

## .set(key, value [, expiraiton, callback])

Set a value by a given key.

* key: type: string
* callback: type: function
* expiration: type: int, measure: seconds
* callback: type: function

## .mset(obj [, expiration, callback])

Set multiple values to multiple keys

* obj: type: object, example: {'key': 'value', 'key2': 'value2', 'key3': {cacheValue: 'value3', expiration: 60}}
* callback: type: function

This function exposes a heirarchy of expiration values as follows:
* The `expiration` property of a key that also contains a `cacheValue` property will override all other expirations. (This means that, if you are caching an object, the string 'cacheValue' is a reserved property name within that object.)
* If an object with both `cacheValue` and `expiration` as properties is not present, the `expiration` provided to the `.mset()` argument list will be used.
* If neither of the above is provided, each cache's `defaultExpiration` will be applied.

## .del(keys [, callback (err, count)])

Delete a key or an array of keys and their associated values.

* keys: type: string || array of strings
* callback: type: function
* err: type: object
* count: type: int

## .flush([cb])

Flush all keys and values.

* callback: type: function
