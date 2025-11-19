const WC_URL = process.env.WC_URL!
const WC_KEY = process.env.WC_CONSUMER_KEY!
const WC_SECRET = process.env.WC_CONSUMER_SECRET!

const TARGET_SKUS = [
  "pack-marketing-canva",
  "pack-marketing-ventas-productividad",
  "pack-diseño-grafico",
  "agentes",
  "copilot",
  "arte-digital",
  "canva",
  "marketing-ia",
  "ventas_ia",
  "productividad",
]

interface OrderItem {
  sku: string
  name: string
  quantity: number
  total: string
}

interface Order {
  id: number
  status: string
  date_created: string
  total: string
  billing: {
    first_name: string
    last_name: string
    email: string
  }
  coupon_lines: { code: string }[]
  line_items: OrderItem[]
}

export interface ProductSales {
  sku: string
  name: string
  quantity: number
  revenue: number
}

export interface OrderDetail {
  id: number
  date: string
  total: string
  customerName: string
  customerEmail: string
  coupon: string
  items: { sku: string; name: string; quantity: number }[]
}

export interface SalesData {
  totalRevenue: number
  totalOrders: number
  productSales: ProductSales[]
  orders: OrderDetail[]
  lastUpdated: string
}

async function fetchWooCommerce(
  endpoint: string,
  params: Record<string, string> = {}
) {
  const url = new URL(`${WC_URL}/wp-json/wc/v3/${endpoint}`)

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64")

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status}`)
  }

  return response.json()
}

export async function getSalesData(
  period: "today" | "week" | "month" | "all" = "all"
): Promise<SalesData> {
  const params: Record<string, string> = {
    per_page: "100",
    status: "completed",
  }

  const now = new Date()
  if (period === "today") {
    params.after = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  } else if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    params.after = weekAgo.toISOString()
  } else if (period === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    params.after = monthAgo.toISOString()
  }

  const orders: Order[] = await fetchWooCommerce("orders", params)

  const salesMap = new Map<string, ProductSales>()
  TARGET_SKUS.forEach((sku) => {
    salesMap.set(sku, { sku, name: sku, quantity: 0, revenue: 0 })
  })

  let totalRevenue = 0
  let totalOrders = 0
  const orderDetails: OrderDetail[] = []

  orders.forEach((order) => {
    let hasTargetProduct = false
    const targetItems: { sku: string; name: string; quantity: number }[] = []

    order.line_items.forEach((item) => {
      if (TARGET_SKUS.includes(item.sku)) {
        hasTargetProduct = true
        const existing = salesMap.get(item.sku)!
        existing.quantity += item.quantity
        existing.revenue += parseFloat(item.total)
        existing.name = item.name
        salesMap.set(item.sku, existing)
        targetItems.push({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
        })
      }
    })

    if (hasTargetProduct) {
      totalOrders++
      order.line_items.forEach((item) => {
        if (TARGET_SKUS.includes(item.sku)) {
          totalRevenue += parseFloat(item.total)
        }
      })

      orderDetails.push({
        id: order.id,
        date: order.date_created,
        total: order.total,
        customerName:
          `${order.billing.first_name} ${order.billing.last_name}`.trim() ||
          order.billing.email,
        customerEmail: order.billing.email,
        coupon: order.coupon_lines.map(c => c.code).join(', ') || '-',
        items: targetItems,
      })
    }
  })

  return {
    totalRevenue,
    totalOrders,
    productSales: Array.from(salesMap.values()).filter((p) => p.quantity > 0),
    orders: orderDetails.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    lastUpdated: new Date().toISOString(),
  }
}
