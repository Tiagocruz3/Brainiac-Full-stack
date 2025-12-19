import React, { useState } from 'react';
import { X, Zap, Check } from 'lucide-react';
import { templates, Template } from '@/lib/templates';
import { Button } from './ui/Button';

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<Template['category'] | 'all'>('all');

  const categories: { id: Template['category'] | 'all'; name: string; emoji: string }[] = [
    { id: 'all', name: 'All Templates', emoji: '✨' },
    { id: 'productivity', name: 'Productivity', emoji: '✅' },
    { id: 'saas', name: 'SaaS', emoji: '💼' },
    { id: 'landing', name: 'Landing Pages', emoji: '🚀' },
    { id: 'blog', name: 'Blogs', emoji: '📝' },
    { id: 'ecommerce', name: 'E-commerce', emoji: '🛒' },
    { id: 'portfolio', name: 'Portfolio', emoji: '🎨' },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-purple-400" />
              Quick Start Templates
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Deploy production-ready apps in 30 seconds
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-zinc-800/50 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-zinc-800/50 border border-zinc-700 hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all group"
                onClick={() => onSelect(template)}
              >
                {/* Template Icon */}
                <div className="text-4xl mb-3">{template.thumbnail}</div>

                {/* Template Info */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
                  {template.name}
                </h3>
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                  {template.description}
                </p>

                {/* Features */}
                <div className="space-y-1.5 mb-4">
                  {template.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                      <Check className="h-3 w-3 text-purple-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full">
                    {template.hasSupabase ? '+ Supabase' : 'Static'}
                  </span>
                  <Zap className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>No templates in this category yet</p>
              <p className="text-sm mt-2">More coming soon!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50">
          <div className="flex items-center justify-between text-sm">
            <p className="text-zinc-500">
              <span className="text-purple-400 font-medium">{filteredTemplates.length}</span> templates available
            </p>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition"
            >
              or create from scratch →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
