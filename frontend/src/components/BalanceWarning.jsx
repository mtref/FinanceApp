import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const BalanceWarning = ({ userName }) => {
  if (!userName) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md flex items-center gap-4 mb-6"
      role="alert"
    >
      <AlertTriangle className="h-6 w-6" />
      <div>
        <p className="font-bold">أهلاً بك {userName}،</p>
        <p>نود تذكيرك بأن حسابك بالسالب. الرجاء تسوية المبلغ المطلوب.</p>
      </div>
    </motion.div>
  );
};

export default BalanceWarning;
