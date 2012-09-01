var backgroundPage = chrome.extension.getBackgroundPage();


function renderPopup() {
    var table = JSON.parse(localStorage.lastScrobbled || '[]');
    var nowPlaying = JSON.parse(localStorage.nowPlaying || 'false');

    var bodyHtml = T.popup.render({
        username: localStorage.username,
        now: moment(),
        date: function() {
            if (this.timestamp) {
                return moment.unix(this.timestamp).from(this.now);
            } else {
                return chrome.i18n.getMessage('playingNow');
            }
        },
        icon: function() {
            return this.iconUrl || './img/no-icon.png';
        },
        isNothingToShow: !nowPlaying && table.length == 0,
        nowPlaying: nowPlaying,
        lastScrobbled: table.slice(nowPlaying ? -9 : -10).reverse(),
        i18n: {
            isNothingToShow: chrome.i18n.getMessage('isNothingToShow'),
            hello: chrome.i18n.getMessage('hello')
        }
    }, {
        song: T.song
    });
    
    $(document.body).html(bodyHtml);
}


function renderUnauthorizedPopup() {
    var a = $('<a href="#" id="authorize"></a>')
            .html(chrome.i18n.getMessage('authorize') + ' Lastique')
            .on('click', function() {
        backgroundPage.auth.obtainSessionId(true);
        return false;
    });
    $(document.body).empty().append(a);
}


Zepto(function($) {
    moment.lang('en');
    var locale = chrome.i18n.getMessage('@@ui_locale');
    if (locale.lastIndexOf('ru', 0) === 0) {
        moment.lang('ru');
    }

    if (localStorage.sessionId || backgroundPage.auth.obtainSessionId(false)) {
        $(document.body).addClass('authorized');
        renderPopup();
    } else {
        $(document.body).addClass('unauthorized');
        renderUnauthorizedPopup();
    }
});
