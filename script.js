var mymap;
var api_url;
var marker = new Array();
var bounds;
var reviewChecked = false;

/**
 * Entry point into the script.  Called when the page loads
 **/
function start() {
	setupMap();
	defineQuery()
	console.log("parse",api_url);
	//readTextFile(api_url, parseText);
}

function checkBox() {
	var reviewCheckBox = document.getElementById("myCheck");
	if (reviewCheckBox.checked == true){
		reviewChecked = true;
	} else {
		reviewChecked = false;
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
	mymap = L.map("mapid", {editable: true});
	var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	var southwest = new L.latLng(minlat, minlong);
	var northeast = new L.latLng(maxlat, maxlong);
	bounds = new L.LatLngBounds([southwest, northeast]);
	updateLocationBar(minlong, minlat, maxlong, maxlat);

	mymap.fitBounds(bounds);

	OpenStreetMap_Mapnik.addTo(mymap);

	L.EditControl = L.Control.extend({});
	L.NewRectangleControl = L.EditControl.extend({});
	var rectangle = L.rectangle([southwest,northeast]).addTo(mymap);
	rectangle.enableEdit();
	rectangle.on("editable:dragend editable:vertex:dragend", function() {
		bounds = this.getBounds();
		updateMap();
	});
}

function updateMap() {
		updateLocationBar(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());
		var bbox = getURLParameter("bbox")
		var newurl = "https://api.openstreetmap.org/api/0.6/changesets?bbox=" + bbox
		mymap.fitBounds(bounds);
		defineQuery()
}

function defineQuery() {
	console.log(bounds.getWest())
	let nwLatitude = bounds.getNorth()
	let nwLongitude = bounds.getWest()
	let seLatitude = bounds.getSouth()
	let seLongitude = bounds.getEast()
	let sparqlQuery = `SELECT DISTINCT ?place ?placeLabel ?placeDescription ?longitude ?latitude WHERE {  
						?place p:P625 ?statement. 
						?statement psv:P625 ?coords. 
						?coords wikibase:geoLatitude ?latitude. 
						?coords wikibase:geoLongitude ?longitude. 
						SERVICE wikibase:box { 
							?place wdt:P625 ?location . 
							bd:serviceParam wikibase:cornerWest "Point(${nwLongitude},${nwLatitude})"^^geo:wktLiteral . 
							bd:serviceParam wikibase:cornerEast "Point(${seLongitude},${seLatitude})"^^geo:wktLiteral . 
						} 
						SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } 
						} 
						ORDER BY ?placeLabel
						LIMIT 100`
	let endpointUrl = 'https://query.wikidata.org/sparql?'
	let settings = { headers: { Accept: 'application/sparql-results+json' }, data: { query: sparqlQuery } }

	$.ajax( endpointUrl, settings ).then( function ( data ) {
		console.log(data)
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
			console.log(description)
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
	} );   
}
