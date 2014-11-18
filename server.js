var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var request = require('request'); // "Request" library
var schema = require('./schema/models');
var utils = require('./modules/utils');

var url = require('url');

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

/* Constants */
var client_id = '584bd0dbac1544f8993d080baac71bc0'; // Your client id
var client_secret = 'cec9975be1d54d9f8a81b51ee5e56d0c'; // Your client secret
var redirect_uri = 'http://vikeshkhanna.webfactional.com/floyd_rose/callback'; // Your redirect uri
var USER_HEADER = "x-floydrose-user";
var API_KEY_HEADER = "x-authentication";
var API_SECRET = "zeppelin";
var ROOT = "/floyd_rose/";

// Change for localhost
var PORT = 17907;

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
mongoose.connect('mongodb://localhost:13579/dj');
var db = mongoose.connection;
var ObjectId = mongoose.Types.ObjectId;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("DB ready!");
  // Starting the server
  var server = http.listen(PORT, function() {
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
app.get('/show/:id', sessionRestrict, function(req, res) {
	schema.Show.findOne({ _id : new ObjectId(req.params.id) }, function(err, show) {
		if (err) {
			console.log(err);
			res.status(500).send(err);	
		} else {
			res.render(__dirname + "/views/index.ejs", { show: show });
		}
	});
});

// Debug
app.get('/', sessionRestrict, function(req, res) {
		res.redirect("/floyd_rose/show/543da7919624e1586c9cb98f");
});

app.post('/login', restrict, function(req, res) {
  console.log("/login");
  var id = req.body.id;

  schema.User.findOneAndUpdate({ _id : id }, {
    $set : {
      name : req.body.name,
      img : req.body.img
    }
  }, {
    upsert : true
  }, function(err, object) {
    if (err) {
      console.log(err);
      res.status(500).send(err)
    } else {
      req.session.user = id;
      console.log("Logged in : " + object);
      res.send(object);
    }
  });
});

app.get('/spotify/login', function(req, res) {
	console.log("/spotify/login");
	var state = generateRandomString(16);
	res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
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
					console.log(body);
          req.session.user = body;
          req.session.access_token = access_token;
          req.session.refresh_token = refresh_token;
					res.redirect(ROOT);
        });
      }
    });
  }
});

app.get("/login", function(req, res) {
	res.render(__dirname + "/views/login.ejs");
});

// Restrict access based on API KEY
function restrict(req, res, next) {
  if (req.headers.host.indexOf("localhost") !=-1 || req.header(API_KEY_HEADER) === API_SECRET) {
    next();
  } else {
    console.log("Restricted access!");
		res.status(500).send("Wrong API Key");
  } 
}

function sessionRestrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		console.log("Restricted spotify access!");
		res.redirect(ROOT + "spotify/login");
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
  console.log("/api/shows/:id/songs");
  var id = req.params.id;

  // TODO: Filter the find.
  schema.Song.find({show: new ObjectId(id), status : 0 }).lean().populate('user').populate('votes').exec(function(err, songs) {
    if (err) {
      res.status(500).send({ status: 500, error: err });
    } else {

			// Order the songs
			for (var i = 0; i < songs.length; i++) {
				songs[i] = utils.getSongWithVoteCounts(songs[i]);
			}

			songs.sort(function(song1, song2) {
				var voteDiff = (song2.upvotes - song2.downvotes) - (song1.upvotes - song1.downvotes);

				if (voteDiff === 0) {
					return song2.time_added - song1.time_added;
				}
				return voteDiff;
			});
      res.send({ status: 200, songs: songs });
    }
  });
});

/*
 * Update the status of the track
 */
app.post("/api/shows/:showid/songs/:songid/:status", sessionRestrict, function(req, res) {
		var showid = new ObjectId(req.params.showid);
		var songid = req.params.songid;
		var status = parseInt(req.params.status);

		schema.Show.findOne({ _id : showid }, function(err, show) {
			if (err) {
				res.status(500).send(err);
				return;
			}

			var uris = encodeURIComponent("spotify:track:" + songid);
			var addTrackUrl = "https://api.spotify.com/v1/users/" + req.session.user.id + "/playlists/" + show.spotify_playlist_id + "/tracks?uris=" + uris;

			var updateStatus = function(status) {
				schema.Song.update({ show : showid, spotify_id : songid, status : 0 }, 
						{
							$set : {
								status : status
							}
						}, function(err, response) {
								if (err) {
									res.status(500).send(err);
								} 
								console.log("Successfully changed status for song " + songid);
								res.send(200);
					});
			};

			// Spotify Web API - Add song to playlist
			if (status === 1) {
				request({
					url : addTrackUrl,
					headers : {
						"Authorization" : "Bearer " + req.session.access_token,
						"Accept" : "application/json"
					},
					method : 'POST'
				}, function(error, response, data) {
					if (error) {
						console.log(error);
						res.status(500).send(error);
						return;
					}
					// If song added to spotify, update our model
					updateStatus(status);
				});
			} else {
				// If rejected, update status directly
				updateStatus(status);
			}
		});
});

/*
 * POST a new song
 */
app.post("/api/shows/:id/songs", restrict, function(req, res) {
		console.log("POST /api/shows/:id/songs");
		var showId = new ObjectId(req.params.id);
		var song = req.body;
		var userId = req.header(USER_HEADER);
		// Inject user property
		song.user = userId;
		// Queued by default
		song.status = 0;
	
		// TODO; move to insert, instead of update
		schema.Song.update(
			{ show : showId, spotify_id : song.spotify_id },
			{ $setOnInsert : song },
			{ upsert : true },
			function(err, numAffected) {
				if (err) {
					console.log(err);
					res.status(500).send(err);
					return;
				}
				res.send(numAffected.toString());
			});
});

/*
 * Vote on a song.
 */
app.post("/api/song/:id/vote/:vote", restrict, function(req, res) {
  console.log("/api/vote");
  var songId = new ObjectId(req.params.id);
  var userId = req.header(USER_HEADER);
  var vote = req.params.vote;
  console.log(userId);

  // Add to the vote array
  schema.Vote.update({ song: songId, user: userId },
    {
      $set : {
        vote : vote
      }
    }, {
      upsert : true
    }, function(err, num, n) {
      if (err) {
        res.status(500).send({ status: 500, error: err });
      } else { 
        // Find this new object or updated object
        schema.Vote.findOne( { song: songId, user: userId }, function(err, vote) {
          if (err) {
            res.status(500).send({ status: 500, error: err });
          } else {
            // Add to the song's votes array
            schema.Song.update({ _id : songId }, { $addToSet : { votes : new ObjectId(vote._id) }}, function(err, response) {
              if (err) {
                res.status(500).send({ status: 500, error: err });
              } else {
                // Return the new song object - Note that this is not done atomically like findAndModify, so this value may be different from what you expect
                schema.Song.findOne({ _id : songId}).lean().populate('votes').exec(function(err, song) {
                  if (err) {
                    res.status(500).send({ status: 500, error: err });
                  } else {
                    res.send({ status: 200, response: utils.getSongWithVoteCounts(song) });
                  }
                });
              }
            });
          }
        });
      }
    });
  // Optionally add to array
  // schema.Song.update({_id : songId, 'votes.user' : { $ne : userId }}, { $push : { "votes" :  newVote }}, true);
});
