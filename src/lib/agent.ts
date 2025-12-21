import Anthropic from '@anthropic-ai/sdk';
import { ApiKeys } from '@/types';
import { createSupabaseProject } from './tools/supabase-backend';
import { createGithubRepo, createGithubFile, getGithubFile, updateGithubFile } from './tools/github';
import { createVercelProject, addVercelEnvVar, triggerVercelDeployment } from './tools/vercel';
import { SYSTEM_PROMPT } from './prompts/system';
import { templates } from './templates';
import { sleep } from './utils';
import { 
  ERROR_CHECKER, 
  DetectedError, 
  FileSet,
  PackageJson 
} from './error-checker';

// =============================================================================
// COMPREHENSIVE PRE-DEPLOYMENT ERROR CHECKING
// =============================================================================

interface ErrorCheckResult {
  hasBlockingErrors: boolean;
  errors: DetectedError[];
  stats: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    autoFixed: number;
  };
  fixedFiles: FileSet;
}

/**
 * Comprehensive pre-deployment error check
 * Runs all error checkers and auto-fixes what it can
 * Now with progress callbacks for UI feedback
 */
async function runPreDeploymentChecks(
  files: FileSet,
  packageJson: PackageJson | undefined,
  onProgress: ProgressCallback
): Promise<ErrorCheckResult> {
  const allErrors: DetectedError[] = [];
  let fixedFiles = { ...files };
  let totalAutoFixed = 0;
  const totalFiles = Object.keys(files).length;
  let filesChecked = 0;
  
  console.log('🔍 Running pre-deployment error checks...');
  
  // ========================================
  // PHASE 1: Scanning Files (40-50%)
  // ========================================
  onProgress('error_check', '🔍 Scanning files for errors...', 40);
  await sleep(200); // Small delay for animation
  
  // 1. Check each file for code errors
  for (const [path, content] of Object.entries(files)) {
    filesChecked++;
    const scanProgress = 40 + ((filesChecked / totalFiles) * 5);
    onProgress('error_check', `🔍 Scanning ${path}...`, Math.floor(scanProgress));
    
    if (path.endsWith('.tsx') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.js')) {
      // First, check for and fix invalid characters (TS1127)
      let currentContent = content;
      
      // Check if there are problematic Unicode characters that need fixing (causes TS1127)
      // This pattern catches: zero-width chars, smart quotes, special spaces, dashes, control chars
      const hasProblematicChars = /[\u200B-\u200F\u2028-\u202F\uFEFF\u00A0\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u00AD\u2010-\u2015\u2032\u2033\u2039\u203A\u00AB\u00BB\u2060\u180E\u3000\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(currentContent);
      
      if (hasProblematicChars) {
        allErrors.push({
          id: 'invalid-characters',
          message: `[${path}] Contains invalid Unicode characters (TS1127)`,
          severity: 'error',
          canAutoFix: true,
        });
        
        // Auto-fix: comprehensive replacement of ALL problematic characters
        currentContent = currentContent
          // Zero-width and invisible characters - REMOVE
          .replace(/[\u200B-\u200F]/g, '')  // Zero-width spaces & direction marks
          .replace(/[\u2028\u2029]/g, '\n') // Line/paragraph separators → newline
          .replace(/[\u202A-\u202F]/g, '')  // Direction formatting - remove
          .replace(/\uFEFF/g, '')           // BOM - remove
          .replace(/\u00AD/g, '')           // Soft hyphen - remove
          .replace(/\u2060/g, '')           // Word joiner - remove
          .replace(/\u180E/g, '')           // Mongolian vowel separator - remove
          
          // Special spaces → regular space
          .replace(/[\u00A0\u2000-\u200A\u3000]/g, ' ')
          
          // Smart quotes → straight quotes
          .replace(/[\u2018\u2019\u201A\u201B\u2032\u2039\u203A]/g, "'") // Single quotes
          .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"') // Double quotes
          
          // Special dashes → regular hyphen
          .replace(/[\u2010-\u2015\u2212]/g, '-') // Various dashes
          .replace(/\u2013/g, '-')  // En dash
          .replace(/\u2014/g, '-')  // Em dash
          
          // Ellipsis → three dots
          .replace(/\u2026/g, '...')
          
          // Remove any remaining control characters (except newline, tab, carriage return)
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
        
        fixedFiles[path] = currentContent;
        totalAutoFixed++;
        onProgress('auto_fix', `✅ Fixed invalid characters in ${path}`, Math.floor(scanProgress));
        console.log(`✅ Auto-fixed invalid characters in ${path}`);
        await sleep(100);
      }
      
      const fileErrors = ERROR_CHECKER.preCheck(currentContent, path);
      
      if (fileErrors.length > 0) {
        console.log(`⚠️ Found ${fileErrors.length} issues in ${path}`);
        onProgress('error_check', `⚠️ Found ${fileErrors.length} issues in ${path}`, Math.floor(scanProgress));
        await sleep(100);
        
        // Try to auto-fix
        const { fixedCode, fixedCount, remainingErrors } = ERROR_CHECKER.autoFix(currentContent, fileErrors);
        
        if (fixedCount > 0) {
          console.log(`✅ Auto-fixed ${fixedCount} issues in ${path}`);
          onProgress('auto_fix', `✅ Auto-fixed ${fixedCount} issues in ${path}`, Math.floor(scanProgress));
          fixedFiles[path] = fixedCode;
          totalAutoFixed += fixedCount;
          await sleep(100);
        }
        
        // Add remaining errors with file context
        remainingErrors.forEach(err => {
          allErrors.push({
            ...err,
            message: `[${path}] ${err.message}`,
          });
        });
      }
    }
    
    // Check CSS files
    if (path.endsWith('.css')) {
      if (!content.includes('@tailwind') && path.includes('index.css')) {
        allErrors.push({
          id: 'missing-tailwind-directives',
          message: `[${path}] Missing @tailwind directives`,
          severity: 'error',
          canAutoFix: true,
        });
        
        // Auto-fix: add tailwind directives
        fixedFiles[path] = `@tailwind base;
@tailwind components;
@tailwind utilities;

${content}`;
        totalAutoFixed++;
        onProgress('auto_fix', `✅ Added @tailwind directives to ${path}`, Math.floor(scanProgress));
        console.log(`✅ Auto-added @tailwind directives to ${path}`);
        await sleep(100);
      }
    }
    
    // Check HTML files for escaped quotes (parse5 error prevention)
    if (path.endsWith('.html')) {
      // Check for escaped quotes that will cause parse5 errors
      const escapedQuotePattern = /\\"/g;
      if (escapedQuotePattern.test(content)) {
        allErrors.push({
          id: 'html-escaped-quotes',
          message: `[${path}] Contains escaped quotes (\\"  ) that will cause HTML parse error`,
          severity: 'error',
          canAutoFix: true,
        });
        
        // Auto-fix: replace escaped quotes with normal quotes
        const fixedHtml = content.replace(/\\"/g, '"');
        fixedFiles[path] = fixedHtml;
        totalAutoFixed++;
        onProgress('auto_fix', `✅ Fixed escaped quotes in ${path}`, Math.floor(scanProgress));
        console.log(`✅ Auto-fixed escaped quotes in ${path}`);
        await sleep(100);
      }
      
      // Also check for other common HTML issues
      if (content.includes('type=\\"module\\"') || content.includes("type=\\'module\\'")) {
        allErrors.push({
          id: 'html-malformed-script-type',
          message: `[${path}] Script tag has malformed type attribute`,
          severity: 'error',
          canAutoFix: true,
        });
        
        // Already fixed above with escaped quote replacement
      }
    }
  }
  
  // ========================================
  // PHASE 2: Checking package.json (50-52%)
  // ========================================
  onProgress('error_check', '📦 Checking package.json...', 50);
  await sleep(150);
  
  if (packageJson) {
    const packageErrors = ERROR_CHECKER.preCheckPackage(packageJson);
    
    if (packageErrors.length > 0) {
      console.log(`⚠️ Found ${packageErrors.length} package.json issues`);
      onProgress('error_check', `⚠️ Found ${packageErrors.length} package.json issues`, 51);
      await sleep(100);
      
      const { fixedPackageJson, fixedCount, remainingErrors } = ERROR_CHECKER.autoFixPackage(
        packageJson,
        packageErrors
      );
      
      if (fixedCount > 0) {
        console.log(`✅ Auto-fixed ${fixedCount} package.json issues`);
        onProgress('auto_fix', `✅ Fixed ${fixedCount} package.json issues`, 51);
        fixedFiles['package.json'] = JSON.stringify(fixedPackageJson, null, 2);
        totalAutoFixed += fixedCount;
        await sleep(100);
      }
      
      remainingErrors.forEach(err => {
        allErrors.push({
          ...err,
          message: `[package.json] ${err.message}`,
        });
      });
    }
  }
  
  // ========================================
  // PHASE 3: Build Config Check (52-54%)
  // ========================================
  onProgress('error_check', '⚙️ Validating build configuration...', 52);
  await sleep(150);
  
  const configErrors = ERROR_CHECKER.preCheckBuildConfig(files);
  
  if (configErrors.length > 0) {
    console.log(`⚠️ Found ${configErrors.length} build config issues`);
    onProgress('error_check', `⚠️ Found ${configErrors.length} config issues`, 53);
    await sleep(100);
    
    const { fixedFiles: newFixedFiles, fixedCount, remainingErrors } = ERROR_CHECKER.autoFixBuildConfig(
      fixedFiles,
      configErrors
    );
    
    if (fixedCount > 0) {
      console.log(`✅ Auto-generated ${fixedCount} missing config files`);
      onProgress('auto_fix', `✅ Generated ${fixedCount} missing config files`, 53);
      fixedFiles = newFixedFiles;
      totalAutoFixed += fixedCount;
      await sleep(100);
    }
    
    allErrors.push(...remainingErrors);
  }
  
  // ========================================
  // PHASE 4: Security Scan (54-58%)
  // ========================================
  onProgress('security_scan', '🔒 Running security scan...', 54);
  await sleep(200);
  
  const securityPatterns = ERROR_CHECKER.securityPatterns;
  let securityIssues = 0;
  
  for (const [path, content] of Object.entries(fixedFiles)) {
    for (const pattern of securityPatterns) {
      if (pattern.pattern && pattern.pattern.test(content)) {
        securityIssues++;
        const severity = pattern.severity;
        allErrors.push({
          id: pattern.id,
          message: `[${path}] ${pattern.description}`,
          severity: severity,
          canAutoFix: pattern.autoFix !== null,
          action: pattern.action,
        });
        
        if (severity === 'critical') {
          onProgress('security_scan', `🚨 CRITICAL: ${pattern.description}`, 56);
          await sleep(150);
        }
        
        // Try to auto-fix security issues
        if (pattern.autoFix) {
          const fixed = pattern.autoFix(content);
          if (fixed !== content) {
            fixedFiles[path] = fixed;
            totalAutoFixed++;
            onProgress('auto_fix', `🔒 Fixed security issue: ${pattern.id}`, 57);
            console.log(`🔒 Auto-fixed security issue in ${path}: ${pattern.id}`);
            await sleep(100);
          }
        }
      }
    }
  }
  
  if (securityIssues === 0) {
    onProgress('security_scan', '✅ No security issues found', 58);
  } else {
    onProgress('security_scan', `⚠️ Found ${securityIssues} security issues`, 58);
  }
  await sleep(100);
  
  // Get final stats
  const stats = ERROR_CHECKER.getErrorStats(allErrors);
  const hasBlockingErrors = ERROR_CHECKER.shouldBlockDeployment(allErrors);
  
  // ========================================
  // PHASE 5: Summary (58-60%)
  // ========================================
  if (hasBlockingErrors) {
    onProgress('error_blocked', `🛑 ${stats.critical} critical errors found - deployment blocked`, 58);
    console.log('\n🛑 DEPLOYMENT BLOCKED: Critical errors found!');
  } else if (stats.total > 0) {
    const summaryMsg = totalAutoFixed > 0 
      ? `✅ Fixed ${totalAutoFixed} issues, ${stats.total - totalAutoFixed} remaining`
      : `⚠️ ${stats.total} issues found (${stats.warning} warnings)`;
    onProgress('error_check', summaryMsg, 59);
  } else {
    onProgress('error_check', '✅ All checks passed!', 59);
  }
  
  await sleep(200);
  
  // Log summary
  console.log('\n📊 Pre-deployment check summary:');
  console.log(`   Total issues: ${stats.total}`);
  if (stats.critical > 0) console.log(`   🚨 Critical: ${stats.critical}`);
  if (stats.error > 0) console.log(`   ❌ Errors: ${stats.error}`);
  if (stats.warning > 0) console.log(`   ⚠️ Warnings: ${stats.warning}`);
  if (stats.info > 0) console.log(`   ℹ️ Info: ${stats.info}`);
  console.log(`   ✅ Auto-fixed: ${totalAutoFixed}`);
  
  return {
    hasBlockingErrors,
    errors: allErrors,
    stats: { ...stats, autoFixed: totalAutoFixed },
    fixedFiles,
  };
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: {
    githubUrl?: string;
    vercelUrl?: string;
    supabaseUrl?: string;
    supabaseCredentials?: any;
    projectContext?: {
      name: string;
      githubRepo: string;
      vercelProjectId: string;
      supabaseProjectRef: string;
    };
  };
  error?: string;
}

export interface ProgressCallback {
  (stage: string, message: string, progress: number): void;
}

export interface FileUpdateCallback {
  (files: Record<string, string>): void;
}

export async function runAgent(
  userMessage: string,
  apiKeys: ApiKeys,
  onProgress: ProgressCallback,
  conversationHistory?: Anthropic.MessageParam[], // ← For context
  signal?: AbortSignal, // ← NEW! For stop button
  model: string = 'claude-sonnet-4-20250514', // ← Model selection
  onFileUpdate?: FileUpdateCallback // ← NEW! For preview updates
): Promise<AgentResponse> {
  try {
    // Check if aborted before starting
    if (signal?.aborted) {
      throw new Error('Build cancelled by user');
    }

    const client = new Anthropic({
      apiKey: apiKeys.anthropic,
      dangerouslyAllowBrowser: true, // Allow browser usage
    });

    onProgress('preparing', 'Planning your application...', 5);

    // Define tools for the agent
    const tools: Anthropic.Tool[] = [
      {
        name: 'create_app_from_template',
        description: 'Creates ALL files for an app using a pre-built template in ONE operation. This is the FASTEST way to build apps! Creates repo + all template files (15+) instantly. Use this instead of manually creating files.',
        input_schema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template ID - use "todo-app" for most apps',
              enum: templates.map(t => t.id),
            },
            repo_name: {
              type: 'string',
              description: 'GitHub repository name (e.g., "my-landing-page")',
            },
            repo_description: {
              type: 'string',
              description: 'Repository description',
            },
            customize_app: {
              type: 'string',
              description: 'Optional: Custom App.tsx content if you want to replace the template App (leave empty to use template App)',
            },
          },
          required: ['template_id', 'repo_name'],
        },
      },
      {
        name: 'create_supabase_project',
        description: 'Creates a Supabase project with database. Returns project_url, anon_key, service_key, db_password. Takes ~3 minutes.',
        input_schema: {
          type: 'object',
          properties: {
            app_name: {
              type: 'string',
              description: 'Name of the app (e.g., "todo", "blog")',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'create_github_repo',
        description: 'Creates a new GitHub repository',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Repository name (e.g., "my-todo-app")',
            },
            description: {
              type: 'string',
              description: 'Repository description',
            },
            private: {
              type: 'boolean',
              description: 'Whether the repo should be private',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'read_github_file',
        description: 'Reads a file from a GitHub repository to see its current contents',
        input_schema: {
          type: 'object',
          properties: {
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            path: {
              type: 'string',
              description: 'File path (e.g., "src/App.tsx")',
            },
          },
          required: ['repo', 'path'],
        },
      },
      {
        name: 'create_github_file',
        description: 'Creates a file in a GitHub repository. IMPORTANT: When creating multiple files (like from a template), call this tool multiple times IN THE SAME RESPONSE for all files at once. Do NOT call once, wait, then call again - batch all calls together to prevent rate limits.',
        input_schema: {
          type: 'object',
          properties: {
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            path: {
              type: 'string',
              description: 'File path (e.g., "src/App.tsx")',
            },
            content: {
              type: 'string',
              description: 'File content',
            },
            message: {
              type: 'string',
              description: 'Commit message',
            },
          },
          required: ['repo', 'path', 'content', 'message'],
        },
      },
      {
        name: 'update_github_file',
        description: 'Updates an existing file in a GitHub repository. Use read_github_file first to get the current SHA.',
        input_schema: {
          type: 'object',
          properties: {
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            path: {
              type: 'string',
              description: 'File path (e.g., "src/App.tsx")',
            },
            content: {
              type: 'string',
              description: 'New file content',
            },
            message: {
              type: 'string',
              description: 'Commit message',
            },
            sha: {
              type: 'string',
              description: 'Current file SHA (get from read_github_file)',
            },
          },
          required: ['repo', 'path', 'content', 'message', 'sha'],
        },
      },
      {
        name: 'create_vercel_project',
        description: 'Creates and deploys a Vercel project from a GitHub repo',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            github_repo: {
              type: 'string',
              description: 'GitHub repo (owner/repo)',
            },
          },
          required: ['name', 'github_repo'],
        },
      },
      {
        name: 'add_vercel_env_var',
        description: 'Adds an environment variable to a Vercel project',
        input_schema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Vercel project ID',
            },
            key: {
              type: 'string',
              description: 'Environment variable key',
            },
            value: {
              type: 'string',
              description: 'Environment variable value',
            },
          },
          required: ['project_id', 'key', 'value'],
        },
      },
      {
        name: 'trigger_vercel_deployment',
        description: 'Triggers a new deployment of a Vercel project (use after updating code)',
        input_schema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Vercel project ID',
            },
          },
          required: ['project_id'],
        },
      },
    ];

    // Prepare template context with workflow reminder
    const templateContext = `🚀 FAST WORKFLOW:
1. If backend needed: call create_supabase_project first
2. Call create_app_from_template (creates repo + ALL files in ONE call!)
3. Call create_vercel_project to deploy

Available Templates (use via create_app_from_template):
${templates.map(t => `- ${t.id}: ${t.description}`).join('\n')}

User Request: ${userMessage}

Use create_app_from_template to avoid rate limits and build 10x faster!`;

    // Start with conversation history if provided, otherwise fresh
    const messages: Anthropic.MessageParam[] = conversationHistory 
      ? [...conversationHistory, { role: 'user', content: userMessage }]
      : [{ role: 'user', content: templateContext }];

    let continueLoop = true;
    let finalResponse = '';
    let projectData: any = {};

    while (continueLoop) {
      // Check if user cancelled
      if (signal?.aborted) {
        throw new Error('Build cancelled by user');
      }

      let response;
      let retries = 0;
      const maxRetries = 3;

      // Retry loop for rate limiting
      while (retries < maxRetries) {
        try {
          response = await client.messages.create({
            model: model,
            max_tokens: 16000,
            system: SYSTEM_PROMPT,
            tools,
            messages,
          });
          break; // Success! Exit retry loop
        } catch (error: any) {
          if (error.status === 429 && retries < maxRetries - 1) {
            // Rate limited - wait and retry with longer backoff
            const waitTime = Math.pow(2, retries) * 8000; // Exponential backoff: 8s, 16s, 32s
            console.log(`⚠️ Rate limited. Waiting ${waitTime/1000}s before retry ${retries + 1}/${maxRetries}...`);
            console.log(`💡 TIP: This happens when agent makes too many separate API calls. Check if it's batching tools properly.`);
            onProgress('waiting', `Rate limited, retrying in ${waitTime/1000}s...`, 0);
            await sleep(waitTime);
            retries++;
          } else {
            throw error; // Other error or max retries reached
          }
        }
      }

      if (!response) {
        throw new Error('Failed after max retries');
      }

      // Add assistant response to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check if there are tool calls
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // No more tools to call, we're done
        continueLoop = false;
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === 'text'
        );
        finalResponse = textBlocks.map((block) => block.text).join('\n');
        break;
      }

      // Log batching info (helps debug rate limits)
      if (toolUseBlocks.length > 1) {
        console.log(`✅ BATCHING: Agent is calling ${toolUseBlocks.length} tools in one turn (good for rate limits!)`);
      }

      // Process tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolName = toolUse.name;
        const toolInput = toolUse.input as any;

        // Log tool call (concise - don't log full file content)
        const logInput = { ...toolInput };
        if (logInput.content && logInput.content.length > 100) {
          logInput.content = `[${logInput.content.length} chars]`;
        }
        console.log(`Calling tool: ${toolName}`, logInput);

        try {
          let result: any;

          switch (toolName) {
            case 'create_app_from_template':
              onProgress('creating_repo', `Creating app from template: ${toolInput.template_id}...`, 55);
              
              const template = templates.find(t => t.id === toolInput.template_id);
              if (!template) {
                result = { error: `Template ${toolInput.template_id} not found` };
                break;
              }

              console.log(`📦 Using template: ${template.name} with ${Object.keys(template.files).length} files`);

              // 🎬 Collect files for preview
              let previewFiles: Record<string, string> = { ...template.files };

              // If custom App.tsx provided, update preview files
              if (toolInput.customize_app) {
                previewFiles['src/App.tsx'] = toolInput.customize_app;
                console.log('🎨 Custom App.tsx detected, updating preview...');
              }

              // =============================================================
              // 🔍 COMPREHENSIVE PRE-DEPLOYMENT ERROR CHECKING
              // =============================================================
              
              // Parse package.json from template for validation
              let packageJson: PackageJson | undefined;
              try {
                if (previewFiles['package.json']) {
                  packageJson = JSON.parse(previewFiles['package.json']);
                }
              } catch {
                console.log('⚠️ Could not parse package.json');
              }
              
              // Run comprehensive checks with progress updates
              const checkResult = await runPreDeploymentChecks(previewFiles, packageJson, onProgress);
              
              // Check for blocking errors
              if (checkResult.hasBlockingErrors) {
                const criticalErrors = ERROR_CHECKER.getCriticalErrors(checkResult.errors);
                console.error('🛑 CRITICAL ERRORS - Cannot deploy:', criticalErrors);
                
                result = {
                  error: 'Deployment blocked due to critical errors',
                  critical_errors: criticalErrors.map(e => e.message),
                  stats: checkResult.stats,
                  recommendation: 'Please fix these security/critical issues before deploying',
                };
                break;
              }
              
              // Use fixed files (with auto-fixed issues)
              previewFiles = checkResult.fixedFiles;
              
              // Log any remaining warnings
              if (checkResult.stats.warning > 0 || checkResult.stats.error > 0) {
                console.log(`⚠️ Proceeding with ${checkResult.stats.error} errors and ${checkResult.stats.warning} warnings`);
              }
              
              // 🎬 Send (fixed) files to preview IMMEDIATELY (before GitHub)
              if (onFileUpdate) {
                onFileUpdate(previewFiles);
                console.log(`🎬 Sent ${Object.keys(previewFiles).length} files to preview (after error fixes)`);
              }

              onProgress('creating_repo', 'Creating GitHub repository...', 62);
              
              // Create the GitHub repo
              const repo = await createGithubRepo(
                {
                  name: toolInput.repo_name,
                  description: toolInput.repo_description,
                  private: false,
                },
                apiKeys.github
              );
              
              projectData.github = repo;
              console.log(`✅ Repo created: ${repo.name}`);

              // Create ALL template files (using potentially fixed files)
              const fileEntries = Object.entries(previewFiles);
              let filesCreated = 0;

              for (const [path, content] of fileEntries) {
                const fileProgress = 65 + ((filesCreated / fileEntries.length) * 12);
                onProgress('creating_repo', `Creating ${path}...`, Math.floor(fileProgress));

                await createGithubFile(
                  {
                    repo: repo.name,
                    path: path,
                    content: content,
                    message: `Add ${path}`,
                  },
                  apiKeys.github
                );
                
                filesCreated++;
              }

              console.log(`✅ All ${filesCreated} files created successfully!`);

              result = {
                success: true,
                repo_name: repo.name,
                repo_url: repo.html_url,
                files_created: filesCreated,
                template_used: template.name,
                error_check: {
                  issues_found: checkResult.stats.total,
                  auto_fixed: checkResult.stats.autoFixed,
                  warnings: checkResult.stats.warning,
                },
              };
              break;

            case 'create_supabase_project':
              onProgress('creating_supabase', `Creating Supabase project: ${toolInput.app_name}...`, 10);
              result = await createSupabaseProject(
                toolInput.app_name,
                apiKeys.supabase,
                (stage, msg, prog) => onProgress(stage, msg, prog)
              );
              projectData.supabase = result;
              break;

            case 'create_github_repo':
              onProgress('creating_repo', `Creating GitHub repository: ${toolInput.name}...`, 60);
              result = await createGithubRepo(toolInput, apiKeys.github);
              projectData.github = result;
              break;

            case 'read_github_file':
              onProgress('creating_repo', `Reading file: ${toolInput.path}...`, 62);
              result = await getGithubFile(toolInput, apiKeys.github);
              // Decode base64 content for the agent
              if (result.content) {
                result.decoded_content = atob(result.content);
                
                // 🎬 Send file to preview when reading
                if (onFileUpdate && result.decoded_content) {
                  const previewFiles: Record<string, string> = {};
                  previewFiles[toolInput.path] = result.decoded_content;
                  onFileUpdate(previewFiles);
                  console.log(`🎬 Sent ${toolInput.path} to preview (read)`);
                }
              }
              break;

            case 'create_github_file':
              const createFileProgress = 65 + (toolUseBlocks.indexOf(toolUse) * 2);
              onProgress('creating_repo', `Creating file: ${toolInput.path}...`, createFileProgress);
              
              // 🔍 Pre-check file for errors before creating
              if (toolInput.path.endsWith('.tsx') || toolInput.path.endsWith('.ts')) {
                const fileErrors = ERROR_CHECKER.preCheck(toolInput.content, toolInput.path);
                if (fileErrors.length > 0) {
                  console.log(`⚠️ Pre-check found ${fileErrors.length} issues in ${toolInput.path}`);
                  const { fixedCode, fixedCount } = ERROR_CHECKER.autoFix(toolInput.content, fileErrors);
                  if (fixedCount > 0) {
                    console.log(`✅ Auto-fixed ${fixedCount} issues in ${toolInput.path}`);
                    toolInput.content = fixedCode;
                  }
                }
              }
              
              result = await createGithubFile(toolInput, apiKeys.github);
              
              // 🎬 Send file to preview
              if (onFileUpdate && toolInput.content) {
                const createPreviewFiles: Record<string, string> = {};
                createPreviewFiles[toolInput.path] = toolInput.content;
                onFileUpdate(createPreviewFiles);
                console.log(`🎬 Sent ${toolInput.path} to preview (created)`);
              }
              break;

            case 'update_github_file':
              onProgress('creating_repo', `Updating file: ${toolInput.path}...`, 68);
              
              // 🔍 Pre-check updated file for errors
              if (toolInput.path.endsWith('.tsx') || toolInput.path.endsWith('.ts')) {
                const updateFileErrors = ERROR_CHECKER.preCheck(toolInput.content, toolInput.path);
                
                // Check for critical security issues
                const criticalSecurityErrors = updateFileErrors.filter(e => 
                  e.severity === 'critical' && e.action === 'BLOCK_DEPLOYMENT'
                );
                
                if (criticalSecurityErrors.length > 0) {
                  console.error('🛑 CRITICAL SECURITY ISSUES - Blocking update:', criticalSecurityErrors);
                  result = {
                    error: 'Update blocked due to security issues',
                    issues: criticalSecurityErrors.map(e => e.message),
                  };
                  break;
                }
                
                if (updateFileErrors.length > 0) {
                  console.log(`⚠️ Pre-check found ${updateFileErrors.length} issues in ${toolInput.path}`);
                  const { fixedCode, fixedCount } = ERROR_CHECKER.autoFix(toolInput.content, updateFileErrors);
                  if (fixedCount > 0) {
                    console.log(`✅ Auto-fixed ${fixedCount} issues in ${toolInput.path}`);
                    toolInput.content = fixedCode;
                  }
                }
              }
              
              result = await updateGithubFile(toolInput, apiKeys.github);
              
              // 🎬 Send updated file to preview immediately
              if (onFileUpdate && toolInput.content) {
                const updatePreviewFiles: Record<string, string> = {};
                updatePreviewFiles[toolInput.path] = toolInput.content;
                onFileUpdate(updatePreviewFiles);
                console.log(`🎬 Sent ${toolInput.path} to preview (updated)`);
              }
              break;

            case 'create_vercel_project':
              onProgress('deploying', `Deploying to Vercel: ${toolInput.name}...`, 80);
              result = await createVercelProject(toolInput, apiKeys.vercel);
              projectData.vercel = result;
              
              // Automatically add Supabase env vars if we have them
              if (projectData.supabase && result.id) {
                onProgress('deploying', 'Adding environment variables...', 85);
                
                // Add Supabase URL
                await addVercelEnvVar({
                  project_id: result.id,
                  key: 'VITE_SUPABASE_URL',
                  value: projectData.supabase.project_url,
                }, apiKeys.vercel);
                
                // Add Supabase Anon Key
                await addVercelEnvVar({
                  project_id: result.id,
                  key: 'VITE_SUPABASE_ANON_KEY',
                  value: projectData.supabase.anon_key,
                }, apiKeys.vercel);
                
                onProgress('deploying', 'Environment variables added!', 87);
              }
              break;

            case 'add_vercel_env_var':
              onProgress('deploying', `Adding environment variable: ${toolInput.key}...`, 85);
              result = await addVercelEnvVar(toolInput, apiKeys.vercel);
              break;

            case 'trigger_vercel_deployment':
              onProgress('deploying', 'Triggering new deployment...', 90);
              result = await triggerVercelDeployment(toolInput, apiKeys.vercel);
              if (result.url) {
                projectData.vercel = { ...projectData.vercel, url: result.url };
              }
              break;

            default:
              result = { error: `Unknown tool: ${toolName}` };
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          console.error(`Tool ${toolName} failed:`, error);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: error.message || 'Tool execution failed' }),
            is_error: true,
          });
        }
      }

      // Add tool results to messages
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    onProgress('complete', 'Build complete! 🎉', 100);

    // Build project context for follow-up edits
    const projectContext = projectData.github && projectData.vercel ? {
      name: projectData.github.name,
      githubRepo: `${apiKeys.github.owner}/${projectData.github.name}`,
      vercelProjectId: projectData.vercel.id,
      supabaseProjectRef: projectData.supabase?.project_ref || '',
    } : undefined;

    return {
      success: true,
      message: finalResponse,
      data: {
        githubUrl: projectData.github?.html_url,
        vercelUrl: projectData.vercel?.url ? `https://${projectData.vercel.url}` : undefined,
        supabaseUrl: projectData.supabase?.dashboard_url,
        supabaseCredentials: projectData.supabase,
        projectContext,
      },
    };
  } catch (error: any) {
    console.error('Agent error:', error);
    return {
      success: false,
      message: 'Failed to build application',
      error: error.message || 'Unknown error',
    };
  }
}

