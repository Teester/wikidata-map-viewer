var mymap;
var api_url;
var marker = new Array();
var bounds;
var controlLayers;
var tileLayers = {}

/**
 * Entry point into the script.  Called when the page loads
 **/
function start() {
	initialMapSetup();
	downloadLayerList();
	
	setupMap();
	defineQuery();
}

/**
 * Returns the value of the parameter of a url
 **/
function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

/**
 * Changes the location bar value to reflect the current bounding box
 **/
function updateLocationBar(minlong, minlat, maxlong, maxlat) {
	var urlparameters = "?bbox=" +minlong + "," + minlat + "," +  maxlong + "," +  maxlat;
	var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + urlparameters;
	window.history.pushState({path:newurl},"",newurl);
}

/**
 * Prepares the map and adds the bounding box according to the url in the urlbar
 **/
function setupMap() {
	var bbox = getURLParameter('bbox') || "-11.0133787,51.222,-5.6582362,55.636";
	api_url = "https://api.openstreetmap.org/api/0.6/changesets?bbox=" + bbox
	var fields = bbox.split(',');
	var minlong = fields[0] * 1;
	var minlat = fields[1] * 1;
	var maxlong = fields[2] * 1;
	var maxlat = fields[3] * 1;

	var southwest = new L.latLng(minlat, minlong);
	var northeast = new L.latLng(maxlat, maxlong);
	bounds = new L.LatLngBounds([southwest, northeast]);
	//console.log(controlLayers)
	//if (controlLayers) {
	//	controlLayers.removeFrom(mymap)
	//}
	//console.log(controlLayers)

	//controlLayers = L.control.layers(tileLayers).addTo(mymap);
	//console.log(controlLayers)
	updateMap();
	mymap.on("moveend", function(){
		bounds = mymap.getBounds();
		updateMap();
});
}

function initialMapSetup() {
	var bbox = getURLParameter('bbox') || "-11.0133787,51.222,-5.6582362,55.636";
	var fields = bbox.split(',');
	var minlong = fields[0] * 1;
	var minlat = fields[1] * 1;
	var maxlong = fields[2] * 1;
	var maxlat = fields[3] * 1;
	var southwest = new L.latLng(minlat, minlong);
	var northeast = new L.latLng(maxlat, maxlong);
	bounds = new L.LatLngBounds([southwest, northeast]);
	mymap = L.map("mapid", {editable: true});
	mymap.fitBounds(bounds);
	
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	mymap.addLayer(OpenStreetMap_Mapnik)
	//tileLayers["OSM Mapnik"] = OpenStreetMap_Mapnik;
}

function downloadLayerList() {
	tileLayers = {}
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
	let url = "https://osmlab.github.io/editor-layer-index/imagery.geojson"
	
	$.get(url, function(data, status) { 
		processLayer(data.features)
		if (typeof(Storage) !== "undefined") {
			localStorage.layers = JSON.stringify(data.features);
		}
	});
}

function processLayer(features) {
	let lat = (bounds.getNorth() + bounds.getSouth()) / 2;
	let lon = (bounds.getEast() + bounds.getWest()) / 2;
	let point = [lon, lat]
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	tileLayers["OSM Mapnik"] = OpenStreetMap_Mapnik;
	for (feature in features) {
		f = features[feature]
		
		let attribution = ""
		if (f.properties.attribution) {
			attribution = "<a href='" + f.properties.attribution.url + "'>" + f.properties.attribution.text + "</a>";
		}
		let url = f.properties.url.replace("zoom", "z");
		let server = ""
		url = url.replace("{switch:a,b,c}", "{s}")
		url = url.replace(/{switch:([^,}])[^}]*}/, '$1')
		if (f.geometry) {
			if (inside(point, f.geometry.coordinates[0])) {	
				tileLayers[f.properties.name] = L.tileLayer(url, {'attribution': attribution, 'max-zoom': f.properties.max_zoom, 'max-native-zoom': 22 })
			}
		} else {
			tileLayers[f.properties.name] = L.tileLayer(url, {'attribution': attribution, 'max-zoom': f.properties.max_zoom, 'max-native-zoom': 22 })
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
	updateLocationBar(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());
	downloadLayerList();
	$('.leaflet-control-layers').first().remove();;
	L.control.layers(tileLayers).addTo(mymap);
	
	defineQuery()
}

function defineQuery() {
	let nwLatitude = bounds.getNorth()
	let nwLongitude = bounds.getWest()
	let seLatitude = bounds.getSouth()
	let seLongitude = bounds.getEast()
	let lat = (bounds.getNorth() + bounds.getSouth()) / 2;
	let lon = (bounds.getEast() + bounds.getWest()) / 2;
	let sparqlQuery = `SELECT DISTINCT ?place ?placeLabel ?placeDescription ?longitude ?latitude WHERE {  
						?place p:P625 ?statement. 
						?statement psv:P625 ?coords. 
						?coords wikibase:geoLatitude ?latitude. 
						?coords wikibase:geoLongitude ?longitude. 
						SERVICE wikibase:around { 
							?place wdt:P625 ?location . 
							bd:serviceParam wikibase:center "Point(${lon},${lat})"^^geo:wktLiteral   . 
							bd:serviceParam wikibase:radius "20" . 
							bd:serviceParam wikibase:distance ?distance .
						} .
						filter (?longitude > ${nwLongitude} )
						filter (?longitude < ${seLongitude} )
						filter (?latitude < ${nwLatitude} )
						filter (?latitude > ${seLatitude} )
						SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } 
						} 
						ORDER BY ?distance
						LIMIT 100`
	let endpointUrl = 'https://query.wikidata.org/sparql?'
	let settings = { headers: { Accept: 'application/sparql-results+json' }, data: { query: sparqlQuery } }

	$.ajax( endpointUrl, settings ).then( function ( data ) {
		let html = "<table id='notestable'><thead><th>Entity ID</th><th>Label</th><th>Description</th><th>Longitude</th><th>Latitude</th></thead><tbody>";

		// remove map markers
		for(i=0;i<marker.length;i++) {
			mymap.removeLayer(marker[i]);
		}
		
		marker = []
		// remove table
		$("#notescontainer").empty()
		for (let result in data.results.bindings) {
			let lon = data.results.bindings[result].longitude.value
			let lat = data.results.bindings[result].latitude.value
			let place = data.results.bindings[result].placeLabel.value
			let description = ""
			if ("placeDescription" in data.results.bindings[result]) {
				description = data.results.bindings[result].placeDescription.value
			}
			let id = data.results.bindings[result].place.value
			let qnumber = id.replace("http://www.wikidata.org/entity/", "")
			let txt = "";
			txt += "<tr class='toplevel' id ='" + id + "'><td class='changesetId'><a href='" + id + "'>" + qnumber + "</a></td>";
			txt += "<td class='changesetTime'><span title='" + id + "'>"+ place + "</span></td>";
			txt += "<td class='changesetTime'><span title='" + id + "'>"+ description + "</span></td>";
			txt += "<td class='changesetComment'>" + lon + "</td>";
			txt += "<td class='changesetCreated'>" + lat + "</td>";
			txt += "</tr>";
			html += txt
			let myMarker = new L.marker([lat, lon]).bindPopup("<a href='" + id + "'>" + place + "</a><br/>");
			marker.push(myMarker);
		}
		html += "</table>"
		$("#notescontainer").append(html);
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
}
