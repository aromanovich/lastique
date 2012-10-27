var console = chrome.extension.getBackgroundPage().console;
var log = console.log.bind(console);


function PostponedFunction(f, timestamp) {
    var timeoutId = null;
    var executed = false;
    var t = timestamp;

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

    this.cancel = function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = null;
        executed = true;
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


var scrobbler = {
    _song: null,
    _service: null,
    _playedSoFar: 0,
    _scrobbleCanceled: false,

    startedPlaying: function(song, service) {
        if (song.duration < 30) {
            return;
        }
        
        if (this._postponedScrobble) {
            this._postponedScrobble.execute();
            delete this._postponedScrobble;
        }
        if (this._postponedClearNowPlaying) {
            this._postponedClearNowPlaying.cancel();
            delete this._postponedClearNowPlaying;
        }

        this._song = song;
        this._service = service;
        this._scrobbleThreshold = Math.min(this._song.duration / 2, 4 * 60);
        this._playedSoFar = 0;
        this._scrobbleCanceled = false;
        this._updateNowPlaying();

        lastfm.signedCall('GET', {
            method: 'track.getInfo', 
            artist: this._song.artist,
            track: this._song.track,
        }, function(response) {
            if ((response.track && !response.track.mbid && response.track.playcount < 75)) {
                this.cancelScrobbling();
            }
        }, this);
    },

    continuedPlaying: function(songId) {
        if (!this._song || this._song.id != songId) {
            console.warn('scrobbler error: song changed but `scrobbler.startedPlaying` was not called!');
            return;
        }
        if (this._scrobbleCanceled) {
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

    cancelScrobbling: function(songId) {
        if (this._postponedClearNowPlaying) {
            this._postponedClearNowPlaying.execute();
            delete this._postponedClearNowPlaying;
        }
        if (this._postponedScrobble) {
            this._postponedScrobble.cancel();
            delete this._postponedScrobble;
        }
        this._scrobbleCanceled = true;
    },

    _updateNowPlaying: function() {
        var currentSongId = this._song.id;
        lastfm.signedCall('POST', {
            method: 'track.updateNowPlaying', 
            artist: this._song.artist,
            track: this._song.track,
            sk: auth.obtainSessionId(true)
        }, function(response) {
            if (this._song.id != currentSongId) {
                // Current song has changed during request time
                return;
            }
            if (response.nowplaying) {
                if(response.nowplaying.artist) {
                    this._song.artist = response.nowplaying.artist['#text'] || this._song.artist;
                }
                if (response.nowplaying.track) {
                    this._song.track = response.nowplaying.track['#text'] || this._song.track;
                }
            }
            if (!this._scrobbleCanceled) {
                storage.setNowPlaying(this._song.artist, this._song.track, this._service);
                if (!this._postponedClearNowPlaying) {
                    this._postponedClearNowPlaying =
                            new PostponedFunction(storage.clearNowPlaying.bind(storage));
                    this._postponedClearNowPlaying.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
                }
            }
        }, this);
        
        if (this._postponedClearNowPlaying) {
            this._postponedClearNowPlaying.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
        }
    },

    _scrobble: function() {
        var timestamp = Math.round(new Date().getTime() / 1000);

        var callback = (function(artist, track, timestamp, service) {
            return function(response) {
                storage.addToLastScrobbled(artist, track, timestamp, service);
            }
        })(this._song.artist, this._song.track, timestamp, this._service);

        lastfm.signedCall('POST', {
            method: 'track.scrobble', 
            artist: this._song.artist,
            track: this._song.track,
            timestamp: timestamp,
            sk: auth.obtainSessionId(true)
        }, callback, this);
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
        return this._cache[key];
    },

    remove: function(key) {
        this._keys.splice(this._keys.indexOf(key), 1);
        delete this._cache[key];
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
                track: track,
                username: localStorage.username 
            }, function(response) {
                var track = response.track;
                trackData = {
                    track: track.name,
                    trackUrl: track.url,
                    artist: track.artist.name,
                    artistUrl: track.artist.url,
                    isLoved: track.userloved == "1"
                };
                cache.add(cacheKey, trackData);
                callback(trackData);
            });
        }
    },

    setNowPlaying: function(artist, track, service) {
        this._getTrackInfo(artist, track, function(trackData) {
            $.extend(trackData, {service: service});
            localStorage.nowPlaying = JSON.stringify(trackData);
        });
    },

    clearNowPlaying: function() {
        localStorage.nowPlaying = 'false';
    },

    addToLastScrobbled: function(artist, track, timestamp, service) {
        this._getTrackInfo(artist, track, function(trackData) {
            $.extend(trackData, {timestamp: timestamp, service: service});
            var table = JSON.parse(localStorage.lastScrobbled || '[]');
            table.push(trackData);
            localStorage.lastScrobbled = JSON.stringify(table.slice(-20));
        });
    },

    removeFromScrobbled: function(songData, callback) {
        var scrobbleToRemove, scrobbleToRemoveIndex;
        var table = JSON.parse(localStorage.lastScrobbled || '[]');
        table.forEach(function(scrobble, index) {
            if (scrobble.timestamp == songData.timestamp) {
                scrobbleToRemove = scrobble;
                scrobbleToRemoveIndex = index;
            }
        });
        if (!scrobbleToRemove) {
            callback();
            return;
        }
        lastfm.signedCall('POST', {
            method: 'library.removeScrobble', 
            artist: scrobbleToRemove.artist,
            track: scrobbleToRemove.track,
            timestamp: scrobbleToRemove.timestamp,
            sk: auth.obtainSessionId(true)
        }, function(response) {
            table.splice(scrobbleToRemoveIndex, 1);
            localStorage.lastScrobbled = JSON.stringify(table.slice(-20));
            callback();
        });
    },

    triggerLove: function(songData, callback) {
        var table = JSON.parse(localStorage.lastScrobbled || '[]');
        var nowPlaying = JSON.parse(localStorage.nowPlaying || 'false');

        var method = songData.isLoved ? 'unlove' : 'love';
        lastfm.signedCall('POST', {
            method: 'track.' + method, 
            artist: songData.artist,
            track: songData.track,
            sk: auth.obtainSessionId(true)
        }, function(response) {
            var cacheEntry = cache.get(songData.artist + '-' + songData.track);
            if (cacheEntry) {
                cacheEntry.isLoved = !cacheEntry.isLoved;
            }

            table.concat(nowPlaying).forEach(function(scrobble) {
                if (scrobble &&
                    scrobble.artist == songData.artist &&
                    scrobble.track == songData.track) {
                    scrobble.isLoved = !scrobble.isLoved;
                    if (scrobble.timestamp) {
                        callback(scrobble.timestamp);
                    } else {
                        callback('now-playing');
                    }
                }
                return scrobble;
            });

            localStorage.nowPlaying = JSON.stringify(nowPlaying);
            localStorage.lastScrobbled = JSON.stringify(table.slice(-20));
        });
    }
}


