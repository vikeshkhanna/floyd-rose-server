var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/* User schema  */ 
var userSchema = Schema({
  
});

/* Show Schema */
var showSchema = Schema({
  title: String,
  user: String,
  date: { type: Date, default: Date.now },
  active: Boolean,
  songs : [Schema.Types.ObjectId]
}, 
  {
  collection : 'shows'
});

var songSchema = Schema({
  spotify_uri : String,
  name : String,
  artist: String,
  votes : [{
    user : Schema.Types.ObjectId,
    vote : Number
  }]
}, {
  collection : 'songs'    
});

module.exports.Show = mongoose.model('Show', showSchema);
module.exports.Song = mongoose.model('Song', songSchema);
