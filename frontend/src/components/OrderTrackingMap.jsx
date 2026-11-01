import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Store, MapPin, Truck, Navigation, Clock, ShieldCheck, 
  Compass, Layers, Maximize2, Minimize2, Crosshair, Home, 
  ZoomIn, ZoomOut, Phone
} from 'lucide-react';

// Store Pin Icon
const storePinIcon = L.divIcon({
  className: 'store-osm-pin',
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
      <div style="width: 34px; height: 34px; background: #064E3B; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 15px;">🏪</span>
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 34],
  popupAnchor: [0, -34]
});

// Customer Pin Icon
const customerPinIcon = L.divIcon({
  className: 'customer-osm-pin',
  html: `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 10px rgba(225,29,72,0.45));">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(225,29,72,0.25); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width: 34px; height: 34px; background: #E11D48; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; z-index: 2;">
        <span style="transform: rotate(45deg); font-size: 15px;">🏠</span>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 38],
  popupAnchor: [0, -38]
});

// Rider Pin Icon
const riderPinIcon = L.divIcon({
  className: 'rider-osm-pin',
  html: `
    <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(99,102,241,0.3); animation: ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width: 36px; height: 36px; background: #4F46E5; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(79,70,229,0.55); display: flex; align-items: center; justify-content: center; z-index: 2;">
        <span style="font-size: 17px;">🛵</span>
      </div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -23]
});

