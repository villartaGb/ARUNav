import React, { useState, useEffect } from 'react';
import './App.css';

const buildingsData = [
  { id: 1, name: "Main Administration Block", category: "Administrative", latitude: -6.7924, longitude: 39.2083, description: "Vice Chancellor's office, Registry, Finance" },
  { id: 2, name: "Library", category: "Academic", latitude: -6.7930, longitude: 39.2090, description: "Main university library, printing services" },
  { id: 3, name: "School of Real Estate", category: "Academic", latitude: -6.7918, longitude: 39.2078, description: "Lectures, tutorials, staff offices" },
  { id: 4, name: "Cafeteria", category: "Food", latitude: -6.7935, longitude: 39.2085, description: "Main student cafeteria" },
  { id: 5, name: "Student Centre", category: "Service", latitude: -6.7928, longitude: 39.2075, description: "Student affairs, clubs, events" },
  { id: 6, name: "ICT Centre", category: "Academic", latitude: -6.7922, longitude: 39.2088, description: "Computer labs, tech support" },
  { id: 7, name: "Health Centre", category: "Health", latitude: -6.7940, longitude: 39.2080, description: "Medical services for students and staff" },
  { id: 8, name: "Sports Ground", category: "Service", latitude: -6.7945, longitude: 39.2070, description: "Football field, outdoor sports" },
];

const categoryColors = {
  Academic: '#1a73e8',
  Administrative: '#6a1b9a',
  Food: '#e65100',
  Service: '#2e7d32',
  Health: '#c62828',
};

