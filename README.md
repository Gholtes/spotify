# Smart Shuffle
### Grant Holtes 2021
Reorder playlists to minimise the differneces between songs based on Spotify audio analysis data. This is entriely done on the frontend, with no backend required or used.

This involves 3 key steps:
* Access the users playlists, tracks and track analysis
* Find a optimal order for the tracks
* Reorder the user's playlist in the optimal order

Its also neat to visualise this analysis data that is usualy hidden from the user, so there is also a 3D graphic that is rendered on the fly as more data is gathered.

## Spotify access
This relies on 4 seperate Spotify APIs:
* 

These APIs require user authentifcation. To keep this as a frontend only system, spotify's implicit grant authentication flow is used.

## Order optimisation
