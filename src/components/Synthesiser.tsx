import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Play, History, Loader2 } from 'lucide-react';

interface Summary {
  id: string;
  videoId: string;
  title: string;
  summary: string;
  timestamp: string;
  url: string;
}

const Synthesiser = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>(() => {
    const stored = localStorage.getItem('synthesiser-summaries');
    return stored ? JSON.parse(stored) : [];
  });
  const { toast } = useToast();

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const simulateProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 15 + 5;
          if (next >= 100) {
            clearInterval(interval);
            setProgress(100);
            setTimeout(resolve, 200);
            return 100;
          }
          return next;
        });
      }, 300);
    });
  };

  const summarizeVideo = async (videoId: string, url: string): Promise<Summary> => {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize video');
      }

      const data = await response.json();
      
      // Extract title from the summary HTML or use a default
      const titleMatch = data.summary.match(/<h2[^>]*>([^<]+)<\/h2>/);
      const title = titleMatch ? titleMatch[1] : 'Video Summary';
      
      return {
        id: Date.now().toString(),
        videoId,
        title,
        summary: data.summary,
        timestamp: new Date().toLocaleString(),
        url
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCurrentSummary(null);

    try {
      await simulateProgress();
      const summary = await summarizeVideo(videoId, url.trim());
      
      setCurrentSummary(summary);
      
      const updatedSummaries = [summary, ...summaries];
      setSummaries(updatedSummaries);
      localStorage.setItem('synthesiser-summaries', JSON.stringify(updatedSummaries));
      
      toast({
        title: "Success!",
        description: "Video summarized successfully",
      });
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to summarize video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const clearHistory = () => {
    setSummaries([]);
    localStorage.removeItem('synthesiser-summaries');
    toast({
      title: "History cleared",
      description: "All summaries have been removed",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium text-foreground mb-3">
            The Synthesiser
          </h1>
          <p className="text-foreground/70 text-base">
            Transform YouTube videos into concise and intelligent summaries
          </p>
        </div>

        <Tabs defaultValue="summarise" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="summarise" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Play className="w-4 h-4" />
              Summarise
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <History className="w-4 h-4" />
              History ({summaries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summarise" className="space-y-6">
            <div className="border border-border rounded-2xl bg-background shadow-sm">
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube URL here..."
                      className="h-14 text-base border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      disabled={isLoading}
                    />
                    
                    {isLoading && (
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Processing video...</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground text-center">
                          {progress.toFixed(0)}% complete
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-success hover:bg-success/90 text-success-foreground px-8 py-3 h-12 text-base font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Summarise'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {currentSummary && (
              <div className="border border-border rounded-2xl bg-background shadow-sm">
                <div className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-medium text-foreground">
                        {currentSummary.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {currentSummary.timestamp}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div 
                        className="text-foreground/80 leading-relaxed text-sm m-0"
                        dangerouslySetInnerHTML={{ __html: currentSummary.summary }}
                      />
                    </div>
                    <div className="pt-4 border-t border-border">
                      <a 
                        href={currentSummary.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline transition-colors text-sm"
                      >
                        View original video →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-foreground">Summary History</h2>
              {summaries.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={clearHistory}
                  className="text-sm h-9 rounded-lg border-border hover:bg-muted/50"
                >
                  Clear History
                </Button>
              )}
            </div>

            {summaries.length === 0 ? (
              <div className="border border-border rounded-2xl bg-background shadow-sm">
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base font-medium text-foreground mb-2">No summaries yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Start by summarizing your first YouTube video!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {summaries.map((summary) => (
                  <div key={summary.id} className="border border-border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-foreground text-sm">{summary.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {summary.timestamp}
                          </span>
                        </div>
                        <div 
                          className="text-xs text-foreground/70 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: summary.summary }}
                        />
                        <a 
                          href={summary.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline transition-colors text-xs inline-block"
                        >
                          View original video →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Synthesiser;