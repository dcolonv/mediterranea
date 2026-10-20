/**
 * Transcribe a photo of handwritten treatment notes (the studio's paper
 * handbook) into an appointment's treatment record. Same OpenAI client and
 * model as the booking agent. The image is sent for this one request and not
 * stored by us.
 */
import OpenAI from 'openai';

const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-5.6';

const INSTRUCTIONS = `You transcribe a facial therapist's handwritten treatment notes from a photo of the studio's handbook.

- Transcribe what is written, faithfully, in the language it is written in (usually Spanish). Do not translate, summarise, correct, or add anything.
- Keep product names, device settings, numbers and abbreviations exactly as written.
- Write [?] for any word you cannot read.
- Put what was done or applied in this session in "applied", and anything noted for the next visit (recommendations, a plan, products to try) in "next". Leave "next" empty if there is none.
- Put each handwritten line on its own line, with no blank lines between them.
- If the photo holds no handwritten notes, return both fields empty.`;

export interface TranscribedNotes {
  applied: string;
  next: string;
}

export async function transcribeTreatmentNotes(
  imageDataUrl: string,
  context: { serviceName?: string } = {}
): Promise<TranscribedNotes> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: context.serviceName
              ? `Notes for a "${context.serviceName}" appointment.`
              : 'Notes for an appointment.',
          },
          // Handwriting needs the full-resolution read.
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'treatment_notes',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            applied: { type: 'string', description: 'What was done or applied in this session.' },
            next: { type: 'string', description: 'What to do at the next visit; empty if none.' },
          },
          required: ['applied', 'next'],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as Partial<TranscribedNotes>;
  return { applied: (parsed.applied ?? '').trim(), next: (parsed.next ?? '').trim() };
}
