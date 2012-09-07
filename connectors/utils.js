function sendToBackground(payload) {
    console.log(payload);
    window.postMessage({
        type: 'lastique',
        payload: payload
    }, '*');
}


function decodeHtmlEntities(input) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = input;
    return textarea.value;
}


function getTimestamp() {
    return Math.round(new Date().getTime() / 1000);
}
