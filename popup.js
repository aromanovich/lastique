function renderPopup() {
    var table = JSON.parse(localStorage.lastScrobbled || '[]');
    var nowPlaying = JSON.parse(localStorage.nowPlaying || 'false');

    var bodyHtml = T.popup.render({
        username: localStorage.username,
        now: moment(),
        date: function() {
            return this.timestamp ?
                moment.unix(this.timestamp).from(this.now) : 'Играет сейчас';
        },
        lastScrobbled: table.slice(-10).reverse(),
        nowPlaying: nowPlaying,
        isNothingToShow: !nowPlaying && table.length == 0,
    }, {
        song: T.song
    })
    
    $(document.body).html(bodyHtml);
}

function renderUnauthorizedPopup() {
    $(document.body).html('<a href="#" id="authorize">Авторизуй Lastique</a>')
                    .on('click', function() {
        backgroundPage.obtainSessionId(true);
        return false;
    });
}

Zepto(function($) {
    backgroundPage = chrome.extension.getBackgroundPage();
    if (localStorage.sessionId || backgroundPage.obtainSessionId(false)) {
        $(document.body).addClass('authorized');
        renderPopup();
    } else {
        $(document.body).addClass('unauthorized');
        renderUnauthorizedPopup();
    }
});
