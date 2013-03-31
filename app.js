var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , resolve = require('path').resolve
  , join = require('path').join
  , dirname = require('path').dirname
  , basename = require('path').basename
  , exists = require('path').exists
  , existsSync = require('path').existsSync
  , Showdown = require('showdown')
  , showdown = (new Showdown.converter).makeHtml
  , utils = require('./utils')
  , config = utils.config
  , files = utils.files
  , extend = utils.extend
  , mkdirp = require('mkdirp')
console.log(config);
var app = exports = module.exports = express()
  , srcDir = config.source
  , tplDir = config.template
  , outDir = config.output
  , staDir = config['static']
  , mkdExp = /\.(md|mkd|markdown)$/i

function errfn(efn, fn) {
  return function(err) {
    if (err) {
      efn(err)
    } else {
      fn.apply(this, Array.prototype.slice.call(arguments, 1))
    }
  }
}

app.set('views', config.views)
app.set('view engine', config.engine)

function mdengine(path, options, fn) {
  exists(path, function(exists) {
    if (exists) {
      fs.stat(path, errfn(fn, function(stat) {
        if (!stat.isFile()) {
          return fn(new Error('given path is not a file'))
        } else {
          fs.readFile(path, 'utf8', errfn(fn, function(source) {
            var document
            try {
              document = showdown(source)
            } catch (e) {
              return fn(e)
            }
            return fn(null, document)
          }))
        }
      }))
    } else {
      return fn(new Error('no souch file: ' + path))
    }
  })
}
app.engine('.md', mdengine)
app.engine('.mkd', mdengine)
app.engine('.markdown', mdengine)

app.renderDoc = function(view, fn, locals) {
  view = join(srcDir, view)
  app.render(view, errfn(function(err) { console.error(err) }, function(document) {
    var title = document.match(/<h1[^>]*>(.+?)<\/h1>/i);
    title = (title ? title[1] + ' - ' : '') + config.site.name;
    app.render('document', extend({
      title: title,
      document: document
    }, config.locals || {}, locals), fn)
  }))
}

express.response.renderDoc = function(view, locals) {
  app.renderDoc(view, errfn(this.req.next, this.end.bind(this)), locals);
}

exports.generate = function () {
  files(srcDir, function(err, files) {
    files.filter(function(file) {
      return file.match(mkdExp)
    }).map(function(file) {
      var dir = dirname(file)
      return {
          file: file
        , srcDir: dir
        , outDir: dir.replace(srcDir, outDir)
        , path: file.replace(srcDir, '')
        , htmlname: basename(file).replace(mkdExp, '.html')
      }
    }).forEach(function(doc) {
      if (!existsSync(doc.outDir)) {
        mkdirp.sync(doc.outDir)
      }
      app.renderDoc(doc.path, errfn(console.error.bind(console), function(html) {
        fs.writeFile(join(doc.outDir, doc.htmlname), html)
      }))
    })
  })
}

exports.server = function () {
  app
    .use(app.router)
    .use(require('stylus').middleware({ src: resolve(process.cwd()) }))
    .use('/static', express['static'](staDir))
    .use(app.router)
    .use(express['static'](outDir))

  app.get('/', function(req, res, next) {
    res.redirect('/index.html')
  })
  app.use(function(req, res, next) {
    res.renderDoc(req.path.replace(/(\.html)?$/i, '.md'), { req_query: req.query })
  })

  app.listen(3456)
  console.log('listening 127.0.0.1:3456')
}
