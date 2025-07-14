import React, { useState } from "react";
import { motion } from "framer-motion";

const UserSelectionModal = ({ participants, onUserSelect }) => {
  const [selectedUser, setSelectedUser] = useState("");

  const handleSelect = () => {
    if (selectedUser) {
      onUserSelect(selectedUser);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl border-t-4 border-teal-500 text-center"
      >
        <h2 className="text-2xl font-bold text-teal-700 mb-4">
          أهلاً بك في تطبيق العزبة
        </h2>
        <p className="text-gray-600 mb-6">
          لتجربة أفضل، الرجاء تحديد اسمك من القائمة.
        </p>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full border border-teal-300 focus:ring-2 focus:ring-teal-400 p-3 rounded-lg mb-6 bg-white text-lg"
        >
          <option value="">-- اختر اسمك --</option>
          {participants.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleSelect}
          disabled={!selectedUser}
          className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold"
        >
          دخول
        </button>
      </motion.div>
    </motion.div>
  );
};

export default UserSelectionModal;
