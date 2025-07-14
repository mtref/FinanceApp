import React, { useState, useMemo } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import FormattedAmount from "../FormattedAmount.jsx";
import { toYYYYMMDD } from "../../utils/dateUtils.js";

const TransactionsLog = ({ transactions, onShopClick }) => {
  const [filterName, setFilterName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState(null);
  const [filterDateValue, setFilterDateValue] = useState({
    startDate: null,
    endDate: null,
  });

  const handleFilterDateChange = (newValue) => {
    setFilterDateValue(newValue);
    setFilterDate(newValue.startDate ? toYYYYMMDD(newValue.startDate) : null);
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => {
        if (
          filterName &&
          !tx.name.toLowerCase().includes(filterName.toLowerCase())
        )
          return false;
        if (filterDate && tx.date !== filterDate) return false;
        return true;
      }),
    [transactions, filterName, filterDate]
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paged = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">سجل المعاملات</h2>
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
                        isClickableShop && onShopClick(tx.shop, tx.date)
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
  );
};

export default TransactionsLog;
