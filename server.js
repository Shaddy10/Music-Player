const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Replace this with your actual playlist URL after Step 2.
// For now it points to a placeholder that will return an empty list.
const PLAYLIST_URL = process.env.PLAYLIST_URL || 'https://b7a239f9fe53.blob.upstash.io/playlist.json';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/songs', async (req, res) => {
  if (!PLAYLIST_URL) {
    return res.json([]); // Empty list until Step 2 is done
  }
  try {
    const response = await fetch(PLAYLIST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const songs = await response.json();
    res.json(songs);
  } catch (err) {
    console.error('Playlist fetch error:', err.message);
    res.status(500).json({ error: 'Could not load playlist' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Music app running on port ${PORT}`);
});
