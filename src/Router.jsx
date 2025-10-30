import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import PredictPage from "./pages/PredictPage.jsx";
import GradcamPage from "./pages/GradcamPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/predict",
    element: <PredictPage />,
  },
  {
    path: "/gradcam",
    element: <GradcamPage />,
  },
  {
    path: "/report",
    element: <ReportPage />,
  },
]);

export default router;
