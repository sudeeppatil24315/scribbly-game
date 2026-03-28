import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Profile from './pages/Profile';
import WordPacks from './pages/WordPacks';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Game />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wordpacks" element={<WordPacks />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  );
}

export default App;
