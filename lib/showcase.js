// Showcase server

var http = require('http'),
    util = require('util'),
    request = require('request'),
    base64 = require('base64'),
    fs = require('fs'),
    ejs = require('ejs'),
    static = require('node-static'),
    config = require("nconf").loadFilesSync([__dirname+"/../config.json"]);

// Templates.
function template(dir) {
  var templates = {};

  [
    "/index.html",
    "/error.html"
  ].forEach(function(path) {
    templates[path] = ejs.compile(fs.readFileSync(dir+path)
                                    .toString());
  });

  return templates;
};

// Routes.
var route = function(templates) {
  var routes = {
    "/index.html": function (_, cb) {
      var encoded = base64.encode(config.username+":"+config.password);

      request({
        method: "GET",
        uri: "http://api.nodejitsu.com/apps/"+config.username,
        headers: {
          'Authorization': 'Basic ' + encoded,
          'Content-Type': 'application/json'
        }
      }, function (err, res, body) {
        if (err) {
          cb(err);
        } else {
          cb(null, templates["/index.html"]({
            "apps": JSON.parse(body)
              .apps
              .filter( function (app) {
                return app.name !== "showcase"
                  && app.state === "started"
                  && !app.env.PRIVATE;
              })
          }));
        }
      });
    },
    "/error.html": function(err, cb) {
      if (!err) {
        err = { stack: "NO ERROR LOL" };
      }
      cb(null, templates["/error.html"](err));
    }
  };
  //Alias for /
  routes["/"] = routes["/index.html"];

  return routes;
}


// Middleware
module.exports = function (req, res, next) {

  var templates = template(__dirname + "/../templates/"),
      routes = route(templates);

  //Uses templates if any of them match
  if ( routes.hasOwnProperty(req.url) ) {
    routes[req.url](null, function serve (err, rendered) {
      if (err) {
        console.log(err.stack);
        res.writeHead(200, {'Content-Type': 'text/html'});
        routes["/error.html"](err, serve);
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(rendered);
      }
    });
  } else {
    if (next) {
      next(req, res);
    }
  }
};
