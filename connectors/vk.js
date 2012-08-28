function sendToBackground(payload) {
    window.postMessage({
        type: 'lastique',
        payload: payload
    }, "*");
}

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

var oldAjaxPost = ajax.post;
ajax.post = function(url, data) {
    if (url == 'audio' && data && data.act == 'audio_status') {
        var songData = ls.get('pad_lastsong') || audioPlayer.lastSong;
        sendToBackground({
            event: 'start_playing',
            song: {
                id: data.full_id,
                duration: songData[3],
                artist: songData[5],
                name: songData[6]
            }
        });
    }   
    oldAjaxPost.apply(this, arguments);
}
