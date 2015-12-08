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
    data.format = 'json';
    if (!errorCallback) {
        errorCallback = function(data) {
            console.error('Something went wrong:', data);
        };
    }
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


LastFMClient.prototype._signedCall = function(type, data, callback, errorCallback, context, async) {
    data.api_key = this.apiKey;
    data.api_sig = this._getApiSignature(data);
    this._call(type, data, callback, errorCallback, context, async);
};


LastFMClient.prototype.synchronousSignedCall = function(type, data, callback, errorCallback, context) {
    this._signedCall(type, data, callback, errorCallback, context, false);
};


LastFMClient.prototype.signedCall = function(type, data, callback, errorCallback, context) {
    this._signedCall(type, data, callback, errorCallback, context, true);
};


LastFMClient.prototype.unsignedCall = function(type, data, callback, errorCallback, context) {
    data.api_key = this.apiKey;
    this._call(type, data, callback, errorCallback, context, true);
};
