(function() {

setInterval(function() {
    if (currentAudioId() && !audioPlayer.player.paused()) {
        sendToBackground({
            event: 'continue_playing',
            song: {
                id: currentAudioId()
            }
        });
    }
}, LASTIQUE_UPDATE_INTERVAL_SEC * 1000);


function sendStartPlaying() {
    var songData = ls.get('pad_lastsong') || audioPlayer.lastSong;
    sendToBackground({
        event: 'start_playing',
        service: 'www.vk.com',
        song: {
            id: currentAudioId(),
            duration: songData[3],
            artist: decodeHtmlEntities(songData[5]),
            track: decodeHtmlEntities(songData[6]),
            downloadUrl: songData[2] + '?dl=1'
        }
    });
}

function inject() {
    var oldPlayback = audioPlayer.playback;
    audioPlayer.playback = function(paused) {
        sendStartPlaying();
        oldPlayback.apply(this, arguments);
    }
}

var intervalId = setInterval(function() {
    if (window.audioPlayer) {
        inject();
        clearInterval(intervalId);
    }
}, 10);

})();
