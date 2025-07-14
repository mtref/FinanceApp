import React, { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MainPage from "./pages/MainPage";
import PurchasesPage from "./pages/PurchasesPage";
import MenusPage from "./pages/MenusPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [view, setView] = useState("main");

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
        return <MainPage setView={setView} />;
    }
  };

  return (
    <>
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
