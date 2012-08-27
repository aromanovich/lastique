console = chrome.extension.getBackgroundPage().console;
log = function() { console.log.apply(console, arguments); }

const LAST_FM_API_KEY = 'db72c405c8e43a7f80d32d714cc12907';
const LAST_FM_API_SECRET = 'b91a14a2f38b943ff83e3ae308ae606c';
const LAST_FM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

var lastfm = new LastFMClient({
    apiKey: LAST_FM_API_KEY,
    apiSecret: LAST_FM_API_SECRET,
    apiUrl: LAST_FM_BASE_URL
});


chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(message) {
        processMessage(message);
    });
});

function processMessage(message) {
    switch (message.event) {
        case 'start_playing':
            log('start_playing');
            var song = message.song;
            if (song.duration > 30) {
                setNowPlaying(song);
            }
            break;
        case 'continue_playing':
            log('continue_playing');
            var song = message.song;
            if (nowPlaying.song && nowPlaying.song.fullId == message.song.fullId) {
                nowPlaying.playedSoFar += 10;
                if (!nowPlaying.scrobbled &&
                    nowPlaying.playedSoFar > Math.min(nowPlaying.song.duration / 2, 4 * 60)) {
                    scrobble();
                }
            }
            break;
    }
}


var nowPlaying = {
    song: null,
    playedSoFar: 0,
    scrobbled: false
}

function setNowPlaying(song) {
    nowPlaying.song = song;
    nowPlaying.playedSoFar = 0;
    nowPlaying.scrobbled = false;

    lastfm.signedCall('track.updateNowPlaying', {
        'artist': song.artist,
        'track': song.name,
        'sk': obtainSessionId(true)
    }, 'POST', function(response) {
        log(response, 'updateNowPlaying');
    });
}

function scrobble() {
    nowPlaying.scrobbled = true;
    
    var timestamp = Math.round(new Date().getTime() / 1000);
    lastfm.signedCall('track.scrobble', {
        'artist': nowPlaying.song.artist,
        'track': nowPlaying.song.name,
        'timestamp': timestamp,
        'sk': obtainSessionId(true)
    }, 'POST', function(response) {
        log(response, 'scrobble');
    });
}



function authorizeToken() {
    var url = 'http://www.last.fm/api/auth/' + 
            '?api_key=' + LAST_FM_API_KEY +
            '&token=' + localStorage.token;

    if (!window.authTabId) {
        chrome.tabs.create({url: url}, function(tab) {
            window.authTabId = tab.id;
            chrome.tabs.onRemoved.addListener(function(tabId) {
                if (window.authTabId == tabId) {
                    delete window.authTabId;
                }
            });
        });
    } else {
        chrome.tabs.update(window.authTabId, {selected: true});
    }
}

function obtainToken() {
    lastfm.synchronousSignedCall('auth.getToken', {}, 'GET', function(response) {
        localStorage.token = response.token;
    });
    return localStorage.token;
}

function obtainSessionId(requireAuthorizationIfNeeded) {
    if (!localStorage.sessionId) {
        if (!localStorage.token) {
            obtainToken();
            if (requireAuthorizationIfNeeded) {
                authorizeToken();
            }
            return false;
        }

        lastfm.synchronousSignedCall('auth.getSession',
                {'token': localStorage.token}, 'GET', function(response) {
            if (response.error) {
                if (response.error == 14 || response.error == 15) {
                    // token has expired or has not been authorized
                    if (response.error == 15) {
                        // token has expired
                        obtainToken();
                    }
                    if (requireAuthorizationIfNeeded) {
                        authorizeToken();
                    }
                }
            } else {
                localStorage.sessionId = response.session.key;
            }
        });
    }

    return localStorage.sessionId;
}
