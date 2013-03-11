#!/usr/bin/env node

/**
	witchcraft.js
	convert, vaerage and interpolate missing tabular data on meat use and consumption
**/

var fs = require('fs');
var path = require('path');
var colors = require('colors');
var linestream = require('linestream');
var argv = require('optimist')
	.boolean(['v'])
	.alias('v','verbose')
	.describe('v','more info')
	.argv;

var index = false;
var dataset = [];

var stream = linestream.tsv(path.resolve(__dirname, "../data/data.tsv"), {bufferSize: 300}, function(data, line, isEnd){
	
	if (!index) {
		index = data;
	} else {
		
		var dataobj = {};
		
		for (var i = 0; i < data.length; i++) {
			
			switch (index[i]) {
				
				case "jahr":
				case "rind":
				case "kalb":
				case "schwein":
				case "schaf/ziege":
				case "pferd":
				case "innereien":
				case "geflügel":
				case "sonstige":
				case "fett":
				case "fisch":
					if (data[i] === '') {
						dataobj[index[i]] = null;
					} else {
						dataobj[index[i]] = parseFloat(data[i],10);
					}
				break;
				default:
					dataobj[index[i]] = data[i];
				break;
				
			}
			
		}
		
		var setobj = {
			"jahr": dataobj['jahr'],
			"typ": dataobj['typ'],
			"quelle": dataobj['quelle'],
			"url": dataobj['url'],
			"rind": null,
			"schwein": null,
			"schaf": null,
			"gefluegel": null,
			"sonstiges": null
		};
		
		if (dataobj['rind'] !== null) { setobj['rind'] += dataobj['rind']; }
		if (dataobj['kalb'] !== null) { setobj['rind'] += dataobj['kalb']; }
		if (dataobj['schwein'] !== null) { setobj['schwein'] += dataobj['schwein']; }
		if (dataobj['schaf/ziege'] !== null) { setobj['schaf'] += dataobj['schaf/ziege']; }
		if (dataobj['geflügel'] !== null) { setobj['gefluegel'] += dataobj['geflügel']; }
		if (dataobj['pferd'] !== null) { setobj['sonstiges'] += dataobj['pferd']; }
		if (dataobj['innereien'] !== null) { setobj['sonstiges'] += dataobj['innereien']; }
		if (dataobj['sonstige'] !== null) { setobj['sonstiges'] += dataobj['sonstige']; }
		
		dataset.push(setobj);
		
	}
	
});

var years = [];
var sdata = {};

