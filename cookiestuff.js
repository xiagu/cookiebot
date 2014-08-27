/* TODO:
 * 	 Update Golden Cookie autoclick to take into account time to next GC
 *   Related: make min of that or time to next golden cookie in case of lucky ?
 *	 Make cheatyBuy computations less expensive in general... somehow
 *	 Fix trying to buy the Golden Cookie upgrades ASAP (makes resets dumb now that the count is maintained)
 *   When taking into account the Lucky cookie minimum, consider how long until the next Golden Cookie and the chances of being a Lucky.
 *   Handle the Grandmapocalypse Wrath cookies in predictions and computations
 *		For instance we probably shouldn't click cookies that show up during a Clot.
 */

/* for manually stopping intervals later, if you want to do that */
var goldenCookieInterval;
var cheatyBuyTimeout;
var buyElderPledgeTimeout;
var autoClickTimeout;
var keepBuying = true;
/* for timing CPS */
var start;
var oldCE;

var mouseCps;// GLOBAL VARS ARE GREAT YEAH WOOO

var avgClicksPS = 5;

var ID_LUCKY_DAY = 52,
	ID_SERENDIPITY = 53,
	ID_ELDER_PLEDGE = 74,
	ID_GET_LUCKY = 86,
	ID_SACRIFICIAL_ROLLING_PINS = 87;

