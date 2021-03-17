var mymap;
var marker = new Array();
var controlLayers;
var tileLayers = {};

/**
 * Entry point into the script.  Called when the page loads
 **/
function start() {
	setupMap();
	downloadLayerList();
	
	updateMap();
	defineQuery();
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
	
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	mymap.addLayer(OpenStreetMap_Mapnik);
	
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
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	tileLayers["OSM Mapnik"] = OpenStreetMap_Mapnik;

	for (feature in features) {
		let attribution = "";
		let f = features[feature];
		if (f.properties.attribution) {
			attribution = "<a href='" + f.properties.attribution.url + "'>" + f.properties.attribution.text + "</a>";
		}
		let url = f.properties.url.replace("zoom", "z");
		url = url.replace(/{switch:([^,}])[^}]*}/, '$1');
		if (f.properties.type == "tms") {
			if (f.geometry) {
				if (inside(point, f.geometry.coordinates[0])) {	
			console.log(f.properties)
					tileLayers[f.properties.name] = L.tileLayer(url, {'attribution': attribution, 'minZoom': f.properties.min_zoom, 'maxNativeZoom': f.properties.max_zoom, 'maxZoom': 22 });
				}
			} else {
				tileLayers[f.properties.name] = L.tileLayer(url, {'attribution': attribution, 'minZoom': f.properties.min_zoom, 'maxNativeZoom': f.properties.max_zoom, 'maxZoom': 22 });
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
	$('.leaflet-control-layers').first().remove();;
	L.control.layers(tileLayers).addTo(mymap);
	
	defineQuery();
}

function defineQuery() {
	let bounds = mymap.getBounds();
	let centre = mymap.getCenter();
	
	let sparqlQuery = `SELECT DISTINCT ?place ?placeLabel ?placeDescription ?longitude ?latitude WHERE {  
						?place p:P625 ?statement. 
						?statement psv:P625 ?coords. 
						?coords wikibase:geoLatitude ?latitude. 
						?coords wikibase:geoLongitude ?longitude. 
						SERVICE wikibase:around { 
							?place wdt:P625 ?location . 
							bd:serviceParam wikibase:center "Point(${centre.lng},${centre.lat})"^^geo:wktLiteral   . 
							bd:serviceParam wikibase:radius "20" . 
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
	let endpointUrl = 'https://query.wikidata.org/sparql?';
	let settings = { headers: { Accept: 'application/sparql-results+json' }, data: { query: sparqlQuery } };


	if (mymap.getZoom() > 12) {
		$.ajax( endpointUrl, settings ).then( function ( data ) {
			// remove map markers
			for(i=0;i<marker.length;i++) {
				mymap.removeLayer(marker[i]);
			}
			marker = []
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
				let myMarker = new L.marker([lat, lon], {}).bindPopup(markerText);
				marker.push(myMarker);
			}
			
			// Add layer of markers to the map
			var layerGroup = new L.LayerGroup(marker);
			mymap.addLayer(layerGroup);
			
			// Show a warning if 100 items returned
			if (data.results.bindings.length > 99) {
				$('#notify').html('Too many wikidata items found.  Displaying the 100 items closest to the centre of the map.').slideDown();
			} else {
				$('#notify').slideUp().empty();
				
			}
		} );  
	} else {
		// remove map markers
		for(i=0;i<marker.length;i++) {
			mymap.removeLayer(marker[i]);
		}
		$('#notify').html('Zoom in to display wikidata items in the area').slideDown();
	} 
}
