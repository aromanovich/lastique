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

    var info = getCurrentTrackInfo();
    console.log("sendStartPlaying: " + "id: " + info.id + "; artist: " + info.artist + "; track: " + info.track);
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

    console.log("sendStartPlaying: " + "id: " + getId());
    sendToBackground({
        event: "continue_playing",
        song: {
            id: getId()
        }
    });
}

function getCurrentTrackInfo() {
    var info = {
        id: getId(),
        duration: getDuration(),
        downloadUrl: getDownloadUrl()        
    }

    var track = getTrack();
    if (!tryGetCompilationArtistAndTrack(track, info)) {        
        info.artist = getArtist();
        info.track = track;
    }

    return info;
}

function getViewType() {
    var path = window.location.pathname.split("/")[1];
    if (!path) // in case of default album
        return ViewType.Album;        
    if (path == "album")
        return ViewType.Album;
    if (path == "track")
        return ViewType.Track;
}

function tryGetCompilationArtistAndTrack(track, resultObj) {
    if (getViewType() != ViewType.Album)
        return false;

    var result = true;
    var delimiter = " - "
    $("#track_table .title span[itemprop='name']").each(function() {
        var title = $(this).text();
        if (title.indexOf(delimiter) == -1)
            result = false;
    });

    if (result && typeof(resultObj) === "object") {
        var pos = track.indexOf(delimiter);
        resultObj.artist = track.substr(0, pos);
        resultObj.track = track.substr(pos + 3);
    }

    return result;
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
