import React, { useState, useEffect } from "react";
import { Box, Input, Button, VStack, Heading, useToast, List, ListItem, HStack, Text } from "@chakra-ui/react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/ui/Navbar";

export default function Dashboard() {
  const [sessionName, setSessionName] = useState("");
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  const createSession = async () => {
    try {
      const res = await API.post("/create_session", { name: sessionName });
      navigate(`/editor/${res.data.session_id}`);
    } catch {
      toast({ title: "Error creating session", status: "error" });
    }
  };

  const loadSessions = async () => {
    try {
      const res = await API.get("/sessions");
      setSessions(res.data);
    } catch {
      toast({ title: "Failed to load sessions", status: "error" });
    }
  };

  const joinSession = async (id) => {
    navigate(`/editor/${id}`);
  };

  const deleteSession = async (id) => {
    try {
      await API.delete(`/sessions/${id}`);
      toast({
        title: "Session deleted",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      setSessions(sessions.filter((s) => s._id !== id));
    } catch {
      toast({
        title: "Failed to delete session",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };
  

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <>
      <Navbar />
      <Box maxW="xl" mx="auto" mt="100px">
        <VStack spacing={4} mb={10}>
          <Heading>Create a Coding Session</Heading>
          <Input
            placeholder="Session name"
            onChange={(e) => setSessionName(e.target.value)}
          />
          <Button colorScheme="purple" onClick={createSession}>
            Start Session
          </Button>
        </VStack>

        <Heading size="md" mb={4}>Your Sessions</Heading>
        <List spacing={3}>
          {sessions.map((session) => (
            <ListItem key={session._id}>
            <HStack justify="space-between">
              <Text>{session.name}</Text>
              <HStack>
                <Button colorScheme="teal" size="sm" onClick={() => joinSession(session._id)}>
                  Open
                </Button>
                <Button colorScheme="red" size="sm" variant="outline" onClick={() => deleteSession(session._id)}>
                  Delete
                </Button>
              </HStack>
            </HStack>
          </ListItem>
          ))}
        </List>
      </Box>
    </>
  );
}

