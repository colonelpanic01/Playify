require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

// Force correct redirect URI (temporary fix)
process.env.SPOTIFY_REDIRECT_URI = "http://localhost:5001/callback";

// Debug: Check if environment variables are loaded
console.log('Environment check:');
console.log('CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'Loaded' : 'Missing');
console.log('CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'Loaded' : 'Missing');
console.log('REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);

app.use(cors());
app.use(express.json());

// Spotify Auth endpoints
app.get('/api/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-top-read',
    'user-read-recently-played'
  ];
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  
  console.log('Login request - redirect_uri:', redirect_uri);
  console.log('Login request - client_id:', client_id);
  
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scopes.join(' '))}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  
  console.log('Generated auth URL:', authUrl);
  res.redirect(authUrl);
});

// Callback endpoint
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const error = req.query.error || null;
  
  if (error) {
    console.error('Spotify auth error:', error);
    return res.redirect(`http://localhost:5173/?error=${error}`);
  }
  
  if (!code) {
    console.error('No authorization code received');
    return res.redirect(`http://localhost:5173/?error=no_code`);
  }
  
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

  console.log('Callback received - code:', code ? 'present' : 'missing');
  console.log('Using redirect_uri:', redirect_uri);

  try {
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id,
        client_secret
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const { access_token, refresh_token } = tokenRes.data;
    console.log('Token exchange successful');
    // Redirect to frontend with tokens (for demo, send as query)
    res.redirect(`http://localhost:5173/?access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (err) {
    console.error('Authentication error:', err.response?.data || err.message);
    res.redirect(`http://localhost:5173/?error=auth_failed`);
  }
});

// Get user's liked songs with pagination
app.get('/api/liked-songs', async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    let allSongs = [];
    let url = 'https://api.spotify.com/v1/me/tracks?limit=50';
    
    while (url) {
      const response = await axios.get(url, {
        headers: { Authorization: authorization }
      });
      
      const songs = response.data.items.map(item => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists[0].name,
        album: item.track.album.name,
        added_at: item.added_at,
        genres: item.track.artists[0].genres || [],
        preview_url: item.track.preview_url,
        external_urls: item.track.external_urls
      }));
      
      allSongs = [...allSongs, ...songs];
      url = response.data.next;
    }
    
    res.json({ songs: allSongs, total: allSongs.length });
  } catch (error) {
    console.error('Error fetching liked songs:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch liked songs' });
  }
});

// Get audio features for songs (for better filtering)
app.post('/api/audio-features', async (req, res) => {
  const { authorization } = req.headers;
  const { trackIds } = req.body;
  
  if (!authorization || !trackIds) {
    return res.status(400).json({ error: 'Missing authorization or trackIds' });
  }

  try {
    // Spotify API allows max 100 track IDs per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }
    
    let allFeatures = [];
    for (const chunk of chunks) {
      const response = await axios.get(`https://api.spotify.com/v1/audio-features`, {
        params: { ids: chunk.join(',') },
        headers: { Authorization: authorization }
      });
      allFeatures = [...allFeatures, ...response.data.audio_features];
    }
    
    res.json({ features: allFeatures });
  } catch (error) {
    console.error('Error fetching audio features:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch audio features' });
  }
});

// Create playlist
app.post('/api/create-playlist', async (req, res) => {
  const { authorization } = req.headers;
  const { name, description, trackIds, isPublic = false } = req.body;
  
  if (!authorization || !name || !trackIds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user ID
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: authorization }
    });
    const userId = userResponse.data.id;
    
    // Create playlist
    const playlistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name,
        description,
        public: isPublic
      },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const playlistId = playlistResponse.data.id;
    
    // Add tracks to playlist (max 100 tracks per request)
    const trackUris = trackIds.map(id => `spotify:track:${id}`);
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }
    
    for (const chunk of chunks) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: chunk },
        {
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    res.json({
      success: true,
      playlist: playlistResponse.data,
      message: `Playlist "${name}" created successfully with ${trackIds.length} songs!`
    });
    
  } catch (error) {
    console.error('Error creating playlist:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
