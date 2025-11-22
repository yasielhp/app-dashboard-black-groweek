"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSalesStore } from "@/store/useSalesStore"

export default function DashboardPage() {
  const router = useRouter()
  const {
    salesData,
    period,
    loading,
    error,
    fetchSales,
    filterByPeriod,
  } = useSalesStore()

  const [sortBy, setSortBy] = useState<"name" | "sku" | "quantity" | "revenue">(
    "name"
  )
  const [sortOrder] = useState<"asc" | "desc">("desc")
  const [showOrders, setShowOrders] = useState(false)
  const [filterBySku, setFilterBySku] = useState<string | null>(null)
  const [filterByStatus, setFilterByStatus] = useState<string | null>(null)

  const scrollToOrders = () => {
    const ordersSection = document.getElementById("orders-section")
    if (ordersSection) {
      ordersSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleStatusClick = (status: string) => {
    setFilterByStatus(status)
    setFilterBySku(null)
    scrollToOrders()
  }

  const filteredOrders =
    salesData?.orders.filter((order) => {
      if (filterBySku) {
        return order.items.some((item) => item.sku === filterBySku)
      }
      if (filterByStatus) {
        return order.status === filterByStatus
      }
      return true
    }) || []

  const sortedProducts =
    salesData?.productSales.slice().sort((a, b) => {
      let comparison = 0
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === "sku") {
        comparison = a.sku.localeCompare(b.sku)
      } else if (sortBy === "quantity") {
        comparison = a.quantity - b.quantity
      } else {
        comparison = a.revenue - b.revenue
      }
      return sortOrder === "asc" ? comparison : -comparison
    }) || []

  const checkAuth = () => {
    const token = localStorage.getItem("dashboard_token")
    const expires = localStorage.getItem("dashboard_expires")

    if (!token || !expires) {
      router.push("/login")
      return null
    }

    if (Date.now() > parseInt(expires)) {
      localStorage.removeItem("dashboard_token")
      localStorage.removeItem("dashboard_expires")
      router.push("/login")
      return null
    }

    return token
  }

  const handleFetchSales = async () => {
    const token = checkAuth()
    if (!token) return

    try {
      await fetchSales(token)
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        localStorage.removeItem("dashboard_token")
        localStorage.removeItem("dashboard_expires")
        router.push("/login")
      }
    }
  }

  const handlePeriodChange = (
    newPeriod: "today" | "week" | "month" | "all"
  ) => {
    filterByPeriod(newPeriod)
  }

  useEffect(() => {
    // Solo verificar autenticación, no cargar datos automáticamente
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("dashboard_token")
    localStorage.removeItem("dashboard_expires")
    router.push("/login")
  }

  const getDateRange = (period: "today" | "week" | "month" | "all"): string => {
    const now = new Date()

    if (period === "all") {
      // Fecha de inicio fija: 13/11/2025
      return `13/11/2025 - ${now.getDate()}/${
        now.getMonth() + 1
      }/${now.getFullYear()}`
    }

    if (period === "today") {
      const day = now.getDate()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      return `${day}/${month}/${year}`
    }

    if (period === "week") {
      const endDate = new Date(now)
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return `${startDate.getDate()}/${
        startDate.getMonth() + 1
      }/${startDate.getFullYear()} - ${endDate.getDate()}/${
        endDate.getMonth() + 1
      }/${endDate.getFullYear()}`
    }

    if (period === "month") {
      const endDate = new Date(now)
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return `${startDate.getDate()}/${
        startDate.getMonth() + 1
      }/${startDate.getFullYear()} - ${endDate.getDate()}/${
        endDate.getMonth() + 1
      }/${endDate.getFullYear()}`
    }

    return ""
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatTimeOnly = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatSku = (sku: string) => {
    return sku.toUpperCase().replace(/-/g, " ").replace(/_/g, " ")
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      completed: {
        label: "Completado",
        color: "bg-green-500/20 text-green-400 border-green-500/50",
      },
      refunded: {
        label: "Reembolsado",
        color: "bg-red-500/20 text-red-400 border-red-500/50",
      },
      cancelled: {
        label: "Cancelado",
        color: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      },
      pending: {
        label: "Pendiente",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      },
      processing: {
        label: "Procesando",
        color: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      },
      "on-hold": {
        label: "En espera",
        color: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      },
      failed: {
        label: "Fallido",
        color: "bg-red-700/20 text-red-300 border-red-700/50",
      },
    }

    const config = statusConfig[status] || {
      label: status,
      color: "bg-gray-500/20 text-gray-400 border-gray-500/50",
    }

    return (
      <span
        className={`inline-block px-2 py-1 rounded text-xs border ${config.color}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen text-white bg-[#1D1D1C]">
      <header className="backdrop-blur-xl border-b sticky top-0 z-40 bg-[#2C2B2B] border-[#3a3a39]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {loading && !salesData ? (
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="rounded-lg p-1.5 sm:p-2 shrink-0 w-8 h-8 sm:w-12 sm:h-12 animate-pulse bg-primary/30"></div>
                <div className="min-w-0">
                  <div className="h-4 sm:h-6 w-32 sm:w-48 rounded animate-pulse mb-1 sm:mb-2 bg-[#3a3a39]"></div>
                  <div className="h-2 sm:h-3 w-24 sm:w-36 rounded animate-pulse hidden sm:block bg-[#3a3a39]"></div>
                </div>
              </div>
              <div className="h-8 sm:h-10 w-8 sm:w-32 rounded-lg animate-pulse bg-[#1D1D1C]"></div>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="rounded-lg p-1.5 sm:p-2 shrink-0 bg-primary">
                  <svg
                    className="w-5 h-5 sm:w-8 sm:h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-2xl font-bold bg-linear-to-r from-white to-gray-300 bg-clip-text text-transparent truncate">
                    Growti School
                  </h1>
                  <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">
                    Dashboard Black Groweek
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center cursor-pointer gap-2 px-4 py-2 text-gray-300 hover:text-white rounded-lg transition-all duration-200 bg-[#1D1D1C] hover:bg-[#3a3a39]"
              >
                <svg
                  className="w-4 h-4 sm:hidden"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-5 py-4 rounded-xl mb-8 backdrop-blur-sm flex items-center gap-3">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading && !salesData ? (
          <div className="animate-fadeIn">
            {/* Skeleton Filtros y Botón Actualizar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-between">
              <div className="flex gap-1 sm:gap-2 backdrop-blur-sm rounded-xl p-1 border overflow-x-auto justify-between bg-[#2C2B2B] border-[#3a3a39]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg flex flex-col items-center gap-0.5 sm:gap-1 shrink-0"
                  >
                    <div className="h-3 sm:h-4 w-12 sm:w-16 rounded animate-pulse mb-1 bg-[#3a3a39]"></div>
                    <div className="h-2 sm:h-3 w-16 sm:w-24 rounded animate-pulse hidden sm:block bg-[#3a3a39]"></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-start">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse bg-[#3a3a39]"></div>
                  <div className="h-3 sm:h-4 w-16 sm:w-24 rounded animate-pulse bg-[#3a3a39]"></div>
                </div>
                <div className="h-8 sm:h-10 w-20 sm:w-28 rounded-xl animate-pulse bg-primary/30"></div>
              </div>
            </div>

            {/* Skeleton Cards de Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl animate-pulse bg-primary/10"></div>
                    <div className="h-3 sm:h-4 w-20 sm:w-24 rounded animate-pulse bg-[#3a3a39]"></div>
                  </div>
                  <div className="h-8 sm:h-10 w-24 sm:w-32 rounded animate-pulse bg-[#3a3a39]"></div>
                </div>
              ))}
            </div>

            {/* Skeleton Productos */}
            <div className="mb-6 sm:mb-10">
              <div className="mb-4 sm:mb-6">
                <div className="h-6 sm:h-8 w-48 sm:w-64 rounded animate-pulse mb-2 bg-[#3a3a39]"></div>
                <div className="h-3 sm:h-4 w-32 sm:w-48 rounded animate-pulse bg-[#3a3a39]"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 border bg-[#2C2B2B] border-[#3a3a39]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="h-5 sm:h-6 w-32 sm:w-40 rounded animate-pulse mb-2 bg-[#3a3a39]"></div>
                        <div className="h-3 w-24 sm:w-32 rounded animate-pulse bg-[#3a3a39]"></div>
                      </div>
                      <div className="w-8 h-8 rounded-lg animate-pulse bg-primary/10"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-16 rounded-xl animate-pulse bg-[#3a3a39]"></div>
                      <div className="h-16 rounded-xl animate-pulse bg-[#3a3a39]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Tabla */}
            <div className="backdrop-blur-sm rounded-2xl overflow-hidden border bg-[#2C2B2B] border-[#3a3a39]">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-[#1D1D1C] border-[#3a3a39]">
                <div className="h-6 sm:h-8 w-40 sm:w-48 rounded animate-pulse mb-2 bg-[#3a3a39]"></div>
                <div className="h-3 sm:h-4 w-48 sm:w-64 rounded animate-pulse bg-[#3a3a39]"></div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg animate-pulse bg-[#3a3a39]"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ) : salesData ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-between">
              <div className="flex gap-1 sm:gap-2 backdrop-blur-sm rounded-xl p-1 border overflow-x-auto justify-between bg-[#2C2B2B] border-[#3a3a39]">
                {(["all", "week", "today"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-3 sm:px-6 py-2 justify-center sm:py-2.5 cursor-pointer rounded-lg text-xs sm:text-sm transition-all duration-200 flex flex-col items-center  whitespace-nowrap shrink-0 ${
                      period === p
                        ? "bg-primary text-white shadow-[0_4px_14px_0_rgba(249,81,44,0.39)]"
                        : "bg-transparent text-gray-400"
                    }`}
                  >
                    <span className="font-bold">
                      {p === "all" && "Todo"}
                      {p === "week" && "Últimos 7 días"}
                      {p === "today" && "Hoy"}
                    </span>
                    <span
                      className={`text-xs sm:text-xs hidden sm:inline-block ${
                        period === p ? "text-red-200" : "text-gray-500"
                      }`}
                    >
                      {getDateRange(p)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-end gap-2 bg-[#2C2B2B] border-[#3a3a39] p-2 rounded-xl py-2 sm:py-2.5">
                <button
                  onClick={handleFetchSales}
                  disabled={loading}
                  className="backdrop-blur-sm w-full text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 border transition-all duration-200 shrink-0 bg-primary border-primary text-white shadow-[0_4px_14px_0_rgba(249,81,44,0.39)]"
                >
                  <svg
                    className={`w-3.5 h-3.5 sm:hidden ${
                      loading ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="w-full">
                    {loading ? "Actualizando..." : "Actualizar"}
                  </span>
                </button>
                <p className="text-gray-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-center px-3">
                  <span className="text-gray-300  font-medium hidden sm:inline">
                    {formatDate(salesData.lastUpdated)}
                  </span>
                  <span className="text-gray-300 font-medium sm:hidden">
                    {formatDate(salesData.lastUpdated).split(" ")[0]}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
              <div className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 bg-[#2C2B2B] border-[#3a3a39]">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-green-500/10">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Total
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-green-400">
                  {formatCurrency(salesData.totalRevenue)}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => {
                  setFilterByStatus(null)
                  setFilterBySku(null)
                  scrollToOrders()
                }}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-blue-500/10">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Pedidos
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-blue-400">
                  {Object.values(salesData.ordersByStatus || {}).reduce(
                    (sum, count) => sum + count,
                    0
                  )}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("completed")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-primary/10">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Completados
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-primary">
                  {salesData.ordersByStatus?.completed || 0}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("processing")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-blue-500/10 group-hover:bg-blue-500/20">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Procesando
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-blue-400">
                  {salesData.ordersByStatus?.processing || 0}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("pending")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-yellow-500/10 group-hover:bg-yellow-500/20">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Pendientes
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-yellow-400">
                  {salesData.ordersByStatus?.pending || 0}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("refunded")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-red-500/10 group-hover:bg-red-500/20">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Reembolsados
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-red-400">
                  {salesData.ordersByStatus?.refunded || 0}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("cancelled")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-orange-500/10 group-hover:bg-orange-500/20">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-orange-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Cancelados
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-orange-400">
                  {salesData.ordersByStatus?.cancelled || 0}
                </p>
              </div>

              <div
                className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-[#2C2B2B] border-[#3a3a39]"
                onClick={() => handleStatusClick("failed")}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-xl transition-colors bg-red-700/10 group-hover:bg-red-700/20">
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 text-red-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">
                    Fallidos
                  </p>
                </div>
                <p className="text-xl sm:text-4xl font-bold text-red-300">
                  {salesData.ordersByStatus?.failed || 0}
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-10">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Ventas
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    Detalles de ventas de productos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                    Ordenar:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | "name"
                          | "sku"
                          | "quantity"
                          | "revenue"
                      )
                    }
                    className="px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border transition-colors bg-[#2C2B2B] border-[#3a3a39] text-white"
                  >
                    <option value="revenue">Mayor facturación</option>
                    <option value="quantity">Mayor volumen</option>
                    <option value="sku">Código (A-Z)</option>
                    <option value="name">Nombre (A-Z)</option>
                  </select>
                </div>
              </div>
              {salesData.productSales.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {sortedProducts.map((product) => (
                    <div
                      key={product.sku}
                      onClick={() => {
                        setFilterBySku(product.sku)
                        setFilterByStatus(null)
                        scrollToOrders()
                      }}
                      className="group backdrop-blur-sm rounded-2xl p-4 sm:p-6 cursor-pointer border transition-all duration-300 hover:scale-[1.02] animate-fadeIn bg-[#2C2B2B] border-[#3a3a39] hover:border-primary hover:shadow-[0_0_20px_rgba(249,81,44,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-4 sm:mb-5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white mb-1 sm:mb-2 text-base sm:text-lg transition-colors truncate">
                            {formatSku(product.sku)}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1">
                            {product.name}
                          </p>
                        </div>
                        <div className="ml-2 p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 bg-primary/10">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        <div className="flex justify-between items-center p-3 rounded-xl border bg-green-500/5 border-green-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            <span className="text-sm text-gray-400 font-medium">
                              Ingresos
                            </span>
                          </div>
                          <span className="text-xl font-bold text-green-400">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-xl border bg-primary/5 border-primary/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="text-sm text-gray-400 font-medium">
                              Completados
                            </span>
                          </div>
                          <span className="text-xl font-bold text-primary">
                            {product.statusBreakdown.completed}
                          </span>
                        </div>
                      </div>

                      {(product.statusBreakdown.refunded > 0 ||
                        product.statusBreakdown.cancelled > 0 ||
                        product.statusBreakdown.pending > 0 ||
                        product.statusBreakdown.processing > 0 ||
                        product.statusBreakdown.onHold > 0 ||
                        product.statusBreakdown.failed > 0) && (
                        <div className="pt-4 border-t border-[#3a3a39]">
                          <p className="text-xs text-gray-500 font-medium mb-3">
                            Otros estados:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {product.statusBreakdown.refunded > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-red-500/5 rounded-lg">
                                <span className="text-gray-400">
                                  Reembolsados
                                </span>
                                <span className="text-red-400 font-semibold">
                                  {product.statusBreakdown.refunded}
                                </span>
                              </div>
                            )}
                            {product.statusBreakdown.cancelled > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-orange-500/5 rounded-lg">
                                <span className="text-gray-400">
                                  Cancelados
                                </span>
                                <span className="text-orange-400 font-semibold">
                                  {product.statusBreakdown.cancelled}
                                </span>
                              </div>
                            )}
                            {product.statusBreakdown.pending > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-yellow-500/5 rounded-lg">
                                <span className="text-gray-400">
                                  Pendientes
                                </span>
                                <span className="text-yellow-400 font-semibold">
                                  {product.statusBreakdown.pending}
                                </span>
                              </div>
                            )}
                            {product.statusBreakdown.processing > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-blue-500/5 rounded-lg">
                                <span className="text-gray-400">
                                  Procesando
                                </span>
                                <span className="text-blue-300 font-semibold">
                                  {product.statusBreakdown.processing}
                                </span>
                              </div>
                            )}
                            {product.statusBreakdown.onHold > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-purple-500/5 rounded-lg">
                                <span className="text-gray-400">En espera</span>
                                <span className="text-purple-400 font-semibold">
                                  {product.statusBreakdown.onHold}
                                </span>
                              </div>
                            )}
                            {product.statusBreakdown.failed > 0 && (
                              <div className="flex justify-between items-center px-2 py-1.5 bg-red-700/5 rounded-lg">
                                <span className="text-gray-400">Fallidos</span>
                                <span className="text-red-300 font-semibold">
                                  {product.statusBreakdown.failed}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-400 rounded-2xl border bg-[#2C2B2B] border-[#3a3a39]">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="font-medium">No hay ventas en este período</p>
                </div>
              )}
            </div>

            {/* Lista de Todos los Pedidos */}
            <div
              id="orders-section"
              className="backdrop-blur-sm rounded-2xl overflow-hidden mb-8 border scroll-mt-8 bg-[#2C2B2B] border-[#3a3a39]"
            >
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-[#1D1D1C] border-[#3a3a39]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Lista de Pedidos
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                      <p className="text-gray-400 text-xs sm:text-sm">
                        Historial completo de transacciones
                      </p>
                      {(filterByStatus || filterBySku) && (
                        <button
                          onClick={() => {
                            setFilterByStatus(null)
                            setFilterBySku(null)
                          }}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-lg border transition-colors flex items-center gap-1 bg-primary border-primary text-white"
                        >
                          <svg
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          <span className="hidden sm:inline">
                            Filtro:{" "}
                            {filterByStatus
                              ? filterByStatus === "completed"
                                ? "Completados"
                                : filterByStatus === "processing"
                                ? "En proceso"
                                : filterByStatus === "pending"
                                ? "Pendiente"
                                : filterByStatus === "cancelled"
                                ? "Cancelados"
                                : filterByStatus === "refunded"
                                ? "Reembolsados"
                                : filterByStatus === "failed"
                                ? "Fallidos"
                                : filterByStatus
                              : filterBySku
                              ? filterBySku.toUpperCase().replace(/-/g, " ")
                              : ""}
                          </span>
                          <span className="sm:hidden">
                            {filterByStatus
                              ? filterByStatus === "completed"
                                ? "Completados"
                                : filterByStatus === "processing"
                                ? "En proceso"
                                : filterByStatus === "pending"
                                ? "Pendiente"
                                : filterByStatus === "cancelled"
                                ? "Cancelados"
                                : filterByStatus === "refunded"
                                ? "Reembolsados"
                                : filterByStatus === "failed"
                                ? "Fallidos"
                                : filterByStatus
                              : filterBySku
                              ? filterBySku
                                  .split("-")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1)
                                  )
                                  .join(" ")
                              : ""}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-xs sm:text-sm text-gray-400">
                      {filterByStatus || filterBySku
                        ? "Mostrando"
                        : "Total de pedidos"}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">
                      {filteredOrders.length}
                    </p>
                  </div>
                </div>
              </div>
              {salesData.orders.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[640px]">
                    <thead className="backdrop-blur-sm sticky top-0 bg-[#1D1D1C]">
                      <tr className="border-b border-[#3a3a39]">
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          Cupón
                        </th>
                        <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          Productos
                        </th>
                        <th className="text-right px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3a3a39]">
                      {filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="transition-colors group hover:bg-primary/5"
                        >
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm">
                            <span className="font-mono font-medium text-primary">
                              #{order.id}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm">
                            <div className="font-medium text-white text-[10px] sm:text-sm">
                              {formatDateOnly(order.date)}
                            </div>
                            <div className="text-[9px] sm:text-xs text-gray-400 mt-0.5">
                              {formatTimeOnly(order.date)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm">
                            <div>
                              <div className="font-medium text-white text-[10px] sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {order.customerName}
                              </div>
                              <div className="text-[9px] sm:text-xs text-gray-400 break-all mt-0.5 truncate max-w-[120px] sm:max-w-none">
                                {order.customerEmail}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm hidden md:table-cell">
                            {order.coupon !== "-" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/20 text-xs font-mono">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                  />
                                </svg>
                                {order.coupon}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm hidden lg:table-cell">
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-gray-300">
                                  {formatSku(item.sku)}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-5 text-xs sm:text-sm text-right">
                            <span className="font-bold text-sm sm:text-lg text-green-400">
                              {formatCurrency(parseFloat(order.total))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-400">
                  No hay pedidos en este período
                </div>
              )}
            </div>

            {/* Modal de Órdenes */}
            {showOrders && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden border border-gray-700/50 shadow-2xl animate-slideUp">
                  <div className="px-6 py-5 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {filterBySku
                          ? `Pedidos de ${
                              salesData.productSales.find(
                                (p) => p.sku === filterBySku
                              )?.name || filterBySku
                            }`
                          : "Lista de Pedidos"}{" "}
                        ({filteredOrders.length})
                      </h2>
                      {filterBySku && (
                        <button
                          onClick={() => setFilterBySku(null)}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                        >
                          Ver todos los pedidos
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowOrders(false)
                        setFilterBySku(null)
                      }}
                      className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
                    {filteredOrders.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-700/50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              ID
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              Fecha
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              Cliente
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              Estado
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              Cupón
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">
                              Productos
                            </th>
                            <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-700/30">
                              <td className="px-4 py-4 text-sm">#{order.id}</td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(order.date)}
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <div>{order.customerName}</div>
                                <div className="text-xs text-gray-400 break-all">
                                  {order.customerEmail}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                {getStatusBadge(order.status)}
                              </td>
                              <td className="px-4 py-4 text-sm text-yellow-400">
                                {order.coupon}
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={
                                        filterBySku === item.sku
                                          ? "text-blue-400"
                                          : "text-gray-300"
                                      }
                                    >
                                      {formatSku(item.sku)}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-green-400">
                                {formatCurrency(parseFloat(order.total))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-6 py-12 text-center text-gray-400">
                        No hay pedidos en este período
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
