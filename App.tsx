import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Cat Lover',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || 'https://picsum.photos/100/100'
        });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Cat Lover',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || 'https://picsum.photos/100/100'
        });
      } else {
        // Only clear user if we are not explicitly in guest mode
        // Note: checking user state here is tricky due to closure, 
        // so we rely on the fact that 'Guest' doesn't use Supabase session.
        // If a real sign-out happens, we want to clear the user.
        // For simplicity, we'll handle explicit Guest logout separately.
        // If this event fires with null session, it means no Supabase user.
        // If we are currently guest, this event typically won't fire unless initial load or explicit signOut.
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGuestLogin = () => {
      setUser({
          id: 'guest',
          name: 'Guest Cat',
          email: 'guest@whiskerlist.app',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' // Cute consistent avatar
      });
  };

  const handleLogout = async () => {
    if (user?.id === 'guest') {
        setUser(null);
    } else {
        await supabase.auth.signOut();
        setUser(null); // Ensure UI clears
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-cat-cream">
              <div className="animate-bounce text-4xl">🐾</div>
          </div>
      );
  }

  if (!user) {
    return <Login onLogin={() => {}} onGuestLogin={handleGuestLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;