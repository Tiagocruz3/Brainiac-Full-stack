/**
 * Pre-deployment Error Checker
 * 
 * Detects common TypeScript/React errors BEFORE deployment
 * and provides auto-fixes where possible.
 */

export interface ErrorPattern {
  id: string;
  category: 'typescript' | 'react' | 'tailwind' | 'import' | 'jsx' | 'env' | 'package';
  pattern: RegExp | null; // null for file-level checks
  description: string;
  severity: 'error' | 'warning';
  examples: string[];
  autoFix: ((code: string, match?: RegExpMatchArray) => string) | null;
}

export interface PackageJsonError {
  id: string;
  category: 'package';
  pattern: RegExp | null;
  description: string;
  severity: 'error' | 'warning';
  examples: string[];
  autoFix: ((packageJson: PackageJson, extra?: string) => PackageJson) | null;
}

export interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface DetectedError {
  id: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  canAutoFix: boolean;
}

// =============================================================================
// CATEGORY 1: TYPESCRIPT COMPILATION ERRORS
// =============================================================================

const typescriptSyntaxErrors: ErrorPattern[] = [
  {
    id: 'jsx-unescaped-gt',
    category: 'jsx',
    pattern: /TS1382|Did you mean.*\{'>'\}.*&gt;/,
    description: 'Unescaped > character in JSX text',
    severity: 'error',
    examples: [
      '❌ <button>Next ></button>',
      '✅ <button>Next →</button>',
      '✅ <button>Next {\'>\'}></button>',
    ],
    autoFix: (code) => {
      // Replace > in JSX text with →
      return code
        .replace(/>\s*<\/button>/g, '→</button>')
        .replace(/>\s*<\/Button>/g, '→</Button>')
        .replace(/>(\s*)<\/span>/g, '→$1</span>');
    }
  },
  {
    id: 'jsx-unescaped-lt',
    category: 'jsx',
    pattern: /TS1003|Identifier expected/,
    description: 'Unescaped < character in JSX text',
    severity: 'error',
    examples: [
      '❌ <span>x < 5</span>',
      '✅ <span>x &lt; 5</span>',
    ],
    autoFix: (code) => {
      // This is complex - usually requires manual fix
      return code;
    }
  },
  {
    id: 'missing-semicolon',
    category: 'typescript',
    pattern: /TS1005.*';' expected/,
    description: 'Missing semicolon',
    severity: 'error',
    examples: [
      '❌ const x = 5',
      '✅ const x = 5;',
    ],
    autoFix: null // Too risky to auto-fix
  },
  {
    id: 'missing-bracket',
    category: 'typescript',
    pattern: /TS1109.*'\}' expected/,
    description: 'Missing closing bracket',
    severity: 'error',
    examples: [
      '❌ function test() { return true',
      '✅ function test() { return true }',
    ],
    autoFix: null
  },
  {
    id: 'unexpected-token',
    category: 'typescript',
    pattern: /TS1128.*Declaration or statement expected/,
    description: 'Unexpected token in code',
    severity: 'error',
    examples: ['❌ const x = ;'],
    autoFix: null
  },
  {
    id: 'template-literal-in-classname',
    category: 'typescript',
    pattern: /TS1005.*',' expected/,
    description: 'Template literal syntax error in className',
    severity: 'error',
    examples: [
      '❌ className={`text-white ${isActive ? "font-bold" : ""}`}',
      '✅ className={cn("text-white", isActive && "font-bold")}',
    ],
    autoFix: null // Complex - needs manual refactor
  },
];

