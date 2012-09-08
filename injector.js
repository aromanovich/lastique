function injectScript(name) {
    var script = document.createElement('script');
    script.src = chrome.extension.getURL(name);
    document.body.appendChild(script);
}

injectScript('shared_constants.js');
injectScript('connectors/utils.js');

var CONNECTORS = {
    '^https?:\/\/vk.com.*$': 'connectors/vk.js',
    '^https?:\/\/(www\.)?youtube.com.*$': 'connectors/youtube.js'
}

Object.keys(CONNECTORS).forEach(function(path) {
    if (new RegExp(path, 'i').test(window.location)) {
        injectScript(CONNECTORS[path]);
    }
})

var port = chrome.extension.connect();
window.addEventListener('message', function(event) {
    if (event.data.type == 'lastique') {
        port.postMessage(event.data.payload);
    }
});
