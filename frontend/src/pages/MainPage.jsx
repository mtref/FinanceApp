import React, { useState, useEffect, useMemo, useRef } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import {
  XCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  PlusCircle,
  Coffee,
  BarChart3,
  User,
  Calendar,
  Wallet,
  Users,
  Table,
  Percent,
  X,
  Trash2, // Correctly imported here
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";

import FormattedAmount from "../components/FormattedAmount.jsx";
import { toYYYYMMDD } from "../utils/dateUtils.js";

const MainPage = ({ setView }) => {
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [splitBill, setSplitBill] = useState(false);
  const [billDate, setBillDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [shopName, setShopName] = useState("");
  const [payerId, setPayerId] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [contributions, setContributions] = useState([]);
  const [creditId, setCreditId] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDate, setCreditDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [debitId, setDebitId] = useState(null);
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDate, setDebitDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [allTx, setAllTx] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [filterName, setFilterName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState(null);
  const [filterDateValue, setFilterDateValue] = useState({
    startDate: null,
    endDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [billDetails, setBillDetails] = useState({
    isOpen: false,
    loading: false,
    data: null,
  });

  const [showTaxInput, setShowTaxInput] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [taxApplied, setTaxApplied] = useState(false);

  const [allShops, setAllShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopMenu, setSelectedShopMenu] = useState([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [participantOrder, setParticipantOrder] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  const addParticipantInputRef = useRef(null);
  const splitBillShopNameRef = useRef(null);
  const creditAmountRef = useRef(null);
  const debitAmountRef = useRef(null);
  const deletePasswordRef = useRef(null);
  const taxInputRef = useRef(null);

  useEffect(() => {
    if (adding) setTimeout(() => addParticipantInputRef.current?.focus(), 100);
    if (splitBill) setTimeout(() => splitBillShopNameRef.current?.focus(), 100);
    if (creditId) setTimeout(() => creditAmountRef.current?.focus(), 100);
    if (debitId) setTimeout(() => debitAmountRef.current?.focus(), 100);
    if (deleteId) setTimeout(() => deletePasswordRef.current?.focus(), 100);
  }, [adding, splitBill, creditId, debitId, deleteId]);

  useEffect(() => {
    if (showTaxInput) {
      setTimeout(() => taxInputRef.current?.focus(), 100);
    }
  }, [showTaxInput]);

  const loadParticipants = async () => {
    const res = await fetch("/api/participants");
    const data = await res.json();
    setParticipants(data.filter((p) => !p.deleted));
    setContributions(
      data
        .filter((p) => !p.deleted)
        .map((p) => ({ id: p.id, amount: "", items: [] }))
    );
  };

  const loadAllTx = async () => {
    const res = await fetch("/api/transactions");
    const data = await res.json();
    setAllTx(
      data.map((tx) => ({
        ...tx,
        shop: tx.shop ?? (tx.amount > 0 ? "إيداع في الحساب" : "غير معروف"),
      }))
    );
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadParticipants(), loadAllTx()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const openSplitBillModal = async () => {
    try {
      const res = await fetch("/api/menus/shops");
      if (!res.ok) throw new Error("فشل في تحميل قائمة المقاهي");
      const data = await res.json();
      setAllShops(data);
    } catch (error) {
      toast.error(error.message);
      setAllShops([]);
    }
    setSplitBill(true);
  };

  const handleShopSelectionChange = async (shopId) => {
    setSelectedShopId(shopId);
    setContributions(
      participants.map((p) => ({ id: p.id, amount: "", items: [] }))
    );
    setBillAmount("");
    setTaxApplied(false);
    if (!shopId) {
      setSelectedShopMenu([]);
      setShopName("");
      return;
    }
    try {
      setIsMenuLoading(true);
      const res = await fetch(`/api/menus/shops/${shopId}`);
      if (!res.ok) throw new Error("فشل في تحميل القائمة");
      const data = await res.json();
      setSelectedShopMenu(data.menu_items || []);
      setShopName(data.name || "");
    } catch (error) {
      toast.error(error.message);
      setSelectedShopMenu([]);
    } finally {
      setIsMenuLoading(false);
    }
  };

  const openItemSelectionModal = (participantId) => {
    setEditingParticipant(participantId);
    const currentContribution = contributions.find(
      (c) => c.id === participantId
    );
    setParticipantOrder(currentContribution?.items || []);
    setIsItemModalOpen(true);
  };

  const handleItemSelect = (item) => {
    setParticipantOrder((currentOrder) => [...currentOrder, item]);
  };

  const handleItemRemove = (itemIndexToRemove) => {
    setParticipantOrder((currentOrder) =>
      currentOrder.filter((_, index) => index !== itemIndexToRemove)
    );
  };

  const confirmParticipantOrder = () => {
    const total = participantOrder.reduce((sum, item) => sum + item.price, 0);
    const updatedContributions = contributions.map((c) =>
      c.id === editingParticipant
        ? {
            ...c,
            amount: total > 0 ? total.toFixed(3) : "",
            items: participantOrder,
          }
        : c
    );
    setContributions(updatedContributions);
    const totalBill = updatedContributions.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );
    setBillAmount(totalBill > 0 ? totalBill.toFixed(3) : "");
    setIsItemModalOpen(false);
    setEditingParticipant(null);
    setParticipantOrder([]);
  };

  const resetSplitBill = () => {
    setSplitBill(false);
    setBillDate({ startDate: new Date(), endDate: new Date() });
    setShopName("");
    setBillAmount("");
    setPayerId("");
    setContributions(
      participants.map((p) => ({ id: p.id, amount: "", items: [] }))
    );
    setShowTaxInput(false);
    setTaxRate("");
    setTaxApplied(false);
    setAllShops([]);
    setSelectedShopId("");
    setSelectedShopMenu([]);
    setIsItemModalOpen(false);
    setEditingParticipant(null);
    setParticipantOrder([]);
  };

  const handleApplyTax = () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("الرجاء إدخال نسبة ضريبة صحيحة");
      return;
    }
    const taxMultiplier = 1 + rate / 100;
    const newContributions = contributions.map((c) => {
      const amount = parseFloat(c.amount);
      return !isNaN(amount) && amount > 0
        ? { ...c, amount: (amount * taxMultiplier).toFixed(3) }
        : c;
    });
    setContributions(newContributions);
    const totalBill = newContributions.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );
    setBillAmount(totalBill > 0 ? totalBill.toFixed(3) : "");
    setShowTaxInput(false);
    setTaxRate("");
    setTaxApplied(true);
  };

  const handleCardClick = (name) => {
    setFilterName((prev) => (prev === name ? "" : name));
  };

  const handleShopClick = async (shop, date) => {
    if (shop === "إيداع في الحساب" || shop === "خصم نقدي من الحساب") return;
    setBillDetails({ isOpen: true, loading: true, data: null });
    try {
      const res = await fetch(
        `/api/bill-details?shop=${encodeURIComponent(shop)}&date=${date}`
      );
      if (!res.ok) throw new Error("Could not fetch bill details.");
      const data = await res.json();
      setBillDetails({ isOpen: true, loading: false, data: data });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load bill details.");
      setBillDetails({ isOpen: false, loading: false, data: null });
    }
  };

  const handleSplitBillSubmit = async () => {
    const totalPaid = contributions.reduce(
      (sum, c) => sum + parseFloat(c.amount || 0),
      0
    );
    if (Math.abs(parseFloat(billAmount) - totalPaid) > 0.01)
      return toast.error(
        "يجب أن يكون إجمالي المدفوع من المشاركين مساوياً لإجمالي الفاتورة"
      );
    if (!payerId) return toast.error("الرجاء تحديد من قام بدفع الفاتورة");
    if (totalPaid <= 0) return toast.error("لا يمكن تسجيل فاتورة فارغة");
    const date = toYYYYMMDD(billDate.startDate);
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
      resetSplitBill();
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
      body: JSON.stringify({ name: trimmedName }),
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
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Please enter a valid positive amount.");
    const date = toYYYYMMDD(creditDate.startDate);
    const participant = participants.find((p) => p.id === creditId);
    await fetch(`/api/participants/${creditId}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date, shop: "إيداع في الحساب" }),
    });
    await loadParticipants();
    await loadAllTx();
    toast.success(
      <span>
        تم إيداع{" "}
        <span className="text-green-600 font-bold">{creditAmount}</span> ريال
        إلى حساب{" "}
        <span className="text-indigo-600 font-bold">{participant?.name}</span>
      </span>
    );
    setCreditId(null);
    setCreditAmount("");
    setCreditDate({ startDate: new Date(), endDate: new Date() });
  };

  const handleDebit = async () => {
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Please enter a valid positive amount.");
    const date = toYYYYMMDD(debitDate.startDate);
    const participant = participants.find((p) => p.id === debitId);
    await fetch(`/api/participants/${debitId}/debit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date }),
    });
    await loadParticipants();
    await loadAllTx();
    toast.error(
      <span>
        تم خصم <span className="text-red-600 font-bold">{debitAmount}</span>{" "}
        ريال من حساب{" "}
        <span className="text-indigo-600 font-bold">{participant?.name}</span>
      </span>
    );
    setDebitId(null);
    setDebitAmount("");
    setDebitDate({ startDate: new Date(), endDate: new Date() });
  };

  const handleDelete = async () => {
    if (deletePassword !== "123456")
      return toast.error("كلمة المرور غير صحيحة");
    const participant = participants.find((p) => p.id === deleteId);
    await fetch(`/api/participants/${deleteId}`, { method: "DELETE" });
    await loadParticipants();
    await loadAllTx();
    toast.error(
      <span>
        تم حذف{" "}
        <span className="text-red-700 font-bold">
          {participant?.name || "مشارك"}
        </span>{" "}
        بنجاح
      </span>
    );
    setDeleteId(null);
    setDeletePassword("");
  };

  const handleFilterDateChange = (newValue) => {
    setFilterDateValue(newValue);
    setFilterDate(newValue.startDate ? toYYYYMMDD(newValue.startDate) : null);
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () =>
      allTx.filter((tx) => {
        if (
          filterName &&
          !tx.name.toLowerCase().includes(filterName.toLowerCase())
        )
          return false;
        if (filterDate && tx.date !== filterDate) return false;
        return true;
      }),
    [allTx, filterName, filterDate]
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paged = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalOverallBalance = participants.reduce(
    (sum, p) => sum + p.balance,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-16 h-16 text-indigo-600 mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      key="main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-10">
          إدارة العزبة
        </h1>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            className="bg-green-600 text-white px-5 py-2 rounded-xl hover:bg-green-700 shadow"
            onClick={() => setAdding(true)}
          >
            ➕ إضافة مشارك
          </button>
          <button
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
            onClick={openSplitBillModal}
          >
            🧾 تقسيم الفاتورة
          </button>
          <button
            className="bg-purple-600 text-white px-5 py-2 rounded-xl hover:bg-purple-700 shadow flex items-center gap-2"
            onClick={() => setView("purchases")}
          >
            <ShoppingCart size={20} />
            العزبة الشهرية
          </button>
          <button
            className="bg-yellow-600 text-white px-5 py-2 rounded-xl hover:bg-yellow-700 shadow flex items-center gap-2"
            onClick={() => setView("menus")}
          >
            <Coffee size={20} />
            قوائم الطعام
          </button>
          <button
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow flex items-center gap-2"
            onClick={() => setView("dashboard")}
          >
            <BarChart3 size={20} />
            لوحة المعلومات
          </button>
          <button
            className="bg-teal-600 text-white px-5 py-2 rounded-xl hover:bg-teal-700 shadow flex items-center gap-2"
            onClick={() => {
              window.location.href =
                import.meta.env.VITE_TABLES_APP_URL || "http://localhost:3001";
            }}
          >
            <Table size={20} />
            جداول
          </button>
        </div>
        <div className="flex justify-center mb-10">
          <div className="bg-white p-6 rounded-xl shadow-lg w-72 text-center border-t-4 border-indigo-500">
            <h2 className="text-lg font-bold text-gray-700 mb-2">
              إجمالي المبلغ في الصندوق
            </h2>
            <p
              className={`text-2xl font-bold ${
                totalOverallBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              <FormattedAmount
                value={totalOverallBalance}
                mainSize="text-2xl"
                decimalSize="text-xl"
              />
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-12">
          {participants.map((p) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => handleCardClick(p.name)}
              className={`cursor-pointer rounded-xl shadow-md p-4 border-r-4 ${
                p.balance < 0
                  ? "border-red-500 bg-red-50 hover:bg-red-100"
                  : "border-green-500 bg-green-50 hover:bg-green-100"
              }`}
            >
              <h2 className="text-xl font-bold mb-1 text-gray-800">{p.name}</h2>
              <p className="text-lg mb-3">
                في حسابه:
                <span
                  className={`font-bold ${
                    p.balance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {" "}
                  <FormattedAmount value={p.balance} />
                </span>
              </p>
              <div className="flex justify-between items-center pt-2 border-t gap-2">
                <button
                  className="flex-1 bg-green-400 text-white px-2 py-1 rounded-md hover:bg-green-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreditId(p.id);
                  }}
                >
                  💰 إيداع
                </button>
                <button
                  className="flex-1 bg-red-400 text-white px-2 py-1 rounded-md hover:bg-red-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDebitId(p.id);
                  }}
                >
                  💸 خصم
                </button>
                <button
                  className="text-gray-500 hover:text-red-600"
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
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            سجل المعاملات
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4 pb-4 border-b">
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
            </div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border w-full md:w-auto focus:ring-2 focus:ring-indigo-300"
            >
              <option value={10}>عرض 10 نتائج</option>
              <option value={30}>عرض 30 نتيجة</option>
              <option value={100}>عرض 100 نتيجة</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead className="bg-indigo-100 text-indigo-800 font-bold uppercase">
                <tr>
                  <th className="p-3 border-b-2 border-indigo-200">التاريخ</th>
                  <th className="p-3 border-b-2 border-indigo-200">الاسم</th>
                  <th className="p-3 border-b-2 border-indigo-200">المبلغ</th>
                  <th className="p-3 border-b-2 border-indigo-200">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-500">
                      لا توجد معاملات مطابقة للبحث المستخدم.
                    </td>
                  </tr>
                ) : (
                  paged.map((tx, i) => {
                    const isClickableShop =
                      tx.shop !== "إيداع في الحساب" &&
                      tx.shop !== "خصم نقدي من الحساب";
                    return (
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
                          {tx.amount < 0 ? `- ` : `+ `}
                          <FormattedAmount value={Math.abs(tx.amount)} />
                        </td>
                        <td
                          className={`p-3 border-b text-gray-600 ${
                            isClickableShop
                              ? "cursor-pointer hover:text-indigo-600 hover:font-semibold"
                              : ""
                          }`}
                          onClick={() =>
                            isClickableShop && handleShopClick(tx.shop, tx.date)
                          }
                        >
                          {tx.shop}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-indigo-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-indigo-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <span>التالي</span>
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Modals */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setAdding(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-green-500"
            >
              <h2 className="text-2xl font-bold text-green-600 mb-4 border-b pb-2">
                ➕ إضافة مشارك جديد
              </h2>
              <input
                ref={addParticipantInputRef}
                type="text"
                className="w-full border border-green-300 focus:ring-2 focus:ring-green-400 p-2 rounded mb-4"
                value={name}
                placeholder="اكتب اسم المشترك"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
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
                  إضافة مشارك
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {splitBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={resetSplitBill}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-3xl"
            >
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
                    🏪 اختر المقهى
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded bg-white"
                      value={selectedShopId}
                      onChange={(e) =>
                        handleShopSelectionChange(e.target.value)
                      }
                      disabled={isMenuLoading}
                    >
                      <option value="">-- اختر مقهى --</option>
                      {allShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {isMenuLoading && (
                      <Loader className="w-5 h-5 animate-spin text-indigo-500" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    💸 اختر من قام بدفع الفاتورة
                  </label>
                  <select
                    className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded bg-white"
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
                    step="0.001"
                    readOnly
                    className="w-full border border-indigo-300 bg-gray-100 focus:ring-2 focus:ring-indigo-400 p-2 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={billAmount}
                    placeholder="الإجمالي يحسب تلقائياً"
                  />
                </div>
              </div>
              <div className="mt-6 border-t pt-4">
                {!showTaxInput ? (
                  <button
                    onClick={() => setShowTaxInput(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                    disabled={!billAmount || taxApplied}
                  >
                    <Percent size={16} />
                    إضافة ضريبة
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                    <label className="text-sm font-medium">نسبة الضريبة:</label>
                    <input
                      ref={taxInputRef}
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-20 border-indigo-300 rounded-md p-1 focus:ring-2 focus:ring-indigo-400"
                      placeholder="e.g., 5"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyTax()}
                    />
                    <span>%</span>
                    <button
                      onClick={handleApplyTax}
                      className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
                    >
                      تطبيق
                    </button>
                    <button
                      onClick={() => setShowTaxInput(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
              <div
                className={`mt-4 transition-opacity ${
                  isMenuLoading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <h3 className="text-lg font-semibold text-indigo-700 mb-3">
                  👥 المشاركون
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contributions.map((c) => {
                    const p = participants.find((p) => p.id === c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 shadow-sm"
                      >
                        <span className="font-medium text-gray-800 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                          {p?.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          readOnly
                          className="w-24 border border-indigo-300 bg-gray-100 p-1 rounded text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={c.amount}
                          placeholder="0.000"
                        />
                        <button
                          onClick={() => openItemSelectionModal(c.id)}
                          disabled={!selectedShopId || taxApplied}
                          className="bg-teal-500 text-white p-2 rounded-md hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  onClick={resetSplitBill}
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
            </motion.div>
          </motion.div>
        )}
        {isItemModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
            onClick={() => setIsItemModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[70vh] flex flex-col"
            >
              <div className="p-4 border-b">
                <h2 className="text-2xl font-bold text-teal-700">
                  اختر طلبات لـ{" "}
                  {participants.find((p) => p.id === editingParticipant)?.name}
                </h2>
              </div>
              <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/2 p-4 overflow-y-auto border-r">
                  <h3 className="text-lg font-semibold mb-3">القائمة</h3>
                  <div className="space-y-2">
                    {isMenuLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader className="animate-spin text-teal-500" />
                      </div>
                    ) : selectedShopMenu.length > 0 ? (
                      selectedShopMenu.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-teal-100 border border-gray-200"
                        >
                          <span className="text-gray-800">
                            {item.item_name}
                          </span>
                          <span className="font-semibold text-teal-600">
                            {(item.price || 0).toFixed(3)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">
                        لا توجد أصناف في هذا المقهى.
                      </p>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-1/2 p-4 bg-gray-50 flex flex-col overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-3">
                    الطلبات المختارة
                  </h3>
                  <div className="flex-grow space-y-2">
                    {participantOrder.length === 0 ? (
                      <p className="text-center text-gray-500 mt-10">
                        لم يتم اختيار أي طلب بعد.
                      </p>
                    ) : (
                      participantOrder.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm"
                        >
                          <span>{item.item_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-gray-700">
                              {(item.price || 0).toFixed(3)}
                            </span>
                            <button
                              onClick={() => handleItemRemove(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>الإجمالي:</span>
                      <span className="text-green-600">
                        {participantOrder
                          .reduce((sum, item) => sum + item.price, 0)
                          .toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setIsItemModalOpen(false)}
                  className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmParticipantOrder}
                  className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700"
                >
                  تأكيد الطلبات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {creditId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setCreditId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded p-6 w-80"
            >
              <h3 className="mb-4 text-lg">
                إيداع مبلغ لـ{" "}
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
                ref={creditAmountRef}
                type="number"
                min="0"
                step="0.001"
                className="w-full border p-2 mb-4 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="المبلغ"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCredit()}
              />
              <div className="flex justify-end gap-2">
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
                  إيداع
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {debitId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDebitId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded p-6 w-80 border-t-4 border-red-500"
            >
              <h3 className="mb-4 text-lg font-bold text-red-700">
                خصم مبلغ من حساب{" "}
                {participants.find((p) => p.id === debitId)?.name}
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
                ref={debitAmountRef}
                type="number"
                min="0"
                step="0.001"
                className="w-full border p-2 mb-4 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-red-300"
                placeholder="المبلغ المراد خصمه"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDebit()}
              />
              <div className="flex justify-end gap-2">
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
                  خصم
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded p-6 w-80"
            >
              <h3 className="mb-4 text-lg">
                تأكيد الحذف لـ{" "}
                {participants.find((p) => p.id === deleteId)?.name}
              </h3>
              <p className="mb-2 text-sm text-gray-700">
                أدخل كلمة المرور لحذف المشارك
              </p>
              <input
                ref={deletePasswordRef}
                type="password"
                className="w-full border p-2 mb-4 rounded"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="كلمة المرور"
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              />
              <div className="flex justify-end gap-2">
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
        {billDetails.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
            onClick={() =>
              setBillDetails({ isOpen: false, data: null, loading: false })
            }
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border-t-4 border-indigo-500"
            >
              {billDetails.loading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
              ) : (
                billDetails.data && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-indigo-800">
                        {billDetails.data.shop}
                      </h2>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar size={20} />
                        <span>{billDetails.data.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet size={20} />
                        <span className="font-bold text-indigo-600">
                          <FormattedAmount
                            value={billDetails.data.totalAmount}
                          />
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <User size={20} /> قام بالدفع:
                      </h3>
                      <p className="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-lg">
                        {billDetails.data.payer}
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Users size={20} /> المشاركون في الفاتورة:
                      </h3>
                      <ul className="space-y-2">
                        {billDetails.data.participants.map((p) => (
                          <li
                            key={p.name}
                            className="flex justify-between items-center bg-red-50 p-2 rounded-lg"
                          >
                            <span className="text-red-800">{p.name}</span>
                            <span className="font-semibold text-red-600">
                              <FormattedAmount value={p.amount} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MainPage;
