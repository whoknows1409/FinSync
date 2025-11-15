// frontend/components/chatbot/message-renderer.tsx
"use client"

import React from 'react';

interface MessageRendererProps {
  content: string;
  isUser: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Parse and render markdown-like content
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let tableRows: string[][] = [];
    let inTable = false;

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
        elements.push(
          <ListTag key={elements.length} className="my-3 ml-6 space-y-2 list-disc marker:text-blue-500 dark:marker:text-blue-400">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="text-gray-700 dark:text-gray-300 pl-2 leading-relaxed">
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={elements.length} className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto text-sm">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const body = tableRows.slice(2); // Skip header and separator row

        elements.push(
          <div key={elements.length} className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {body.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {renderInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
    };

    const renderInlineFormatting = (text: string) => {
      // Handle inline code
      text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 font-mono text-sm">$1</code>');
      
      // Handle bold
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
      
      // Handle italic
      text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>');
      
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Handle tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList();
        if (!inTable) {
          inTable = true;
        }
        const cells = line.split('|').slice(1, -1);
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
        inTable = false;
      }

      // Handle headers
      const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        flushList();
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        const className = level === 1 
          ? "text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2"
          : level === 2
          ? "text-xl font-semibold mt-5 mb-3 text-gray-900 dark:text-white"
          : "text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-100";
        
        elements.push(
          <HeaderTag key={elements.length} className={className}>
            {renderInlineFormatting(text)}
          </HeaderTag>
        );
        return;
      }

      // Handle unordered lists
      if (line.trim().match(/^[\*\-]\s+/)) {
        flushTable();
        const item = line.trim().substring(2);
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(item);
        return;
      }

      // Handle ordered lists
      if (line.trim().match(/^\d+\.\s+/)) {
        flushTable();
        const item = line.trim().replace(/^\d+\.\s+/, '');
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(item);
        return;
      }

      // Handle horizontal rules
      if (line.trim().match(/^-{3,}$/)) {
        flushList();
        flushTable();
        elements.push(
          <hr key={elements.length} className="my-6 border-gray-200 dark:border-gray-700" />
        );
        return;
      }

      // Handle blockquotes
      if (line.trim().startsWith('>')) {
        flushList();
        flushTable();
        const text = line.trim().substring(1).trim();
        elements.push(
          <blockquote key={elements.length} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300">
            {renderInlineFormatting(text)}
          </blockquote>
        );
        return;
      }

      // Handle empty lines
      if (line.trim() === '') {
        flushList();
        flushTable();
        return;
      }

      // Regular paragraphs
      flushList();
      flushTable();
      elements.push(
        <p key={elements.length} className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    // Flush any remaining content
    flushList();
    flushCodeBlock();
    flushTable();

    return elements;
  };

  return <div className="prose prose-sm dark:prose-invert max-w-none">{renderContent()}</div>;
};
