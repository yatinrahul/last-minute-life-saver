import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey, getGetTaskDashboardQueryKey, getGetUrgentTasksQueryKey, useAiBreakdownTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Zap, BrainCircuit, Play, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "done"]),
  dueDate: z.string().optional(),
  estimatedMinutes: z.coerce.number().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function Tasks() {
  const { data: tasks, isLoading } = useListTasks();
  const [filter, setFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredTasks = tasks?.filter(t => {
    if (filter === "all") return true;
    if (filter === "todo" || filter === "in_progress" || filter === "done") return t.status === filter;
    if (filter === "urgent") return t.priority === "urgent";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h2>
          <p className="text-muted-foreground mt-2 text-lg">Manage and track your action items.</p>
        </div>

        <TaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </TaskDialog>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
        <Button variant={filter === "todo" ? "default" : "outline"} size="sm" onClick={() => setFilter("todo")}>To Do</Button>
        <Button variant={filter === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setFilter("in_progress")}>In Progress</Button>
        <Button variant={filter === "done" ? "default" : "outline"} size="sm" onClick={() => setFilter("done")}>Done</Button>
        <Button variant={filter === "urgent" ? "destructive" : "outline"} size="sm" onClick={() => setFilter("urgent")}>Urgent</Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No tasks found</h3>
          <p className="mb-4">You're all caught up or there are no tasks matching this filter.</p>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create a Task</Button>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: "todo" | "in_progress" | "done") => {
    updateTask.mutate({ id: task.id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUrgentTasksQueryKey() });
        toast({ title: "Task updated" });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure?")) return;
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUrgentTasksQueryKey() });
        toast({ title: "Task deleted" });
      }
    });
  };

  const priorityColors = {
    low: "bg-secondary text-secondary-foreground",
    medium: "bg-primary/20 text-primary",
    high: "bg-orange-500/20 text-orange-600",
    urgent: "bg-destructive/20 text-destructive border-destructive/50 border",
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 ${task.status === 'done' ? 'opacity-60 grayscale' : ''}`}>
      {task.priority === "urgent" && task.status !== "done" && (
        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
      )}
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h4 className={`font-semibold text-lg ${task.status === 'done' ? 'line-through' : ''}`}>
              {task.title}
            </h4>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                {task.priority.toUpperCase()}
              </Badge>
              {task.aiScore && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Zap className="w-3 h-3 mr-1" />
                  {task.aiScore}
                </Badge>
              )}
            </div>
          </div>
          
          {task.description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-mono mt-auto">
            {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
            {task.estimatedMinutes && <span>Est: {task.estimatedMinutes}m</span>}
            {task.category && <span className="bg-secondary px-2 rounded">{task.category}</span>}
          </div>
        </div>

        <div className="flex sm:flex-col justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
          {task.status !== "done" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => handleStatusChange("done")}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Done
            </Button>
          )}
          {task.status === "todo" && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-blue-500" onClick={() => handleStatusChange("in_progress")}>
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
          )}
          {task.status === "todo" && (
            <AiBreakdownDialog task={task} open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-purple-500">
                <BrainCircuit className="w-4 h-4 mr-2" /> Breakdown
              </Button>
            </AiBreakdownDialog>
          )}
          <div className="flex-1" />
          <div className="flex gap-1 justify-end">
            <TaskDialog task={task} open={isEditOpen} onOpenChange={setIsEditOpen}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Edit2 className="w-4 h-4" />
              </Button>
            </TaskDialog>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskDialog({ children, task, open, onOpenChange }: { children?: React.ReactNode, task?: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const isEditing = !!task;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "medium",
      status: task?.status || "todo",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      estimatedMinutes: task?.estimatedMinutes || undefined,
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    const payload = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: task.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUrgentTasksQueryKey() });
          toast({ title: "Task updated successfully" });
          onOpenChange(false);
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUrgentTasksQueryKey() });
          toast({ title: "Task created successfully" });
          form.reset();
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} autoFocus /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Minutes</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AiBreakdownDialog({ children, task, open, onOpenChange }: { children: React.ReactNode, task: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const breakdownMutation = useAiBreakdownTask();
  const createMutation = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleBreakdown = () => {
    breakdownMutation.mutate({
      data: { taskId: task.id, taskTitle: task.title, taskDescription: task.description }
    });
  };

  const createSubtasks = () => {
    if (!breakdownMutation.data) return;
    
    // In a real app we might batch these or have a specialized endpoint
    // For now we just create them one by one
    let completed = 0;
    const total = breakdownMutation.data.subtasks.length;
    
    breakdownMutation.data.subtasks.forEach(subtask => {
      createMutation.mutate({
        data: {
          title: subtask,
          priority: task.priority,
          status: "todo",
          dueDate: task.dueDate
        }
      }, {
        onSuccess: () => {
          completed++;
          if (completed === total) {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            toast({ title: `Created ${total} subtasks` });
            onOpenChange(false);
          }
        }
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild onClick={handleBreakdown}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> 
            AI Task Breakdown
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="font-medium text-lg mb-4">{task.title}</p>
          
          {breakdownMutation.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <p className="text-sm text-muted-foreground mt-4 italic">Thinking...</p>
            </div>
          )}

          {breakdownMutation.isSuccess && breakdownMutation.data && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                <h4 className="font-semibold text-primary mb-2">Suggested Subtasks</h4>
                <ul className="list-decimal pl-5 space-y-2 text-sm text-foreground">
                  {breakdownMutation.data.subtasks.map((st, i) => <li key={i}>{st}</li>)}
                </ul>
              </div>
              
              {breakdownMutation.data.tips && breakdownMutation.data.tips.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Tips</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                    {breakdownMutation.data.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button onClick={createSubtasks} disabled={createMutation.isPending}>
                  Create as Individual Tasks
                </Button>
              </div>
            </div>
          )}

          {breakdownMutation.isError && (
            <div className="text-destructive">Failed to generate breakdown. Please try again.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
