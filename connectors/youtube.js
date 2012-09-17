(function() {

/* States */
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;


var player;
var updateInterval;
var currentState = UNSTARTED;

var secondsTracked = 0;
var secondsPlayed = 0;
var lastTimeStartedPlaying;


/* Get called when YouTube player and API is ready. */
window.onYouTubePlayerReady = function() {
    if (parse(getVideoTitle())) {
        player = document.getElementById(window.yt.playerConfig.attrs.id);
        player.addEventListener('onStateChange', 'onStateChangeHandler');
    }
}


window.onStateChangeHandler = function(newState) {
    if (newState == PLAYING) {
        if (currentState == UNSTARTED || currentState == ENDED) {
            sendStartPlaying();
            setInterval(sendContinuePlaying, LASTIQUE_UPDATE_INTERVAL_SEC * 1000);
        }

        if (currentState != PLAYING) {
            lastTimeStartedPlaying = getTimestamp();
        }

        updateInterval = setInterval(function() {
            var continuedPlaying = getTimestamp();
            secondsPlayed += (continuedPlaying - lastTimeStartedPlaying);
            lastTimeStartedPlaying = continuedPlaying;
        }, 1000);
    } else {
        if (currentState == PLAYING) {
            clearInterval(updateInterval);
            var endedPlaying = getTimestamp();
            secondsPlayed += (endedPlaying - lastTimeStartedPlaying);
        }
    }
    currentState = newState;
}


function sendStartPlaying() {
    var parsedTitle = parse(getVideoTitle());
    sendToBackground({
        event: 'start_playing',
        service: 'www.youtube.com',
        song: {
            id: yt.config_.VIDEO_ID,
            duration: player.getDuration(),
            artist: parsedTitle[0],
            track: parsedTitle[1]
        }
    });
}


/* Check that video was playing long enough (more than LASTIQUE_UPDATE_INTERVAL_SEC
 * seconds since the last sent `continue_playing` event) and send `continue_playing`. */
function sendContinuePlaying() {
    if (secondsPlayed < secondsTracked + LASTIQUE_UPDATE_INTERVAL_SEC) {
        return;
    }
    sendToBackground({
        event: 'continue_playing',
        song: {
            id: yt.config_.VIDEO_ID
        }
    });
    secondsTracked += LASTIQUE_UPDATE_INTERVAL_SEC;
}


function getVideoTitle() {
    return document.querySelector('meta[property="og:title"]').getAttribute('content');
}


function trim(s) {
    return s.replace(/^\s+/, '').replace(/\s+$/, '');
}


function parse(title) {
    var separator = /[-–—~|:]/;
    var trackTerminators = [separator, /\(/, /\[/, /{/, /live @/i, 'LIVE',
            /@/, /\+/, /live at/i, /full hd/i, /hd/i, /hq/i, /720/, /1080/,
            'with lyrics$', 'lyrics$', /live$/i];

    if (title.search(separator) == -1) {
        return false;
    }

    var artist = title.split(separator, 1)[0];
    artist = artist.replace(/\[.*?\]/g, '')
                   .replace(/\(.*?\)/g, '')
                   .replace(/\{.*?\}/g, '');

    var track = title.substr(title.search(separator) + 1);
    trackTerminators.forEach(function(terminator) {
        var terminatorIndex = track.search(terminator);
        if (terminatorIndex != -1) {
            track = track.substring(0, terminatorIndex);
        }
    });
    track = trim(track);
    track = track.replace(/^"(.+)".*/, '$1')
                 .replace(/^'(.+)'.*/, '$1');
 
    return [trim(artist), trim(track)];
}

})();
