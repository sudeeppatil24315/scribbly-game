import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import socketClient from '../lib/socket';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, setRoom } = useGameStore();

  useEffect(() => {
    if (!code) {
      navigate('/');
      return;
    }

    // Connect socket
    const socket = socketClient.connect();

    // Join room
    socket.emit('room:join', { roomCode: code });

    // Listen for room events
    socket.on('room:joined', (data: any) => {
      setRoom(data.room);
    });

    socket.on('room:error', (error: any) => {
      console.error('Room error:', error);
      navigate('/');
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:error');
    };
  }, [code, navigate, setRoom]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Joining room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Room: {room.code}</h1>
          <p className="text-gray-400">
            {room.state === 'lobby' ? 'Waiting in lobby...' : 'Game in progress'}
          </p>
        </div>

        {room.state === 'lobby' ? (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Players</h2>
            <div className="space-y-2">
              {room.players.map((player) => (
                <div
                  key={player.socketId}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      {player.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{player.username}</p>
                      {player.isHost && (
                        <span className="text-xs text-yellow-400">Host</span>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {player.isConnected ? '🟢' : '🔴'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="text-center text-gray-400">Game UI coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
