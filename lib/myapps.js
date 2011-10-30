var nj = require('nodejitsu-api'),
    fs = require('fs'),
    ejs = require('ejs'),
    nj = require('nodejitsu-api');

// templates.
function template(dir) {
  var templates = {};

  [
    "/index.html",
    "/error.html"
  ].forEach(function(path) {
    templates[path] = ejs.compile(fs.readFileSync(dir + path).toString());
  });

  return templates;
};

// routes.
var route = function(config, templates) {
  
  var client = nj.createClient({
    username: config.username,
    password: config.password,
    remoteUri: 'http://api.nodejitsu.com'
  });
  
  
  var routes = {
    "/index.html": function (_, cb) {
      client.apps.list(function(err, result){
        if (err) {
          cb(err);
        } else {
          cb(null, templates["/index.html"]({
            "apps": result
              .filter( function (app) {
                return app.name !== "myapps"
                  && app.state === "started"
                  && (app.env && !app.env.PRIVATE);
              })
          }));
        }
      });
      
    },
    "/error.html": function(err, cb) {
      if (!err) {
        err = { stack: "NO ERROR" };
      }
      cb(null, templates["/error.html"](err));
    }
  };
  // alias for /
  routes["/"] = routes["/index.html"];

  return routes;
}

// module.exports is a middleware
module.exports = function (config) {
  return function (req, res, next) {

    var templates = template(__dirname + "/../templates/"),
        routes = route(config, templates);

    // uses templates if any of them match
    if ( routes.hasOwnProperty(req.url) ) {
      routes[req.url](null, function serve (err, rendered) {
        if (err) {
          res.writeHead(200, {'Content-Type': 'text/html'});
          if(err.statusCode == 403) {
            err.stack = "Invalid nodejitsu credentials, please check your config.json file";
          }
          return routes["/error.html"](err, serve);
          
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
}
