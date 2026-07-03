import React, { useState } from 'react';
import { useAgencyStore } from './store/useAgencyStore';
import { Users, Coins, Activity, UserPlus, Clock, LayoutDashboard, Settings, LogOut, Wallet, Target, Bell, Trash2, ArrowUpRight } from 'lucide-react';
import './index.css';

function DashboardTab({ hosts, activeHosts, totalHosts, totalEarnings, agencyCut }) {
  const { monthlyTarget, currentProgress } = useAgencyStore();
  const progressPercent = Math.min((currentProgress / monthlyTarget) * 100, 100);
  
  // Get top 3 hosts by earnings
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
          <div className="stat-title"><Coins size={16} color="#10B981"/> Agency Cut (20%)</div>
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
          <p className="target-subtext">{progressPercent.toFixed(1)}% Completed. Keep pushing to unlock the 5% agency bonus!</p>
        </section>

        <section className="leaderboard-card">
          <div className="card-header">
            <h3>🏆 Top Performing Hosts</h3>
          </div>
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
        </section>
      </div>
    </>
  );
}

function HostsTab({ hosts, addHost }) {
  const { removeHost } = useAgencyStore();

  const handleInvite = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    alert(`Invite code generated: ${code}\nSend this to your new host!`);
    setTimeout(() => addHost(`New Host ${code}`), 1000);
  };

  return (
    <>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
        <h2>Manage Hosts</h2>
        <button className="invite-btn" onClick={handleInvite}>
          <UserPlus size={18} /> Invite New Host
        </button>
      </div>
      <section className="table-container">
        <table>
          <thead>
            <tr>
              <th>Host Name</th>
              <th>Status</th>
              <th>Earnings</th>
              <th>Hours Logged</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((host) => (
              <tr key={host.id}>
                <td className="host-name">{host.name}</td>
                <td>
                  <span className={`status-badge status-${host.status.replace(' ', '')}`}>
                    <span className="status-indicator"></span>{host.status}
                  </span>
                </td>
                <td className="coins">{host.earnings.toLocaleString()}</td>
                <td><Clock size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> {host.hours}h</td>
                <td>{host.joined}</td>
                <td>
                  <button className="action-btn btn-danger" onClick={() => removeHost(host.id)}>
                    <Trash2 size={16} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function WalletTab() {
  const { transactions, requestWithdrawal, fixedSalary } = useAgencyStore();
  const [withdrawAmount, setWithdrawAmount] = useState('');

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
           <div className="stat-title">Available Agency Balance + Manager Salary</div>
           <div className="stat-value" style={{fontSize: '2.5rem'}}>{(12500 + fixedSalary).toLocaleString()} <span style={{fontSize:'1.2rem', color:'#FCD34D'}}>Coins</span></div>
           <form className="withdraw-form" onSubmit={handleWithdraw}>
             <input type="number" placeholder="Amount to withdraw" value={withdrawAmount} onChange={(e)=>setWithdrawAmount(e.target.value)} required min="100"/>
             <button type="submit" className="invite-btn"><ArrowUpRight size={18}/> Request Withdrawal</button>
           </form>
        </section>
      </div>

      <section className="table-container" style={{marginTop:'2rem'}}>
        <div className="table-header"><div className="table-title">Transaction History</div></div>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Host / Source</th>
              <th>Amount (Coins)</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={{color:'var(--text-muted)'}}>{t.date}</td>
                <td>{t.type}</td>
                <td>{t.host}</td>
                <td style={{color: t.amount > 0 ? '#10B981' : '#EF4444', fontWeight:'bold'}}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SettingsTab() {
  const { agencyName, managerName, updateSettings, sendAnnouncement, announcements } = useAgencyStore();
  const [name, setName] = useState(agencyName);
  const [manager, setManager] = useState(managerName);
  const [msg, setMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings(name, manager);
    alert('Settings saved!');
  };

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
        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label>Agency Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Manager Name</label>
            <input type="text" value={manager} onChange={e=>setManager(e.target.value)} />
          </div>
          <button type="submit" className="invite-btn" style={{marginTop:'1rem'}}>Save Changes</button>
        </form>
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
  const { agencyName, managerName, hosts, addHost } = useAgencyStore();
  
  const activeHosts = hosts.filter(h => h.status !== 'Offline').length;
  const totalHosts = hosts.length;
  const totalEarnings = hosts.reduce((acc, h) => acc + h.earnings, 0);
  const agencyCut = totalEarnings * 0.20;

  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardTab hosts={hosts} activeHosts={activeHosts} totalHosts={totalHosts} totalEarnings={totalEarnings} agencyCut={agencyCut}/>;
      case 'hosts': return <HostsTab hosts={hosts} addHost={addHost} />;
      case 'wallet': return <WalletTab />;
      case 'settings': return <SettingsTab />;
      default: return <DashboardTab hosts={hosts} activeHosts={activeHosts} totalHosts={totalHosts} totalEarnings={totalEarnings} agencyCut={agencyCut}/>;
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
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Settings
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="manager-info">
            <div className="manager-avatar">{managerName.charAt(0)}</div>
            <div>
              <div className="manager-name">{managerName}</div>
              <div className="manager-role">Agency Manager</div>
            </div>
          </div>
          <button className="logout-btn">
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
