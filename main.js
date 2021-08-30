//https://developer.spotify.com/documentation/general/guides/authorization-guide/#implicit-grant-flow
//

//App Specific
const client_id = "f76433fcadb3482cbe90b168aca171b6";
const login_redirect_route = "http://localhost:8000/";
const scope = "playlist-modify-public"

//Constants 
const AUTH_BASE_URL = 'https://accounts.spotify.com/authorize';
const API_ENDPOINT = 'https://api.spotify.com/v1/';
const PLAYLIST_ENDPOINT = "me/playlists?limit=3"
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



//Derived Constants 
const authURI = AUTH_BASE_URL + '?client_id='+client_id+"&response_type=token&redirect_uri="+login_redirect_route+"&scope="+scope;

//Variables
let ACCESS_TOKEN;
var playlists; // = JSON.parse('[{"name":"[None]"}, {"name":"[None]"}, {"name":"[None]"}]') //To be populated 
var playlist_id;
var tracks;
var trackIDs;
var reorderedURIs;
var trackAnalysis;
var nextPlaylistPage;
var trackString = "";
var visX, visY, visZ;

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
		let n = tracks.length-1;
		
		//create used attribute
		for (let i = 0; i < tracks.length; i++) {
			tracks[i]["used"] = false;
		}

		song = tracks[0];
		uriList.push(song["uri"]);
		song["used"] = true; 
		var distance;
		var minDistance = 9999999999;
		var nearestSong;
		var nearestSongIndex = 0;
		var j;

		console.log(tracks);

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
			minDistance = 9999999999;
		} 

		// Return success
		resolve(uriList)
	});

	solver.then(function (uriList) {
		console.log(uriList);
		replaceTracks(uriList, playlist_id) //Pass to reorder
	}, function (error) {
		console.log(error);
	});

}


function getCurrentQueryParameters(delimiter = '#') {
	// the access_token is passed back in a URL fragment, not a query string
	// errors, on the other hand are passed back in a query string
	const currentLocation = String(window.location).split(delimiter)[1];
	const params = new URLSearchParams(currentLocation);
	return params;
}

function replaceTracks(reorderedURIs, playlist_id) {	
	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(playlist_id);

	const fetchOptions = {
		method: 'PUT',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`,
			'Content-Type': "application/json",
			'Accept': "application/json"
		}),
		body: JSON.stringify({"uris": reorderedURIs})
	};

	fetch(API_ENDPOINT + TRACKS_ENDPOINT_ID, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		console.log(json);
	}).catch(function (error) {
		console.log(error);
	});
}

function fetchTrackAnalysis(trackIDs) {

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	ANALYSIS_ENDPOINT_ID = AUDIOANALYSIS_ENDPOINT(trackIDs);

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(API_ENDPOINT + ANALYSIS_ENDPOINT_ID, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		//Add analysis to track data
		for (let i = 0; i < tracks.length; i++) {
			tracks[i]["analysis"] = json["audio_features"][i];
		} 
	}).catch(function (error) {
		console.log(error);
	});
}

function fetchPlaylistTracks(button_id) {

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	playlist_id = playlists[button_id]["id"];
	console.log(playlist_id);
	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(playlist_id);

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(API_ENDPOINT + TRACKS_ENDPOINT_ID, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		items = json["items"];
		tracks = [];
		var trackIDs = [];
		trackString = "";
		//Parse JSON
		for (let i = 0; i < items.length; i++) {
			tracks.push(items[i]["track"])
			trackIDs.push(items[i]["track"]["id"])
			trackString = trackString.concat(items[i]["track"]["name"] + "//")
			//TODO pagination of analysis call here!
		}
	
	//Update stong display
	document.getElementById("trackString").innerHTML = trackString;	
	fetchTrackAnalysis(trackIDs); //Call for analysis

	}).catch(function (error) {
		console.log(error);
	});
}

function fetchPlaylists() {
	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	const fetchOptions = {
		method: 'GET',
		headers: new Headers({
			'Authorization': `Bearer ${ACCESS_TOKEN}`
		})
	};

	fetch(API_ENDPOINT + PLAYLIST_ENDPOINT, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		nextPlaylistPage = json["next"];
		playlists = json["items"];
		renderPlaylists(playlists);
	}).catch(function (error) {
		console.log(error);
	}); 
}

function renderPlaylists(playlists) {
	console.log(playlists);
	 //Set playlists
	 document.getElementById("playlist0").innerHTML = playlists[0]["name"];
	 document.getElementById("playlist1").innerHTML = playlists[1]["name"];
	 document.getElementById("playlist2").innerHTML = playlists[2]["name"];
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

	fetch(API_ENDPOINT, fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		console.log(json);
		updateProfileInformation(json);
	}).catch(function (error) {
		console.log(error);
	});
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