//https://developer.spotify.com/documentation/general/guides/authorization-guide/#implicit-grant-flow
//

//App Specific
const client_id = "f76433fcadb3482cbe90b168aca171b6";
// const login_redirect_route = "http://localhost:8000/";
const login_redirect_route = "http://www.grantholtes.com/smartshuffle";
const scope = "playlist-modify-public"

//Constants 
const AUTH_BASE_URL = 'https://accounts.spotify.com/authorize';
const USER_ENDPOINT = "me";
const API_ENDPOINT = 'https://api.spotify.com/v1/';
const PLAYLIST_ENDPOINT = "me/playlists?limit=5"; //set number of playlists here
function AUDIOANALYSIS_ENDPOINT(trackIDs) {
	tracIDstr = ""; //TODO paginate this to a max of 90 songs to keep HTTP requests under 2048 chars
	for (let i = 0; i < trackIDs.length; i++) {
		tracIDstr = tracIDstr.concat(trackIDs[i])
		if (i < trackIDs.length-1) {
			tracIDstr = tracIDstr.concat("%2C");
		}
	}
	return "audio-features" + "?ids=" + tracIDstr
}
function TRACKS_ENDPOINT(playlist_id) {
	return "playlists/"+playlist_id+"/tracks";
}
function NEW_PLAYLIST_ENDPOINT(user_id) {
	return "users/"+user_id+"/playlists";
}

//Derived Constants 
const authURI = AUTH_BASE_URL + '?client_id='+client_id+"&response_type=token&redirect_uri="+login_redirect_route+"&scope="+scope;
const MAX_AUDIO_ANALYSIS_LENGTH = 80;
//Variables
let ACCESS_TOKEN;
var userID;
var userName;

var playlists; // = JSON.parse('[{"name":"[None]"}, {"name":"[None]"}, {"name":"[None]"}]') //To be populated 
var playlist_id;
var playlistName; // for adding to the new playlist
var playlistDescription; // for adding to the new playlist
var createdPlaylistID;
var createdPlaylistName = "";

var tracks;
var trackIDs;
var reorderedURIs;
var trackAnalysis;

var nextPlaylistPage = "";
var previousPlaylistPage = "";
var trackString = "";
var visX = [], visY = [], visZ = [];
const varX = "tempo", varY = "energy", varZ = "key";
var reordered = false;
var relativeOrder = []

//Logo
visX = [0,-6,-6,-1,-6,-6,0,5,5,6,5,5,1,5,5,6,5,5,0];
visY = [1,6,4,0,-4,-6,-1,-6,-6.5,-5,-3.5,-4,0,4,3.5,5,6.5,6,1];
visZ = [0,-6,-6,-1,-6,-6,0,5,5,6,5,5,1,5,5,6,5,5,0];

// SOLVER

