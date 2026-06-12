import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { materials } from '@/lib/materials'

export async function POST(req: NextRequest) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { imageBase64, mediaType, order } = await req.json()

    // `order` is the user's locked vault order (array of material ids), reading
    // left-to-right, top-to-bottom — the same order the in-game vault uses.
    // We map by POSITION instead of asking the model to recognise each item,
    // which is far more reliable for visually similar materials.
    const orderedIds: string[] = Array.isArray(order) && order.length > 0
      ? order.filter((id: string) => materials.some(m => m.id === id))
      : materials.map(m => m.id)

    const numberedList = orderedIds
      .map((id, i) => {
        const mat = materials.find(m => m.id === id)!
        return `${i + 1}. ${mat.name}`
      })
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
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
              text: `This is a screenshot of the salvage/stash inventory grid from the game Marathon.

The inventory is a grid of item cells, read LEFT-TO-RIGHT, TOP-TO-BOTTOM. Each occupied cell shows:
- An item image
- A small "×N" count label in the BOTTOM-RIGHT corner of the cell (e.g. ×2, ×14, ×35)
- A coloured price badge in the TOP-LEFT corner — IGNORE this, it is not the count

The items in this vault appear in a FIXED, KNOWN order. Reading the grid left-to-right then top-to-bottom, the cells correspond to this numbered list (position 1 is the very first/top-left cell):

${numberedList}

Your job: for each numbered position, read the "×N" count in the BOTTOM-RIGHT corner of that cell and report it.

Rules:
1. Go strictly in reading order (left-to-right, top-to-bottom). The Nth cell you encounter is position N in the list above.
2. Read ONLY the "×N" number in the bottom-right corner. Never read the price badge (top-left) or any other number.
3. IMPORTANT: If a cell contains an item image but has NO "×N" count label at all, that means the count is exactly 1. Report count: 1 for those cells.
4. Only set count to null if the cell is genuinely empty (no item image) or the number is present but unreadable.
5. Report every occupied position you can see, including count 1.

Return ONLY valid JSON — no explanation, no markdown. An array of objects, one per position you read:
[{"position": 1, "count": 5}, {"position": 2, "count": 12}, ...]`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse response', raw: text }, { status: 400 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as { position: number; count: number | null }[]

    // Map each position back to the material id at that position in the order.
    const items = parsed
      .filter(r => typeof r.position === 'number' && typeof r.count === 'number' && r.count > 0)
      .map(r => ({ id: orderedIds[r.position - 1], count: r.count as number }))
      .filter(r => !!r.id)

    return NextResponse.json({ items, total: parsed.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('analyze-vault error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
