console = chrome.extension.getBackgroundPage().console;
log = function() { console.log.apply(console, arguments); }

const LAST_FM_API_KEY = 'db72c405c8e43a7f80d32d714cc12907';
const LAST_FM_API_SECRET = 'b91a14a2f38b943ff83e3ae308ae606c';
const LAST_FM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';


chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(message) {
        if (message.event == 'start_playing') {
            scrobbler.startedPlaying(message.song);
        } else if (message.event == 'continue_playing') {
            scrobbler.continuedPlaying(message.song.id);
        }
    });
});


var lastfm = new LastFMClient({
    apiKey: LAST_FM_API_KEY,
    apiSecret: LAST_FM_API_SECRET,
    apiUrl: LAST_FM_BASE_URL
});


function PostponedFunction(f) {
    var timeoutId = null;
    var executed = false;

    this.postpone = function(seconds) {
        if (!executed) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(this.execute.bind(this), seconds * 1000);
        }
    }

    this.execute = function() {
        if (!executed) {
            f();
            timeoutId = null;
            executed = true;
        }
    }
}


var scrobbler = {
    _song: null,
    _playedSoFar: 0,

    startedPlaying: function(song) {
        if (song.duration < 30) {
            return;
        }
        if (this._postponedScrobble) {
            this._postponedScrobble.execute();
            delete this._postponedScrobble;
        }
        this._song = song;
        this._scrobbleThreshold = Math.min(this._song.duration / 2, 4 * 60);
        this._playedSoFar = 0;
        this._updateNowPlaying();
    },

    continuedPlaying: function(songId) {
        if (!this._song || this._song.id != songId) {
            console.warn('scrobbler error: song changed but `scrobbler.startedPlaying` was not called!');
            return;
        }
        this._playedSoFar += LASTIQUE_UPDATE_INTERVAL_SEC;
        this._updateNowPlaying();
        if (this._playedSoFar > this._scrobbleThreshold) {
            if (!this._postponedScrobble) {
                this._postponedScrobble = new PostponedFunction(this._scrobble.bind(this));
            }
            this._postponedScrobble.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
        }
    },

    _updateNowPlaying: function() {
        lastfm.signedCall('POST', {
            method: 'track.updateNowPlaying', 
            artist: this._song.artist,
            track: this._song.name,
            sk: obtainSessionId(true)
        }, function(response) {
            log(response, 'updateNowPlaying');
        });
        storage.setNowPlaying(this._song.artist, this._song.name);
        if (this._postponedClearNowPlaying) {
            this._postponedClearNowPlaying.execute()
        }
        this._postponedClearNowPlaying =
                new PostponedFunction(storage.clearNowPlaying.bind(storage));
        this._postponedClearNowPlaying.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
    },

    _scrobble: function() {
        var timestamp = Math.round(new Date().getTime() / 1000);
        lastfm.signedCall('POST', {
            method: 'track.scrobble', 
            artist: this._song.artist,
            track: this._song.name,
            timestamp: timestamp,
            sk: obtainSessionId(true)
        }, function(response) {
            log(response, 'scrobble');
        });
        storage.addToLastScrobbled(this._song.artist, this._song.name, timestamp);
    }
}


var storage = {
    _getIconUrl: function(track) {
        var iconUrl = './default_artist_small.png';
        if (track.album && track.album.image && track.album.image.length > 0) {
            iconUrl = track.album.image[0]['#text'].replace('serve/64s', 'serve/34s');
        }
        return iconUrl;
    },

    setNowPlaying: function(artist, track) {
        var that = this;
        lastfm.unsignedCall('GET', {
            method: 'track.getInfo',
            artist: artist,
            track: track
        }, function(response) {
            var track = response.track;

            localStorage.nowPlaying = JSON.stringify({
                track: track.name,
                trackUrl: track.url,
                artist: track.artist.name,
                artistUrl: track.artist.url,
                iconUrl: that._getIconUrl(track)
            });
        });
    },

    clearNowPlaying: function() {
        delete localStorage.nowPlaying;
    },

    addToLastScrobbled: function(artist, track, timestamp) {
        if (!localStorage.lastScrobbled) {
            localStorage.lastScrobbled = JSON.stringify([]);
        }
        var that = this;
        lastfm.unsignedCall('GET', {
            method: 'track.getInfo',
            artist: artist,
            track: track
        }, function(response) {
            var track = response.track;
            var table = JSON.parse(localStorage.lastScrobbled);
            table.push({
                track: track.name,
                trackUrl: track.url,
                artist: track.artist.name,
                artistUrl: track.artist.url,
                iconUrl: that._getIconUrl(track),
                timestamp: timestamp
            });
            localStorage.lastScrobbled = JSON.stringify(table);
        });
    }
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
    lastfm.synchronousSignedCall('GET', {
        method: 'auth.getToken'
    }, function(response) {
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
        lastfm.synchronousSignedCall('GET', {
            method: 'auth.getSession',
            token: localStorage.token
        }, function(response) {
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
                localStorage.username = response.session.name;
                localStorage.sessionId = response.session.key;
            }
        });
    }
    return localStorage.sessionId;
}
