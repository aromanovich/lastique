var backgroundPage = chrome.extension.getBackgroundPage();


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
        icon: function() {
            return this.iconUrl || './img/no-icon.png';
        }
    }, {
        song: T.song
    })
    
    $(document.body).html(bodyHtml);
}


function renderUnauthorizedPopup() {
    var a = $('<a href="#" id="authorize">Авторизуй Lastique</a>').on('click', function() {
        backgroundPage.auth.obtainSessionId(true);
        return false;
    });
    $(document.body).html(a);
}


Zepto(function($) {
    if (localStorage.sessionId || backgroundPage.auth.obtainSessionId(false)) {
        $(document.body).addClass('authorized');
        renderPopup();
    } else {
        $(document.body).addClass('unauthorized');
        renderUnauthorizedPopup();
    }
});
