var $consumption = null;

$(document).ready(function(){
	
	setTimeout(function(){
		$('body').scrollTop(1);
	},1);
	
	/* load data */
	
	$.getJSON('data/data.json', function(data){
		$consumption = data;
		if ('load_callback' in window) {
			window.load_callback();
			delete window.load_callback;
		}
	});
	
	/* date picker */
	
	$('.datepicker').datepicker({
		format: 'mm/yyyy',
		autoclose: true,
		startView: 2,
		startDate: new Date(1900,0,1),
		endDate: new Date(),
		language: 'de'
	}).on('changeMonth', function(ev) {
		$(this).datepicker('hide');
		$(this).val((ev.date.getMonth()+1)+'/'+ev.date.getFullYear());
		$(this).change();
	});
	
	/* form handler */

	$('input', '#content-form').change(function(){
		var gender = $('input[name=gender]:checked', '#content-form').val();
		var birthdate = $('input[name=birthdate]', '#content-form').val();
		var b = birthdate.match(/^(0?[1-9]|10|11|12)\/(19[0-9]{2}|200[0-9]|201[0-3])$/);
		if ('mf'.indexOf(gender) >= 0 && b) {
			var h = parseInt(((gender==='f')?'1':'2')+b[1].lpad('0',2)+b[2],10).toString(16);
			var x = parseInt(h,16).toString();
			location.hash = '#/'+h;
			consuption_calculate(((gender==='f')?'1':'2'), b[1], b[2], function(stat){
				consuption_display(stat);
			});
		}
	});
	
	/* parse hash */
	(function(){
		var match = location.hash.match(/^#\/([a-f0-9]+)/);
		if (match) {
			var x = parseInt(match[1],16).toString();
			if (!x.match(/^[1-2](0[1-9]|10|11|12)(19[0-9]{2}|200[0-9]|201[0-3])$/)) return;
			var gender = x.substring(0,1);
			var month = x.substring(1,3);
			var year = x.substring(3,7);
			$('#gender-'+((gender==='1')?'female':'male')).attr("checked","checked");
			// $('.datepicker').datepicker('setValue', new Date(parseInt(year,10), (parseInt(month,10)-1), 1));
			$('.datepicker').val(month+'/'+year);
			consuption_calculate(gender, month, year, function(stat){
				consuption_display(stat);
			});
		}		
	})();

	
});

var consuption_calculate = function(gender, month, year, callback) {
	if ($consumption === null) {
		window.load_callback = function(){
			consuption_calculate(gender, month, year, callback);
		}
	} else {

		var data = {};

		var month_start = parseInt(month,10);
		var year_start = parseInt(year,10);
		
		var month_end = (new Date().getMonth())+1;
		var year_end = (new Date().getFullYear());
		
		var fact = 0;
		var amt = 0;
		var age = 0;
		
		var fact_gender = gender_fact(parseInt(gender,10));
		var fact_age = 1;
		var consumption = {};
		
		for (var i = year_start; i <= year_end; i++) {
			
			age++;

			fact_age = age_fact(age);
			
			if (year_start === year_end) {
				fact = (month_end - month_start) / 12
			} else if (i === year_start) {
				fact = 1-(month_start/12);
			} else if (i === year_end) {
				fact = (month_end/12);
			} else {
				fact = 1;
			}
			
			// assume data of 2011 for dates after
			if (i > 2011) {
				consumption = $consumption[2011];
			} else {
				consumption = $consumption[i];
			}
			
			for (item in consumption) {

				amt = consumption[item] * fact * fact_age * fact_gender;
				
				if (item in data) {
					data[item] += amt;
				} else {
					data[item] = amt;
				}
				
			}
			
		}
		
		data['gans'] = data['gefluegel'] * $fowl_factors['gans'];
		data['ente'] = data['gefluegel'] * $fowl_factors['ente'];
		data['huhn'] = data['gefluegel'] * $fowl_factors['huhn'];
		data['pute'] = data['gefluegel'] * $fowl_factors['pute'];
		
		delete data['gefluegel'];
		delete data['total'];
		delete data['sonstiges'];
		
		for (item in data) {
			data[item] /= $meat_factors[item];
			data[item] = Math.round(data[item]*10)/10;
		}
		
		callback(data);
	}
};

var consuption_display = function(data){

	// $('#content-canvas').html(JSON.stringify(data,'','<br />'));
	
	$('#content-result').addClass('display');
	$('#intro').addClass('hidden');

	var $txti = 0;

	var $canvas = $('#content-canvas');
	var i;
	
	$canvas.html(''); // clear canvas
	
	for (animal in $animal_labels) {
		
		$row = $('<div />').addClass('animal-row').attr('id','animal-'+animal)

		$canvas.append($row);
		
		for (i = 0; i < parseInt(data[animal],10); i++) {
			
			$row.append($('<div class="animal-display"></div>'));
			
		}
		
		if (data[animal]%1 > 0) {
			
			$frac = $('<div class="animal-display"></div>');
			$row.append($frac);
			
			$frac.css({"width": parseInt($frac.width()*(data[animal]%1),10) });
			
			
		}
		
		$row.append($('<div />').addClass('animal-count').text(data[animal].toFixed(1).replace(/\./,',')+' '+$animal_labels[animal][1]));
		
		$row.append('<div class="clear"></div>');
		
		$txti += data[animal]; //.push(data[animal].toFixed(0)+' '+$animal_labels[animal][((data[animal].toFixed(0) === "1") ? 0 : 1)]);
		
	}

	$canvas.append('<div class="clear"></div>');
	
	/* append social links */

	//var $text = $txti.pop();	
	$text = encodeURIComponent("Ich habe seit meiner Geburt "+($txti.toFixed(0))+" Tiere gegessen. Und Du? #fleischrechner");

	var $url = encodeURIComponent(location.protocol+'//'+location.hostname+location.pathname);
	
	var $social = $('<div id="social"></div>');
	$social.append('<span>Teilen auf: </span>');
	$social.append('<a class="btn btn-mini btn-info share-pop" href="https://twitter.com/intent/tweet?url='+$url+'&amp;text='+$text+'&amp;via=boell_stiftung" id="share-twitter">Twitter</a>');
	$social.append('<a class="btn btn-mini btn-info share-pop" href="http://www.facebook.com/sharer/sharer.php?u='+$url+'&amp;t='+$text+'" id="share-facebook">Facebook</a>');
	$social.append('<a class="btn btn-mini btn-info share-pop" href="https://plus.google.com/share?url='+$url+'" id="share-google">Google+</a>');
	$canvas.prepend($social);
	_pop();

};

var gender_fact = function(gender) {
	
	return (gender === 1) ? 0.6 : 1.4;
	
}

/* x percentage of animals on total fowl */
var $fowl_factors = {
	"gans": 0.04,
	"ente": 0.06,
	"huhn": 0.57,
	"pute": 0.33
}

/* x kg of meat make for one animal */
var $meat_factors = {
	"rind": 245,
	"schwein": 52,
	"schaf": 12,
	"gans": 1.61,
	"ente": 0.79,
	"huhn": 0.2918,
	"pute": 3.47
}

var age_fact = function(age) {
	
	if (age <= 1) return 0.13;
	if (age <= 2) return 0.3;
	if (age <= 3) return 0.3;
	if (age <= 6) return 0.4;
	if (age <= 9) return 0.5;
	if (age <= 14) return 0.8;
	if (age <= 18) return 1;
	if (age <= 24) return 1.2;
	if (age <= 50) return 1.1;
	if (age <= 64) return 1;
	if (age <= 80) return 0.8;
	return 0.7;
	
}

String.prototype.lpad = function(padString, length) {
	var str = this;
	while (str.length < length) str = padString + str;
	return str;
}

var $animal_labels = {
	"rind": ["Rind","Rinder"],
	"schaf": ["Schaf","Schafe"],
	"gans": ["Gans","Gänse"],
	"schwein": ["Schwein","Schweine"],
	"ente": ["Ente","Enten"],
	"pute": ["Pute","Puten"],
	"huhn": ["Huhn","Hühner"]
}

/* remove address bar */

window.addEventListener("load",function() {
  setTimeout(function(){
    window.scrollTo(0, 1);
  }, 0);
});

$(window).on("load resize", function(){
	console.log($(window).width());
	if ($(window).width() < 959) {
		var _shift = $('#content-form').height();
		$('#container').css('min-height', (
			$(window).height()
		));
		$('#content').css('min-height', (
			$(window).height()-(
				$('#head').height()+
				$('#foot').height()+
				_shift
			)
		));
		$('#content').css('padding-top', _shift);
	} else {
		/* reset everything */
		$('#container').css('min-height','auto');
		$('#content').css('min-height','auto');
	}
});

var _pop = function(){
	$('.share-pop').click(function(evt){
		evt.preventDefault();
		window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
		return false;
	});
}