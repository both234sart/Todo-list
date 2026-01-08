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
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-cat-cream">
              <div className="animate-bounce text-4xl">🐾</div>
          </div>
      );
  }

  if (!session || !user) {
    return <Login onLogin={() => {}} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
