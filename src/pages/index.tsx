import React, { useState } from "react";
import dynamic from "next/dynamic";

const MapWithNoSSR = dynamic(() => import("../components/MapWithNmi"), { ssr: false });

const Home: React.FC = () => {
  return <MapWithNoSSR />;
};

export default Home;
