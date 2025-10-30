import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./Router.jsx";
import CustomCursor from "./components/ui/CustomCursor.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CustomCursor />
    <RouterProvider router={router} />
  </StrictMode>
);
