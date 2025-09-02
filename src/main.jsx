import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App";
import DuotoneStudio from "./pages/DuotoneStudio";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Navigate to="/duotone" replace />} />
          <Route path="/duotone" element={<DuotoneStudio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);