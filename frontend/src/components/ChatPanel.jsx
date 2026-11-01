import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, Search, Shield, BarChart3, User,
  CheckCircle2, Loader2, Sparkles, FileText
} from 'lucide-react';
import { theme, agentColors } from '../theme';
import api from '../api';

function AgentBadge({ agent }) {
  const icons = { Extractor: Search, Auditor: Shield, Reporter: BarChart3 };
  const Icon = icons[agent] || Bot;
  const colors = agentColors[agent] || agentColors.Orchestrator;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      color: colors.color, background: colors.bg,
    }}>
      <Icon size={12} /> {agent} Agent
    </span>
  );
}

function ThinkingIndicator({ steps }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= steps.length) return;
    const t = setTimeout(() => setCurrent(c => c + 1), 700);
    return () => clearTimeout(t);
  }, [current, steps.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      {steps.slice(0, current + 1).map((step, i) => (
        <div key={i} className="slide-in" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: theme.textDim,
          animationDelay: `${i * 0.1}s`,
        }}>
          {i < current ? (
            <CheckCircle2 size={13} color={theme.success} />
          ) : (
            <Loader2 size={13} color={theme.accent} style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {step}
        </div>
      ))}
    </div>
  );
}

function MessageContent({ text }) {
  // Parse markdown into clean formatted output
  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    elements.push(
      <div key={`table-${elements.length}`} style={{
        margin: '8px 0', fontSize: 12, overflowX: 'auto',
        border: `1px solid ${theme.border}`, borderRadius: 8,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {tableRows.map((row, ri) => {
              const cells = row.split('|').map(c => c.trim()).filter(Boolean);
              const isHeader = ri === 0;
              return (
                <tr key={ri} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {cells.map((c, ci) => isHeader ? (
                    <th key={ci} style={{ padding: '6px 10px', textAlign: 'left', color: theme.accent, fontWeight: 600, fontSize: 11, background: theme.bgSurface }}>{renderInline(c)}</th>
                  ) : (
                    <td key={ci} style={{ padding: '5px 10px', fontSize: 12, color: theme.text }}>{renderInline(c)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip separator lines
    if (/^[\-\*]{3,}$/.test(trimmed) || /^\|[\s\-:|\s]+\|$/.test(trimmed)) continue;

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      if (!inTable) inTable = true;
      // Skip separator rows like | :--- | :--- |
      if (!/^[\s|:\-]+$/.test(trimmed)) {
        tableRows.push(trimmed);
      }
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={i} style={{ height: 6 }} />);
      continue;
    }

    // Headings → bold text (no # symbols)
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      elements.push(
        <div key={i} style={{ fontSize: 13, fontWeight: 600, color: theme.accent, margin: '10px 0 4px' }}>
          {renderInline(headingMatch[1])}
        </div>
      );
      continue;
    }

    // Bullet points: *, -, or · at start
    const bulletMatch = trimmed.match(/^[\*\-\u2022\u00B7]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0', marginLeft: 8 }}>
          <span style={{ color: theme.accent, flexShrink: 0 }}>{'\u2022'}</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0', marginLeft: 8 }}>
          <span style={{ color: theme.accent, flexShrink: 0, fontWeight: 600, fontSize: 12, minWidth: 18 }}>{numMatch[1]}.</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <div key={i} style={{ fontSize: 13, lineHeight: 1.7, padding: '1px 0' }}>
        {renderInline(trimmed)}
      </div>
    );
  }

  // Flush any remaining table
  if (tableRows.length > 0) flushTable();

  return <div>{elements}</div>;
}

function renderInline(text) {
  // Handle **bold**, *italic*, and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: theme.accent, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} style={{ color: theme.textMuted }}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: theme.bgSurface, padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: theme.fontMono || 'monospace', color: theme.accent }}>{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatPanel({ documents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (queryOverride) => {
    const query = queryOverride || input.trim();
    if (!query || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const result = await api.chat(query);
      setMessages(prev => [...prev, {
        role: 'assistant',
        agent: result.agent,
        content: result.response,
        sources: result.sources,
        steps: result.steps,
        routed_to: result.routed_to,
      }]);
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      let friendly;
      if (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('quota')) {
        friendly = 'The AI is temporarily rate-limited. Please wait 15-20 seconds and try again.';
      } else if (errorMsg.includes('connect') || errorMsg.includes('fetch')) {
        friendly = 'Cannot connect to the backend server. Make sure it is running on port 8000.';
      } else {
        friendly = errorMsg;
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        agent: 'Orchestrator',
        content: friendly,
        sources: [],
        steps: [],
        isError: true,
      }]);
    }

    setIsLoading(false);
  }, [input, isLoading]);

  const suggestedQueries = [
    'What are my top expenses?',
    'Find duplicate invoices',
    'Generate a financial summary',
    'How much did TechCorp charge?',
  ];

  return (
    <div className="fade-up" style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 140px)',
    }}>

      {/* Agent Status */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, padding: '10px 14px',
        background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, color: theme.textDim }}>Active Agents:</span>
        <AgentBadge agent="Extractor" />
        <AgentBadge agent="Auditor" />
        <AgentBadge agent="Reporter" />
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: 12, padding: '0 4px',
      }}>
        {/* Empty State */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: theme.textDim }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: `linear-gradient(135deg, ${theme.accentDim}, ${theme.purpleDim})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={24} color={theme.accent} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: theme.textMuted, margin: '0 0 6px' }}>
              Ask me anything about your finances
            </p>
            <p style={{ fontSize: 13, margin: '0 0 24px' }}>
              3 specialist agents are analyzing your {documents.length} documents
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {suggestedQueries.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} style={{
                  padding: '8px 16px', borderRadius: 10,
                  background: theme.bgCard, border: `1px solid ${theme.border}`,
                  color: theme.textMuted, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className="fade-up" style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animationDelay: `${i * 0.05}s`,
          }}>
            {msg.role === 'user' ? (
              <div style={{
                maxWidth: '70%', padding: '12px 16px',
                borderRadius: '14px 14px 4px 14px',
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.purple})`,
                color: '#0A0E17', fontSize: 14, lineHeight: 1.6, fontWeight: 500,
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                maxWidth: '82%', padding: '14px 16px',
                borderRadius: '14px 14px 14px 4px',
                background: theme.bgCard, border: `1px solid ${theme.border}`,
              }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AgentBadge agent={msg.agent} />
                  {msg.routed_to && (
                    <span style={{ fontSize: 11, color: theme.textDim }}>
                      via {msg.routed_to} route
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 13.5, lineHeight: 1.7, color: theme.text,
                  whiteSpace: 'pre-wrap',
                }}>
                  <MessageContent text={msg.content} />
                </div>

                {/* Sources */}
                {msg.sources?.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
                    <span style={{ fontSize: 11, color: theme.textDim, fontWeight: 600 }}>
                      Sources ({msg.sources.length} chunks)
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {msg.sources.slice(0, 3).map((s, j) => (
                        <span key={j} style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: theme.bgSurface, border: `1px solid ${theme.border}`,
                          fontSize: 10, color: theme.textDim, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <FileText size={10} />
                          {s.metadata?.filename || 'doc'} ({(s.score * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="fade-in" style={{
            maxWidth: '80%', padding: '14px 16px',
            borderRadius: '14px 14px 14px 4px',
            background: theme.bgCard, border: `1px solid ${theme.border}`,
          }}>
            <AgentBadge agent="Orchestrator" />
            <div style={{ marginTop: 8 }}>
              <ThinkingIndicator steps={[
                'Routing query to specialist agent...',
                'Searching document database...',
                'Generating response...',
              ]} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: 14, borderRadius: theme.radius,
        background: theme.bgCard, border: `1px solid ${theme.border}`,
        marginTop: 12,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about your financial documents..."
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: theme.text, fontSize: 14, fontFamily: 'inherit',
            padding: '4px 0',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: input.trim() && !isLoading
              ? `linear-gradient(135deg, ${theme.accent}, ${theme.purple})`
              : theme.border,
            color: input.trim() && !isLoading ? theme.bg : theme.textDim,
            cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
