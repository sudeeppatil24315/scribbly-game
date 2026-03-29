import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import socketClient from '../lib/socket';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, guestUsername, setGuestUsername } = useAuthStore();
  const [username, setUsername] = useState(guestUsername || '');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!isAuthenticated && !username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!isAuthenticated) {
      setGuestUsername(username.trim());
    }

    // Connect socket and create room
    const socket = socketClient.connect();
    
    // Listen for room created event
    socket.once('room:created', (data: any) => {
      navigate(`/room/${data.code}`);
    });

    socket.once('error', (error: any) => {
      setError(error.message || 'Failed to create room');
    });

    // Emit create room event
    socket.emit('room:create', {});
  };

  const handleJoinRoom = () => {
    if (!isAuthenticated && !username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!isAuthenticated) {
      setGuestUsername(username.trim());
    }

    navigate(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-blue-500 mb-2">Scribbly</h1>
          <p className="text-gray-400">Draw, Guess, and Have Fun!</p>
        </div>

        <div className="card space-y-4">
          {!isAuthenticated && (
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="Enter your username"
                className="input-field"
                maxLength={20}
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            onClick={handleCreateRoom}
            className="btn-primary w-full"
          >
            Create Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter room code"
              className="input-field"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            className="btn-secondary w-full"
          >
            Join Room
          </button>
        </div>

        <div className="flex justify-center space-x-4 text-sm">
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-blue-400 hover:text-blue-300"
          >
            Leaderboard
          </button>
          <button
            onClick={() => navigate('/wordpacks')}
            className="text-blue-400 hover:text-blue-300"
          >
            Word Packs
          </button>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/profile')}
              className="text-blue-400 hover:text-blue-300"
            >
              Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
