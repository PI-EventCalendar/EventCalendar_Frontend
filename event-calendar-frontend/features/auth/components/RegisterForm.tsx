"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser } from "../services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Schema ───────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    username: z.string().min(3, "Mínimo 3 caracteres"),
    email: z.string().email("Email inválido"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    password2: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((data) => data.password === data.password2, {
    message: "Las contraseñas no coinciden",
    path: ["password2"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser(values);
      router.push("/login?registered=true");
    } catch {
      setServerError("Error al registrar. Verifica los datos e intenta de nuevo.");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
        <CardDescription>Completa el formulario para registrarte</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reg-first-name">Nombre</Label>
              <Input id="reg-first-name" placeholder="Juan" {...register("first_name")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-last-name">Apellido</Label>
              <Input id="reg-last-name" placeholder="Pérez" {...register("last_name")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-username">Usuario *</Label>
            <Input
              id="reg-username"
              placeholder="tu_usuario"
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-email">Email *</Label>
            <Input
              id="reg-email"
              type="email"
              placeholder="correo@ejemplo.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-password">Contraseña *</Label>
            <Input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reg-password2">Confirmar contraseña *</Label>
            <Input
              id="reg-password2"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password2}
              {...register("password2")}
            />
            {errors.password2 && (
              <p className="text-xs text-destructive">{errors.password2.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
