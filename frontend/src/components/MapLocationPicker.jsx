import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, X, Check, Loader2, AlertTriangle, Store, Layers, Crosshair, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom SVG marker icon for high-DPI screens without asset path issues
const customPinIcon = L.divIcon({
  className: 'custom-osm-pin',
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; bottom: 0; width: 14px; height: 6px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(2px);"></div>
      <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 8px 16px rgba(5,150,105,0.35); display: flex; align-items: center; justify-content: center;">
        <div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 36],
  popupAnchor: [0, -36],
});

export default function MapLocationPicker({
  isOpen,
  onClose,
  onConfirm,
  initialLat = 17.385044,
  initialLng = 78.486671,
  title = "Pin Your Delivery Location",
  storeSettings = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [coords, setCoords] = useState({
    lat: initialLat || 17.385044,
    lng: initialLng || 78.486671
  });

  const storeLat = parseFloat(storeSettings?.store_latitude || '17.385044');
  const storeLng = parseFloat(storeSettings?.store_longitude || '78.486671');
  const maxRadiusKm = parseFloat(storeSettings?.delivery_radius_km || '5.0');
  const enforceRadius = Boolean(storeSettings?.enforce_delivery_radius);

  const distanceKm = useMemo(() => {
    if (!coords.lat || !coords.lng) return null;
    const R = 6371;
    const dLat = ((coords.lat - storeLat) * Math.PI) / 180;
    const dLon = ((coords.lng - storeLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((storeLat * Math.PI) / 180) *
        Math.cos((coords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }, [coords.lat, coords.lng, storeLat, storeLng]);

  const isOutsideRadius = distanceKm !== null && distanceKm > maxRadiusKm;

  const [addressDetails, setAddressDetails] = useState({
    street: '',
    city: '',
    state: '',
    zip_code: '',
    display_name: 'Move the pin to your exact building or doorstep'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Reverse Geocoding with OSM Nominatim
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NarendraKirana/1.0'
        }
      });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();
      
      const addr = data.address || {};
      const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
      const area = addr.suburb || addr.residential || addr.city_district || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';

      const streetLine = [road, area].filter(Boolean).join(', ');

      setAddressDetails({
        street: streetLine || data.name || '',
        city: city,
        state: state,
        zip_code: postcode,
        display_name: data.display_name || 'Selected Location'
      });
    } catch (err) {
      console.warn('Reverse geocoding warning:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Search places using Photon (high speed OSM search) with Nominatim fallback
  const handleSearch = async (q) => {
    if (!q || q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lat=${coords.lat}&lon=${coords.lng}`;
      const res = await fetch(photonUrl);
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const results = data.features.map(f => ({
          name: f.properties.name || f.properties.street || '',
          city: f.properties.city || f.properties.town || '',
          state: f.properties.state || '',
          postcode: f.properties.postcode || '',
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          label: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', ')
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.warn('Photon search error:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from search autocomplete
  const selectSearchResult = (item) => {
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lng);
    setCoords({ lat: newLat, lng: newLng });
    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([newLat, newLng], 17, { duration: 1.2 });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    }
    reverseGeocode(newLat, newLng);
  };

  // Trigger GPS Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
        setIsLocating(false);
        toast.success('Centered to your GPS location!');
      },
      (err) => {
        setIsLocating(false);
        toast.error('Could not get current location. Please enable GPS permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Change Map Tile Layer (Street vs Satellite)
  const setTileMode = useCallback((mode) => {
    if (!mapInstanceRef.current) return;
    setMapLayer(mode);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (mode === 'satellite') {
      // Free Esri World Imagery (High-Resolution Aerial Satellite)
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Aerial Imagery'
        }
      ).addTo(mapInstanceRef.current);
    } else {
      // Free OpenStreetMap Standard
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      ).addTo(mapInstanceRef.current);
    }
  }, []);

  // Quick camera actions
  const handleFocusPin = () => {
    if (mapInstanceRef.current && coords.lat && coords.lng) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 18, { duration: 0.8 });
    }
  };

  const handleFocusStore = () => {
    if (mapInstanceRef.current && storeLat && storeLng) {
      mapInstanceRef.current.flyTo([storeLat, storeLng], 16, { duration: 0.8 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy prior instance if existing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter = [coords.lat, coords.lng];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    // Tile Layer: Esri Satellite or OpenStreetMap Standard
    const initialLayer = mapLayer === 'satellite'
      ? L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
        )
      : L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
        );

    initialLayer.addTo(map);
    tileLayerRef.current = initialLayer;

    // Render store origin and delivery boundary if store coordinates available
    if (storeSettings && storeLat && storeLng) {
      const storeMarker = L.marker([storeLat, storeLng], {
        icon: L.divIcon({
          className: 'store-hub-pin',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div style="width: 28px; height: 28px; background: #064E3B; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                <span style="transform: rotate(45deg); font-size: 13px;">🏪</span>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 28],
          popupAnchor: [0, -28]
        })
      }).addTo(map);
      storeMarker.bindPopup(`<b>${storeSettings.store_name || 'Narendra Kirana Store'}</b><br/>Store Pickup & Dispatch Hub`);

      L.circle([storeLat, storeLng], {
        radius: maxRadiusKm * 1000,
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(map);
    }

    // Draggable pinpoint marker
    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: customPinIcon,
      autoPan: true
    }).addTo(map);

    marker.on('dragend', (e) => {
      const latlng = e.target.getLatLng();
      const lat = parseFloat(latlng.lat.toFixed(6));
      const lng = parseFloat(latlng.lng.toFixed(6));
      setCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // Also support clicking anywhere on map to move pin
    map.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      marker.setLatLng([lat, lng]);
      setCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Initial reverse geocode
    reverseGeocode(coords.lat, coords.lng);

    // Invalidate map size after modal rendering completes
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isOutsideRadius && enforceRadius) {
      toast.error(`Selected address is ${distanceKm} km away, which exceeds our ${maxRadiusKm} km delivery limit.`);
      return;
    }
    onConfirm({
      latitude: coords.lat,
      longitude: coords.lng,
      street: addressDetails.street,
      city: addressDetails.city,
      state: addressDetails.state,
      zip_code: addressDetails.zip_code,
      display_name: addressDetails.display_name,
      distance_km: distanceKm,
      is_outside_radius: isOutsideRadius
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-2xl h-[88vh] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag marker to your doorstep or building gate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar Floating Overlay */}
        <div className="absolute top-16 inset-x-4 z-[1000]">
          <div className="relative">
            <div className="flex items-center w-full px-3.5 py-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700">
              <Search size={16} className="text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search area, landmark, or street..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
              {isSearching && <Loader2 size={15} className="animate-spin text-emerald-600 ml-2" />}
              {searchQuery && !isSearching && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Autocomplete suggestions dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-52 overflow-y-auto">
                {searchResults.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => selectSearchResult(item)}
                    className="flex items-start gap-2.5 w-full px-3.5 py-2.5 text-left text-xs sm:text-sm hover:bg-emerald-50 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                  >
                    <MapPin size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{item.name || item.city}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leaflet Map Canvas Container */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-800">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Interactive Control HUD (Top Right) */}
          <div className="absolute right-3 top-20 z-[999] flex flex-col gap-2 items-end">
            {/* Satellite / Street Switcher */}
            <button
              type="button"
              onClick={() => setTileMode(mapLayer === 'street' ? 'satellite' : 'street')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg border text-xs font-bold transition cursor-pointer backdrop-blur-md ${
                mapLayer === 'satellite'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                  : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={mapLayer === 'street' ? 'Switch to Aerial Satellite View' : 'Switch to Street Map'}
            >
              <Layers size={15} />
              <span>{mapLayer === 'street' ? 'Satellite 🛰️' : 'Street 🗺️'}</span>
            </button>

            {/* Focus Doorstep Pin */}
            <button
              type="button"
              onClick={handleFocusPin}
              className="flex items-center justify-center w-9 h-9 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer backdrop-blur-md"
              title="Focus on My Pin 🎯"
            >
              <Crosshair size={18} />
            </button>

            {/* Focus Store Hub */}
            {storeSettings && storeLat && storeLng && (
              <button
                type="button"
                onClick={handleFocusStore}
                className="flex items-center justify-center w-9 h-9 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer backdrop-blur-md"
                title="Focus Store Hub 🏪"
              >
                <Store size={18} />
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex flex-col bg-white/95 dark:bg-slate-800/95 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden backdrop-blur-md">
              <button
                type="button"
                onClick={handleZoomIn}
                className="flex items-center justify-center w-9 h-8 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer border-b border-slate-200 dark:border-slate-700"
                title="Zoom In"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex items-center justify-center w-9 h-8 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Zoom Out"
              >
                <Minus size={15} />
              </button>
            </div>
          </div>

          {/* Satellite Rooftop Hint (Bottom Left) */}
          <div className="absolute left-3 bottom-3 z-[999] hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-white backdrop-blur-md rounded-xl text-[11px] font-medium pointer-events-none">
            <span>🛰️ Switch to Satellite to view rooftop & gates</span>
          </div>

          {/* Quick "Locate Me" Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute right-4 bottom-4 z-[999] flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
          >
            {isLocating ? (
              <Loader2 size={14} className="animate-spin text-emerald-600" />
            ) : (
              <Navigation size={14} className="text-emerald-600 fill-emerald-600" />
            )}
            Locate Me
          </button>
        </div>

        {/* Footer: Pinned Address Details & Confirmation */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <MapPin size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  Selected Pin
                </span>
                {distanceKm !== null && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    isOutsideRadius
                      ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {isOutsideRadius ? `⚠️ ${distanceKm} km (Limit: ${maxRadiusKm} km)` : `✓ ${distanceKm} km from store`}
                  </span>
                )}
                {isGeocoding && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 size={11} className="animate-spin" /> Fetching address...
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1 line-clamp-2">
                {addressDetails.display_name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                {addressDetails.zip_code && ` • Pincode: ${addressDetails.zip_code}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-[2] flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition cursor-pointer ${
                isOutsideRadius && enforceRadius
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.98]'
              }`}
            >
              {isOutsideRadius && enforceRadius ? (
                <>
                  <AlertTriangle size={16} /> Outside Delivery Zone
                </>
              ) : (
                <>
                  <Check size={16} /> Confirm Doorstep Pin
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
