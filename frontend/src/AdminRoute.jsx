import { useEffect } from "react";
import {
  Navigate,
  useNavigate,
} from "react-router-dom";

function AdminRoute({ children }) {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (
        event.key === "access_token" &&
        !event.newValue
      ) {
        navigate("/login", { replace: true });
      }

      if (
        event.key === "role" &&
        (!event.newValue || event.newValue !== "admin")
      ) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

export default AdminRoute;