import { NextRequest, NextResponse } from 'next/server';
import { getSalesData } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('Authorization');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'today' | 'week' | 'month' | 'all') || 'all';

    const salesData = await getSalesData(period);

    return NextResponse.json(salesData);
  } catch (error) {
    console.error('Sales API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}
