const songListEl = document.getElementById('song-list');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const audio = document.getElementById('audio');
const npTitle = document.getElementById('np-title');
const npArtist = document.getElementById('np-artist');
const downloadAllBtn = document.getElementById('download-all');

let currentSongs = [];
let currentPlayingTitle = null;

// ---------- IndexedDB ----------
const DB_NAME = 'music-cache';
const STORE = 'songs';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlob(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function hasBlob(key) {
  return (await getBlob(key)) !== null;
}

// ---------- UI ----------
function setStatus() {
  const online = navigator.onLine;
  statusEl.textContent = online ? 'Online' : 'Offline';
  statusEl.className = 'status ' + (online ? 'online' : 'offline');
}

async function renderSongList(songs) {
  currentSongs = songs;
  songListEl.innerHTML = '';

  if (!songs || songs.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  for (const song of songs) {
    const li = document.createElement('li');
    li.className = 'song-item';
    li.dataset.title = song.title;

    const title = document.createElement('span');
    title.className = 'song-title';
    title.textContent = `${song.title} — ${song.artist}`;

    const playBtn = document.createElement('button');
    playBtn.className = 'btn play-btn';
    playBtn.textContent = '▶';
    playBtn.onclick = () => playSong(song);

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn dl-btn';
    dlBtn.textContent = '⬇';
    dlBtn.onclick = () => downloadSong(song, dlBtn);

    if (await hasBlob(song.title)) {
      dlBtn.classList.add('downloaded');
      dlBtn.textContent = '✓';
      dlBtn.disabled = true;
    }

    li.append(title, playBtn, dlBtn);
    songListEl.appendChild(li);
  }
}

async function loadSongs() {
  try {
    const res = await fetch('/api/songs');
    const songs = await res.json();
    localStorage.setItem('cachedPlaylist', JSON.stringify(songs));
    renderSongList(songs);
  } catch (e) {
    const cached = localStorage.getItem('cachedPlaylist');
    renderSongList(cached ? JSON.parse(cached) : []);
  }
}

// ---------- Playback ----------
async function playSong(song) {
  const cached = await getBlob(song.title);
  if (cached) {
    audio.src = URL.createObjectURL(cached);
  } else {
    audio.src = song.url;
  }
  currentPlayingTitle = song.title;
  npTitle.textContent = song.title;
  npArtist.textContent = song.artist;
  document.querySelectorAll('.song-item').forEach(el =>
    el.classList.toggle('playing', el.dataset.title === song.title)
  );
  audio.play();
}

// ---------- Download ----------
async function downloadSong(song, btn) {
  try {
    btn.textContent = '…';
    btn.disabled = true;
    const res = await fetch(song.url);
    const blob = await res.blob();
    await saveBlob(song.title, blob);
    btn.textContent = '✓';
    btn.classList.add('downloaded');
  } catch (e) {
    btn.textContent = '⬇';
    btn.disabled = false;
    alert('Download failed: ' + e.message);
  }
}

downloadAllBtn.onclick = async () => {
  const btns = document.querySelectorAll('.dl-btn:not(.downloaded)');
  for (const btn of btns) {
    const title = btn.closest('.song-item').dataset.title;
    const song = currentSongs.find(s => s.title === title);
    if (song) await downloadSong(song, btn);
  }
};

// ---------- Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ---------- Events ----------
window.addEventListener('online', setStatus);
window.addEventListener('offline', setStatus);

setStatus();
loadSongs();