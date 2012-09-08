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
            service: 'www.vk.com',
            song: {
                id: data.full_id,
                duration: songData[3],
                artist: decodeHtmlEntities(songData[5]),
                track: decodeHtmlEntities(songData[6])
            }
        });
    }
    oldAjaxPost.apply(this, arguments);
}


// Inject code in audioPlayer.callback if status export is not enabled

var oldDone = stManager.done;
stManager.done = function(f) {
    if (window.audioPlayer && !audioPlayer.statusExport && !injected) {
        inject();
        injected = true;
    }
    oldDone.apply(this, arguments);
}


var injected = false;

function inject() {
    var oldPlayback = audioPlayer.playback;

    audioPlayer.playback = function(paused) {
        // Copy-paste from vk.com
        var _a = audioPlayer, aid = currentAudioId(), ids = (aid || '').split('_');
        if (ids.length < 2 && cur.oid) {
            ids = [cur.oid, aid];
            aid = ids.join('_');
        }
        // End of copy-paste
        
        var fullId = aid;
        var songData = ls.get('pad_lastsong') || audioPlayer.lastSong;
        sendToBackground({
            event: 'start_playing',
            service: 'www.vk.com',
            song: {
                id: fullId,
                duration: songData[3],
                artist: decodeHtmlEntities(songData[5]),
                track: decodeHtmlEntities(songData[6])
            }
        });
        oldPlayback.apply(this, arguments);
    }
}
