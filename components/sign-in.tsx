"use client"
import { handleSignInWithGoogle } from "@/actions";

export default function SignInWithGoogle() {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSignInWithGoogle();
      }}
    >
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer">
        Sign in with Google
      </button>
    </form>
  );
}