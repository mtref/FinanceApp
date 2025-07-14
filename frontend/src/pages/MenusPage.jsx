import React, { useState, useEffect, useRef } from "react";
import {
  Loader,
  Coffee,
  PlusCircle,
  Utensils,
  Edit,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import FormattedAmount from "../components/FormattedAmount";

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
          handleSelectShop(selectedShop);
        } catch (error) {
          toast.error("فشل في حذف الصنف");
        } finally {
          setConfirmModal({ isOpen: false });
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
                          <FormattedAmount
                            value={item.price}
                            mainSize="text-base"
                            decimalSize="text-sm"
                          />
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

export default MenusPage;
