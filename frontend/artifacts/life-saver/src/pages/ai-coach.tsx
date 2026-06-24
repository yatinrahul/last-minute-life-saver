import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AiCoach() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm your productivity coach. What's overwhelming you right now?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      
      const response = await fetch(`${import.meta.env.BASE_URL}api/ai/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, context: "productivity coaching" })
      });

      if (!response.ok) throw new Error("Failed to fetch");
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content += data.content;
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors from incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Sorry, I encountered an error connecting to the coach.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">AI Coach</h2>
        <p className="text-muted-foreground mt-2 text-lg mb-6">Talk through your priorities and blockers.</p>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg shadow-sm flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-4",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-lg max-w-[80%]",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted text-foreground rounded-tl-none border border-border"
                )}>
                  {msg.content || (
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-border bg-muted/30">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