const typescriptTypeErrors: ErrorPattern[] = [
  {
    id: 'type-mismatch',
    category: 'typescript',
    pattern: /TS2322.*Type '.*' is not assignable to type/,
    description: 'Type mismatch',
    severity: 'error',
    examples: [
      '❌ const name: string = 123;',
      '✅ const name: string = "123";',
    ],
    autoFix: null
  },
  {
    id: 'missing-type-annotation',
    category: 'typescript',
    pattern: /TS7006.*Parameter '.*' implicitly has an 'any' type/,
    description: 'Missing type annotation',
    severity: 'warning',
    examples: [
      '❌ function test(x) {}',
      '✅ function test(x: string) {}',
    ],
    autoFix: (code) => {
      // Add : any to untyped parameters
      return code.replace(
        /\(([a-zA-Z_][a-zA-Z0-9_]*)\)/g,
        '($1: any)'
      );
    }
  },
  {
    id: 'cannot-find-name',
    category: 'typescript',
    pattern: /TS2304.*Cannot find name '(.*)'/,
    description: 'Undefined variable or missing import',
    severity: 'error',
    examples: [
      '❌ const x = useState();  // useState not imported',
      '✅ import { useState } from "react";',
    ],
    autoFix: (code, match) => {
      if (!match) return code;
      const missingName = match[1];
      const importMap: Record<string, string> = {
        'useState': 'import { useState } from "react";',
        'useEffect': 'import { useEffect } from "react";',
        'useRef': 'import { useRef } from "react";',
        'useMemo': 'import { useMemo } from "react";',
        'useCallback': 'import { useCallback } from "react";',
        'cn': 'import { cn } from "@/lib/utils";',
        'Button': 'import { Button } from "@/components/ui/button";',
        'Input': 'import { Input } from "@/components/ui/input";',
        'Card': 'import { Card } from "@/components/ui/card";',
      };
      if (importMap[missingName]) {
        return importMap[missingName] + '\n' + code;
      }
      return code;
    }
  },
  {
    id: 'property-does-not-exist',
    category: 'typescript',
    pattern: /TS2339.*Property '(.*)' does not exist on type/,
    description: 'Accessing non-existent property',
    severity: 'error',
    examples: [
      '❌ user.naem  // Typo',
      '✅ user.name',
    ],
    autoFix: null
  },
];

const importExportErrors: ErrorPattern[] = [
  {
    id: 'unused-import',
    category: 'import',
    pattern: /TS6133.*'(.*)' is declared but (its value is )?never (used|read)/,
    description: 'Unused import causing build failure',
    severity: 'error',
    examples: [
      '❌ import { Star, Heart } from "lucide-react"  // Heart never used',
      '✅ import { Star } from "lucide-react"  // Only import what you use',
    ],
    autoFix: (code, match) => {
      if (!match) return code;
      const unusedName = match[1];
      // Remove the unused import from import statements
      // Handle: import { A, B, C } from "x" -> import { A, C } from "x"
      const importRegex = new RegExp(
        `(import\\s*\\{[^}]*),?\\s*${unusedName}\\s*,?([^}]*\\}\\s*from)`,
        'g'
      );
      return code.replace(importRegex, '$1$2');
    }
  },
  {
    id: 'missing-named-export',
    category: 'import',
    pattern: /TS2614.*Module '.*' has no exported member '(.*)'/,
    description: 'Importing non-existent export',
    severity: 'error',
    examples: [
      '❌ import { Button } from "./Button"  // Button is default export',
      '✅ import Button from "./Button"',
    ],
    autoFix: null
  },
  {
    id: 'module-not-found',
    category: 'import',
    pattern: /TS2307.*Cannot find module '(.*)'/,
    description: 'Missing module or incorrect path',
    severity: 'error',
    examples: [
      '❌ import x from "./missing"',
      '✅ import x from "./existing"',
    ],
    autoFix: null
  },
];

// =============================================================================
// CATEGORY 2: REACT-SPECIFIC ERRORS
// =============================================================================

