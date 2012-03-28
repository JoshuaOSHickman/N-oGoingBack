var models = {};
var ais = {};

$(function () {
    models.NBack = Backbone.Model.extend({
	defaults: {
	    previousBlocks: [],
	    nback: 2,
	    attributesTracked: {"position": true, "color": true},
	    currentBlock: null,
	    currentGuesses: {},
	    score: {right: 0, misses: 0, wrong: 0},
	    over: false,
	    nextStepTimeout: null,
	    size: 9,
	    turnLength: 3000
	},

	start: function () {
	    var self = this;
	    if (this.get("over")) return;
	    this.set("nextStepTimeout", setTimeout(function () {
		self.newBlock();
		self.start();
	    }, this.get("turnLength")));
	},

	stop: function () {
	    this.set("over", true);
	    cancelTimeout(this.get("nextStepTimeout"));
	},

	newBlock: function() {
	    var atts = this.get("attributesTracked");
	    var possibleColors = ["BlueViolet", "Crimson", "DarkGreen", "Magenta", "Gold"];
	    
	    var block = {};
	    if (atts.position) 
		block.position = Math.floor(Math.random() * this.get("size"));
	    if (atts.color) 
		block.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];

	    if (this.get("currentBlock")) {
		this.get("previousBlocks").push(this.get("currentBlock"));
		this.scoreGuesses();
	    }
	    this.set("currentBlock", block);
	    this.trigger("nextstep");
	    return block;
	},

	scoreGuesses: function () { // scores based on previous rounds.
	    var previousBlocks = this.get("previousBlocks");
	    var l = previousBlocks.length;
	    var guesses = this.get("currentGuesses");
	    var firstBlock = previousBlocks[l - 1];
	    var secondBlock = previousBlocks[l - (1 + this.get("nback"))];
	    if (!secondBlock) return; 
	    var corrects = {};
	    var matches = {};
	    for (var attribute in this.get("attributesTracked")) {
		matches[attribute] = firstBlock[attribute] == secondBlock[attribute];
		corrects[attribute] = matches[attribute] && guesses[attribute];
		if (matches[attribute]) {
		    this.trigger("match");
		    this.trigger("match:" + attribute);
		}
	    }
	    for (var a in corrects) {
		if (corrects[a]) { // correct
		    this.trigger("correct:" + a);
		    this.trigger("correct");
		    this.get("score").right += 1;
		} else if (matches[a]) { // one of the matches, not guessed
		    this.trigger("miss:" + a);
		    this.trigger("miss");
		    this.get("score").misses += 1;
		} else if (guesses[a]) { // one of the guesses, not matched
		    this.trigger("wrong:" + a);
		    this.trigger("wrong");
		    this.get("score").wrong += 1;
		}
	    }
	    
	    this.set("currentGuesses", {});
	},
	
	toggleGuess: function (attName) {
	    if (!this.get("currentGuesses")) this.set("currentGuesses", {});
	    var guesses = this.get("currentGuesses");
	    guesses[attName] = !(guesses[attName]);
	},

	toJSON: function() {
	    var atts = this.get("attributesTracked");
	    var curr = this.get("currentBlock");

	    var json = {};
	    json.hasColor = atts.color;
	    
	    var bgcolor = (atts.color && curr.color) || "blue"; // vanilla 'active' block
	    if (atts.position) {
		json.blocks = [];
		json.hasPosition = true;
		for (var i = 0; i < this.get("size"); i += 1) {
		    if (i == curr.position) {
			json.blocks.push({color: bgcolor});
		    } else {
			json.blocks.push({color: "white"}); // indicating 'non-active'
		    }
		}
	    } else {
		json.hasPosition = false;
		json.color = bgcolor;
	    }
	    var score = this.get("score");
	    json.scoreRight = score.right;
	    json.scoreWrong = score.wrong + score.misses;
	    json.scoreAverage = json.scoreRight / (json.scoreRight + json.scoreWrong);
	    json.over = this.get("over");
	    return json;
	}
    });

    ais.RandomFighter = function (successRate) {
	return function (nbackBoard) {
	    var curr = nbackBoard.get("currentBlock");
	    var prevs = nbackBoard.get("previousBlocks");
	    var compd = prevs[prevs.length - nbackBoard.get("nback")];
	    var guesses = {};
	    for (var attr in curr) {
		if (curr[attr] == compd[attr]) {
		    if (Math.random() < successRate) {
			guesses[attr] = true;
		    }
		}
	    }
	    return guesses;
	};
    };

    models.Duel = Backbone.Model.extend({
	defaults: {
	    localBattle: new models.NBack(),
	    opponentBattle: new models.NBack(), // to be replaced with server-defined ones?
	    // like, an extension where newBlock grabs a cache from the server?
	    opponentFighter: ais.RandomFighter(0.7),
	    opponentCrossFighter: ais.RandomFighter(0),
	    foreignGuesses: {},
	    foreignMatches: {},
	    foreignScore: {right: 0, wrong: 0, misses: 0}
	},
	// TODO: hotkeys are important. 

	initialize: function () {
	    var self = this;
	    var attrs = _.keys(this.get("opponentBattle").get("attributesTracked"));
	    _(attrs).each(function (attr) {
		self.get("opponentBattle").on("match:" + attr, function () {
		    self.get("foreignMatches")[attr] = true;
		});
	    });

	    // throw events and keep score of user's mastery of opponent's game
	    this.get("opponentBattle").on("nextstep", function () {
		var fs = self.get("foreignScore");
		var fg = self.get("foreignGuesses");
		var fm = self.get("foreignMatches");
		_(this.get("opponentBattle").get("attributesTracked")).each(function (attr) {
		    if (fg[attr] && fm[attr]) {
			self.trigger("foreign:correct");
			self.trigger("foreign:correct:" + attr);
			fs.right += 1;
		    } else if (fg[attr]) {
			self.trigger("foreign:wrong");
			self.trigger("foreign:wrong:" + attr);
			fs.wrong += 1;
		    } else if (fm[attr]) {
			self.trigger("foreign:miss");
			self.trigger("foreign:miss:" + attr);
			fs.misses += 1;
		    }
		});
	    });

	    // bubble events of user's mastery of own game
	    _(["correct", "miss", "wrong"]).each(function (eventname) {
		var lb = self.get("localBattle");
		lb.on(eventname, function () {
		    self.trigger("local:" + eventname);
		});
		var attrs = _(lb.get("attributesTracked")).keys();
		_.each(attrs, function (attr) {
		    lb.on(eventname + ":" + attr, function () {
			self.trigger("local:" + eventname + ":" + attr);
		    });
		});
	    });
	},
	
	getScore: function () {
	    return {
		user: {
		    local: this.get("localBattle").get("score"),
		    foreign: this.get("foreignScore")
		},
		opponent: {
		    local: this.get("opponentBattle").get("score"),
		    foreign: this.get("opponentCrossScore")
		}
	    };
	}

	start: function () {
	    this.get("localBattle").start();
	    this.get("opponentBattle").start();
	},

	stop: function () {
	    this.get("localBattle").stop();
	    this.get("opposnentBattle").stop();
	},

	toggleForeignExpectation: function (attr) {
	    var fg = this.get("foreignGuesses");
	    fg[attr] = !fg[attr];
	}
    });
});

