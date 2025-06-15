// تحديث App.jsx - ترجمة كاملة للعربية مع تأكيد حذف المشارك
import React, { useState, useEffect, useMemo } from "react";
import Datepicker from "react-tailwindcss-datepicker";

export default function App() {
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [creditId, setCreditId] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDate, setCreditDate] = useState({
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });
  const [allTx, setAllTx] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const [filterName, setFilterName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState(null);
  const [filterDateValue, setFilterDateValue] = useState({
    startDate: null,
    endDate: null,
  });

  const loadParticipants = async () => {
    const res = await fetch("/api/participants");
    setParticipants(await res.json());
  };
  const loadAllTx = async () => {
    const res = await fetch("/api/transactions");
    setAllTx(await res.json());
  };

  useEffect(() => {
    loadParticipants();
    loadAllTx();
  }, []);

  const addParticipant = async () => {
    if (!name.trim()) return;
    await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    setAdding(false);
    await loadParticipants();
    await loadAllTx();
  };

  const handleCredit = async () => {
    const date = new Date(creditDate.startDate).toISOString().split("T")[0];
    await fetch(`/api/participants/${creditId}/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(creditAmount), date }),
    });
    setCreditId(null);
    setCreditAmount("");
    setCreditDate({
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });
    await loadParticipants();
    await loadAllTx();
  };

  const handleDelete = async () => {
    if (deletePassword !== "123456") return alert("كلمة المرور غير صحيحة");
    await fetch(`/api/participants/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeletePassword("");
    await loadParticipants();
    await loadAllTx();
  };

  const handleFilterDateChange = (newValue) => {
    setFilterDateValue(newValue);
    setFilterDate(newValue.startDate || null);
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

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-6">
        تطبيق إدارة المشاركين
      </h1>

      <div className="flex justify-center mb-6">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => setAdding(true)}
        >
          إضافة مشارك
        </button>
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-80">
            <h2 className="text-xl mb-4">أدخل اسم المشارك</h2>
            <input
              type="text"
              className="w-full border p-2 mb-4 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                className="bg-gray-300 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                onClick={() => setAdding(false)}
              >
                إلغاء
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={addParticipant}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {creditId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded p-6 w-80">
            <h3 className="mb-4 text-lg">
              إضافة رصيد لـ {participants.find((p) => p.id === creditId)?.name}
            </h3>
            <div className="relative">
              <Datepicker
                asSingle
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
              step="0.01"
              className="w-full border p-2 mb-4 rounded"
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
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {participants.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded shadow relative">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-2">الرصيد: {p.balance.toFixed(2)}</p>
            <div className="mt-4 flex justify-between">
              <button
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                onClick={() => setCreditId(p.id)}
              >
                رصيد
              </button>
              <button
                className="text-red-500 text-sm font-bold hover:underline"
                onClick={() => setDeleteId(p.id)}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap">
          <h2 className="text-xl font-semibold">سجل المعاملات</h2>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Datepicker
                asSingle
                useRange={false}
                value={filterDateValue}
                onChange={handleFilterDateChange}
                displayFormat="DD/MM/YYYY"
                inputClassName="border p-2 rounded text-right pl-10"
                toggleClassName="absolute left-0 h-full px-3 text-gray-400 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="تصفية بالتاريخ"
              />
            </div>
            <input
              type="text"
              placeholder="بحث بالاسم"
              className="border p-2 rounded"
              value={filterName}
              onChange={(e) => {
                setFilterName(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="border p-2 rounded"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(+e.target.value);
                setCurrentPage(1);
              }}
            >
              {[5, 10, 30, 100].map((n) => (
                <option key={n} value={n}>
                  {n} لكل صفحة
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-right font-semibold">التاريخ</th>
                <th className="p-2 text-right font-semibold">الاسم</th>
                <th className="p-2 text-right font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {paged.length ? (
                paged.map((tx, i) => (
                  <tr key={tx.id || i} className="border-b border-gray-200">
                    <td className="p-2 text-right">{tx.date}</td>
                    <td className="p-2 text-right">{tx.name}</td>
                    <td
                      className={`p-2 text-right font-medium ${
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">
                    — لا توجد معاملات —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            عرض {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            -{Math.min(currentPage * itemsPerPage, filtered.length)} من{" "}
            {filtered.length}
          </div>
          <div className="flex gap-1">
            <button
              className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              الأول
            </button>
            <button
              className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              السابق
            </button>
            <span className="px-3 py-1 text-gray-700">
              الصفحة {currentPage} من {totalPages}
            </span>
            <button
              className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
            >
              التالي
            </button>
            <button
              className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              الأخير
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
