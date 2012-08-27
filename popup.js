Zepto(function($) {
    var backgroundPage = chrome.extension.getBackgroundPage();

    if (!backgroundPage.obtainSessionId(false)) {
        $('<a href="#">Authorize</a>').appendTo(document.body)
                                      .on('click', function() {
            if (backgroundPage.obtainSessionId(true)) {
                document.write('Authorized!');
            }
        });
    } else {
        document.write('Authorized');
    }
});
