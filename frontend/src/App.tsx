import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";

const Landing = lazy(() => import("./pages/Landing"));

const LightFallback = <div style={{ background: "#fafaf8", height: "100dvh" }} />;

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={LightFallback}>
            <Landing />
          </Suspense>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/portfolio" element={<Portfolio />} />
    </Routes>
  );
}
