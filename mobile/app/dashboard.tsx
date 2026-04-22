import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { getToken, removeToken, decodeToken, JwtClaims } from "../lib/auth";

export default function DashboardScreen() {
  const router = useRouter();
  const [claims, setClaims] = useState<JwtClaims | null>(null);

  useEffect(() => {
    getToken().then((token) => {
      if (!token) {
        router.replace("/login");
        return;
      }
      setClaims(decodeToken(token));
    });
  }, []);

  async function handleLogout() {
    await removeToken();
    router.replace("/login");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>WashBookPro — stub ekran</Text>

      {claims && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>JWT Claims</Text>
          <ClaimRow label="User ID" value={claims.sub} />
          <ClaimRow label="Email" value={claims.email} />
          <ClaimRow label="Tenant ID" value={claims.tenant_id} />
          <ClaimRow label="Role" value={claims.role} />
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ClaimRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.claimRow}>
      <Text style={styles.claimLabel}>{label}</Text>
      <Text style={styles.claimValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  claimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  claimLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  claimValue: {
    fontSize: 14,
    color: "#6b7280",
    maxWidth: "60%",
    textAlign: "right",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});