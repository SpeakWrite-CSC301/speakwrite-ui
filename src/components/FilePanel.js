"use client";
import AddFileButton from "@/components/AddFileButton";
import DeleteFileButton from "@/components/DeleteFileButton";
import RenameFileButton from "@/components/RenameFileButton";
import { useState, useEffect } from "react";
import { fetchSessions } from "@/lib/api";

export default function FilePanel({ onClose, setCurrentFileID, currentFileID, triggerAfterUpdate, setTriggerAfterUpdate, token }) {
  const [files, setFiles] = useState([]);

  // checks for the file actively being renamed, on which we display as a text area rather than the file name on the panel
  const [fileBeingRenamed, setFileBeingRenamed] = useState();


  useEffect(() => {
    const fetchSessionNames = async () => {
      try {
        const fetchedSessions = await fetchSessions(token);
        if (Array.isArray(fetchedSessions)) {
          const topMostSession = fetchedSessions[0];
          if (topMostSession) {
            setCurrentFileID(topMostSession.session_id); // set the current file to the topmost session (newest)
          } else {
            setCurrentFileID(-1); // set to -1, from null, to establish existence which is important in TextBlock.js
          }
          setFiles(fetchedSessions.map(session => ({"session_name": session.session_name, "session_id": session.session_id})));
        }
      } catch (error) {
        console.error("Error fetching files: ", error);
      }
    };
    if (token) fetchSessionNames();
  }, [triggerAfterUpdate, token]) // only on mount or initial session creation or after renaming


  return (
    <div
      id="file_panel"
      className="w-64 h-[95vh] bg-gray-200 dark:bg-gray-800 p-5 border-r mr-2 rounded-lg border-gray-300 dark:border-gray-600 shadow-md font-sw flex flex-col"
    >
      <div className="flex">
        <h2 className="text-xl text-black dark:text-white font-bold mb-4 flex-grow">Files</h2>
        <button onClick={onClose} className="mb-4">
          <img src="open_close.png" alt="Close" width="20" height="20" />
        </button>
      </div>
      <ul className="space-y-2 overflow-y-auto">
        {files.map((file) => (
          <li
            key={file.session_id}
            className={`group text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-2 text-lg rounded-md cursor-pointer flex justify-between items-center ${file.session_id == currentFileID ? "dark:bg-gray-600 bg-gray-300" : ""}`}
            onClick={() => {setCurrentFileID(file.session_id)}}
          >
            {file.session_id != fileBeingRenamed && file.session_name}
            <div className="inline-flex">
              <RenameFileButton className="hidden group-hover:flex" fileID={file.session_id} setTriggerAfterUpdate={setTriggerAfterUpdate} setFileBeingRenamed={setFileBeingRenamed} token={token}/>
              <DeleteFileButton className="hidden group-hover:flex" fileID={file.session_id} setTriggerAfterUpdate={setTriggerAfterUpdate} setFileBeingRenamed={setFileBeingRenamed} token={token}/>
            </div>
          </li>
        ))}
      </ul>
      <AddFileButton files={files} setFiles={setFiles} setTriggerAfterUpdate={setTriggerAfterUpdate} token={token} />
    </div>
  );
}
