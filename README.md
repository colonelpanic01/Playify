# Playify

I'd been meaning to index my liked songs in spotify based on different filters and generate playlists from them so here's a thing that does that. Log in with Spotify, filter by mood, genre, season, date range, and more, then preview and add generated playlists directly to your Spotify account.

## Features

- **Spotify Authentication** - OAuth login with Spotify
- **Smart Filtering** - Filter by:
  - Mood/Vibe (e.g., chill, energetic, sad)
  - Genre/Artist (e.g., rock, pop, indie)
  - Month (January - December)
  - Season (Spring, Summer, Fall, Winter)
  - Date Range (custom from/to dates)
  - Song Limit (control playlist size)
- **Live Preview** - See your filtered playlist before creating
- **Spotify Integration** - Add generated playlists directly to your Spotify account

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **API**: Spotify Web API
- **Authentication**: Spotify OAuth 2.0

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Spotify Developer Account** with app credentials
3. **npm** or **yarn**

## Setup

1. **Clone and navigate to the project:**
   ```bash
   cd playify
   ```

2. **Install dependencies:**
   ```bash
   # Install backend dependencies
   cd server && npm install

   # Install frontend dependencies
   cd ../client && npm install
   ```

3. **Environment Setup:**
   - Your Spotify credentials are already configured in `.env`
   - Make sure your Spotify app redirect URI is set to: `http://127.0.0.1:5001/callback`

4. **Start the servers:**
   ```bash
   # Start backend (from project root)
   cd server && npm start

   # Start frontend (from project root, in new terminal)
   cd client && npm run dev
   ```

5. **Open the app:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5001

## How to Use

1. **Login** - Click "Login with Spotify" and authorize the app
2. **Wait for Loading** - The app will fetch all your liked songs
3. **Set Filters** - Choose your desired filters:
   - Enter mood keywords
   - Select genre or artist names
   - Pick specific months or seasons
   - Set date ranges for when songs were added
   - Limit the number of songs
4. **Generate Preview** - Click "Generate Preview" to see filtered results
5. **Create Playlist** - Enter a playlist name and click "Add to Spotify"

## 🔧 Development

### Available Scripts

**Backend (server/):**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Frontend (client/):**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Project Structure
```
playify/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── ...
├── server/          # Express backend
└── .env            # Environment variables
```

## Features Coming Soon

- **Audio Analysis** - Filter by tempo, energy, danceability
- **Collaborative Playlists** - Share and collaborate on playlists
- **Export Options** - Export to other music platforms
- **Smart Recommendations** - AI-powered playlist suggestions
- **Advanced Filters** - Decade, popularity, explicit content filters
- **Preview songs and lyrics**