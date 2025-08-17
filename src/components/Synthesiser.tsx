import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Play, Loader2 } from 'lucide-react';
import { apiCall, ApiError } from '@/lib/api-client';
import { ConnectionStatus } from './ConnectionStatus';

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
      console.log('🚀 Starting video summarization...');
      
      // Use the new API client with retry logic
      const response = await apiCall('summarize', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to summarize video');
      }

      const data = response.data;
      
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
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('🌐 Network error - likely CORS or connectivity issue');
        throw new Error('Network error: Unable to connect to the backend server. This might be a CORS issue or the server is not accessible.');
      }
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
        
        {/* Connection Status */}
        <div className="mb-6">
          <ConnectionStatus />
        </div>

        {/* Input Form */}
        <div className="space-y-6">
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

          {/* Current Summary Display */}
          {currentSummary && (
            <div className="border border-border rounded-2xl bg-background shadow-sm">
              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-foreground">
                      {currentSummary.title}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {currentSummary.timestamp}
                    </span>
                  </div>
                  
                  <div className="max-w-[800px] mx-auto">
                    <div 
                      className="summary-content"
                      dangerouslySetInnerHTML={{ __html: currentSummary.summary }}
                      style={{
                        lineHeight: '1.6',
                        fontSize: '15px',
                        color: 'hsl(var(--foreground) / 0.8)'
                      }}
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-border">
                    <a 
                      href={currentSummary.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                    >
                      <Play className="w-4 h-4" />
                      View original video
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Synthesiser;