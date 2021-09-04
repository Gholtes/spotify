# Smart Shuffle
### Grant Holtes 2021
Reorder playlists to minimise the differneces between songs based on Spotify audio analysis data. This is entriely done on the frontend, with no backend required or used.

This involves 3 key steps:
* Access the users playlists, tracks and track analysis
* Find a optimal order for the tracks
* Reorder the user's playlist in the optimal order

Its also neat to visualise this analysis data that is usualy hidden from the user, so there is also a 3D graphic that is rendered on the fly as more data is gathered.

## Background
Spotify is a fantastic service which has drastically changed how we find, listen and share music. Their tech forward approach has also allowed new features to be  released that further elevate their user’s ability to interact with their music, such as the ‘discover weekly’ playlist or the recently released ‘blend’ [https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/]  tool that merges two people’s music tastes into a single playlist. 

At the heart of the spotify user experience is the playlist, which allows the user a way to catalogue and organise songs in a manner reminiscent of the cassette mixtapes of the 1980s. Without playlists the listening experience on spotify would be a transient one, with users needing to search through the endless library of tracks to find “their” music. As such playlists provide the user with some level of ownership and control over what is “their” music in a system with no ownership and a universe of music and genres. 

Given the importance of playlists and the mechanism by which new songs are added to a playlist (just slap them on the end), it is unsurprising that personal playlists can quickly become incoherent, a consequence of evolving tastes and the level of effort required to reorder and reorganize songs. 

To avoid this fate for my own playlists, I have started to build solutions to this issue through using Spotify’s developer tools to create my own methods to interact with the Spotify music universe. 


## Spotify access
Spotify offers a free Web API that allows you to programmatically access various aspects of Spotify and modify parts of a user’s account - given their permission at least!

I want to be able to access a user’s playlists and tracks within, as well as be able to modify these playlists or create new ones. This requires 4 key abilities:
* Ability to list all of a users playlists
* Ability to list the tracks within a playlist
* Ability to get data about a track
* Ability to create or modify a user’s playlist

Fortunately the web API offers all of these functions (and many more), as well as the ability to bundle many requests into a single HTTPS call, which reduces the number of requests required when loading track data on all tracks within a playlist.

For reference, the required playlist level interactions are contained within the [Playlist API](https://developer.spotify.com/documentation/web-api/reference/#category-playlists) while the track level interactions are contained within the [Tracks API.](https://developer.spotify.com/documentation/web-api/reference/#category-tracks)

The basic flow can be summarized as below:
![API flow](Images/apiFlowUML.png "API flow with the Spotify Web API")


## Order optimisation
