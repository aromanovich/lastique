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
        if (currentState == UNSTARTED) {
            sendStartPlaying();
            setInterval(sendContinuePlaying, LASTIQUE_UPDATE_INTERVAL_SEC * 1000);
        }

        if (currentState != PLAYING) {
            lastTimeStartedPlaying = getTimestamp();
        }

        updateInterval = setInterval(function() {
            var continuedPlaying = getTimestamp();
            secondsPlayed += continuedPlaying - lastTimeStartedPlaying;
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
    var titleParts = getVideoTitle().split('-');
    if (titleParts.length == 2) {
        player = document.getElementById(window.yt.playerConfig.attrs.id);
        player.addEventListener('onStateChange', 'onStateChangeHandler');
    }
}


function sendStartPlaying() {
    var titleParts = getVideoTitle().split('-');
    sendToBackground({
        event: 'start_playing',
        song: {
            id: yt.config_.VIDEO_ID,
            duration: player.getDuration(),
            artist: decodeHtmlEntities(titleParts[0]),
            track: decodeHtmlEntities(titleParts[1])
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
