import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { runBookingAgent, type AgentMessage } from '@/lib/agent/booking-agent';
import { logAgentRun } from '@/lib/agent/audit';
import { allowAction } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

function todayInMalaga(): string {
  // The studio operates in Europe/Madrid; anchor "today" there.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function POST(request: NextRequest) {
  const actor = await verifyAdminToken(request.headers.get('Authorization'));
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  // Usage cap per admin (30 requests / 5 min).
  if (!(await allowAction(`agent:${actor}`, 30, 5 * 60))) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: corsHeaders }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'The booking assistant is not configured (missing OPENAI_API_KEY).' },
      { status: 503, headers: corsHeaders }
    );
  }

  let body: { message?: string; history?: AgentMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400, headers: corsHeaders });
  }

  const history = (body.history ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages: AgentMessage[] = [...history, { role: 'user', content: body.message }];

  try {
    const result = await runBookingAgent(messages, { today: todayInMalaga() });
    logAgentRun({
      actor,
      message: body.message,
      toolCalls: result.toolCalls,
      replyPreview: result.reply,
    }).catch(() => {});
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (e) {
    console.error('Agent run failed:', e);
    return NextResponse.json(
      { error: 'The booking assistant hit an error. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