function reorderPlaylist() {
	//Define solver promise
	var solver = new Promise( function(resolve, reject) {
		/*The problem is to find a order to play the songs such
		that the difference beween each songs is minimised.

		This can be reframed as a high-dimensional traveling salesperson problem,
		with the "positions" of each song being determined by their attributes.

		The key attributes used are:
		- tempo / BPM
		- key

		algrorithm: Nearest Neighbours

		sortTracks by BPM or shuffle
		song = tracks[0]
		reorderedTracks.push(song)

		for i=1 to length tracks:
			NearestSong = None
			for nextSong in tracks:
				if nextSong not yet seen:
					calculate distance(song, nextSong)
					if distance < currentMin:
						NearestSong = nextSong
			reorderedTracks.push(NearestSong)
			song = NearestSong
		return reorderedTracks
		
		*/
		let uriList = []; 
		let relativeOrderTMP = [];
		let n = tracks.length-1;
		for (let i = 0; i < tracks.length; i++) {
			tracks[i]["used"] = false;
		}
		
		let startIndex = getRandomInt(0, n);
		song = tracks[startIndex];
		uriList.push(song["uri"]);
		song["used"] = true; 

		var distance;
		var minDistance = 9999999999;

		var nearestSong;
		var nearestSongIndex = startIndex;

		relativeOrderTMP.push(startIndex); //used to map new order to tracks array without sorting
		
		// console.log(tracks);

		for (let i = 1; i < tracks.length; i++) {
			for (let j = 0; j < tracks.length; j++) {
				if (tracks[j]["used"] == false){
					distance = Math.abs(song["analysis"]["danceability"] - tracks[j]["analysis"]["danceability"]);
					distance = distance + Math.abs(song["analysis"]["energy"] - tracks[j]["analysis"]["energy"]);
					distance = distance + Math.abs(song["analysis"]["loudness"] - tracks[j]["analysis"]["loudness"]) / 10; //scale to ~[0-1]
					distance = distance + Math.abs(song["analysis"]["tempo"] - tracks[j]["analysis"]["tempo"]) / 100; //scale to ~[0-1]
					distance = distance + Math.abs(song["analysis"]["key"] - tracks[j]["analysis"]["key"]) / 5; //scale to ~[0-1]
					if (distance < minDistance){
						minDistance = distance;
						nearestSong = tracks[j];
						nearestSongIndex = j;
					}
				}
			}
			uriList.push(nearestSong["uri"]);
			song = nearestSong;	
			tracks[nearestSongIndex]["used"] = true;
			relativeOrderTMP.push(nearestSongIndex);
			minDistance = 9999999999;
		} 
		relativeOrder = relativeOrderTMP;
		// Return success
		resolve(uriList)
	});

	solver.then(function (uriList) {
		reordered = true; //allow visualisation
		// console.log(uriList);
		// for (let pageIndex = 0; pageIndex < trackIDs.length; pageIndex += MAX_AUDIO_ANALYSIS_LENGTH){
		// 	// fetchTrackAnalysis(trackIDs, startIndex = pageIndex); //Call for analysis
		// 	replaceTracks(uriList.slice(pageIndex, pageIndex+MAX_AUDIO_ANALYSIS_LENGTH), createdPlaylistID)
		// }
		replaceTracks(uriList, createdPlaylistID) //Pass to reorder
	}, function (error) {
		console.log(error);
	});

}

// API REQUESTS

function getCurrentQueryParameters(delimiter = '#') {
	// the access_token is passed back in a URL fragment, not a query string
	// errors, on the other hand are passed back in a query string
	const currentLocation = String(window.location).split(delimiter)[1];
	const params = new URLSearchParams(currentLocation);
	return params;
}

function createNewPlaylist() {	
	//Skip create if this platlist already exists by name for a better UX
	if (createdPlaylistName == playlistName + ".optimal") {
		// Playlist exists, skip create step
		reorderPlaylist(); //pass to reorder algorithm
	} else {
		//Create new playlist
		const currentQueryParameters = getCurrentQueryParameters('#');
		ACCESS_TOKEN = currentQueryParameters.get('access_token');

		NEW_PLAYLIST_ENDPOINT_ID = NEW_PLAYLIST_ENDPOINT(userID);
		createdPlaylistName = playlistName + ".optimal"
		
		let newPlaylistDescription = playlistDescription + " ~ Optimised by Smart Shuffle."
		// console.log(API_ENDPOINT + NEW_PLAYLIST_ENDPOINT_ID);
		const fetchOptions = {
			method: 'POST',
			headers: new Headers({
				'Authorization': `Bearer ${ACCESS_TOKEN}`,
				'Content-Type': "application/json",
				'Accept': "application/json"
			}),
			body: JSON.stringify({
				"name": createdPlaylistName,
				"description": newPlaylistDescription,
				"public": true
			})
		};

		fetch(API_ENDPOINT + NEW_PLAYLIST_ENDPOINT_ID, fetchOptions).then(function (response) {
			return response.json();
		}).then(function (json) {
			createdPlaylistID = json["id"];
			// console.log(json);
			reorderPlaylist(); //pass to reorder algorithm
		}).catch(function (error) {
			console.log(error);
		});
	}
}

