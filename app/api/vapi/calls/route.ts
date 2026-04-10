import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '100';

  try {
    const { data } = await axios.get(
      `https://api.vapi.ai/call?assistantId=${process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // VAPI returns an array directly
    const calls = Array.isArray(data) ? data : (data.calls ?? []);
    return NextResponse.json({ calls, total: calls.length });
  } catch (error) {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 500) : 500;
    return NextResponse.json({ error: 'Failed to fetch calls from VAPI' }, { status });
  }
}
