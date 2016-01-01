function LastFMClient(options) {
    this.apiKey = options.apiKey || console.error('LastFMClient: apiKey is required');
    this.apiSecret = options.apiSecret || console.error('LastFMClient: apiSecret is required');
    this.apiUrl = options.apiUrl || 'http://ws.audioscrobbler.com/2.0/';
}


LastFMClient.prototype._getApiSignature = function(data) {
    var keys = Object.keys(data).sort();
    var nameValueString = keys.reduce(function(prev, key) {
        return prev + key + data[key];
    }, '');
    return md5(nameValueString + this.apiSecret);
};


LastFMClient.prototype._call = function(type, data, successCallback, errorCallback, context, async) {
    var originalErrorCallback = errorCallback;
    errorCallback = function(response) {
        // sometimes last.fm does not specify application/json in content-type
        // let's try to parse JSON manually
        if (response instanceof XMLHttpRequest) {
            try {
                response = JSON.parse(response.responseText);
            } catch (e) {
            }
        }
        console.error('Something went wrong:', response);
        if (originalErrorCallback) {
            originalErrorCallback.call(this, response);
        }
    };

    var originalSuccessCallback = successCallback;
    successCallback = function(response) {
        // sometimes last.fm does not specify application/json in content-type,
        // let's try to parse JSON manually
        if (response instanceof XMLHttpRequest) {
            try {
                response = JSON.parse(response.responseText);
            } catch (e) {
            }
        }
        // sometimes last.fm returns errors with 2xx codes
        if (response.error) {
            errorCallback.call(this, response);
        } else {
            if (originalSuccessCallback) {
                originalSuccessCallback.call(this, response);
            }
        }
    };

    data.format = 'json';

    $.ajax({
        type: type,
        url: this.apiUrl,
        data: data,
        dataType: 'json',
        async: async,
        success: context ? successCallback.bind(context) : successCallback,
        error: context ? errorCallback.bind(context) : errorCallback
    });
};


LastFMClient.prototype._signedCall = function(type, data, callback, errorCallback, deauthCallback, context, async) {
    data.api_key = this.apiKey;
    data.api_sig = this._getApiSignature(data);

    var originalErrorCallback = errorCallback;
    errorCallback = function(response) {
        if (response instanceof XMLHttpRequest) {
            try {
                response = JSON.parse(response.responseText);
            } catch (e) {
            }
        }
        var AUTHENTICATION_FAILED = 4;  // Authentication Failed - You do not have permissions to access the service
        var INVALID_SESSION_KEY = 9;  // Invalid session key - Please re-authenticate
        var UNAUTHORIZED_TOKEN = 14;  // Unauthorized Token - This token has not been authorized
        if (response.error == AUTHENTICATION_FAILED ||
            response.error == INVALID_SESSION_KEY ||
            response.error == UNAUTHORIZED_TOKEN) {
            if (deauthCallback) {
                deauthCallback.call(this, response);
            }
        }
        if (originalErrorCallback) {
            originalErrorCallback.call(this, response);
        }
    };

    this._call(type, data, callback, errorCallback, context, async);
};


LastFMClient.prototype.synchronousSignedCall = function(type, data, callback, errorCallback, deauthCallback, context) {
    this._signedCall(type, data, callback, errorCallback, deauthCallback, context, false);
};


LastFMClient.prototype.signedCall = function(type, data, callback, errorCallback, deauthCallback, context) {
    this._signedCall(type, data, callback, errorCallback, deauthCallback, context, true);
};


LastFMClient.prototype.unsignedCall = function(type, data, callback, errorCallback, context) {
    data.api_key = this.apiKey;
    this._call(type, data, callback, errorCallback, context, true);
};
