import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import DuotoneStudio from "./pages/DuotoneStudio";
import DuotoneStudioRegl from "./pages/DuotoneStudioRegl";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* <DuotoneStudio /> */}
    <DuotoneStudioRegl />
  </React.StrictMode>
);