const reactErrors: ErrorPattern[] = [
  {
    id: 'invalid-hook-call',
    category: 'react',
    pattern: /Invalid hook call|Hooks can only be called inside/,
    description: 'Hook called outside of component or in wrong order',
    severity: 'error',
    examples: [
      '❌ if (condition) { useState() }',
      '✅ const [state, setState] = useState();  // Always at top level',
    ],
    autoFix: null
  },
  {
    id: 'missing-key-prop',
    category: 'react',
    pattern: /Each child in a list should have a unique "key" prop/,
    description: 'Missing key prop in list rendering',
    severity: 'warning',
    examples: [
      '❌ items.map(item => <div>{item}</div>)',
      '✅ items.map((item, i) => <div key={i}>{item}</div>)',
    ],
    autoFix: null
  },
  {
    id: 'jsx-expression-required',
    category: 'react',
    pattern: /JSX expressions must have one parent element/,
    description: 'Multiple JSX elements without wrapper',
    severity: 'error',
    examples: [
      '❌ return <div>A</div><div>B</div>',
      '✅ return <><div>A</div><div>B</div></>',
    ],
    autoFix: (code) => {
      // Wrap multiple returns in fragment
      return code.replace(
        /return\s*(<[^>]+>[^<]*<\/[^>]+>)\s*(<[^>]+>)/g,
        'return <>$1$2'
      );
    }
  },
  {
    id: 'invalid-dom-property',
    category: 'react',
    pattern: /Invalid DOM property|class.*className|for.*htmlFor/i,
    description: 'Using HTML attributes instead of React attributes',
    severity: 'error',
    examples: [
      '❌ <div class="test">',
      '✅ <div className="test">',
    ],
    autoFix: (code) => {
      return code
        .replace(/\bclass=/g, 'className=')
        .replace(/\bfor=/g, 'htmlFor=')
        .replace(/\bstroke-width=/g, 'strokeWidth=')
        .replace(/\bfill-opacity=/g, 'fillOpacity=');
    }
  },
];

// =============================================================================
// CATEGORY 3: TAILWIND CSS ERRORS
// =============================================================================

const tailwindErrors: ErrorPattern[] = [
  {
    id: 'unknown-tailwind-class',
    category: 'tailwind',
    pattern: /The `(.*)` class does not exist/,
    description: 'Using non-existent Tailwind class',
    severity: 'warning',
    examples: [
      '❌ className="text-primary-500"  // If not defined',
      '✅ className="text-purple-500"',
    ],
    autoFix: null
  },
  {
    id: 'border-border-undefined',
    category: 'tailwind',
    pattern: /The `border-border` class does not exist/,
    description: 'border-border class used without CSS variable',
    severity: 'error',
    examples: [
      '❌ @apply border-border;  // Without --border defined',
      '✅ Define --border in :root CSS variables',
    ],
    autoFix: null
  },
];

// =============================================================================
// CATEGORY 4: ENVIRONMENT VARIABLE ERRORS
// =============================================================================

