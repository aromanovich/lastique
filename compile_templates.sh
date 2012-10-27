#!/usr/local/bin/node
var Hogan = require('hogan.js');
var fs = require('fs');

function compileTemplate(template, callback) {
    var filename = __dirname + '/templates/' + template + '.hogan';
    fs.readFile(filename, function(err, contents) {
        var temp = Hogan.compile(contents.toString(), {asString: true});
        callback('T.' + template + ' = new Hogan.Template(' + temp + ')');
    });
}


var templates = ['popup', 'song', 'options'];
var result = 'T={};';
var current = 0

templates.forEach(function(templateName) {
    compileTemplate(templateName, function(templateCode) {
        result += templateCode + '\n';
        if (++current >= templates.length) {
            fs.writeFile(__dirname + '/compiled_templates.js', result); 
        }
    });
});
