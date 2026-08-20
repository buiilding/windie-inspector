import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Windie from "@/pages/Windie";
import SessionRoute from "@/pages/SessionRoute";
import { WindieProvider } from "@/context/WindieContext";

function App() {
  return (
    <div className="App h-full">
      <BrowserRouter>
        <WindieProvider>
          <Routes>
            <Route path="/" element={<Windie />} />
            <Route path="/sessions/:sessionId" element={<SessionRoute />} />
            <Route path="*" element={<Windie />} />
          </Routes>
          <Toaster
            position="top-right"
            theme="system"
            toastOptions={{
              style: {
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                borderRadius: "2px",
              },
            }}
          />
        </WindieProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
