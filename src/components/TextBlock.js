"use client";
import Form from "next/form";
import { useState, useRef, useEffect, use } from "react";
import StartButton from "./StartButton";
import { createChat, update_chat_history, createSession, fetchSession, renameSession, fetchSessions } from "@/lib/api";
import MediaParser from "./UploadMedia";
import { setUpRecognition } from "@/lib/SpeechRecognition";
import DownloadPdf from "./DownloadPdf";
import { jsPDF } from "jspdf";
import { flushSync } from "react-dom";
import DarkModeToggle from "./DarkModeToggle";
import TranslateButton from "./TranslateButton"; // ✅ Import TranslateButton
import { PanelLeft } from "lucide-react"


export default function TextBlock({ onClose, setFileTitle, currentFileID, triggerAfterUpdate, setTriggerAfterUpdate, token }) {
  const [title, setTitle] = useState(""); // State for the page title
  const [content, setContent] = useState(""); // State for the content
  const contentRef = useRef(null);
  // const [c_uid, setCuid] = useState(null);
  const [c_sid, setCsid] = useState(-1);
  const [isConnected, setIsConnected] = useState(false); // New state to track WebSocket connection status
  const wsRef = useRef(null);
  const [MediaCounter, setMediaCounter] = useState(0);
  // const [transcription, setTranscription] = useState("");
  // const [pdfContent, setPdfContent] = useState("");
  let recognition = null; // Declare recognition outside of the component to avoid re-initialization

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
          session_name: "Untitled", // default chat name is Untitled
          context: { message: "" }
        }, token);

        if (session && session.session_id) {
          setCsid(session.session_id);
          setTitle(session.session_name);
          console.log(session);
        }
        setTriggerAfterUpdate((update) => (!update));
      }
      else {
        setCsid(existingSessions[0].session_id);
        setTitle(existingSessions[0].session_name);
      }
    }

    if (currentFileID == -1 && token) {
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

  // Add effect to update document title when content changes
  useEffect(() => {
    try {
      if (content && content.trim() !== "") {
        document.title = title || "Untitled";
      } else {
        document.title = "SpeakWrite";
      }
    } catch (error) {
      // fallback to tab name "SpeakWrite" (default tab name upon loading the page)
      console.error("Error updating document title:", error);
      document.title = "SpeakWrite";
    }
  }, [content, title]);

  useEffect(() => {
    async function fetchSpecificSession(session_id) {
      const fetched_session = await fetchSession(session_id, token);

      if (!fetched_session.context) {
        contentRef.current.value = "";
        return;
      }

      setContent(fetched_session.context.message);
      setTitle(fetched_session.session_name);
      update_chat_history("");
      setMediaCounter(0);
      setIsConnected(false);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (recognition) {
        recognition.stop(); // Stop speech recognition when disconnecting
      }
      setIsConnected(false);
      pdfContentRef.current = "";
      transcriptionRef.current = "";
      contentRef.current.value = fetched_session.context.message || ""; // if still undefined then it'll just be an empty string
    }

    if (currentFileID != null && currentFileID > -1) { // another way of saying currentFileID exists AND is not -1
      fetchSpecificSession(currentFileID);
      setCsid(currentFileID);
    }
  }, [currentFileID, triggerAfterUpdate, token]);

  // Handle WebSocket connection
  const handleStartButtonClick = (tone) => {
    recognition = setUpRecognition(
      wsRef,
      c_sid,
      pdfContentRef,
      setIsConnected,
      transcriptionRef,
      token,
      tone
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
              setMediaCounter(0);
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
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - 2 * margin; // Width available for text
  
    // Set font size (optional)
    pdf.setFontSize(12);
  
    // Add the title
    pdf.text(title, margin, margin); // Title at top-left with margin
  
    // Split and wrap the content text
    const contentLines = pdf.splitTextToSize(content, maxLineWidth);
    let yPosition = margin + 10; // Start below the title
  
    // Loop through lines and add them to the PDF
    contentLines.forEach((line) => {
      if (yPosition + 10 > pageHeight - margin) {
        // Add a new page if the current line would exceed the page height
        pdf.addPage();
        yPosition = margin; // Reset y-position to top of new page
      }
      pdf.text(line, margin, yPosition);
      yPosition += 10; // Move down for the next line (adjust line spacing as needed)
    });
      // pdf.text(title, 20, 20);
      // pdf.text(content, 20, 30);
      console.log(pdf);
      pdf.save("notes.pdf");
    console.log(pdf);
    pdf.save("notes.pdf");
  };

  const titleSubmit = async (e) => {
    e.preventDefault(); //prevent page reload
    try {
      // when edited, fallback to "Untitled"
      const newTitle = title.trim() || "Untitled";
      await renameSession(currentFileID, newTitle, token);
      setTitle(newTitle);
      setFileTitle(newTitle);
      setTriggerAfterUpdate((update) => !update);
    } catch (error) {
      console.error("Error renaming session:", error);
      setTitle("Untitled");
      setFileTitle("Untitled");
    }
  };

  return (
    <div className="relative w-full bg-white dark:bg-gray-900 text-black dark:text-white py-[6vh] px-[6vw] shadow-md border border-gray-200 dark:border-gray-600 font-sw flex flex-col">
      <div className="absolute top-4 left-4 z-50">
        <button className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 ease-in-out" onClick={onClose}>
          <PanelLeft />
        </button>
      </div>
      <Form onSubmit={(e) => titleSubmit(e)}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 mb-4 outline-none bg-transparent flex-none"
        />
      </Form>

      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            update_chat_history(e.target.value);
            createChat(c_sid, "speakwrite", e.target.value, token);
          }
        }}
        placeholder="START
Say 'hi my name is ...' and then 'change that to ...'
END"
        className="w-full text-xl py-2 px-5 outline-none resize-none bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-300 leading-relaxed flex-grow basis-0"
        rows={5}
      />

      <div className="flex justify-center basis-0 w-full mt-4">
        <StartButton
          clickHandler={handleStartButtonClick}
          isConnected={isConnected}
        />
      </div>

      <div className="absolute flex items-center top-0 right-0 m-4 space-x-3">
        <TranslateButton content={content} setContent={setContent} />
        <DownloadPdf handle={handleDownloadPdf}/>
        <MediaParser
          transcriptionRef={transcriptionRef}
          pdfContentRef={pdfContentRef}
          setMediaCounter={setMediaCounter}
        />
        <p>{MediaCounter}</p>
      </div>
    </div>
  );
}