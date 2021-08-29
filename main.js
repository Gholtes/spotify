//https://developer.spotify.com/documentation/general/guides/authorization-guide/#implicit-grant-flow
//

//App Specific
const client_id = "f76433fcadb3482cbe90b168aca171b6";
const login_redirect_route = "http://localhost:8000/";
const scope = ""

//Constants 
const AUTH_BASE_URL = 'https://accounts.spotify.com/authorize';
const API_ENDPOINT = 'https://api.spotify.com/v1/me';
let ACCESS_TOKEN;

//Derived Constants 
const authURI = AUTH_BASE_URL + '?client_id='+client_id+"&response_type=token&redirect_uri="+login_redirect_route+"&scope="+scope;
var nextPlaylistPage = "";

function getCurrentQueryParameters(delimiter = '#') {
	// the access_token is passed back in a URL fragment, not a query string
	// errors, on the other hand are passed back in a query string
	const currentLocation = String(window.location).split(delimiter)[1];
	const params = new URLSearchParams(currentLocation);
	return params;
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

	fetch(API_ENDPOINT + "/playlists?limit=10", fetchOptions).then(function (response) {
		return response.json();
	}).then(function (json) {
		console.log(json);
		nextPlaylistPage = json["next"];
		console.log(nextPlaylistPage);
		// updateProfileInformation(json);
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