import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { GameProvider } from "./context/GameProvider";
import Home from "./pages/Home";
import RoomRouter from "./pages/RoomRouter";

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:roomId" element={<RoomRouter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </GameProvider>
  );
}
