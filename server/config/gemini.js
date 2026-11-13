import { readFile } from 'node:fs/promises'

const REQUEST_TIMEOUT_MS = 20_000

function stripMarkdownFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function validateAssessment(value) {
  if (
    !value ||
    typeof value.isPothole !== 'boolean' ||
    !Number.isInteger(value.severity) ||
    value.severity < 1 ||
    value.severity > 5 ||
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    typeof value.reason !== 'string'
  ) {
    throw new Error('Gemini returned an assessment with an invalid JSON schema.')
  }

  return {
    checked: true,
    isPothole: value.isPothole,
    severity: value.severity,
    confidence: value.confidence,
    reason: value.reason.trim().slice(0, 300),
  }
}

export async function assessPothole(file) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const image = file.buffer ?? (file.path ? await readFile(file.path) : null)
  if (!image) throw new Error('Uploaded photo data is unavailable for AI assessment.')

  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  )

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Assess whether this photo clearly shows a road pothole. Return ONLY a JSON object with exactly these fields: {"isPothole": boolean, "severity": integer from 1 to 5, "confidence": number from 0 to 1, "reason": short string}. Severity 1 is minor and 5 is severe. If the image is unclear or does not show a road pothole, set isPothole to false and briefly explain why. Do not use markdown.',
            },
            {
              inline_data: {
                mime_type: file.mimetype,
                data: image.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const apiMessage =
      typeof result?.error?.message === 'string'
        ? result.error.message
        : 'Gemini returned an unspecified API error.'
    const error = new Error(
      `Gemini API request failed (${response.status}): ${apiMessage}`,
    )
    error.status = response.status
    throw error
  }

  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
  if (!text) throw new Error('Gemini returned no assessment text.')

  return validateAssessment(JSON.parse(stripMarkdownFences(text)))
}

export function getGeminiErrorDetails(error) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const rawMessage = error instanceof Error ? error.message : String(error)
  const message = apiKey ? rawMessage.split(apiKey).join('[REDACTED]') : rawMessage
  const status = Number.isInteger(error?.status) ? error.status : null

  return { status, message }
}
