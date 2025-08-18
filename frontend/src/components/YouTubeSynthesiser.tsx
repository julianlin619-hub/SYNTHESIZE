import { useState, useEffect } from "react";
import { NeonCard, NeonCardContent, NeonCardDescription, NeonCardHeader, NeonCardTitle } from "@/components/ui/neon-card";
import { NeonInput } from "@/components/ui/neon-input";
import { NeonButton } from "@/components/ui/neon-button";
import { Loader2 } from "lucide-react";
import { summarize, health } from "@/lib/api";

const YouTubeSynthesiser = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Ready to synthesise");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  // Test API connectivity
  const testApiConnection = async () => {
    try {
      const data = await health();
      console.log("✅ API Health Check Success:", data);
      return true;
    } catch (err) {
      console.error("❌ API Health Check Error:", err);
      return false;
    }
  };

  // Test API on component mount
  useEffect(() => {
    testApiConnection();
  }, []);

  const handleSummarise = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setStatus("Connecting to neural networks...");
    setError("");
    setSummary("");
    
    try {
      setStatus("Fetching transcript...");
      
      console.log("🔍 Starting summarize request for URL:", url.trim());
      
      const data = await summarize(url.trim());
      console.log("📄 Response data:", data);
      
      setSummary(data.summary);
      setStatus("Synthesis complete!");
    } catch (err) {
      console.error("💥 Fetch error:", err);
      let errorMessage = 'An unknown error occurred';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a shorter video.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setStatus("Synthesis failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] animate-pulse opacity-20" />
      
      {/* Main container with neon border frame */}
      <div className="relative w-full max-w-4xl">
        {/* Outer neon frame */}
        <div className="absolute -inset-4 border-2 border-primary rounded-lg shadow-neon-blue animate-glow"></div>
        
        {/* Corner accents */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-secondary"></div>
        <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-secondary"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-secondary"></div>
        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-secondary"></div>
        
        <NeonCard className="relative bg-card/90 backdrop-blur-sm">
          <NeonCardHeader className="text-center space-y-4">
            <NeonCardTitle className="text-4xl md:text-5xl font-bold text-primary text-shadow-neon-blue animate-pulse-neon">
              THE SYNTHESISER
            </NeonCardTitle>
            <NeonCardDescription className="text-lg text-muted-foreground">
              Transform YouTube videos into concise and intelligent summaries
            </NeonCardDescription>
            
            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-neon-green shadow-neon-green animate-pulse"></div>
              )}
              <span className="text-foreground">{status}</span>
            </div>
          </NeonCardHeader>
          
          <NeonCardContent className="space-y-6">
            <div className="space-y-4">
              <NeonInput
                type="url"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-center"
                disabled={isLoading}
              />
              
              <NeonButton
                variant="neon-green"
                size="lg"
                className="w-full"
                onClick={handleSummarise}
                disabled={!url.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Synthesising...
                  </>
                ) : (
                  "SYNTHESISE"
                )}
              </NeonButton>
            </div>
            
            {/* Error display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">Error: {error}</p>
              </div>
            )}
            
            {/* Summary display */}
            {summary && (
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Generated Summary</h3>
                <div 
                  className="prose prose-invert max-w-none text-foreground [&_.summary-heading]:text-blue-400 [&_.summary-heading]:text-shadow-lg [&_.summary-heading]:text-shadow-blue-500/30 [&_.summary-section]:mb-8 [&_.summary-list]:mt-3 [&_.summary-list]:mb-6 [&_.summary-item]:mb-2 [&_.summary-item]:text-sm [&_.summary-paragraph]:mb-3 [&_strong]:text-yellow-400 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: summary }}
                />
              </div>
            )}
            
            {/* Decorative elements */}
            <div className="flex justify-center space-x-4 pt-4">
              <div className="w-2 h-2 rounded-full bg-primary shadow-neon-blue animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-secondary shadow-neon-pink animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <div className="w-2 h-2 rounded-full bg-accent shadow-neon-purple animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
          </NeonCardContent>
        </NeonCard>
        
        {/* Additional glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-lg blur-3xl -z-10"></div>
      </div>
    </div>
  );
};

export default YouTubeSynthesiser;