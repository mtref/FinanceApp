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
  Coffee,
  Utensils,
  Trash2,
  Edit,
  Save,
  X,
  Percent,
  BarChart3,
  FileDown,
  User,
  Calendar,
  Wallet,
  Users
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
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


// Helper function to format dates correctly, avoiding timezone issues.
const toYYYYMMDD = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Component to format numbers with different styles for integer and decimal parts.
const FormattedAmount = ({ value, mainSize = 'text-lg', decimalSize = 'text-base' }) => {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const absValue = Math.abs(num);

  const [integerPart, decimalPart] = absValue.toFixed(3).split('.');

  return (
    <span className="inline-flex items-baseline leading-none" dir="ltr">
      {isNegative && <span className={mainSize}>-</span>}
      <span className={mainSize}>{integerPart}</span>
      <span className={`${decimalSize} opacity-70`}>.{decimalPart}</span>
    </span>
  );
};


// ===================================================================================
// PURCHASES PAGE COMPONENT
// ===================================================================================
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

  // State for pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState("all"); // 'all', 'purchase', 'credit'

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

  // Filter and pagination calculations
  const filteredTransactions = useMemo(() => {
    if (filterType === "all") {
      return transactions;
    }
    return transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const pagedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleExport = () => {
    const dataToExport = filteredTransactions.map(({ id, ...rest }) => ({
      ...rest,
      type: rest.type === 'credit' ? 'إيداع' : 'شراء',
      amount: rest.type === 'credit' ? rest.amount : -rest.amount,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
    XLSX.writeFile(workbook, "purchases_transactions.xlsx");
  };

  const resetForm = () => {
    setNewName("");
    setFormDate({
      startDate: new Date(),
      endDate: new Date(),
    });
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
      type: type,
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
            إجمالي النقد المتوفر
          </h2>
          <p
            className={`font-bold ${
              totalCash >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            <FormattedAmount value={totalCash} mainSize="text-3xl" decimalSize="text-2xl" />
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
            حالة الاشتراكات (آخر 30 يوم)
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
            {namesWithStatus.map(person => (
            <div 
                key={person.id}
                className={`px-4 py-2 rounded-full text-white font-semibold text-sm shadow-md transition-colors ${
                person.hasSufficientCredit ? 'bg-green-500' : 'bg-red-500'
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
            سجل الحركات المالية
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
                setCurrentPage(1); // Reset to first page when items per page changes
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
                      <FormattedAmount value={tx.amount} mainSize="text-base" decimalSize="text-sm"/>
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

// ===================================================================================
// MENUS PAGE COMPONENT
// ===================================================================================
const MenusPage = ({ onBack }) => {
  const [view, setView] = useState("list");
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [newShopName, setNewShopName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  // New state for confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const addShopInputRef = useRef(null);
  const addItemNameInputRef = useRef(null);
  const editingPriceInputRef = useRef(null);

  useEffect(() => {
    if (modal === "addShop") {
      setTimeout(() => addShopInputRef.current?.focus(), 100);
    }
    if (modal === "addItem") {
      setTimeout(() => addItemNameInputRef.current?.focus(), 100);
    }
  }, [modal]);

  useEffect(() => {
    if (editingItemId && editingPriceInputRef.current) {
      setTimeout(() => {
        editingPriceInputRef.current.focus();
        editingPriceInputRef.current.select();
      }, 100);
    }
  }, [editingItemId]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menus/shops");
      const data = await res.json();
      setShops(data);
    } catch (error) {
      toast.error("فشل في عرض قائمة المقاهي");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSelectShop = async (shop) => {
    setSelectedShop(shop);
    setLoading(true);
    try {
      const res = await fetch(`/api/menus/shops/${shop.id}`);
      const data = await res.json();
      setMenuItems(data.menu_items || []);
      setView("details");
    } catch (error) {
      toast.error(`فشل في عرض قائمة الطعام لمقهى ${shop.name}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShop = async () => {
    if (!newShopName.trim()) return toast.error("اكتب اسم المقهى");
    try {
      await fetch("/api/menus/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newShopName }),
      });
      toast.success(`تم إضافة مقهى '${newShopName}' بنجاح!`);
      setNewShopName("");
      setModal(null);
      fetchShops();
    } catch (error) {
      toast.error("فشل في إضافة مقهى جديد");
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice || parseFloat(newItemPrice) <= 0)
      return toast.error("الرجاء ادخال اسم وسعر صحيح");
    try {
      await fetch(`/api/menus/shops/${selectedShop.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newItemName,
          price: parseFloat(newItemPrice),
        }),
      });
      toast.success(`'${newItemName}' تم إضافته بنجاح لقائمة الطعام`);
      setNewItemName("");
      setNewItemPrice("");
      setModal(null);
      handleSelectShop(selectedShop);
    } catch (error) {
      toast.error("فشل في إضافة الصنف.");
    }
  };

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditingItemName(item.item_name);
    setEditingItemPrice(item.price);
  };
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemPrice("");
  };

  const handleUpdateItem = async (itemId) => {
    if (
      !editingItemName.trim() ||
      !editingItemPrice ||
      parseFloat(editingItemPrice) <= 0
    )
      return toast.error("الرجاء ادخال اسم وسعر صحيح");
    try {
      await fetch(`/api/menus/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: editingItemName,
          price: parseFloat(editingItemPrice),
        }),
      });
      toast.success("تم تحديث الصنف!");
      cancelEditing();
      handleSelectShop(selectedShop);
    } catch (error) {
      toast.error("فشل في تحديث الصنف.");
    }
  };

  const handleDeleteItem = (itemId) => {
    setConfirmModal({
      isOpen: true,
      title: "تأكيد الحذف",
      message: "هل أنت متأكد من رغبتك بحذف هذا الصنف؟",
      onConfirm: async () => {
        try {
          await fetch(`/api/menus/items/${itemId}`, { method: "DELETE" });
          toast.success("تم حذف الصنف بنجاح");
          handleSelectShop(selectedShop); // Refreshes the list
        } catch (error) {
          toast.error("فشل في حذف الصنف");
        } finally {
          setConfirmModal({ isOpen: false }); // Close modal
        }
      },
    });
  };

  const handleDeleteShop = (shop) => {
    setConfirmModal({
      isOpen: true,
      title: `حذف مقهى "${shop.name}"`,
      message:
        "هل أنت متأكد من رغبتك بحذف المقهى مع جميع الأصناف بداخله؟ لا يمكن التراجع لاحقاً",
      onConfirm: async () => {
        try {
          await fetch(`/api/menus/shops/${shop.id}`, { method: "DELETE" });
          toast.success(`مقهى "${shop.name}" تم حذفه بنجاح.`);
          fetchShops();
          setView("list");
          setSelectedShop(null);
        } catch (error) {
          toast.error("فشل في حذف المقهى.");
        } finally {
          setConfirmModal({ isOpen: false });
        }
      },
    });
  };

  const renderModals = () => {
    if (modal === "addShop") {
      return (
        <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-yellow-500">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4 border-b pb-2">
            إضافة مقهى جديد
          </h2>
          <input
            ref={addShopInputRef}
            type="text"
            className="w-full border border-yellow-300 focus:ring-2 focus:ring-yellow-400 p-2 rounded mb-4"
            value={newShopName}
            placeholder="اكتب اسم المقهى"
            onChange={(e) => setNewShopName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddShop()}
          />
          <div className="flex justify-end gap-2">
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => setModal(null)}
            >
              إلغاء
            </button>
            <button
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              onClick={handleAddShop}
            >
              حفظ
            </button>
          </div>
        </div>
      );
    }
    if (modal === "addItem") {
      return (
        <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-teal-500">
          <h2 className="text-2xl font-bold text-teal-600 mb-4 border-b pb-2">
            إضافة عنصر للقائمة
          </h2>
          <div className="space-y-4">
            <input
              ref={addItemNameInputRef}
              type="text"
              className="w-full border border-teal-300 focus:ring-2 focus:ring-teal-400 p-2 rounded"
              value={newItemName}
              placeholder="اسم الصنف"
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.001"
              className="w-full border border-teal-300 focus:ring-2 focus:ring-teal-400 p-2 rounded"
              value={newItemPrice}
              placeholder="السعر"
              onChange={(e) => setNewItemPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => setModal(null)}
            >
              إلغاء
            </button>
            <button
              className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
              onClick={handleAddItem}
            >
              حفظ الصنف
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {view === "list" ? (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-extrabold text-yellow-700 flex items-center gap-3">
              <Coffee size={40} />
              قوائم الطعام
            </h1>
            <button
              onClick={onBack}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
            >
              العودة للرئيسية
            </button>
          </div>
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setModal("addShop")}
              className="bg-yellow-600 text-white px-6 py-3 rounded-xl hover:bg-yellow-700 shadow-lg flex items-center gap-2 text-lg"
            >
              <PlusCircle size={22} />
              إضافة مقهى جديد
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-16 h-16 text-yellow-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop) => (
                <motion.div
                  key={shop.id}
                  whileHover={{ y: -5, scale: 1.05 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden border-b-4 border-yellow-400 group"
                >
                  <div
                    className="p-6 text-center cursor-pointer"
                    onClick={() => handleSelectShop(shop)}
                  >
                    <h2 className="text-2xl font-bold text-gray-800">
                      {shop.name}
                    </h2>
                  </div>
                  <div className="p-2 bg-gray-50 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShop(shop);
                      }}
                      className="text-red-500 hover:text-red-700 font-semibold text-sm"
                    >
                      حذف المقهى
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-extrabold text-teal-700 flex items-center gap-3">
              <Utensils size={40} />
              قائمة: {selectedShop.name}
            </h1>
            <button
              onClick={() => setView("list")}
              className="bg-yellow-600 text-white px-5 py-2 rounded-xl hover:bg-yellow-700 shadow"
            >
              العودة للمقاهي
            </button>
          </div>
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setModal("addItem")}
              className="bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 shadow-lg flex items-center gap-2 text-lg"
            >
              <PlusCircle size={22} />
              إضافة صنف جديد
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-16 h-16 text-teal-600 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="divide-y divide-gray-200">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50/75 transition-colors duration-150"
                  >
                    {editingItemId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          className="flex-grow border border-teal-300 rounded-md px-3 py-1 text-lg"
                          placeholder="اسم الصنف"
                        />
                        <input
                          ref={editingPriceInputRef}
                          type="number"
                          value={editingItemPrice}
                          onChange={(e) => setEditingItemPrice(e.target.value)}
                          className="w-32 border border-teal-300 rounded-md px-3 py-1 text-lg"
                          placeholder="السعر"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateItem(item.id)
                          }
                        />
                        <button
                          onClick={() => handleUpdateItem(item.id)}
                          className="p-2 text-green-600 hover:text-green-800"
                        >
                          <Save size={20} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 text-gray-500 hover:text-gray-800"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow text-lg text-gray-700">
                          {item.item_name}
                        </span>
                        <span className="font-bold text-teal-600 bg-teal-100 px-3 py-1 rounded-full">
                          <FormattedAmount value={item.price} mainSize="text-base" decimalSize="text-sm"/>
                        </span>
                        <button
                          onClick={() => startEditing(item)}
                          className="p-2 text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {menuItems.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    القائمة حالياً فارغة
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderModals()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 w-96 max-w-full shadow-2xl border-t-4 border-red-500"
            >
              <h2 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">
                {confirmModal.title}
              </h2>
              <p className="text-gray-700 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  onClick={() =>
                    setConfirmModal({ ...confirmModal, isOpen: false })
                  }
                >
                  إلغاء
                </button>
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  onClick={() => {
                    if (confirmModal.onConfirm) {
                      confirmModal.onConfirm();
                    }
                  }}
                >
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ===================================================================================
// DASHBOARD PAGE COMPONENT
// ===================================================================================
const DashboardPage = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [payerData, setPayerData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [shopData, setShopData] = useState([]);
  const [balanceData, setBalanceData] = useState([]);
  const [participantSpendingData, setParticipantSpendingData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [payerRes, timeRes, shopRes, balanceRes, avgSpendingRes] = await Promise.all([
          fetch("/api/dashboard/payer-summary"),
          fetch("/api/dashboard/spending-over-time"),
          fetch("/api/dashboard/spending-by-shop"),
          fetch("/api/dashboard/balance-distribution"),
          fetch("/api/dashboard/participant-spending"),
        ]);
        const payerJson = await payerRes.json();
        const timeJson = await timeRes.json();
        const shopJson = await shopRes.json();
        const balanceJson = await balanceRes.json();
        const avgSpendingJson = await avgSpendingRes.json();

        setPayerData(payerJson);
        setTimeData(timeJson);
        setShopData(shopJson);
        setBalanceData(balanceJson);
        setParticipantSpendingData(avgSpendingJson);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  const BALANCE_PIE_COLORS = { "مدين (عليه دين)": "#FF8042", "دائن (له رصيد)": "#00C49F" };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-16 h-16 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold text-gray-800 flex items-center gap-3">
          <BarChart3 size={40} />
          لوحة المعلومات
        </h1>
        <button
          onClick={onBack}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
        >
          العودة للرئيسية
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payer Contributions Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            إجمالي المدفوعات لكل مشارك
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payerData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickMargin={10} />
              <Tooltip
                formatter={(value) => `${value.toFixed(3)}`}
                cursor={{ fill: "rgba(238, 242, 255, 0.6)" }}
              />
              <Legend />
              <Bar dataKey="total_paid" name="المبلغ المدفوع" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Shop Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            المصروفات حسب المتجر
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={shopData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total_spent"
                nameKey="shop"
              >
                {shopData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Balance Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-700 mb-4">
              توزيع أرصدة المشاركين
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={balanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {balanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BALANCE_PIE_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} مشارك`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Average Spending Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-700 mb-4">
            إجمالي مساهمات المشاركين في الفواتير
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={participantSpendingData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickMargin={10} />
                <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
                <Legend />
                <Bar dataKey="total_spent_in_bills" name="إجمالي المساهمة" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      {/* Spending Over Time Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-700 mb-4">المصروفات عبر الزمن</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickMargin={10} />
            <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_spent"
              name="إجمالي المصروفات"
              stroke="#8884d8"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};


// ===================================================================================
// MAIN APP COMPONENT
// ===================================================================================
export default function App() {
  const [view, setView] = useState("main");
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
    data: null
  });

  // New state for tax feature
  const [showTaxInput, setShowTaxInput] = useState(false);
  const [taxRate, setTaxRate] = useState("");

  // Refs for auto-focus on main page modals
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
      data.filter((p) => !p.deleted).map((p) => ({ id: p.id, amount: "" }))
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
    if (view === "main") {
      setLoading(true);
      Promise.all([loadParticipants(), loadAllTx()]).finally(() =>
        setLoading(false)
      );
    }
  }, [view]);

  const handleApplyTax = () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("الرجاء إدخال نسبة ضريبة صحيحة");
      return;
    }

    const taxMultiplier = 1 + rate / 100;

    const newContributions = contributions.map((c) => {
      const amount = parseFloat(c.amount);
      if (!isNaN(amount) && amount > 0) {
        return { ...c, amount: (amount * taxMultiplier).toFixed(3) };
      }
      return c;
    });

    setContributions(newContributions);
    setShowTaxInput(false);
    setTaxRate("");
  };

  const handleCardClick = (name) => {
    setFilterName((prev) => (prev === name ? "" : name));
  };

  const handleShopClick = async (shop, date) => {
    if (shop === "إيداع في الحساب" || shop === "خصم نقدي من الحساب") {
        return;
    }

    setBillDetails({ isOpen: true, loading: true, data: null });

    try {
        const res = await fetch(`/api/bill-details?shop=${encodeURIComponent(shop)}&date=${date}`);
        if (!res.ok) {
            throw new Error("Could not fetch bill details.");
        }
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
    if (isNaN(amount) || amount <= 0) {
      return toast.error("Please enter a valid positive amount.");
    }

    const date = toYYYYMMDD(creditDate.startDate);
    const participant = participants.find((p) => p.id === creditId);
    await fetch(`/api/participants/${creditId}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount,
        date,
        shop: "إيداع في الحساب",
      }),
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
    setCreditDate({
      startDate: new Date(),
      endDate: new Date(),
    });
  };

  const handleDebit = async () => {
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) {
      return toast.error("Please enter a valid positive amount.");
    }

    const date = toYYYYMMDD(debitDate.startDate);
    const participant = participants.find((p) => p.id === debitId);
    await fetch(`/api/participants/${debitId}/debit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount, date }),
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
    setDebitDate({
      startDate: new Date(),
      endDate: new Date(),
    });
  };
  const handleDelete = async () => {
    if (deletePassword !== "123456")
      return toast.error("كلمة المرور غير صحيحة");
    const participant = participants.find((p) => p.id === deleteId);
    const name = participant?.name || "مشارك";
    await fetch(`/api/participants/${deleteId}`, { method: "DELETE" });
    await loadParticipants();
    await loadAllTx();
    toast.error(
      <span>
        تم حذف <span className="text-red-700 font-bold">{name}</span> بنجاح
      </span>
    );
    setDeleteId(null);
    setDeletePassword("");
  };
  const handleFilterDateChange = (newValue) => {
    setFilterDateValue(newValue);
    if (!newValue.startDate) {
      setFilterDate(null);
    } else {
      setFilterDate(toYYYYMMDD(newValue.startDate));
    }
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
  const totalPositiveBalance = participants.reduce(
    (sum, p) => sum + (p.balance > 0 ? p.balance : 0),
    0
  );

  if (loading && view === "main") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
        <Loader className="w-16 h-16 text-indigo-600 mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-10 px-4"
      >
        <AnimatePresence mode="wait">
          {view === "main" ? (
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
                    onClick={() => setSplitBill(true)}
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
                </div>
                <div className="flex justify-center mb-10">
                  <div className="bg-white p-6 rounded-xl shadow-lg w-72 text-center border-t-4 border-indigo-500">
                    <h2 className="text-lg font-bold text-gray-700 mb-2">
                      إجمالي المبلغ في الصندوق
                    </h2>
                    <p className="text-2xl text-green-600 font-bold">
                      <FormattedAmount value={totalPositiveBalance} mainSize="text-2xl" decimalSize="text-xl" />
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
                      <h2 className="text-xl font-bold mb-1 text-gray-800">
                        {p.name}
                      </h2>
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
                          className="flex-1 bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 text-sm"
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
                      {filterDate && (
                        <button
                          onClick={() =>
                            handleFilterDateChange({ startDate: null })
                          }
                          className="absolute top-1/2 left-10 transform -translate-y-1/2"
                        ></button>
                      )}
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
                          <th className="p-3 border-b-2 border-indigo-200">
                            التاريخ
                          </th>
                          <th className="p-3 border-b-2 border-indigo-200">
                            الاسم
                          </th>
                          <th className="p-3 border-b-2 border-indigo-200">
                            المبلغ
                          </th>
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
                              لا توجد معاملات مطابقة للبحث المستخدم.
                            </td>
                          </tr>
                        ) : (
                          paged.map((tx, i) => {
                            const isClickableShop = tx.shop !== "إيداع في الحساب" && tx.shop !== "خصم نقدي من الحساب";
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
                                    tx.amount < 0
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                >
                                    {tx.amount < 0 ? `- ` : `+ `}<FormattedAmount value={Math.abs(tx.amount)} />
                                </td>
                                <td
                                    className={`p-3 border-b text-gray-600 ${isClickableShop ? 'cursor-pointer hover:text-indigo-600 hover:font-semibold' : ''}`}
                                    onClick={() => isClickableShop && handleShopClick(tx.shop, tx.date)}
                                >
                                    {tx.shop}
                                </td>
                                </tr>
                            )
                        })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t">
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
                      <span className="text-gray-700 font-medium">
                        صفحة {currentPage} من {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
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
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-auto p-4"
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
                            ref={splitBillShopNameRef}
                            type="text"
                            className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm font-medium text-gray-700">
                            💸 اختر من قام بدفع الفاتورة
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
                            step="0.001"
                            className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={billAmount}
                            onChange={(e) => setBillAmount(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSplitBillSubmit()
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-6 border-t pt-4">
                          {!showTaxInput ? (
                            <button onClick={() => setShowTaxInput(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                                <Percent size={16}/>
                                إضافة ضريبة
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                                <label className="text-sm font-medium">
                                  نسبة الضريبة:
                                </label>
                                <input
                                    ref={taxInputRef}
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    className="w-20 border-indigo-300 rounded-md p-1 focus:ring-2 focus:ring-indigo-400"
                                    placeholder="e.g., 5"
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyTax()}
                                />
                                <span>%</span>
                                <button onClick={handleApplyTax} className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700">تطبيق</button>
                                <button onClick={() => setShowTaxInput(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                            </div>
                          )}
                      </div>
                      <div className="mt-4">
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
                                  step="0.001"
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
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
                  >
                    <div className="bg-white rounded p-6 w-80">
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
              </AnimatePresence>
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
              </AnimatePresence>
              <AnimatePresence>
                {billDetails.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
                        onClick={() => setBillDetails({ isOpen: false, data: null, loading: false })}
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
                        ) : billDetails.data && (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-indigo-800">{billDetails.data.shop}</h2>
                                </div>
                                <div className="flex justify-between items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Calendar size={20}/>
                                    <span>{billDetails.data.date}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <Wallet size={20}/>
                                     <span className="font-bold text-indigo-600"><FormattedAmount value={billDetails.data.totalAmount} /></span>
                                  </div>
                                </div>
                                
                                <div className="border-t pt-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"><User size={20} /> قام بالدفع:</h3>
                                    <p className="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-lg">{billDetails.data.payer}</p>
                                </div>
                                
                                <div className="border-t pt-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"><Users size={20} />المشاركون في الفاتورة:</h3>
                                    <ul className="space-y-2">
                                        {billDetails.data.participants.map(p => (
                                            <li key={p.name} className="flex justify-between items-center bg-red-50 p-2 rounded-lg">
                                                <span className="text-red-800">{p.name}</span>
                                                <span className="font-semibold text-red-600">
                                                    <FormattedAmount value={p.amount} />
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </motion.div>
          ) : view === "purchases" ? (
            <PurchasesPage key="purchases" onBack={() => setView("main")} />
          ) : view === "menus" ? (
            <MenusPage key="menus" onBack={() => setView("main")} />
          ) : (
            <DashboardPage key="dashboard" onBack={() => setView("main")} />
          )}
        </AnimatePresence>
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