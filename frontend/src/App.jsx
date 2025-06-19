// تحديث App.jsx - إصلاح خطأ 400 أثناء الخصم من المشاركين
import React, { useState, useEffect, useMemo } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { XCircle, Loader, ChevronLeft, ChevronRight } from "lucide-react"; // ⬅️ Import new icons
import { AnimatePresence, motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  // ... (all your existing state declarations remain the same)
  const [participants, setParticipants] = useState([]);
  const [rawParticipants, setRawParticipants] = useState([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [splitBill, setSplitBill] = useState(false);
  const [billDate, setBillDate] = useState({
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });
  const [shopName, setShopName] = useState("");
  const [payerId, setPayerId] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [contributions, setContributions] = useState([]);
  const [creditId, setCreditId] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDate, setCreditDate] = useState({
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });
  // START: NEW STATE FOR DEBIT MODAL
  const [debitId, setDebitId] = useState(null);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDate, setDebitDate] = useState({
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });
  // END: NEW STATE FOR DEBIT MODAL
  const [allTx, setAllTx] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const [filterName, setFilterName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10); // ⬅️ Changed default for better view
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState(null);
  const [filterDateValue, setFilterDateValue] = useState({
    startDate: null,
    endDate: null,
  });
  const [loading, setLoading] = useState(true);

  // ... (all your existing functions like loadParticipants, loadAllTx, etc. remain the same)
  const loadParticipants = async () => {
    const res = await fetch("/api/participants");
    const data = await res.json();
    const active = data.filter((p) => !p.deleted); // ⬅️ استبعاد المحذوفين
    setParticipants(active);
    setRawParticipants(data); // ⬅️ كل المشاركين، نستخدمهم للمعاملات
    setContributions(active.map((p) => ({ id: p.id, amount: "" })));
  };

  const loadAllTx = async () => {
    const res = await fetch("/api/transactions");
    const data = await res.json();
    const withShop = data.map((tx) => ({
      ...tx,
      shop: tx.shop ?? (tx.amount > 0 ? "إضافة رصيد" : "خصم"),
    }));
    setAllTx(withShop);
  };

  useEffect(() => {
    setLoading(true); // 👈 move this out to run immediately
    const fetchData = async () => {
      try {
        await Promise.all([loadParticipants(), loadAllTx()]);
      } catch (error) {
        console.error("❌ Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCardClick = (name) => {
    // If the clicked name is already the active filter, clear the filter (toggle off).
    if (filterName === name) {
      setFilterName("");
    } else {
      // Otherwise, set the filter to the clicked participant's name.
      setFilterName(name);
    }
  };

  const handleSplitBillSubmit = async () => {
    const totalPaid = contributions.reduce(
      (sum, c) => sum + parseFloat(c.amount || 0),
      0
    );
    if (parseFloat(billAmount) !== totalPaid) {
      toast.error(
        "يجب أن يكون إجمالي المدفوع من المشاركين مساوياً لإجمالي الفاتورة"
      );
      return;
    }
    if (!payerId) {
      toast.error("الرجاء تحديد من قام بدفع الفاتورة");
      return;
    }

    const date = new Date(billDate.startDate).toISOString().split("T")[0];
    const payerName =
      participants.find((p) => String(p.id) === String(payerId))?.name || "";

    try {
      await fetch(`/api/participants/${payerId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(billAmount),
          date,
          shop: shopName || "غير معروف",
        }),
      });

      for (const c of contributions) {
        const value = parseFloat(c.amount);
        if (!c.amount || isNaN(value) || value <= 0) continue;

        await fetch(`/api/participants/${c.id}/credit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: -Math.abs(value),
            date,
            shop: shopName || "غير معروف",
          }),
        });
      }

      toast.success(
        <span>
          تم تسجيل فاتورة لصالح{" "}
          <span className="text-blue-700 font-semibold">{payerName}</span> بمبلغ{" "}
          <span className="text-green-600 font-bold">{billAmount} ريال</span>
        </span>
      );

      setSplitBill(false);
      setShopName("");
      setBillAmount("");
      setPayerId("");
      await loadAllTx();
      await loadParticipants();
    } catch (err) {
      console.error("Error submitting bill split:", err);
      toast.error("حدث خطأ أثناء الحفظ. الرجاء المحاولة لاحقاً.");
    }
  };

  const addParticipant = async () => {
    if (!name.trim()) return;
    const trimmedName = name.trim();
    await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    toast.success(
      <span>
        تمت إضافة{" "}
        <span className="text-green-800 font-semibold">{trimmedName}</span>{" "}
        بنجاح
      </span>
    );
    setName("");
    setAdding(false);
    await loadParticipants();
    await loadAllTx();
  };

  const handleCredit = async () => {
    const date = new Date(creditDate.startDate).toISOString().split("T")[0];
    const participant = participants.find((p) => p.id === creditId);
    await fetch(`/api/participants/${creditId}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(creditAmount),
        date,
        shop: "إيداع في الحساب",
      }),
    });
    setCreditId(null);
    setCreditAmount("");
    setCreditDate({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });
    await loadParticipants();
    await loadAllTx();
    toast.success(
      <span>
        تمت إضافة{" "}
        <span className="text-green-600 font-bold">{creditAmount}</span> إلى{" "}
        <span className="text-indigo-600 font-bold">{participant?.name}</span>
      </span>
    );
  };

  // START: NEW FUNCTION TO HANDLE DEBIT
  const handleDebit = async () => {
    const date = new Date(debitDate.startDate).toISOString().split("T")[0];
    const participant = participants.find((p) => p.id === debitId);
    await fetch(`/api/participants/${debitId}/debit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(debitAmount), date }),
    });
    setDebitId(null);
    setDebitAmount("");
    setDebitDate({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });
    await loadParticipants();
    await loadAllTx();
    toast.error(
      // Using toast.error for visual distinction
      <span>
        تم خصم <span className="text-red-600 font-bold">{debitAmount}</span> من{" "}
        <span className="text-indigo-600 font-bold">{participant?.name}</span>
      </span>
    );
  };
  // END: NEW FUNCTION TO HANDLE DEBIT

  const handleDelete = async () => {
    if (deletePassword !== "123456")
      return toast.error("كلمة المرور غير صحيحة");
    const participant = participants.find((p) => p.id === deleteId);
    const name = participant?.name || "مشارك";
    await fetch(`/api/participants/${deleteId}`, { method: "DELETE" });
    toast.error(
      <span>
        تم حذف <span className="text-red-700 font-bold">{name}</span> بنجاح
      </span>
    );
    setDeleteId(null);
    setDeletePassword("");
    await loadParticipants();
    await loadAllTx();
  };

  const handleFilterDateChange = (newValue) => {
    if (!newValue.startDate) {
      setFilterDate(null);
      setFilterDateValue({ startDate: null, endDate: null });
    } else {
      const selected = new Date(newValue.startDate).toISOString().split("T")[0];
      setFilterDateValue({ startDate: selected, endDate: selected });
      setFilterDate(selected);
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return allTx.filter((tx) => {
      if (
        filterName &&
        !tx.name.toLowerCase().includes(filterName.toLowerCase())
      )
        return false;
      if (filterDate && tx.date !== filterDate) return false;
      return true;
    });
  }, [allTx, filterName, filterDate]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paged = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPositiveBalance = participants.reduce(
    (sum, p) => sum + (p.balance > 0 ? p.balance : 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="text-center animate-pulse">
          <Loader className="w-16 h-16 text-indigo-600 mx-auto animate-spin" />
          <p className="mt-4 text-xl text-indigo-700 font-semibold">
            جاري تحميل البيانات...
          </p>
        </div>
      </div>
    );
  }

  // ... (The top part of your return statement remains the same)
  return (
    <>
      <div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-10 px-4 el-messiri"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-10">
            إدارة العزبة{" "}
          </h1>

          <div className="flex justify-center gap-4 mb-8">
            <button
              className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 shadow"
              onClick={() => setAdding(true)}
            >
              ➕ إضافة مشارك
            </button>
            <button
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
              onClick={() => setSplitBill(true)}
            >
              🧾 تقسيم الفاتورة
            </button>
          </div>

          <div className="flex justify-center mb-10">
            <div className="bg-white p-6 rounded-xl shadow-lg w-72 text-center border-t-4 border-indigo-500">
              <h2 className="text-lg font-bold text-gray-700 mb-2">
                إجمالي المبلغ في الصندوق{" "}
              </h2>
              <p className="text-2xl text-green-600 font-bold">
                {totalPositiveBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-12">
            <AnimatePresence>
              {participants.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  onClick={() => handleCardClick(p.name)}
                  className={`cursor-pointer rounded-xl shadow-md p-4 border-r-4 ${
                    // Added cursor-pointer and thicker border
                    p.balance < 0
                      ? "border-red-500 bg-red-50 hover:bg-red-100" // Added hover
                      : "border-green-500 bg-green-50 hover:bg-green-100" // Added hover
                  }`}
                >
                  <h2 className="text-xl font-bold mb-1 text-gray-800">
                    {p.name}
                  </h2>
                  <p className="text-lg mb-3">
                    {" "}
                    {/* Added margin-bottom */}
                    في حسابه:
                    <span
                      className={`font-bold ${
                        // Made font bold
                        p.balance < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {" "}
                      {p.balance.toFixed(2)}
                    </span>
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t gap-2">
                    {" "}
                    {/* Added border-top */}
                    <button
                      className="flex-1 bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 text-sm"
                      // ✨ FIX: Add event (e) and call stopPropagation
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreditId(p.id);
                      }}
                    >
                      💰 إيداع
                    </button>
                    <button
                      className="flex-1 bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebitId(p.id);
                      }}
                    >
                      💸 خصم
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-600"
                      // ✨ FIX: Add event (e) and call stopPropagation
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(p.id);
                      }}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            {" "}
            {/* ⬅️ Added shadow-lg & more padding */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {" "}
              {/* ⬅️ Styled heading */}
              سجل المعاملات
            </h2>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4 pb-4 border-b">
              {" "}
              {/* ⬅️ Added border */}
              <div className="relative w-full md:w-1/3">
                <input
                  type="text"
                  placeholder="بحث بالاسم..."
                  className="px-3 py-2 rounded-lg border w-full focus:ring-2 focus:ring-indigo-300"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
                {filterName && (
                  <XCircle
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer hover:text-red-500"
                    size={20}
                    onClick={() => setFilterName("")}
                  />
                )}
              </div>
              <div className="relative w-full md:w-auto">
                <Datepicker
                  value={filterDateValue}
                  asSingle={true}
                  useRange={false}
                  onChange={handleFilterDateChange}
                  placeholder="تصفية بالتاريخ"
                  inputClassName="px-3 py-2 rounded-lg border w-full text-right pr-10 focus:ring-2 focus:ring-indigo-300"
                  displayFormat="YYYY-MM-DD"
                  toggleClassName="absolute left-0 h-full px-3 text-indigo-500"
                />
                {filterDate && (
                  <button
                    onClick={() => handleFilterDateChange({ startDate: null })}
                    className="absolute top-1/2 left-10 transform -translate-y-1/2" // Adjusted position
                  ></button>
                )}
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border w-full md:w-auto focus:ring-2 focus:ring-indigo-300"
              >
                <option value={5}>5 لكل صفحة</option>
                <option value={10}>10 لكل صفحة</option>
                <option value={20}>20 لكل صفحة</option>
                <option value={50}>50 لكل صفحة</option>
              </select>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-collapse">
                <thead className="bg-indigo-100 text-indigo-800 font-bold uppercase">
                  <tr>
                    <th className="p-3 border-b-2 border-indigo-200">
                      التاريخ
                    </th>
                    <th className="p-3 border-b-2 border-indigo-200">الاسم</th>
                    <th className="p-3 border-b-2 border-indigo-200">المبلغ</th>
                    <th className="p-3 border-b-2 border-indigo-200">
                      التفاصيل
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-10 text-gray-500"
                      >
                        لا توجد معاملات مطابقة للمعايير المحددة.
                      </td>
                    </tr>
                  ) : (
                    paged.map((tx, i) => (
                      <tr
                        key={`${tx.id}-${i}`}
                        className={`hover:bg-indigo-50 transition-colors duration-200 ${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-3 border-b">{tx.date}</td>
                        <td className="p-3 border-b font-medium text-gray-800">
                          {tx.name}
                        </td>
                        <td
                          className={`p-3 border-b font-semibold ${
                            tx.amount < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {tx.amount < 0
                            ? `- ${Math.abs(tx.amount).toFixed(2)}`
                            : `+ ${tx.amount.toFixed(2)}`}
                        </td>
                        <td className="p-3 border-b text-gray-600">
                          {tx.shop}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* START: New Pagination UI */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
                {/* Previous Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-indigo-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                  <span>السابق</span>
                </button>

                {/* Page Info */}
                <span className="text-gray-700 font-medium">
                  صفحة {currentPage} من {totalPages}
                </span>

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-indigo-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
            {/* END: New Pagination UI */}
          </div>
        </div>
      </div>
      {/* ... (All your existing Modals and ToastContainer remain the same) */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-green-500">
              <h2 className="text-2xl font-bold text-green-600 mb-4 border-b pb-2">
                ➕ إضافة مشارك جديد
              </h2>
              <input
                type="text"
                className="w-full border border-green-300 focus:ring-2 focus:ring-green-400 p-2 rounded mb-4"
                value={name}
                placeholder="اكتب اسم المشارك"
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  onClick={() => setAdding(false)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={addParticipant}
                >
                  حفظ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {splitBill && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-auto"
          >
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-3xl">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-2">
                🧾 تقسيم الفاتورة
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    📅 التاريخ
                  </label>
                  <Datepicker
                    asSingle={true}
                    useRange={false}
                    value={billDate}
                    onChange={setBillDate}
                    displayFormat="DD/MM/YYYY"
                    inputClassName="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded text-right pl-10"
                    toggleClassName="absolute left-0 h-full px-3 text-indigo-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    🏪 اسم المقهى
                  </label>
                  <input
                    type="text"
                    className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    💸 من دفع الفاتورة
                  </label>
                  <select
                    className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded"
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                  >
                    <option value="">اختر من قام بدفع الفاتورة</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    💰 إجمالي الفاتورة
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-indigo-700 mb-3">
                  👥 المشاركون
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {contributions.map((c, idx) => {
                    const p = participants.find((p) => p.id === c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex justify-between items-center border border-indigo-200 bg-indigo-50 rounded-lg px-4 py-2 shadow-sm"
                      >
                        <span className="font-medium text-gray-800">
                          {p?.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="w-24 border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-1 rounded text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={c.amount}
                          onChange={(e) => {
                            const updated = [...contributions];
                            updated[idx].amount = e.target.value;
                            setContributions(updated);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  onClick={() => setSplitBill(false)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  onClick={handleSplitBillSubmit}
                >
                  💾 حفظ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creditId && (
          // ... (Credit Modal remains the same)
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded p-6 w-80">
              <h3 className="mb-4 text-lg">
                إضافة مبلغ لـ{" "}
                {participants.find((p) => p.id === creditId)?.name}
              </h3>
              <div className="relative">
                <Datepicker
                  asSingle={true}
                  useRange={false}
                  value={creditDate}
                  onChange={setCreditDate}
                  displayFormat="DD/MM/YYYY"
                  inputClassName="w-full border p-2 mb-4 text-right rounded pl-10"
                  toggleClassName="absolute left-0 h-full px-3 text-gray-400"
                />
              </div>
              <input
                type="number"
                min="0"
                className="w-full border p-2 mb-4 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="المبلغ"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-300 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  onClick={() => setCreditId(null)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  onClick={handleCredit}
                >
                  اعتماد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* START: NEW MODAL FOR DEBIT */}
      <AnimatePresence>
        {debitId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded p-6 w-80 border-t-4 border-red-500">
              <h3 className="mb-4 text-lg font-bold text-red-700">
                خصم مبلغ من {participants.find((p) => p.id === debitId)?.name}
              </h3>
              <div className="relative">
                <Datepicker
                  asSingle={true}
                  useRange={false}
                  value={debitDate}
                  onChange={setDebitDate}
                  displayFormat="DD/MM/YYYY"
                  inputClassName="w-full border p-2 mb-4 text-right rounded pl-10 focus:ring-2 focus:ring-red-300"
                  toggleClassName="absolute left-0 h-full px-3 text-gray-400"
                />
              </div>
              <input
                type="number"
                min="0"
                className="w-full border p-2 mb-4 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-red-300"
                placeholder="المبلغ المراد خصمه"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-300 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  onClick={() => setDebitId(null)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={handleDebit}
                >
                  خصم المبلغ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* END: NEW MODAL FOR DEBIT */}

      <AnimatePresence>
        {creditId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded p-6 w-80">
              <h3 className="mb-4 text-lg">
                إضافة رصيد لـ{" "}
                {participants.find((p) => p.id === creditId)?.name}
              </h3>
              <div className="relative">
                <Datepicker
                  asSingle={true}
                  useRange={false}
                  value={creditDate}
                  onChange={setCreditDate}
                  displayFormat="DD/MM/YYYY"
                  inputClassName="w-full border p-2 mb-4 text-right rounded pl-10"
                  toggleClassName="absolute left-0 h-full px-3 text-gray-400"
                />
              </div>
              <input
                type="number"
                min="0"
                className="w-full border p-2 mb-4 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="المبلغ"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-300 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  onClick={() => setCreditId(null)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  onClick={handleCredit}
                >
                  اعتماد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded p-6 w-80">
              <h3 className="mb-4 text-lg">تأكيد الحذف</h3>
              <p className="mb-2 text-sm text-gray-700">
                أدخل كلمة المرور لحذف المشارك
              </p>
              <input
                type="password"
                className="w-full border p-2 mb-4 rounded"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="كلمة المرور"
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-300 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  onClick={() => setDeleteId(null)}
                >
                  إلغاء
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={handleDelete}
                >
                  حذف
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer position="top-right" autoClose={5000} />
    </>
  );
}
