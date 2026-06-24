import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  AiPrioritizeTasksBody,
  AiBreakdownTaskBody,
  AiCoachBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/ai/prioritize", async (req, res): Promise<void> => {
  const parsed = AiPrioritizeTasksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskIds, context } = parsed.data;

  const tasks = taskIds.length > 0
    ? await db.select().from(tasksTable).where(inArray(tasksTable.id, taskIds))
    : await db.select().from(tasksTable);

  const taskSummary = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    estimatedMinutes: t.estimatedMinutes,
    category: t.category,
  }));

  const prompt = `You are a productivity expert. Analyze these tasks and provide an intelligent prioritization and scheduling plan.

Tasks to prioritize:
${JSON.stringify(taskSummary, null, 2)}

${context ? `Additional context: ${context}` : ""}
Today's date: ${new Date().toISOString().split("T")[0]}

Respond with a JSON object matching this exact structure:
{
  "prioritizedTasks": [
    {
      "taskId": <number>,
      "score": <integer 1-100, higher = more urgent>,
      "reason": "<brief explanation of why this task is prioritized this way>",
      "suggestedTime": "<e.g. 'Today 9am', 'Tomorrow morning', 'This week'>"
    }
  ],
  "scheduleSuggestion": "<a paragraph of scheduling advice for the day/week>",
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}

Order prioritizedTasks by score descending (highest first). Be specific and actionable.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
    });

    const text = response.text ?? "{}";
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "AI prioritization failed");
    res.status(500).json({ error: "AI prioritization failed" });
  }
});

router.post("/ai/breakdown", async (req, res): Promise<void> => {
  const parsed = AiBreakdownTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taskTitle, taskDescription } = parsed.data;

  const prompt = `You are a productivity expert. Break down this task into clear, actionable subtasks.

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ""}

Respond with a JSON object matching this exact structure:
{
  "subtasks": ["<subtask 1>", "<subtask 2>", ...],
  "estimatedTotalMinutes": <integer>,
  "tips": ["<productivity tip 1>", "<tip 2>", "<tip 3>"]
}

Provide 3-8 concrete subtasks. Be specific and actionable. Estimate realistic total time.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
    });

    const text = response.text ?? "{}";
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "AI breakdown failed");
    res.status(500).json({ error: "AI breakdown failed" });
  }
});

router.post("/ai/coach", async (req, res): Promise<void> => {
  const parsed = AiCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, context } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `You are a compassionate but direct productivity coach called "Coach". You help people who are overwhelmed, behind on deadlines, or struggling to prioritize. You give concrete, actionable advice — not generic platitudes. You understand urgency. You're empathetic but focused on helping people take action right now.

Keep responses concise and practical. Use short paragraphs. Never use bullet points — write in a direct conversational tone as if speaking to someone who needs help right now.`;

  const fullMessage = context
    ? `${message}\n\nContext: ${context}`
    : message;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I'm your productivity coach. I'm here to help you cut through the noise and take action. What's going on?" }] },
        { role: "user", parts: [{ text: fullMessage }] },
      ],
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "AI coach streaming failed");
    res.write(`data: ${JSON.stringify({ error: "Coaching session failed" })}\n\n`);
    res.end();
  }
});

export default router;
