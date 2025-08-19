import React, { useState } from "react";

function PlaylistGenerator({ likedSongs, accessToken }) {
  const [filters, setFilters] = useState({
    mood: "",
    genre: "",
    month: "",
    season: "",
    songLimit: "",
    dateFrom: "",
    dateTo: "",
    playlistName: "",
    generateType: "single" // "single", "monthly", "seasonal"
  });
  const [preview, setPreview] = useState([]);
  const [monthlyPreviews, setMonthlyPreviews] = useState([]);
  const [seasonalPreviews, setSeasonalPreviews] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [expandedPreview, setExpandedPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    
    if (filters.generateType === "monthly") {
      generateMonthlyPreviews();
    } else if (filters.generateType === "seasonal") {
      generateSeasonalPreviews();
    } else {
      generateSinglePreview();
    }
    
    setIsGenerating(false);
  };

  const generateSinglePreview = () => {
    // Original single playlist logic
    let filtered = [...likedSongs];
    
    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(song => {
        const addedDate = new Date(song.added_at);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date('1900-01-01');
        const toDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
        return addedDate >= fromDate && addedDate <= toDate;
      });
    }
    
    // Genre filter (basic text matching)
    if (filters.genre) {
      filtered = filtered.filter(song => 
        song.genre?.toLowerCase().includes(filters.genre.toLowerCase()) ||
        song.artist.toLowerCase().includes(filters.genre.toLowerCase())
      );
    }
    
    // Month filter
    if (filters.month) {
      const monthNum = parseInt(filters.month);
      filtered = filtered.filter(song => {
        const addedDate = new Date(song.added_at);
        return addedDate.getMonth() + 1 === monthNum;
      });
    }
    
    // Season filter
    if (filters.season) {
      filtered = filtered.filter(song => {
        const addedDate = new Date(song.added_at);
        const month = addedDate.getMonth() + 1;
        const seasons = {
          spring: [3, 4, 5],
          summer: [6, 7, 8],
          fall: [9, 10, 11],
          winter: [12, 1, 2]
        };
        return seasons[filters.season.toLowerCase()]?.includes(month);
      });
    }
    
    // Shuffle and limit
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const limited = filters.songLimit ? 
      shuffled.slice(0, parseInt(filters.songLimit)) : 
      shuffled;
    
    setPreview(limited);
    setMonthlyPreviews([]);
    setSeasonalPreviews([]);
    setSelectedSongs(new Set());
  };

  const generateMonthlyPreviews = () => {
    // Get date range
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Math.min(...likedSongs.map(s => new Date(s.added_at))));
    const toDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
    
    // Generate all months in the range
    const monthlyGroups = {};
    
    likedSongs.forEach(song => {
      const addedDate = new Date(song.added_at);
      
      // Check if song is in date range
      if (addedDate >= fromDate && addedDate <= toDate) {
        // Apply other filters
        let includesSong = true;
        
        if (filters.genre) {
          includesSong = song.genre?.toLowerCase().includes(filters.genre.toLowerCase()) ||
                        song.artist.toLowerCase().includes(filters.genre.toLowerCase());
        }
        
        if (includesSong) {
          const monthYear = `${addedDate.toLocaleString('default', { month: 'short' })} ${addedDate.getFullYear()}`;
          const monthKey = `${addedDate.getFullYear()}-${String(addedDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = {
              title: monthYear,
              songs: [],
              date: new Date(addedDate.getFullYear(), addedDate.getMonth(), 1)
            };
          }
          
          monthlyGroups[monthKey].songs.push(song);
        }
      }
    });
    
    // Convert to array and sort by date
    const monthlyPlaylists = Object.values(monthlyGroups)
      .sort((a, b) => a.date - b.date)
      .map(group => {
        // Apply song limit if specified
        let songs = group.songs;
        if (filters.songLimit) {
          songs = songs.sort(() => 0.5 - Math.random()).slice(0, parseInt(filters.songLimit));
        }
        
        return {
          title: group.title,
          songs: songs,
          count: songs.length
        };
      })
      .filter(playlist => playlist.count > 0); // Only include months with songs
    
    setMonthlyPreviews(monthlyPlaylists);
    setPreview([]);
    setSeasonalPreviews([]);
    setSelectedSongs(new Set());
  };

  const generateSeasonalPreviews = () => {
    // Get date range
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Math.min(...likedSongs.map(s => new Date(s.added_at))));
    const toDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
    
    // Define seasons
    const seasons = {
      'Spring': { months: [3, 4, 5], songs: [] },
      'Summer': { months: [6, 7, 8], songs: [] },
      'Fall': { months: [9, 10, 11], songs: [] },
      'Winter': { months: [12, 1, 2], songs: [] }
    };
    
    // Group songs by season
    likedSongs.forEach(song => {
      const addedDate = new Date(song.added_at);
      
      // Check if song is in date range
      if (addedDate >= fromDate && addedDate <= toDate) {
        // Apply other filters
        let includesSong = true;
        
        if (filters.genre) {
          includesSong = song.genre?.toLowerCase().includes(filters.genre.toLowerCase()) ||
                        song.artist.toLowerCase().includes(filters.genre.toLowerCase());
        }
        
        if (includesSong) {
          const month = addedDate.getMonth() + 1;
          
          // Find which season this month belongs to
          for (const [seasonName, seasonData] of Object.entries(seasons)) {
            if (seasonData.months.includes(month)) {
              seasons[seasonName].songs.push(song);
              break;
            }
          }
        }
      }
    });
    
    // Convert to array and apply song limit
    const seasonalPlaylists = Object.entries(seasons)
      .map(([seasonName, seasonData]) => {
        let songs = seasonData.songs;
        if (filters.songLimit) {
          songs = songs.sort(() => 0.5 - Math.random()).slice(0, parseInt(filters.songLimit));
        }
        
        return {
          title: seasonName,
          songs: songs,
          count: songs.length
        };
      })
      .filter(playlist => playlist.count > 0); // Only include seasons with songs
    
    setSeasonalPreviews(seasonalPlaylists);
    setPreview([]);
    setMonthlyPreviews([]);
    setSelectedSongs(new Set());
  };

  const toggleSongSelection = (songId, playlistIndex = null, isMonthly = false, isSeasonal = false) => {
    const newSelected = new Set(selectedSongs);
    const key = playlistIndex !== null ? `${playlistIndex}-${songId}` : songId;
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedSongs(newSelected);
  };

  const removeSelectedSongs = (playlistIndex = null, isMonthly = false, isSeasonal = false) => {
    if (playlistIndex !== null) {
      // Remove from specific monthly/seasonal playlist
      if (isMonthly) {
        const updatedPreviews = [...monthlyPreviews];
        updatedPreviews[playlistIndex].songs = updatedPreviews[playlistIndex].songs.filter(song => {
          const key = `${playlistIndex}-${song.id}`;
          return !selectedSongs.has(key);
        });
        updatedPreviews[playlistIndex].count = updatedPreviews[playlistIndex].songs.length;
        setMonthlyPreviews(updatedPreviews);
      } else if (isSeasonal) {
        const updatedPreviews = [...seasonalPreviews];
        updatedPreviews[playlistIndex].songs = updatedPreviews[playlistIndex].songs.filter(song => {
          const key = `${playlistIndex}-${song.id}`;
          return !selectedSongs.has(key);
        });
        updatedPreviews[playlistIndex].count = updatedPreviews[playlistIndex].songs.length;
        setSeasonalPreviews(updatedPreviews);
      }
    } else {
      // Remove from single playlist preview
      const updatedPreview = preview.filter(song => !selectedSongs.has(song.id));
      setPreview(updatedPreview);
    }
    
    setSelectedSongs(new Set());
  };

  const handleAddToSpotify = async () => {
    if (monthlyPreviews.length > 0) {
      await createMonthlyPlaylists();
    } else if (seasonalPreviews.length > 0) {
      await createSeasonalPlaylists();
    } else {
      await createSinglePlaylist();
    }
  };

  const createSinglePlaylist = async () => {
    if (!filters.playlistName.trim()) {
      alert('Please enter a playlist name');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Create playlist
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userResponse.json();
      
      const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: filters.playlistName,
          description: `Generated by Playify with filters: ${Object.entries(filters)
            .filter(([key, value]) => value && key !== 'playlistName' && key !== 'generateType')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}`,
          public: false
        })
      });
      
      const playlist = await playlistResponse.json();
      
      // Add tracks to playlist
      const trackUris = preview.map(song => `spotify:track:${song.id}`);
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: trackUris })
      });
      
      alert(`Playlist "${filters.playlistName}" created successfully!`);
      setFilters({ ...filters, playlistName: "" });
      setPreview([]);
      
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const createMonthlyPlaylists = async () => {
    setIsCreating(true);
    
    try {
      // Get user ID
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userResponse.json();
      
      let successCount = 0;
      let totalPlaylists = monthlyPreviews.length;
      
      // Create each monthly playlist
      for (const monthlyPlaylist of monthlyPreviews) {
        try {
          const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: monthlyPlaylist.title,
              description: `Generated by Playify - Songs liked in ${monthlyPlaylist.title}. Contains ${monthlyPlaylist.count} songs.`,
              public: false
            })
          });
          
          const playlist = await playlistResponse.json();
          
          // Add tracks to playlist (handle large playlists in batches)
          const trackUris = monthlyPlaylist.songs.map(song => `spotify:track:${song.id}`);
          const batchSize = 100;
          
          for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ uris: batch })
            });
            
            // Small delay between batches
            if (i + batchSize < trackUris.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          successCount++;
          console.log(`Created playlist: ${monthlyPlaylist.title} (${monthlyPlaylist.count} songs)`);
          
        } catch (error) {
          console.error(`Failed to create playlist for ${monthlyPlaylist.title}:`, error);
        }
        
        // Small delay between playlist creations
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      alert(`Successfully created ${successCount} out of ${totalPlaylists} monthly playlists!`);
      setMonthlyPreviews([]);
      
    } catch (error) {
      console.error('Error creating monthly playlists:', error);
      alert('Failed to create monthly playlists. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const createSeasonalPlaylists = async () => {
    setIsCreating(true);
    
    try {
      // Get user ID
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userResponse.json();
      
      let successCount = 0;
      let totalPlaylists = seasonalPreviews.length;
      
      // Create each seasonal playlist
      for (const seasonalPlaylist of seasonalPreviews) {
        try {
          const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: seasonalPlaylist.title,
              description: `Generated by Playify - ${seasonalPlaylist.title} songs from your liked music. Contains ${seasonalPlaylist.count} songs.`,
              public: false
            })
          });
          
          const playlist = await playlistResponse.json();
          
          // Add tracks to playlist (handle large playlists in batches)
          const trackUris = seasonalPlaylist.songs.map(song => `spotify:track:${song.id}`);
          const batchSize = 100;
          
          for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ uris: batch })
            });
            
            // Small delay between batches
            if (i + batchSize < trackUris.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          successCount++;
          console.log(`Created playlist: ${seasonalPlaylist.title} (${seasonalPlaylist.count} songs)`);
          
        } catch (error) {
          console.error(`Failed to create playlist for ${seasonalPlaylist.title}:`, error);
        }
        
        // Small delay between playlist creations
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      alert(`Successfully created ${successCount} out of ${totalPlaylists} seasonal playlists!`);
      setSeasonalPreviews([]);
      
    } catch (error) {
      console.error('Error creating seasonal playlists:', error);
      alert('Failed to create seasonal playlists. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Generate Playlist</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Generation Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="generateType"
                value="single"
                checked={filters.generateType === "single"}
                onChange={handleChange}
                className="mr-2"
              />
              Single Playlist
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="generateType"
                value="monthly"
                checked={filters.generateType === "monthly"}
                onChange={handleChange}
                className="mr-2"
              />
              Monthly Playlists (one for each month)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="generateType"
                value="seasonal"
                checked={filters.generateType === "seasonal"}
                onChange={handleChange}
                className="mr-2"
              />
              Seasonal Playlists (Spring, Summer, Fall, Winter)
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mood/Vibe</label>
          <input 
            name="mood" 
            placeholder="e.g., chill, energetic, sad" 
            value={filters.mood} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genre/Artist</label>
          <input 
            name="genre" 
            placeholder="e.g., rock, pop, indie" 
            value={filters.genre} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select 
            name="month" 
            value={filters.month} 
            onChange={handleChange} 
            disabled={filters.generateType === "monthly"}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">All months</option>
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          {filters.generateType === "monthly" && (
            <p className="text-xs text-gray-500 mt-1">Disabled - will generate for all months</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
          <select 
            name="season" 
            value={filters.season} 
            onChange={handleChange} 
            disabled={filters.generateType === "seasonal"}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">All seasons</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
          {filters.generateType === "seasonal" && (
            <p className="text-xs text-gray-500 mt-1">Disabled - will generate for all seasons</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Song Limit</label>
          <input 
            name="songLimit" 
            type="number" 
            placeholder="No limit" 
            value={filters.songLimit} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
          <input 
            name="dateFrom" 
            type="date" 
            value={filters.dateFrom} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
          <input 
            name="dateTo" 
            type="date" 
            value={filters.dateTo} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
          />
        </div>
      </div>
      
      <button 
        onClick={handleGenerate} 
        disabled={isGenerating}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium transition duration-200"
      >
        {isGenerating ? 'Generating...' : 
         filters.generateType === "monthly" ? 'Generate Monthly Previews' :
         filters.generateType === "seasonal" ? 'Generate Seasonal Previews' : 'Generate Preview'}
      </button>
      
      {/* Monthly Playlists Preview */}
      {monthlyPreviews.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Monthly Playlists Preview ({monthlyPreviews.length} playlists)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {monthlyPreviews.map((monthlyPlaylist, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-800 mb-2">{monthlyPlaylist.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{monthlyPlaylist.count} songs</p>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {monthlyPlaylist.songs.slice(0, 5).map((song, songIdx) => (
                    <div key={songIdx} className="text-gray-700 truncate">
                      {song.name} - {song.artist}
                    </div>
                  ))}
                  {monthlyPlaylist.songs.length > 5 && (
                    <div className="text-gray-500 italic">
                      ...and {monthlyPlaylist.songs.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-800 mb-2">📅 Monthly Playlist Creation</h4>
            <p className="text-sm text-blue-700 mb-2">
              This will create <strong>{monthlyPreviews.length} separate playlists</strong> in your Spotify account:
            </p>
            <ul className="text-sm text-blue-600 space-y-1">
              {monthlyPreviews.map((playlist, idx) => (
                <li key={idx}>• <strong>{playlist.title}</strong> ({playlist.count} songs)</li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={handleAddToSpotify}
            disabled={isCreating}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition duration-200"
          >
            {isCreating ? 'Creating Playlists...' : `Create ${monthlyPreviews.length} Monthly Playlists in Spotify`}
          </button>
        </div>
      )}
      
      {/* Seasonal Playlists Preview */}
      {seasonalPreviews.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Seasonal Playlists Preview ({seasonalPreviews.length} playlists)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seasonalPreviews.map((seasonalPlaylist, seasonIndex) => (
              <div key={seasonIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800">{seasonalPlaylist.title}</h4>
                  <span className="text-sm text-gray-500">{seasonalPlaylist.count} songs</span>
                </div>
                
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {seasonalPlaylist.songs.slice(0, 5).map((song, songIndex) => (
                    <div key={songIndex} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={!removedSongs.seasonal[seasonIndex]?.has(song.id)}
                          onChange={() => toggleSeasonalSongSelection(seasonIndex, song.id)}
                          className="w-3 h-3"
                        />
                        <span className="truncate max-w-[120px]" title={`${song.name} - ${song.artists.map(a => a.name).join(', ')}`}>
                          {song.name} - {song.artists.map(a => a.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {seasonalPlaylist.songs.length > 5 && (
                    <div className="text-xs text-gray-400">
                      ... and {seasonalPlaylist.songs.length - 5} more songs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={createSeasonalPlaylists} 
            disabled={isCreating}
            className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition duration-200"
          >
            {isCreating ? 'Creating Playlists...' : `Create ${seasonalPreviews.length} Seasonal Playlists in Spotify`}
          </button>
        </div>
      )}
      
      {/* Single Playlist Preview */}
      {preview.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Playlist Preview ({preview.length} songs)
            </h3>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Playlist Name</label>
            <input 
              name="playlistName" 
              placeholder="Enter playlist name" 
              value={filters.playlistName} 
              onChange={handleChange} 
              className="w-full max-w-md border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent" 
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {preview.map((song, idx) => (
              <div key={idx} className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <div className="font-medium text-gray-900">{song.name}</div>
                <div className="text-sm text-gray-600">{song.artist} • {song.album}</div>
                <div className="text-xs text-gray-400">
                  Added: {new Date(song.added_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleAddToSpotify}
            disabled={isCreating || !filters.playlistName.trim()}
            className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition duration-200"
          >
            {isCreating ? 'Creating...' : 'Add to Spotify'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PlaylistGenerator;
