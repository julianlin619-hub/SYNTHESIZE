import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { healthCheck } from '@/lib/api-client';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus = ({ className = '' }: ConnectionStatusProps) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    try {
      const isHealthy = await healthCheck();
      
      if (isHealthy) {
        setStatus('connected');
        setLastCheck(new Date());
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking backend connection...';
      case 'connected':
        return 'Backend connected';
      case 'disconnected':
        return 'Backend disconnected';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'disconnected':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <Alert className={`${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <AlertDescription className="ml-2">
        {getStatusText()}
        {lastCheck && status === 'connected' && (
          <span className="text-xs text-gray-500 ml-2">
            (Last checked: {lastCheck.toLocaleTimeString()})
          </span>
        )}
        {status === 'disconnected' && (
          <div className="mt-2 text-sm text-red-700">
            <p>• Make sure the backend is running on port 5055</p>
            <p>• Check if there are any firewall or network issues</p>
            <p>• Try restarting the backend server</p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
