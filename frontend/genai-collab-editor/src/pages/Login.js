import React, { useState, useContext } from "react";
import {
  Box,
  Input,
  Button,
  VStack,
  Heading,
  useToast,
  Flex,
  Spacer,
  Text,
} from "@chakra-ui/react";
import API from "../api";
import { setToken } from "../auth";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const navigate = useNavigate();
  const { setUsername } = useContext(AuthContext);
  const toast = useToast();

  const login = async () => {
    try {
      const res = await API.post("/token", new URLSearchParams(form));
      setToken(res.data.access_token);
      setUsername(form.username);

      toast({
        title: "Login successful",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Incorrect username or password.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box maxW="md" mx="auto" mt="80px">
      {/* Navigation bar */}
      <Flex mb={6} justifyContent="flex-end">
        <Text fontSize="sm" mr={2}>
          Don’t have an account?
        </Text>
        <Button
          size="sm"
          colorScheme="teal"
          as={RouterLink}
          to="/signup"
          variant="outline"
        >
          Sign Up
        </Button>
      </Flex>

      {/* Login form */}
      <VStack spacing={4} p={6} boxShadow="lg" borderRadius="md">
        <Heading size="lg">Login</Heading>
        <Input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <Input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button
          colorScheme="blue"
          onClick={login}
          width="100%"
          isDisabled={!form.username || !form.password}
        >
          Login
        </Button>
      </VStack>
    </Box>
  );
}
