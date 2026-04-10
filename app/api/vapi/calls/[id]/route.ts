import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data } = await axios.get(`https://api.vapi.ai/call/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 500) : 500;
    return NextResponse.json({ error: 'Failed to fetch call details from VAPI' }, { status });
  }
}
