import React, { useState, useEffect } from "react";
import { Loader, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
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
        const [payerRes, timeRes, shopRes, balanceRes, avgSpendingRes] =
          await Promise.all([
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
  const BALANCE_PIE_COLORS = {
    "مدين (عليه دين)": "#FF8042",
    "دائن (له رصيد)": "#00C49F",
  };

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
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            الدفيعين الفخمين
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={payerData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
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

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            إجمالي المبلغ بحسب المقهى
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
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                  <Cell
                    key={`cell-${index}`}
                    fill={BALANCE_PIE_COLORS[entry.status]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} مشارك`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">الأكيله</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={participantSpendingData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickMargin={10} />
              <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
              <Legend />
              <Bar
                dataKey="total_spent_in_bills"
                name="إجمالي المدفوع"
                fill="#ffc658"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-700 mb-4">
          تاريخ مبالغ الفواتير
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={timeData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickMargin={10} />
            <Tooltip formatter={(value) => `${value.toFixed(3)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_spent"
              name="مبلغ الفاتورة"
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

export default DashboardPage;
