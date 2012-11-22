var backgroundPage = chrome.extension.getBackgroundPage();


function t(messageName) {
    return chrome.i18n.getMessage(messageName);
}


function getTranslationMap(messageNames) {
    var map = {};
    messageNames.forEach(function(messageName) {
        map[messageName] = t(messageName);
    });
    return map;
}


function renderPopup() {
    var table = JSON.parse(localStorage.lastScrobbled);
    var nowPlaying = JSON.parse(localStorage.nowPlaying);
    var bodyHtml = T.popup.render({
        username: localStorage.username,
        now: moment(),
        date: function() {
            if (this.timestamp) {
                return moment.unix(this.timestamp).from(this.now);
            } else {
                return t('playingNow');
            }
        },
        songData: function() {
            return JSON.stringify(this);
        },
        isNothingToShow: !nowPlaying && table.length == 0,
        nowPlaying: nowPlaying,
        lastScrobbled: table.slice(nowPlaying ? -9 : -10).reverse(),
        i18n: getTranslationMap(['isNothingToShow', 'hello', 'from',
                'dontScrobble', 'unscrobble'])
    }, {
        song: T.song
    });
    
    $(document.body).html(bodyHtml);

    $('#now-playing.song .unscrobble').on('click', function() {
        backgroundPage.scrobbler.cancelScrobbling();
        $(this).parents('.song').addClass('hide')
               .bind('webkitTransitionEnd', function() { $(this).remove(); }, false);
        return false;
    });

    $('.scrobbled.song .unscrobble').on('click', function() {
        var songEl = $(this).parents('.song');
        var songData = JSON.parse(songEl.data('song'));
        
        songEl.addClass('loading');
        backgroundPage.storage.removeFromScrobbled(songData, function() {
            songEl.addClass('hide').bind('webkitTransitionEnd', function() {
                $(this).remove();
            }, false);
        });
        return false;
    });

    $('.song .love').on('click', function() {
        var songEl = $(this).parents('.song');
        var songData = JSON.parse(songEl.data('song'));
        
        songEl.addClass('loading');
        backgroundPage.storage.triggerLove(songData, function(id) {
            var button = $('#' + id).find('.love');
            if (!button.hasClass('pressed')) {
                button.addClass('pressed');
            } else {
                button.removeClass('pressed');
            }
            songEl.removeClass('loading');
        });
        return false;
    });
}


function renderUnauthorizedPopup() {
    var a = $('<a href="#" id="authorize"></a>')
                .html(t('authorize') + ' Lastique')
                .on('click', function() {
        backgroundPage.auth.obtainSessionId(true);
        return false;
    });
    var note = $('<p></p>').html(t('authNote'));
    $(document.body).empty().append(a).append(note);
}


Zepto(function($) {
    moment.lang('en');
    var locale = t('@@ui_locale');
    if (locale.lastIndexOf('ru', 0) === 0) {
        moment.lang('ru');
    }

    var sessionId = localStorage.sessionId;
    if (localStorage.token && !sessionId) {
        sessionId = backgroundPage.auth.obtainSessionIdFromToken(localStorage.token);
    }
    
    if (sessionId) {
        $(document.body).addClass('authorized');
        renderPopup();
    } else {
        $(document.body).addClass('unauthorized');
        renderUnauthorizedPopup();
    }
});
