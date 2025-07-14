import React from "react";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import FormattedAmount from "../FormattedAmount.jsx";

const ParticipantCard = ({
  participant,
  onCardClick,
  onCreditClick,
  onDebitClick,
  onDeleteClick,
}) => {
  const { id, name, balance } = participant;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={() => onCardClick(name)}
      className={`cursor-pointer rounded-xl shadow-md p-4 border-r-4 ${
        balance < 0
          ? "border-red-500 bg-red-50 hover:bg-red-100"
          : "border-green-500 bg-green-50 hover:bg-green-100"
      }`}
    >
      <h2 className="text-xl font-bold mb-1 text-gray-800">{name}</h2>
      <p className="text-lg mb-3">
        في حسابه:
        <span
          className={`font-bold ${
            balance < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {" "}
          <FormattedAmount value={balance} />
        </span>
      </p>
      <div className="flex justify-between items-center pt-2 border-t gap-2">
        <button
          className="flex-1 bg-green-400 text-white px-2 py-1 rounded-md hover:bg-green-600 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreditClick(id);
          }}
        >
          💰 إيداع
        </button>
        <button
          className="flex-1 bg-red-400 text-white px-2 py-1 rounded-md hover:bg-red-600 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDebitClick(id);
          }}
        >
          💸 خصم
        </button>
        <button
          className="text-gray-500 hover:text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(id);
          }}
        >
          <XCircle size={20} />
        </button>
      </div>
    </motion.div>
  );
};

export default ParticipantCard;
