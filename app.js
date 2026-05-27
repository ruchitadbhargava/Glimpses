const CONFIG = {      
  SPOTIFY_CLIENT_ID: "b0a160fad3854d3a8d23b05c5054686f", 
  SPOTIFY_CLIENT_SECRET: "285bb7d8a0f140ac9026e807262e8292", 
};

async function getSpotifyToken() {
  const stored = sessionStorage.getItem("spotify_token");
  const expiry = sessionStorage.getItem("spotify_token_expiry");
  if (stored && expiry && Date.now() < parseInt(expiry)) {
    return stored;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${CONFIG.SPOTIFY_CLIENT_ID}:${CONFIG.SPOTIFY_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get Spotify token. Check your Client ID and Secret.");
  const data = await res.json();
  sessionStorage.setItem("spotify_token", data.access_token);
  sessionStorage.setItem("spotify_token_expiry", Date.now() + data.expires_in * 1000);
  return data.access_token;
}

async function analyseMoodWithGemini(userMood) {
  const res = await fetch("/api/mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMood }),
  });

  if (!res.ok) throw new Error("Mood analysis failed. Try again.");
  return await res.json();
}

async function searchSpotifyPlaylist(query, token) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Spotify search failed.");
  const data = await res.json();
  const playlists = data.playlists?.items;
  if (!playlists || playlists.length === 0) return null;

  // Return the first non-null result
  return playlists.find(p => p !== null) || null;
}

function renderPlaylists(playlists, moodData) {
  const grid = document.getElementById("playlistGrid");
  grid.innerHTML = "";

  playlists.forEach((playlist, i) => {
    if (!playlist) return;

    const card = document.createElement("div");
    card.className = "playlist-card";
    card.style.animationDelay = `${i * 0.12}s`;

    card.innerHTML = `
      <div class="playlist-card-label">🎵 Playlist ${i + 1}</div>
      <iframe
        src="https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0"
        height="380"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    `;
    grid.appendChild(card);
  });
}

async function findPlaylist() {
  const input = document.getElementById("moodInput").value.trim();
  if (!input) {
    alert("Please describe your mood first!");
    return;
  }

  // Reset UI
  hideSection("resultSection");
  hideSection("errorSection");
  setLoading(true);

  try {
    
    const moodData = await analyseMoodWithGemini(input);

    const token = await getSpotifyToken();

    const playlistResults = await Promise.all(
      moodData.queries.map(q => searchSpotifyPlaylist(q, token))
    );

    const validPlaylists = playlistResults.filter(Boolean);
    if (validPlaylists.length === 0) {
      throw new Error("No playlists found for this mood. Try rephrasing!");
    }

    document.getElementById("moodLabel").textContent = moodData.moodTitle;
    document.getElementById("moodDescription").textContent = moodData.moodDescription;
    renderPlaylists(validPlaylists, moodData);

    showSection("resultSection");
    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error(err);
    document.getElementById("errorMsg").textContent = `⚠️ ${err.message}`;
    showSection("errorSection");
  } finally {
    setLoading(false);
  }
}

function setMood(text) {
  document.getElementById("moodInput").value = text;
  document.getElementById("moodInput").focus();
}

function resetPage() {
  hideSection("resultSection");
  hideSection("errorSection");
  document.getElementById("moodInput").value = "";
  document.getElementById("moodInput").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setLoading(on) {
  const btn = document.getElementById("findBtn");
  const txt = document.getElementById("btnText");
  const loader = document.getElementById("btnLoader");
  btn.disabled = on;
  txt.classList.toggle("hidden", on);
  loader.classList.toggle("hidden", !on);
}

function showSection(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideSection(id) {
  document.getElementById(id).classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("moodInput").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      findPlaylist();
    }
  });
});