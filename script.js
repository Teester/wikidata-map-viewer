var mymap;
var markers = {};
var controlLayers;
var tileLayers = {};
var overlays = {};
var property = "wdt:P31/wdt:P279*";
var P31 = "";

$(document).ready(function(){
	autocomplete(document.getElementById("parliament"));
	$(document).on("mouseover", ".row" , function() {
		let qnumber = $(this).attr("id");
		$("#" + qnumber + ".leaflet-marker-icon").attr("src", "marker-icon-2x-red.png");
	});
	$(document).on("mouseout", ".row" , function() {
		let qnumber = $(this).attr("id");
		$("#" + qnumber + ".leaflet-marker-icon").attr("src", "https://tools-static.wmflabs.org/cdnjs/ajax/libs/leaflet/1.7.1/images/marker-icon.png");
	});
});

/**
 * Entry point into the script.  Called when the page loads
 **/
function start() {
	setupMap();
	downloadLayerList();
	
	updateMap();
	defineQuery();
}

/* Set the width of the sidebar to 250px and the left margin of the page content to 250px */
function openNav() {
	if ($("#mySidebar").width() == 0) {
		$("#mySidebar").width(250);
		$("#mapid").css("marginLeft", "250px");
	} else {
		$("#mySidebar").width(0);
		$("#mapid").css("marginLeft", "0px");
	}
	updateMap();
}


/**
 * Returns the value of the parameter of a url
 **/
function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

/**
 * Changes the location bar value to reflect the current location
 **/
function updateLocationBar(lat, lon, zoom) {
	var urlparameters = "?lat=" + lat + "&lon=" + lon + "&zoom=" + zoom;
	var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + urlparameters;
	window.history.pushState({path:newurl},"",newurl);
}

/**
 * Prepares the map and adds the location according to the url in the urlbar
 **/
function setupMap() {
	var lon = getURLParameter('lon') || "0";
	var lat = getURLParameter('lat') || "52";
	var zoom = getURLParameter('zoom') || "7";
	
	mymap = L.map("mapid", {});
	mymap.setView([lat, lon], zoom);
	L.control.scale().addTo(mymap);
	$('.leaflet-top.leaflet-left').append('<button class="openbtn" onclick="openNav()" title="Click to toggle sidebar">&#9776;</button>');

	var wikimedia_Map = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', {
		attribution: '<a href="https://www.openstreetmap.org/">© OpenStreetMap contributors, CC-BY-SA</a>'
	});
	mymap.addLayer(wikimedia_Map);
	
	mymap.on("moveend", function(){
		updateMap();
	});
	mymap.on("zoomend", function(){
		updateMap();
	});
}

function downloadLayerList() {
	tileLayers = {};
	if (typeof(Storage) !== "undefined") {
		if (localStorage.layers) {
			processLayer(JSON.parse(localStorage.layers));
		} else {
			getLayerList();
		}
	} else {
		getLayerList();
	}
}

function getLayerList() {
	let url = "https://osmlab.github.io/editor-layer-index/imagery.geojson";
	
	$.get(url, function(data, status) { 
		processLayer(data.features);
		if (typeof(Storage) !== "undefined") {
			localStorage.layers = JSON.stringify(data.features);
		}
	});
}

function processLayer(features) {
	let point = [mymap.getCenter().lng, mymap.getCenter().lat];
	var wikimedia_Map = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', {
		attribution: '<a href="https://www.openstreetmap.org/">© OpenStreetMap contributors, CC-BY-SA</a>'
	});
	tileLayers["Wikimedia Map"] = wikimedia_Map;
	let overlayList = ["photo", "map", "osmbasedmap", "elevation", "historicmap", "historicphoto"]
	
	for (feature in features) {

		let attribution = "";
		let f = features[feature];
		if (f.properties.attribution) {
			attribution = "<a href='" + f.properties.attribution.url + "'>" + f.properties.attribution.text + "</a>";
		}
		let url = f.properties.url.replace("zoom", "z");
		let match = url.match(/{switch:([^,}])[^}]*}/)
		url = url.replace(/{switch:([^,}])[^}]*}/, '{s}');
		if (match) {
			match = match[0].replace("}", "")
			match = match.replace("{switch:", "")
			match = match.split(",")
		} else {
			match = "";
		}
		
		let tileLayer = L.tileLayer(url, {'attribution': attribution, 'minZoom': f.properties.min_zoom, 'maxNativeZoom': f.properties.max_zoom, 'maxZoom': 22, 'subdomains': match });
		if (f.properties.type == "tms") {
			if (f.geometry) {
				if (inside(point, f.geometry.coordinates[0])) {	
					if (overlayList.includes(f.properties.category)) {
						if (f.properties.name.includes("overlay")) {
							overlays[f.properties.name] = tileLayer 
						} else if (f.properties.name.includes("Overlay")) {
							overlays[f.properties.name] = tileLayer
						} else {
							tileLayers[f.properties.name] = tileLayer;
						}
					} else {
						overlays[f.properties.name] = tileLayer
					}
				}
			} else {
				if (overlayList.includes(f.properties.category)) {
					if (f.properties.name.includes("overlay")) {
						overlays[f.properties.name] = tileLayer
					} else if (f.properties.name.includes("Overlay")) {
							overlays[f.properties.name] = tileLayer
					} else {
						tileLayers[f.properties.name] = tileLayer;
					}
				} else {
					overlays[f.properties.name] = tileLayer
				}
			}
		}
	}
}

