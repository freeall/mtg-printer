var terminalMenu = require('terminal-menu');
var mtgjson = require('mtgjson');
var fs = require('fs');
var log = require('single-line-log').stdout;
var renderer = require('mtgjson-render');
var sets = {};

var renderCard = renderer({
	zoom: 2
});

var outstream = function(card, set) {
	return fs.createWriteStream('cards/' + set.name + ' - ' + (card.number ? card.number +' - ' : '') + card.name + '.png');
};

var renderSet = function(set, callback) {
	set = JSON.parse(JSON.stringify(set));

	(function loop() {
		var card = set.cards.pop();

		if (!card) return callback();

		log('Left: ' + (set.cards.length+1) + ' - ' + card.name + (card.number ? ' ('+ card.number + ')' : ''));

		renderCard(card, set.name, function(err, stream) {
			if (err) return callback(err);

			stream.pipe(outstream(card, set));
			stream.on('end', loop);
		});
	}());
};

var newMenu = function() {
	var menu = terminalMenu({ x:4, y:2 });
	menu.createStream().pipe(process.stdout);
	menu.reset();
	return menu;
};

var exit = function() {
	process.stdin.setRawMode(false);
	process.exit();
};

var listSets = function(filter) {
	filter = (filter || '').toUpperCase();

	var menu = newMenu();
	menu.write('CHOOSE SET\n');
	menu.write('----------\n');
	menu.write('FILTER: '+filter+'\n');
	var count = 0;
	sets.forEach(function(set) {
		if (count > 20) return;
		if (set.name.toUpperCase().indexOf(filter) < 0) return;

		count++

		menu.add(set.releaseDate + ' - ' + set.name + ' (' + set.cards.length + ')', function() {
			menu.close();
			listSet(set);
		});
	});

	menu.on('keypress', function(key) {
		menu.close();
		if (key === '27') return exit();
		if (key === '127') return listSets(filter.length > 0 ? filter.substr(0, filter.length-1) : '');
		listSets(filter += String.fromCharCode(key));
	});
};

var listSet = function(set, filter) {
	filter = (filter || '').toUpperCase();
	var menu = newMenu();
	menu.write('CHOOSE CARD TO PRINT\n');
	menu.write('--------------------\n');
	menu.write('FILTER: '+filter+'\n');
	menu.add('PRINT ALL CARDS', function() {
		menu.close();
		renderSet(set, function(err) {
			if (err) return console.log(err);

			listSet(set, filter);
		});
	});

	var count = 0;
	set.cards.forEach(function(card) {
		if (count > 20) return;
		if (card.name.toUpperCase().indexOf(filter) < 0) return;

		count++;

		menu.add(card.name, function() {
			menu.close();
			renderCard(card, set.name, function(err, stream) {
				if (err) throw err;

				stream.pipe(outstream(card, set));
				stream.on('end', function() {
					listSet(set, filter);
				});
			});
		});
	});

	menu.on('keypress', function(key) {
		menu.close();
		if (key === '27') return listSets();
		if (key === '127') return listSet(set, filter.length > 0 ? filter.substr(0, filter.length-1) : '');
		listSet(set, filter += String.fromCharCode(key));
	});
};

fs.mkdir('cards', function() {});

mtgjson(function(err, data) {
	if (err) throw err;

	sets = Object.keys(data).map(function(k) {
		return data[k];
	}).sort(function(a,b) {
		return a.releaseDate.localeCompare(b.releaseDate);
	});
	listSets();
});
