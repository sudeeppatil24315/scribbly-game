import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Profile</h1>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-3xl">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.username}</h2>
                <p className="text-gray-400">Level {user.level}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Total XP</p>
                <p className="text-2xl font-bold">{user.xp}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Level</p>
                <p className="text-2xl font-bold">{user.level}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">Statistics</h3>
              <p className="text-gray-400">Statistics coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
