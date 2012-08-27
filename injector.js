var vkcomRegexp = /^https?:\/\/vk.com.*/;

if (vkcomRegexp.test(window.location)) {
    var script = document.createElement('script');
    script.src = chrome.extension.getURL('connectors/vk.js');
    document.body.appendChild(script);

    var port = chrome.extension.connect();
    window.addEventListener('message', function(event) {
        if (event.data.type == 'lastique') {
            port.postMessage(event.data.payload);
        }
    });
}
