import React from "react";
import { Outlet, NavLink } from "react-router-dom";


export default function App() {
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container">
          <NavLink className="navbar-brand" to="/duotone">DuotoneStudio</NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}