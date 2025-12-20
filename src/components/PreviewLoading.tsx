/**
 * PreviewLoading Component
 * Beautiful loading skeleton that looks like a webpage being built
 */

import React from 'react';
import { motion } from 'framer-motion';

interface PreviewLoadingProps {
  stage?: string;
  filesGenerated?: number;
  totalFiles?: number;
  message?: string;
}

export const PreviewLoading: React.FC<PreviewLoadingProps> = ({
  stage = 'preparing',
  filesGenerated = 0,
  totalFiles = 0,
  message = 'Preparing preview...',
}) => {
  return (
    <div className="h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-yellow-500/80"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-zinc-400">Building Preview</span>
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">{message}</span>
            {totalFiles > 0 && (
              <span className="text-xs text-zinc-500">
                {Math.round((filesGenerated / totalFiles) * 100)}%
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          {totalFiles > 0 && (
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${(filesGenerated / totalFiles) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>

        {/* Skeleton Webpage */}
        <div className="space-y-4">
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

          {/* Content Rows Skeleton */}
          <div className="space-y-3">
            <SkeletonBox className="w-full h-4" />
            <SkeletonBox className="w-5/6 h-4" />
            <SkeletonBox className="w-4/6 h-4" />
          </div>
        </div>

        {/* Status Messages */}
        <motion.div
          className="mt-8 text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
            <motion.div
              className="w-2 h-2 rounded-full bg-purple-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-purple-400">
              {stage === 'creating_repo' && 'Setting up repository...'}
              {stage === 'deploying' && 'Deploying to Vercel...'}
              {stage === 'waiting' && 'Waiting for build...'}
              {stage === 'preparing' && 'Preparing preview...'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
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

