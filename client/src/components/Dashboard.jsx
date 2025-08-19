import React, { useState, useEffect } from "react";
import PlaylistGenerator from "../pages/PlaylistGenerator";

function Dashboard({ user, accessToken }) {
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, songsLoaded: 0 });

  useEffect(() => {
    fetchLikedSongs();
  }, []);

  const fetchLikedSongs = async () => {
    try {
      setLoading(true);
      setLoadingProgress({ current: 0, total: 0, songsLoaded: 0 });
      
      // First, get the total count
      const initialResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const initialData = await initialResponse.json();
      const totalCount = initialData.total;
      
      console.log(`Found ${totalCount} liked songs. Fetching with batched parallel requests...`);
      
      // Calculate how many requests we need (50 is max per request)
      const limit = 50;
      const totalRequests = Math.ceil(totalCount / limit);
      setLoadingProgress({ current: 0, total: totalRequests, songsLoaded: 0 });
      
      let allSongs = [];
      let completedRequests = 0;
      const batchSize = 5; // Process 5 requests at a time to avoid rate limits
      
      // Process requests in batches
      for (let batchStart = 0; batchStart < totalRequests; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalRequests);
        const batchPromises = [];
        
        // Create batch of requests
        for (let i = batchStart; i < batchEnd; i++) {
          const offset = i * limit;
          const requestPromise = fetchWithRetry(
            `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            },
            3 // retry up to 3 times
          ).then(data => {
            completedRequests++;
            setLoadingProgress(prev => ({ 
              ...prev, 
              current: completedRequests
            }));
            return data;
          });
          
          batchPromises.push(requestPromise);
        }
        
        // Wait for current batch to complete
        const batchResponses = await Promise.all(batchPromises);
        
        // Process batch results - filter out failed requests
        batchResponses.forEach((data, index) => {
          if (data && data.items) {
            const songs = data.items.map(item => ({
              id: item.track.id,
              name: item.track.name,
              artist: item.track.artists[0].name,
              album: item.track.album.name,
              added_at: item.added_at,
              genres: item.track.artists[0].genres || [],
              audio_features: null
            }));
            allSongs = [...allSongs, ...songs];
          } else {
            console.warn(`Request failed for batch item ${index}, no data received`);
          }
        });
        
        // Update song count after processing batch
        setLoadingProgress(prev => ({ 
          ...prev, 
          songsLoaded: allSongs.length
        }));
        
        // Small delay between batches to be nice to Spotify's API
        if (batchEnd < totalRequests) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Successfully loaded ${allSongs.length} songs out of ${totalCount} expected`);
      
      if (allSongs.length < totalCount) {
        console.warn(`Missing ${totalCount - allSongs.length} songs. This might be due to failed requests or rate limiting.`);
        console.log('Attempting to fetch missing songs with sequential method...');
        
        // Try to fetch the missing songs one more time
        try {
          const missingCount = totalCount - allSongs.length;
          const startOffset = allSongs.length;
          
          console.log(`Attempting to fetch ${missingCount} missing songs starting from offset ${startOffset}`);
          
          const limit = 50;
          const additionalRequests = Math.ceil(missingCount / limit);
          
          for (let i = 0; i < additionalRequests; i++) {
            const offset = startOffset + (i * limit);
            try {
              const response = await fetchWithRetry(
                `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                },
                5 // More retries for missing songs
              );
              
              if (response && response.items && response.items.length > 0) {
                const songs = response.items.map(item => ({
                  id: item.track.id,
                  name: item.track.name,
                  artist: item.track.artists[0].name,
                  album: item.track.album.name,
                  added_at: item.added_at,
                  genres: item.track.artists[0].genres || [],
                  audio_features: null
                }));
                
                allSongs = [...allSongs, ...songs];
                console.log(`Fetched ${songs.length} additional songs at offset ${offset}. Total now: ${allSongs.length}`);
                
                // Update progress
                setLoadingProgress(prev => ({ 
                  ...prev, 
                  songsLoaded: allSongs.length
                }));
              } else {
                console.log(`No more songs found at offset ${offset}`);
                break;
              }
              
              // Delay between requests
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
              console.error(`Failed to fetch missing songs at offset ${offset}:`, error);
            }
          }
        } catch (error) {
          console.error('Error during missing songs recovery:', error);
        }
      }
      
      setLikedSongs(allSongs);
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      // Fallback to sequential loading if parallel fails
      await fetchLikedSongsSequential();
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch missing songs
  const fetchMissingSongs = async (startOffset, count) => {
    try {
      const limit = 50;
      const requests = Math.ceil(count / limit);
      
      for (let i = 0; i < requests; i++) {
        const offset = startOffset + (i * limit);
        const response = await fetchWithRetry(
          `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          },
          3
        );
        
        if (response && response.items) {
          const songs = response.items.map(item => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            album: item.track.album.name,
            added_at: item.added_at,
            genres: item.track.artists[0].genres || [],
            audio_features: null
          }));
          
          setLikedSongs(prev => [...prev, ...songs]);
          console.log(`Fetched ${songs.length} missing songs at offset ${offset}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error fetching missing songs:', error);
    }
  };

  // Retry function for failed requests
  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
          console.log(`Rate limited, waiting ${retryAfter}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Request failed (attempt ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  };

  // Fallback sequential method
  const fetchLikedSongsSequential = async () => {
    console.log('Falling back to sequential loading...');
    let allSongs = [];
    let url = 'https://api.spotify.com/v1/me/tracks?limit=50';
    let requestCount = 0;
    
    // First get total to set progress correctly
    const initialResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const initialData = await initialResponse.json();
    const totalRequests = Math.ceil(initialData.total / 50);
    setLoadingProgress({ current: 0, total: totalRequests, songsLoaded: 0 });
    
    while (url) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await response.json();
        
        if (data.items) {
          const songs = data.items.map(item => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            album: item.track.album.name,
            added_at: item.added_at,
            genres: item.track.artists[0].genres || [],
            audio_features: null
          }));
          
          allSongs = [...allSongs, ...songs];
        }
        
        requestCount++;
        const currentSongCount = allSongs.length;
        setLoadingProgress({ 
          current: requestCount, 
          total: totalRequests,
          songsLoaded: currentSongCount
        });
        url = data.next;
        
        // Small delay to avoid rate limiting
        if (url) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error('Sequential fetch error:', error);
        break;
      }
    }
    
    setLikedSongs(allSongs);
  };

  if (loading) {
    const progressPercentage = loadingProgress.total > 0 
      ? Math.round((loadingProgress.current / loadingProgress.total) * 100) 
      : 0;
      
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading your music library...</h3>
            
            {loadingProgress.total > 0 && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {loadingProgress.current} of {loadingProgress.total} requests completed ({progressPercentage}%)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Using batched requests with retry logic for reliability ⚡
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Songs found: {loadingProgress.songsLoaded}
                </p>
              </>
            )}
            
            {loadingProgress.total === 0 && (
              <p className="text-gray-600">Calculating total songs...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Playify</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.display_name || 'User'}!</span>
              <img 
                src={user?.images?.[0]?.url || '/default-avatar.png'} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PlaylistGenerator 
              likedSongs={likedSongs} 
              accessToken={accessToken}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Your Library</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Liked Songs:</span>
                <span className="font-medium">{likedSongs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unique Artists:</span>
                <span className="font-medium">
                  {new Set(likedSongs.map(song => song.artist)).size}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-2">Recent Additions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {likedSongs.slice(0, 10).map((song, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium text-gray-900 truncate">{song.name}</div>
                    <div className="text-gray-500 truncate">{song.artist}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
