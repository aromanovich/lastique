var console = chrome.extension.getBackgroundPage().console;
var log = console.log.bind(console);


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
        if (message.event == 'start_playing') {
            scrobbler.startedPlaying(message.song);
        } else if (message.event == 'continue_playing') {
            scrobbler.continuedPlaying(message.song.id);
        }
    });
});


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
            sk: auth.obtainSessionId(true)
        }, function(response) {});
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
            sk: auth.obtainSessionId(true)
        }, function(response) {});
        storage.addToLastScrobbled(this._song.artist, this._song.name, timestamp);
    }
}


var cache = {
    /* Cache that contains no more than specified numbers of entries. */
    _N: 50,
    _keys: [],
    _cache: {},

    add: function(key, value) {
        if (this._cache[key]) {
            return;
        }
        this._keys.push(key);
        this._cache[key] = value;
        if (this._keys.length > this._N) {
            var keyToRemove = this._keys.shift();
            delete this._cache[keyToRemove];
        }
    },

    get: function(key) {
        console.log(key, this._cache[key]);
        return this._cache[key];
    }
}


var storage = {
    _getTrackInfo: function(artist, track, callback) {
        var cacheKey = artist + '-' + track;
        var trackData = cache.get(cacheKey);
        if (trackData) {
            callback(trackData);
        } else {
            lastfm.unsignedCall('GET', {
                method: 'track.getInfo',
                artist: artist,
                track: track
            }, function(response) {
                var track = response.track;
                var iconUrl;
                if (track.album && track.album.image && track.album.image.length) {
                    iconUrl = track.album.image[0]['#text'].replace('serve/64s', 'serve/34s');
                }
                trackData = {
                    track: track.name,
                    trackUrl: track.url,
                    artist: track.artist.name,
                    artistUrl: track.artist.url,
                    iconUrl: iconUrl
                };
                cache.add(cacheKey, trackData);
                callback(trackData);
            });
        }
    },

    setNowPlaying: function(artist, track) {
        this._getTrackInfo(artist, track, function(trackData) {
            localStorage.nowPlaying = JSON.stringify(trackData);
        });
    },

    clearNowPlaying: function() {
        delete localStorage.nowPlaying;
    },

    addToLastScrobbled: function(artist, track, timestamp) {
        if (!localStorage.lastScrobbled) {
            localStorage.lastScrobbled = JSON.stringify([]);
        }
        this._getTrackInfo(artist, track, function(trackData) {
            $.extend(trackData, {timestamp: timestamp});
            var table = JSON.parse(localStorage.lastScrobbled);
            table.push(trackData);
            localStorage.lastScrobbled = JSON.stringify(table);
        });
    }
}


var auth = {
    authorizeToken: function() {
        var url = 'http://www.last.fm/api/auth/'
                + '?api_key=' + LAST_FM_API_KEY
                + '&token=' + localStorage.token;
        if (!this.authTabId) {
            chrome.tabs.create({url: url}, function(tab) {
                this.authTabId = tab.id;
                chrome.tabs.onRemoved.addListener(function(tabId) {
                    if (this.authTabId == tabId) {
                        delete this.authTabId;
                    }
                });
            });
        } else {
            chrome.tabs.update(this.authTabId, {selected: true});
        }
    },


    obtainToken: function() {
        lastfm.synchronousSignedCall('GET', {
            method: 'auth.getToken'
        }, function(response) {
            localStorage.token = response.token;
        });
        return localStorage.token;
    },


    obtainSessionId: function(requireAuthorizationIfNeeded) {
        if (!localStorage.sessionId) {
            if (!localStorage.token) {
                this.obtainToken();
                if (requireAuthorizationIfNeeded) {
                    this.authorizeToken();
                }
                return false;
            }
            lastfm.synchronousSignedCall('GET', {
                method: 'auth.getSession',
                token: localStorage.token
            }, (function(response) {
                if (response.error) {
                    if (response.error == 14 || response.error == 15) {
                        // token has expired or has not been authorized
                        if (response.error == 15) {
                            // token has expired
                            this.obtainToken();
                        }
                        if (requireAuthorizationIfNeeded) {
                            this.authorizeToken();
                        }
                    }
                } else {
                    localStorage.username = response.session.name;
                    localStorage.sessionId = response.session.key;
                }
            }).bind(this));
        }
        return localStorage.sessionId;
    }
}


Zepto(function($) {
    auth.obtainSessionId(false);
    storage.clearNowPlaying();
});
