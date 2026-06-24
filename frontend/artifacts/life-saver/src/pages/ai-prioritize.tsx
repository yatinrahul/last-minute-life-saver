import { useState } from "react";
import { useListTasks, useAiPrioritizeTasks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiPrioritize() {
  const { data: tasks, isLoading: tasksLoading } = useListTasks({ status: "todo" });
  const prioritizeMutation = useAiPrioritizeTasks();
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const toggleTask = (id: number) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handlePrioritize = () => {
    if (selectedTaskIds.length === 0) return;
    prioritizeMutation.mutate({
      data: { taskIds: selectedTaskIds }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">AI Prioritize</h2>
        <p className="text-muted-foreground mt-2 text-lg">Select tasks you're overwhelmed by, and let AI sort them out.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Select Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox 
                      id={`task-${task.id}`} 
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <label 
                      htmlFor={`task-${task.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                    >
                      {task.title}
                    </label>
                  </div>
                ))}
                
                <Button 
                  onClick={handlePrioritize} 
                  disabled={selectedTaskIds.length === 0 || prioritizeMutation.isPending}
                  className="w-full mt-4"
                >
                  {prioritizeMutation.isPending ? "Analyzing..." : "Prioritize Selected"}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No open tasks available to prioritize.</p>
            )}
          </CardContent>
        </Card>

        <div>
          {prioritizeMutation.isPending && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          )}

          {prioritizeMutation.isSuccess && prioritizeMutation.data && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-primary">Suggested Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{prioritizeMutation.data.scheduleSuggestion}</p>
                  
                  {prioritizeMutation.data.tips && prioritizeMutation.data.tips.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-primary/20">
                      <h4 className="font-semibold text-sm mb-2">Tips</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {prioritizeMutation.data.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Ranked Tasks</h3>
                {prioritizeMutation.data.prioritizedTasks.map((ranked, index) => {
                  const task = tasks?.find(t => t.id === ranked.taskId);
                  return (
                    <Card key={ranked.taskId} className="relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary" style={{ opacity: Math.max(0.2, 1 - index * 0.2) }} />
                      <CardContent className="p-4 pl-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{task?.title || `Task #${ranked.taskId}`}</h4>
                          <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded">
                            Score: {ranked.score}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{ranked.reason}</p>
                        <p className="text-xs font-medium text-primary">Time: {ranked.suggestedTime}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
