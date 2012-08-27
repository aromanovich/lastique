function LastFMClient(options) {
    this._apiKey = options.apiKey || console.error('LastFMClient: apiKey is required');
	this._apiSecret = options.apiSecret || console.error('LastFMClient: apiSecret is required');
	this._apiUrl = options.apiUrl || 'http://ws.audioscrobbler.com/2.0/';
}

LastFMClient.prototype._getApiSignature = function(data) {
    var keys = Object.keys(data).sort();
    var nameValueString = keys.reduce(function(prev, key) {
        return prev + key + data[key];
    }, '');
    nameValueString += this._apiSecret;
    return md5(nameValueString);
}

LastFMClient.prototype._call = function(type, data, callback, async) {
    data.format = 'json';
    $.ajax({
        type: type,
        url: this._apiUrl,
        data: data,
        dataType: 'json',
        async: async,
        success: callback,
        error: function(data) {
            log('Something went wrong', data);
        }
    });
}

LastFMClient.prototype.synchronousSignedCall = function(method, data, type, callback) {
    data = data || {};
    data.method = method;
    data.api_key = this._apiKey;
    data.api_sig = this._getApiSignature(data);
    this._call(type, data, callback, false);
};

LastFMClient.prototype.signedCall = function(method, data, type, callback, sync) {
    data = data || {};
    data.method = method;
    data.api_key = this._apiKey;
    data.api_sig = this._getApiSignature(data);
    this._call(type, data, callback, true);
};
