var script = document.createElement('script');
script.src = chrome.extension.getURL('connector.js');
document.body.appendChild(script);

var port = chrome.extension.connect();
window.addEventListener('message', function(event) {
    if (event.data.type == 'lastique') {
        port.postMessage(event.data.payload);
    }
});
