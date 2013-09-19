/* TODO:
 * 	 Update the cheatyBuy interval to depend on number of seconds remaining for purchase. Lower interval if low seconds (like 0), high interval if high seconds (maybe half? or 1/4th seconds? w/ minimum to avoid Zeno)
 *	 Make cheatybuy computations less expensive in general... somehow
 *	 Fix trying to buy the Golden Cookie upgrades ASAP (makes resets dumb now that the count is maintained)
 *   Use fewer magic numbers in case the number of buildings changes again
 *   When taking into account the Lucky cookie minimum, consider how long until the next Golden Cookie and the chances of being a Lucky.
 */

/* for manually stopping intervals later, if you want to do that */
var goldenCookieInterval;
var cheatyBuyInterval;
/* for timing CPS */
var start;
var oldCE;

function everything() { 
	/* Give CM a little time to load */
	/* Fix Get_True_CPI, the one included in Cookie Monster is both unused and broken  (as of Cookie Monster 1.35.04, approximately) */
	Get_True_CPI = function(e, t) {
	    var n = 0;
	    var r = 0;
	    var i = 0;
	    if (t == "ob") {
	        n = Seconds_Left(e, "ob");
	        r = Game.ObjectsById[e].price;
	        i = hold_is[e]
	    }
	    if (t == "up") {
	        n = Seconds_Left(e, "up");
	        r = Game.UpgradesById[e].basePrice;
	        for (var s = 0; s < 29; s++) {
	            if (_cup(s, e, false)) {
	                i = Manage_Tooltip(s, e, false, true);
	                break
	            }
	        }
	    }
	    var o = r / i;
	    Game.ObjectsById.forEach(function (s, u) {
	        var a = s.price;
	        var f = hold_is[u];
	        var l = Seconds_Left(u, "ob");
	        if (l < n && (t == "up" || u != e)) {
	            var c = n - l;
	            var h = f * c;
	            var d = r - a + h;
	            var v = d / i;
	            if (v > o) {
	                o = v
	            }
	        } else {}
	    });
	    return o
	}

	/* Measure true CPS, including golden cookie contributions */
	start = new Date();
	oldCE = Game.cookiesEarned;
	cpsMeasure = function() {
		var date = new Date();
		console.log("Running average CPS since " + start.toLocaleTimeString() + " = " + (Game.cookiesEarned - oldCE) * 1000 / (date.getTime() - start.getTime()));
		setTimeout(cpsMeasure, 10000);
	}
	cpsMeasure(); /* Start */

	goldenCookieInterval = setInterval(function () { if(Game.goldenCookie.life > 0) { Game.goldenCookie.click(); } }, 1000);

	parseCMNums = function(str) { return parseFloat(str.replace(/[, *]/g,'')); }

	/* Todo: Modify gcbank to take into account time until next GC, and upgrades. */
	gcbank = function(income) {
		gcfactor = 0;
		if(Game.UpgradesById[53].bought) { gcfactor = 12000; }
		else if(Game.UpgradesById[52].bought) { gcfactor = 6000; }
		else { return 0; }
		if(Game.UpgradesById[86].bought) { gcfactor *= 7; }
		
		Game.CalculateGains();
		return ((Game.cookiesPs + income) / (Game.frenzy > 0 ? Game.frenzyPower : 1))*gcfactor;
	}

	cheatyBuy = function() {
		min = Number.MAX_VALUE;
		savedName = "";
		savedPrice = Number.MAX_VALUE;
		savedIncome = 0;
		/* Check items to buy */
		for(var i=0; i<=9; i++) {
			// name = $("#cookie_monster_item_"+i).text().match(/([^(]*) \(/)[1];
			name = Game.ObjectsById[i].name;
			// value = parseCMNums($("#cookie_monster_cpi_"+i).text());
			value = Get_True_CPI(i, "ob");
			income = parseCMNums($("#cookie_monster_is_"+i).text());
			if(value < min || (value == min && Game.ObjectsById[i].price < savedPrice)) {
				savedName = name;
				min = value;
				savedObject = Game.ObjectsById[i];
				savedIncome = income;
				savedPrice = savedObject.price;
			}
		}
		/* Check available upgrades */
		Game.UpgradesInStore.forEach(function (t, n) {
	        $("#upgrade"+n).mouseover();
			id = t.id;
			name = t.name;
			if(id == 52 || id == 53 || id == 74 || id == 86 || id == 87) {
				/* Golden cookie upgrades, Elder Pledge and Sacrificial Rolling Pins */
				value = Number.MIN_VALUE; /* always buy these basically ASAP */
				income = 0;
			} else {
	        	ttvars = $("#cm_up_div_"+id).text().match(/Bonus Income([\d,. *]+?)Base Cost Per Income([\d,. *]+?|Infinity)Time Left(.+)/);
				// value = parseCMNums(ttvars[2]);
				value = Get_True_CPI(id, "up");
				income = parseCMNums(ttvars[1]);
			}
			if(value < min || (value == min && t.basePrice < savedPrice)) {
				savedName = name;
				savedObject = t;
				savedIncome = income;
				min = value;
				savedPrice = t.basePrice;
			}
	    });
	    Game.tooltip.hide();

	    // console.log(savedObject);
		var reqBank = gcbank(savedIncome);
		console.log( (Game.cookies - savedPrice) + " remaining, need more than " + reqBank + "\t will buy [" + savedObject.id + "] " + savedObject.name + ": " + ((Game.cookies - savedPrice) > reqBank));

		if((Game.cookies - savedPrice) >= reqBank) {
			savedObject.buy();
		}
	}
	cheatyBuyInterval = setInterval(function () { cheatyBuy(); }, 1000);

	/* Autobuy elder pledges */
	// buyElderPledge = function () {
	// 	if(Game.UpgradesInStore[0].name == "Elder Pledge") {
	// 		Game.UpgradesInStore[0].buy();
	// 	}
	// }
	// var elderPledgeInterval = setInterval(buyElderPledge, 5000);

}

/* Install CookieMonster, then once it's loaded run our script */
function install() {
	var jA = document.createElement('script');
	jA.setAttribute('type', 'text/javascript');
	jA.setAttribute('src', 'http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js');
	jA.onload = function() { 
		var jB = document.createElement('script'); 
		jB.setAttribute('type', 'text/javascript'); 
		jB.setAttribute('src', 'http://pastebin.com/raw.php?i=2KRNm8Gm'); 
		$(jB).load(everything);
		document.body.appendChild(jB); 
	}; 
	document.body.appendChild(jA); 
}

install();