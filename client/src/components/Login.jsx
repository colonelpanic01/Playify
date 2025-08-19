import React from "react";

function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Playify</h1>
        <p className="mb-6 text-center text-gray-600">Generate custom playlists from your Spotify liked songs with powerful filters!</p>
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-700">Features:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Filter by mood, genre, season</li>
            <li>• Set date ranges and song limits</li>
            <li>• Preview before adding to Spotify</li>
            <li>• Monthly and seasonal playlists</li>
          </ul>
        </div>
        <a 
          href="/api/login" 
          className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition duration-200 shadow-md hover:shadow-lg"
        >
          Login with Spotify
        </a>
      </div>
    </div>
  );
}

export default Login;
