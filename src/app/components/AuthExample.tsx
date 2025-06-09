"use client";
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for confirmation!');
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      setSignedIn(true);
      alert('Signed in!');
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (!error) {
      setSignedIn(true);
      alert('Signed in!');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSignedIn(false);
    alert('Signed out!');
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white bg-opacity-10 rounded-lg shadow-lg w-80 max-w-full">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
      />
      <div className="flex gap-2 w-full">
        <button
          onClick={signUp}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Sign Up
        </button>
        <button
          onClick={signIn}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Sign In
        </button>
      </div>
      <button
        onClick={signInWithGoogle}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors mt-2"
      >
        Sign in with Google
      </button>
      {signedIn && (
        <button
          onClick={signOut}
          className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded transition-colors mt-2"
        >
          Sign Out
        </button>
      )}
    </div>
  );
}
