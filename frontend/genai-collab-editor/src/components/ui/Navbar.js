import React from "react";
import {
  Box,
  Flex,
  Spacer,
  Button,
  Heading,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { removeToken } from "../../auth";

const Navbar = ({ showSave = false, sessionId }) => {
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    toast({
      title: "Logged out",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
    navigate("/");
  };

  const handleSaveSession = async () => {
    try {
      await API.post(`/save_session`, { session_id: sessionId });
      toast({
        title: "Session saved",
        description: "Code persisted to MongoDB.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Save failed",
        status: "error",
        description: "Could not save session",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box bg="gray.100" px={6} py={3} boxShadow="md">
      <Flex align="center">
        <Heading size="md">GenAI Collab Editor</Heading>
        <Spacer />
        <HStack spacing={4}>
          <Button colorScheme="blue" variant="outline" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
          {showSave && (
            <Button colorScheme="green" onClick={handleSaveSession}>
              Save Session
            </Button>
          )}
          <Button colorScheme="red" onClick={handleLogout}>
            Logout
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar;