import React, { useState, useCallback } from 'react';
import {
  Upload, FileText, Trash2, CheckCircle2, Loader2,
  AlertCircle, Database, Cpu, Layers, HardDrive
} from 'lucide-react';
import { theme } from '../theme';
import api from '../api';

function PipelineStep({ icon: Icon, label, status }) {
  const color = status === 'done' ? theme.success : status === 'active' ? theme.accent : theme.textDim;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: color + '20', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {status === 'active' ? (
          <Loader2 size={14} color={color} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Icon size={14} color={color} />
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color }}>{label}</span>
    </div>
  );
}

export default function FileUpload({ documents, setDocuments }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'parsing' | 'chunking' | 'embedding' | 'storing' | 'done' | 'error'
  const [error, setError] = useState(null);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const handleFiles = useCallback(async (files) => {
    if (uploading) return;
    setError(null);

    for (const file of files) {
      setUploading(true);

      // Simulate pipeline stages
      setUploadStatus('parsing');
      await sleep(600);
      setUploadStatus('chunking');
      await sleep(500);
      setUploadStatus('embedding');
      await sleep(800);
      setUploadStatus('storing');

      try {
        const result = await api.uploadDocument(file);
        setDocuments(prev => [...prev, result]);
        setUploadStatus('done');
        await sleep(1000);
      } catch (err) {
        setError(err.message);
        setUploadStatus('error');
      }

      setUploading(false);
      setTimeout(() => setUploadStatus(null), 1500);
    }
  }, [uploading, setDocuments]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleFileInput = useCallback((e) => {
    handleFiles(Array.from(e.target.files));
  }, [handleFiles]);

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
    setError(null);
    try {
      const result = await api.loadSamples();
      // Refresh document list
      const docs = await api.getDocuments();
      setDocuments(docs.documents || []);
    } catch (err) {
      setError(err.message);
    }
    setLoadingSamples(false);
  };

  const handleDelete = async (docId) => {
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err.message);
    }
  };

  const getPipelineStatus = (stage) => {
    const stages = ['parsing', 'chunking', 'embedding', 'storing', 'done'];
    const current = stages.indexOf(uploadStatus);
    const target = stages.indexOf(stage);
    if (current < 0) return 'pending';
    if (target < current) return 'done';
    if (target === current) return 'active';
    return 'pending';
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          padding: 48, borderRadius: theme.radius, cursor: 'pointer',
          border: `2px dashed ${dragOver ? theme.accent : theme.border}`,
          background: dragOver ? theme.accentDim : 'transparent',
          textAlign: 'center', transition: 'all 0.2s',
          position: 'relative',
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input" type="file" multiple
          accept=".pdf,.csv,.xlsx,.xls,.txt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <Upload size={36} color={theme.textDim} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>
          Drop financial documents here
        </p>
        <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>
          Supports PDF, CSV, XLSX, TXT — invoices, receipts, bank statements
        </p>
      </div>

      {/* Pipeline Progress */}
      {uploadStatus && (
        <div className="fade-in" style={{
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: theme.radius, padding: 18,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted, margin: '0 0 14px' }}>
            RAG Pipeline
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PipelineStep icon={FileText} label="Parse document" status={getPipelineStatus('parsing')} />
            <span style={{ color: theme.textDim }}>→</span>
            <PipelineStep icon={Layers} label="Chunk text" status={getPipelineStatus('chunking')} />
            <span style={{ color: theme.textDim }}>→</span>
            <PipelineStep icon={Cpu} label="Generate embeddings" status={getPipelineStatus('embedding')} />
            <span style={{ color: theme.textDim }}>→</span>
            <PipelineStep icon={Database} label="Store in ChromaDB" status={getPipelineStatus('storing')} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: theme.dangerDim, border: `1px solid rgba(248,113,113,0.2)`,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: theme.danger,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Load Samples Button */}
      <button
        onClick={handleLoadSamples}
        disabled={loadingSamples}
        style={{
          padding: '12px 20px', borderRadius: theme.radiusSm,
          background: theme.purpleDim, border: `1px solid rgba(167,139,250,0.2)`,
          color: theme.purple, fontSize: 13, fontWeight: 600,
          cursor: loadingSamples ? 'wait' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          gap: 8, justifyContent: 'center', transition: 'all 0.2s',
        }}
      >
        {loadingSamples ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <HardDrive size={14} />}
        {loadingSamples ? 'Loading sample data...' : 'Load sample financial data (for demo)'}
      </button>

      {/* Document List */}
      <div style={{
        background: theme.bgCard, border: `1px solid ${theme.border}`,
        borderRadius: theme.radius, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted, margin: 0 }}>
            Processed Documents ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: theme.textDim, fontSize: 13 }}>
            No documents yet. Upload files or load sample data above.
          </div>
        ) : (
          documents.map((doc, i) => (
            <div key={doc.id} style={{
              padding: '12px 18px',
              borderBottom: i < documents.length - 1 ? `1px solid ${theme.border}` : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgCardHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FileText size={16} color={theme.textDim} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.filename}
                </p>
                <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>
                  {doc.file_type?.toUpperCase()} · {doc.chunk_count} chunks · {doc.upload_time?.split('T')[0] || ''}
                </p>
              </div>
              <span style={{
                padding: '2px 10px', borderRadius: 100,
                fontSize: 11, fontWeight: 600,
                color: doc.status === 'processed' ? theme.success : theme.warning,
                background: doc.status === 'processed' ? theme.successDim : theme.warningDim,
              }}>
                {doc.status || 'processed'}
              </span>
              <button onClick={() => handleDelete(doc.id)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: theme.textDim, padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = theme.danger}
                onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
