function sendToBackground(payload) {
    window.postMessage({
        type: 'lastique',
        payload: payload
    }, '*');
}


function decodeHtmlEntities(input) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = input;
    return textarea.value;
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
                artist: decodeHtmlEntities(songData[5]),
                name: decodeHtmlEntities(songData[6])
            }
        });
    }   
    oldAjaxPost.apply(this, arguments);
}
