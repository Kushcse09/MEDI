/**
 * Calls Claude to cross-check a newly shared record's medications/conditions
 * against the patient's existing known allergies and medications, returning
 * a structured JSON verdict the frontend can render as a warning banner.
 *
 * PHI note: only the minimal structured fields needed for the check are
 * sent — never the raw file — and nothing here is persisted outside this
 * request/response cycle.
 */
export async function checkForConflicts({ newRecordSummary, knownAllergies = [], knownMedications = [] }) {
  const systemPrompt = `You are a clinical safety cross-checker. Given a summary of a
newly shared medical record and a patient's known allergies/medications, identify any
potential drug or allergy conflicts. Respond ONLY with JSON, no prose, in this exact
shape:
{
  "hasConflict": boolean,
  "severity": "none" | "low" | "medium" | "high",
  "explanation": "one or two plain-language sentences",
  "flaggedItems": ["string", "..."]
}`;

  const userPrompt = `New record summary: ${newRecordSummary}
Known allergies: ${knownAllergies.join(", ") || "none listed"}
Known medications: ${knownMedications.join(", ") || "none listed"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await response.json();
  const text = data?.content?.find((b) => b.type === "text")?.text ?? "{}";

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { hasConflict: false, severity: "none", explanation: "Unable to parse AI response.", flaggedItems: [] };
  }
}
