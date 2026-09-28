import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Block {
  id?: string;
  type: string;
  content: string;
  order: number;
  metadata?: any;
  provenance?: any;
}

interface Section {
  id?: string;
  title: string;
  headingLevel: number;
  order: number;
  content?: string;
  parentId?: string | null;
}

interface DocumentData {
  id: string;
  projectId: string;
  title: string;
  type: string;
  status: string;
  version: number;
  wordCount: number;
  sections: Section[];
  blocks: Block[];
  formattingProfile?: any;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  structure: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function DocumentStudio() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'error'>('saved');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch document
  useEffect(() => {
    if (!documentId) return;
    
    fetch(`${API_BASE}/api/v1/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const doc = data.data;
          setDocument(doc);
          setSections(doc.sections || []);
          setBlocks(doc.blocks || []);
        }
      })
      .catch(err => console.error('Failed to load document:', err));
  }, [documentId]);

  // Fetch templates
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/templates`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTemplates(data.data);
        }
      })
      .catch(console.error);
  }, []);

  // Autosave
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveStatus('unsaved');
    autosaveTimer.current = setTimeout(() => {
      handleSave();
    }, 2000);
  }, [documentId, blocks, sections]);

  const handleSave = async () => {
    if (!documentId || saveStatus === 'saved') return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, blocks }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSaveStatus('saved');
        setDocument(prev => prev ? { ...prev, blocks, sections, updatedAt: new Date().toISOString() } : null);
      } else {
        setSaveStatus('error');
        console.error('Save failed:', data.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      title: 'New Section',
      headingLevel: 1,
      order: sections.length,
    };
    setSections([...sections, newSection]);
    scheduleAutosave();
  };

  const addBlock = (sectionId?: string) => {
    const newBlock: Block = {
      type: 'PARAGRAPH',
      content: '',
      order: blocks.length,
      ...(sectionId ? { sectionId } : {}),
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id || `temp-${Date.now()}`);
    scheduleAutosave();
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
    scheduleAutosave();
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    scheduleAutosave();
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index < 0) return;
    
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (swapIndex >= 0 && swapIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
      setBlocks(newBlocks);
      scheduleAutosave();
    }
  };

  const createDocument = async (templateId?: string) => {
    if (!projectId) return;
    
    const body: any = {
      projectId,
      title: 'Untitled Document',
      type: 'GENERAL',
    };
    
    if (templateId) {
      body.templateId = templateId;
    }

    const response = await fetch(`${API_BASE}/api/v1/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (data.success) {
      navigate(`/projects/${projectId}/documents/${data.data.id}`);
    }
  };

  const exportDocument = async (format: string) => {
    if (!documentId) return;
    window.open(`${API_BASE}/api/v1/documents/${documentId}/export/${format}`, '_blank');
  };

  const createVersion = async () => {
    if (!documentId) return;
    
    const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Manual save' }),
    });
    
    const data = await response.json();
    if (data.success) {
      setDocument(prev => prev ? { ...prev, version: data.data.versionNumber } : null);
    }
  };

  const calculateWordCount = (blocks: Block[]): number => {
    return blocks.reduce((count, block) => {
      const words = block.content?.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
      return count + words;
    }, 0);
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1E1E2E]">
        <div className="text-gray-400">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#1A2744] border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold">{document.title}</h1>
          <span className={`px-2 py-1 rounded text-xs ${
            document.status === 'DRAFT' ? 'bg-yellow-500/20 text-yellow-400' :
            document.status === 'FINAL' ? 'bg-green-500/20 text-green-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {document.status}
          </span>
          <span className="text-gray-500 text-sm">v{document.version}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {saveStatus === 'unsaved' && (
            <span className="text-yellow-400 text-sm">Unsaved changes</span>
          )}
          {isSaving && (
            <span className="text-blue-400 text-sm">Saving...</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || saveStatus === 'saved'}
            className="px-4 py-2 bg-[#6B21A8] hover:bg-[#7C3AED] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={createVersion}
            className="px-4 py-2 bg-[#1A2744] border border-gray-600 hover:border-[#F5C518] rounded-lg text-sm transition-colors"
          >
            Version
          </button>
          <div className="relative group">
            <button className="px-4 py-2 bg-[#1A2744] border border-gray-600 hover:border-[#F5C518] rounded-lg text-sm transition-colors">
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 bg-[#1A2744] border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[150px]">
              <button onClick={() => exportDocument('docx')} className="block w-full text-left px-4 py-2 hover:bg-[#6B21A8]/20 rounded-t-lg text-sm">DOCX</button>
              <button onClick={() => exportDocument('markdown')} className="block w-full text-left px-4 py-2 hover:bg-[#6B21A8]/20 text-sm">Markdown</button>
              <button onClick={() => exportDocument('html')} className="block w-full text-left px-4 py-2 hover:bg-[#6B21A8]/20 text-sm">HTML</button>
              <button onClick={() => exportDocument('txt')} className="block w-full text-left px-4 py-2 hover:bg-[#6B21A8]/20 rounded-b-lg text-sm">TXT</button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Outline */}
        <aside className="w-64 bg-[#1A2744] border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Outline</h2>
            <nav className="space-y-1">
              {sections.map((section, idx) => (
                <button
                  key={section.id || idx}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#6B21A8]/20 transition-colors truncate"
                  style={{ marginLeft: `${(section.headingLevel - 1) * 12}px` }}
                >
                  {section.title || `Section ${idx + 1}`}
                </button>
              ))}
              <button
                onClick={addSection}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-[#6B21A8]/20 transition-colors"
              >
                + Add Section
              </button>
            </nav>
          </div>

          <div className="p-4 border-t border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Stats</h2>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Words</span>
                <span className="text-white">{calculateWordCount(blocks)}</span>
              </div>
              <div className="flex justify-between">
                <span>Characters</span>
                <span className="text-white">{blocks.reduce((sum, b) => sum + (b.content?.length || 0), 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sections</span>
                <span className="text-white">{sections.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Blocks</span>
                <span className="text-white">{blocks.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Document Title */}
            <input
              type="text"
              value={document.title}
              onChange={(e) => {
                setDocument({ ...document, title: e.target.value });
                scheduleAutosave();
              }}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-white mb-6 placeholder-gray-600"
              placeholder="Document Title"
            />

            {/* Sections and Blocks */}
            {sections.map((section, sectionIdx) => (
              <div key={section.id || `section-${sectionIdx}`} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={section.headingLevel}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[sectionIdx] = { ...section, headingLevel: parseInt(e.target.value) };
                      setSections(newSections);
                      scheduleAutosave();
                    }}
                    className="bg-[#1A2744] border border-gray-600 rounded px-2 py-1 text-sm text-gray-300"
                  >
                    <option value={1}>Heading 1</option>
                    <option value={2}>Heading 2</option>
                    <option value={3}>Heading 3</option>
                    <option value={4}>Heading 4</option>
                  </select>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[sectionIdx] = { ...section, title: e.target.value };
                      setSections(newSections);
                      scheduleAutosave();
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-xl font-semibold text-white placeholder-gray-600"
                    placeholder="Section Title"
                  />
                </div>
                
                {/* Section Blocks */}
                {blocks.filter(b => b.sectionId === section.id).map((block, blockIdx) => (
                  <BlockEditor
                    key={block.id || `block-${blockIdx}`}
                    block={block}
                    onUpdate={(updates) => updateBlock(block.id!, updates)}
                    onDelete={() => deleteBlock(block.id!)}
                    onMoveUp={() => moveBlock(block.id!, 'up')}
                    onMoveDown={() => moveBlock(block.id!, 'down')}
                    isActive={activeBlockId === block.id}
                    onFocus={() => setActiveBlockId(block.id!)}
                  />
                ))}
                
                <button
                  onClick={() => addBlock(section.id)}
                  className="mt-2 px-3 py-1 text-sm text-gray-500 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded transition-colors"
                >
                  + Add Block
                </button>
              </div>
            ))}

            {/* Root Blocks (not in sections) */}
            {blocks.filter(b => !b.sectionId).map((block, idx) => (
              <BlockEditor
                key={block.id || `root-block-${idx}`}
                block={block}
                onUpdate={(updates) => updateBlock(block.id!, updates)}
                onDelete={() => deleteBlock(block.id!)}
                onMoveUp={() => moveBlock(block.id!, 'up')}
                onMoveDown={() => moveBlock(block.id!, 'down')}
                isActive={activeBlockId === block.id}
                onFocus={() => setActiveBlockId(block.id!)}
              />
            ))}

            <button
              onClick={addBlock}
              className="mt-4 w-full py-3 text-gray-500 hover:text-white border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
            >
              + Add Block
            </button>
          </div>
        </main>

        {/* Right Panel - Research */}
        <aside className="w-72 bg-[#1A2744] border-l border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Research Sources</h2>
            <div className="text-sm text-gray-500">
              Connect to Research Workspace to insert evidence and citations.
            </div>
          </div>
        </aside>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A2744] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Choose Template</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    createDocument(template.id);
                    setShowTemplateModal(false);
                  }}
                  className="w-full text-left px-4 py-3 bg-[#1E1E2E] hover:bg-[#6B21A8]/20 rounded-lg transition-colors"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.type}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="mt-4 w-full py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockEditor({ 
  block, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  isActive,
  onFocus
}: { 
  block: Block; 
  onUpdate: (updates: Partial<Block>) => void; 
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isActive: boolean;
  onFocus: () => void;
}) {
  const renderBlockContent = () => {
    switch (block.type) {
      case 'HEADING':
        return (
          <textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onFocus={onFocus}
            rows={2}
            className="w-full bg-transparent border-none outline-none text-xl font-bold text-white resize-none"
            placeholder="Heading..."
          />
        );
      case 'QUOTE':
        return (
          <div className="border-l-4 border-[#6B21A8] pl-4">
            <textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onFocus={onFocus}
              className="w-full bg-transparent border-none outline-none text-gray-300 italic resize-none"
              placeholder="Quote..."
              rows={3}
            />
          </div>
        );
      case 'CALLOUT':
        return (
          <div className="bg-[#6B21A8]/10 border border-[#6B21A8]/30 rounded-lg p-4">
            <textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onFocus={onFocus}
              className="w-full bg-transparent border-none outline-none text-gray-300 resize-none"
              placeholder="Callout text..."
              rows={3}
            />
          </div>
        );
      default:
        return (
          <textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onFocus={onFocus}
            className="w-full bg-transparent border-none outline-none text-gray-200 resize-none"
            placeholder={block.type === 'PARAGRAPH' ? 'Start writing...' : 'Content...'}
            rows={block.type === 'PARAGRAPH' ? 4 : 2}
          />
        );
    }
  };

  return (
    <div className={`group relative mb-4 ${isActive ? 'ring-1 ring-[#6B21A8] rounded-lg' : ''}`}>
      {/* Block Controls */}
      <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <button onClick={onMoveUp} className="p-1 text-gray-500 hover:text-white" title="Move up">↑</button>
        <button onClick={onMoveDown} className="p-1 text-gray-500 hover:text-white" title="Move down">↓</button>
        <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-400" title="Delete block">×</button>
      </div>

      {/* Block Type Selector */}
      <div className="flex items-center gap-2 mb-1">
        <select
          value={block.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          className="text-xs bg-[#1A2744] border border-gray-600 rounded px-2 py-1 text-gray-400"
        >
          <option value="PARAGRAPH">Paragraph</option>
          <option value="HEADING">Heading</option>
          <option value="BULLET_LIST">Bullet List</option>
          <option value="NUMBERED_LIST">Numbered List</option>
          <option value="QUOTE">Quote</option>
          <option value="CALLOUT">Callout</option>
          <option value="PAGE_BREAK">Page Break</option>
        </select>
      </div>

      {renderBlockContent()}
    </div>
  );
}