/* Called after Cookie Monster is loaded */
function everything() { 

	clearInterval(goldenCookieInterval);
	clearTimeout(cheatyBuyTimeout);
	clearTimeout(buyElderPledgeTimeout);
	clearTimeout(autoClickTimeout);

	/* Remove the alert box, since it requires human interaction to confirm and that will impede our automated cookie-making */
	Game.Upgrades['One mind'].clickFunction = null;

	My_Seconds_Left = function(id, t) {
	  var n = 0;
	  if (t == "ob") {
	    n = Game.ObjectsById[id].price
	  }
	  if (t == "up") {
	    n = Game.UpgradesById[id].basePrice
	  }
	  var r = Game.cookies - n;
	  var i = realCps;
	  if (i == 0) {
	    return 0
	  }
	  if (r < 0) {
	    var s = n / i;
	    var o = r * -1 / i;
	    return o
	  }
	  return 0
	}


	goldenCookieInterval = setInterval(function () { if(Game.goldenCookie.life > 0) { Game.goldenCookie.click(); } }, 1000);

	parseCMNums = function(str) { return parseFloat(str.replace(/[, *]/g,'')); }

	/* Todo: Modify gcbank to take into account time until next GC, and upgrades. */
	gcbank = function(income) {
		gcfactor = 0;
		if(Game.UpgradesById[ID_SERENDIPITY].bought) { gcfactor = 12000; }
		else if(Game.UpgradesById[ID_LUCKY_DAY].bought) { gcfactor = 6000; }
		if(Game.UpgradesById[ID_GET_LUCKY].bought) { gcfactor *= 7; }
		
		Game.CalculateGains(); // recalc to avoid errors in computation
		trueFrenzy = Game.frenzy > 0 ? Game.frenzyPower : 1;
		realCps = Game.cookiesPs / trueFrenzy; // CpS unmodified by frenzy
		mouseCps = Game.computedMouseCps * avgClicksPS / trueFrenzy;
		realCps += mouseCps; // include our autoclicking
		realIncome = income / trueFrenzy;
		return [realCps, (realCps+realIncome)*gcfactor, realIncome];
	}

	goldenCookieCps = function(cps, bank, lucky_day, serendipity, get_lucky) {
		interval = 570; // average time in seconds for a golden cookie to appear
		if(lucky_day) interval /= 2.0;
		if(serendipity) interval /= 2.0;

		payoff = 0;
		if(get_lucky) {
			// these percentages calculated from a sample of 10 million golden cookies
			// now they can overlap

			// chain cookie is more complicated, it can't give you more than when you started
			// if(Game.cookiesEarned > 100000)
			// 	payoff += .00456545455 * 3228721333325.41 // chain cookie (average)
			payoff += .01719354545 * 776 * mouseCps * 27 // click frenzy
			payoff += .48630509091 * 6 * cps * 77 // frenzy
			payoff += .00566790909 * 6 * 776 * mouseCps * 27 // frenzy + click frenzy
			payoff += .21267009091 * ( Math.min(.1*bank, 8400*cps) + 13 ) // frenzy + multiply cookies
			payoff += .27359790909 * ( Math.min(.1*bank, 1200*cps) + 13 ) // multiply cookies
		} else {
			// these percentages taken from the wiki, in theory should be accurate
			payoff += .4900417 * 6 * cps * 77 // frenzy
			payoff += .4900417 * ( Math.min(.1*bank, 1200*cps) + 13 ) // multiply cookies
			payoff += .016625 * 776 * mouseCps * 27 // click frenzy
			// chain cookie is distorting income right now
			// if(Game.cookiesEarned > 100000)
			// 	payoff += .0032916 * 3228721333325.41 // chain cookie (average)
		}
		payoff /= interval;

		return payoff;
	}

	myGoldenCookieCps = function(cps, bank) {
		return goldenCookieCps(cps, bank, Game.UpgradesById[ID_LUCKY_DAY].bought, Game.UpgradesById[ID_SERENDIPITY].bought, Game.UpgradesById[ID_GET_LUCKY].bought);
	}

	/* Measure true CPS, including golden cookie contributions */
	restartCpsAverage = function() {
		start = new Date();
		oldCE = Game.cookiesEarned;
	}
	restartCpsAverage();

	cpsMeasure = function() {
		var date = new Date();
		avg = CM.Backup.Beautify((Game.cookiesEarned - oldCE) * 1000 / (date.getTime() - start.getTime()));
		var realCps = gcbank(0)[0];
		estimate = CM.Backup.Beautify(realCps + myGoldenCookieCps(realCps,Game.cookies));
		console.log("Running average CPS since " + start.toLocaleTimeString() + " = " + avg + " \tEstimated CPS: " + estimate);
		setTimeout(cpsMeasure, 10000);
	}
	cpsMeasure(); /* Start */

	cheatyBuy = function() {
		min = Number.MAX_VALUE;
		savedName = "";
		savedPrice = Number.MAX_VALUE;
		savedIncome = 0; 
		savedTime = 0; // seconds until we can buy

		// need for golden cookie upgrade calculations
		var bank = gcbank(savedIncome);
		var realCps = bank[0];
		var reqBank = bank[1];
		var realIncome = bank[2];

		/* Check items to buy */
		for(var i=0; i<Game.ObjectsN; i++) {
			var name = Game.ObjectsById[i].name;
			var time = (Game.ObjectsById[i].price - Game.cookies) / realCps;
			var value = CM.Cache.Objects[name].bci;
			var income = CM.Cache.Objects[name].bonus;
			if(value+time < min || (value+time == min && Game.ObjectsById[i].price < savedPrice)) {
				min = value+time;
				savedName = name;
				savedObject = Game.ObjectsById[i];
				savedIncome = income;
				savedPrice = savedObject.price;
				savedTime = time;
			}
		}

		// need for golden cookie upgrade calculations
		var bank = gcbank(savedIncome);
		var realCps = bank[0];
		var reqBank = bank[1];
		var realIncome = bank[2];
		
		myCookies = Game.cookies;

		/* Check available upgrades */
		Game.UpgradesInStore.forEach(function (t, n) {
			var id = t.id;
			var name = t.name;
			var income = 0;
			var value = 0;

			switch(name) {
			/* Golden cookie upgrades, Elder Pledge and Sacrificial Rolling Pins */
			case 'Lucky day': // Lucky Day
				income = goldenCookieCps(realCps, myCookies, true, Game.UpgradesById[ID_SERENDIPITY].bought, Game.UpgradesById[ID_GET_LUCKY].bought)
				 - goldenCookieCps(realCps, myCookies, false, Game.UpgradesById[ID_SERENDIPITY].bought, Game.UpgradesById[ID_GET_LUCKY].bought);
				income = Math.max(income, 0);
				value = t.basePrice / income;
				break;
			case 'Serendipity': // Serendipity
				income = goldenCookieCps(realCps, myCookies, Game.UpgradesById[ID_LUCKY_DAY].bought, true, Game.UpgradesById[ID_GET_LUCKY].bought)
				 - goldenCookieCps(realCps, myCookies, Game.UpgradesById[ID_LUCKY_DAY].bought, false, Game.UpgradesById[ID_GET_LUCKY].bought);
				income = Math.max(income, 0);
				value = t.basePrice / income;
				break;
			case 'Get lucky': // Get Lucky
				income = goldenCookieCps(realCps, myCookies, Game.UpgradesById[ID_LUCKY_DAY].bought, Game.UpgradesById[ID_SERENDIPITY].bought, true) 
				- goldenCookieCps(realCps, myCookies, Game.UpgradesById[ID_LUCKY_DAY].bought, Game.UpgradesById[ID_SERENDIPITY].bought, false);
				income = Math.max(income, 0);
				value = t.basePrice / income;
				break;
			case 'Elder Pledge':
			case 'Sacrificial rolling pins':
				value = Number.MIN_VALUE;
				break;
			case 'Plastic mouse':
			case 'Iron mouse':
			case 'Titanium mouse':
			case 'Adamantium mouse':
			case 'Unobtainium mouse':
				income = (realCps - mouseCps) * 0.01;
				value = t.basePrice / income;
				break;
			default:
			   	// Instead of showing the tooltip and regexping it we call Cookie Monster's internal computation functions to get the income
				value = CM.Cache.Upgrades[name].bci;
	        	income = CM.Cache.Upgrades[name].bonus;
			}
			var time = (t.basePrice - Game.cookies) / realCps;
			if(value+time < min || (value+time == min && t.basePrice < savedPrice)) {
				savedName = name;
				savedObject = t;
				savedIncome = income;
				min = value+time;
				savedPrice = t.basePrice;
				savedTime = time;
			}
	    });

		// need for golden cookie upgrade calculations
		var bank = gcbank(savedIncome);
		var realCps = bank[0];
		var reqBank = bank[1];
		var realIncome = bank[2];

		willBuy = ( (myCookies - savedPrice) >= reqBank ) ||
			( (Game.goldenCookie.delay / Game.fps) * (realCps+realIncome) - savedPrice > 0 ) ||
			// ( (reqBank > myCookies) && (reqBank - myCookies) / realCps > (reqBank - myCookies + savedPrice) / (realCps + realIncome) );
			( realIncome + myGoldenCookieCps(realCps+realIncome, myCookies - savedPrice) > myGoldenCookieCps(realCps, myCookies) );
		
		if(willBuy)
			savedObject.buy();

		if(keepBuying) {	
			if(savedTime == 0)
				if(willBuy == false)
					waitTime = 5; // don't spam when we are building bank for GCs
				else
					waitTime = 0.25; // check faster to use up bank faster if we have surplus
			else 
				waitTime = Math.min(Math.max(savedTime / 2.0, 0.5), 300); // check at least once every 30 minutes
			console.log( CM.Backup.Beautify(myCookies - savedPrice) + " remaining, need more than " + CM.Backup.Beautify(reqBank) + "\t will buy [" + savedObject.id + "] " + savedObject.name + ": " + willBuy + ";\tChecking again in " + CM.Disp.FormatTime(waitTime, null));
			clearTimeout(cheatyBuyTimeout); // just in case we want to restart the timer, for instance, some big change happened
			cheatyBuyTimeout = setTimeout(function() { cheatyBuy(); }, waitTime*1000);
		}
	}
	cheatyBuy();

	/* Autobuy elder pledges */
	buyElderPledge = function () {
		if(Game.UpgradesById[ID_ELDER_PLEDGE].bought == 0 && Game.UpgradesById[ID_ELDER_PLEDGE].unlocked == 1) {
			Game.UpgradesById[ID_ELDER_PLEDGE].buy();
		}
		buyElderPledgeTimeout = setTimeout(function() { buyElderPledge(); }, Game.pledgeT / Game.fps);
	}
	buyElderPledge();

	autoClick = function() {
		Game.ClickCookie();
		autoClickTimeout = setTimeout(autoClick, 1000 / avgClicksPS );
	}
	autoClick();

}

/* Install CookieMonster, then once it's loaded run our script */
function install() {
	var jA = document.createElement('script');
	jA.setAttribute('type', 'text/javascript');
	jA.setAttribute('src', 'http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js');
	jA.onload = function() { 
		var jB = document.createElement('script'); 
		jB.setAttribute('type', 'text/javascript'); 
		jB.setAttribute('src', 'http://aktanusa.github.io/CookieMonster/CookieMonster.js'); 
		$(jB).load(everything);
		document.body.appendChild(jB); 
	}; 
	document.body.appendChild(jA); 
}

install();