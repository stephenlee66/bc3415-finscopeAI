import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, MessageSquare, Zap, FileCheck } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import ChatPanel from './components/ChatPanel';
import { theme, globalStyles } from './theme';
import api from './api';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    api.healthCheck()
      .then(() => {
        setBackendOnline(true);
        // Load existing documents
        api.getDocuments().then(data => setDocuments(data.documents || []));
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Documents', icon: Upload },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.fontSans }}>
      <style>{globalStyles}</style>

      {/* Header */}
      <header style={{
        padding: '14px 24px 14px 24px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,14,23,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color={theme.bg} fill={theme.bg} />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              FinScope AI
            </h1>
            <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>
              Multi-agent Financial Analyst
            </p>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{
          display: 'flex', gap: 4,
          background: theme.bgSurface, borderRadius: 10, padding: 3,
        }}>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                fontFamily: 'inherit',
                background: tab === t.id ? theme.bgCard : 'transparent',
                color: tab === t.id ? theme.text : theme.textDim,
                transition: 'all 0.2s',
              }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Backend status */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 100,
            fontSize: 11, fontWeight: 600,
            color: backendOnline === true ? theme.success : backendOnline === false ? theme.danger : theme.textDim,
            background: backendOnline === true ? theme.successDim : backendOnline === false ? theme.dangerDim : theme.bgSurface,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3,
              background: backendOnline === true ? theme.success : backendOnline === false ? theme.danger : theme.textDim,
            }} />
            {backendOnline === true ? 'Backend Online' : backendOnline === false ? 'Backend Offline' : 'Checking...'}
          </span>

          {/* Doc count */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', borderRadius: 100,
            fontSize: 11, fontWeight: 600,
            color: theme.accent, background: theme.accentDim,
          }}>
            <FileCheck size={12} /> {documents.length} Docs
          </span>
        </div>
      </header>

      {/* Offline Banner */}
      {backendOnline === false && (
        <div style={{
          padding: '12px 24px', background: theme.dangerDim,
          borderBottom: `1px solid rgba(248,113,113,0.2)`,
          fontSize: 13, color: theme.danger, textAlign: 'center',
        }}>
          Backend is offline. Start it with: <code style={{
            fontFamily: theme.fontMono, background: 'rgba(0,0,0,0.3)',
            padding: '2px 8px', borderRadius: 4,
          }}>cd backend && uvicorn main:app --reload --port 8000</code>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'dashboard' && (
          <Dashboard documents={documents} onTabChange={setTab} />
        )}
        {tab === 'upload' && (
          <FileUpload documents={documents} setDocuments={setDocuments} />
        )}
        {tab === 'chat' && (
          <ChatPanel documents={documents} />
        )}
      </main>
    </div>
  );
}
