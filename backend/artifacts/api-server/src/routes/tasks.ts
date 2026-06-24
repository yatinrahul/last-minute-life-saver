import { Router, type IRouter } from "express";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks/dashboard", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const allTasks = await db.select().from(tasksTable);
  const total = allTasks.length;
  const todo = allTasks.filter((t) => t.status === "todo").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const done = allTasks.filter((t) => t.status === "done").length;
  const urgent = allTasks.filter((t) => t.priority === "urgent" && t.status !== "done").length;
  const overdue = allTasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== "done"
  ).length;
  const dueToday = allTasks.filter(
    (t) => t.dueDate === todayStr && t.status !== "done"
  ).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  res.json({ total, todo, inProgress, done, urgent, overdue, dueToday, completionRate });
});

router.get("/tasks/urgent", async (_req, res): Promise<void> => {
  const todayStr = new Date().toISOString().split("T")[0];
  const allTasks = await db.select().from(tasksTable);
  const urgent = allTasks
    .filter(
      (t) =>
        t.status !== "done" &&
        (t.priority === "urgent" ||
          (t.dueDate && t.dueDate <= todayStr))
    )
    .sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (b.priority === "urgent" && a.priority !== "urgent") return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  res.json(urgent);
});

router.get("/tasks", async (req, res): Promise<void> => {
  const params = ListTasksQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);

  if (params.data.status) {
    tasks = tasks.filter((t) => t.status === params.data.status);
  }
  if (params.data.priority) {
    tasks = tasks.filter((t) => t.priority === params.data.priority);
  }

  res.json(tasks);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json(task);
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
