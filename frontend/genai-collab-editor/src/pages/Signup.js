import React, { useState } from "react";
import {
  Box, Input, Button, VStack, Heading, useToast,
} from "@chakra-ui/react";
import API from "../api";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({ username: "", password: "" });
  const navigate = useNavigate();
  const toast = useToast();

  const signup = async () => {
    try {
      await API.post("/signup", form);
      toast({ title: "Signup successful", status: "success" });
      navigate("/");
    } catch {
      toast({ title: "Signup failed", status: "error" });
    }
  };

  return (
    <Box maxW="md" mx="auto" mt="100px">
      <VStack spacing={4}>
        <Heading>Signup</Heading>
        <Input
          placeholder="Username"
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <Input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button colorScheme="teal" onClick={signup}>Signup</Button>
      </VStack>
    </Box>
  );
}
