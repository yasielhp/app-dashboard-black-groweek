'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProductSales {
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface OrderDetail {
  id: number;
  date: string;
  total: string;
  customerName: string;
  customerEmail: string;
  coupon: string;
  items: { sku: string; name: string; quantity: number }[];
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  productSales: ProductSales[];
  orders: OrderDetail[];
  lastUpdated: string;
}

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'quantity' | 'revenue'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOrders, setShowOrders] = useState(false);
  const [filterBySku, setFilterBySku] = useState<string | null>(null);
  const router = useRouter();

  const filteredOrders = filterBySku
    ? salesData?.orders.filter(order => order.items.some(item => item.sku === filterBySku)) || []
    : salesData?.orders || [];

  const handleSort = (column: 'name' | 'sku' | 'quantity' | 'revenue') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedProducts = salesData?.productSales.slice().sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'sku') {
      comparison = a.sku.localeCompare(b.sku);
    } else if (sortBy === 'quantity') {
      comparison = a.quantity - b.quantity;
    } else {
      comparison = a.revenue - b.revenue;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  }) || [];

  const checkAuth = () => {
    const token = localStorage.getItem('dashboard_token');
    const expires = localStorage.getItem('dashboard_expires');

    if (!token || !expires) {
      router.push('/login');
      return null;
    }

    if (Date.now() > parseInt(expires)) {
      localStorage.removeItem('dashboard_token');
      localStorage.removeItem('dashboard_expires');
      router.push('/login');
      return null;
    }

    return token;
  };

  const fetchSales = async () => {
    const token = checkAuth();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sales?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('dashboard_token');
          localStorage.removeItem('dashboard_expires');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      setSalesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [period]);

  const handleLogout = () => {
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_expires');
    router.push('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Black Groweek</h1>
            <p className="text-gray-400 text-sm">Dashboard de Ventas</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {p === 'today' && 'Hoy'}
                {p === 'week' && 'Semana'}
                {p === 'month' && 'Mes'}
                {p === 'all' && 'Todo'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSales}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {loading && !salesData ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando datos...</p>
          </div>
        ) : salesData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatCurrency(salesData.totalRevenue)}
                </p>
              </div>
              <div
                className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setFilterBySku(null);
                  setShowOrders(true);
                }}
              >
                <p className="text-gray-400 text-sm mb-1">Órdenes</p>
                <p className="text-3xl font-bold">{salesData.totalOrders}</p>
                <p className="text-xs text-gray-500 mt-1">Click para ver detalle</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Productos Vendidos</p>
                <p className="text-3xl font-bold">
                  {salesData.productSales.reduce((acc, p) => acc + p.quantity, 0)}
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold">Ventas por Producto</h2>
              </div>
              {salesData.productSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th
                          onClick={() => handleSort('name')}
                          className="text-left px-6 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:text-white select-none"
                        >
                          Producto {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('sku')}
                          className="text-left px-6 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:text-white select-none"
                        >
                          SKU {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('quantity')}
                          className="text-right px-6 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:text-white select-none"
                        >
                          Cantidad {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('revenue')}
                          className="text-right px-6 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:text-white select-none"
                        >
                          Ingresos {sortBy === 'revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {sortedProducts.map((product) => (
                          <tr key={product.sku} className="hover:bg-gray-700/30">
                            <td className="px-6 py-4 text-sm">{product.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{product.sku}</td>
                            <td
                              className="px-6 py-4 text-sm text-right cursor-pointer hover:text-blue-400 underline"
                              onClick={() => {
                                setFilterBySku(product.sku);
                                setShowOrders(true);
                              }}
                            >
                              {product.quantity}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-green-400">
                              {formatCurrency(product.revenue)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-400">
                  No hay ventas en este período
                </div>
              )}
            </div>

            <p className="text-gray-500 text-sm mt-4 text-right">
              Última actualización: {formatDate(salesData.lastUpdated)}
            </p>

            {/* Modal de Órdenes */}
            {showOrders && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {filterBySku
                          ? `Pedidos de ${salesData.productSales.find(p => p.sku === filterBySku)?.name || filterBySku}`
                          : 'Lista de Pedidos'}
                        {' '}({filteredOrders.length})
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
                        setShowOrders(false);
                        setFilterBySku(null);
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
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">ID</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Fecha</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Cliente</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Email</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Cupón</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Productos</th>
                            <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-700/30">
                              <td className="px-4 py-4 text-sm">#{order.id}</td>
                              <td className="px-4 py-4 text-sm text-gray-400">
                                {formatDate(order.date)}
                              </td>
                              <td className="px-4 py-4 text-sm">{order.customerName}</td>
                              <td className="px-4 py-4 text-sm text-gray-400 break-all">{order.customerEmail}</td>
                              <td className="px-4 py-4 text-sm text-yellow-400">{order.coupon}</td>
                              <td className="px-4 py-4 text-sm">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className={`${filterBySku === item.sku ? 'text-blue-400' : 'text-gray-300'}`}>
                                    {item.name} <span className="text-gray-500">x{item.quantity}</span>
                                  </div>
                                ))}
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
  );
}