const translations = {
  en: {
    title: "🎓 ARU Navigator",
    search: "Search for a building...",
    lost: "📍 I'm Lost",
    navigate: "🧭 Navigate Here",
    close: "✕",
    langBtn: "🌐 Swahili",
    all: "All",
    navigating: "Navigating to",
    nearest: "Nearest building",
    away: "away",
    enableGPS: "⚠️ Please enable GPS on your device",
    stops: "stops",
  },
  sw: {
    title: "🎓 ARU Mwongozo",
    search: "Tafuta jengo...",
    lost: "📍 Nimepotea",
    navigate: "🧭 Nipeleke Huko",
    close: "✕",
    langBtn: "🌐 English",
    all: "Zote",
    navigating: "Kuelekea",
    nearest: "Jengo lililo karibu",
    away: "mbali",
    enableGPS: "⚠️ Tafadhali washa GPS kwenye kifaa chako",
    stops: "vituo",
  }
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(2)}km`;
}

function dijkstra(buildings, startId, endId) {
  const distances = {};
  const previous = {};
  const visited = new Set();

  buildings.forEach(b => {
    distances[b.id] = Infinity;
    previous[b.id] = null;
  });
  distances[startId] = 0;

  while (true) {
    let current = null;
    buildings.forEach(b => {
      if (!visited.has(b.id)) {
        if (current === null || distances[b.id] < distances[current.id]) {
          current = b;
        }
      }
    });

    if (!current || current.id === endId) break;
    visited.add(current.id);

    buildings.forEach(neighbor => {
      if (!visited.has(neighbor.id)) {
        const dist = getDistance(
          current.latitude, current.longitude,
          neighbor.latitude, neighbor.longitude
        );
        const total = distances[current.id] + dist;
        if (total < distances[neighbor.id]) {
          distances[neighbor.id] = total;
          previous[neighbor.id] = current.id;
        }
      }
    });
  }

  const path = [];
  let current = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }
  return { path, totalDistance: distances[endId] };
}

export default function App() {
  const [lang, setLang] = useState('en');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [navigationPath, setNavigationPath] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [toast, setToast] = useState('');

  const t = translations[lang];
  const categories = ['All', 'Academic', 'Administrative', 'Food', 'Service', 'Health'];

  // ── Get User Location ──
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => showToast(t.enableGPS),
        { enableHighAccuracy: true }
      );
    }
  }, [t.enableGPS]);

  // ── Inject AR Markers ──
  useEffect(() => {
    const scene = document.querySelector('#ar-scene');
    if (!scene) return;

    document.querySelectorAll('.ar-marker').forEach(el => el.remove());

    const toRender = activeCategory === 'All'
      ? buildingsData
      : buildingsData.filter(b => b.category === activeCategory);

    toRender.forEach(b => {
      const entity = document.createElement('a-entity');
      entity.classList.add('ar-marker');
      entity.setAttribute('gps-projected-entity-place',
        `latitude: ${b.latitude}; longitude: ${b.longitude}`
      );
      entity.setAttribute('scale', '15 15 15');

      const box = document.createElement('a-box');
      box.setAttribute('color', categoryColors[b.category] || '#555');
      box.setAttribute('opacity', '0.85');
      box.setAttribute('width', '3');
      box.setAttribute('height', '1');
      box.setAttribute('depth', '0.2');

      const text = document.createElement('a-text');
      text.setAttribute('value', b.name);
      text.setAttribute('align', 'center');
      text.setAttribute('color', 'white');
      text.setAttribute('position', '0 0 0.15');
      text.setAttribute('width', '3');

      entity.appendChild(box);
      entity.appendChild(text);
      entity.addEventListener('click', () => selectBuilding(b));
      scene.appendChild(entity);
    });
  }, [activeCategory]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  function handleSearch(value) {
    setQuery(value);
    if (value.length < 2) { setSearchResults([]); return; }
    const results = buildingsData.filter(b =>
      b.name.toLowerCase().includes(value.toLowerCase()) ||
      b.category.toLowerCase().includes(value.toLowerCase()) ||
      b.description.toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(results);
  }

  function selectBuilding(building) {
    setSelectedBuilding(building);
    setSearchResults([]);
    setQuery('');
  }

  function startNavigation() {
    if (!selectedBuilding) return;
    if (!userLocation) { showToast(t.enableGPS); return; }

    let nearest = null;
    let minDist = Infinity;
    buildingsData.forEach(b => {
      const d = getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      if (d < minDist) { minDist = d; nearest = b; }
    });

    const { path, totalDistance } = dijkstra(buildingsData, nearest.id, selectedBuilding.id);
    setNavigationPath({ path, totalDistance, destination: selectedBuilding });
    setIsNavigating(true);
    showToast(`${t.navigating} ${selectedBuilding.name} — ${formatDistance(totalDistance)}`);
  }

  function stopNavigation() {
    setIsNavigating(false);
    setNavigationPath(null);
    setSelectedBuilding(null);
  }

  function iAmLost() {
    if (!userLocation) { showToast(t.enableGPS); return; }

    let nearest = null;
    let minDist = Infinity;
    buildingsData.forEach(b => {
      const d = getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      if (d < minDist) { minDist = d; nearest = b; }
    });

    if (nearest) {
      showToast(`${t.nearest}: ${nearest.name} — ${formatDistance(minDist)} ${t.away}`);
      selectBuilding(nearest);
    }
  }

  function toggleLang() {
    setLang(prev => prev === 'en' ? 'sw' : 'en');
  }

  return (
    <div className="app">

      {/* Top UI */}
      <div className="ui-top">
        <div className="header"><span>{t.title}</span></div>

        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={t.search}
            value={query}
            onChange={e => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(b => (
                <div key={b.id} className="search-item" onClick={() => selectBuilding(b)}>
                  <span className="dot" style={{ background: categoryColors[b.category] }}></span>
                  <div>
                    <strong>{b.name}</strong>
                    <small>{b.category}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' ? t.all : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Banner */}
      {isNavigating && navigationPath && (
        <div className="nav-banner">
          <div className="nav-info">
            <span>🧭 {t.navigating}: <strong>{navigationPath.destination.name}</strong></span>
            <span>📏 {formatDistance(navigationPath.totalDistance)} · {navigationPath.path.length} {t.stops}</span>
          </div>
          <button className="stop-btn" onClick={stopNavigation}>✕ Stop</button>
        </div>
      )}

      {/* Info Card */}
      {selectedBuilding && !isNavigating && (
        <div className="info-card">
          <button className="close-btn" onClick={() => setSelectedBuilding(null)}>{t.close}</button>
          <div className="card-category-bar" style={{ background: categoryColors[selectedBuilding.category] }}></div>
          <h3>{selectedBuilding.name}</h3>
          <p className="card-desc">{selectedBuilding.description}</p>
          <p className="card-meta">
            <span className="category-badge" style={{ background: categoryColors[selectedBuilding.category] }}>
              {selectedBuilding.category}
            </span>
            {userLocation && (
              <span className="distance-badge">
                📏 {formatDistance(getDistance(userLocation.lat, userLocation.lng, selectedBuilding.latitude, selectedBuilding.longitude))}
              </span>
            )}
          </p>
          <button className="navigate-btn" onClick={startNavigation}>{t.navigate}</button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Bottom Buttons */}
      <button className="lost-btn" onClick={iAmLost}>{t.lost}</button>
      <button className="lang-btn" onClick={toggleLang}>{t.langBtn}</button>

    </div>
  );
}