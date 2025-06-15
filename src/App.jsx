import React, { useState, useEffect } from 'react';
import Gridworm from './Gridworm';



function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Load initial theme from localStorage or default to light mode
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="App relative min-h-screen">

      {/* Main app */}
      <Gridworm darkMode={darkMode} setDarkMode={setDarkMode} 
 />
    </div>
  );
}

export default App;
