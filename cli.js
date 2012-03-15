#!/usr/bin/env node
var command = process.argv[2]
  , app = require('./app')

if ('preview' == command || 'server' == command) {
  app.server()
} else if ('generate' == command || 'gen' == command) {
  app.generate()
} else {
  console.log('tmd - a tool to template your markdown files\n\
usage:\n\n\
    tmd preview\n\
    tmd server\n\
        start a server at 127.0.0.1:3456 to preview the site.\n\n\
    tmd gen\n\
    tmd generate\n\
        generate static html files.\n')
}
