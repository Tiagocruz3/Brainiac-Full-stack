import React from 'react';
import { Loader2, CheckCircle2, XCircle, Database, Code, Rocket, FileSearch, Shield, Wrench, AlertTriangle } from 'lucide-react';
import { BuildStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  status: BuildStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  if (status.stage === 'idle') return null;

  const getIcon = () => {
    if (status.stage === 'error' || status.stage === 'error_blocked') return <XCircle className="h-5 w-5 text-red-500" />;
    if (status.stage === 'complete') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    
    switch (status.stage) {
      case 'preparing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error_check':
        return <FileSearch className="h-5 w-5 text-cyan-500 animate-pulse" />;
      case 'auto_fix':
        return <Wrench className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'security_scan':
        return <Shield className="h-5 w-5 text-purple-500 animate-pulse" />;
      case 'waiting':
        return <AlertTriangle className="h-5 w-5 text-orange-500 animate-pulse" />;
      case 'creating_supabase':
      case 'waiting_provisioning':
      case 'getting_keys':
        return <Database className="h-5 w-5 text-emerald-500 animate-pulse" />;
      case 'creating_repo':
        return <Code className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'deploying':
        return <Rocket className="h-5 w-5 text-orange-500 animate-pulse" />;
      default:
        return <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />;
    }
  };

  const getStageText = () => {
    switch (status.stage) {
      case 'preparing':
        return 'Planning your application...';
      case 'error_check':
        return 'Running pre-deployment checks...';
      case 'auto_fix':
        return 'Auto-fixing issues...';
      case 'security_scan':
        return 'Scanning for vulnerabilities...';
      case 'error_blocked':
        return '⚠️ Critical errors found';
      case 'creating_supabase':
        return 'Creating Supabase project...';
      case 'waiting_provisioning':
        return 'Waiting for provisioning...';
      case 'getting_keys':
        return 'Retrieving API keys...';
      case 'creating_repo':
        return 'Creating GitHub repository...';
      case 'deploying':
        return 'Deploying to Vercel...';
      case 'complete':
        return '🎉 Build complete!';
      case 'error':
        return '❌ Build failed';
      case 'waiting':
        return '⏳ Rate limited, waiting...';
      default:
        return 'Building...';
    }
  };

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl',
      status.stage === 'error' ? 'border-red-500/20 bg-red-950/20' :
      status.stage === 'complete' ? 'border-green-500/20 bg-green-950/20' :
      'border-zinc-800 bg-zinc-900/90'
    )}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getIcon()}
            <div>
              <p className="font-medium">{getStageText()}</p>
              <p className="text-sm text-zinc-400">{status.message}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          {status.stage !== 'error' && status.stage !== 'complete' && (
            <div className="flex items-center space-x-4">
              <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-zinc-400 w-12 text-right">
                {status.progress}%
              </span>
            </div>
          )}
        </div>

        {/* Error details */}
        {status.error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{status.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
