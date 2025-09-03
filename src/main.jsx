import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import DuotoneStudio from "./pages/DuotoneStudio";
import DuotoneStudioRegl from "./pages/DuotoneStudioRegl";
import TritoneStudio from "./pages/TritoneStudio";
import ToneStudioRegl from "./pages/ToneStudioRegl";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DuotoneStudioRegl />
  </React.StrictMode>
);
