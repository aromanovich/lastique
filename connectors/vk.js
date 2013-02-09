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


var oldAjaxPost = ajax.post;
ajax.post = function(url, data) {
    if (url == 'audio' && data && data.act == 'audio_status') {
        sendStartPlaying();
    }
    oldAjaxPost.apply(this, arguments);
}


// Inject code in audioPlayer.callback if status export is not enabled
var injected = false;

var oldDone = stManager.done;
stManager.done = function(f) {
    if (window.audioPlayer && !audioPlayer.statusExport && !injected) {
        inject();
        injected = true;
    }
    oldDone.apply(this, arguments);
}

// If stManager.done() was called already
if (window.audioPlayer && !audioPlayer.statusExport && !injected) {
    inject();
}

function inject() {
    var oldPlayback = audioPlayer.playback;
    audioPlayer.playback = function(paused) {
        sendStartPlaying();
        oldPlayback.apply(this, arguments);
    }
}

})();
