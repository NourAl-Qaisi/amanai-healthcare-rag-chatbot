import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import AdminRoute from "./AdminRoute";

function AuthSync() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (
        event.storageArea !== localStorage ||
        event.key !== "access_token" ||
        event.newValue !== null
      ) {
        return;
      }

      setTimeout(() => {
        if (!localStorage.getItem("access_token")) {
          localStorage.removeItem("active_conversation_id");
          navigate("/login", { replace: true });
        }
      }, 100);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <>
      <AuthSync />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;