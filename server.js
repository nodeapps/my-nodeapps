//Server for the hubsite.

var http = require('http'),
    util = require('util'),
    request = require('request'),
    base64 = require('base64'),
    fs = require('fs'),
    ejs = require('ejs'),
    static = require('node-static'),
    config = JSON.parse(fs.readFileSync(__dirname+"/config.json").toString());

// Templates.
var templates = {};

[
    "/index.html",
    "/error.html"
].forEach(function(path) {
    templates[path] = ejs.compile(fs.readFileSync(__dirname+"/templates"+path)
                                      .toString());  
});

// Routes.
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
                            return app.name !== "hubsite" && app.state === "started";
                        })
                }));
            }
        });
    },
    "/error.html": function(err, cb) {
        cb(null, templates["/error.html"](err));
    }
};
//Alias for /
routes["/"] = routes["/index.html"];

//Static fileserver
var server = new static.Server(__dirname+'/static/');

//Server
http.createServer(function (req, res) {



    req.on("end", function() {
        //todo: use actual router
        if ( routes.hasOwnProperty(req.url) ) {
            routes[req.url](null, function serve (err, rendered) {
                if (err) {
                    console.log(err.stack);
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    routes["/error.html"](err, serve);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(rendered);
                }
            });
        } else {
            //Serve static files
            server.serve(req, res);
        }
     });

}).listen(8080);

console.log('http server running on port 8080');
