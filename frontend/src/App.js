import { BrowserRouter, Routes, Route } from "react-router-dom";
import ImportPage from "./pages/ImportPage";
import RepoDashboard from "./pages/RepoDashboard";
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <Toaster theme="dark" position="top-right" />
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/repo/:repoId" element={<RepoDashboard />} />
        <Route path="/repo/:repoId/:view" element={<RepoDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
