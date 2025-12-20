/**
 * Pre-deployment Error Checker
 * 
 * Detects common TypeScript/React errors BEFORE deployment
 * and provides auto-fixes where possible.
 */

export interface ErrorPattern {
  id: string;
  category: 'typescript' | 'react' | 'tailwind' | 'import' | 'jsx';
  pattern: RegExp;
  description: string;
  severity: 'error' | 'warning';
  examples: string[];
  autoFix: ((code: string, match?: RegExpMatchArray) => string) | null;
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
// ALL ERROR PATTERNS
// =============================================================================

export const ALL_ERROR_PATTERNS: ErrorPattern[] = [
  ...typescriptSyntaxErrors,
  ...typescriptTypeErrors,
  ...importExportErrors,
  ...reactErrors,
  ...tailwindErrors,
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

/**
 * Generate error summary for system prompt
 */
export function generateErrorKnowledgeBase(): string {
  const categories = {
    'TypeScript Syntax': typescriptSyntaxErrors,
    'TypeScript Types': typescriptTypeErrors,
    'Imports/Exports': importExportErrors,
    'React': reactErrors,
    'Tailwind': tailwindErrors,
  };
  
  let summary = '# PRE-DEPLOYMENT ERROR CHECKLIST\n\n';
  
  for (const [category, patterns] of Object.entries(categories)) {
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
  
  return summary;
}

// Export for use in agent
export const ERROR_CHECKER = {
  patterns: ALL_ERROR_PATTERNS,
  detectFromBuildOutput: detectErrorsFromBuildOutput,
  preCheck: preCheckCode,
  autoFix: autoFixErrors,
  generateKnowledgeBase: generateErrorKnowledgeBase,
};

