import React, { useState, useEffect } from 'react';
import { useAgencyStore } from './store/useAgencyStore';
import { Users, Coins, Activity, UserPlus, Clock, LayoutDashboard, Settings, LogOut, Wallet, Target, Bell, Trash2, ArrowUpRight, ChevronLeft, Eye, KeyRound, Headphones } from 'lucide-react';
import './index.css';

function LoginView() {
  const { login, isLoading, error } = useAgencyStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <KeyRound size={40} color="var(--primary)" />
          <h2>Agency Login</h2>
          <p>Sign in to manage your Qablny agency</p>
        </div>
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="invite-btn" disabled={isLoading} style={{marginTop:'1rem'}}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { 
    monthlyTarget, currentProgress, activeHosts, totalHosts, totalEarnings, agencyCut, hosts, fetchDashboardStats 
  } = useAgencyStore();
  
  useEffect(() => {
    // Polling is now handled globally in App
  }, []);

  const progressPercent = monthlyTarget > 0 ? Math.min((currentProgress / monthlyTarget) * 100, 100) : 0;
  const topHosts = [...hosts].sort((a, b) => b.earnings - a.earnings).slice(0, 3);

  return (
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title"><Activity size={16} color="var(--primary)"/> Active Hosts</div>
          <div className="stat-value">{activeHosts} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/ {totalHosts}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-title"><Coins size={16} color="#FCD34D"/> Total Earnings (Today)</div>
          <div className="stat-value">{totalEarnings.toLocaleString()} <span style={{fontSize:'1rem', color:'#FCD34D'}}>Coins</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-title"><Coins size={16} color="#10B981"/> Agency Cut</div>
          <div className="stat-value" style={{color: '#10B981'}}>{agencyCut.toLocaleString()} <span style={{fontSize:'1rem'}}>Coins</span></div>
        </div>
      </section>

      <div className="split-grid">
        <section className="target-card">
          <div className="card-header">
            <Target size={20} color="var(--primary)"/>
            <h3>Monthly Target (Bonus)</h3>
          </div>
          <div className="progress-info">
            <span>{currentProgress.toLocaleString()} Coins</span>
            <span>Goal: {monthlyTarget.toLocaleString()}</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{width: `${progressPercent}%`}}></div>
          </div>
          <p className="target-subtext">{progressPercent.toFixed(1)}% Completed. Keep pushing to unlock the bonus!</p>
        </section>

        <section className="leaderboard-card">
          <div className="card-header">
            <h3>🏆 Top Performing Hosts</h3>
          </div>
          {topHosts.length > 0 ? (
            <ul className="leaderboard-list">
              {topHosts.map((h, idx) => (
                <li key={h.id}>
                  <div className="leader-info">
                    <span className={`rank rank-${idx+1}`}>#{idx+1}</span>
                    <strong>{h.name}</strong>
                  </div>
                  <div className="coins">{h.earnings.toLocaleString()} C</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{color:'var(--text-muted)'}}>No data available yet.</p>
          )}
        </section>
      </div>
    </>
  );
}

function HostDetailsView({ host, onBack }) {
  const recentGifts = []; // Mocked for now until API is built

  return (
    <div className="host-details-view">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Hosts
      </button>

      <div className="host-profile-header">
        <div className="host-avatar-large">{host.name.charAt(0)}</div>
        <div className="host-profile-info">
          <h2>{host.name}</h2>
          <span className={`status-badge status-${host.status.replace(' ', '')}`}>
            <span className="status-indicator"></span>{host.status}
          </span>
          <div className="host-meta">
            <span>Joined: {host.joinedDate}</span>
            <span>ID: #{host.id.substring(0,8)}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{marginTop:'2rem'}}>
        <div className="stat-card">
          <div className="stat-title"><Coins size={16} color="#FCD34D"/> Earnings</div>
          <div className="stat-value">{host.earnings.toLocaleString()} <span style={{fontSize:'1rem', color:'#FCD34D'}}>Coins</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-title"><Clock size={16} color="#3B82F6"/> Matches Logged</div>
          <div className="stat-value">{host.hoursLogged} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>Matches</span></div>
        </div>
      </div>
    </div>
  );
}

function HostsTab() {
  const { hosts, fetchHosts, removeHost, inviteCode } = useAgencyStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);

  useEffect(() => {
    // Polling is now handled globally in App
  }, []);

  if (selectedHost) {
    return <HostDetailsView host={selectedHost} onBack={() => setSelectedHost(null)} />;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
        <h2>Manage Hosts</h2>
        <button className="invite-btn" onClick={() => setShowInviteModal(true)}>
          <UserPlus size={18} /> Invite Host
        </button>
      </div>
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Host Name</th>
              <th>Status</th>
              <th>Earnings</th>
              <th>Matches</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hosts.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', color:'var(--text-muted)'}}>No hosts found in this agency.</td></tr>
            ) : hosts.map((host) => (
              <tr key={host.id}>
                <td className="host-name">{host.name}</td>
                <td>
                  <span className={`status-badge status-${host.status.replace(' ', '')}`}>
                    <span className="status-indicator"></span>{host.status}
                  </span>
                </td>
                <td className="coins">{host.earnings.toLocaleString()}</td>
                <td><Activity size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> {host.matches}</td>
                <td>{host.joinedDate}</td>
                <td>
                  <div style={{display:'flex', gap:'0.5rem'}}>
                    <button className="action-btn btn-view" onClick={() => setSelectedHost(host)}>
                      <Eye size={16} /> View
                    </button>
                    <button className="action-btn btn-danger" onClick={() => {
                        if(window.confirm('Are you sure you want to remove this host?')) removeHost(host.id);
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <h3>Invite New Host</h3>
            <p style={{color: '#a1a1aa', margin: '1rem 0'}}>
              Share this code with new hosts so they can link their account to your agency.
            </p>
            <div style={{
              background: '#09090b',
              border: '1px solid #27272a',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              letterSpacing: '2px',
              margin: '1.5rem 0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{color: '#a855f7'}}>{inviteCode}</span>
            </div>
            
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <button className="invite-btn" onClick={handleCopyCode} style={{width: '100%', justifyContent: 'center'}}>
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)} style={{width: '100%'}}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WalletTab() {
  const { payouts, requestWithdrawal, totalEarnings, fetchPayouts } = useAgencyStore();
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleWithdraw = (e) => {
    e.preventDefault();
    if(withdrawAmount > 0) {
      requestWithdrawal(withdrawAmount);
      setWithdrawAmount('');
      alert('Withdrawal request submitted successfully!');
    }
  };

  return (
    <div className="wallet-tab">
      <div className="split-grid">
        <section className="stat-card" style={{gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(107, 70, 193, 0.2), transparent)'}}>
           <div className="stat-title">Available Agency Balance (Mocked)</div>
           <div className="stat-value" style={{fontSize: '2.5rem'}}>{(totalEarnings * 0.2).toLocaleString()} <span style={{fontSize:'1.2rem', color:'#FCD34D'}}>Coins</span></div>
           <form className="withdraw-form" onSubmit={handleWithdraw}>
             <input type="number" placeholder="Amount to withdraw" value={withdrawAmount} onChange={(e)=>setWithdrawAmount(e.target.value)} required min="100"/>
             <button type="submit" className="invite-btn"><ArrowUpRight size={18}/> Request Withdrawal</button>
           </form>
        </section>

        <section className="table-container" style={{gridColumn: '1 / -1'}}>
          <h3>Payout Requests</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Admin Note</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', color:'var(--text-muted)'}}>No payout requests found.</td></tr>
              ) : payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.id.substring(0,8)}</td>
                  <td className="coins">{p.amount.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge status-${p.status}`}>
                      <span className="status-indicator"></span>{p.status}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.adminNote || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function SupportTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch this from the API and use a store
    // For now we mock it to show the UI
    setTimeout(() => {
      setTickets([
        { id: '1', subject: 'مشكلة في سحب الرصيد', status: 'Open', updatedAt: new Date().toISOString(), user: 'Ahmed' },
        { id: '2', subject: 'كيف أضيف وكالة؟', status: 'Closed', updatedAt: new Date().toISOString(), user: 'Sara' }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <section className="table-container">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem', alignItems:'center'}}>
        <h2>Support Tickets</h2>
        <button className="invite-btn">
           View All
        </button>
      </div>
      {loading ? <p style={{textAlign:'center'}}>Loading tickets...</p> : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Last Update</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', color:'var(--text-muted)'}}>No support tickets found.</td></tr>
            ) : tickets.map((t) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td>{t.user}</td>
                <td>{t.subject}</td>
                <td>
                  <span className={`status-badge status-${t.status === 'Open' ? 'Active' : 'Offline'}`}>
                    <span className="status-indicator"></span>{t.status === 'Open' ? 'مفتوح' : 'مغلق'}
                  </span>
                </td>
                <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                <td>
                  <button className="action-btn btn-view" onClick={() => alert('View ticket ' + t.id)}>
                    <Eye size={16} /> Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SettingsTab() {
  const { agencyName, managerName, sendAnnouncement, announcements, inviteCode } = useAgencyStore();
  const [msg, setMsg] = useState('');

  const handleAnnounce = (e) => {
    e.preventDefault();
    if(msg) {
      sendAnnouncement(msg);
      setMsg('');
      alert('Announcement sent to all hosts!');
    }
  }

  return (
    <div className="split-grid">
      <section className="settings-card">
        <h3>Agency Profile</h3>
        <div className="settings-form" style={{marginTop:'1.5rem'}}>
          <div className="form-group">
            <label>Agency Name</label>
            <input type="text" value={agencyName} disabled />
          </div>
          <div className="form-group">
            <label>Manager Name</label>
            <input type="text" value={managerName} disabled />
          </div>
          <div className="form-group">
            <label>Unique Invite Code</label>
            <input type="text" value={inviteCode} disabled style={{color:'var(--primary)', fontWeight:'bold', letterSpacing:'1px'}}/>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <h3><Bell size={18} style={{display:'inline', verticalAlign:'middle', marginRight:'8px'}}/> Send Announcement</h3>
        <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem'}}>Send a push notification to all your hosts instantly.</p>
        <form onSubmit={handleAnnounce} className="settings-form">
          <textarea placeholder="Type your message here..." value={msg} onChange={e=>setMsg(e.target.value)} rows={4}></textarea>
          <button type="submit" className="invite-btn" style={{marginTop:'1rem', background:'#3B82F6'}}>Broadcast Message</button>
        </form>
        
        {announcements.length > 0 && (
          <div className="announcement-history">
            <h4>Recent Announcements</h4>
            <ul>
              {announcements.map(a => (
                <li key={a.id}>
                  <small>{a.date}</small>
                  <p>{a.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function App() {
  const { token, agencyName, managerName, logout, startPolling, stopPolling } = useAgencyStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (token) {
      startPolling();
    }
    return () => stopPolling();
  }, [token, startPolling, stopPolling]);

  if (!token) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'hosts': return <HostsTab />;
      case 'wallet': return <WalletTab />;
      case 'support': return <SupportTab />;
      case 'settings': return <SettingsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>Qablny <span style={{color: 'var(--primary)'}}>Agencies</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'hosts' ? 'active' : ''}`} onClick={() => setActiveTab('hosts')}>
            <Users size={20} /> My Hosts
          </button>
          <button className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
            <Wallet size={20} /> Wallet & Earnings
          </button>
          <button className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
            <Headphones size={20} /> Support Center
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Settings
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="manager-info">
            <div className="manager-avatar">{managerName.charAt(0).toUpperCase()}</div>
            <div>
              <div className="manager-name">{managerName}</div>
              <div className="manager-role">Agency Manager</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>{agencyName}</h1>
            <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{activeTab} Overview</p>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
