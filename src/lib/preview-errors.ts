/**
 * Preview Error Handling System
 * Comprehensive error types and recovery strategies
 */

export enum PreviewErrorType {
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  BUILD_FAILED = 'BUILD_FAILED',
  PORT_IN_USE = 'PORT_IN_USE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface PreviewError {
  type: PreviewErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  retryable: boolean;
  technicalDetails?: any;
}

export class PreviewErrorHandler {
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  /**
   * Create a user-friendly error from a raw error
   */
  createError(error: any, context?: string): PreviewError {
    const errorMessage = error?.message || String(error);
    
    // Detect error type from message
    if (errorMessage.includes('EADDRINUSE') || errorMessage.includes('port')) {
      return {
        type: PreviewErrorType.PORT_IN_USE,
        message: 'Preview port is already in use',
        details: 'Another preview might be running. Try stopping other previews first.',
        recoverable: true,
        retryable: true,
        technicalDetails: error,
      };
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('file')) {
      return {
        type: PreviewErrorType.FILE_WRITE_FAILED,
        message: 'Failed to write preview files',
        details: 'There was an issue saving files to the preview directory.',
        recoverable: true,
        retryable: true,
        technicalDetails: error,
      };
    }

    if (errorMessage.includes('build') || errorMessage.includes('compilation')) {
      return {
        type: PreviewErrorType.BUILD_FAILED,
        message: 'Preview build failed',
        details: 'The application code has errors. Check the code viewer for issues.',
        recoverable: false,
        retryable: false,
        technicalDetails: error,
      };
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        type: PreviewErrorType.TIMEOUT,
        message: 'Preview took too long to start',
        details: 'The preview server didn\'t respond in time. This might be a temporary issue.',
        recoverable: true,
        retryable: true,
        technicalDetails: error,
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
      return {
        type: PreviewErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        details: 'Could not connect to the preview server. Check your internet connection.',
        recoverable: true,
        retryable: true,
        technicalDetails: error,
      };
    }

    if (errorMessage.includes('deploy') || errorMessage.includes('vercel')) {
      return {
        type: PreviewErrorType.DEPLOYMENT_FAILED,
        message: 'Deployment failed',
        details: 'The app couldn\'t be deployed. This might be a temporary Vercel issue.',
        recoverable: true,
        retryable: true,
        technicalDetails: error,
      };
    }

    // Unknown error
    return {
      type: PreviewErrorType.UNKNOWN,
      message: context ? `Preview error: ${context}` : 'An unexpected error occurred',
      details: errorMessage.substring(0, 200),
      recoverable: true,
      retryable: true,
      technicalDetails: error,
    };
  }

  /**
   * Should we retry this error?
   */
  shouldRetry(error: PreviewError, operationId: string): boolean {
    if (!error.retryable) return false;

    const attempts = this.retryAttempts.get(operationId) || 0;
    return attempts < this.maxRetries;
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay(operationId: string): number {
    const attempts = this.retryAttempts.get(operationId) || 0;
    // 2s, 4s, 8s
    return Math.min(2000 * Math.pow(2, attempts), 8000);
  }

  /**
   * Record retry attempt
   */
  recordRetry(operationId: string): void {
    const attempts = this.retryAttempts.get(operationId) || 0;
    this.retryAttempts.set(operationId, attempts + 1);
  }

  /**
   * Reset retry counter
   */
  resetRetries(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get retry attempt number
   */
  getRetryAttempt(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Get user-friendly error message with action items
   */
  getActionableMessage(error: PreviewError): string {
    switch (error.type) {
      case PreviewErrorType.PORT_IN_USE:
        return 'Try refreshing the page or wait a moment for the previous preview to shut down.';
      
      case PreviewErrorType.FILE_WRITE_FAILED:
        return 'Click "Clear Cache & Retry" to reset the preview system.';
      
      case PreviewErrorType.BUILD_FAILED:
        return 'Review the generated code in the code viewer for syntax errors or missing dependencies.';
      
      case PreviewErrorType.TIMEOUT:
        return 'The preview server might be overloaded. Try again in a few moments.';
      
      case PreviewErrorType.NETWORK_ERROR:
        return 'Check your internet connection and try again.';
      
      case PreviewErrorType.DEPLOYMENT_FAILED:
        return 'Wait a moment and try redeploying. The issue is likely temporary.';
      
      default:
        return 'Try refreshing the page or contact support if the problem persists.';
    }
  }

  /**
   * Get error severity
   */
  getSeverity(error: PreviewError): 'warning' | 'error' | 'critical' {
    if (!error.recoverable) return 'critical';
    if (error.type === PreviewErrorType.BUILD_FAILED) return 'error';
    return 'warning';
  }

  /**
   * Format error for logging
   */
  formatForLogging(error: PreviewError): string {
    return `[${error.type}] ${error.message}${error.details ? ` - ${error.details}` : ''}`;
  }
}

// Singleton instance
export const previewErrorHandler = new PreviewErrorHandler();

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationId: string,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: any;

  while (previewErrorHandler.shouldRetry({ 
    type: PreviewErrorType.UNKNOWN, 
    message: '', 
    recoverable: true, 
    retryable: true 
  }, operationId)) {
    try {
      const result = await operation();
      previewErrorHandler.resetRetries(operationId);
      return result;
    } catch (error) {
      lastError = error;
      const attempt = previewErrorHandler.getRetryAttempt(operationId);
      
      if (previewErrorHandler.shouldRetry({ 
        type: PreviewErrorType.UNKNOWN, 
        message: '', 
        recoverable: true, 
        retryable: true 
      }, operationId)) {
        const delay = previewErrorHandler.getRetryDelay(operationId);
        console.warn(`Retry attempt ${attempt + 1}/3 after ${delay}ms:`, error);
        
        if (onRetry) {
          onRetry(attempt + 1, delay);
        }
        
        previewErrorHandler.recordRetry(operationId);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

