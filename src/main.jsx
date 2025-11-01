import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./Router.jsx";
import CustomCursor from "./components/ui/CustomCursor.jsx";
import { PopupProvider } from "./components/ui/PopupProvider.jsx";
import { UploadProvider } from "./context/UploadContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UploadProvider>
      <PopupProvider>
        <CustomCursor />
        <RouterProvider router={router} />
      </PopupProvider>
    </UploadProvider>
  </StrictMode>
);
