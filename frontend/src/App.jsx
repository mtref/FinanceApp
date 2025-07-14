import React, { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MainPage from "./pages/MainPage";
import PurchasesPage from "./pages/PurchasesPage";
import MenusPage from "./pages/MenusPage";
import DashboardPage from "./pages/DashboardPage";
import UserSelectionModal from "./components/UserSelectionModal";
import { Loader } from "lucide-react";

export default function App() {
  const [view, setView] = useState("main");
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("currentUser") || null
  );
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await fetch("/api/participants");
        const data = await res.json();
        setParticipants(data);
      } catch (error) {
        console.error("Failed to fetch participants for user selection", error);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  const handleUserSelect = (userName) => {
    localStorage.setItem("currentUser", userName);
    setCurrentUser(userName);
  };

  const renderView = () => {
    switch (view) {
      case "purchases":
        return <PurchasesPage onBack={() => setView("main")} />;
      case "menus":
        return <MenusPage onBack={() => setView("main")} />;
      case "dashboard":
        return <DashboardPage onBack={() => setView("main")} />;
      case "main":
      default:
        return <MainPage setView={setView} currentUser={currentUser} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-16 h-16 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {!currentUser && participants.length > 0 && (
        <UserSelectionModal
          participants={participants}
          onUserSelect={handleUserSelect}
        />
      )}
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-10 px-4"
      >
        {renderView()}
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}
