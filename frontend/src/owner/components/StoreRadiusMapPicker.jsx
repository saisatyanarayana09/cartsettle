import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, ShieldCheck, ShieldAlert, Sparkles, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom Store Pin Icon for Leaflet
const storePinIcon = L.divIcon({
  className: 'owner-store-pin',
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; bottom: 0; width: 16px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(2px);"></div>
      <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #065F46 0%, #047857 100%); border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 8px 18px rgba(4,120,87,0.45); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 16px;">🏪</span>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 40],
  popupAnchor: [0, -40]
});

const RADIUS_PRESETS = [2, 3, 5, 8, 10, 15];

export default function StoreRadiusMapPicker({
  storeLat = 17.385044,
  storeLng = 78.486671,
  deliveryRadiusKm = 5,
  enforceDeliveryRadius = false,
  onLocationChange,
  onRadiusChange,
  onEnforceChange
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const numLat = parseFloat(storeLat) || 17.385044;
  const numLng = parseFloat(storeLng) || 78.486671;
  const numRadius = parseFloat(deliveryRadiusKm) || 5;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [addressPreview, setAddressPreview] = useState('Store Pinpoint Location');

  // Reverse geocode store position
  const fetchAddressPreview = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'NarendraKirana/1.0', 'Accept-Language': 'en' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.display_name) {
        setAddressPreview(data.display_name.split(',').slice(0, 3).join(', '));
      }
    } catch {
      // Non-blocking preview fallback
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [numLat, numLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Official OpenStreetMap tiles (100% Free, Zero API Keys Required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Draggable Store Marker
    const marker = L.marker([numLat, numLng], {
      icon: storePinIcon,
      draggable: true
    }).addTo(map);

    marker.bindPopup('<b>Store Hub</b><br/>Drag pin or click map to move store position.').openPopup();

    // Delivery Boundary Circle
    const circle = L.circle([numLat, numLng], {
      radius: numRadius * 1000,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.18,
      weight: 2.5,
      dashArray: '6, 6'
    }).addTo(map);

    // Marker drag end event
    marker.on('dragend', (e) => {
      const newPos = e.target.getLatLng();
      circle.setLatLng(newPos);
      onLocationChange?.({ lat: parseFloat(newPos.lat.toFixed(6)), lng: parseFloat(newPos.lng.toFixed(6)) });
      fetchAddressPreview(newPos.lat, newPos.lng);
    });

    // Map click event to relocate store
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      onLocationChange?.({ lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) });
      fetchAddressPreview(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    fetchAddressPreview(numLat, numLng);

    // Invalidate size after layout stabilization
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker & circle when coordinates change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    const currentMarkerPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentMarkerPos.lat - numLat) > 0.0001 ||
      Math.abs(currentMarkerPos.lng - numLng) > 0.0001
    ) {
      markerRef.current.setLatLng([numLat, numLng]);
      circleRef.current.setLatLng([numLat, numLng]);
      mapInstanceRef.current.panTo([numLat, numLng], { animate: true });
    }
  }, [numLat, numLng]);

  // Update circle radius dynamically when slider changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(numRadius * 1000);
    }
  }, [numRadius]);

  // Place Search with Photon
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;

    setIsSearching(true);
    try {
      const query = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=5&lat=${numLat}&lon=${numLng}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch {
      toast.error('Could not search places. Try another query.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const targetLat = parseFloat(lat.toFixed(6));
    const targetLng = parseFloat(lon.toFixed(6));

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([targetLat, targetLng]);
      circleRef.current.setLatLng([targetLat, targetLng]);
      mapInstanceRef.current.flyTo([targetLat, targetLng], 14, { duration: 1.2 });
    }

    onLocationChange?.({ lat: targetLat, lng: targetLng });
    setSearchResults([]);
    setSearchQuery('');
    setAddressPreview(feature.properties.name || feature.properties.street || 'Selected Location');
    toast.success('Store pin repositioned!');
  };

  // Browser GPS Locate
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
        }

        onLocationChange?.({ lat, lng });
        fetchAddressPreview(lat, lng);
        toast.success('Centered on your current GPS location!');
      },
      (err) => {
        setIsLocating(false);
        toast.error('Unable to retrieve your location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Area calculation: pi * r^2
  const coverageAreaKm2 = (Math.PI * Math.pow(numRadius, 2)).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Header Info & Geofence Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Store Dispatch Location & Geofence Radius</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pinpoint your store on OpenStreetMap to calculate delivery distances and set customer geofencing.
          </p>
        </div>

        {/* Geofence Enforcement Toggle */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(enforceDeliveryRadius)}
              onChange={(e) => onEnforceChange?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
          <div>
            <div className="flex items-center gap-1.5">
              {enforceDeliveryRadius ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {enforceDeliveryRadius ? 'Strict Geofence Active' : 'Geofence Advisory'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {enforceDeliveryRadius ? 'Blocks checkout if outside boundary' : 'Permits checkout with standard fee'}
            </p>
          </div>
        </div>
      </div>

      {/* Map Card Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-900">
        {/* Search & Action Bar Overlay */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store locality or landmark..."
              className="w-full pl-9 pr-20 py-2 rounded-xl text-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow transition cursor-pointer"
            >
              {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Search'}
            </button>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[1001] max-h-48 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 dark:hover:bg-slate-800 text-xs border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-center gap-2 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {item.properties.name || item.properties.street || 'Result'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">
                        {[item.properties.city, item.properties.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* GPS Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Detecting...' : 'My Location'}</span>
          </button>
        </div>

        {/* The Leaflet Canvas */}
        <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />

        {/* Live Boundary Badge Overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            Radius: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{numRadius} km</strong> (~{coverageAreaKm2} km² coverage)
          </span>
        </div>
      </div>

      {/* Radius Controls: Slider & Quick Presets */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Delivery Radius: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{numRadius} km</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Only addresses within this circular radius are accepted when geofencing is strictly enforced.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {RADIUS_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onRadiusChange?.(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  numRadius === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p} km
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">1 km</span>
          <input
            type="range"
            min="1"
            max="25"
            step="0.5"
            value={numRadius}
            onChange={(e) => onRadiusChange?.(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <span className="text-xs font-bold text-slate-500">25 km</span>
        </div>

        {/* Coordinate Readout */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>Latitude: <strong className="text-slate-800 dark:text-slate-200">{numLat.toFixed(6)}</strong></span>
            <span>Longitude: <strong className="text-slate-800 dark:text-slate-200">{numLng.toFixed(6)}</strong></span>
          </div>
          <div className="truncate max-w-xs text-right text-[10px]">
            {addressPreview}
          </div>
        </div>
      </div>
    </div>
  );
}
