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
    };

    this.execute = function() {
        if (!executed) {
            f();
            timeoutId = null;
            executed = true;
        }
    };

    this.cancel = function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = null;
        executed = true;
    }
}


var lastfm = new LastFMClient({
    apiKey: 'be827441ca581ce37f5043b93a40e386',
    apiSecret: 'c19332ceba3cd92fa08aae9e41c2a0cd',
    apiUrl: 'http://ws.audioscrobbler.com/2.0/'
});


function Song(id, artist, track, duration, downloadUrl, service) {
    this.id = id;

    var playedSoFar = 0;
    var scrobbleThreshold = Math.min(duration / 2, 4 * 60);
    
    var ended = false;
    var scrobbleCanceled = false;

    var postponedClearNowPlaying;
    var postponedScrobble;

    function scrobble() {
        var timestamp = Math.round(new Date().getTime() / 1000);

        var sessionId = auth.obtainSessionId(true);
        if (!sessionId) {
            return;
        }

        lastfm.signedCall('POST', {
            method: 'track.scrobble', 
            artist: artist,
            track: track,
            timestamp: timestamp,
            sk: sessionId
        }, function success() {
            storage.addToLastScrobbled(artist, track, timestamp, downloadUrl, service);
        }, undefined, function deauth() {
            auth.deauthenticate();
        }, this);
    }

    function updateNowPlaying() {
        var sessionId = auth.obtainSessionId(true);
        if (!sessionId) {
            return;
        }

        lastfm.signedCall('POST', {
            method: 'track.updateNowPlaying', 
            artist: artist,
            track: track,
            sk: sessionId
        }, function(response) {
            if (response.nowplaying && JSON.parse(localStorage.correctTrackNames)) {
                if (response.nowplaying.artist) {
                    artist = response.nowplaying.artist['#text'] || artist;
                }
                if (response.nowplaying.track) {
                    track = response.nowplaying.track['#text'] || track;
                }
            }
            if (!scrobbleCanceled && !ended) {
                storage.setNowPlaying(artist, track, downloadUrl, service);
                if (!postponedClearNowPlaying) {
                    postponedClearNowPlaying = new PostponedFunction(
                        storage.clearNowPlaying.bind(storage));
                    postponedClearNowPlaying.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
                }
            }
        }, undefined, function deauth() {
            auth.deauthenticate();
        }, this);
        
        if (postponedClearNowPlaying) {
            postponedClearNowPlaying.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
        }
    }

    this.start = function() {
        this.continue();
    };

    this.continue = function() {
        if (scrobbleCanceled || ended) {
            return;
        }
        playedSoFar += LASTIQUE_UPDATE_INTERVAL_SEC;
        updateNowPlaying();
        if (playedSoFar > scrobbleThreshold) {
            if (!postponedScrobble) {
                postponedScrobble = new PostponedFunction(scrobble);
            }
            postponedScrobble.postpone(LASTIQUE_UPDATE_INTERVAL_SEC + 3);
        }
    };

    this.end = function(options) {
        if (postponedScrobble) {
            if (options && options.cancelScrobbling) {
                postponedScrobble.cancel();
                scrobbleCanceled = true;
            } else {
                postponedScrobble.execute();
            }
            delete postponedScrobble;
        }
        if (postponedClearNowPlaying) {
            postponedClearNowPlaying.execute();
            delete postponedClearNowPlaying;
        }
        ended = true;
    };

    this.startIfRecognized = function() {
        // Start scrobbling only if Last.fm knows this track
        // (track has MusicBrainz id or listened enough times).
        var self = this;
        lastfm.signedCall('GET', {
            method: 'track.getInfo',
            artist: artist,
            track: track
        }, function(response) {
            var track = response.track;
            if (track && (track.mbid != "" || parseInt(track.playcount) > 75)) {
                self.start();
            } else {
                // Prevent further attempts to scrobble this track
                ended = true;
            }
        }, undefined, function deauth(response) {
            this.deauthenticate();
        });
    }
}


