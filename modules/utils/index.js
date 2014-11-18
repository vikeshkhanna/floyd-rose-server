module.exports.getSongWithVoteCounts = function(song) {
	var votes = song.votes;
	var upvoteCount = 0;
	var downvoteCount = 0;

	votes.forEach(function(vote, j, arr2) {
		upvoteCount += (vote.vote === 1 ? 1 : 0);
		downvoteCount += (vote.vote === -1 ? 1 : 0);
	});

	song.upvotes = upvoteCount;
	song.downvotes = downvoteCount;
	return song;
}