const envErrors: ErrorPattern[] = [
  {
    id: 'missing-vite-prefix',
    category: 'env',
    pattern: /process\.env\.(?!VITE_)/,
    description: 'Environment variable missing VITE_ prefix (Vite requirement)',
    severity: 'error',
    examples: [
      '❌ process.env.SUPABASE_URL',
      '✅ import.meta.env.VITE_SUPABASE_URL',
    ],
    autoFix: (code) => {
      return code
        .replace(/process\.env\.([A-Z_]+)/g, 'import.meta.env.VITE_$1')
        .replace(/import\.meta\.env\.VITE_VITE_/g, 'import.meta.env.VITE_');
    }
  },
  {
    id: 'wrong-env-access',
    category: 'env',
    pattern: /process\.env\./,
    description: 'Using process.env instead of import.meta.env in Vite',
    severity: 'error',
    examples: [
      '❌ process.env.VITE_API_KEY',
      '✅ import.meta.env.VITE_API_KEY',
    ],
    autoFix: (code) => {
      return code.replace(/process\.env\./g, 'import.meta.env.');
    }
  },
  {
    id: 'hardcoded-supabase-url',
    category: 'env',
    pattern: /["'](https:\/\/[a-z0-9]+\.supabase\.co)["']/i,
    description: 'Hardcoded Supabase URL - should use env var',
    severity: 'error',
    examples: [
      '❌ const url = "https://abc123.supabase.co"',
      '✅ const url = import.meta.env.VITE_SUPABASE_URL',
    ],
    autoFix: (code) => {
      return code.replace(
        /["'](https:\/\/[a-z0-9]+\.supabase\.co)["']/gi,
        'import.meta.env.VITE_SUPABASE_URL'
      );
    }
  },
  {
    id: 'hardcoded-api-key',
    category: 'env',
    pattern: /["'](sk_live_[a-zA-Z0-9]+|pk_live_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)["']/,
    description: 'Hardcoded API key or secret detected',
    severity: 'error',
    examples: [
      '❌ const key = "sk_live_abc123..."',
      '✅ const key = import.meta.env.VITE_SECRET_KEY',
    ],
    autoFix: (code, match) => {
      if (!match) return code;
      const secret = match[1];
      
      // Detect type of secret and suggest appropriate env var
      if (secret.startsWith('sk_live_') || secret.startsWith('pk_live_')) {
        return code.replace(
          new RegExp(`["']${secret}["']`, 'g'),
          'import.meta.env.VITE_STRIPE_KEY'
        );
      }
      if (secret.startsWith('ghp_')) {
        return code.replace(
          new RegExp(`["']${secret}["']`, 'g'),
          'import.meta.env.VITE_GITHUB_TOKEN'
        );
      }
      if (secret.startsWith('eyJ')) {
        // JWT token - likely Supabase anon key
        return code.replace(
          new RegExp(`["']${secret.substring(0, 20)}[^"']*["']`, 'g'),
          'import.meta.env.VITE_SUPABASE_ANON_KEY'
        );
      }
      return code;
    }
  },
  {
    id: 'next-public-prefix',
    category: 'env',
    pattern: /NEXT_PUBLIC_/,
    description: 'Using Next.js env prefix in Vite project',
    severity: 'error',
    examples: [
      '❌ import.meta.env.NEXT_PUBLIC_API_URL',
      '✅ import.meta.env.VITE_API_URL',
    ],
    autoFix: (code) => {
      return code.replace(/NEXT_PUBLIC_/g, 'VITE_');
    }
  },
  {
    id: 'env-undefined-check',
    category: 'env',
    pattern: /import\.meta\.env\.\w+\s*[!=]==?\s*(undefined|null)/,
    description: 'Env var might be empty string, not undefined',
    severity: 'warning',
    examples: [
      '❌ if (import.meta.env.VITE_KEY === undefined)',
      '✅ if (!import.meta.env.VITE_KEY)',
    ],
    autoFix: null // Logic change needed
  },
];

// =============================================================================
// CATEGORY 5: PACKAGE.JSON ERRORS
// =============================================================================

const packageJsonErrors: PackageJsonError[] = [
  {
    id: 'missing-dependency',
    category: 'package',
    pattern: /Cannot find package '([^']+)'/,
    description: 'Package used but not in dependencies',
    severity: 'error',
    examples: [
      '❌ import x from "lodash"  // Not in package.json',
      '✅ Add to package.json dependencies',
    ],
    autoFix: (packageJson, missingPkg) => {
      if (!missingPkg) return packageJson;
      packageJson.dependencies = packageJson.dependencies || {};
      // Use known stable versions for common packages
      const knownVersions: Record<string, string> = {
        'lodash': '^4.17.21',
        'axios': '^1.6.0',
        'date-fns': '^3.0.0',
        'uuid': '^9.0.0',
        'clsx': '^2.1.0',
        'tailwind-merge': '^2.2.0',
        'class-variance-authority': '^0.7.0',
        '@tanstack/react-query': '^5.0.0',
        'zustand': '^4.5.0',
        'react-router-dom': '^6.22.0',
        'framer-motion': '^11.0.0',
      };
      packageJson.dependencies[missingPkg] = knownVersions[missingPkg] || 'latest';
      return packageJson;
    }
  },
  {
    id: 'version-conflict-react',
    category: 'package',
    pattern: /Conflicting peer dependency|react-dom.*requires.*react@/i,
    description: 'React/React-DOM version mismatch',
    severity: 'error',
    examples: [
      '❌ react: 18.0.0, react-dom: 17.0.0',
      '✅ react: 18.0.0, react-dom: 18.0.0',
    ],
    autoFix: (packageJson) => {
      const reactVersion = packageJson.dependencies?.react;
      if (reactVersion && packageJson.dependencies) {
        packageJson.dependencies['react-dom'] = reactVersion;
      }
      return packageJson;
    }
  },
  {
    id: 'wrong-build-command',
    category: 'package',
    pattern: /react-scripts.*not found|craco.*not found/i,
    description: 'Build command incorrect for Vite framework',
    severity: 'error',
    examples: [
      '❌ build: "react-scripts build"  // Using Vite',
      '✅ build: "vite build"',
    ],
    autoFix: (packageJson) => {
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.build = 'tsc && vite build';
      packageJson.scripts.dev = 'vite';
      packageJson.scripts.preview = 'vite preview';
      return packageJson;
    }
  },
  {
    id: 'missing-type-module',
    category: 'package',
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    description: 'Missing "type": "module" in package.json',
    severity: 'error',
    examples: [
      '❌ No "type" field in package.json',
      '✅ "type": "module"',
    ],
    autoFix: (packageJson) => {
      packageJson.type = 'module';
      return packageJson;
    }
  },
  {
    id: 'missing-vite-dep',
    category: 'package',
    pattern: /vite.*not found|Cannot find module 'vite'/i,
    description: 'Vite not in devDependencies',
    severity: 'error',
    examples: [
      '❌ devDependencies without vite',
      '✅ devDependencies: { "vite": "^5.0.0" }',
    ],
    autoFix: (packageJson) => {
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies.vite = '^5.0.0';
      packageJson.devDependencies['@vitejs/plugin-react'] = '^4.2.0';
      return packageJson;
    }
  },
  {
    id: 'missing-typescript-dep',
    category: 'package',
    pattern: /tsc.*not found|Cannot find module 'typescript'/i,
    description: 'TypeScript not in devDependencies',
    severity: 'error',
    examples: [
      '❌ devDependencies without typescript',
      '✅ devDependencies: { "typescript": "^5.0.0" }',
    ],
    autoFix: (packageJson) => {
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies.typescript = '^5.3.0';
      packageJson.devDependencies['@types/react'] = '^18.2.0';
      packageJson.devDependencies['@types/react-dom'] = '^18.2.0';
      return packageJson;
    }
  },
  {
    id: 'duplicate-dependency',
    category: 'package',
    pattern: null, // File check
    description: 'Same package in dependencies and devDependencies',
    severity: 'warning',
    examples: [
      '❌ dependencies: { react: "18" }, devDependencies: { react: "17" }',
      '✅ Only in dependencies OR devDependencies',
    ],
    autoFix: (packageJson) => {
      // Remove duplicates from devDependencies, keep in dependencies
      if (packageJson.dependencies && packageJson.devDependencies) {
        for (const dep of Object.keys(packageJson.dependencies)) {
          if (dep in packageJson.devDependencies) {
            delete packageJson.devDependencies[dep];
          }
        }
      }
      return packageJson;
    }
  },
  {
    id: 'invalid-package-name',
    category: 'package',
    pattern: null, // File check
    description: 'Package name contains invalid characters',
    severity: 'error',
    examples: [
      '❌ name: "My App!"',
      '✅ name: "my-app"',
    ],
    autoFix: (packageJson) => {
      if (packageJson.name) {
        packageJson.name = packageJson.name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/--+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return packageJson;
    }
  },
];

// =============================================================================
// ALL ERROR PATTERNS
// =============================================================================

export const ALL_ERROR_PATTERNS: ErrorPattern[] = [
  ...typescriptSyntaxErrors,
  ...typescriptTypeErrors,
  ...importExportErrors,
  ...reactErrors,
  ...tailwindErrors,
  ...envErrors,
];

// =============================================================================
// ERROR DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect errors in code based on build output
 */
export function detectErrorsFromBuildOutput(buildOutput: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  for (const pattern of ALL_ERROR_PATTERNS) {
    // Skip patterns without regex (file-level checks)
    if (!pattern.pattern) continue;
    
    const match = buildOutput.match(pattern.pattern);
    if (match) {
      // Try to extract line number
      const lineMatch = buildOutput.match(/\((\d+),(\d+)\)/);
      
      errors.push({
        id: pattern.id,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        column: lineMatch ? parseInt(lineMatch[2]) : undefined,
        message: pattern.description,
        severity: pattern.severity,
        canAutoFix: pattern.autoFix !== null,
      });
    }
  }
  
  return errors;
}

/**
 * Pre-check code for common errors BEFORE attempting build
 */
export function preCheckCode(code: string, fileName: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // Check for unescaped > in JSX
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
    // Look for patterns like >< or >\n that aren't closing tags
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      // Check for > in text content (not in tags)
      if (/>(?![<\s/])[^<]*<\//.test(line) && !line.includes('{\'>\'}') && !line.includes('→')) {
        errors.push({
          id: 'jsx-unescaped-gt',
          line: index + 1,
          message: 'Possible unescaped > in JSX text',
          severity: 'warning',
          canAutoFix: true,
        });
      }
    });
    
    // Check for unused imports (basic check)
    const importMatch = code.match(/import\s*\{([^}]+)\}\s*from/g);
    if (importMatch) {
      importMatch.forEach(imp => {
        const names = imp.match(/\{([^}]+)\}/)?.[1].split(',').map(n => n.trim());
        names?.forEach(name => {
          // Remove 'as X' aliases
          const actualName = name.split(' as ')[0].trim();
          // Check if used in code (basic check)
          const usageRegex = new RegExp(`[^a-zA-Z]${actualName}[^a-zA-Z]`, 'g');
          const matches = code.match(usageRegex) || [];
          if (matches.length <= 1) { // Only the import itself
            errors.push({
              id: 'unused-import',
              message: `'${actualName}' is imported but may not be used`,
              severity: 'warning',
              canAutoFix: true,
            });
          }
        });
      });
    }
  }
  
  // Check for environment variable issues (all files)
  // Check for process.env usage (should be import.meta.env in Vite)
  if (code.includes('process.env.')) {
    errors.push({
      id: 'wrong-env-access',
      message: 'Using process.env instead of import.meta.env (Vite uses import.meta.env)',
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  // Check for NEXT_PUBLIC_ prefix (wrong framework)
  if (code.includes('NEXT_PUBLIC_')) {
    errors.push({
      id: 'next-public-prefix',
      message: 'Using NEXT_PUBLIC_ prefix - should be VITE_ for Vite projects',
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  // Check for hardcoded Supabase URLs
  if (/["'](https:\/\/[a-z0-9]+\.supabase\.co)["']/i.test(code)) {
    errors.push({
      id: 'hardcoded-supabase-url',
      message: 'Hardcoded Supabase URL detected - use import.meta.env.VITE_SUPABASE_URL',
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  // Check for hardcoded API keys
  if (/["'](sk_live_|pk_live_|ghp_|eyJhbGciOi)/.test(code)) {
    errors.push({
      id: 'hardcoded-api-key',
      message: 'Hardcoded API key or secret detected - use environment variables',
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  return errors;
}

/**
 * Attempt to auto-fix detected errors
 */
export function autoFixErrors(code: string, errors: DetectedError[]): { 
  fixedCode: string; 
  fixedCount: number;
  remainingErrors: DetectedError[];
} {
  let fixedCode = code;
  let fixedCount = 0;
  const remainingErrors: DetectedError[] = [];
  
  for (const error of errors) {
    const pattern = ALL_ERROR_PATTERNS.find(p => p.id === error.id);
    if (pattern?.autoFix) {
      const beforeFix = fixedCode;
      fixedCode = pattern.autoFix(fixedCode);
      if (fixedCode !== beforeFix) {
        fixedCount++;
      } else {
        remainingErrors.push(error);
      }
    } else {
      remainingErrors.push(error);
    }
  }
  
  return { fixedCode, fixedCount, remainingErrors };
}

// =============================================================================
// PACKAGE.JSON CHECKING AND FIXING
// =============================================================================

/**
 * Pre-check package.json for common issues
 */
export function preCheckPackageJson(packageJson: PackageJson): DetectedError[] {
  const errors: DetectedError[] = [];
  
  // Check for invalid package name
  if (packageJson.name && /[A-Z!@#$%^&*()+=\[\]{}|\\:;"'<>,?\/]/.test(packageJson.name)) {
    errors.push({
      id: 'invalid-package-name',
      message: `Package name "${packageJson.name}" contains invalid characters`,
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  // Check for duplicate dependencies
  if (packageJson.dependencies && packageJson.devDependencies) {
    const duplicates = Object.keys(packageJson.dependencies).filter(
      dep => dep in (packageJson.devDependencies || {})
    );
    if (duplicates.length > 0) {
      errors.push({
        id: 'duplicate-dependency',
        message: `Packages in both dependencies and devDependencies: ${duplicates.join(', ')}`,
        severity: 'warning',
        canAutoFix: true,
      });
    }
  }
  
  // Check for React/React-DOM version mismatch
  if (packageJson.dependencies?.react && packageJson.dependencies?.['react-dom']) {
    const reactVersion = packageJson.dependencies.react.replace(/[^0-9.]/g, '');
    const reactDomVersion = packageJson.dependencies['react-dom'].replace(/[^0-9.]/g, '');
    if (reactVersion.split('.')[0] !== reactDomVersion.split('.')[0]) {
      errors.push({
        id: 'version-conflict-react',
        message: `React (${reactVersion}) and React-DOM (${reactDomVersion}) major versions don't match`,
        severity: 'error',
        canAutoFix: true,
      });
    }
  }
  
  // Check for wrong build commands (using CRA commands in Vite project)
  if (packageJson.scripts?.build?.includes('react-scripts')) {
    errors.push({
      id: 'wrong-build-command',
      message: 'Build command uses react-scripts but this is a Vite project',
      severity: 'error',
      canAutoFix: true,
    });
  }
  
  // Check for missing Vite in devDependencies when scripts use vite
  if (packageJson.scripts?.dev?.includes('vite') || packageJson.scripts?.build?.includes('vite')) {
    if (!packageJson.devDependencies?.vite && !packageJson.dependencies?.vite) {
      errors.push({
        id: 'missing-vite-dep',
        message: 'Scripts use vite but vite is not in dependencies',
        severity: 'error',
        canAutoFix: true,
      });
    }
  }
  
  // Check for missing TypeScript when tsconfig exists or tsc is used
  if (packageJson.scripts?.build?.includes('tsc')) {
    if (!packageJson.devDependencies?.typescript && !packageJson.dependencies?.typescript) {
      errors.push({
        id: 'missing-typescript-dep',
        message: 'Build uses tsc but typescript is not in devDependencies',
        severity: 'error',
        canAutoFix: true,
      });
    }
  }
  
  return errors;
}

/**
 * Detect package.json errors from build output
 */
export function detectPackageErrorsFromBuildOutput(buildOutput: string): DetectedError[] {
  const errors: DetectedError[] = [];
  
  for (const pattern of packageJsonErrors) {
    if (!pattern.pattern) continue;
    
    const match = buildOutput.match(pattern.pattern);
    if (match) {
      errors.push({
        id: pattern.id,
        message: pattern.description + (match[1] ? `: ${match[1]}` : ''),
        severity: pattern.severity,
        canAutoFix: pattern.autoFix !== null,
      });
    }
  }
  
  return errors;
}

/**
 * Auto-fix package.json errors
 */
export function autoFixPackageJson(
  packageJson: PackageJson, 
  errors: DetectedError[],
  buildOutput?: string
): {
  fixedPackageJson: PackageJson;
  fixedCount: number;
  remainingErrors: DetectedError[];
} {
  let fixedPackageJson = { ...packageJson };
  let fixedCount = 0;
  const remainingErrors: DetectedError[] = [];
  
  for (const error of errors) {
    const pattern = packageJsonErrors.find(p => p.id === error.id);
    if (pattern?.autoFix) {
      const beforeFix = JSON.stringify(fixedPackageJson);
      
      // Extract extra info from build output if needed
      let extra: string | undefined;
      if (pattern.pattern && buildOutput) {
        const match = buildOutput.match(pattern.pattern);
        extra = match?.[1];
      }
      
      fixedPackageJson = pattern.autoFix(fixedPackageJson, extra);
      
      if (JSON.stringify(fixedPackageJson) !== beforeFix) {
        fixedCount++;
      } else {
        remainingErrors.push(error);
      }
    } else {
      remainingErrors.push(error);
    }
  }
  
  return { fixedPackageJson, fixedCount, remainingErrors };
}

/**
 * Get all package.json error patterns (for export)
 */
export const PACKAGE_JSON_ERROR_PATTERNS = packageJsonErrors;

/**
 * Generate error summary for system prompt
 */
export function generateErrorKnowledgeBase(): string {
  const codeCategories: Record<string, ErrorPattern[]> = {
    'TypeScript Syntax': typescriptSyntaxErrors,
    'TypeScript Types': typescriptTypeErrors,
    'Imports/Exports': importExportErrors,
    'React': reactErrors,
    'Tailwind': tailwindErrors,
    'Environment Variables': envErrors,
  };
  
  let summary = '# PRE-DEPLOYMENT ERROR CHECKLIST\n\n';
  
  // Code errors
  for (const [category, patterns] of Object.entries(codeCategories)) {
    summary += `## ${category} Errors\n\n`;
    for (const pattern of patterns) {
      summary += `### ${pattern.id} (${pattern.severity})\n`;
      summary += `${pattern.description}\n`;
      summary += `Examples:\n`;
      pattern.examples.forEach(ex => {
        summary += `- ${ex}\n`;
      });
      summary += '\n';
    }
  }
  
  // Package.json errors
  summary += `## Package.json Errors\n\n`;
  for (const pattern of packageJsonErrors) {
    summary += `### ${pattern.id} (${pattern.severity})\n`;
    summary += `${pattern.description}\n`;
    summary += `Examples:\n`;
    pattern.examples.forEach(ex => {
      summary += `- ${ex}\n`;
    });
    summary += '\n';
  }
  
  return summary;
}

// Export for use in agent
export const ERROR_CHECKER = {
  patterns: ALL_ERROR_PATTERNS,
  packagePatterns: packageJsonErrors,
  detectFromBuildOutput: detectErrorsFromBuildOutput,
  detectPackageErrors: detectPackageErrorsFromBuildOutput,
  preCheck: preCheckCode,
  preCheckPackage: preCheckPackageJson,
  autoFix: autoFixErrors,
  autoFixPackage: autoFixPackageJson,
  generateKnowledgeBase: generateErrorKnowledgeBase,
};