export default function OrderTrackingMap({
  order,
  storeSettings,
  className = "w-full h-72 sm:h-80 rounded-2xl overflow-hidden"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polylineRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const routeBoundsRef = useRef(null);

  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeInfo, setRouteInfo] = useState({
    distanceKm: null,
    durationMins: null,
    loading: true
  });

  const storeLat = parseFloat(storeSettings?.store_latitude || '17.385044');
  const storeLng = parseFloat(storeSettings?.store_longitude || '78.486671');

  const custLat = parseFloat(order?.delivery_latitude);
  const custLng = parseFloat(order?.delivery_longitude);

  const hasCustomerCoords = !isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0;
  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';

  // Compute rider coords if available or estimated along vector
  const rLat = parseFloat(order?.delivery_partner_lat) || (storeLat * 0.35 + custLat * 0.65);
  const rLng = parseFloat(order?.delivery_partner_lng) || (storeLng * 0.35 + custLng * 0.65);
  const riderPos = isOutForDelivery ? [rLat, rLng] : null;

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
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(mapInstanceRef.current);
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !hasCustomerCoords) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = isOutForDelivery && riderPos ? (rLat + custLat) / 2 : (storeLat + custLat) / 2;
    const centerLng = isOutForDelivery && riderPos ? (rLng + custLng) / 2 : (storeLng + custLng) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Default tile layer
    const initialTileUrl = mapLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(initialTileUrl, { maxZoom: 19 }).addTo(map);

    // Store marker (only when order is being prepared before rider dispatch)
    if (!isOutForDelivery) {
      const storeMarker = L.marker([storeLat, storeLng], { icon: storePinIcon }).addTo(map);
      storeMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">🏪</span>
            <b style="color: #064E3B; font-size: 13px;">${storeSettings?.store_name || 'Store'}</b>
          </div>
          <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.4;">Dispatch & Packing Hub</p>
          <div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: #059669;">Order in Preparation</div>
        </div>
      `);
      storeMarkerRef.current = storeMarker;
    }

    // Customer marker (Destination)
    const custMarker = L.marker([custLat, custLng], { icon: customerPinIcon }).addTo(map);
    custMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 2px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 16px;">🏠</span>
          <b style="color: #E11D48; font-size: 13px;">Delivery Destination</b>
        </div>
        <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.4;">${order?.delivery_address || 'Customer Doorstep'}</p>
        <div style="margin-top: 6px; display: inline-block; background: #FFE4E6; color: #BE123C; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">
          DOORSTEP PIN
        </div>
      </div>
    `);
    customerMarkerRef.current = custMarker;

    // Rider marker (if out for delivery)
    if (isOutForDelivery && riderPos) {
      const rMarker = L.marker(riderPos, { icon: riderPinIcon }).addTo(map);
      const riderPhone = order?.delivery_partner_phone ? `<div style="margin-top: 6px;"><a href="tel:${order.delivery_partner_phone}" style="color: #4F46E5; text-decoration: none; font-weight: 800; font-size: 11px; background: #EEF2FF; padding: 4px 8px; border-radius: 6px; display: inline-block;">📞 Call Driver</a></div>` : '';
      rMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">🛵</span>
            <b style="color: #4F46E5; font-size: 13px;">${order?.delivery_partner_name || 'Delivery Partner'}</b>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
            <span style="font-size: 11px; font-weight: 700; color: #059669;">Live on the way</span>
          </div>
          ${riderPhone}
        </div>
      `);
      rMarker.openPopup();
      riderMarkerRef.current = rMarker;
    }

    // Origin: use Rider's location when out for delivery, or store when dispatching
    const routeOriginLng = (isOutForDelivery && riderPos) ? riderPos[1] : storeLng;
    const routeOriginLat = (isOutForDelivery && riderPos) ? riderPos[0] : storeLat;

    // Fetch real road route from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeOriginLng},${routeOriginLat};${custLng},${custLat}?overview=full&geometries=geojson`;
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

          // Draw road route polyline
          const coords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
          
          // Polyline background shadow
          L.polyline(coords, {
            color: '#047857',
            weight: 7,
            opacity: 0.3,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Polyline main stroke
          const polyline = L.polyline(coords, {
            color: '#10B981',
            weight: 4.5,
            opacity: 0.95,
            dashArray: isOutForDelivery ? '8, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          polyline.bindTooltip(`<b>${distKm} km</b> • ~${durMins} mins away`, {
            sticky: true,
            className: 'osm-route-tooltip'
          });

          polylineRef.current = polyline;

          // Fit active trip markers with comfortable padding
          const bounds = polyline.getBounds();
          routeBoundsRef.current = bounds;
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
        } else {
          // Fallback straight line
          const startPt = (isOutForDelivery && riderPos) ? riderPos : [storeLat, storeLng];
          const straightLine = L.polyline([startPt, [custLat, custLng]], {
            color: '#10B981',
            weight: 3.5,
            dashArray: '6, 8'
          }).addTo(map);
          polylineRef.current = straightLine;
          const bounds = straightLine.getBounds();
          routeBoundsRef.current = bounds;
          map.fitBounds(bounds, { padding: [40, 40] });
          setRouteInfo({ distanceKm: null, durationMins: null, loading: false });
        }
      })
      .catch(() => {
        // Fallback straight line
        const straightLine = L.polyline([[storeLat, storeLng], [custLat, custLng]], {
          color: '#10B981',
          weight: 3.5,
          dashArray: '6, 8'
        }).addTo(map);
        const bounds = straightLine.getBounds();
        routeBoundsRef.current = bounds;
        map.fitBounds(bounds, { padding: [40, 40] });
        setRouteInfo({ distanceKm: null, durationMins: null, loading: false });
      });

    mapInstanceRef.current = map;

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
  }, [hasCustomerCoords, storeLat, storeLng, custLat, custLng, order?.status]);

  // Handle Fullscreen / Resize invalidation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        if (routeBoundsRef.current) {
          mapInstanceRef.current.fitBounds(routeBoundsRef.current, { padding: [50, 50] });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Interactive Actions
  const handleFitBounds = () => {
    if (mapInstanceRef.current && routeBoundsRef.current) {
      mapInstanceRef.current.flyToBounds(routeBoundsRef.current, { padding: [45, 45], duration: 0.8 });
    }
  };

  const handleFocusRider = () => {
    if (mapInstanceRef.current && riderPos) {
      mapInstanceRef.current.flyTo(riderPos, 17, { duration: 0.8 });
      if (riderMarkerRef.current) {
        riderMarkerRef.current.openPopup();
      }
    }
  };

  const handleFocusCustomer = () => {
    if (mapInstanceRef.current && hasCustomerCoords) {
      mapInstanceRef.current.flyTo([custLat, custLng], 17, { duration: 0.8 });
      if (customerMarkerRef.current) {
        customerMarkerRef.current.openPopup();
      }
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  if (!hasCustomerCoords) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
        <MapPin size={28} className="text-slate-400 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Delivery Route</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
          Delivery address: {order?.delivery_address || 'Address registered'}. Exact GPS pin wasn't captured for this address.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`relative shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300 select-none ${
        isFullscreen 
          ? 'fixed inset-3 sm:inset-6 z-[9999] rounded-3xl shadow-2xl bg-slate-950 flex flex-col overflow-hidden' 
          : `${className} relative`
      }`}
    >
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[260px]" />

      {/* Floating Route Status HUD Bar (Top Left) */}
      <div 
        onClick={handleFitBounds}
        className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:scale-[1.02] active:scale-95 transition"
        title="Click to view full route"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isOutForDelivery ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
          {isOutForDelivery ? 'Rider En Route' : 'Delivery Route'}
        </span>
        {routeInfo.distanceKm && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 pl-1 border-l border-slate-200 dark:border-slate-700">
            {routeInfo.distanceKm} km
          </span>
        )}
        {routeInfo.durationMins && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            (~{routeInfo.durationMins}m)
          </span>
        )}
      </div>

      {/* Interactive Action Controls Bar (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-1 shadow-lg border border-slate-200/80 dark:border-slate-700">
        {/* Layer Switcher: Street vs Satellite */}
        <button
          type="button"
          onClick={() => setTileMode(mapLayer === 'street' ? 'satellite' : 'street')}
          className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
            mapLayer === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={mapLayer === 'street' ? 'Switch to Satellite View' : 'Switch to Street Map'}
        >
          <Layers size={14} />
          <span className="hidden sm:inline">{mapLayer === 'street' ? 'Satellite' : 'Street'}</span>
        </button>

        {/* Focus Rider */}
        {isOutForDelivery && (
          <button
            type="button"
            onClick={handleFocusRider}
            className="p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
            title="Focus on Driver 🛵"
          >
            <Crosshair size={16} />
          </button>
        )}

        {/* Focus Doorstep */}
        <button
          type="button"
          onClick={handleFocusCustomer}
          className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
          title="Focus on Doorstep 🏠"
        >
          <Home size={16} />
        </button>

        {/* Recenter Full Route */}
        <button
          type="button"
          onClick={handleFitBounds}
          className="p-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
          title="Fit Full Route 🎯"
        >
          <Navigation size={15} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Map'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Bottom Floating Bar: Zoom & External Maps */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        {/* 1-Tap Google Maps Navigation Link */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-bold hover:text-emerald-600 transition"
        >
          <Compass size={14} className="text-emerald-600" />
          <span>Open in Google Maps</span>
        </a>

        {/* Custom Zoom Buttons */}
        <div className="pointer-events-auto flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700 p-0.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition rounded-lg cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition rounded-lg cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