var scrobbler = {
    _song: null,

    started: function(songData, service) {
        if (this._song) {
            this._song.end();
        }
        if (songData.duration < 30) {
            // Last.fm's song length policy
            return;
        }
        this._song = new Song(
            songData.id, songData.artist, songData.track,
            songData.duration, songData.downloadUrl, service);

        if (service == 'www.youtube.com') {
            this._song.startIfRecognized();
        } else {
            this._song.start();                
        }
    },

    cancelScrobbling: function(songId) {
        this._song.end({cancelScrobbling: true});
    },

    continued: function(songId) {
        if (!this._song || this._song.id != songId) {
            return;
        }
        this._song.continue();
    }
};


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
};


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
                username: localStorage.username,
                autocorrect: JSON.parse(localStorage.correctTrackNames) ? 1 : 0
            }, function successCallback(response) {
                var t = response.track;
                trackData = {
                    track: t.name,
                    trackUrl: t.url,
                    artist: t.artist.name,
                    artistUrl: t.artist.url,
                    isLoved: t.userloved == '1',
                    unknownTrack: false
                };
                cache.add(cacheKey, trackData);
                callback(trackData);
            }, function error(response) {
                if (response.error) {
                    log('track.getInfo returned error #' + response.error + ' : ' + response.message);
                    trackData = {
                        track: track,
                        trackUrl: null,
                        artist: artist,
                        artistUrl: null,
                        isLoved: false,
                        unknownTrack: true
                    };
                }
                cache.add(cacheKey, trackData);
                callback(trackData);
            });
        }
    },

    setNowPlaying: function(artist, track, downloadUrl, service) {
        this._getTrackInfo(artist, track, function(trackData) {
            $.extend(trackData, {
                service: service,
                downloadUrl: downloadUrl
            });
            localStorage.nowPlaying = JSON.stringify(trackData);
        });
    },

    clearNowPlaying: function() {
        localStorage.nowPlaying = 'false';
    },

    addToLastScrobbled: function(artist, track, timestamp, downloadUrl, service) {
        this._getTrackInfo(artist, track, function(trackData) {
            $.extend(trackData, {
                timestamp: timestamp,
                downloadUrl: downloadUrl,
                service: service
            });
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

        var sessionId = auth.obtainSessionId(true);
        if (!sessionId) {
            return;
        }

        lastfm.signedCall('POST', {
            method: 'library.removeScrobble', 
            artist: scrobbleToRemove.artist,
            track: scrobbleToRemove.track,
            timestamp: scrobbleToRemove.timestamp,
            sk: sessionId
        }, function success() {
            table.splice(scrobbleToRemoveIndex, 1);
            localStorage.lastScrobbled = JSON.stringify(table.slice(-20));
            callback();
        }, undefined, function deauth(response) {
            this.deauthenticate();
        });
    },

    triggerLove: function(songData, callback) {
        var table = JSON.parse(localStorage.lastScrobbled || '[]');
        var nowPlaying = JSON.parse(localStorage.nowPlaying || 'false');

        var sessionId = auth.obtainSessionId(true);
        if (!sessionId) {
            return;
        }

        var method = songData.isLoved ? 'unlove' : 'love';
        lastfm.signedCall('POST', {
            method: 'track.' + method, 
            artist: songData.artist,
            track: songData.track,
            sk: sessionId
        }, function success(response) {
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
        }, undefined, function deauth(response) {
            this.deauthenticate();
        });
    }
};


var auth = {
    deauthenticate: function() {
        delete localStorage.token;
        delete localStorage.username;
        delete localStorage.sessionId;
    },

    authorizeToken: function() {
        var url = 'http://www.last.fm/api/auth/'
                + '?api_key=' + lastfm.apiKey
                + '&token=' + localStorage.token;
        if (!this.authTabId && !this.authTabBeingOpened) {
            var that = this;
            this.authTabBeingOpened = true;
            chrome.tabs.create({url: url}, function(tab) {
                that.authTabId = tab.id;
                that.authTabBeingOpened = false;
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
        }, function success(response) {
            localStorage.token = response.token;
        }, undefined, function deauth(response) {
            this.deauthenticate();
        });
        return localStorage.token;
    },

    obtainSessionId: function(requireAuthorizationIfNeeded) {
        if (!localStorage.sessionId) {
            if (this.authTabBeingOpened || this.authTabId) {
                return false;
            }
            if (!localStorage.token) {
                this.obtainToken();
                if (requireAuthorizationIfNeeded) {
                    this.authorizeToken();
                    return false;
                }
            }
            lastfm.synchronousSignedCall('GET', {
                method: 'auth.getSession',
                token: localStorage.token
            }, function success(response) {
                if (response.session) {
                    localStorage.username = response.session.name;
                    localStorage.sessionId = response.session.key;
                    delete localStorage.token;
                } else {
                    console.error('"session" is missing from response:', response);
                }
            }, undefined, function deauth(response) {
                if (response.error) {
                    var AUTHENTICATION_FAILED = 4;  // Authentication Failed - You do not have permissions to access the service
                    var UNAUTHORIZED_TOKEN = 14;  // Unauthorized Token - This token has not been authorized
                    if (response.error == AUTHENTICATION_FAILED || response.error == UNAUTHORIZED_TOKEN) {
                        delete localStorage.token;
                        // token has expired or has not been authorized or just invalid
                        this.obtainToken();
                        if (requireAuthorizationIfNeeded) {
                            this.authorizeToken();
                        }
                    }
                } else {
                    console.error('"error" is missing from response:', response);
                }
            }, this);
        }
        return localStorage.sessionId;
    },

    obtainSessionIdFromToken: function(token, successCallback, errorCallback) {
        lastfm.synchronousSignedCall('GET', {
            method: 'auth.getSession',
            token: token
        }, function success(response) {
            localStorage.username = response.session.name;
            localStorage.sessionId = response.session.key;
            successCallback(localStorage.username, localStorage.sessionId);
        }, function error(response) {
            errorCallback(response);
        }, function deauth(response) {
            this.deauthenticate();
            errorCallback(response);
        }, this);
    }
};

Zepto(function($) {
    auth.obtainSessionId(false);
    storage.clearNowPlaying();

    if (!JSON.parse(localStorage.isNotFirstStarted || 'false')) {
        localStorage.lastScrobbled = JSON.stringify([]);
        localStorage.enabledConnectors = JSON.stringify(['vk.js', 'youtube.js', 'bandcamp.js']);
        localStorage.correctTrackNames = 'true';
        localStorage.isNotFirstStarted = 'true';
    }

    chrome.extension.onConnect.addListener(function(port) {
        port.postMessage(JSON.parse(localStorage.enabledConnectors));
        port.onMessage.addListener(function(message) {
            if (message.event == 'start_playing') {
                scrobbler.started(message.song, message.service);
            } else if (message.event == 'continue_playing') {
                scrobbler.continued(message.song.id);
            }
        });
    });
});
