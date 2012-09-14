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
        isNothingToShow: !nowPlaying && table.length == 0,
        nowPlaying: nowPlaying,
        lastScrobbled: table.slice(nowPlaying ? -9 : -10).reverse(),
        i18n: {
            isNothingToShow: chrome.i18n.getMessage('isNothingToShow'),
            hello: chrome.i18n.getMessage('hello'),
            from: chrome.i18n.getMessage('from'),
            dontScrobble: chrome.i18n.getMessage('dontScrobble'),
            unscrobble: chrome.i18n.getMessage('unscrobble')
        }
    }, {
        song: T.song
    });
    
    $(document.body).html(bodyHtml);

    $('#now-playing .unscrobble').on('click', function() {
        backgroundPage.scrobbler.cancelScrobbling();
        $(this).parents('.song').addClass('hide')
               .bind('webkitTransitionEnd', function() { $(this).remove(); }, false);
        return false;
    });

    $('#last-scrobbled .unscrobble').on('click', function() {
        var timestamp = parseInt($(this).data('timestamp'), 10);
        var songEl = $(this).parents('.song');
        songEl.addClass('loading');
        backgroundPage.storage.removeFromScrobbled(timestamp, function() {
            songEl.addClass('hide').bind('webkitTransitionEnd', function() {
                $(this).remove();
            }, false);
        });
        return false;
    });
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
