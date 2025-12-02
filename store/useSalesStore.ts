import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProductSales {
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
  statusBreakdown: {
    completed: number;
    refunded: number;
    cancelled: number;
    pending: number;
    processing: number;
    onHold: number;
    failed: number;
  };
}

interface OrderDetail {
  id: number;
  date: string;
  total: string;
  customerName: string;
  customerEmail: string;
  coupon: string;
  status: string;
  items: { sku: string; name: string; quantity: number }[];
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  productSales: ProductSales[];
  orders: OrderDetail[];
  lastUpdated: string;
  ordersByStatus: {
    completed: number;
    refunded: number;
    cancelled: number;
    pending: number;
    processing: number;
    onHold: number;
    failed: number;
  };
}

type PeriodType = 'blackfriday' | 'cybermonday' | 'navidad' | 'all';

interface SalesStore {
  allSalesData: SalesData | null;
  salesData: SalesData | null;
  period: PeriodType;
  loading: boolean;
  error: string;
  setSalesData: (data: SalesData) => void;
  setPeriod: (period: PeriodType) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  fetchSales: (token: string) => Promise<void>;
  filterByPeriod: (period: PeriodType) => void;
}

const filterOrdersByPeriod = (orders: OrderDetail[], period: PeriodType): OrderDetail[] => {
  // Todas las fechas son de 00:00 a 23:59 (medianoche a medianoche)

  // Definir rangos de fechas para cada período
  const periodRanges: Record<PeriodType, { start: Date; end: Date }> = {
    all: {
      start: new Date('2025-11-13T00:00:00'),
      end: new Date('2025-12-31T23:59:59'),
    },
    blackfriday: {
      start: new Date('2025-11-13T00:00:00'),
      end: new Date('2025-11-30T23:59:59'),
    },
    cybermonday: {
      start: new Date('2025-12-01T00:00:00'),
      end: new Date('2025-12-01T23:59:59'),
    },
    navidad: {
      start: new Date('2025-12-02T00:00:00'),
      end: new Date('2025-12-31T23:59:59'),
    },
  };

  const range = periodRanges[period];

  return orders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate >= range.start && orderDate <= range.end;
  });
};

const calculateSalesData = (allOrders: OrderDetail[], period: PeriodType, lastUpdated: string): SalesData => {
  const filteredOrders = filterOrdersByPeriod(allOrders, period);

  // Fecha de inicio de la campaña: 13/11/2025 a las 00:00
  const campaignStartDate = new Date('2025-11-13T00:00:00');

  // Inicializar salesMap con todos los SKUs que existen en allOrders desde la fecha de campaña
  const salesMap = new Map<string, ProductSales>();

  // Primero, recopilar todos los SKUs únicos de todas las órdenes desde la fecha de campaña
  allOrders
    .filter(order => new Date(order.date) >= campaignStartDate)
    .forEach(order => {
      order.items.forEach(item => {
        if (!salesMap.has(item.sku)) {
          salesMap.set(item.sku, {
            sku: item.sku,
            name: item.name,
            quantity: 0,
            revenue: 0,
            statusBreakdown: {
              completed: 0,
              refunded: 0,
              cancelled: 0,
              pending: 0,
              processing: 0,
              onHold: 0,
              failed: 0,
            },
          });
        }
      });
    });

  let totalRevenue = 0;
  let completedOrders = 0;

  const ordersByStatus = {
    completed: 0,
    refunded: 0,
    cancelled: 0,
    pending: 0,
    processing: 0,
    onHold: 0,
    failed: 0,
  };

  filteredOrders.forEach(order => {
    // Count orders by status
    if (order.status === 'completed') ordersByStatus.completed++;
    else if (order.status === 'refunded') ordersByStatus.refunded++;
    else if (order.status === 'cancelled') ordersByStatus.cancelled++;
    else if (order.status === 'pending') ordersByStatus.pending++;
    else if (order.status === 'processing') ordersByStatus.processing++;
    else if (order.status === 'on-hold') ordersByStatus.onHold++;
    else if (order.status === 'failed') ordersByStatus.failed++;

    order.items.forEach(item => {
      const productSales = salesMap.get(item.sku);
      if (!productSales) return;

      if (order.status === 'completed') {
        productSales.quantity += item.quantity;
        productSales.revenue += parseFloat(order.total) / order.items.length;
      }

      if (order.status === 'completed') productSales.statusBreakdown.completed += item.quantity;
      else if (order.status === 'refunded') productSales.statusBreakdown.refunded += item.quantity;
      else if (order.status === 'cancelled') productSales.statusBreakdown.cancelled += item.quantity;
      else if (order.status === 'pending') productSales.statusBreakdown.pending += item.quantity;
      else if (order.status === 'processing') productSales.statusBreakdown.processing += item.quantity;
      else if (order.status === 'on-hold') productSales.statusBreakdown.onHold += item.quantity;
      else if (order.status === 'failed') productSales.statusBreakdown.failed += item.quantity;
    });

    if (order.status === 'completed') {
      completedOrders++;
      totalRevenue += parseFloat(order.total);
    }
  });

  return {
    totalRevenue,
    totalOrders: completedOrders,
    productSales: Array.from(salesMap.values()),
    orders: filteredOrders,
    lastUpdated,
    ordersByStatus,
  };
};

export const useSalesStore = create<SalesStore>()(
  persist(
    (set, get) => ({
      allSalesData: null,
      salesData: null,
      period: 'all',
      loading: false,
      error: '',

      setSalesData: (data) => set({ salesData: data }),

      setPeriod: (period) => set({ period }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      fetchSales: async (token) => {
        set({ loading: true, error: '' });

        try {
          const response = await fetch(`/api/sales?period=all`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Unauthorized');
            }
            throw new Error('Failed to fetch sales data');
          }

          const data = await response.json();
          const currentPeriod = get().period;

          // Siempre recalcular para aplicar el filtro de fecha de campaña (13/11/2025)
          const salesDataToSet = calculateSalesData(data.orders, currentPeriod, data.lastUpdated);

          set({
            allSalesData: data,
            salesData: salesDataToSet,
            loading: false,
            period: currentPeriod
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Error al cargar datos',
            loading: false
          });
          throw err;
        }
      },

      filterByPeriod: (period) => {
        const { allSalesData } = get();
        if (!allSalesData) return;

        const filteredData = calculateSalesData(allSalesData.orders, period, allSalesData.lastUpdated);
        set({ salesData: filteredData, period });
      },
    }),
    {
      name: 'sales-storage',
      partialize: (state) => ({
        allSalesData: state.allSalesData,
        salesData: state.salesData,
        period: state.period,
      }),
    }
  )
);
