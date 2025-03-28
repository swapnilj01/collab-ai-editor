import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  VStack,
  Textarea,
  Heading,
  Badge,
  useToast,
  Input,
  Text,
} from "@chakra-ui/react";
import MonacoEditor from "@monaco-editor/react";
import { useParams } from "react-router-dom";
import Navbar from "../components/ui/Navbar";
import API from "../api";
import { getUsername } from "../auth";
import * as monaco from "monaco-editor";

export default function Editor() {
  const { sessionId } = useParams();

  const [name, setName] = useState(getUsername());
  const [isNameSet, setIsNameSet] = useState(!!getUsername());

  const [code, setCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [collaborators, setCollaborators] = useState({});
  const socket = useRef(null);
  const toast = useToast();
  const textAreaRef = useRef();
  const decorationsRef = useRef({});
  const userColors = [
    "rgba(255, 99, 132, 0.5)",
    "rgba(54, 162, 235, 0.5)",
    "rgba(255, 206, 86, 0.5)",
    "rgba(75, 192, 192, 0.5)",
    "rgba(153, 102, 255, 0.5)",
  ];

  useEffect(() => {
    if (!isNameSet) return;
  
    const interval = setInterval(() => {
      fetchSuggestions();
    }, 10000);
  
    return () => clearInterval(interval);
  }, [isNameSet, code]);

  
  useEffect(() => {
    if (!editorRef.current) return;

    const markers = suggestions.map((s) => ({
      startLineNumber: s.line + 1,
      endLineNumber: s.line + 1,
      startColumn: 1,
      endColumn: 100,
      message: s.text,
      severity: s.type === "error" ? 8 : s.type === "warning" ? 4 : 2,
    }));

    monaco.editor.setModelMarkers(
      editorRef.current.getModel(),
      "owner",
      markers
    );
  }, [suggestions]);

  useEffect(() => {
    if (isNameSet) {
      fetchSession();
      openSocket();
    }

    return () => {
      if (socket.current) socket.current.close();
    };
  }, [isNameSet]);

  const fetchSession = async () => {
    try {
      const res = await API.get(`/sessions/${sessionId}`);
      setCode(res.data.code || "");
    } catch {
      toast({
        title: "Failed to load session code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const editorRef = useRef(null);

  const openSocket = () => {
    socket.current = new WebSocket(
      `ws://localhost:8000/ws/${sessionId}?name=${name}`
    );

    socket.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
    
      if (!editorRef.current) return;
      const currentEditor = editorRef.current;
    
      if (msg.type === "collaborators" && msg.collaborators) {
        // Clear existing decorations
        Object.keys(decorationsRef.current).forEach((userId) => {
          currentEditor.deltaDecorations(
            decorationsRef.current[userId] || [],
            []
          );
        });
    
        const newDecorations = {};
    
        // Apply new decorations from all collaborators
        Object.entries(msg.collaborators).forEach(([userId, user], index) => {
          if (user.name === name) return;
    
          const userColor = userColors[index % userColors.length];
          const decorations = [];
    
          if (user.cursor?.line && user.cursor?.column) {
            const labelClass = generateCursorLabel(user.name, userColor);
            decorations.push({
              range: new monaco.Range(
                user.cursor.line,
                user.cursor.column,
                user.cursor.line,
                user.cursor.column
              ),
              options: {
                className: "remote-cursor",
                afterContentClassName: labelClass,
              },
            });
          }
    
          if (user.selection) {
            decorations.push({
              range: new monaco.Range(
                user.selection.startLine,
                user.selection.startColumn,
                user.selection.endLine,
                user.selection.endColumn
              ),
              options: {
                className: "remote-selection",
                inlineClassName: "remote-selection-inline",
                isWholeLine: false,
              },
            });
          }
    
          const prevDecorations = decorationsRef.current[userId] || [];
          newDecorations[userId] = currentEditor.deltaDecorations(
            prevDecorations,
            decorations
          );
        });
    
        decorationsRef.current = newDecorations;
        setCollaborators(msg.collaborators);
      }
    
      if (msg.type === "code" && msg.code !== undefined) {
        setCode(msg.code);
      }
    };
    
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "code",
          code: newCode,
          cursor: e.target.selectionStart,
          selection: {
            start: e.target.selectionStart,
            end: e.target.selectionEnd,
          },
        })
      );
    }
  };

  const generateCursorLabel = (name, color) => {
    const labelId = `label-${name.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(labelId)) {
      const style = document.createElement("style");
      style.id = labelId;
      style.innerHTML = `
        .${labelId}::after {
          content: "${name}";
          position: absolute;
          top: -1.2em;
          left: 0;
          background: ${color};
          color: white;
          padding: 2px 6px;
          font-size: 12px;
          border-radius: 4px;
          white-space: nowrap;
        }
      `;
      document.head.appendChild(style);
    }
    return labelId;
  };
  

  const fetchSuggestions = async () => {
    try {
      const res = await API.post("/suggest", {
        session_id: sessionId,
        code,
      });
      setSuggestions(res.data.suggestions);
    } catch {
      toast({
        title: "Failed to fetch suggestions",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  if (!isNameSet) {
    return (
      <Box maxW="md" mx="auto" mt="100px">
        <VStack spacing={4}>
          <Heading>Join as a Collaborator</Heading>
          <Input
            placeholder="Enter your name"
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            isDisabled={!name}
            colorScheme="blue"
            onClick={() => setIsNameSet(true)}
          >
            Join Session
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <>
      {getUsername() && <Navbar showSave={true} sessionId={sessionId} />}
      <Box p={6}>
        <VStack spacing={4} align="stretch">
          <Heading size="lg">Tiger Code Editor</Heading>
          <MonacoEditor
            height="500px"
            defaultLanguage="python"
            value={code}
            onChange={(value) => {
              setCode(value);
            
              if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(
                  JSON.stringify({
                    type: "code",
                    code: value,
                  })
                );
              }
            }}            
            onMount={(editor) => {
              editorRef.current = editor;
            
              editor.onDidChangeCursorSelection(() => {
                if (socket.current?.readyState === WebSocket.OPEN) {
                  const selection = editor.getSelection();
                  const position = editor.getPosition();
            
                  socket.current.send(
                    JSON.stringify({
                      type: "cursor_update",
                      cursor: {
                        line: position?.lineNumber,
                        column: position?.column,
                      },
                      selection: {
                        startLine: selection?.startLineNumber,
                        startColumn: selection?.startColumn,
                        endLine: selection?.endLineNumber,
                        endColumn: selection?.endColumn,
                      },
                    })
                  );
                }
              });
            }}
            
          />
          <Box>
            {suggestions.map((s, i) => (
              <Badge
                key={i}
                colorScheme={
                  s.type === "error"
                    ? "red"
                    : s.type === "warning"
                    ? "yellow"
                    : "blue"
                }
                mr={2}
                mb={2}
              >
                Line {s.line + 1}: {s.text}
              </Badge>
            ))}
          </Box>
          <Box>
            <Heading size="sm">Collaborators</Heading>
            {Object.entries(collaborators).map(([id, user]) => (
              <Text key={id}>
                🧑 {user.name} — Cursor: {user.cursor?.line}:
                {user.cursor?.column} | Selection: {user.selection?.startLine}:
                {user.selection?.startColumn} – {user.selection?.endLine}:
                {user.selection?.endColumn}
              </Text>
            ))}
          </Box>
        </VStack>
      </Box>
    </>
  );
}
