import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  ShieldAlert, 
  Bug, 
  Terminal, 
  FileCode, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Download, 
  Trash2, 
  History, 
  Cpu,
  Menu,
  X
} from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

function App() {
  // Main states
  const [code, setCode] = useState('// Paste or write your code here...\nfunction divide(a, b) {\n  return a / b;\n}');
  const [language, setLanguage] = useState('javascript');
  const [customInput, setCustomInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileViewTab, setMobileViewTab] = useState('editor');
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Auth states
  const [token, setToken] = useState(localStorage.getItem('devdebug_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('devdebug_user')) || null);
  const [showAuthModal, setShowAuthModal] = useState(!localStorage.getItem('devdebug_token'));
  const [authTab, setAuthTab] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sandbox');
  const [reportsHistory, setReportsHistory] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);

  // Initialize and load saved values
  useEffect(() => {
    if (token) {
      fetchReports();
    } else {
      setReportsHistory([]);
      setCurrentReport(null);
    }
  }, [token]);

  const fetchReports = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReportsHistory(data);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const url = authTab === 'login' 
      ? `${API_BASE_URL}/auth/login`
      : `${API_BASE_URL}/auth/register`;

    const body = authTab === 'login'
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('devdebug_token', data.token);
      localStorage.setItem('devdebug_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      
      // Clear auth fields
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('devdebug_token');
    localStorage.removeItem('devdebug_user');
    setToken('');
    setUser(null);
    setShowAuthModal(true);
  };

  const handleRunAnalysis = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    setCurrentReport(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          language,
          input: customInput
        })
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Analysis failed.');
      }

      setCurrentReport(result);
      fetchReports(); // Refresh history
      setActiveTab('sandbox'); // Reset active tab
    } catch (err) {
      alert(`Error running agent: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReport = async (id) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentReport(data);
        setCode(data.code);
        setLanguage(data.language);
        setCustomInput(data.input);
        setActiveTab('sandbox');
      } else {
        alert('Could not retrieve detailed report.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error fetching report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this report from your history?')) return;
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setReportsHistory(reportsHistory.filter(r => r._id !== id));
        if (currentReport && currentReport._id === id) {
          setCurrentReport(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = () => {
    if (!currentReport || !token) return;
    window.open(`${API_BASE_URL}/reports/${currentReport._id}/pdf?token=${token}`);
  };

  const handleDownloadJSON = () => {
    if (!currentReport) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `devdebug_report_${currentReport._id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleApplyFix = () => {
    if (currentReport && currentReport.aiReport && currentReport.aiReport.fixedCode) {
      setCode(currentReport.aiReport.fixedCode);
      alert('Corrected code applied to Monaco Editor workspace!');
    }
  };

  const handleTranslateCode = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!code.trim()) {
      alert('Please enter some code to translate.');
      return;
    }
    setIsTranslating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          sourceLanguage: language,
          targetLanguage
        })
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.substring(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Translation failed.');
      }

      setCode(result.translatedCode);
      setLanguage(targetLanguage);
      if (result.notes) {
        alert(`Translation completed!\n\nAI Notes:\n${result.notes}`);
      }
    } catch (err) {
      alert(`Error translating code: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Maps Monaco editor languages
  const getEditorLanguage = (lang) => {
    if (lang === 'cpp') return 'cpp';
    if (lang === 'c') return 'c';
    if (lang === 'java') return 'java';
    if (lang === 'python') return 'python';
    if (lang === 'javascript') return 'javascript';
    return 'plaintext';
  };

  // Helper for formatting time
  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <div className="app-container">
      {/* SIDEBAR - HISTORY */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} /> Analysis History
          </span>
          <button className="btn-menu-toggle" style={{ padding: '4px' }} onClick={() => setSidebarOpen(false)} title="Close history menu">
            <X size={18} />
          </button>
        </div>
        <ul className="history-list">
          {reportsHistory.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px', fontSize: '0.8rem' }}>
              No history yet. Run code to store reports.
            </div>
          ) : (
            reportsHistory.map((rep) => (
              <li 
                key={rep._id} 
                className={`history-item ${currentReport && currentReport._id === rep._id ? 'active' : ''}`}
                onClick={() => handleSelectReport(rep._id)}
              >
                <div className="history-item-meta">
                  <span className="history-item-title">
                    {rep.language.toUpperCase()} Analysis
                  </span>
                  <span className="history-item-time">
                    {formatTime(rep.createdAt)}
                  </span>
                </div>
                <button 
                  className="btn-icon-delete" 
                  onClick={(e) => handleDeleteReport(e, rep._id)}
                  title="Delete report"
                >
                  <Trash2 size={14} className="text-muted" />
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* MAIN CONTENT WORKSPACE */}
      <main className="main-content">
        <header className="app-header">
          <button className="btn-menu-toggle" onClick={() => setSidebarOpen(true)} title="Open history menu">
            <Menu size={20} />
          </button>
          <div className="logo-container">
            <Cpu className="logo-icon" size={24} />
            <h1 className="logo-text">DevDebug Agent</h1>
          </div>
          
          <div className="panel-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="user-welcome" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Hello, <strong>{user.name}</strong>
                </span>
                <button 
                  className="btn btn-secondary"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setAuthTab('login');
                  setShowAuthModal(true);
                }}
              >
                Sign In
              </button>
            )}
            
            <button 
              className="btn btn-primary"
              onClick={handleRunAnalysis}
              disabled={isLoading}
            >
              <Play size={16} fill="white" /> {isLoading ? 'Analyzing...' : 'Run Debugger'}
            </button>
          </div>
        </header>

        {/* WORKSPACE & REPORTS GRID */}
        <div className="dashboard-grid">
          
          {/* PANEL 1: WORKSPACE (Monaco Editor) */}
          <div className={`workspace-panel ${mobileViewTab !== 'editor' ? 'hide-mobile' : ''}`}>
            <div className="panel-header">
              <div className="panel-title">
                <FileCode size={16} className="text-secondary" /> Code Workspace
              </div>
              <div className="panel-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: '4px' }}>
                <select 
                  className="select-input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  title="Source Language"
                >
                  <option value="auto">Auto-detect Language</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 2px' }}>➔</span>
                <select 
                  className="select-input"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  title="Target Language"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: '4px' }} 
                  onClick={handleTranslateCode}
                  disabled={isTranslating}
                >
                  {isTranslating ? 'Translating...' : 'Translate'}
                </button>
              </div>
            </div>

            <div className="editor-container-wrapper">
              <Editor
                height="100%"
                language={getEditorLanguage(language)}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 20,
                  fontFamily: 'Fira Code',
                  padding: { top: 15 },
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  automaticLayout: true
                }}
              />
            </div>

            {/* Input Console for StdIn */}
            <div className="input-console-wrapper">
              <div className="input-console-header">
                Custom Standard Input (Stdin)
              </div>
              <textarea
                className="input-console-textarea"
                placeholder="Provide arguments or inputs for your code execution here..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
            </div>
          </div>

          {/* PANEL 2: REPORTS VIEW */}
          <div className={`report-panel ${mobileViewTab !== 'report' ? 'hide-mobile' : ''}`}>
            {isLoading && !showAuthModal ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Orchestrating AI Pipelines</h3>
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Compiling code, executing sandbox, parsing AST, and scanning vulnerabilities...</p>
                </div>
              </div>
            ) : currentReport ? (
              <>
                {/* Report Header actions */}
                <div className="panel-header" style={{ paddingRight: '8px' }}>
                  <div className="panel-title" style={{ color: 'var(--accent-teal)' }}>
                    <CheckCircle size={16} /> Analysis Completed
                  </div>
                  <div className="panel-actions" style={{ gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={handleDownloadJSON} title="Export Report as JSON">
                      <Download size={14} /> Export JSON
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadPDF} title="Download beautiful PDF Report">
                      <Download size={14} /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="tabs-header">
                  <button 
                    className={`tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sandbox')}
                  >
                    <Terminal size={14} /> Sandbox Console
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'bugs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bugs')}
                  >
                    <Bug size={14} /> Bug Review
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'fixes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fixes')}
                  >
                    <FileCode size={14} /> Fixes Suggested
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <ShieldAlert size={14} /> Security Scan
                  </button>
                </div>

                {/* Tabs details */}
                <div className="tabs-content">
                  
                  {/* SANDBOX CONSOLE TAB */}
                  {activeTab === 'sandbox' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <h3 className="section-title"><Terminal size={18} /> Compilation & Subprocess Logs</h3>
                        <div className={`terminal-box ${currentReport.sandbox.success ? 'terminal-success' : 'terminal-error'}`}>
                          <div>$ g++ code.cpp -o code.exe &amp;&amp; ./code.exe</div>
                          <div style={{ color: 'var(--text-muted)', margin: '8px 0' }}>------------------------------------------------</div>
                          {currentReport.sandbox.compile_output && (
                            <div style={{ marginBottom: '8px', color: '#fb7185' }}>
                              <strong>Compile Output:</strong><br />
                              {currentReport.sandbox.compile_output}
                            </div>
                          )}
                          {currentReport.sandbox.execution_output && (
                            <div style={{ marginBottom: '8px' }}>
                              {currentReport.sandbox.execution_output}
                            </div>
                          )}
                          {currentReport.sandbox.execution_error && (
                            <div style={{ color: '#f87171' }}>
                              <strong>Runtime Stderr:</strong><br />
                              {currentReport.sandbox.execution_error}
                            </div>
                          )}
                          <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>------------------------------------------------</div>
                          <div style={{ fontSize: '0.8rem', display: 'flex', gap: '20px' }}>
                            <span>Exit Code: {currentReport.sandbox.exit_code}</span>
                            <span>Run Time: {currentReport.sandbox.run_time_ms} ms</span>
                            <span>Status: {currentReport.sandbox.success ? 'Success' : 'Failed'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {currentReport.staticAnalysis && currentReport.staticAnalysis.length > 0 && (
                        <div>
                          <h3 className="section-title"><Info size={18} /> Static AST / Lint Checks</h3>
                          {currentReport.staticAnalysis.map((issue, idx) => (
                            <div key={idx} className="issue-card info">
                              <div className="issue-header">
                                <span className="issue-title">Lint Findings</span>
                                <span className="issue-tag info">{issue.severity}</span>
                              </div>
                              <p className="issue-desc">{issue.message}</p>
                              {issue.line && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: Line {issue.line}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BUG REVIEW TAB */}
                  {activeTab === 'bugs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 className="section-title"><Bug size={18} /> Detected Logical &amp; Runtime Bugs</h3>
                      <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                        The Gemini model analyzed execution paths and output logs. Below are the findings:
                      </p>
                      {(!currentReport.aiReport.bugs || currentReport.aiReport.bugs.length === 0) ? (
                        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--status-success)', borderLeft: '4px solid var(--status-success)' }}>
                          <strong>No logical bugs identified. Good code structure!</strong>
                        </div>
                      ) : (
                        currentReport.aiReport.bugs.map((bug, idx) => (
                          <div key={idx} className={`issue-card ${bug.severity}`}>
                            <div className="issue-header">
                              <span className="issue-title">Line {bug.line}</span>
                              <span className={`issue-tag ${bug.severity}`}>{bug.severity}</span>
                            </div>
                            <p className="issue-desc">{bug.description}</p>
                            {bug.fix && (
                              <p className="issue-remedy">
                                <strong>Suggested Solution:</strong> {bug.fix}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                      
                      {currentReport.aiReport.generalReview && (
                        <div className="glass-card" style={{ marginTop: '16px' }}>
                          <h4 style={{ marginBottom: '8px', fontSize: '0.95rem' }}>Complexity &amp; Structure Review</h4>
                          <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>{currentReport.aiReport.generalReview}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FIXES SUGGESTED TAB */}
                  {activeTab === 'fixes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}><FileCode size={18} /> Corrected Output Code</h3>
                        <button className="btn btn-secondary" onClick={handleApplyFix}>
                          Apply Code to Editor
                        </button>
                      </div>
                      <div className="terminal-box" style={{ flexGrow: 1, maxHeight: '450px', background: '#090d16' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{currentReport.aiReport.fixedCode || '// No corrected code suggested.'}</pre>
                      </div>
                    </div>
                  )}

                  {/* SECURITY SCAN TAB */}
                  {activeTab === 'security' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 className="section-title"><ShieldAlert size={18} /> Sandbox Security Scan Report</h3>
                      <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                        Scanned for common CVE patterns, stack vulnerabilities, and input sanitization gaps:
                      </p>
                      {(!currentReport.aiReport.securityIssues || currentReport.aiReport.securityIssues.length === 0) ? (
                        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--status-success)', borderLeft: '4px solid var(--status-success)' }}>
                          <strong>No security issues found. Sandbox is secure.</strong>
                        </div>
                      ) : (
                        currentReport.aiReport.securityIssues.map((issue, idx) => {
                          const isHigh = ['Critical', 'High'].includes(issue.severity);
                          const cardClass = isHigh ? 'critical' : (issue.severity === 'Medium' ? 'warning' : 'info');
                          return (
                            <div key={idx} className={`issue-card ${cardClass}`}>
                              <div className="issue-header">
                                <span className="issue-title">{issue.category} {issue.lines && `(Line ${issue.lines})`}</span>
                                <span className={`issue-tag ${cardClass}`}>{issue.severity}</span>
                              </div>
                              <p className="issue-desc">{issue.description}</p>
                              {issue.remediation && (
                                <p className="issue-remedy">
                                  <strong>Remediation:</strong> {issue.remediation}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div className="empty-state">
                <Cpu className="empty-state-icon" />
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>No Analysis Run</h2>
                <p style={{ maxWidth: '400px', fontSize: '0.85rem' }}>
                  Write code in the Monaco Editor workspace on the left and press "Run Debugger" to execute code compilation and trigger AI review.
                </p>
              </div>
            )}
          </div>

        </div>
        
        {/* BOTTOM NAVIGATION FOR MOBILE SCREEN TOGGLING */}
        <div className="mobile-nav-tabs">
          <button 
            className={`mobile-nav-btn ${mobileViewTab === 'editor' ? 'active' : ''}`}
            onClick={() => setMobileViewTab('editor')}
          >
            <FileCode size={18} />
            <span>Workspace</span>
          </button>
          <button 
            className={`mobile-nav-btn ${mobileViewTab === 'report' ? 'active' : ''}`}
            onClick={() => setMobileViewTab('report')}
          >
            <Cpu size={18} />
            <span>Report</span>
          </button>
        </div>
      </main>

      {/* AUTH MODAL OVERLAY */}
      {showAuthModal && (
        <div className="auth-overlay">
          <div className="auth-card">
            <div className="auth-logo">
              <Cpu className="logo-icon" size={40} />
              <h2>DevDebug Agent</h2>
              <p>AI-Powered Code Reviewer & Sandbox Execution</p>
            </div>
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
              >
                Login
              </button>
              <button 
                className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authTab === 'register' && (
                <div className="form-group">
                  <label htmlFor="authName">Full Name</label>
                  <input 
                    type="text" 
                    id="authName"
                    required
                    placeholder="John Doe"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="authEmail">Email Address</label>
                <input 
                  type="email" 
                  id="authEmail"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="authPassword">Password</label>
                <input 
                  type="password" 
                  id="authPassword"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              {authError && (
                <div className="auth-error-msg">
                  <AlertTriangle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={isLoading}
                style={{ marginTop: '10px' }}
              >
                {isLoading ? 'Processing...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
