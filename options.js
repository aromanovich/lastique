function t(messageName) {
    return chrome.i18n.getMessage(messageName);
}


Zepto(function($) {
    var bodyHtml = T.options.render({
        scrobbleFrom: t('scrobbleFrom'),
        optionsNote: t('optionsNote'),
        correctTrackNames: t('correctTrackNames'),
        correctTrackNamesNote: t('correctTrackNamesNote')
    });
    $(document.body).html(bodyHtml);

    var enabledConnectors = JSON.parse(localStorage.enabledConnectors);

    enabledConnectors.forEach(function(connector) {
        $('input[value="' + connector + '"]').prop('checked', true);
    });

    $('input[name=connectors]').change(function() {
        var changedEnabledConnectors = $('input[name=connectors]:checked').map(function() {
            return $(this).val();
        });
        localStorage.enabledConnectors = JSON.stringify(changedEnabledConnectors);
    });
    
    var correctTrackNames = JSON.parse(localStorage.correctTrackNames);
    var correctTrackNamesCheckbox = $('input[name=correct-track-names]')
                                        .prop('checked', correctTrackNames);
    correctTrackNamesCheckbox.change(function() {
        correctTrackNames = $(this).prop('checked');
        localStorage.correctTrackNames = JSON.stringify(correctTrackNames);
    });
});
