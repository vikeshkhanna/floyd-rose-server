var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/* User schema  */ 
var userSchema = Schema({
  fbId : {
    type: String,
    unique : true,
    index: true 
  },
  name : String,
  img : String
},
  {
  collection : 'users'
});

/* Show Schema */
var showSchema = Schema({
  title: String,
  user: Schema.Types.ObjectId,
  date: { type: Date, default: Date.now },
  active: Boolean
}, 
  {
  collection : 'shows'
});

var songSchema = Schema({
  show : Schema.Types.ObjectId,
  spotify_uri : String,
  name : String,
  artist: String,
  votes : [
    { type: Schema.Types.ObjectId, ref : 'Vote' }
  ]
}, {
  collection : 'songs'    
});

var voteSchema = Schema({
  song : { type : Schema.Types.ObjectId, ref : 'Song' },
  user : Schema.Types.ObjectId,
  vote : Number
}, {
  collection:  'votes'
});

module.exports.Show = mongoose.model('Show', showSchema);
module.exports.Song = mongoose.model('Song', songSchema);
module.exports.User = mongoose.model('User', userSchema);
module.exports.Vote = mongoose.model('Vote', voteSchema);
