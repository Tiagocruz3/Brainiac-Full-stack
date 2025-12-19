import Anthropic from '@anthropic-ai/sdk';
import { ApiKeys } from '@/types';
import { createSupabaseProject } from './tools/supabase-backend';
import { createGithubRepo, createGithubFile, getGithubFile, updateGithubFile } from './tools/github';
import { createVercelProject, addVercelEnvVar, triggerVercelDeployment } from './tools/vercel';
import { SYSTEM_PROMPT } from './prompts/system';
import { templates } from './templates';
import { sleep } from './utils';

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

    onProgress('creating_supabase', 'Planning your application...', 5);

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
              onProgress('creating_repo', `Creating app from template: ${toolInput.template_id}...`, 60);
              
              const template = templates.find(t => t.id === toolInput.template_id);
              if (!template) {
                result = { error: `Template ${toolInput.template_id} not found` };
                break;
              }

              console.log(`📦 Using template: ${template.name} with ${Object.keys(template.files).length} files`);

              // 🎬 Collect files for preview
              const previewFiles: Record<string, string> = { ...template.files };

              // If custom App.tsx provided, update preview files
              if (toolInput.customize_app) {
                previewFiles['src/App.tsx'] = toolInput.customize_app;
                console.log('🎨 Custom App.tsx detected, updating preview...');
              }

              // 🎬 Send files to preview IMMEDIATELY (before GitHub)
              if (onFileUpdate) {
                onFileUpdate(previewFiles);
                console.log(`🎬 Sent ${Object.keys(previewFiles).length} files to preview`);
              }

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

              // Create ALL template files
              const fileEntries = Object.entries(template.files);
              let filesCreated = 0;

              for (const [path, content] of fileEntries) {
                // Skip if this is the App.tsx and we have custom content
                if (path === 'src/App.tsx' && toolInput.customize_app) {
                  continue;
                }

                const fileProgress = 65 + ((filesCreated / fileEntries.length) * 10);
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

              // If custom App.tsx provided, create it
              if (toolInput.customize_app) {
                onProgress('creating_repo', 'Creating custom App.tsx...', 75);
                await createGithubFile(
                  {
                    repo: repo.name,
                    path: 'src/App.tsx',
                    content: toolInput.customize_app,
                    message: 'Add custom App.tsx',
                  },
                  apiKeys.github
                );
              }

              console.log(`✅ All ${filesCreated} files created successfully!`);

              result = {
                success: true,
                repo_name: repo.name,
                repo_url: repo.html_url,
                files_created: filesCreated,
                template_used: template.name,
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
              }
              break;

            case 'create_github_file':
              const fileProgress = 65 + (toolUseBlocks.indexOf(toolUse) * 2);
              onProgress('creating_repo', `Creating file: ${toolInput.path}...`, fileProgress);
              result = await createGithubFile(toolInput, apiKeys.github);
              break;

            case 'update_github_file':
              onProgress('creating_repo', `Updating file: ${toolInput.path}...`, 68);
              result = await updateGithubFile(toolInput, apiKeys.github);
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
