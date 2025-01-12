import React, { useState } from "react";
import IsochroneMap from "./IsochroneMap";

const App = () => {
  const [address, setAddress] = useState<string>("Toronto, Canada");
  // Default to 10 minutes walk time
  const [walkTime, setWalkTime] = useState<number>(10); 

  // Trigger the map update based on the new address and walk time
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
  };

  return (
    <div>
      <h1>Walkable Area Finder</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Address"
        />
        <select value={walkTime} onChange={(e) => setWalkTime(parseInt(e.target.value))}>
          <option value={5}>5 Minutes</option>
          <option value={10}>10 Minutes</option>
          <option value={15}>15 Minutes</option>
        </select>
        <button type="submit">Get Walkable Distances</button>
      </form>
      {/* Pass address and walkTime as props to IsochroneMap Component */}
      <IsochroneMap address={address} walkTime={walkTime} />
    </div>
  );
};

export default App;
