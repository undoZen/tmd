var fs = require('fs')
  , path = require('path')

exports.dirs_files = function dirs_files(dir, callback) {
  var returned = false
    , result = { dirs: [], files: [] }
    , remaining = 1

  if ('function' === typeof dir) {
    callback = dir
    dir = '.'
  }
  if ('.' === dir[0]) {
    dir = path.resolve(dir)
  }
  function errorWrap (fn) {
    return function(err) {
      if (returned || err) {
        if (!returned) {
          returned = true
          return callback(err)
        }
        return
      }
      fn.apply(this, Array.prototype.slice.call(arguments, 1))
    }
  }
  function dirs (dir) {
    result.dirs.push(dir)
    fs.readdir(dir, errorWrap(function(files) {
      remaining += files.length
      files.forEach(function(file) {
        file = path.resolve(dir, file)
        fs.stat(file, errorWrap(function(stats) {
          if (stats.isFile()) {
            result.files.push(file)
            --remaining || done()
          } else if (stats.isDirectory()) {
            dirs(file)
          } else {
            --remaining || done()
          }
        }))
      })
      --remaining || done()
    }))
  }
  function done () {
    callback(null, result)
  }

  fs.stat(dir, function(err, stats) {
    if (err) {
      callback(err)
    } else if (!stats.isDirectory()) {
      callback(new Error('first parament is not a directory path'))
    } else {
      dirs(dir)
    }
  })
}

exports.files = function (dir, callback) {
  var that = this
  exports.dirs_files(dir, function(err, df) {
    callback.apply(that, [err, (df || {}).files])
  })
}

exports.__defineGetter__('config', function() {
  var cwd = process.cwd()
    , configDirPath = cwd
    , configDirLastTry
    , config

  while (configDirLastTry != configDirPath) {
    try {
      config = require(configDirPath + '/config.js')
    } catch (e) {
      try {
        config = require(configDirPath + '/config.sample.js')
      } catch (e) {}
    }
    if (config) break

    configDirLastTry = configDirPath
    configDirPath = path.dirname(configDirPath)
  }
  config = config || {}
  config.source = config.source || cwd + '/source'
  config.template = config.template || cwd + '/views'
  config.output = config.output || cwd
  config['static'] = config['static'] || cwd + '/static'
  config.engine = config.engine || 'jade'
  return config
})

exports.extend = function (obj) {
  if (!obj) return {};
  Array.prototype.slice.call(arguments, 1).forEach(function (eo) {
    Object.keys(eo).forEach(function (k) {
      obj[k] = eo[k];
    });
  });
  return obj;
}
