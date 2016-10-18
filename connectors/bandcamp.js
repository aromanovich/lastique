(function() {

var lastNotificationTime = 0;

function inject() {
    $("audio").bind("play", function() {
        sendStartPlaying();
    });

    $("audio").bind("loadedmetadata", function() {
        sendStartPlaying();
    });

    $("audio").bind("timeupdate", function() {
        if (getTimestamp() >= lastNotificationTime + LASTIQUE_UPDATE_INTERVAL_SEC)
            sendContinuePlaying();
    });
}

function sendStartPlaying() {
    if (!window.Player || isNaN(getDuration()))
        return;
    
    lastNotificationTime = getTimestamp();

    console.log("sendStartPlaying: " + "id: " + getId() + "; artist: " + getArtist() + "; track: " + getTrack());
    var info = getCurrentTrackInfo();
    sendToBackground({
        event: "start_playing",
        service: "bandcamp.com",
        song: info
    });
}

function sendContinuePlaying() {
    if (!window.Player)
        return;

    lastNotificationTime = getTimestamp();

    console.log("sendContinuePlaying: " + "id: " + getId() + "; artist: " + getArtist() + "; track: " + getTrack());
    sendToBackground({
        event: "continue_playing",
        song: {
            id: getId()
        }
    });
}

function getCurrentTrackInfo() {
    return {
        id: getId(),
        duration: getDuration(),
        artist: getArtist(),
        track: getTrack(),
        downloadUrl: getDownloadUrl()
    };
}

function getViewType() {
    var path = window.location.pathname.split("/")[1];
    if (path == "album")
        return ViewType.Album;
    if (path == "track")
        return ViewType.Track;
}

function getId() {    
    var src = $("audio").attr("src");

    var idStrPos = Math.max(src.indexOf("&id="), src.indexOf("?id="));
    if (idStrPos == -1)
        return getArtist() + " - " + getTrack();

    var idPos = idStrPos + 4;
    var idStrEnd = src.indexOf("&", idStrPos + 1);
    return idStrEnd == -1 ? src.substr(idPos) : src.substr(idPos, idStrEnd - idPos);
}

function getDuration() {
    return $("audio").prop("duration");
}

function getTrack() {
    var viewType = getViewType();
    if (viewType == ViewType.Album)
        return $(".track_info .title").text().trim();
    if (viewType == ViewType.Track)
        return $("#name-section .trackTitle").text().trim();
}

function getArtist() {
    var bandName = $("#band-name-location .title").text();
    var byArtist = $("span[itemprop=byArtist]").text();

    return (bandName || byArtist).trim();
}

function getDownloadUrl() {
    return $("audio").attr("src");
}

var ViewType = { Album : 0, Track : 1 };

inject();

})();
