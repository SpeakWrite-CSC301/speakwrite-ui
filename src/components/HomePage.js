"use client";

import TextBlock from "@/components/TextBlock";
import FilePanel from "@/components/FilePanel";
import { useState, useEffect } from "react";
import { loginUser, signupUser } from "@/lib/api.js";
import Image from "next/image";
import { setLogoutHandler } from "@/lib/api.js";

export default function HomePage() {
  const [isOpen, setIsOpen] = useState(true);
  const [fileTitle, setFileTitle] = useState("Session 1");
  const [currentFileID, setCurrentFileID] = useState(-1); // current file ID
  const [triggerAfterUpdate, setTriggerAfterUpdate] = useState(false);
  const [token, setToken] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem("token") || null : null;
  });

  // Authentication state and form states
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return (
      typeof window !== "undefined" && localStorage.getItem("token") ? true : false
    );
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Signup form state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");

  function togglePanel() {
    setIsOpen(!isOpen);
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoginError(""); // Clear previous error
      const data = await loginUser(loginEmail, loginPassword);
      // On successful login, store the token and update state
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", loginEmail); // Store email in local storage
      setIsLoggedIn(true);
      setAuthModalOpen(false);
      // Clear form state
      setLoginEmail("");
      setLoginPassword("");
      setLoginError("");
      setToken(data.access_token);
    } catch (error) {
      setLoginError(error.message);
      console.error(error);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setSignupError(""); // Clear previous error
      const data = await signupUser(signupUsername, signupEmail, signupPassword);
      // Optionally, log the user in immediately after sign-up
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", signupEmail); // Store email in local storage
      setIsLoggedIn(true);
      setAuthModalOpen(false);
      // Clear signup form state
      setSignupUsername("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupError("");
      setToken(data.access_token);
    } catch (error) {
      setSignupError(error.message);
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email"); // Remove email from local storage
    setIsLoggedIn(false);
    setCurrentFileID(null);
    setTriggerAfterUpdate(false);
    setToken(null);
    setIsLoggedIn(false);
  };


  useEffect(() => {
    setLogoutHandler(handleLogout);
  }, []);

  // Add new useEffect for managing document title
  useEffect(() => {
    // Set initial title
    document.title = "SpeakWrite";
  }, []);

  // Add effect to update title when file title changes
  useEffect(() => {
    if (fileTitle && fileTitle !== "Session 1") {
      document.title = fileTitle;
    } else {
      document.title = "SpeakWrite";
    }
  }, [fileTitle]);

  return (
    <div className="relative w-full min-h-screen bg-background dark:bg-gray-900 text-black dark:text-white flex justify-center">
      {/* Top Right Authentication Buttons */}
<div className="z-50">
  {!isLoggedIn && (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Image
        src="/logo.png"
        width={250}
        height={250}
        className="mb-4"
        alt="SpeakWrite"
        />
      <div className="flex space-x-2">
        <button
          onClick={() => {
            setAuthMode("login");
            setAuthModalOpen(true);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Log In
        </button>
        <button
          onClick={() => {
            setAuthMode("signup");
            setAuthModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  )}
</div>

      {/* Auth Modal Pop-up */}
      {authModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-80">
            {authMode === "login" ? (
              <>
                <h2 className="text-xl mb-4">Log In</h2>
                <form onSubmit={handleLogin} className="flex flex-col">
                  <label htmlFor="loginEmail" className="mb-2">
                    Email:
                  </label>
                  <input
                    id="loginEmail"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mb-4 p-2 border rounded dark:text-black"
                    required
                  />
                  <label htmlFor="loginPassword" className="mb-2">
                    Password:
                  </label>
                  <input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mb-4 p-2 border rounded dark:text-black"
                    required
                  />
                  {loginError && <p className="text-red-500 mb-2">{loginError}</p>}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {setAuthModalOpen(false)
                        setLoginError("");
                      }}
                      className="mr-2 px-4 py-2 bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      Log In
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl mb-4">Sign Up</h2>
                <form onSubmit={handleSignup} className="flex flex-col">
                  <label htmlFor="signupUsername" className="mb-2">
                    Username:
                  </label>
                  <input
                    id="signupUsername"
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="mb-4 p-2 border rounded dark:text-black"
                    required
                  />
                  <label htmlFor="signupEmail" className="mb-2">
                    Email:
                  </label>
                  <input
                    id="signupEmail"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="mb-4 p-2 border rounded dark:text-black"
                    required
                  />
                  <label htmlFor="signupPassword" className="mb-2">
                    Password:
                  </label>
                  <input
                    id="signupPassword"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="mb-4 p-2 border rounded dark:text-black"
                    required
                  />
                  {signupError && <p className="text-red-500 mb-2">{signupError}</p>}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {setAuthModalOpen(false);
                        setSignupError("");}
                      }
                      className="mr-2 px-4 py-2 bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      Sign Up
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Left Panel Toggle Button */}
      {isLoggedIn && (
      <>
      {isOpen && (
        <FilePanel
          fileTitle={fileTitle}
          setCurrentFileID={setCurrentFileID}
          currentFileID={currentFileID}
          triggerAfterUpdate={triggerAfterUpdate}
          setTriggerAfterUpdate={setTriggerAfterUpdate}
          token={token} // Pass the user ID to the FilePanel
          handleLogout={handleLogout}
          isLoggedIn={isLoggedIn}
          email={localStorage.getItem("email")}
        />
      )}
      <TextBlock
        onClose={togglePanel}
        setFileTitle={setFileTitle}
        currentFileID={currentFileID}
        triggerAfterUpdate={triggerAfterUpdate}
        setTriggerAfterUpdate={setTriggerAfterUpdate}
        token={token} // Pass the user ID
      />
      </>
      )}
    </div>
  );
}
