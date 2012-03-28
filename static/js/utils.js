var templates = {};

$(function () {
    templates._content = {};
    templates._fetching = {};
    templates._callbacks = {};
    
    templates.get = function (name, callback) {
	if (templates._content[name]) {
	    callback(templates._content[name]);
	} else if (templates._fetching[name]) { // undefined or true here
	    if (!templates._callbacks[name]) {
		templates._callbacks[name] = [];
	    }
	    templates._callbacks.push(callback);
	} else {
	    templates._fetching[name] = true;
	    $.ajax({
		url: "/templates/" + name + ".mustache",
		success: function(text) {
		    templates._content[name] = text; // this data never changes, so this is fine.
		    templates._fetching[name] = false;
		    callback(text);
		    _.each(templates._callbacks[name], function (item) {
			item(text);
		    });
		}
	    });
	}
    };
});