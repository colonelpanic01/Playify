import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check URL params for tokens after Spotify redirect
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    
    if (token) {
      setAccessToken(token);
      // Clear URL params
      window.history.replaceState({}, document.title, "/");
      // Fetch user info
      fetchUserProfile(token);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  if (!accessToken) {
    return <Login />;
  }

  return <Dashboard user={user} accessToken={accessToken} />;
}

export default App;
