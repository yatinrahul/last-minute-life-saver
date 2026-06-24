import { useState } from "react";
import { useListGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  color: z.string().min(1, "Color is required"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export default function Goals() {
  const { data: goals, isLoading } = useListGoals();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Goals</h2>
          <p className="text-muted-foreground mt-2 text-lg">Track your major objectives and stay aligned.</p>
        </div>

        <GoalDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </GoalDialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No goals defined</h3>
          <p className="mb-4">Setting clear goals helps prioritize tasks when things get chaotic.</p>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create your first Goal</Button>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteTask = useDeleteGoal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!confirm("Are you sure?")) return;
    deleteTask.mutate({ id: goal.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: "Goal deleted" });
      }
    });
  };

  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: goal.color || 'hsl(var(--primary))' }} />
      <CardHeader className="pb-2 pt-6 flex flex-row items-start justify-between">
        <CardTitle className="text-xl">{goal.title}</CardTitle>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GoalDialog goal={goal} open={isEditOpen} onOpenChange={setIsEditOpen}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Edit2 className="w-4 h-4" />
            </Button>
          </GoalDialog>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goal.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{goal.description}</p>
        )}
        
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm font-medium">
            <span>Progress</span>
            <span>{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>
        
        {goal.targetDate && (
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            Target: {new Date(goal.targetDate).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoalDialog({ children, goal, open, onOpenChange }: { children?: React.ReactNode, goal?: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const isEditing = !!goal;
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title || "",
      description: goal?.description || "",
      targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
      progress: goal?.progress || 0,
      color: goal?.color || "#e0501a",
    }
  });

  const onSubmit = (data: GoalFormValues) => {
    const payload = {
      ...data,
      targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: goal.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
          toast({ title: "Goal updated successfully" });
          onOpenChange(false);
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
          toast({ title: "Goal created successfully" });
          form.reset();
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Create Goal"}</DialogTitle>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Indicator</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" className="w-12 p-1 h-10" {...field} />
                      </FormControl>
                      <Input type="text" {...field} className="flex-1 font-mono uppercase text-xs" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {isEditing && (
              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress ({field.value}%)</FormLabel>
                    <FormControl>
                      <Input type="range" min="0" max="100" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "Save Changes" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
