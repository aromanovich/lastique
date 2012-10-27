function injectScript(name) {
    var script = document.createElement('script');
    script.src = chrome.extension.getURL(name);
    document.body.appendChild(script);
}


function injectConnector(enabledConnectors) {
    injectScript('shared_constants.js');
    injectScript('connectors/utils.js');

    var CONNECTORS = {
        '^https?:\/\/vk.com.*$': 'vk.js',
        '^https?:\/\/(www\.)?youtube.com.*$': 'youtube.js'
    }

    Object.keys(CONNECTORS).forEach(function(path) {
        var connector = CONNECTORS[path];
        if (new RegExp(path, 'i').test(window.location) &&
            enabledConnectors.indexOf(connector) != -1) {

            injectScript('connectors/' + connector);
        }
    })
}


var port = chrome.extension.connect();

window.addEventListener('message', function(event) {
    if (event.data.type == 'lastique') {
        port.postMessage(event.data.payload);
    }
});

port.onMessage.addListener(function(enabledConnectors) {
    injectConnector(enabledConnectors);
});