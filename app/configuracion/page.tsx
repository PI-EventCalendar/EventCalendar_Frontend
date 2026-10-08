"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axios";
import Sidebar from "@/components/ui/Sidebar";

export default function SettingsPage() {
  const [value, setValue] = useState("6.00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/auth/profile/");
      setValue(String(data.daily_hour_limit ?? "6"));
    } catch {
      setError("No se pudo cargar tu capacidad diaria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 1 || hours > 16) {
      setError("La capacidad diaria debe estar entre 1 y 16 horas");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiClient.patch("/auth/profile/", { daily_hour_limit: hours });
      setMessage("Capacidad diaria actualizada.");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.daily_hour_limit?.[0] ??
          "No se pudo actualizar la capacidad diaria.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-gray-50">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="w-full space-y-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ajusta la capacidad diaria del organizador logístico.
          </p>
          <form
            onSubmit={save}
            className="mt-8 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <label
              htmlFor="daily-limit"
              className="block text-sm font-semibold text-gray-700"
            >
              Límite máximo de horas por día
            </label>
            <input
              id="daily-limit"
              type="number"
              min="1"
              max="16"
              step="0.5"
              value={value}
              disabled={loading || saving}
              onChange={(event) => setValue(event.target.value)}
              aria-describedby="daily-limit-help"
              className="h-11 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p id="daily-limit-help" className="text-xs text-gray-500">
              Ingresa un valor entre 1 y 16 horas. Predeterminado: 6 horas.
            </p>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-green-700" role="status">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar capacidad"}
            </button>
            {error && (
              <button
                type="button"
                onClick={() => void load()}
                className="ml-3 text-sm font-semibold text-indigo-700 underline"
              >
                Reintentar
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
