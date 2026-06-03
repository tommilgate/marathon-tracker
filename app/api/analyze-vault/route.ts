import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { materials } from '@/lib/materials'

const MATERIAL_LIST = materials.map(m => `${m.id}: "${m.name}"`).join('\n')

export async function POST(req: NextRequest) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { imageBase64, mediaType } = await req.json()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
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
              text: `This is a screenshot of the in-game salvage/stash inventory from the game Marathon.

Each item cell shows:
- The item image
- A count in the bottom-right corner like "×3", "×14", "×0" etc

Your job: identify every item you can see and its count.

Match each item to one of these known material IDs:
${MATERIAL_LIST}

Return ONLY a JSON array, no other text. Format:
[{"id": "material-id", "count": 5}, ...]

Only include items where count > 0. If you can't confidently identify an item, skip it.`,
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
