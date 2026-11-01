import React, { useState, useEffect } from 'react';
import {
  BarChart3, AlertTriangle, TrendingUp, FileText,
  PiggyBank, Shield, Search, ChevronRight, Loader2,
  Receipt, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { theme, agentColors, severityColors } from '../theme';
import api from '../api';

function KpiCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div style={{
      background: theme.bgCard, border: `1px solid ${theme.border}`,
      borderRadius: theme.radius, padding: 20,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = theme.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: color + '20', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{
          fontSize: 11, color: theme.textDim, textTransform: 'uppercase',
          letterSpacing: '0.06em', fontWeight: 600,
        }}>{label}</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
          <Loader2 size={18} color={theme.textDim} className="spin-icon" />
          <span style={{ fontSize: 13, color: theme.textDim }}>Analyzing...</span>
        </div>
      ) : (
        <>
          <p style={{
            fontSize: 28, fontWeight: 700, color, margin: '0 0 4px',
            fontFamily: theme.fontMono,
          }}>{value}</p>
          <p style={{ fontSize: 12, color: theme.textMuted, margin: 0 }}>{sub}</p>
        </>
      )}
    </div>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      color, background: bg || color + '20',
    }}>{children}</span>
  );
}

function AgentBadge({ agent }) {
  const icons = { Extractor: Search, Auditor: Shield, Reporter: BarChart3 };
  const Icon = icons[agent] || FileText;
  const colors = agentColors[agent] || agentColors.Orchestrator;
  return (
    <Badge color={colors.color} bg={colors.bg}>
      <Icon size={12} /> {agent}
    </Badge>
  );
}

