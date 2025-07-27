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

  const mockSummarize = async (videoId: string, url: string): Promise<Summary> => {
    // Simulate API calls with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const summaries = [
      "This video explores the fundamentals of artificial intelligence, covering machine learning algorithms, neural networks, and their real-world applications in modern technology.",
      "A comprehensive tutorial on React development, demonstrating component architecture, state management, and best practices for building scalable web applications.",
      "An in-depth analysis of sustainable energy solutions, discussing solar power, wind energy, and the transition to renewable energy sources globally.",
      "A detailed guide to personal finance management, covering budgeting strategies, investment principles, and long-term financial planning for individuals.",
      "An exploration of space exploration history, from early missions to current Mars rover projects and future plans for lunar colonization."
    ];
    
    const titles = [
      "Understanding Artificial Intelligence",
      "React Development Masterclass", 
      "The Future of Renewable Energy",
      "Personal Finance 101",
      "Journey to the Stars"
    ];
    
    const randomIndex = Math.floor(Math.random() * summaries.length);
    
    return {
      id: Date.now().toString(),
      videoId,
      title: titles[randomIndex],
      summary: summaries[randomIndex],
      timestamp: new Date().toLocaleString(),
      url
    };
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
      const summary = await mockSummarize(videoId, url.trim());
      
      setCurrentSummary(summary);
      
      const updatedSummaries = [summary, ...summaries];
      setSummaries(updatedSummaries);
      localStorage.setItem('synthesiser-summaries', JSON.stringify(updatedSummaries));
      
      toast({
        title: "Success!",
        description: "Video summarized successfully",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to summarize video. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            The Synthesiser
          </h1>
          <p className="text-lg text-muted-foreground">
            Transform YouTube videos into concise, intelligent summaries
          </p>
        </div>

        <Tabs defaultValue="summarise" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="summarise" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Summarise
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History ({summaries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summarise" className="space-y-6">
            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube URL here..."
                      className="h-12 text-lg border-2 focus:border-accent transition-all duration-200"
                      disabled={isLoading}
                    />
                    
                    {isLoading && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing video...</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="text-sm text-muted-foreground text-center">
                          {progress.toFixed(0)}% complete
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-success hover:bg-success/90 text-success-foreground px-12 py-3 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Summarise'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {currentSummary && (
              <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-semibold text-foreground">
                        {currentSummary.title}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {currentSummary.timestamp}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed text-base">
                      {currentSummary.summary}
                    </p>
                    <div className="pt-4 border-t border-border">
                      <a 
                        href={currentSummary.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 transition-colors text-sm"
                      >
                        View original video →
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Summary History</h2>
              {summaries.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={clearHistory}
                  className="text-sm"
                >
                  Clear History
                </Button>
              )}
            </div>

            {summaries.length === 0 ? (
              <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No summaries yet</h3>
                  <p className="text-muted-foreground">
                    Start by summarizing your first YouTube video!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary.id} className="shadow-md border-0 bg-card/70 backdrop-blur-sm hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-foreground">{summary.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {summary.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {summary.summary}
                        </p>
                        <a 
                          href={summary.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent/80 transition-colors text-xs inline-block"
                        >
                          View original video →
                        </a>
                      </div>
                    </CardContent>
                  </Card>
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