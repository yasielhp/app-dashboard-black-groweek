"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface OrderDetail {
  id: number
  date: string
  total: string
  customerName: string
  customerEmail: string
  coupon: string
  status: string
  items: { sku: string; name: string; quantity: number }[]
}

interface ProductSales {
  sku: string
  name: string
  quantity: number
  revenue: number
  statusBreakdown: {
    completed: number
    refunded: number
    cancelled: number
    pending: number
    processing: number
    onHold: number
    failed: number
  }
}

interface SalesChartsProps {
  orders: OrderDetail[]
  productSales: ProductSales[]
}

const COLORS = [
  "#F9512C",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatSku = (sku: string) => {
  return sku.toUpperCase().replace(/-/g, " ").replace(/_/g, " ")
}

export default function SalesCharts({ orders, productSales }: SalesChartsProps) {
  // Procesar datos de ventas por día
  const salesByDay = orders
    .filter((order) => order.status === "completed")
    .reduce((acc, order) => {
      const date = new Date(order.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })
      if (!acc[date]) {
        acc[date] = { date, ventas: 0, ingresos: 0 }
      }
      acc[date].ventas += 1
      acc[date].ingresos += parseFloat(order.total)
      return acc
    }, {} as Record<string, { date: string; ventas: number; ingresos: number }>)

  const salesByDayData = Object.values(salesByDay).sort((a, b) => {
    const [dayA, monthA] = a.date.split("/").map(Number)
    const [dayB, monthB] = b.date.split("/").map(Number)
    if (monthA !== monthB) return monthA - monthB
    return dayA - dayB
  })

  // Procesar ventas por producto (solo completados)
  const productSalesData = productSales
    .filter((p) => p.statusBreakdown.completed > 0)
    .map((p) => ({
      name: formatSku(p.sku),
      ventas: p.statusBreakdown.completed,
      ingresos: p.revenue,
    }))
    .sort((a, b) => b.ingresos - a.ingresos)

  // Datos para gráfico de pastel de ingresos por producto
  const revenueByProductPie = productSales
    .filter((p) => p.revenue > 0)
    .map((p) => ({
      name: formatSku(p.sku),
      value: p.revenue,
    }))
    .sort((a, b) => b.value - a.value)

  // Procesar ventas por producto por día
  const productsByDay = orders
    .filter((order) => order.status === "completed")
    .reduce((acc, order) => {
      const date = new Date(order.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })
      order.items.forEach((item) => {
        const sku = formatSku(item.sku)
        if (!acc[date]) {
          acc[date] = { date }
        }
        if (!acc[date][sku]) {
          acc[date][sku] = 0
        }
        ;(acc[date][sku] as number) += item.quantity
      })
      return acc
    }, {} as Record<string, Record<string, string | number>>)

  const productsByDayData = Object.values(productsByDay).sort((a, b) => {
    const [dayA, monthA] = (a.date as string).split("/").map(Number)
    const [dayB, monthB] = (b.date as string).split("/").map(Number)
    if (monthA !== monthB) return monthA - monthB
    return dayA - dayB
  })

  // Obtener todos los SKUs únicos para las líneas del gráfico
  const uniqueSkus = Array.from(
    new Set(
      orders.flatMap((order) =>
        order.items.map((item) => formatSku(item.sku))
      )
    )
  )

  // Datos de estados de pedidos
  const orderStatusData = [
    { name: "Completados", value: orders.filter((o) => o.status === "completed").length, color: "#10B981" },
    { name: "Procesando", value: orders.filter((o) => o.status === "processing").length, color: "#3B82F6" },
    { name: "Pendientes", value: orders.filter((o) => o.status === "pending").length, color: "#F59E0B" },
    { name: "Reembolsados", value: orders.filter((o) => o.status === "refunded").length, color: "#EF4444" },
    { name: "Cancelados", value: orders.filter((o) => o.status === "cancelled").length, color: "#F97316" },
    { name: "Fallidos", value: orders.filter((o) => o.status === "failed").length, color: "#DC2626" },
  ].filter((item) => item.value > 0)

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2C2B2B] border border-[#3a3a39] rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === "number" && entry.name.toLowerCase().includes("ingreso")
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2C2B2B] border border-[#3a3a39] rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].payload.name}</p>
          <p className="text-primary">{formatCurrency(payload[0].payload.value)}</p>
        </div>
      )
    }
    return null
  }

  if (orders.length === 0) {
    return null
  }

  return (
    <div className="space-y-6 sm:space-y-8 mb-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Análisis de Ventas
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          Visualización de datos y tendencias
        </p>
      </div>

      {/* Gráfico de Ingresos por Día */}
      <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
        <h3 className="text-lg font-semibold text-white mb-4">Ingresos por Día</h3>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesByDayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a39" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#10B981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Ventas (cantidad) por Día */}
      <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
        <h3 className="text-lg font-semibold text-white mb-4">Número de Ventas por Día</h3>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByDayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a39" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="ventas"
                name="Ventas"
                fill="#F9512C"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Ventas por Producto por Día */}
      {productsByDayData.length > 0 && uniqueSkus.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
          <h3 className="text-lg font-semibold text-white mb-4">Ventas por Producto por Día</h3>
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productsByDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a39" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {uniqueSkus.map((sku, index) => (
                  <Line
                    key={sku}
                    type="monotone"
                    dataKey={sku}
                    name={sku}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Ingresos por Producto */}
        <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
          <h3 className="text-lg font-semibold text-white mb-4">Ingresos por Producto</h3>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSalesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a39" />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pastel - Distribución de Ingresos */}
        <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
          <h3 className="text-lg font-semibold text-white mb-4">Distribución de Ingresos</h3>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByProductPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(name || "").substring(0, 10)}... ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: "#9CA3AF", strokeWidth: 1 }}
                >
                  {revenueByProductPie.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico de Estados de Pedidos */}
      {orderStatusData.length > 1 && (
        <div className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]">
          <h3 className="text-lg font-semibold text-white mb-4">Estado de Pedidos</h3>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: "#9CA3AF", strokeWidth: 1 }}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