function inside(point, vs) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
    
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

function updateMap() {
	
	updateLocationBar(mymap.getCenter().lat, mymap.getCenter().lng, mymap.getZoom());
	downloadLayerList();
	$('.leaflet-control-layers').first().remove();
	
	let currentlayer = {};
	mymap.eachLayer(function (layer) {
		if (layer._url) {
			currentLayer = layer;
			mymap.removeLayer(layer);
		}
		
	});
	for (layer in tileLayers) {
		if (currentLayer._url == tileLayers[layer]._url) {
			mymap.addLayer(tileLayers[layer]);
		}
	}
	L.control.layers(tileLayers, overlays).addTo(mymap);
	
	defineQuery();
}

function calcCrow(lat1, lon1, lat2, lon2) {
      var R = 6371; // km
      var dLat = toRad(lat2-lat1);
      var dLon = toRad(lon2-lon1);
      var lat1 = toRad(lat1);
      var lat2 = toRad(lat2);

      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c;
      return d;
    }

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}
    
function defineQuery() {
	let bounds = mymap.getBounds();
	let centre = mymap.getCenter();
	let variable = ``
	if (P31 != "") {
		variable = "?place " + property + " wd:" + P31 + "."
	}
	let radius = calcCrow(bounds.getNorth(), bounds.getWest(), bounds.getSouth(), bounds.getEast())/2;
	console.log(radius)
	let header = `SELECT DISTINCT ?place ?placeLabel ?placeDescription ?longitude ?latitude WHERE {  `
	let footer = `		?place p:P625 ?statement. 
						?statement psv:P625 ?coords. 
						?coords wikibase:geoLatitude ?latitude. 
						?coords wikibase:geoLongitude ?longitude. 
						SERVICE wikibase:around { 
							?place wdt:P625 ?location . 
							bd:serviceParam wikibase:center "Point(${centre.lng},${centre.lat})"^^geo:wktLiteral   . 
							bd:serviceParam wikibase:radius "${radius}" . 
							bd:serviceParam wikibase:distance ?distance .
						} .
						filter (?longitude > ${bounds.getWest()} )
						filter (?longitude < ${bounds.getEast()} )
						filter (?latitude < ${bounds.getNorth()} )
						filter (?latitude > ${bounds.getSouth()} )
						SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } 
						} 
						ORDER BY ?distance
						LIMIT 100`
						
	let sparqlQuery = header + variable + footer;
	let endpointUrl = 'https://query.wikidata.org/sparql?';
	let settings = { headers: { Accept: 'application/sparql-results+json' }, data: { query: sparqlQuery } };


	if (radius < 100) {
		$.ajax( endpointUrl, settings ).then( function ( data ) {
			// remove map markers
			for (let marker in markers) {
				mymap.removeLayer(markers[marker]);
			}
			$("#details").empty()
			markers = {};
			let sortable = [];
			let items = {};
			for (let result in data.results.bindings) {
				let item = data.results.bindings[result];
				let lon = item.longitude.value;
				let lat = item.latitude.value;
				let place = item.placeLabel.value;
				let description = "";
				if ("placeDescription" in item) {
					description = item.placeDescription.value;
				}
				let id = item.place.value;
				let qnumber = id.replace("http://www.wikidata.org/entity/", "");
				let markerText = "<a href='" + id + "'>" + place + " (" + qnumber +")</a><br/>" + description + "<br/>";
				marker = new L.marker([lat, lon], {}).bindPopup(markerText)
				
				markers[qnumber] = new L.marker([lat, lon], {}).bindPopup(markerText).addTo(mymap);
				markers[qnumber]._icon.id = qnumber;
				let htmlChunk = "<tr><td class='row' id='"+qnumber+"'><span class='table-place'><a href='" + id + "'>"+ place + "</span><span class='table-qnumber'> ("+qnumber+")</span></a><br/><span class='table-description'>" + description +"</span></td></tr>"
				sortable.push([place, htmlChunk])
			}
			let html = "";

			sortable = sortable.sort(function(a, b) {
				if(a[0] < b[0]) { return -1; }
				if(a[0] > b[0]) { return 1; }
				return 0;
			});

			for (let item in sortable) {
				html += sortable[item][1];
			}
			
			// Add table of results to the sidebar
			let header = "<table><th>" + data.results.bindings.length + " Wikidata Entities</th>"
			let footer = "</table>"
			html = header + html + footer;
			$("#details").append(html);
			
			// Show a warning if 100 items returned
			if (data.results.bindings.length > 99) {
				$('#notify').html('Too many wikidata items found.  Displaying the 100 items closest to the centre of the map.').slideDown();
			} else {
				$('#notify').slideUp().empty();
			}
		} );  
	} else {
		// remove map markers
		for (let marker in markers) {
			mymap.removeLayer(markers[marker]);
		}
		$("#details").empty()
		$('#notify').html('Zoom in to display wikidata items in the area').slideDown();
	} 
	
}

