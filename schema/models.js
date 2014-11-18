var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/* Facebook User schema  */ 
var userSchema = new Schema({
  _id :  { type: String, unique : true, index: true },
  name : String,
  img : String
},
  {
  collection : 'users'
});

/* Spotify User schema  */ 
var adminUserSchema = new Schema({
  _id :  { type: String, unique : true, index: true },
  name : String,
  img : String
},
  {
	collection : 'adminUsers'
});

/* Show Schema */
var showSchema = new Schema({
  title: String,
  user: { type: String, index: true, ref : 'AdminUser'},
	spotify_playlist_id : String,
  time_created : { type: Date, default: Date.now },
  active: Boolean
}, 
  {
  collection : 'shows'
});

var songSchema = new Schema({
  show : Schema.Types.ObjectId,
	spotify_id : { type: String, unique: true, index: true},
  spotify_uri : String,
  name : String,
  artist: String,
	user: { type: String, ref: 'User' },
  time_added : { type: Date, default: Date.now },
	status: { type : Number, default : 0 }, /* status can be 0: queued, 1: accepted, 2: rejected */
  votes : [
    { type: Schema.Types.ObjectId, ref : 'Vote' }
  ]
}, {
  collection : 'songs'    
});

var voteSchema = new Schema({
	song : { type : String, ref : 'Song'} ,
  user : { type: String, ref: 'User'},
  time_modified : { type: Date, default: Date.now },
  vote : Number
}, {
  collection:  'votes'
});

/* Helper methods on schemas */
songSchema.pre('save', function(next) {
	if (!this.status) {
		this.status = 0;
	}
	next();
});

module.exports.Show = mongoose.model('Show', showSchema);
module.exports.Song = mongoose.model('Song', songSchema);
module.exports.User = mongoose.model('User', userSchema);
module.exports.Vote = mongoose.model('Vote', voteSchema);
module.exports.AdminUser = mongoose.model('AdminUser', adminUserSchema);
