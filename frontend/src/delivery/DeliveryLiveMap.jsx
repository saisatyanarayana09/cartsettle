import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, MapPin, Phone, Crosshair, 
  ArrowUpRight, AlertCircle, RefreshCw, X, Maximize2, Minimize2,
  Layers, Compass
} from 'lucide-react';
import api from '../services/api';

// Customer Delivery Pin (Destination)
const customerDoorstepIcon = L.divIcon({
  className: 'customer-doorstep-pin',
  html: `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(225,29,72,0.25); animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width: 34px; height: 34px; background: #E11D48; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(225,29,72,0.45); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 15px;">🏠</span>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 38],
  popupAnchor: [0, -38]
});

// Delivery Partner Rider Pin (Moving Origin)
const liveRiderIcon = L.divIcon({
  className: 'live-rider-pin',
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(16,185,129,0.3); animation: ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width: 36px; height: 36px; background: #059669; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(5,150,105,0.5); display: flex; align-items: center; justify-content: center; z-index: 2;">
        <span style="font-size: 17px;">🛵</span>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

export default function DeliveryLiveMap({
  order,
  onClose,
  isModal = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const tileLayerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);

  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [autoFollow, setAutoFollow] = useState(true);
  const [riderCoords, setRiderCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [routeInfo, setRouteInfo] = useState({
    distanceKm: null,
    durationMins: null,
    loading: true
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const custLat = parseFloat(order?.delivery_latitude);
  const custLng = parseFloat(order?.delivery_longitude);
  const hasCustCoords = !isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0;

  const lastBroadcastRef = useRef(0);

  // Track Rider's Live GPS using watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    // High-accuracy continuous tracking for the rider
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setRiderCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(Math.round(accuracy));
        setGpsError('');

        // Broadcast to backend every 10 seconds so customer app tracks in real-time
        const now = Date.now();
        if (now - lastBroadcastRef.current > 10000) {
          lastBroadcastRef.current = now;
          api.post('/delivery/location/update/', { latitude, longitude }).catch(() => {});
        }
      },
      (err) => {
        console.warn('Live map GPS error:', err.message);
        if (err.code === 1) {
          setGpsError('Location permission denied. Enable GPS in browser settings.');
        } else {
          setGpsError('Unable to acquire GPS signal. Checking location...');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 4000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Change Map Tile Layer (Street vs Satellite)
  const setTileMode = useCallback((mode) => {
    if (!mapInstanceRef.current) return;
    setMapLayer(mode);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (mode === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Aerial Imagery' }
      ).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
      ).addTo(mapInstanceRef.current);
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: customer doorstep or rider position
    const centerLat = hasCustCoords ? custLat : (riderCoords?.lat || 17.385044);
    const centerLng = hasCustCoords ? custLng : (riderCoords?.lng || 78.486671);

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: hasCustCoords ? 15 : 14,
      zoomControl: false,
      attributionControl: false
    });

    // Default tile layer
    const initialTileUrl = mapLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(initialTileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Customer Doorstep Marker
    if (hasCustCoords) {
      const custMarker = L.marker([custLat, custLng], { icon: customerDoorstepIcon }).addTo(map);
      custMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 170px;">
          <b style="font-size: 13px; color: #E11D48;">🏠 Customer Doorstep</b><br/>
          <span style="font-size: 12px; font-weight: bold; color: #1e293b;">${order?.customer_name || 'Customer'}</span><br/>
          <span style="font-size: 11px; color: #64748b;">${order?.delivery_address || 'Delivery Address'}</span>
        </div>
      `);
      customerMarkerRef.current = custMarker;
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasCustCoords, custLat, custLng]);

  // Invalidate map size on expand/minimize
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Update Rider Marker & Fetch OSRM Road Route
  const updateRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update or add rider marker
    if (riderCoords) {
      const riderLatLng = [riderCoords.lat, riderCoords.lng];

      if (!riderMarkerRef.current) {
        const rMarker = L.marker(riderLatLng, { icon: liveRiderIcon }).addTo(map);
        rMarker.bindPopup(`
          <div style="font-family: sans-serif;">
            <b style="color: #059669; font-size: 12px;">🛵 Your Live Location</b><br/>
            <span style="font-size: 11px; color: #64748b;">Rider on Delivery</span>
          </div>
        `);
        riderMarkerRef.current = rMarker;
      } else {
        riderMarkerRef.current.setLatLng(riderLatLng);
      }

      // Update or create GPS accuracy circle
      if (gpsAccuracy && gpsAccuracy > 0) {
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = L.circle(riderLatLng, {
            radius: gpsAccuracy,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.12,
            weight: 1.5
          }).addTo(map);
        } else {
          accuracyCircleRef.current.setLatLng(riderLatLng);
          accuracyCircleRef.current.setRadius(gpsAccuracy);
        }
      }

      // Auto-follow rider movement if enabled
      if (autoFollow) {
        map.panTo(riderLatLng, { animate: true, duration: 0.5 });
      }

      // If both rider and customer locations are available, compute real road route
      if (hasCustCoords) {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${riderCoords.lng},${riderCoords.lat};${custLng},${custLat}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const distKm = (route.distance / 1000).toFixed(1);
              const durMins = Math.ceil(route.duration / 60);

              setRouteInfo({
                distanceKm: distKm,
                durationMins: durMins,
                loading: false
              });

              const coords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);

              if (polylineRef.current) {
                polylineRef.current.remove();
              }

              // Glowing outline polyline
              const polyline = L.polyline(coords, {
                color: '#10B981',
                weight: 5,
                opacity: 0.9,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              polylineRef.current = polyline;

              // Auto-fit bounds to both rider and customer when auto-follow is active
              if (autoFollow) {
                const bounds = L.latLngBounds([riderLatLng, [custLat, custLng]]);
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
              }
            }
          })
          .catch(() => {
            setRouteInfo(prev => ({ ...prev, loading: false }));
          });
      }
    }
  }, [riderCoords, hasCustCoords, custLat, custLng, autoFollow, gpsAccuracy]);

  useEffect(() => {
    updateRoute();
  }, [updateRoute]);

  // Center on Rider GPS
  const centerOnRider = () => {
    if (mapInstanceRef.current && riderCoords) {
      mapInstanceRef.current.setView([riderCoords.lat, riderCoords.lng], 16, { animate: true });
    }
  };

  // Center on Customer Destination
  const centerOnCustomer = () => {
    if (mapInstanceRef.current && hasCustCoords) {
      mapInstanceRef.current.setView([custLat, custLng], 16, { animate: true });
    }
  };

  // Turn-by-Turn in Google Maps Navigation
  const googleMapsNavUrl = riderCoords && hasCustCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${riderCoords.lat},${riderCoords.lng}&destination=${custLat},${custLng}&travelmode=driving`
    : hasCustCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order?.delivery_address || '')}`;

  return (
    <div className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
      isExpanded || isModal ? 'fixed inset-3 sm:inset-6 z-50 rounded-3xl' : 'w-full h-80 sm:h-96'
    }`}>
      {/* Top Navigation HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        {/* Distance & ETA Chip */}
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2.5">
          <div className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="leading-none">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Route to Customer</p>
            <p className="text-xs font-black text-white mt-0.5">
              {routeInfo.distanceKm ? (
                <>
                  <span className="text-emerald-400 font-bold">{routeInfo.distanceKm} km</span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span>~{routeInfo.durationMins} mins</span>
                </>
              ) : riderCoords ? (
                'Calculating road route...'
              ) : (
                'Locating your GPS...'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1 shadow-lg">
          {/* Layer Switcher: Street vs Satellite */}
          <button
            type="button"
            onClick={() => setTileMode(mapLayer === 'street' ? 'satellite' : 'street')}
            className={`h-8 px-2 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
              mapLayer === 'satellite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title={mapLayer === 'street' ? 'Switch to Satellite View' : 'Switch to Street Map'}
          >
            <Layers size={14} />
            <span className="text-[11px] hidden sm:inline">{mapLayer === 'street' ? 'Sat' : 'Map'}</span>
          </button>

          {/* Auto-Follow Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoFollow;
              setAutoFollow(next);
              if (next && riderCoords && mapInstanceRef.current) {
                mapInstanceRef.current.panTo([riderCoords.lat, riderCoords.lng]);
              }
            }}
            className={`size-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
              autoFollow 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
            }`}
            title={autoFollow ? 'Auto-Follow Enabled (Camera tracks you)' : 'Enable Auto-Follow'}
          >
            <Compass size={16} className={autoFollow ? 'animate-spin-slow' : ''} />
          </button>

          <button
            type="button"
            onClick={centerOnRider}
            disabled={!riderCoords}
            className="size-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 disabled:opacity-40 flex items-center justify-center transition cursor-pointer"
            title="Center on My GPS Location"
          >
            <Crosshair size={16} />
          </button>

          {hasCustCoords && (
            <button
              type="button"
              onClick={centerOnCustomer}
              className="size-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-rose-400 flex items-center justify-center transition cursor-pointer"
              title="Center on Customer Doorstep"
            >
              <MapPin size={16} />
            </button>
          )}

          {!isModal && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="size-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              title={isExpanded ? 'Minimize Map' : 'Full Screen'}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 flex items-center justify-center transition cursor-pointer"
              title="Close Map"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* GPS Status Alert Warning (if denied or error) */}
      {gpsError && (
        <div className="absolute top-16 left-3 right-3 z-[1000] bg-amber-500/90 backdrop-blur-md text-slate-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1 truncate">{gpsError}</span>
        </div>
      )}

      {/* Map Surface */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Bottom Floating Card: Customer Destination & Turn-by-Turn Navigation */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            <div className="size-7 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deliver To</p>
              <p className="text-xs font-black text-white truncate">{order?.customer_name || 'Customer'}</p>
              <p className="text-[11px] text-slate-300 line-clamp-1 leading-snug mt-0.5">
                {order?.delivery_address || 'Customer doorstep address'}
              </p>
            </div>
          </div>

          {order?.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-sm shadow-emerald-600/30 cursor-pointer"
            >
              <Phone size={13} />
              <span>Call</span>
            </a>
          )}
        </div>

        {/* Turn-by-Turn Google Navigation Button */}
        <a
          href={googleMapsNavUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition active:scale-98 cursor-pointer"
        >
          <Navigation size={15} />
          <span>Start Turn-by-Turn GPS Navigation</span>
          <ArrowUpRight size={13} className="opacity-75" />
        </a>
      </div>
    </div>
  );
}
