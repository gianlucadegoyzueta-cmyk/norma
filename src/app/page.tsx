import { redirect } from "next/navigation";

// La home reindirizza alla dashboard (che a sua volta manda al login se non autenticato).
export default function Home() {
  redirect("/dashboard");
}
