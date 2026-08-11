import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/firebase/admin';
import { executeTool } from '@/lib/agent/tools';
import { logAgentRun } from '@/lib/agent/audit';
import { allowAction } from '@/lib/rate-limit';
import { WRITE_TOOLS, type PendingAction } from '@/lib/agent/booking-agent';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/** Execute a previously-proposed agent write after the user confirms it (mobile). */
export async function POST(request: NextRequest) {
  const actor = await verifyAdminToken(request.headers.get('Authorization'));
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
  if (!(await allowAction(`agent-confirm:${actor}`, 30, 5 * 60))) {
    return NextResponse.json(
      { error: 'Too many actions. Please wait a moment.' },
      { status: 429, headers: corsHeaders }
    );
  }

  let action: PendingAction;
  try {
    action = (await request.json()) as PendingAction;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
  }
  if (!action?.tool || !WRITE_TOOLS.has(action.tool)) {
    return NextResponse.json({ error: 'Nothing to confirm.' }, { status: 400, headers: corsHeaders });
  }

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(action.arguments || '{}');
  } catch {
    return NextResponse.json({ error: 'Could not read the proposed action.' }, { status: 400, headers: corsHeaders });
  }

  try {
    const result = (await executeTool(action.tool, args)) as { success?: boolean; error?: string };
    logAgentRun({
      actor,
      message: `[confirmed] ${action.tool}`,
      toolCalls: [{ name: action.tool, arguments: action.arguments, result: JSON.stringify(result) }],
      replyPreview: result.success ? 'confirmed + executed' : `failed: ${result.error ?? ''}`,
    }).catch(() => {});

    if (result.success === false) {
      return NextResponse.json({ error: result.error ?? 'The action could not be completed.' }, { status: 400, headers: corsHeaders });
    }
    return NextResponse.json({ success: true, mutated: true }, { headers: corsHeaders });
  } catch (e) {
    console.error('agent confirm failed:', e);
    return NextResponse.json({ error: 'The action could not be completed.' }, { status: 500, headers: corsHeaders });
  }
}
