import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

const API_URL = '/api';

// --- Theme Context & Components ---

type Theme = 'light' | 'dark' | 'forest';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'light', setTheme: () => {} });

const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app_theme') as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const ThemeSwitcher = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div className="theme-switcher">
      <button 
        className={`theme-btn ${theme === 'light' ? 'active' : ''}`} 
        style={{ backgroundColor: '#f5f5dc' }}
        title="Beige Theme"
        onClick={() => setTheme('light')}
      />
      <button 
        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} 
        style={{ backgroundColor: '#1a1a1a' }}
        title="Dark Theme"
        onClick={() => setTheme('dark')}
      />
      <button 
        className={`theme-btn ${theme === 'forest' ? 'active' : ''}`} 
        style={{ backgroundColor: '#1b2e1b' }}
        title="Forest Theme"
        onClick={() => setTheme('forest')}
      />
    </div>
  );
};

const NavBar = () => {
  const location = useLocation();
  return (
    <nav>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>The Code</Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>History</Link>
      </div>
      <ThemeSwitcher />
    </nav>
  );
};

// --- Utilities ---

const getUserId = () => {
  let userId = localStorage.getItem('human_id');
  if (!userId) {
    userId = 'human_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('human_id', userId);
  }
  return userId;
};

interface HistoryEntry {
  id: number;
  content: string;
  timestamp: string;
  changeDescription: string;
  vetoes: string[];
  reversed: boolean;
}

// --- Views ---

const ArticleView = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const fetchArticle = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/article`);
      const data = await res.json();
      setContent(data.content);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleWordClick = (word: string) => {
    setEditValue(content);
    setEditing(true);
  };

  const handleSubmit = async () => {
    setEditing(false);
    setStatus('AI is reviewing the edit...');
    try {
      const res = await fetch(`${API_URL}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newContent: editValue, changeDescription: 'User edit' })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('AI approved. Change applied.');
        fetchArticle();
      } else {
        setStatus(`AI Rejected: ${data.message}`);
      }
    } catch (err) {
      setStatus('Error connecting to AI service.');
    }
    setTimeout(() => setStatus(null), 3000);
  };

  if (loading) return (
    <div className="container">
      <NavBar />
      Loading Ethics...
    </div>
  );

  const words = content.split(/(\s+)/);

  return (
    <div className="container">
      <NavBar />
      <h1>Humanity's Code of Ethics</h1>
      <div className="article-content">
        {words.map((word, i) => (
          word.trim() ? (
            <span key={i} className="word" onClick={() => handleWordClick(word)}>
              {word}
            </span>
          ) : (
            <span key={i}>{word}</span>
          )
        ))}
      </div>
      <p style={{marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6}}>
        Click a word to propose an edit to the article.
      </p>

      {editing && (
        <div className="edit-overlay">
          <div className="edit-modal">
            <h3>Propose Change</h3>
            <textarea 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)}
            />
            <div style={{marginTop: '1rem'}}>
              <button onClick={handleSubmit}>Submit for AI Review</button>
              <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {status && <div className="status-indicator">{status}</div>}
    </div>
  );
};

const HistoryView = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/history`);
      const data = await res.json();
      setHistory(data.reverse()); // Newest first
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleVeto = async (entryId: number) => {
    try {
      const res = await fetch(`${API_URL}/veto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, userId })
      });
      if (res.ok) fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="container">
      <NavBar />
      Loading History...
    </div>
  );

  return (
    <div className="container">
      <NavBar />
      <h1>Iteration History</h1>
      <div className="history-list">
        {history.map((entry) => (
          <div key={entry.id} className={`history-item ${entry.reversed ? 'reversed' : ''}`}>
            <div className="history-meta">
              {new Date(entry.timestamp).toLocaleString()} — {entry.changeDescription}
              {entry.reversed && <span style={{marginLeft: '10px', color: '#d9534f'}}>(REVERSED BY HUMAN VETO)</span>}
            </div>
            <div className="history-content">
              {entry.content}
            </div>
            {!entry.reversed && entry.id !== 1 && (
              <div className="veto-actions">
                <button 
                  className="secondary" 
                  style={{fontSize: '0.8rem', padding: '5px 10px'}}
                  onClick={() => handleVeto(entry.id)}
                  disabled={entry.vetoes.includes(userId)}
                >
                  {entry.vetoes.includes(userId) ? 'Veto Cast' : 'Cast Veto'} ({entry.vetoes.length}/2)
                </button>
                {entry.vetoes.length > 0 && (
                  <span className="veto-status" style={{marginLeft: '10px'}}>
                    {2 - entry.vetoes.length} more human veto(es) required to reverse.
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ArticleView />} />
          <Route path="/history" element={<HistoryView />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
