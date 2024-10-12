import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function BrowserHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    ipcRenderer.invoke('get-chrome-history', 50)
      .then(result => {
        setHistory(result);
      })
      .catch(err => {
        console.error('Failed to fetch browser history:', err);
        setError('Failed to fetch browser history. Make sure Chrome is closed and try again.');
      });
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h2>Chrome Browser History</h2>
      <ul>
        {history.map((item, index) => (
          <li key={index}>
            <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title || item.url}</a>
            <span> - Last visited: {new Date(item.lastVisit).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BrowserHistory;