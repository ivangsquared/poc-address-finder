import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { GoogleMap, useJsApiLoader, Autocomplete } from "@react-google-maps/api";



interface NmiGeocode {
  nmi: string;
  lat: number;
  lng: number;
}

interface AddressResponse {
  nmi: string;
  address: string;
}

const DEFAULT_POSITION = { lat: -33.8708, lng: 151.2073 };

const nmiMarkers: NmiGeocode[] = [
  { nmi: "NMI001", lat: -33.8708, lng: 151.2073 },
  { nmi: "NMI002", lat: -37.8136, lng: 144.9631 },
  { nmi: "NMI003", lat: -27.4698, lng: 153.0251 },
];

async function fetchNearestNmi(lat: number, lng: number): Promise<NmiGeocode | null> {
  let minDist = Number.POSITIVE_INFINITY;
  let nearest: NmiGeocode | null = null;
  for (const c of nmiMarkers) {
    const dist = Math.sqrt(Math.pow(c.lat - lat, 2) + Math.pow(c.lng - lng, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }
  if (!nearest) return null;
  // Simulate API call
  const res = await fetch(`/api/geocode?nmi=${nearest.nmi}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchAddressForNmi(nmi: string): Promise<AddressResponse | null> {
  const res = await fetch(`/api/addressfinder?nmi=${nmi}`);
  if (!res.ok) return null;
  return res.json();
}

interface GooglePlacesAutocompleteProps {
  initialAddress: string;
  onAddressChange: (address: string) => void;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({ initialAddress, onAddressChange }) => {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string>(initialAddress);

  useEffect(() => {
    setInputValue(initialAddress);
  }, [initialAddress]);

  const handlePlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        setInputValue(place.formatted_address);
        onAddressChange(place.formatted_address);
      }
    }
  }, [onAddressChange]);


  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ fontWeight: 500 }}>Address (autocomplete):</label>
      <Autocomplete
        onLoad={autocomplete => {
          autocompleteRef.current = autocomplete;
        }}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: "au" },
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            onAddressChange(e.target.value);
          }}
          style={{ width: 350, padding: 8, fontSize: 16, marginLeft: 8 }}
          placeholder="Start typing an address..."
          autoComplete="off"
        />
      </Autocomplete>
    </div>
  );
};

async function fetchAddressFromCoords(lat: number, lng: number): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].formatted_address;
  }
  return "";
}

async function fetchLatLngFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  }
  return null;
}

const MapClickHandler: React.FC<{
  onSelect: (lat: number, lng: number) => void;
}> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapWithNmi: React.FC = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedNmi, setSelectedNmi] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [confirmedAddress, setConfirmedAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Handle map click and update address using Google Geocoding API
  const handleMapClick = async (lat: number, lng: number) => {
    setLoading(true);
    setError("");
    setSelectedPosition({ lat, lng });
    setSelectedNmi(null);
    setAddress("");
    setConfirmedAddress("");
    try {
      const nmiGeocode = await fetchNearestNmi(lat, lng);
      if (nmiGeocode && nmiGeocode.nmi) {
        setSelectedNmi(nmiGeocode.nmi);
        // Use Google reverse geocoding
        const addr = await fetchAddressFromCoords(lat, lng);
        setAddress(addr);
      } else {
        setSelectedNmi(null);
        setAddress("");
      }
    } catch (e) {
      setError("Failed to fetch NMI or address");
    } finally {
      setLoading(false);
    }
  };

  // Handle 'Use my current location' button
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleMapClick(latitude, longitude);
      },
      (geoError) => {
        setLoading(false);
        setError("Unable to retrieve your location. Please allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleMapClick]);

  const handleConfirm = async () => {
    setConfirmedAddress(address);
    // Use Google Geocoding API to get lat/lng for the confirmed address
    try {
      const coords = await fetchLatLngFromAddress(address);
      if (coords) {
        setSelectedPosition(coords);
      }
    } catch (err) {
      // Optionally handle geocode errors
    }
  };

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }
  if (loadError) {
    return <div>Failed to load Google Maps API</div>;
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <h2 style={{ margin: 0, padding: 16, background: "#f5f5f5" }}>POC: Address Finder with NMI Map (Next.js)</h2>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 2, height: "100%" }}>
          <MapContainer center={DEFAULT_POSITION} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={handleMapClick} />
            {/* Render all NMI markers */}
            {nmiMarkers.map(marker => {
              const isSelected = selectedNmi === marker.nmi;
              const markerSvg = encodeURIComponent(`
                <svg width="48" height="54" viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
                    <path d="M24 0C13.5066 0 5 8.50659 5 19C5 33.5 24 54 24 54C24 54 43 33.5 43 19C43 8.50659 34.4934 0 24 0Z" fill="${isSelected ? '#d32f2f' : '#1976d2'}" stroke="#222" stroke-width="2"/>
                    <circle cx="24" cy="21" r="10" fill="white"/>
                    <text x="24" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${isSelected ? '#d32f2f' : '#1976d2'}">${marker.nmi}</text>
                  </g>
                </svg>
              `);
              return (
                <Marker
                  key={marker.nmi}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  eventHandlers={{
                    click: () => handleMapClick(marker.lat, marker.lng),
                  }}
                  icon={L.icon({
                    iconUrl: `data:image/svg+xml;charset=UTF-8,${markerSvg}`,
                    iconSize: [36, 54],
                    iconAnchor: [18, 54],
                  }) as unknown as L.Icon}
                />
              );
            })}
            {/* Show selected position marker if not on an NMI */}
            {selectedPosition &&
              (!selectedNmi ||
                !nmiMarkers.some(m => m.lat === selectedPosition.lat && m.lng === selectedPosition.lng)) && (
                <Marker
                  position={selectedPosition}
                  icon={L.icon({
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  }) as unknown as L.Icon}
                />
              )}
          </MapContainer>
        </div>
        <div style={{ flex: 1, padding: 32, minWidth: 400 }}>
          <h3>Selection Details</h3>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: 'red' }}>{error}</div>
          ) : selectedNmi ? (
            <>
              <div><b>NMI:</b> {selectedNmi}</div>
              <div style={{ marginTop: 8 }}>
                <GooglePlacesAutocomplete initialAddress={address} onAddressChange={setAddress} />
              </div>
              <button
                style={{ marginTop: 16, padding: "8px 24px", fontSize: 16, background: "#0070f3", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: 'block' }}
                onClick={handleConfirm}
                disabled={!address || address === confirmedAddress}
              >
                Confirm Address
              </button>
              <button
                style={{ marginTop: 12, padding: "8px 24px", fontSize: 16, background: "#009688", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: 'block' }}
                onClick={handleUseCurrentLocation}
                disabled={loading}
              >
                Use device current location
              </button>
              <div style={{ marginTop: 6, fontSize: 13, color: '#555' }}>
                This will use your device's current location to find the nearest NMI and address.
              </div>
              {confirmedAddress && (
                <div style={{ marginTop: 16, color: "green", fontWeight: 500 }}>
                  Address confirmed: {confirmedAddress}
                </div>
              )}
            </>
          ) : (
            <div>Select a location on the map to fetch NMI and address.</div>
          )}
          {/* shows the longitude and latitude of the selected position */}
          {selectedPosition && (
            <div style={{ marginTop: 16 }}>
              <b>Longitude:</b> {selectedPosition.lng.toFixed(6)}
              <br />
              <b>Latitude:</b> {selectedPosition.lat.toFixed(6)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MapWithNmi;
