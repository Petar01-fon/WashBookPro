import { useEffect } from "react";
import { useRouter } from "expo-router";
import { getToken } from "../lib/auth";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
  }, []);

  return null;
}