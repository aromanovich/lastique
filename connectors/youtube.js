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


function onStateChangeHandler(newState) {
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


/* Get called when YouTube player and API is ready. */
function onYouTubePlayerReady() {
    if (parseVideoTitle()) {
        player = document.getElementById(window.yt.playerConfig.attrs.id);
        player.addEventListener('onStateChange', 'onStateChangeHandler');
    }
}


function sendStartPlaying() {
    var parsedTitle = parseVideoTitle();
    sendToBackground({
        event: 'start_playing',
        service: 'www.youtube.com',
        song: {
            id: yt.config_.VIDEO_ID,
            duration: player.getDuration(),
            artist: parsedTitle['artist'],
            track: parsedTitle['track']
        }
    });
}


/* Check that video was playing long enough and send `continue_playing`. */
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


function parseVideoTitle() {
    var title = getVideoTitle();
    var separators = ['-', '–', '—'];
    for (var i = 0; i < separators.length; ++i) {
        var separator = separators[i];
        var titleParts = title.split(separator);
        if (titleParts.length == 2) {
            return {
                artist: decodeHtmlEntities(titleParts[0]),
                track: decodeHtmlEntities(titleParts[1])
            };
        }
    }
    return false;
}


function getVideoTitle() {
    var metaTags = document.getElementsByTagName('meta');
    for (var i = 0; i < metaTags.length; ++i) {
        var tag = metaTags.item(i);
        var property = tag.getAttribute('property');
        if (property == 'og:title') {
            return tag.getAttribute('content');           
        }
    }
}