stream.on('end', function(){
	
	dataset.forEach(function(item){
		
		if (years.indexOf(item.jahr) < 0) {
			years.push(item.jahr);
			sdata[item.jahr] = {
				'raw': {
					'verzehr': [],
					'verbrauch': []
				},
				'avg': {
					'verzehr': {},
					'verbrauch': {}
				}
			}
		}
		
		sdata[item.jahr]['raw'][item.typ].push(item);
		
	});
		
	years.sort();
	
	/* get average fpr duplicate data and sum up */
	
	years.forEach(function(year){

		['verzehr','verbrauch'].forEach(function(type){
			
			sdata[year]['avg'][type]['total'] = 0;

			['rind','schwein','schaf','gefluegel','sonstiges'].forEach(function(animal){
			
				sdata[year]['avg'][type][animal] = null;

				var count = 0;

				sdata[year]['raw'][type].forEach(function(set){
					
					if (set[animal] !== null) {
						count++;
						sdata[year]['avg'][type][animal] += set[animal];
					}
					
				});
				
				if (sdata[year]['avg'][type][animal] !== null) {
					sdata[year]['avg'][type][animal] /= count;
					sdata[year]['avg'][type]['total'] += sdata[year]['avg'][type][animal];
				}
				
			});
			
		});
		
		if (argv.v) console.error(('['+year.toString()+']').magenta);
		if (argv.v) console.error('[ verzehr ]'.yellow, sdata[year]['avg']['verzehr']['total'].toFixed(2).toString().green);
		if (argv.v) console.error('[ verbrauch ]'.yellow, sdata[year]['avg']['verbrauch']['total'].toFixed(2).toString().green);
		
		sdata[year]['ratio'] = {};
		
		if (sdata[year]['avg']['verzehr']['total'] > 0 && sdata[year]['avg']['verbrauch']['total'] > 0) {
			
			sdata[year]['ratio']['total'] = (sdata[year]['avg']['verzehr']['total'] / sdata[year]['avg']['verbrauch']['total']);
			if (argv.v) console.error('[ratio]'.yellow, sdata[year]['ratio']['total'].toFixed(2).toString().green);
			
		} else {
			
			sdata[year]['ratio']['total'] = null;
			
		}

	});
	
	
	/* assume a ration of 1 if ratio > 1 */

	range(1900, 2011, 1).forEach(function(year){
	
		if (!(year in sdata)) sdata[year] = {'avg': {'verzehr': {}}, 'ratio': {'total': 0}}
	
		if (year in sdata && sdata[year]['ratio']['total'] !== null && sdata[year]['ratio']['total'] > 1) {
			
			sdata[year]['ratio']['total'] = 1;
			
		}

	});
	
	/* assuming a ration of 1 for 1900 if 1900 has no ratio */
	
	if (!(sdata[1900]['ratio']['total'] > 0)) {
		
		sdata[1900]['ratio']['total'] = 1;
		
	}
	
	/* first pass: interpolate ratio */
	
	var last_ratio_year = 0;
	var next_ratio_year = 0;

	range(1900, 2011, 1).forEach(function(year){
			
		if (sdata[year]['ratio']['total'] > 0) {

			last_ratio_year = year;
			
			if (argv.v) console.error(year.toString().magenta, ('having ratio      ').green, sdata[year]['ratio']['total'].toFixed(3).toString().blue);

		} else {
			
			for (var i = year; i <= 2011; i++) {
				
				if (sdata[i]['ratio']['total'] > 0) {
					
					next_ratio_year = i; 
					break;
					
				}

			}
			
			if (argv.v) console.error(year.toString().magenta, ('interpolating from '+last_ratio_year+' and '+next_ratio_year+'').yellow);
			
			sdata[year]['ratio']['total'] = linterpol(last_ratio_year, sdata[last_ratio_year]['ratio']['total'], next_ratio_year, sdata[next_ratio_year]['ratio']['total'], year);
			
			if (argv.v) console.error(year.toString().magenta, ('interpol '+last_ratio_year+'/'+next_ratio_year).yellow, sdata[year]['ratio']['total'].toFixed(3).toString().blue);
			
		}

	});
	
	/* second pass: guess consumption by applying ratio */
	
	range(1900, 2011, 1).forEach(function(year){
		
		if (!('avg' in sdata[year]) || !('verbrauch' in sdata[year]['avg'])) {
			return;
		}

		if (!(sdata[year]['avg']['verzehr']['total']) > 0 && (sdata[year]['avg']['verbrauch']['total'] > 0)) {
			
			sdata[year]['avg']['verzehr'] = {'total': 0};
			
			['rind','schwein','schaf','gefluegel','sonstiges'].forEach(function(animal){
				
				sdata[year]['avg']['verzehr'][animal] = (sdata[year]['avg']['verbrauch'][animal] * sdata[year]['ratio']['total']);
				sdata[year]['avg']['verzehr']['total'] += sdata[year]['avg']['verzehr'][animal];
				
			});
			
			if (argv.v) console.error(year.toString().magenta, 'guessed c by ratio'.yellow, sdata[year]['avg']['verzehr']['total'].toFixed(3).blue);
			
		}

	});
	
	/* averaging for completely missing years */
	
	var last_consumption_year = 0;
	var next_consumption_year = 0;

	range(1900, 2011, 1).forEach(function(year){
	
		if (('avg' in sdata[year]) && ('verzehr' in sdata[year]['avg']) && ('total' in sdata[year]['avg']['verzehr']) && sdata[year]['avg']['verzehr']['total'] > 0) {
			if (argv.v) console.error(year.toString().magenta, 'OK'.green);
			last_consumption_year = year;
			return;
		} 
		
		/* find next year */
		
		for (var i = year; i <= 2011; i++) {
			
			if (sdata[i]['avg']['verzehr']['total'] > 0) {
				
				next_consumption_year = i; 
				break;
				
			}

		}
		
		if (argv.v) console.error(year.toString().magenta, ('interpol '+last_consumption_year+'/'+next_consumption_year).yellow);
		
		sdata[year]['avg']['verzehr'] = {'total': 0};
		
		['rind','schwein','schaf','gefluegel','sonstiges'].forEach(function(animal){
		
			sdata[year]['avg']['verzehr'][animal] = linterpol(last_consumption_year, sdata[last_consumption_year]['avg']['verzehr'][animal], next_consumption_year, sdata[next_consumption_year]['avg']['verzehr'][animal], year);
			sdata[year]['avg']['verzehr']['total'] += sdata[year]['avg']['verzehr'][animal];
			
		});
		
	
	});
	
	var idata = {};
	
	/* collect */
	
	range(1900, 2011, 1).forEach(function(year){
	
		sdata[year]['avg']['verzehr']['total'] = 0;
	
		['rind','schwein','schaf','gefluegel','sonstiges'].forEach(function(animal){

			sdata[year]['avg']['verzehr'][animal] = parseFloat(sdata[year]['avg']['verzehr'][animal].toFixed(3),10);
			sdata[year]['avg']['verzehr']['total'] += sdata[year]['avg']['verzehr'][animal];
			
		});
	
		idata[year] = sdata[year]['avg']['verzehr'];
	
	});
		
	if (argv.v) console.error("done.".red);
	
	/* write */
	fs.writeFileSync(path.resolve(__dirname, "../data/data.json"), JSON.stringify(idata, null, '\t'));
	
});

/* helper methods */

var linterpol = function(ak,av,bk,bv,xk) {
	// just some linear interpolation, 
	// because the budget was too low for polynominal splines
	var xr = (bk-xk)/(bk-ak);
	return xr*av+(1-xr)*bv;
}

var range = function(a, b, step) {
	var A = [];
	if(typeof a === 'number'){
		A[0] = a;
		step = step || 1;
		while(a+step <= b){
			A[A.length] = a += step;
		}
	} else{
		var s = 'abcdefghijklmnopqrstuvwxyz';
		if(a === a.toUpperCase()){
			b = b.toUpperCase();
			s = s.toUpperCase();
		}
		s = s.substring(s.indexOf(a), s.indexOf(b)+1);
		A = s.split('');		
	}
	return A;
}