function replaceTracks(reorderedURIs, createdPlaylistID) {	
	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(createdPlaylistID);

	const fetchOptions = {
		method: 'POST',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`,
			'Content-Type': "application/json",
			'Accept': "application/json"
		}),
		body: JSON.stringify({"uris": reorderedURIs.slice(0,MAX_AUDIO_ANALYSIS_LENGTH)})
	};

	fetch(API_ENDPOINT + TRACKS_ENDPOINT_ID, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		// console.log(json);
		if (reorderedURIs.length > MAX_AUDIO_ANALYSIS_LENGTH){ //Recusive addition of max number of songs
			replaceTracks(reorderedURIs.slice(MAX_AUDIO_ANALYSIS_LENGTH, reorderedURIs.length), createdPlaylistID) 
		}
	}).catch(function (error) {
		console.log(error);
	});
}

// function replaceTracks(reorderedURIs, createdPlaylistID) {	
// 	const currentQueryParameters = getCurrentQueryParameters('#');
// 	ACCESS_TOKEN = currentQueryParameters.get('access_token');

// 	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(createdPlaylistID);

// 	const fetchOptions = {
// 		method: 'PUT',
// 		headers: new Headers({
// 			'Authorization': `Bearer ${ACCESS_TOKEN}`,
// 			'Content-Type': "application/json",
// 			'Accept': "application/json"
// 		}),
// 		body: JSON.stringify({"uris": reorderedURIs})
// 	};

// 	fetch(API_ENDPOINT + TRACKS_ENDPOINT_ID, fetchOptions).then(function (response) {
// 		return response.json();
// 	}).then(function (json) {
// 		console.log(json);
// 	}).catch(function (error) {
// 		console.log(error);
// 	});
// }

function fetchTrackAnalysis(trackIDs, startIndex = 0) {

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	ANALYSIS_ENDPOINT_ID = AUDIOANALYSIS_ENDPOINT(trackIDs.slice(startIndex, startIndex+MAX_AUDIO_ANALYSIS_LENGTH));

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(API_ENDPOINT + ANALYSIS_ENDPOINT_ID, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		//Add analysis to track data, visualisation vectors
		// console.log(json);
		for (let i = 0; i < json["audio_features"].length; i++) {
			tracks[i+startIndex]["analysis"] = json["audio_features"][i]; //Map any pages, 
			visX[i+startIndex] = json["audio_features"][i][varX]; // TODO account for async return order!
			visY[i+startIndex] = json["audio_features"][i][varY];
			visZ[i+startIndex] = json["audio_features"][i][varZ];
		} 
	}).catch(function (error) {
		console.log(error);
	});
}

function fetchPlaylistTracks(button_id, nextURL = "") {
	visX = [], visY = [], visZ = []; //reset
	reordered = false;

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	console.log(playlists[button_id]);
	playlist_id = playlists[button_id]["id"];
	playlistName = playlists[button_id]["name"];
	playlistDescription = playlists[button_id]["description"];

	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(playlist_id);
	let ENDPOINT
	if (nextURL != "") {
		ENDPOINT = nextURL;
	} else { //NEW PLAYLIST, reset vars
		ENDPOINT = API_ENDPOINT + TRACKS_ENDPOINT_ID;
		trackString = "";
		tracks = [];
		trackIDs = [];
	}

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(ENDPOINT, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		items = json["items"];
		
		//Parse JSON
		for (let i = 0; i < items.length; i++) {
			tracks.push(items[i]["track"])
			trackIDs.push(items[i]["track"]["id"])
			if (trackString.length <= 2048) {
				trackString = trackString.concat(items[i]["track"]["name"] + "//")
			}

			visX.push(0.0); // account for async return order by prepopulating
			visY.push(0.0);
			visZ.push(0.0);
		}
		
		//Update song display
		document.getElementById("trackString").innerHTML = trackString;	
		document.getElementById("warning").innerHTML = "⚠️ This will create a new playlist named " + playlists[button_id]["name"] + ".optimal"
		// for (let pageIndex = 0; pageIndex < trackIDs.length; pageIndex += MAX_AUDIO_ANALYSIS_LENGTH){
		// 	console.log(trackIDs.slice(pageIndex,pageIndex+MAX_AUDIO_ANALYSIS_LENGTH));
		// 	fetchTrackAnalysis(trackIDs, startIndex = pageIndex); //Call for analysis
		// }
		// fetchTrackAnalysis(trackIDs);
		if (json["next"] != null) { //Load into next page recusivly 
			fetchPlaylistTracks(button_id, nextURL = json["next"]);
		} else {
			// No more pages to load!
			//LOAD SONG DATA
			// console.log(trackIDs);
			for (let pageIndex = 0; pageIndex < trackIDs.length; pageIndex += MAX_AUDIO_ANALYSIS_LENGTH){
				fetchTrackAnalysis(trackIDs, startIndex = pageIndex); //Call for analysis
			}
		}
	}).catch(function (error) {
		console.log(error);
	});
}

function fetchPlaylists(nextPlaylistPageURL = "") {
	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	if (nextPlaylistPageURL == "") {
		REQUESTURL = API_ENDPOINT + PLAYLIST_ENDPOINT;
	} else {
		REQUESTURL = nextPlaylistPageURL;
	}
	

	fetch(REQUESTURL, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		nextPlaylistPage = json["next"];
		previousPlaylistPage = json["previous"];
		playlists = json["items"];
		fetchProfileInformation(); // Get user ID
		renderPlaylists(playlists);
		// console.log(json);
	}).catch(function (error) {
		console.log(error);
	}); 
}

function updateProfileInformation(json) {
	const infoString = `username: ${json.id} has ${json.followers.total} follower(s) on Spotify`;
	const profileInfoElement = document.querySelector('#profile_info');
	profileInfoElement.textContent = infoString;
}

function fetchProfileInformation() {
	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(API_ENDPOINT + USER_ENDPOINT, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		// console.log(json);
		userID = json["id"];
		userName = json["name"];
		// updateProfileInformation(json);
	}).catch(function (error) {
		console.log(error);
	});
}

//GRAPHICS

var boxSz;
var x,y,z;
var label;
var fontSize;
backgroundCol = [0,0,0];
cubeLineCol = [255,255,255];
songPointsCol = [0,255,0];

let inconsolata;
function preload() {
  inconsolata = loadFont('fonts/RobotoMono-Light.ttf');
}

function setup() {
	var elmnt = document.getElementById("graphic");
	var width = elmnt.offsetWidth-10;
	var height = window.innerHeight-10;
	var myCanvas = createCanvas(width, height, WEBGL);
    myCanvas.parent("graphic");
	frameRate(24);
	boxSz = Math.round(Math.min(height, width) / 4); //scale by bit to ensure that the cube fits even on diagonal

	textFont(inconsolata);
	fontSize = Math.round(boxSz/10);
  	textSize(fontSize);
}

function draw() {
	background(backgroundCol);
	rotateY(frameCount * 0.01)
	n = visX.length-1;

	stroke(cubeLineCol);

	//front
	line(-boxSz, -boxSz, boxSz, boxSz, -boxSz, boxSz);
	line(-boxSz, boxSz, boxSz, boxSz, boxSz, boxSz);
	line(-boxSz, -boxSz, boxSz, -boxSz, boxSz, boxSz);
	line(boxSz, -boxSz, boxSz, boxSz, boxSz, boxSz);
  
	//back
	line(-boxSz, -boxSz, -boxSz, boxSz, -boxSz, -boxSz);
	line(-boxSz, boxSz, -boxSz, boxSz, boxSz, -boxSz);
	line(-boxSz, -boxSz, -boxSz, -boxSz, boxSz, -boxSz);
	line(boxSz, -boxSz, -boxSz, boxSz, boxSz, -boxSz);
  
	//left top
	line(-boxSz, -boxSz, boxSz, -boxSz, -boxSz, -boxSz);
	//left bottom
	line(-boxSz, boxSz, -boxSz, -boxSz, boxSz, boxSz);
	//right top
	line(boxSz, -boxSz, boxSz, boxSz, -boxSz, -boxSz);
	// // right bottom
	line(boxSz, boxSz, -boxSz, boxSz, boxSz, boxSz);

	//labels
	fill([255,255,255]);
	label = varX + "/ " + varY + "/ " + varZ + "/ ";
	text(label, -boxSz, -boxSz-fontSize);
	fill([0,255,0]);
	text("start/", -boxSz, -boxSz);
	fill([0,0,255]);
	text("end/", -boxSz+fontSize*4, -boxSz);
	// Points

	maxX = Math.max(...visX);
	minX = Math.min(...visX);
	maxY = Math.max(...visY);
	minY = Math.min(...visY);
	maxZ = Math.max(...visZ);
	minZ = Math.min(...visZ);

	stroke(songPointsCol);

	let inc = 255.0 / n;
	let x1, y1, z1;

	if (reordered) {
		for (var i = 0; i <= n; i++) {
			stroke([0, Math.round(255.0 - i*inc),Math.round(i*inc)]);
			tracksIndex = relativeOrder[i]
			push();
			x = map(visX[tracksIndex], minX, maxX, -boxSz, boxSz);
			y = map(visY[tracksIndex], minY, maxY, -boxSz, boxSz);
			z = map(visZ[tracksIndex], minZ, maxZ, -boxSz, boxSz);
			translate(x,y,z);
			sphere(boxSz / 50, 8);
			pop();
			//Lines
			if (i > 0) {
				line(x, y, z, x1, y1, z1);
			}
			x1 = x;
			y1 = y;
			z1 = z;
				
		}
	} else {
		for (var i = 0; i <= n; i++) {
			stroke([0, Math.round(255.0 - i*inc),Math.round(i*inc)]);
			push();
			x = map(visX[i], minX, maxX, -boxSz, boxSz);
			y = map(visY[i], minY, maxY, -boxSz, boxSz);
			z = map(visZ[i], minZ, maxZ, -boxSz, boxSz);
			translate(x,y,z);
			sphere(boxSz / 50, 8);
			pop();	
			//Lines
			if (i > 0) {
				line(x, y, z, x1, y1, z1);
			}
			x1 = x;
			y1 = y;
			z1 = z;
		}
	}
}

//UTILS

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function renderPlaylists(playlists) {
	// console.log(playlists);
	 //Set playlists
	 document.getElementById("playlist0").innerHTML = playlists[0]["name"];
	 document.getElementById("playlist1").innerHTML = playlists[1]["name"];
	 document.getElementById("playlist2").innerHTML = playlists[2]["name"];
	 document.getElementById("playlist3").innerHTML = playlists[3]["name"];
	 document.getElementById("playlist4").innerHTML = playlists[4]["name"];
}

// function getFormData(formId) {
// 	const form = document.getElementById(formId);
// 	const formData = new FormData(form);
// 	return formData;
// };

// const AUTH_BASE_URL = 'https://accounts.spotify.com/authorize';
// const API_ENDPOINT = 'https://api.spotify.com/v1/me';
// let ACCESS_TOKEN;

// function formDataToParams(formData) {
// 	const params = new URLSearchParams('');
// 	for (let [key, value] of formData.entries()) {
// 		params.set(key, value)
// 	}
// 	return params;
// }

// function getCurrentQueryParameters(delimiter = '#') {
// 	// the access_token is passed back in a URL fragment, not a query string
// 	// errors, on the other hand are passed back in a query string
// 	const currentLocation = String(window.location).split(delimiter)[1];
// 	const params = new URLSearchParams(currentLocation);
// 	return params;
// }

// function buildAuthLink() {
// 	const params = formDataToParams(getFormData('main_form'));
// 	const authURI = AUTH_BASE_URL + '?' + params;
// 	const authLinkAnchor = document.querySelector('a#auth_link');
// 	authLinkAnchor.setAttribute('href', authURI);
// 	authLinkAnchor.textContent = authURI;
// }

// function updateProfileInformation(json) {
// 	const infoString = `username: ${json.id} has ${json.followers.total} follower(s) on Spotify`;
// 	const profileInfoElement = document.querySelector('#profile_info');
// 	profileInfoElement.textContent = infoString;
// }

// function fetchProfileInformation() {
// 	const currentQueryParameters = getCurrentQueryParameters('#');
// 	ACCESS_TOKEN = currentQueryParameters.get('access_token');

// 	const fetchOptions = {
// 		method: 'GET',
// 		headers: new Headers({
// 			'Authorization': `Bearer ${ACCESS_TOKEN}`
// 		})
// 	};

// 	fetch(API_ENDPOINT, fetchOptions).then(function (response) {
// 		return response.json();
// 	}).then(function (json) {
// 		console.log(json);
// 		updateProfileInformation(json);
// 	}).catch(function (error) {
// 		console.log(error);
// 	});
// }

// const buildButton = document.querySelector('button#build_link');
// buildButton.addEventListener('click', buildAuthLink);

// const fetchButton = document.querySelector('button#fetch_profile_info');
// fetchButton.addEventListener('click', fetchProfileInformation);