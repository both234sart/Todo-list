import React, { useState } from 'react';
import { Cat, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void; // Kept for prop compatibility, but unused internally now
}

const Login: React.FC<LoginProps> = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // If you want to redirect back to the app after login
                redirectTo: window.location.origin, 
            },
        });
        if (error) throw error;
    } catch (error) {
        console.error("Error logging in:", error);
        alert("Failed to start login process. Please try again.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cat-cream px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-[1.01] duration-300">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-cat-orange/20 p-4 rounded-full">
              <Cat size={64} className="text-cat-orange-dark" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-cat-brown mb-2">WhiskerList</h1>
          <p className="text-cat-gray mb-8">
            Stay paw-sitive and get things done!
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 bg-white group disabled:opacity-70 disabled:cursor-not-allowed"
          >
             {loading ? (
                <Loader2 className="animate-spin text-gray-500" size={20} />
             ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
             )}
            <span className="text-gray-700 font-medium group-hover:text-gray-900">
                {loading ? 'Connecting...' : 'Continue with Google'}
            </span>
          </button>
          
          <p className="mt-6 text-xs text-gray-400">
            By continuing, you agree to our Terms of Service (and to give treats to all cats).
          </p>
        </div>
        <div className="bg-cat-orange/10 p-4 text-center">
          <p className="text-cat-brown text-sm font-medium">✨ Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
