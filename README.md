Google Chrome extension allowing you to scrobble to Last.fm.  
Available on Chrome Web Store: https://chrome.google.com/webstore/detail/iepmcfkedcobclgjlblahmlekodmnmmk

Project released under MIT license.  
Project icon got from 
[iconspedia.com](http://www.iconspedia.com/icon/lastfm-14506.html) (under CC Attribution Share Alike license).
* * *
Application splits into two parts: front-end and back-end.
### Front-end
Front-end presented by connectors. Connector is the JS code injected in webpage to observe player events or user actions.
Content script `injector.js` decides which connector to inject based on `window.location` and it's own `CONNECTORS` map.

Connector must notify back-end when track starts or continues to play by calling `sendToBackground` function.

When track starts to play, connector must define it's `id` (it may be number, string 
or even just full name of track) and call:
```
sendToBackground({
    event: 'start_playing',
    song: {
        id: <id>,
        duration: <duration in seconds>,
        artist: <artist name>,
        track: <track name>
    }
});
```
Every `LASTIQUE_UPDATE_INTERVAL_SEC` seconds connector must check and send 
`continue_playing` if song continues to play:
```
sendToBackground({
    event: 'continue_playing',
    song: {
        id: <id>
    }
});
```


### Back-end
UI developed using [Hogan.js](http://twitter.github.com/hogan.js/) -- JS templating engine from Twitter.
Chrome's Content Security Policy disallows "code generation from strings" (`eval()`, `new Function`),
so that Hogan.js templates can only be compiled in
[sandbox](http://developer.chrome.com/trunk/extensions/sandboxingEval.html). 
It seems too complicated, so I chose to precompile templates instead.

Run `./compile_templates.sh` -- it will compile templates and update `compiled_templates.js`. 
It requires node.js with Hogan.js installed (`npm install hogan.js`).
