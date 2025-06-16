import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { LatLngLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";

// Mock NMI/geocoordinate dataset
const mockNmiData: { nmi: string; lat: number; lng: number }[] = [
  { nmi: "NMI001", lat: -33.8708, lng: 151.2073 },
  { nmi: "NMI002", lat: -37.8136, lng: 144.9631 },
  { nmi: "NMI003", lat: -27.4698, lng: 153.0251 },
];

// Mock AddressFinder response per NMI
const mockAddressData: Record<string, string> = {
  NMI001: "1 Market St, Sydney NSW 2000, Australia",
  NMI002: "123 Collins St, Melbourne VIC 3000, Australia",
  NMI003: "456 Queen St, Brisbane QLD 4000, Australia",
};

function findNearestNmi(lat: number, lng: number): string | null {
  let minDist = Number.POSITIVE_INFINITY;
  let nearestNmi: string | null = null;
  for (const entry of mockNmiData) {
    const dist = Math.sqrt(
      Math.pow(entry.lat - lat, 2) + Math.pow(entry.lng - lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearestNmi = entry.nmi;
    }
  }
  return nearestNmi;
}

const DEFAULT_POSITION: LatLngLiteral = { lat: -33.8708, lng: 151.2073 };

const AddressFinderAutocomplete: React.FC<{
  initialAddress: string;
  onAddressChange: (address: string) => void;
}> = ({ initialAddress, onAddressChange }) => {
  const [input, setInput] = useState(initialAddress);

  // In a real implementation, call AddressFinder API here.
  // For POC, just allow user to edit and "confirm".
  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ fontWeight: 500 }}>Address (editable):</label>
      <input
        type="text"
        value={input}
        onChange={e => {
          setInput(e.target.value);
          onAddressChange(e.target.value);
        }}
        style={{ width: 350, padding: 8, fontSize: 16, marginLeft: 8 }}
      />
    </div>
  );
};

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

const App: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<LatLngLiteral | null>(null);
  const [selectedNmi, setSelectedNmi] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [confirmedAddress, setConfirmedAddress] = useState<string>("");

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition({ lat, lng });
    const nmi = findNearestNmi(lat, lng);
    setSelectedNmi(nmi);
    if (nmi && mockAddressData[nmi]) {
      setAddress(mockAddressData[nmi]);
      setConfirmedAddress("");
    } else {
      setAddress("");
      setConfirmedAddress("");
    }
  };

  const handleConfirm = () => {
    setConfirmedAddress(address);
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <h2 style={{ margin: 0, padding: 16, background: "#f5f5f5" }}>POC: Address Finder with NMI Map</h2>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 2, height: "100%" }}>
          <MapContainer center={DEFAULT_POSITION} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={handleMapClick} />
            {selectedPosition && (
              <Marker position={selectedPosition} icon={L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconSize: [25, 41], iconAnchor: [12, 41] })} />
            )}
          </MapContainer>
        </div>
        <div style={{ flex: 1, padding: 32, minWidth: 400 }}>
          <h3>Selection Details</h3>
          {selectedNmi ? (
            <>
              <div><b>NMI:</b> {selectedNmi}</div>
              <div style={{ marginTop: 8 }}>
                <AddressFinderAutocomplete initialAddress={address} onAddressChange={setAddress} />
              </div>
              <button
                style={{ marginTop: 16, padding: "8px 24px", fontSize: 16, background: "#0070f3", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                onClick={handleConfirm}
                disabled={!address || address === confirmedAddress}
              >
                Confirm Address
              </button>
              {confirmedAddress && (
                <div style={{ marginTop: 16, color: "green", fontWeight: 500 }}>
                  Address confirmed: {confirmedAddress}
                </div>
              )}
            </>
          ) : (
            <div>Select a location on the map to fetch NMI and address.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
