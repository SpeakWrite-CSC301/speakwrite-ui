"use client";
import Form from "next/form";
import { useState, useRef, useEffect } from "react";
import StartButton from "./StartButton";
import { createChat, createUser, createSession, fetchSession, renameSession, fetchSessions } from "@/lib/api";
import MediaParser from "./UploadMedia";
import { setUpRecognition } from "@/lib/SpeechRecognition";
import DownloadPdf from "./DownloadPdf";
import { jsPDF } from "jspdf";
import { flushSync } from "react-dom";
import DarkModeToggle from "./DarkModeToggle";
import TranslateButton from "./TranslateButton"; // ✅ Import TranslateButton


export default function TextBlock({ setFileTitle, currentFileID, triggerAfterUpdate, setTriggerAfterUpdate, token }) {
  const [title, setTitle] = useState(""); // State for the page title
  const [content, setContent] = useState(""); // State for the content
  const contentRef = useRef(null);
  // const [c_uid, setCuid] = useState(null);
  const [c_sid, setCsid] = useState(-1);
  const [isConnected, setIsConnected] = useState(false); // New state to track WebSocket connection status
  const wsRef = useRef(null);
  // const [transcription, setTranscription] = useState("");
  // const [pdfContent, setPdfContent] = useState("");

  const pdfContentRef = useRef("");
  const transcriptionRef = useRef("");
  // setFileTitle("{}");



  // useEffect(() => {
  //   async function intializeUser() {
  //     if (c_uid === null) {
  //       const user = await createUser("John Doe", "a@b.c", "12345678");

  //       if (user && user.id) {
  //         setCuid(user.id);
  //         console.log(user);
  //       }
  //     }
  //   }
  //   intializeUser();
  // }, [c_uid]);

  useEffect(() => {
    async function intializeSess() {
      // check if a session already exists, making it unnecessary to create a new one
      const existingSessions = await fetchSessions(token);

      if (existingSessions && existingSessions.length === 0) {
      const session = await createSession({
        session_name: "New file",
        context: {}
      }, token);

      if (session && session.session_id) {
        setCsid(session.session_id);
        console.log(session);
      }
      setTriggerAfterUpdate((update) => (!update));
    }
    else {
      setCsid(existingSessions[0].session_id);
    }
  }

    if  (currentFileID == -1 && token) { // currentFileID is assigned -1 (an invalid session ID) if there are no sessions being returned on the fetch
      intializeSess();
    } else {
      setCsid(currentFileID);
    }
  }, [token]);

  // Auto-resize the textarea as you type
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = "auto";
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    async function fetchSpecificSession(session_id) {
      const fetched_session = await fetchSession(session_id, token);

      if (!fetched_session.context) {
        contentRef.current.value = "";
        return;
      }

      setContent(fetched_session.context.message);
      setTitle(fetched_session.session_name);
      contentRef.current.value = fetched_session.context.message || ""; // if still undefined then it'll just be an empty string
    }

    if (currentFileID != null && currentFileID > -1) { // another way of saying currentFileID exists AND is not -1
      fetchSpecificSession(currentFileID);
      setCsid(currentFileID);
    }
  }, [currentFileID, triggerAfterUpdate, token]);

  // Handle WebSocket connection
  const handleStartButtonClick = (tone) => {
    const recognition = setUpRecognition(
      wsRef,
      c_sid,
      pdfContentRef,
      setIsConnected,
      transcriptionRef,
      token
    );
    if (isConnected) {
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      recognition.stop(); // Stop speech recognition when disconnecting
      setIsConnected(false);
    } else {
      // Open WebSocket connection
      if (c_sid != null) {
        const ws = new WebSocket("ws://localhost:8000/ws");

        ws.onopen = () => {
          console.log("Connected to WebSocket server.");
          setTimeout(() => setIsConnected(true), 0);
          wsRef.current = ws; // Store WebSocket reference

          // Start speech recognition when the connected
          recognition.start();
        };

        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "content") {
              setContent(message.data);
              console.log(message.data, c_sid);
              console.log(token)
              createChat(c_sid, "speakwrite", message.data, token);
              pdfContentRef.current = "";
              transcriptionRef.current = "";
              console.log(
                pdfContentRef.current +
                  " inside onmessage " +
                  transcriptionRef.current
              );
            } else if (message.type === "title") {
              setTitle(message.data);
              setFileTitle(message.data);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed.");
          setTimeout(() => setIsConnected(false), 0);
          recognition.stop(); // Stop speech recognition when connection closes
        };

        wsRef.current = ws; // Store WebSocket reference
      }
    }
  };

  const handleDownloadPdf = () => {
    // Download the content as a PDF file
    const pdf = new jsPDF();
    pdf.text(title, 20, 20);
    pdf.text(content, 20, 30);
    console.log(pdf);
    pdf.save("notes.pdf");
  };

  const titleSubmit = async (e) => {
    e.preventDefault(); //prevent page reload
    await renameSession(currentFileID, title.length == 0 ? "Unnamed file" : title, token);
    setTriggerAfterUpdate((update) => !update);
  };

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 text-black dark:text-white p-10 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 font-sw flex flex-col">
      <Form onSubmit={(e) => titleSubmit(e)}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New file"
          className="w-full text-4xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 mb-4 outline-none bg-transparent flex-none"
        />
      </Form>

      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            createChat(c_sid, "speakwrite", e.target.value, token);
          }
        }}
        placeholder="Start writing your notes here..."
        className="w-full text-xl p-2 outline-none resize-none bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-300 leading-relaxed flex-grow basis-0"
        rows={5}
      />

      <div className="flex justify-center basis-0 w-full mt-4">
        <StartButton
          clickHandler={handleStartButtonClick}
          isConnected={isConnected}
        />
      </div>

      <div className="absolute bottom-0 right-0">
        <MediaParser
          transcriptionRef={transcriptionRef}
          pdfContentRef={pdfContentRef}
        />
      </div>

      <div className="absolute bottom-0 left-0 p-2 flex space-x-2">
        <DownloadPdf
          handle={handleDownloadPdf}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded dark:bg-gray-600 dark:hover:bg-gray-800 dark:text-white"
        />
        <DarkModeToggle className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded-md" />
      </div>
      <div className="absolute top-0 right-0 m-4">
      <TranslateButton content={content} setContent={setContent} />
      </div>
    </div>
  );
}
