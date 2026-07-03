import React from 'react';
import { useAgencyStore } from './store/useAgencyStore';
import { Users, Coins, Activity, UserPlus, Clock } from 'lucide-react';
import './index.css'; // ensure global styles

function App() {
  const { agencyName, managerName, hosts, getStats, addHost } = useAgencyStore();
  const { activeHosts, totalHosts, totalEarnings, agencyCut } = getStats();

  const handleInvite = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    alert(`Invite code generated: ${code}\nSend this to your new host!`);
    // Simulate someone joining after 2 seconds
    setTimeout(() => {
      addHost(`New Host ${code}`);
    }, 2000);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1>{agencyName}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {managerName}</p>
        </div>
        <button className="invite-btn" onClick={handleInvite}>
          <UserPlus size={18} />
          Invite Host
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title"><Activity size={16} color="var(--primary)"/> Active Hosts</div>
          <div className="stat-value">{activeHosts} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/ {totalHosts}</span></div>
        </div>
        
        <div className="stat-card">
          <div className="stat-title"><Coins size={16} color="#FCD34D"/> Total Hosts Earnings (Today)</div>
          <div className="stat-value">{totalEarnings.toLocaleString()} <span style={{fontSize:'1rem', color:'#FCD34D'}}>Coins</span></div>
        </div>

        <div className="stat-card">
          <div className="stat-title"><Coins size={16} color="#10B981"/> Agency Cut (20%)</div>
          <div className="stat-value" style={{color: '#10B981'}}>{agencyCut.toLocaleString()} <span style={{fontSize:'1rem'}}>Coins</span></div>
        </div>
      </section>

      <section className="table-container">
        <div className="table-header">
          <div className="table-title">Your Hosts</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Host Name</th>
              <th>Status</th>
              <th>Earnings (Today)</th>
              <th>Hours Logged</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((host) => (
              <tr key={host.id}>
                <td className="host-name">{host.name}</td>
                <td>
                  <span className={`status-badge status-${host.status.replace(' ', '')}`}>
                    <span className="status-indicator"></span>
                    {host.status}
                  </span>
                </td>
                <td className="coins">{host.earnings.toLocaleString()}</td>
                <td><Clock size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> {host.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
