"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email"); // Récupérer l'email
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas");
      return;
    }
    const res = await fetch("/api/auth/user/update-with-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.status === 200) {
      alert("Le mot de passe a bien été réinitialisé");
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Réinitialisation du mot de passe</h1>
      {email ? (
        <p className="mt-2">
          Nous allons réinitialiser le mot de passe pour : <strong>{email}</strong>
        </p>
      ) : (
        <p className="mt-2 text-red-500">Aucun email fourni</p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          className="border p-2 rounded"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">
          Réinitialiser
        </button>
      </form>
    </div>
  );
}
