import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Datepicker from "react-tailwindcss-datepicker";
import {
  Loader,
  ShoppingCart,
  Percent,
  X,
  Trash2,
  User,
  Calendar,
  Wallet,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import FormattedAmount from "../FormattedAmount.jsx";

const MainPageModals = ({
  modalState,
  handlers,
  participants,
  allShops,
  splitBillData,
  itemSelectionData,
  billDetails,
  onShopAdded,
}) => {
  const {
    adding,
    splitBill,
    creditId,
    debitId,
    deleteId,
    isItemModalOpen,
    isAddingShop,
  } = modalState;

  const {
    setAdding,
    setSplitBill,
    setCreditId,
    setDebitId,
    setDeleteId,
    setIsItemModalOpen,
    addParticipant,
    handleCredit,
    handleDebit,
    handleDelete,
    handleSplitBillSubmit,
    handleApplyTax,
    handleShopSelectionChange,
    openItemSelectionModal,
    confirmParticipantOrder,
    handleItemSelect,
    handleItemRemove,
    toggleParticipantExpansion,
    setAddingShop,
    handleAddShop,
    handleAddNewItem,
  } = handlers;

  const {
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
  } = modalState.formState;

  const {
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
  } = splitBillData;

  const {
    editingParticipant,
    participantOrder,
    selectedShopMenu,
    newItemName,
    setNewItemName,
    newItemPrice,
    setNewItemPrice,
  } = itemSelectionData;

  const addParticipantInputRef = useRef(null);
  const creditAmountRef = useRef(null);
  const debitAmountRef = useRef(null);
  const deletePasswordRef = useRef(null);
  const taxInputRef = useRef(null);
  const newShopInputRef = useRef(null);

  useEffect(() => {
    if (adding) setTimeout(() => addParticipantInputRef.current?.focus(), 100);
    if (creditId) setTimeout(() => creditAmountRef.current?.focus(), 100);
    if (debitId) setTimeout(() => debitAmountRef.current?.focus(), 100);
    if (deleteId) setTimeout(() => deletePasswordRef.current?.focus(), 100);
    if (isAddingShop) setTimeout(() => newShopInputRef.current?.focus(), 100);
  }, [adding, creditId, debitId, deleteId, isAddingShop]);

  useEffect(() => {
    if (showTaxInput) {
      setTimeout(() => taxInputRef.current?.focus(), 100);
    }
  }, [showTaxInput]);

  const resetSplitBill = () => {
    handlers.resetSplitBill();
  };

  return (
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
                    onChange={(e) => handleShopSelectionChange(e.target.value)}
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
                  <button
                    onClick={() => setAddingShop(true)}
                    className="bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600"
                  >
                    <Plus size={16} />
                  </button>
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
              <div className="mt-6 border-t pt-4 flex justify-center">
                {!showTaxInput ? (
                  <button
                    onClick={() => setShowTaxInput(true)}
                    className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 font-semibold flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
              <div className="w-full md:w-1/2 p-4 overflow-y-auto border-r flex flex-col">
                <h3 className="text-lg font-semibold mb-3">القائمة</h3>
                <div className="flex-grow space-y-2">
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
                        <span className="text-gray-800">{item.item_name}</span>
                        <span className="font-semibold text-teal-600">
                          <FormattedAmount value={item.price} />
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center mt-4">
                      لا توجد أصناف في هذا المقهى.
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2 text-gray-700">
                    إضافة صنف جديد
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اسم الصنف"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-grow border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                      type="number"
                      placeholder="السعر"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-24 border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      onClick={handleAddNewItem}
                      className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-4 bg-gray-50 flex flex-col overflow-y-auto">
                <h3 className="text-lg font-semibold mb-3">الطلبات المختارة</h3>
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
              إيداع مبلغ لـ {participants.find((p) => p.id === creditId)?.name}
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
              تأكيد الحذف لـ {participants.find((p) => p.id === deleteId)?.name}
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
            handlers.setBillDetails({
              isOpen: false,
              data: null,
              loading: false,
            })
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
                        <FormattedAmount value={billDetails.data.totalAmount} />
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
                          className="bg-red-50/50 border border-red-200 rounded-lg"
                        >
                          <div
                            className="flex justify-between items-center p-3 cursor-pointer"
                            onClick={() => toggleParticipantExpansion(p.name)}
                          >
                            <span className="text-red-800 font-bold">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-red-600">
                                <FormattedAmount value={p.amount} />
                              </span>
                              {p.items && p.items.length > 0 && (
                                <>
                                  {modalState.expandedParticipants[p.name] ? (
                                    <ChevronUp
                                      size={20}
                                      className="text-red-500"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={20}
                                      className="text-red-500"
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <AnimatePresence>
                            {modalState.expandedParticipants[p.name] &&
                              p.items &&
                              p.items.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <ul className="px-3 pb-3 pt-1 border-t border-red-200 space-y-1">
                                    {p.items.map((item, index) => (
                                      <li
                                        key={index}
                                        className="flex justify-between items-center text-sm text-gray-700"
                                      >
                                        <span>- {item.item_name}</span>
                                        <span className="font-mono">
                                          <FormattedAmount
                                            value={item.price}
                                            mainSize="text-sm"
                                            decimalSize="text-xs"
                                          />
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </motion.div>
                              )}
                          </AnimatePresence>
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
      {isAddingShop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[101] p-4"
          onClick={() => setAddingShop(false)}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 w-96 shadow-2xl border-t-4 border-indigo-500"
          >
            <h2 className="text-2xl font-bold text-indigo-600 mb-4 border-b pb-2">
              🏪 إضافة مقهى جديد
            </h2>
            <input
              ref={newShopInputRef}
              type="text"
              className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 p-2 rounded mb-4"
              placeholder="اكتب اسم المقهى"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddShop(e.target.value);
                  e.target.value = "";
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                onClick={() => setAddingShop(false)}
              >
                إلغاء
              </button>
              <button
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                onClick={() => {
                  const input = newShopInputRef.current;
                  if (input.value) {
                    handleAddShop(input.value);
                    input.value = "";
                  }
                }}
              >
                إضافة مقهى
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MainPageModals;
