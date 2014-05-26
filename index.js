var phantom = require('phantom-render-stream');
var fs = require('fs');
var pejs = require('pejs');

var views = pejs();
var renderHtml = phantom({
	format: 'png',
	width: 265,
	height: 370
});

var render = function(card, set, callback) {
	if (card.power && card.toughness) card.strength = card.power + '/' + card.toughness;
	if (card.loyalty) card.strength = card.loyalty;

	card.manaCost = card.manaCost || '';
	card.text = card.text || '';

	card.set = set;
	card.manaCost = card.manaCost.replace(/[\{\}]/g, '');
	card.text = card.text.replace(/\{T\}/g, '<span class="tap"></span>');
	card.text = card.text.replace(/\{([WUBRGX\d]+)\}/g, '$1');
	card.text = card.text.replace(/\n\n/g, '<br />');
	card.text = card.text.replace(/\n/g, '<br />');
	card.type = card.type.replace(/—/g, '-'); // quick fix for weird '-'' character
	card.text = card.text.replace(/—/g, '-'); // quick fix for weird '-'' character

	views.render('./card.ejs', {card:card}, function(err, html) {
		if (err) return callback(err);

		fs.writeFile('.tmp.html', html, function(err) {
			if (err) return callback(err);

			var str = fs.createWriteStream('cards/' + set + ' - ' + card.number + ' - ' + card.name + '.png');
			renderHtml('.tmp.html').pipe(str);
			str.on('close', callback);
		});
	});
};


var file = process.argv[2];

if (!file) return console.log('Run as node . myset.json');

var data = JSON.parse(fs.readFileSync(file));
var set = data.name;
(function loop() {
	var card = data.cards.pop();

	if (!card) return console.log('done');

	console.log('Left: ' + (data.cards.length+1) + ' - ' + card.name + ' ('+ card.number + ')');

	render(card, set, function(err) {
		if (err) return console.log(err);

		loop();
	});
})();