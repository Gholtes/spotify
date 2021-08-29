//https://developer.spotify.com/documentation/general/guides/authorization-guide/#implicit-grant-flow
//

//App Specific
const client_id = "f76433fcadb3482cbe90b168aca171b6";
const login_redirect_route = "http://localhost:8000/";
const scope = ""

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

//https://api.spotify.com/v1/audio-features?ids=0washXlWqFEj5oCjNWwA2E%2C07UeBq7UkdDgUq5c4U2gZc%2C62WqX503wDjjBiTJnqq5Yn%2C63UD9AoNO8l04m0aAHoiaX"
//https://api.spotify.com/v1/audio-features?ids=0washXlWqFEj5oCjNWwA2E%07UeBq7UkdDgUq5c4U2gZc%62WqX503wDjjBiTJnqq5Yn%63UD9AoNO8l04m0aAHoiaX

function TRACKS_ENDPOINT(playlist_id) {
	return "playlists/"+playlist_id+"/tracks";
}



//Derived Constants 
const authURI = AUTH_BASE_URL + '?client_id='+client_id+"&response_type=token&redirect_uri="+login_redirect_route+"&scope="+scope;

//Variables
let ACCESS_TOKEN;
var playlists; // = JSON.parse('[{"name":"[None]"}, {"name":"[None]"}, {"name":"[None]"}]') //To be populated 
var tracks;
var trackIDs;
var trackAnalysis;
var nextPlaylistPage;
var trackString = "";


function getCurrentQueryParameters(delimiter = '#') {
	// the access_token is passed back in a URL fragment, not a query string
	// errors, on the other hand are passed back in a query string
	const currentLocation = String(window.location).split(delimiter)[1];
	const params = new URLSearchParams(currentLocation);
	return params;
}

function fetchTrackAnalysis(trackIDs) {

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	ANALYSIS_ENDPOINT_ID = AUDIOANALYSIS_ENDPOINT(trackIDs);
	console.log(API_ENDPOINT+ANALYSIS_ENDPOINT_ID)

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
		console.log(tracks);
	}).catch(function (error) {
		console.log(error);
	});
}

function fetchPlaylistTracks(button_id) {

	const currentQueryParameters = getCurrentQueryParameters('#');
	ACCESS_TOKEN = currentQueryParameters.get('access_token');

	playlist_id = playlists[button_id]["id"];
	TRACKS_ENDPOINT_ID = TRACKS_ENDPOINT(playlist_id);
	console.log(API_ENDPOINT+TRACKS_ENDPOINT_ID)

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
	//Call for analysis
	fetchTrackAnalysis(trackIDs);

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