import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Loader, ShoppingCart, Coffee, BarChart3, Table } from "lucide-react";

import ParticipantCard from "../components/main/ParticipantCard.jsx";
import TransactionsLog from "../components/main/TransactionsLog.jsx";
import MainPageModals from "../components/main/MainPageModals.jsx";
import FormattedAmount from "../components/FormattedAmount.jsx";
import BalanceWarning from "../components/BalanceWarning.jsx";
import { toYYYYMMDD } from "../utils/dateUtils.js";

const MainPage = ({ setView, currentUser }) => {
  // Core Data State
  const [participants, setParticipants] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterName, setFilterName] = useState("");

  // Modal Visibility State
  const [adding, setAdding] = useState(false);
  const [splitBill, setSplitBill] = useState(false);
  const [creditId, setCreditId] = useState(null);
  const [debitId, setDebitId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [billDetails, setBillDetails] = useState({
    isOpen: false,
    loading: false,
    data: null,
  });
  const [expandedParticipants, setExpandedParticipants] = useState({});

  // Form Input State
  const [name, setName] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDate, setCreditDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDate, setDebitDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [deletePassword, setDeletePassword] = useState("");

  // Split Bill State
  const [allShops, setAllShops] = useState([]);
  const [billDate, setBillDate] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [shopName, setShopName] = useState("");
  const [payerId, setPayerId] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [contributions, setContributions] = useState([]);
  const [showTaxInput, setShowTaxInput] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [taxApplied, setTaxApplied] = useState(false);

  // Item Selection State
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopMenu, setSelectedShopMenu] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [participantOrder, setParticipantOrder] = useState([]);

  // --- Data Loading ---
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

  // --- Handlers ---
  const handleCardClick = (name) => {
    setFilterName((prev) => (prev === name ? "" : name));
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

  const handleShopClick = async (shop, date) => {
    if (shop === "إيداع في الحساب" || shop === "خصم نقدي من الحساب") return;
    setBillDetails({ isOpen: true, loading: true, data: null });
    setExpandedParticipants({});
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

  // --- Split Bill Handlers ---
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
            items: c.items,
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

  // --- Item Selection Handlers ---
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

  const toggleParticipantExpansion = (name) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // --- Render Logic ---
  const totalOverallBalance = participants.reduce(
    (sum, p) => sum + p.balance,
    0
  );

  const currentUserData = useMemo(
    () => participants.find((p) => p.name === currentUser),
    [participants, currentUser]
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
        {currentUserData && currentUserData.balance < 0 && (
          <BalanceWarning userName={currentUser} />
        )}
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
            <ParticipantCard
              key={p.id}
              participant={p}
              onCardClick={handleCardClick}
              onCreditClick={setCreditId}
              onDebitClick={setDebitId}
              onDeleteClick={setDeleteId}
            />
          ))}
        </div>
        <TransactionsLog
          transactions={allTx}
          onShopClick={handleShopClick}
          filterName={filterName}
          setFilterName={setFilterName}
        />
      </div>
      <MainPageModals
        modalState={{
          adding,
          splitBill,
          creditId,
          debitId,
          deleteId,
          isItemModalOpen,
          expandedParticipants,
          formState: {
            name,
            setName,
            creditAmount,
            setCreditAmount,
            creditDate,
            setCreditDate,
            debitAmount,
            setDebitAmount,
            debitDate,
            setDebitDate,
            deletePassword,
            setDeletePassword,
          },
        }}
        handlers={{
          setAdding,
          setSplitBill,
          setCreditId,
          setDebitId,
          setDeleteId,
          setIsItemModalOpen,
          setBillDetails,
          addParticipant,
          handleCredit,
          handleDebit,
          handleDelete,
          resetSplitBill,
          handleSplitBillSubmit,
          handleApplyTax,
          handleShopSelectionChange,
          openItemSelectionModal,
          confirmParticipantOrder,
          handleItemSelect,
          handleItemRemove,
          toggleParticipantExpansion,
        }}
        participants={participants}
        allShops={allShops}
        splitBillData={{
          billDate,
          setBillDate,
          selectedShopId,
          isMenuLoading,
          payerId,
          setPayerId,
          billAmount,
          showTaxInput,
          setShowTaxInput,
          taxRate,
          setTaxRate,
          taxApplied,
          contributions,
        }}
        itemSelectionData={{
          editingParticipant,
          participantOrder,
          selectedShopMenu,
        }}
        billDetails={billDetails}
      />
    </motion.div>
  );
};

export default MainPage;
