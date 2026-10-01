"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { RegisterPayload } from "../types";

type FormValues = RegisterPayload & { confirm_password: string; terms: boolean };
type Errors = Partial<Record<keyof FormValues | "form", string>>;

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  if (!values.first_name.trim()) errors.first_name = "El nombre es obligatorio.";
  if (!values.last_name.trim()) errors.last_name = "El apellido es obligatorio.";
  if (!values.username.trim()) errors.username = "El nombre de usuario es obligatorio.";
  if (!values.email.trim()) errors.email = "El correo electrónico es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Ingresa un correo electrónico válido.";
  if (!values.password) errors.password = "La contraseña es obligatoria.";
  else if (values.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres.";
  if (!values.confirm_password) errors.confirm_password = "Confirma tu contraseña.";
  else if (values.password !== values.confirm_password) errors.confirm_password = "Las contraseñas no coinciden.";
  if (!values.terms) errors.terms = "Debes aceptar los términos y condiciones para crear tu cuenta.";
  return errors;
}

function apiErrors(error: unknown): Errors {
  if (!axios.isAxiosError(error)) return { form: "No fue posible crear la cuenta. Inténtalo nuevamente." };
  const data = error.response?.data as Record<string, unknown> | undefined;
  const result: Errors = {};
  const username = data?.username;
  const email = data?.email;
  if (username) result.username = "Ese nombre de usuario ya está registrado. Elige otro.";
  if (email) result.email = "Ese correo electrónico ya está registrado. Utiliza otro correo.";
  if (Object.keys(result).length) return result;
  if (error.response?.status === 400) return { form: "Revisa los datos ingresados e inténtalo nuevamente." };
  if (error.response?.status === 500) return { form: "El servidor no está disponible. Inténtalo más tarde." };
  return { form: "No fue posible crear la cuenta. Inténtalo nuevamente." };
}

export function RegisterForm() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [values, setValues] = useState<FormValues>({ first_name: "", last_name: "", username: "", email: "", password: "", password_confirm: "", confirm_password: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value, ...(field === "confirm_password" && typeof value === "string" ? { password_confirm: value } : {}) }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsSubmitting(true);
    try {
      await registerAccount({ username: values.username.trim(), email: values.email.trim().toLowerCase(), first_name: values.first_name.trim(), last_name: values.last_name.trim(), password: values.password, password_confirm: values.password_confirm });
      setSuccess(true);
      setTimeout(() => router.replace("/hoy"), 900);
    } catch (error) {
      setErrors(apiErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const input = (field: keyof FormValues, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1">
      <label htmlFor={`register-${field}`} className="text-sm font-semibold text-slate-700">{label}</label>
      <input id={`register-${field}`} value={String(values[field] ?? "")} type={type} placeholder={placeholder} onChange={(event) => update(field, event.target.value)} onBlur={() => setErrors((current) => ({ ...current, ...validate(values) }))} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `register-${field}-error` : undefined} className={`h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${errors[field] ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"}`} />
      {errors[field] && <p id={`register-${field}-error`} className="text-xs text-red-600" role="alert">{errors[field]}</p>}
    </div>
  );

  return <main className="min-h-screen bg-[#f4f7fb] p-4 sm:p-8">
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
      <section className="p-6 sm:p-10 lg:p-14"><div className="mb-8"><p className="text-xl font-extrabold tracking-tight text-slate-900">EventCalendar</p><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">OPS & LOGISTICS</p></div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Crea tu cuenta</h1><p className="mt-2 text-sm text-slate-500">Organiza tus actividades y planes logísticos desde un solo lugar.</p>
        {success && <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700" role="status"><CheckCircle2 className="mr-2 inline h-4 w-4" />Cuenta creada. Redirigiendo...</p>}
        {errors.form && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">{input("first_name", "Nombre(s)", "text", "Juan")}{input("last_name", "Apellido(s)", "text", "Rojas")}</div>
          <div className="grid gap-4 sm:grid-cols-2">{input("username", "Nombre de usuario", "text", "tu_usuario")}{input("email", "Correo electrónico", "email", "correo@ejemplo.com")}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="relative">{input("password", "Contraseña", showPassword ? "text" : "password", "Mínimo 8 caracteres")}<button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-3 top-9 text-slate-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><div className="relative">{input("confirm_password", "Confirmar contraseña", showConfirmation ? "text" : "password", "Repite tu contraseña")}<button type="button" onClick={() => setShowConfirmation((show) => !show)} aria-label={showConfirmation ? "Ocultar confirmación" : "Mostrar confirmación"} className="absolute right-3 top-9 text-slate-500">{showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <label className="flex items-start gap-3 pt-2 text-sm text-slate-600"><input type="checkbox" checked={values.terms} onChange={(event) => update("terms", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" aria-invalid={!!errors.terms} /><span>Acepto los <Link href="#" className="font-semibold text-blue-700 hover:underline">Términos de Servicio</Link> y la <Link href="#" className="font-semibold text-blue-700 hover:underline">Política de Privacidad</Link> de EventCalendar.</span></label>
          {errors.terms && <p className="text-xs text-red-600" role="alert">{errors.terms}</p>}
          <button type="submit" disabled={isSubmitting || success} className="h-12 w-full rounded-xl bg-[#123b70] text-sm font-bold text-white transition hover:bg-[#0d2f5c] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}</button>
        </form><p className="mt-6 text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link href="/login" className="font-bold text-blue-700 hover:underline">Inicia sesión</Link></p>
      </section>
      <aside className="hidden bg-[#123b70] p-12 text-white lg:flex lg:flex-col lg:justify-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Planifica mejor</p><h2 className="mt-4 text-4xl font-extrabold leading-tight">Todas tus actividades bajo control.</h2><p className="mt-5 text-blue-100">Crea eventos, organiza subtareas y da seguimiento a cada gestión logística.</p><div className="mt-10 space-y-4 text-sm text-blue-50"><p>✓ Planes logísticos claros</p><p>✓ Información centralizada</p><p>✓ Seguimiento de tus actividades</p></div></aside>
    </div></main>;
}
