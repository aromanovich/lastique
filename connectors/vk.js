(function() {

setInterval(function() {
    if (window.getAudioPlayer) {
        /* new vk.com design */
        var player = getAudioPlayer && getAudioPlayer();
        if (player && player.isPlaying()) {
            var songData = player.getCurrentAudio();
            var songId = songData[0];
            var userId = songData[1];
            sendToBackground({
                event: 'continue_playing',
                song: {
                    id: userId + '_' + songId
                }
            });
        }
    } else {
        if (currentAudioId() && !audioPlayer.player.paused()) {
            sendToBackground({
                event: 'continue_playing',
                song: {
                    id: currentAudioId()
                }
            });
        }
    }
}, LASTIQUE_UPDATE_INTERVAL_SEC * 1000);


function sendStartPlaying() {
    var data;
    if (window.getAudioPlayer) {
        /* new vk.com design */
        var player = getAudioPlayer && getAudioPlayer();
        var songData = player.getCurrentAudio();
        var songId = songData[AudioUtils.AUDIO_ITEM_INDEX_ID];
        var userId = songData[AudioUtils.AUDIO_ITEM_INDEX_OWNER_ID];
        var downloadUrl = songData[AudioUtils.AUDIO_ITEM_INDEX_URL];
        if (downloadUrl.indexOf('?') === -1) {
            downloadUrl += '?dl=1';
        } else {
            downloadUrl += '&dl=1';
        }
        data = {
            id: userId + '_' + songId,
            duration: songData[AudioUtils.AUDIO_ITEM_INDEX_DURATION],
            artist: decodeHtmlEntities(songData[AudioUtils.AUDIO_ITEM_INDEX_PERFORMER]),
            track: decodeHtmlEntities(songData[AudioUtils.AUDIO_ITEM_INDEX_TITLE]),
            downloadUrl: downloadUrl
        };
    } else {
        songData = ls.get('pad_lastsong') || audioPlayer.lastSong;
        data = {
            id: currentAudioId(),
            duration: songData[3],
            artist: decodeHtmlEntities(songData[5]),
            track: decodeHtmlEntities(songData[6]),
            downloadUrl: songData[2] + '?dl=1'
        };
    }
    sendToBackground({
        event: 'start_playing',
        service: 'www.vk.com',
        song: data
    });
}

function inject() {
    if (window.getAudioPlayer) {
        /* new vk.com design */
        var player = getAudioPlayer && getAudioPlayer();
        if (player._implPlay && player._implNewTask) {
            // very implementation-specific hacks
            var old_implPlay = player._implPlay;
            player._implPlay = function() {
                old_implPlay.apply(this, arguments);
                this._implNewTask('send_start_playing', function(cb) {
                    sendStartPlaying();
                    cb();
                });
            }
        } else {
            // more resilient solution, but songs will not have download URL
            var oldPlay = player.play;
            player.play = function() {
                oldPlay.apply(this, arguments);
                sendStartPlaying();
            }
        }
    } else {
        var oldPlayback = audioPlayer.playback;
        audioPlayer.playback = function(paused) {
            sendStartPlaying();
            oldPlayback.apply(this, arguments);
        }
    }
}

var intervalId = setInterval(function() {
    if (window.getAudioPlayer && getAudioPlayer()) {
        /* new vk.com design */
        inject();
        clearInterval(intervalId);
    }
    if (window.audioPlayer) {
        /* old vk.com design */
        inject();
        clearInterval(intervalId);
    }
}, 10);

})();