var auth = {
    authorizeToken: function() {
        var url = 'http://www.last.fm/api/auth/'
                + '?api_key=' + LAST_FM_API_KEY
                + '&token=' + localStorage.token;
        if (!this.authTabId) {
            var that = this;
            chrome.tabs.create({url: url}, function(tab) {
                that.authTabId = tab.id;
                chrome.tabs.onRemoved.addListener(function(tabId) {
                    if (that.authTabId == tabId) {
                        delete that.authTabId;
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
    },

    obtainSessionIdFromToken: function(token) {
        lastfm.synchronousSignedCall('GET', {
            method: 'auth.getSession',
            token: token
        }, function(response) {
            if (!response.error) {
                localStorage.username = response.session.name;
                localStorage.sessionId = response.session.key;
            }
        });
        return localStorage.sessionId;
    }
}


Zepto(function($) {
    auth.obtainSessionId(false);
    storage.clearNowPlaying();
    if (!localStorage.lastScrobbled) {
        localStorage.lastScrobbled = JSON.stringify([]);
    }
    if (!localStorage.enabledConnectors) {
        localStorage.enabledConnectors = JSON.stringify(['vk.js', 'youtube.js']);
    }

    chrome.extension.onConnect.addListener(function(port) {
        port.postMessage(JSON.parse(localStorage.enabledConnectors));
        port.onMessage.addListener(function(message) {
            if (message.event == 'start_playing') {
                scrobbler.startedPlaying(message.song, message.service);
            } else if (message.event == 'continue_playing') {
                scrobbler.continuedPlaying(message.song.id);
            }
        });
    });
});