export default function Dashboard({ documents, onTabChange }) {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (documents.length === 0) {
      setDashData(null);
      return;
    }
    setLoading(true);
    api.getDashboard()
      .then(data => { setDashData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [documents]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: theme.bgCard, border: `1px solid ${theme.border}`,
        borderRadius: 8, padding: '10px 14px', fontSize: 12,
      }}>
        <p style={{ color: theme.textMuted, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontFamily: theme.fontMono, margin: '2px 0' }}>
            {p.name}: ${p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="fade-up" style={{
        textAlign: 'center', padding: '80px 20px',
        background: theme.bgCard, border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
      }}>
        <Receipt size={40} color={theme.textDim} style={{ marginBottom: 16, opacity: 0.4 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: theme.textMuted, margin: '0 0 8px' }}>
          No documents loaded yet
        </p>
        <p style={{ fontSize: 13, color: theme.textDim, margin: '0 0 20px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
          Upload financial documents to see your dashboard with real analytics.
        </p>
        <button onClick={() => onTabChange('upload')} style={{
          padding: '10px 24px', borderRadius: 10,
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.purple})`,
          border: 'none', color: theme.bg, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Go to Documents
        </button>
      </div>
    );
  }

  const kpis = dashData?.kpis || {};
  const spendingByCategory = dashData?.spending_by_category || [];
  const monthlyTrend = dashData?.monthly_trend || [];
  const anomalies = dashData?.anomalies || [];
  const spendingByVendor = dashData?.spending_by_vendor || [];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-icon { animation: spin 1s linear infinite; }`}</style>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon={PiggyBank} label="Documents Total" loading={loading}
          value={`$${(kpis.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub={`${kpis.transaction_count || 0} transactions`} color={theme.accent} />
        <KpiCard icon={FileText} label="No. of Documents" loading={loading}
          value={String(kpis.doc_count || documents.length)}
          sub={`${spendingByCategory.length} categories detected`} color={theme.purple} />
        <KpiCard icon={AlertTriangle} label="Potential Anomalies" loading={loading}
          value={String(kpis.anomaly_count || 0)}
          sub={anomalies.filter(a => a.severity === 'high').length > 0 ? `${anomalies.filter(a => a.severity === 'high').length} high severity` : 'No critical issues'}
          color={kpis.anomaly_count > 0 ? theme.danger : theme.success} />
        <KpiCard icon={TrendingUp} label="Potential savings" loading={loading}
          value={`$${(kpis.potential_savings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub="From duplicate review" color={theme.success} />
      </div>

      {/* Income + Net Cash Flow row */}
      {(kpis.total_income || 0) > 0 && !isNaN(kpis.net) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.successDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={20} color={theme.success} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: theme.textDim, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Total Income</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: theme.success, margin: 0, fontFamily: theme.fontMono }}>
                ${(kpis.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: ((kpis.net || 0) >= 0 ? theme.successDim : theme.dangerDim), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(kpis.net || 0) >= 0 ? <ArrowUpRight size={20} color={theme.success} /> : <ArrowDownRight size={20} color={theme.danger} />}
            </div>
            <div>
              <p style={{ fontSize: 11, color: theme.textDim, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Net Cash Flow</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: (kpis.net || 0) >= 0 ? theme.success : theme.danger, margin: 0, fontFamily: theme.fontMono }}>
                {(kpis.net || 0) >= 0 ? '+' : '-'}${Math.abs(kpis.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Spending by Category */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textMuted, margin: '0 0 16px' }}>Top Spending Categories</h3>
          {spendingByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, Math.min(spendingByCategory.length, 5) * 45)}>
              <BarChart data={spendingByCategory.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: theme.textDim, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="amount" fill={theme.accent} radius={[0, 4, 4, 0]} barSize={18} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 13, color: theme.textDim, textAlign: 'center', padding: 40 }}>No category data detected</p>
          )}
        </div>

        {/* Monthly Trend */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textMuted, margin: '0 0 16px' }}>
            {monthlyTrend.length > 1 ? 'Monthly Trend' : 'Top Vendors'}
          </h3>
          {monthlyTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, Math.min(spendingByCategory.length, 5) * 45)}>
              <AreaChart data={monthlyTrend} margin={{ left: 20, right: 20 }}>
                <defs>
                  <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                <XAxis dataKey="month" tick={{ fill: theme.textDim, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: theme.textDim, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                {monthlyTrend.some(m => m.income > 0) && (
                  <Area type="monotone" dataKey="income" stroke={theme.success} fill="url(#gradIncome)" strokeWidth={2} name="Income"
                    dot={{ r: 4, fill: theme.bgCard, stroke: theme.success, strokeWidth: 2 }} />
                )}
                <Area type="monotone" dataKey="spend" stroke={theme.accent} fill="url(#gradSpend)" strokeWidth={2} name="Spend"
                  dot={{ r: 4, fill: theme.bgCard, stroke: theme.accent, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : spendingByVendor.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, Math.min(spendingByVendor.length, 5) * 45)}>
              <BarChart data={spendingByVendor.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: theme.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="amount" fill={theme.purple} radius={[0, 4, 4, 0]} barSize={18} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 13, color: theme.textDim, textAlign: 'center', padding: 40 }}>Upload documents with dates to see trends</p>
          )}
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 ? (
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color={theme.danger} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textMuted, margin: 0 }}>Potential Anomalies Detected</h3>
            </div>
            <Badge color={theme.danger}>{anomalies.length} Found</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anomalies.map((a, i) => {
              const sev = severityColors[a.severity] || severityColors.low;
              return (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 10, background: sev.bg,
                  border: `1px solid ${sev.border}`, cursor: 'pointer', transition: 'transform 0.15s',
                }}
                  onClick={() => onTabChange('chat')}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <Badge color={sev.color}>{a.severity.charAt(0).toUpperCase() + a.severity.slice(1)}</Badge>
                    
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, flex: 1 }}>{a.title}</span>
                    <ChevronRight size={14} color={theme.textDim} />
                  </div>
                  <p style={{ fontSize: 12, color: theme.textMuted, margin: 0, lineHeight: 1.5 }}>{a.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : dashData && (
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 20, textAlign: 'center' }}>
          <Shield size={24} color={theme.success} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: theme.success, margin: '0 0 4px' }}>No anomalies detected</p>
          <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>All transactions look clean.</p>
        </div>
      )}
    </div>
  );
}
