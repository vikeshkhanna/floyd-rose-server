var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var request = require('request'); // "Request" library
var schema = require('./schema/models');

var url = require('url');

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

/* Constants */
var client_id = '584bd0dbac1544f8993d080baac71bc0'; // Your client id
var client_secret = 'cec9975be1d54d9f8a81b51ee5e56d0c'; // Your client secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

app.set('views', './views');
app.set('view engine', 'ejs');

/* Static */
app.use("/static", express.static(__dirname + '/static'));

/* Session middleware */
app.use(cookieParser());
app.use(session({
    secret: 'shhhh, very secret'
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

/* Connect mongodb */
mongoose.connect('mongodb://localhost/dj');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("DB ready!");
  // Starting the server
  var server = http.listen(3000, function() {
      console.log("Server is up. Listening on port %d", server.address().port); 
    });
});

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

/* URL Routes */
app.get('/', function(req, res) {
  res.render(__dirname + "/views/index.ejs");
});

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
        client_id: client_id,
        client_secret: client_secret
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          // Set session variables
          req.session.user = body;
          req.session.access_token = access_token;
          req.session.refresh_token = refresh_token;
          console.log(body);
          console.log(access_token);
          res.redirect("/main");
        });
      }
    });
  }
});

app.get("/main", restrict, function(req, res) {
  res.render(__dirname + "/views/main.ejs");
});

// Restrict access of pages that require login
function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = "Access denied!";
    res.redirect("/");
  } 
}

/* Realtime */
var client_cache = {};

io.on('connection', function(socket) {
  socket.on('add_client', function(id) {
    // Create an empty array for this client for the first time.
    if (!(id in client_cache)) {
      client_cache[id] = [];
    }

    // This client may have multiple tabs/windows open. Add 
    if (!(socket in client_cache[id])) {
      client_cache[id].push(socket);
    }
    console.log("Client added with id = " + id);
  });
  console.log('User connected');
});

/* API like methods */
app.get("/api/shows", function(req, res) {
  console.log("/api/shows");
  // TODO: Filter the find.
  schema.Show.find(function(err, shows) {
    if (err) {
      res.send({ status: 500, error: err });
    } else {
      res.send({ status: 200, shows: shows });
    }
  });
});

app.get("/api/shows/:id/songs", function(req, res) {
  console.log("/api/show/:id/songs");
  // TODO: Filter the find.
  schema.Show.find(function(err, shows) {
    if (err) {
      res.send({ status: 500, error: err });
    } else {
      res.send({ status: 200, shows: shows });
    }
  });
});