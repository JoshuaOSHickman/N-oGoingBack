var views = {};

$(function () {
    views.Rendered = Backbone.View.extend({
	render: function() {
	    var templateData = this.model.toJSON();
	    var self = this;
	    templates.get(this.options["template-name"], function (template) {
		$(self.el).html(Mustache.render(template, templateData));
	    });
	    return this;
	}
    });

    views.NBack = views.Rendered.extend({
	options: {"template-name": "nback"},

	events: {
	    "click button.position": "togglePosition",
	    "click button.color": "toggleColor"
	},

	initialize: function () {
	    this.model.bind('nextstep', this.render, this);
	    this.model.bind('correct', function () { console.log("right"); });
	    this.model.bind('miss', function () { console.log("missed"); });
	    this.model.bind('wrong', function () { console.log("wrong"); });
	},

	togglePosition: function () {
	    this.model.toggleGuess("position");
	    this.$("button.position").toggleClass("selected");
	},

	toggleColor: function () {
	    this.model.toggleGuess("color");
	    this.$("button.color").toggleClass("selected");
	}
    });
});