function clearSearch() {
	$("#parliament").val("")
	P31 = "";
	updateMap();
}

/**
 * This function handles all aspects of Autocomplete
 * 
 **/
function autocomplete(inp) {
	console.log("in autocomplete")
	/*the autocomplete function takes two arguments,
	the text field element and an array of possible autocompleted values:*/
	var currentFocus;
	/*execute a function when someone writes in the text field:*/
	inp.addEventListener("input", function(e) {
		var a, b, i, val = this.value;
		/*close any already open lists of autocompleted values*/
		closeAllLists();
		if (!val) { return false;}
		currentFocus = -1;
		/*create a DIV element that will contain the items (values):*/
		a = document.createElement("DIV");
		a.setAttribute("id", this.id + "autocomplete-list");
		a.setAttribute("class", "autocomplete-items");
		/*append the DIV element as a child of the autocomplete container:*/
		this.parentNode.appendChild(a);
		if (val.length>2){
			// get array
			$.ajax({
				type: "GET",
				dataType: "json",
				url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&search="+val+"&language=en&origin=*&format=json",
				success: function(data){
					var arr = data.search;
					/*for each item in the array...*/
					for (var j = 0; j < arr.length; j++) {
						/*check if the item starts with the same letters as the text field value:*/
						/*create a DIV element for each matching element:*/
						b = document.createElement("DIV");
						/*make the matching letters bold:*/
						b.innerHTML = "<span class='autocomplete-label'>" + arr[j].label + "</span>";
						if (arr[j].description) {
							b.innerHTML += "<br/><span class='description'>" + arr[j].description + "</span>";
						}
						/*insert a input field that will hold the current array item's value:*/
						b.innerHTML += "<input type='hidden' value='" + arr[j].label + "' title='" + arr[j].id + "'>";
						b.innerHTML += "<input type='hidden' value='" + arr[j].id + "'>";
						/*execute a function when someone clicks on the item value (DIV element):*/
						b.addEventListener("click", function(f) {
							/*insert the value for the autocomplete text field:*/
							inp.value = this.getElementsByTagName("input")[0].value;
							inp.setAttribute("wikidata", this.getElementsByTagName("input")[1].value);
							P31 = this.getElementsByTagName("input")[1].value
							updateMap();
							closeAllLists();
						});
						a.appendChild(b);
					}
				} 
			});
		}	
	});
	/*execute a function presses a key on the keyboard:*/
	inp.addEventListener("keydown", function(e) {
		var x = document.getElementById(this.id + "autocomplete-list");
		if (x) x = x.getElementsByTagName("div");
		if (e.keyCode == 40) {
			/*If the arrow DOWN key is pressed,
			increase the currentFocus variable:*/
			currentFocus++;
			/*and and make the current item more visible:*/
			addActive(x);
		} else if (e.keyCode == 38) { //up
			/*If the arrow UP key is pressed,
			decrease the currentFocus variable:*/
			currentFocus--;
			/*and and make the current item more visible:*/
			addActive(x);
		} else if (e.keyCode == 13) {
			/*If the ENTER key is pressed, prevent the form from being submitted,*/
			e.preventDefault();
			if (currentFocus > -1) {
				/*and simulate a click on the "active" item:*/
				if (x) x[currentFocus].click();
			}
		}
	});
	function addActive(x) {
		/*a function to classify an item as "active":*/
		if (!x) return false;
		/*start by removing the "active" class on all items:*/
		removeActive(x);
		if (currentFocus >= x.length) currentFocus = 0;
		if (currentFocus < 0) currentFocus = (x.length - 1);
		/*add class "autocomplete-active":*/
		x[currentFocus].classList.add("autocomplete-active");
	}
	function removeActive(x) {
		/*a function to remove the "active" class from all autocomplete items:*/
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active");
		}
	}
	function closeAllLists(elmnt) {
		/*close all autocomplete lists in the document,
		except the one passed as an argument:*/
		var x = document.getElementsByClassName("autocomplete-items");
		for (var i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i]);
			}
		}
	}
	/*execute a function when someone clicks in the document:*/
	document.addEventListener("click", function (e) {
		closeAllLists(e.target);
	});
} 
