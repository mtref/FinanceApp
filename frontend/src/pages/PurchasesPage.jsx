import React, { useState, useEffect, useMemo, useRef } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import {
  XCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  FileDown,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

import FormattedAmount from "../components/FormattedAmount";
import { toYYYYMMDD } from "../utils/dateUtils";

const PurchasesPage = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [totalCash, setTotalCash] = useState(0);
  const [names, setNames] = useState([]);
  const [namesWithStatus, setNamesWithStatus] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal] = useState(null);
  const [newName, setNewName] = useState("");
  const [formDate, setFormDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [formAmount, setFormAmount] = useState("");
  const [formNameId, setFormNameId] = useState("");
  const [formDetails, setFormDetails] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState("all");

  const addNameInputRef = useRef(null);
  const transactionAmountInputRef = useRef(null);

  useEffect(() => {
    if (modal === "addName") {
      setTimeout(() => addNameInputRef.current?.focus(), 100);
    }
    if (modal === "credit" || modal === "purchase") {
      setTimeout(() => transactionAmountInputRef.current?.focus(), 100);
    }
  }, [modal]);

  const fetchData = async () => {
    try {
      const [namesRes, transactionsRes, namesStatusRes] = await Promise.all([
        fetch("/api/purchases/names"),
        fetch("/api/purchases/transactions"),
        fetch("/api/purchases/names-status"),
      ]);
      const namesData = await namesRes.json();
      const transactionsData = await transactionsRes.json();
      const namesStatusData = await namesStatusRes.json();
      setNames(namesData);
      setTransactions(transactionsData.transactions);
      setTotalCash(transactionsData.totalCash);
      setNamesWithStatus(namesStatusData);
    } catch (error) {
      console.error("Error fetching purchases data:", error);
      toast.error("Failed to load purchases data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const pagedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const dataToExport = filteredTransactions.map(({ id, ...rest }) => ({
      ...rest,
      type: rest.type === "credit" ? "إيداع" : "شراء",
      amount: rest.type === "credit" ? rest.amount : -rest.amount,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
    XLSX.writeFile(workbook, "purchases_transactions.xlsx");
  };

  const resetForm = () => {
    setNewName("");
    setFormDate({ startDate: new Date(), endDate: new Date() });
    setFormAmount("");
    setFormNameId("");
    setFormDetails("");
    setModal(null);
  };

  const handleAddName = async () => {
    if (!newName.trim()) return toast.error("الرجاء كتابة الاسم");
    try {
      const res = await fetch("/api/purchases/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في كتابة الاسم");
      }
      toast.success(`'${newName}' تمت إضافته بنجاح`);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleTransaction = async (type) => {
    if (!formAmount || parseFloat(formAmount) <= 0)
      return toast.error("الرجاء ادخال المبلغ.");
    const payload = {
      date: toYYYYMMDD(formDate.startDate),
      amount: parseFloat(formAmount),
      type,
      name_id: formNameId || null,
      details: formDetails || null,
    };
    try {
      await fetch("/api/purchases/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(`تم تسجيل المعاملة بنجاح`);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("فشل في تسجيل المعاملة.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-16 h-16 text-purple-600 animate-spin" />
      </div>
    );
  }

  const renderModal = () => {
    switch (modal) {
      case "addName":
        return (
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-blue-500">
            <h2 className="text-2xl font-bold text-blue-600 mb-4 border-b pb-2">
              إضافة اسم جديد
            </h2>
            <input
              ref={addNameInputRef}
              type="text"
              className="w-full border border-blue-300 focus:ring-2 focus:ring-blue-400 p-2 rounded mb-4"
              value={newName}
              placeholder="اكتب الاسم"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddName()}
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                onClick={resetForm}
              >
                إلغاء
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handleAddName}
              >
                حفظ
              </button>
            </div>
          </div>
        );
      case "credit":
      case "purchase":
        const isCredit = modal === "credit";
        const themeColor = isCredit ? "green" : "red";
        const title = isCredit ? "إضافة مبلغ" : "تسجيل المشتريات";
        return (
          <div
            className={`bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg border-t-4 border-${themeColor}-500`}
          >
            <h2
              className={`text-2xl font-bold text-${themeColor}-700 mb-6 border-b pb-2`}
            >
              {title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  التاريخ
                </label>
                <Datepicker
                  asSingle={true}
                  useRange={false}
                  value={formDate}
                  onChange={setFormDate}
                  displayFormat="DD/MM/YYYY"
                  inputClassName={`w-full border border-gray-300 focus:ring-2 focus:ring-${themeColor}-400 p-2 rounded text-right`}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  المبلغ
                </label>
                <input
                  ref={transactionAmountInputRef}
                  type="number"
                  min="0"
                  step="0.001"
                  className={`w-full border border-gray-300 focus:ring-2 focus:ring-${themeColor}-400 p-2 rounded`}
                  value={formAmount}
                  placeholder="المبلغ"
                  onChange={(e) => setFormAmount(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleTransaction(modal)
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  الاسم
                </label>
                <select
                  className={`w-full border border-gray-300 focus:ring-2 focus:ring-${themeColor}-400 p-2 rounded bg-white`}
                  value={formNameId}
                  onChange={(e) => setFormNameId(e.target.value)}
                >
                  <option value="">-- اختر اسم --</option>
                  {names.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  التفاصيل
                </label>
                <textarea
                  className={`w-full border border-gray-300 focus:ring-2 focus:ring-${themeColor}-400 p-2 rounded`}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  rows="2"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleTransaction(modal)
                  }
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                onClick={resetForm}
              >
                إلغاء
              </button>
              <button
                className={`bg-${themeColor}-600 text-white px-4 py-2 rounded hover:bg-${themeColor}-700`}
                onClick={() => handleTransaction(modal)}
              >
                حفظ
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold text-purple-700 flex items-center gap-3">
          <ShoppingCart size={40} />
          العزبة الشهرية
        </h1>
        <button
          onClick={onBack}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
        >
          العودة للرئيسية
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg text-center border-t-4 border-purple-500 col-span-1 md:col-span-3">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            إجمالي المبلغ المتوفر
          </h2>
          <p
            className={`font-bold ${
              totalCash >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            <FormattedAmount
              value={totalCash}
              mainSize="text-3xl"
              decimalSize="text-2xl"
            />
          </p>
        </div>
      </div>
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setModal("addName")}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow flex items-center gap-2"
        >
          <PlusCircle size={20} />
          إضافة اسم
        </button>
        <button
          onClick={() => setModal("credit")}
          className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 shadow flex items-center gap-2"
        >
          <ArrowUpCircle size={20} />
          إضافة مبلغ
        </button>
        <button
          onClick={() => setModal("purchase")}
          className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 shadow flex items-center gap-2"
        >
          <ArrowDownCircle size={20} />
          تسجيل المشتريات
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          حالة الدفع (الأحمر لم يدفع آخر شهر)
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {namesWithStatus.map((person) => (
            <div
              key={person.id}
              className={`px-4 py-2 rounded-full text-white font-semibold text-sm shadow-md transition-colors ${
                person.hasSufficientCredit ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {person.name}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            سجل التحركات المالية
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleFilterChange("all")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterType === "all"
                  ? "bg-purple-600 text-white shadow"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => handleFilterChange("purchase")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterType === "purchase"
                  ? "bg-red-600 text-white shadow"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              شراء فقط
            </button>
            <button
              onClick={() => handleFilterChange("credit")}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterType === "credit"
                  ? "bg-green-600 text-white shadow"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              إيداع فقط
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border bg-white focus:ring-2 focus:ring-purple-300"
            >
              <option value={10}>10 لكل صفحة</option>
              <option value={20}>20 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
            </select>
            <button
              onClick={handleExport}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 shadow flex items-center gap-2"
            >
              <FileDown size={18} />
              تصدير
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="bg-purple-100 text-purple-800 font-bold uppercase">
              <tr>
                <th className="p-3">التاريخ</th>
                <th className="p-3">العملية</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {pagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-500">
                    لا توجد حركات مسجلة تطابق الفلتر.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-purple-50 border-b">
                    <td className="p-3">{tx.date}</td>
                    <td className="p-3 font-semibold">
                      {tx.type === "credit" ? (
                        <span className="text-green-600">إيداع</span>
                      ) : (
                        <span className="text-red-600">شراء</span>
                      )}
                    </td>
                    <td
                      className={`p-3 font-bold ${
                        tx.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}{" "}
                      <FormattedAmount
                        value={tx.amount}
                        mainSize="text-base"
                        decimalSize="text-sm"
                      />
                    </td>
                    <td className="p-3 text-gray-700">{tx.name || "---"}</td>
                    <td className="p-3 text-gray-600">{tx.details || "---"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-purple-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
              <span>السابق</span>
            </button>
            <span className="text-gray-700 font-medium">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-purple-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span>التالي</span>
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderModal()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PurchasesPage;
