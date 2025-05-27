"use client";
import { useState } from "react";
import { signIn, signUp, logOut } from "./firebase/auth.js";
import { useEffect } from "react";
import { auth, provider } from "./firebase/config.js";
import { signInWithPopup, signOut, User } from "firebase/auth";


/*Function to login using Email and Password*/ 
export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      await signUp(email, password);
      alert("User created!");
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signIn(email, password);
      alert("Logged in!");
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <input
        className="border p-2 rounded"
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 rounded"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignup} className="bg-blue-500 text-white px-4 py-2 rounded">
        Sign Up
      </button>
      <button onClick={handleLogin} className="bg-green-500 text-white px-4 py-2 rounded">
        Log In
      </button>
    </div>
  );
}


/*Function to login using Gmail*/ 
export function GoogleAuthPage() {
  const [user, setUser] = useState<User | null>(null);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <img src={user.photoURL ?? ""} alt="profile" width={100} />
          <p>{user.email}</p>
          <button onClick={logout} className="bg-blue-500 text-white px-4 py-2 rounded">Logout</button>
        </div>
      ) : (
        <button onClick={login} className="bg-blue-500 text-white px-4 py-2 rounded">Login with Google</button>
      )}
    </div>
  );
}