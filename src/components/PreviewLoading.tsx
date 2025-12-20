/**
 * PreviewLoading Component
 * Beautiful loading skeleton that looks like a webpage being built
 * Includes error checking animation phases
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileSearch, Settings, CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';

interface PreviewLoadingProps {
  stage?: string;
  filesGenerated?: number;
  totalFiles?: number;
  message?: string;
  progress?: number;
}

// Stage configurations for visual display
const stageConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  preparing: { 
    icon: <FileSearch className="w-4 h-4" />, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    label: 'Preparing' 
  },
  error_check: { 
    icon: <FileSearch className="w-4 h-4" />, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    label: 'Scanning' 
  },
  auto_fix: { 
    icon: <Wrench className="w-4 h-4" />, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    label: 'Auto-Fixing' 
  },
  security_scan: { 
    icon: <Shield className="w-4 h-4" />, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    label: 'Security Scan' 
  },
  error_blocked: { 
    icon: <XCircle className="w-4 h-4" />, 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10 border-red-500/20',
    label: 'Blocked' 
  },
  creating_repo: { 
    icon: <Settings className="w-4 h-4" />, 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/10 border-green-500/20',
    label: 'Creating' 
  },
  deploying: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'Deploying' 
  },
  waiting: { 
    icon: <AlertTriangle className="w-4 h-4" />, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    label: 'Waiting' 
  },
};

export const PreviewLoading: React.FC<PreviewLoadingProps> = ({
  stage = 'preparing',
  filesGenerated = 0,
  totalFiles = 0,
  message = 'Preparing preview...',
  progress = 0,
}) => {
  const config = stageConfig[stage] || stageConfig.preparing;
  const isErrorStage = stage === 'error_check' || stage === 'auto_fix' || stage === 'security_scan' || stage === 'error_blocked';
  
  return (
    <div className="h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <motion.div 
            className={`w-3 h-3 rounded-full ${
              stage === 'error_blocked' ? 'bg-red-500' :
              stage === 'auto_fix' ? 'bg-yellow-500' :
              stage === 'security_scan' ? 'bg-purple-500' :
              'bg-blue-500/80'
            }`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: stage === 'error_blocked' ? 0.5 : 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-zinc-400">
            {isErrorStage ? 'Pre-deployment Check' : 'Building Preview'}
          </span>
        </div>
        {totalFiles > 0 && (
          <span className="text-xs text-zinc-500">
            {filesGenerated}/{totalFiles} files
          </span>
        )}
      </div>

      {/* Loading Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {/* Progress Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">{message}</span>
            <span className="text-xs text-zinc-500">
              {progress > 0 ? `${Math.round(progress)}%` : totalFiles > 0 ? `${Math.round((filesGenerated / totalFiles) * 100)}%` : ''}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                stage === 'error_blocked' ? 'bg-red-500' :
                stage === 'security_scan' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                stage === 'auto_fix' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress > 0 ? progress : (filesGenerated / Math.max(totalFiles, 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Error Checking Animation */}
        {isErrorStage && (
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: stage === 'security_scan' ? [0, 360] : 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className={config.color}
              >
                {config.icon}
              </motion.div>
              <span className={`text-sm font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
            
            {/* Animated checklist */}
            <div className="space-y-2 pl-2">
              <AnimatePresence mode="popLayout">
                {stage === 'error_check' && (
                  <CheckItem key="syntax" text="Checking TypeScript syntax..." active />
                )}
                {stage === 'auto_fix' && (
                  <>
                    <CheckItem key="syntax-done" text="TypeScript syntax" done />
                    <CheckItem key="fixing" text="Auto-fixing issues..." active />
                  </>
                )}
                {stage === 'security_scan' && (
                  <>
                    <CheckItem key="syntax-done2" text="TypeScript syntax" done />
                    <CheckItem key="fixes-done" text="Issues auto-fixed" done />
                    <CheckItem key="security" text="Scanning for vulnerabilities..." active />
                  </>
                )}
                {stage === 'error_blocked' && (
                  <>
                    <CheckItem key="blocked" text="Critical errors found!" error />
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Skeleton Webpage */}
        <div className={`space-y-4 ${isErrorStage ? 'opacity-30' : ''}`}>
          {/* Header Skeleton */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-3">
              <SkeletonBox className="w-8 h-8 rounded-full" />
              <SkeletonBox className="w-32 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBox className="w-16 h-8 rounded-lg" />
              <SkeletonBox className="w-20 h-8 rounded-lg" />
            </div>
          </div>

          {/* Hero Section Skeleton */}
          <div className="p-8 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center">
            <SkeletonBox className="w-3/4 h-12 mx-auto mb-4" />
            <SkeletonBox className="w-1/2 h-6 mx-auto mb-6" />
            <div className="flex justify-center gap-3">
              <SkeletonBox className="w-32 h-10 rounded-lg" />
              <SkeletonBox className="w-32 h-10 rounded-lg" />
            </div>
          </div>

          {/* Feature Grid Skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <SkeletonBox className="w-12 h-12 rounded-lg mb-3" />
                <SkeletonBox className="w-full h-4 mb-2" />
                <SkeletonBox className="w-3/4 h-3" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Status Badge */}
        <motion.div
          className="mt-6 text-center"
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <motion.div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.bgColor}`}
            animate={stage === 'error_blocked' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: stage === 'error_blocked' ? Infinity : 0 }}
          >
            <motion.div
              animate={stage === 'error_blocked' ? {} : { scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={config.color}
            >
              {config.icon}
            </motion.div>
            <span className={`text-sm ${config.color}`}>
              {message}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// Animated check item for the checklist
const CheckItem: React.FC<{ text: string; done?: boolean; active?: boolean; error?: boolean }> = ({ 
  text, done, active, error 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2"
    >
      {done && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <CheckCircle className="w-3 h-3 text-green-400" />
        </motion.div>
      )}
      {active && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4"
        >
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
        </motion.div>
      )}
      {error && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center"
        >
          <XCircle className="w-3 h-3 text-red-400" />
        </motion.div>
      )}
      <span className={`text-xs ${
        done ? 'text-green-400/70' : 
        error ? 'text-red-400' : 
        'text-zinc-400'
      }`}>
        {text}
      </span>
    </motion.div>
  );
};

// Shimmer effect skeleton box
const SkeletonBox: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative overflow-hidden bg-zinc-800 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
};

