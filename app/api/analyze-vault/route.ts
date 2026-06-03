import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { materials } from '@/lib/materials'

const MATERIAL_LIST = materials.map(m => `${m.id}: "${m.name}"`).join('\n')

export async function POST(req: NextRequest) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { imageBase64, mediaType } = await req.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `This is a screenshot of the salvage/stash inventory screen from the game Marathon.

The inventory is a grid of item cells. Each occupied cell contains:
- An item image in the centre
- A small "×N" count label in the BOTTOM-RIGHT corner of the cell (e.g. ×2, ×14, ×35)
- A coloured price badge in the TOP-LEFT corner (e.g. ◈300, ◈1.0k)

Rules:
1. ONLY report items where you can clearly read a "×N" count in the bottom-right corner
2. Do NOT guess or infer — if the count text is unclear, skip that item
3. Do NOT include items with ×0 or empty cells
4. The count is ALWAYS in the bottom-right as "×N" — do not read any other numbers

Here are the known material names to match against:
${MATERIAL_LIST}

Match what you see to the closest name in that list. If you cannot confidently match an item, skip it.

If the image does not clearly show a Marathon game inventory screen with readable ×N counts, return an empty array: []

Return ONLY valid JSON — no explanation, no markdown. Format:
[{"id": "material-id", "count": 5}, ...]`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse response', raw: text }, { status: 400 })
    }

    const results = JSON.parse(jsonMatch[0]) as { id: string; count: number }[]

    // Validate IDs against known materials
    const valid = results.filter(r => materials.find(m => m.id === r.id) && r.count > 0)

    // Return even if empty — client can distinguish "found nothing" from "error"
    return NextResponse.json({ items: valid, total: results.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('analyze-vault error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
